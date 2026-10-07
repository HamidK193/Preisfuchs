"""Daily agent: all new German price observations from Open Prices (ODbL).

Open Prices offers no server-side country filter, so the agent pages through
all prices newest-first, stops at the cursor of the previous run and keeps
observations from shops in Germany. Each GTIN becomes its own product.

Automatic verification (decided 2026-10-07): an observation is published
when the product is known to Open Food Facts with a name, the quantity parses
unambiguously, the unit price is plausible, and the internal kaufDA last
check does not report a strong deviation. Everything else stays internal with
review_reasons. kaufDA data is never published.
"""
from __future__ import annotations

import json
import os
import re
import time
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

import requests

from agent_common import (
    USER_AGENT, finish_update_run, is_dry_run, is_valid_gtin, load_dotenv, require_client, start_update_run,
)
from catalog_identity import parse_package, stable_id
from kaufda_check import KaufdaChecker
from osm_stores_agent import RETAILERS, detect_retailer

SOURCE = "Open Prices"
RUN_SOURCE = "Open Prices DE"
OPEN_PRICES_URL = os.getenv("OPEN_PRICES_BASE_URL", "https://prices.openfoodfacts.org").rstrip("/") + "/api/v1/prices"
FIRST_RUN_DAYS = int(os.getenv("OPEN_PRICES_FIRST_RUN_DAYS", "60"))
PAGE_LIMIT = int(os.getenv("OPEN_PRICES_PAGE_LIMIT", "400"))
KAUFDA_CHECK_DAYS = 14

# Ordered most specific first; matched against OFF category tags (specific tags come last).
CATEGORY_RULES = [
    ("Baby", ("baby-food", "baby-milk", "infant")),
    ("Tierbedarf", ("pet-food", "dog-food", "cat-food")),
    ("Tiefkühl", ("frozen",)),
    ("Getränke", ("beverages", "drinks", "waters", "juices", "sodas", "coffees", "teas", "beers", "wines")),
    ("Molkerei", ("dairies", "cheeses", "yogurts", "milks", "butters", "creams", "quark")),
    ("Fleisch", ("meats", "sausages", "hams", "poultry", "fishes", "seafood")),
    ("Backwaren", ("breads", "pastries", "viennoiseries", "toasts")),
    ("Süßigkeiten", ("chocolates", "candies", "confectioneries", "biscuits", "cakes", "sweet-snacks",
                     "salty-snacks", "chips", "gummies")),
    ("Backen", ("flours", "sugars", "baking")),
    ("Obst", ("fruits",)),
    ("Gemüse", ("vegetables", "potatoes", "salads")),
    ("Trockenware", ("pastas", "rices", "cereals", "breakfast", "canned", "sauces", "spreads", "oils",
                     "condiments", "legumes", "nuts", "soups")),
    ("Frische", ("eggs", "meals", "fresh")),
]
UNIT_PRICE_BOUNDS = {"g": (Decimal("0.05"), Decimal("150")), "ml": (Decimal("0.05"), Decimal("150")),
                     "each": (Decimal("0.01"), Decimal("50"))}


def category_for(tags: list[str]) -> str:
    for tag in reversed(tags or []):
        for category, keys in CATEGORY_RULES:
            if any(key in tag for key in keys):
                return category
    return "Sonstiges"


def package_for(product: dict[str, Any]) -> dict | None:
    """Parses the quantity label, tidying common spellings; drained weights stay ambiguous."""
    text = (product.get("quantity") or "").replace("℮", "").strip()
    if "=" in text:
        text = text.split("=")[-1]
    text = re.sub(r"\s*\(.*\)\s*$", "", text)
    text = re.sub(r"(?i)\b(liter|litre)\b", "l", re.sub(r"(?i)\bgramm?\b", "g", text)).replace("*", "x")
    package = parse_package(text)
    if package or text:
        return package
    amount, unit = product.get("product_quantity"), product.get("product_quantity_unit")
    if isinstance(amount, (int, float)) and amount > 0 and unit in {"g", "ml"}:
        return parse_package(f"{Decimal(str(amount)).normalize():f} {unit}")
    return None


def unit_price_plausible(price: Decimal, package: dict) -> tuple[bool, Decimal | None, str | None]:
    """Price per kg / l / piece and whether it lies within broad grocery bounds."""
    bounds = UNIT_PRICE_BOUNDS.get(package["unit"])
    if not bounds:
        return False, None, None
    total = Decimal(package["total"])
    if package["unit"] == "each":
        per, unit = price / total, "Stück"
    else:
        per, unit = price / total * 1000, "kg" if package["unit"] == "g" else "l"
    return bounds[0] <= per <= bounds[1], per.quantize(Decimal("0.01")), unit


