"""Daily agent: fills the product catalog with German supermarket products from Open Food Facts.

The per-GTIN refresh (off_products_agent) only knows GTINs that already have a price. This agent
discovers products instead: it pages through the Open Food Facts search index (search-a-licious)
for each German chain, most scanned products first, and stores name, brand, quantity, category,
GTIN and the front image URL. Data is ODbL 1.0, images CC BY-SA 3.0 (visible attribution needed).

Every page is written before the next one is requested, so a killed job loses at most one page.
The position (chain, page) is kept in update_runs.report and picked up by the next run; after the
last chain it starts again from the beginning, which refreshes the data. Rate limit of the search
API: 10 requests per minute, so the pause between pages is 6.5 s.
"""
from __future__ import annotations

import json
import os
import time
from datetime import UTC, datetime
from typing import Any

import requests

from agent_common import (
    USER_AGENT, Deadline, Terminated, close_stale_runs, finish_update_run, install_sigterm_handler,
    is_dry_run, is_valid_gtin, load_dotenv, require_client, start_update_run,
)
from catalog_identity import stable_id
from open_prices_de_agent import category_for, package_for

SOURCE = "Open Food Facts Katalog"
SEARCH_URL = os.getenv("OFF_SEARCH_URL", "https://search.openfoodfacts.org/search")
PRODUCT_URL = os.getenv("OFF_BASE_URL", "https://world.openfoodfacts.org").rstrip("/") + "/product/{gtin}"
PAGE_SIZE = 100
MAX_PAGES = int(os.getenv("OFF_CATALOG_MAX_PAGES", "150"))
MAX_SECONDS = float(os.getenv("OFF_CATALOG_MAX_SECONDS", "1800"))
PAUSE_SECONDS = float(os.getenv("OFF_CATALOG_PAUSE_SECONDS", "6.5"))
# Exact store names as used by Open Food Facts. Unknown names just return zero hits.
# Spelling matters in the index ("REWE" 5.6k hits, "Rewe" 2.6k), so both variants are listed.
STORES = ["Lidl", "Aldi", "Aldi Süd", "Aldi Nord", "REWE", "Rewe", "Edeka", "EDEKA", "Kaufland", "Netto",
          "Netto Marken-Discount", "Penny", "dm", "Rossmann", "Norma", "Globus", "Marktkauf", "Müller", "Tegut"]
FIELDS = ",".join([
    "code", "product_name", "product_name_de", "brands", "quantity", "product_quantity", "product_quantity_unit",
    "image_front_url", "image_front_small_url", "categories", "labels", "allergens", "stores", "countries",
    "nutriscore_grade", "unique_scans_n", "last_modified_t", "lang", "obsolete",
])
IMAGE_LICENSE = "CC BY-SA 3.0"
IMAGE_ATTRIBUTION = "Open Food Facts contributors"


def search_params(store: str, page: int) -> dict[str, Any]:
    return {"q": f'countries:"en:germany" AND stores:"{store}"', "page": page, "page_size": PAGE_SIZE,
            "sort_by": "-unique_scans_n", "fields": FIELDS}


def clean_brand(brands: Any) -> str | None:
    """First brand without the language prefix ("xx:storck" -> "Storck")."""
    if isinstance(brands, str):
        brands = brands.split(",")
    for brand in brands or []:
        text = str(brand).split(":", 1)[-1].strip()
        if text:
            return text.title() if text.islower() else text
    return None


def _tags(values: Any) -> list[str]:
    return [str(value) for value in values] if isinstance(values, list) else []


def hit_rows(hit: dict[str, Any], fetched_at: str) -> dict[str, dict] | None:
    """Maps one search hit to off_products / products / catalog_articles rows, or None if unusable."""
    gtin = str(hit.get("code") or "")
    name = (hit.get("product_name_de") or hit.get("product_name") or "").strip()
    countries = _tags(hit.get("countries"))
    if not is_valid_gtin(gtin) or not name or hit.get("obsolete") or "en:germany" not in countries:
        return None
    brand = clean_brand(hit.get("brands"))
    quantity = (hit.get("quantity") or "").strip() or None
    package = package_for(hit)
    category = category_for(_tags(hit.get("categories")))
    image_url = hit.get("image_front_url") or None
    modified = hit.get("last_modified_t")
    scans = hit.get("unique_scans_n")
    grade = hit.get("nutriscore_grade")
    display_name = name if not brand or brand.lower() in name.lower() else f"{brand} {name}"
    product_id = f"gtin_{gtin}"
    article_id = stable_id("open-prices-gtin", gtin)  # same identity the price agent uses for this GTIN
    off = {
        "gtin": gtin, "name": name[:240], "brand": brand, "quantity": quantity,
        "nutriscore_grade": grade if grade in set("abcde") else None,
        "categories_tags": _tags(hit.get("categories")), "labels_tags": _tags(hit.get("labels")),
        "allergens_tags": _tags(hit.get("allergens")), "image_url": image_url,
        "image_thumb_url": hit.get("image_front_small_url") or None,
        "image_license": IMAGE_LICENSE if image_url else None,
        "image_attribution": IMAGE_ATTRIBUTION if image_url else None,
        "image_plausible": bool(image_url and package),
        "stores_tags": [str(store) for store in hit.get("stores") or []][:30], "countries_tags": countries,
        "unique_scans": scans if isinstance(scans, int) else None, "lang": hit.get("lang"),
        "source": "Open Food Facts", "source_url": PRODUCT_URL.format(gtin=gtin), "data_license": "ODbL 1.0",
        "off_last_modified": datetime.fromtimestamp(modified, UTC).isoformat() if isinstance(modified, int) else None,
        "fetched_at": fetched_at,
    }
    product = {"id": product_id, "name": display_name[:240], "category": category,
               "package_size": (quantity or "unbekannt")[:60],
               "search_terms": sorted({term for term in (name, display_name) if term}), "barcodes": [gtin]}
    reasons = [] if package else ["quantity_ambiguous"]
    article = {
        "id": article_id, "product_id": product_id, "product_type": "gtin", "source": "Open Prices",
        "source_product_ref": gtin, "gtin": gtin, "name": display_name[:240], "brand_name": brand,
        "brand_type": "unknown", "package": package, "comparison_key": f"gtin:{gtin}",
        "review_status": "verified" if package else "needs_review", "review_reasons": reasons,
        "evidence_url": off["source_url"],
        "automatic_values": {"verified_by": "off_catalog_agent", "category": category, "origin": "open_food_facts"},
    }
    return {"off": off, "product": product, "article": article}