def build_records(item: dict[str, Any], stores: dict[str, dict], checker: KaufdaChecker | None,
                  today: date) -> dict[str, Any] | None:
    """Turns one Open Prices item into product, article and observation rows, or None if out of scope."""
    location = item.get("location") or {}
    product = item.get("product") or {}
    gtin = item.get("product_code") or ""
    if (location.get("osm_address_country_code") != "DE" or item.get("type") != "PRODUCT"
            or item.get("currency") != "EUR" or item.get("duplicate_of") or item.get("price_per")
            or not is_valid_gtin(gtin) or not item.get("price") or float(item["price"]) <= 0):
        return None

    price = Decimal(str(item["price"])).quantize(Decimal("0.01"))
    name = (product.get("product_name") or item.get("product_name") or "").strip()
    brand = (product.get("brands") or "").split(",")[0].strip() or None
    display_name = name if not brand or brand.lower() in name.lower() else f"{brand} {name}"
    category = category_for(product.get("categories_tags") or [])
    package = package_for(product)
    reasons = []
    if product.get("source") != "off" or not name:
        reasons.append("not_in_open_food_facts")
    if not package:
        reasons.append("quantity_ambiguous")
    unit_price = unit = None
    if package:
        plausible, unit_price, unit = unit_price_plausible(price, package)
        if not plausible:
            reasons.append("unit_price_implausible")

    osm_type, osm_id = (item.get("location_osm_type") or "").lower(), item.get("location_osm_id")
    location_ref = f"{osm_type}/{osm_id}" if osm_type and osm_id else None
    store = stores.get(location_ref or "")
    retailer_id = store["retailer_id"] if store else detect_retailer(
        {"brand": location.get("osm_brand") or "", "name": location.get("osm_name") or ""})
    retailer_name = RETAILERS[retailer_id][0] if retailer_id else (location.get("osm_brand") or location.get("osm_name") or "Markt")
    observed = date.fromisoformat(item["date"])

    check = None
    if not reasons and checker and (today - observed).days <= KAUFDA_CHECK_DAYS:
        check = checker.check(retailer_id, display_name, category, float(price))
        if check["status"] == "mismatch":
            reasons.append("kaufda_price_mismatch")

    product_id = f"gtin_{gtin}"
    article_id = stable_id("open-prices-gtin", gtin)
    verified = not reasons
    discounted = bool(item.get("price_is_discounted"))
    regular = item.get("price_without_discount")
    city = location.get("osm_address_city")
    return {
        "product": {"id": product_id, "name": display_name[:240] or gtin, "category": category,
                    "package_size": (product.get("quantity") or "unbekannt")[:60],
                    "search_terms": [term for term in {name, display_name} if term], "barcodes": [gtin]},
        "article": {
            "id": article_id, "product_id": product_id, "product_type": "gtin", "source": SOURCE,
            "source_product_ref": gtin, "gtin": gtin, "name": display_name[:240] or gtin, "brand_name": brand,
            "brand_type": "unknown", "package": package, "comparison_key": f"gtin:{gtin}",
            "review_status": "verified" if verified else "needs_review", "review_reasons": reasons,
            "evidence_url": f"https://world.openfoodfacts.org/product/{gtin}",
            "automatic_values": {"verified_by": "open_prices_de_agent", "category": category},
        },
        "observation": {
            "id": stable_id("open-prices-price", str(item["id"])), "product_id": product_id, "article_id": article_id,
            "retailer_id": retailer_id, "store_id": store["id"] if store else None,
            "product_name": display_name[:240] or gtin, "brand_name": brand, "brand_type": "unknown",
            "retailer_name": retailer_name, "price": str(price), "currency": "EUR",
            "unit_price": str(unit_price) if unit_price is not None else None, "unit": unit,
            "observed_at": f"{observed.isoformat()}T12:00:00+00:00",
            "offer_type": "sale" if discounted else "regular",
            "regular_price": str(regular) if discounted and regular and float(regular) >= float(price) else None,
            "source": SOURCE, "source_url": f"https://prices.openfoodfacts.org/prices/{item['id']}",
            "source_license": "ODbL 1.0", "source_ref": str(item["id"]), "price_basis": "pack",
            "country_code": "DE", "region": store["state"] if store else None,
            "location_label": ", ".join(filter(None, [retailer_name, city])),
            "location_source_ref": location_ref, "confidence": 0.85 if verified else 0.6,
            "is_public": verified, "review_reasons": reasons,
            # Internal only: raw_payload is not readable for anon/authenticated.
            "raw_payload": {"open_prices_id": item["id"], "proof_id": item.get("proof_id"), "kaufda_check": check},
        },
    }


def fetch_new_items(session: requests.Session, cursor: int | None, cutoff: date) -> tuple[list[dict], int | None]:
    items, newest = [], None
    for page in range(1, PAGE_LIMIT + 1):
        for attempt in range(3):
            response = session.get(OPEN_PRICES_URL, params={"order_by": "-id", "size": 100, "page": page}, timeout=90)
            if response.status_code not in {429, 502, 503, 504}:
                break
            time.sleep(20 * (attempt + 1))
        response.raise_for_status()
        batch = response.json().get("items", [])
        if not batch:
            break
        newest = newest or batch[0]["id"]
        for item in batch:
            if cursor is not None and item["id"] <= cursor:
                return items, newest
            items.append(item)
        if cursor is None and all(date.fromisoformat(item["created"][:10]) < cutoff for item in batch):
            break
        time.sleep(0.3)
    return items, newest


def last_cursor(client) -> int | None:
    rows = (client.table("update_runs").select("report").eq("source", RUN_SOURCE).eq("status", "succeeded")
            .order("started_at", desc=True).limit(1).execute().data)
    return rows[0]["report"].get("cursor") if rows else None


def load_stores(client, refs: set[str]) -> dict[str, dict]:
    stores, refs = {}, sorted(refs)
    for offset in range(0, len(refs), 200):
        for row in (client.table("stores").select("id,retailer_id,state,source_ref").eq("source", "OpenStreetMap")
                    .in_("source_ref", refs[offset:offset + 200]).execute().data):
            stores[row["source_ref"]] = row
    return stores


def existing_refs(client, refs: list[str]) -> set[str]:
    found = set()
    for offset in range(0, len(refs), 200):
        found.update(row["source_ref"] for row in client.table("price_observations").select("source_ref")
                     .eq("source", SOURCE).in_("source_ref", refs[offset:offset + 200]).execute().data)
    return found


def main() -> None:
    load_dotenv()
    dry_run = is_dry_run()
    client = require_client()
    today = datetime.now(UTC).date()
    report: dict[str, Any] = {"status": "failed", "dry_run": dry_run, "imported": 0, "published": 0}
    run_id = start_update_run(client, RUN_SOURCE) if client else None
    try:
        cursor = last_cursor(client) if client else None
        with requests.Session() as session:
            session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})
            items, newest = fetch_new_items(session, cursor, today - timedelta(days=FIRST_RUN_DAYS))
        german = [item for item in items if (item.get("location") or {}).get("osm_address_country_code") == "DE"]
        report.update(fetched=len(items), german=len(german), cursor=newest or cursor, previous_cursor=cursor)
        refs = {f"{(i.get('location_osm_type') or '').lower()}/{i.get('location_osm_id')}" for i in german}
        stores = load_stores(client, refs) if client else {}
        checker = KaufdaChecker(budget=int(os.getenv("KAUFDA_CHECK_BUDGET", "120")))
        records = [r for item in german if (r := build_records(item, stores, checker, today))]
        if client:
            known = existing_refs(client, [r["observation"]["source_ref"] for r in records])
            records = [r for r in records if r["observation"]["source_ref"] not in known]
            report["already_imported"] = len(known)
        products = {r["product"]["id"]: r["product"] for r in records}
        # A GTIN counts as verified once any of its observations passed all checks.
        articles: dict[str, dict] = {}
        for record in records:
            article = record["article"]
            if article["id"] not in articles or article["review_status"] == "verified":
                articles[article["id"]] = article
        observations = [r["observation"] for r in records]
        if client:
            for name, rows in (("products", list(products.values())), ("catalog_articles", list(articles.values())),
                               ("price_observations", observations)):
                for offset in range(0, len(rows), 200):
                    client.table(name).upsert(rows[offset:offset + 200]).execute()
        reasons: dict[str, int] = {}
        for row in observations:
            for reason in row["review_reasons"]:
                reasons[reason] = reasons.get(reason, 0) + 1
        report.update(imported=len(observations), published=sum(r["is_public"] for r in observations),
                      products=len(products), verified_articles=sum(a["review_status"] == "verified"
                                                                    for a in articles.values()),
                      review_reasons=reasons, matched_stores=sum(bool(r["store_id"]) for r in observations),
                      kaufda_check=checker.stats, status="succeeded")
        if dry_run:
            report["samples"] = observations[:3]
    except Exception as error:
        report["error_type"] = type(error).__name__
        raise
    finally:
        if client and run_id:
            finish_update_run(client, run_id, status=report["status"], report=report)
        print(json.dumps(report, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