def next_position(store_index: int, page: int, hits: int, page_count: int | None) -> tuple[int, int, bool]:
    """Position after a fetched page; the bool is True when a full cycle over all stores is complete."""
    last_page = hits < PAGE_SIZE or (page_count is not None and page >= page_count)
    if not last_page:
        return store_index, page + 1, False
    if store_index + 1 >= len(STORES):
        return 0, 1, True
    return store_index + 1, 1, False


def last_position(client) -> tuple[int, int]:
    rows = (client.table("update_runs").select("report").eq("source", SOURCE).in_("status", ["succeeded", "failed"])
            .order("started_at", desc=True).limit(5).execute().data)
    for row in rows:
        cursor = (row.get("report") or {}).get("cursor")
        if isinstance(cursor, dict) and 0 <= cursor.get("store", -1) < len(STORES) and cursor.get("page", 0) >= 1:
            return cursor["store"], cursor["page"]
    return 0, 1


def fetch_page(session: requests.Session, store: str, page: int) -> dict[str, Any]:
    """One search page; retries temporary errors with backoff and honours Retry-After."""
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            response = session.get(SEARCH_URL, params=search_params(store, page), timeout=60)
            if response.status_code in {429, 502, 503, 504}:
                retry_after = response.headers.get("Retry-After", "")
                time.sleep(min(float(retry_after), 120) if retry_after.isdigit() else 20 * (attempt + 1))
                last_error = requests.HTTPError(f"HTTP {response.status_code}")
                continue
            response.raise_for_status()
            return response.json()
        except (requests.ConnectionError, requests.Timeout) as error:
            last_error = error
            time.sleep(10 * (attempt + 1))
    raise last_error or RuntimeError("search failed")


def store_rows(client, rows: list[dict[str, dict]]) -> None:
    if not rows:
        return
    client.table("off_products").upsert([row["off"] for row in rows]).execute()
    # Existing products and articles (curated by the price agents) are never overwritten.
    client.table("products").upsert([row["product"] for row in rows], on_conflict="id", ignore_duplicates=True).execute()
    client.table("catalog_articles").upsert([row["article"] for row in rows], on_conflict="id",
                                            ignore_duplicates=True).execute()


def main() -> None:
    load_dotenv()
    install_sigterm_handler()
    dry_run = is_dry_run()
    client = require_client()
    deadline = Deadline(MAX_SECONDS)
    fetched_at = datetime.now(UTC).isoformat()
    report: dict[str, Any] = {"status": "failed", "dry_run": dry_run, "pages": 0, "hits": 0, "imported": 0,
                              "with_image": 0, "skipped": 0, "per_store": {}, "errors": []}
    run_id = None
    try:
        if client:
            report["closed_stale_runs"] = close_stale_runs(client, SOURCE)
            run_id = start_update_run(client, SOURCE)
        store_index, page = last_position(client) if client else (0, 1)
        report["start"] = {"store": STORES[store_index], "page": page}
        with requests.Session() as session:
            session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})
            while report["pages"] < MAX_PAGES and not deadline.expired():
                store = STORES[store_index]
                try:
                    payload = fetch_page(session, store, page)
                except (requests.RequestException, ValueError, RuntimeError) as error:
                    report["errors"].append({"store": store, "page": page, "error_type": type(error).__name__})
                    report["stopped_reason"] = "source_error"
                    break
                hits = payload.get("hits") or []
                rows = [row for hit in hits if (row := hit_rows(hit, fetched_at))]
                if client:
                    store_rows(client, rows)
                stats = report["per_store"].setdefault(store, {"pages": 0, "imported": 0})
                stats["pages"] += 1
                stats["imported"] += len(rows)
                report["pages"] += 1
                report["hits"] += len(hits)
                report["imported"] += len(rows)
                report["skipped"] += len(hits) - len(rows)
                report["with_image"] += sum(bool(row["off"]["image_url"]) for row in rows)
                store_index, page, cycle_done = next_position(store_index, page, len(hits), payload.get("page_count"))
                report["cursor"] = {"store": store_index, "page": page}
                if cycle_done:
                    report["cycle_completed"] = True
                time.sleep(PAUSE_SECONDS)
            else:
                report["stopped_reason"] = "time_budget" if deadline.expired() else "page_budget"
        report["status"] = "failed" if report["errors"] and not report["pages"] else "succeeded"
    except BaseException as error:  # includes Terminated and KeyboardInterrupt: the run must be closed
        report["error_type"] = type(error).__name__
        report["status"] = "failed"
        if not isinstance(error, (Terminated, KeyboardInterrupt)):
            raise
    finally:
        if client and run_id:
            finish_update_run(client, run_id, status=report["status"], report=report)
        print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["status"] != "succeeded":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
