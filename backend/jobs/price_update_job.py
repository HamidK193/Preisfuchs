from __future__ import annotations

import json
import os
import re
import time
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

try:
    from supabase import create_client
except ImportError:  # pragma: no cover - handled in CI by requirements.txt
    create_client = None


ROOT = Path(__file__).resolve().parents[2]
PRODUCTS_FILE = ROOT / "data" / "standard_products.json"
OPEN_PRICES_BASE_URL = os.getenv("OPEN_PRICES_BASE_URL", "https://prices.openfoodfacts.org").rstrip("/")
USER_AGENT = "Preisfuchs-MVP/0.1 (contact: local-development)"

RETAILER_SLUGS = {
    "aldi_sued": ("Aldi Sued", "Aldi-Sued"),
    "lidl": ("Lidl", "Lidl"),
    "rewe": ("Rewe", "REWE"),
    "edeka": ("Edeka", "Edeka"),
    "kaufland": ("Kaufland", "Kaufland"),
}

RETAILER_ALIASES = {
    "Aldi Sued": ["aldi sued", "aldi sud", "aldi"],
    "Lidl": ["lidl"],
    "Rewe": ["rewe"],
    "Edeka": ["edeka"],
    "Kaufland": ["kaufland"],
}

PRODUCT_QUERY_OVERRIDES = {
    "milk_15": "Milch",
    "butter_250": "Butter",
    "eggs_10": "Eier",
    "yogurt_500": "Joghurt",
    "cheese_slices_400": "Kaese",
    "quark_500": "Quark",
    "cream_200": "Sahne",
    "mozzarella_125": "Mozzarella",
    "pasta_500": "Nudeln",
    "rice_1kg": "Reis",
    "oats_500": "Haferflocken",
    "lentils_500": "Linsen",
    "canned_tomatoes_400": "Dosentomaten",
    "tuna_195": "Thunfisch",
    "flour_1kg": "Mehl",
    "sugar_1kg": "Zucker",
    "oil_1l": "Oel",
    "baking_powder": "Backpulver",
    "cocoa_250": "Kakao",
    "yeast": "Hefe",
    "coffee_500": "Kaffee",
    "water_15l": "Mineralwasser",
    "orange_juice_1l": "Orangensaft",
    "cola_125l": "Cola",
    "tea_20": "Tee",
    "beer_05": "Pils",
    "bananas_1kg": "Bananen",
    "apples_1kg": "Aepfel",
    "oranges_1kg": "Orangen",
    "strawberries_500": "Erdbeeren",
    "grapes_500": "Weintrauben",
    "pears_1kg": "Birnen",
    "lemons_500": "Zitronen",
    "tomatoes_500": "Tomaten",
    "cucumber_each": "Gurken",
    "carrots_1kg": "Karotten",
    "potatoes_25kg": "Kartoffeln",
    "onions_1kg": "Zwiebeln",
    "bell_peppers_500": "Paprika",
    "salad_each": "Salat",
    "broccoli_500": "Broccoli",
    "chocolate_100": "Schokolade",
    "gummy_bears_200": "Fruchtgummi",
    "cookies_200": "Kekse",
    "chips_175": "Chips",
    "nuts_200": "Nuesse",
    "frozen_pizza_each": "Tiefkuehlpizza",
    "fries_750": "Pommes",
    "icecream_500": "Eis",
    "frozen_vegetables_750": "Gemuese",
    "fish_sticks_450": "Fischstaebchen",
    "toast_500": "Toastbrot",
    "bread_rolls_6": "Aufbackbroetchen",
    "wholegrain_bread_500": "Vollkornbrot",
    "muesli_500": "Muesli",
    "cornflakes_500": "Cornflakes",
    "jam_450": "Marmelade",
    "honey_500": "Honig",
    "ketchup_500": "Ketchup",
    "mayonnaise_500": "Mayonnaise",
    "mustard_250": "Senf",
    "chicken_breast_400": "Haehnchen",
    "minced_meat_500": "Hackfleisch",
    "salami_200": "Salami",
    "ham_200": "Schinken",
    "sausages_400": "Wuerstchen",
    "toilet_paper_10": "Toilettenpapier",
    "detergent_20": "Waschmittel",
    "dish_soap_500": "Spuelmittel",
    "kitchen_towels_4": "Kuechenrollen",
    "diapers_4": "Windeln",
    "baby_food_190": "Babybrei",
    "wet_wipes_80": "Feuchttuecher",
    "cat_food_400": "Katzenfutter",
    "dog_food_1kg": "Hundefutter",
    "cat_litter_10l": "Katzenstreu",
}


def load_dotenv() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return

    for line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip().lstrip("\ufeff"), value.strip().strip('"'))


@dataclass(frozen=True)
class ProductSeed:
    id: str
    name: str
    category: str
    package_size: str
    search_terms: list[str]
    barcodes: list[str]


def load_products() -> list[ProductSeed]:
    payload = json.loads(PRODUCTS_FILE.read_text(encoding="utf-8"))
    return [ProductSeed(**item) for item in payload]


def fetch_open_prices_for_barcode(barcode: str) -> list[dict[str, Any]]:
    """Fetch observed prices for one barcode from Open Prices.

    The Open Prices API is evolving, so the importer is defensive and keeps the
    raw payload for later inspection.
    """
    url = f"{OPEN_PRICES_BASE_URL}/api/v1/prices"
    response = requests.get(
        url,
        params={"product_code": barcode, "size": 25},
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    if isinstance(payload, dict):
        results = payload.get("items") or payload.get("results") or []
        return results if isinstance(results, list) else []
    return payload if isinstance(payload, list) else []


def fetch_kaufda_html(retailer_slug: str, query: str) -> tuple[str, str]:
    url = f"https://www.kaufda.de/{retailer_slug}/Sortiment/{quote(query)}"
    response = requests.get(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
        timeout=30,
    )
    response.raise_for_status()
    return response.url, response.text


def parse_kaufda_offers(
    *,
    product: ProductSeed,
    retailer_id: str,
    retailer_name: str,
    source_url: str,
    html: str,
) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    valid_until = parse_valid_until(soup.get_text("\n"))
    rows: list[dict[str, Any]] = []

    for item in soup.select('[role="listitem"]'):
        texts = [text.strip() for text in item.stripped_strings if text.strip()]
        price_text = first_price_text(texts)
        if not price_text:
            continue

        price = parse_euro_price(price_text)
        if price is None:
            continue

        if not matches_retailer(texts, retailer_name):
            continue

        brand = texts[0] if texts else ""
        offer_name = find_offer_name(texts, retailer_name)
        if not offer_name:
            continue

        unit_text = next((text for text in texts if re.search(r"\b(kg|l|g|ml)\b", text, re.I)), None)
        unit_price, unit = parse_unit_price(unit_text)
        full_name = f"{brand} {offer_name}".strip()
        observed = datetime.now(UTC).isoformat()
        row_id = stable_price_id(
            "kaufda",
            product.id,
            retailer_id,
            full_name,
            str(price),
            valid_until.isoformat() if valid_until else date.today().isoformat(),
        )

        rows.append(
            {
                "id": row_id,
                "product_id": product.id,
                "retailer_id": retailer_id,
                "product_name": full_name[:240],
                "retailer_name": retailer_name,
                "price": price,
                "currency": "EUR",
                "unit_price": unit_price,
                "unit": unit,
                "observed_at": observed,
                "valid_until": valid_until.isoformat() if valid_until else None,
                "source": "kaufDA Angebot",
                "source_url": source_url,
                "source_license": "unknown",
                "confidence": 0.58,
                "raw_payload": {
                    "texts": texts[:20],
                    "academic_mvp_source": True,
                },
            }
        )

    return dedupe_rows(rows)[:8]


def first_price_text(texts: list[str]) -> str | None:
    for text in texts:
        repaired = repair_mojibake(text)
        if re.fullmatch(r"\d{1,3},\d{2}\s*(?:\u20ac)?", repaired):
            return text
    return None


def parse_euro_price(value: str) -> str | None:
    match = re.search(r"(\d{1,3}),(\d{2})", value)
    if not match:
        return None
    return f"{match.group(1)}.{match.group(2)}"


def find_offer_name(texts: list[str], retailer_name: str) -> str | None:
    ignored = {
        retailer_name.lower(),
        "uvp",
        "mehr angebote",
    }
    candidates = []
    for text in texts[:8]:
        repaired = repair_mojibake(text)
        lowered = repaired.lower()
        if lowered in ignored or "\u20ac" in repaired or re.fullmatch(r"\d{1,3},\d{2}", repaired):
            continue
        if re.search(r"\b(kg|l|g|ml)\b", text, re.I):
            continue
        candidates.append(text)
    if len(candidates) >= 2:
        return candidates[1]
    return candidates[0] if candidates else None


def matches_retailer(texts: list[str], retailer_name: str) -> bool:
    haystack = normalize_text(" ".join(texts))
    return any(alias in haystack for alias in RETAILER_ALIASES.get(retailer_name, [normalize_text(retailer_name)]))


def normalize_text(value: str) -> str:
    repaired = repair_mojibake(value).lower().replace("\u00df", "ss")
    without_accents = unicodedata.normalize("NFKD", repaired)
    return "".join(char for char in without_accents if not unicodedata.combining(char))


def repair_mojibake(value: str) -> str:
    try:
        return value.encode("cp1252").decode("utf-8")
    except UnicodeError:
        return value


def query_candidates(product: ProductSeed) -> list[str]:
    candidates = [PRODUCT_QUERY_OVERRIDES.get(product.id, product.name), product.name, *product.search_terms]
    seen: set[str] = set()
    unique_candidates = []
    for candidate in candidates:
        normalized = normalize_text(candidate).strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        unique_candidates.append(candidate)
    return unique_candidates[:4]


def parse_unit_price(value: str | None) -> tuple[str | None, str | None]:
    if not value:
        return None, None
    match = re.search(r"(\d{1,3})[,.](\d{2}).*?\b(kg|l|g|ml)\b", value, re.I)
    if not match:
        return None, None
    return f"{match.group(1)}.{match.group(2)}", match.group(3).lower()


def parse_valid_until(text: str) -> date | None:
    match = re.search(r"G(?:\u00fc|ue|u)ltig bis\s+(\d{1,2})\.(\d{1,2})\.(\d{4})", repair_mojibake(text), re.I)
    if not match:
        return None
    day, month, year = (int(part) for part in match.groups())
    try:
        return date(year, month, day)
    except ValueError:
        return None


def stable_price_id(*parts: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "|".join(parts)))


def dedupe_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique_rows = []
    for row in rows:
        if row["id"] in seen:
            continue
        seen.add(row["id"])
        unique_rows.append(row)
    return unique_rows


def normalize_open_price(product: ProductSeed, item: dict[str, Any]) -> dict[str, Any] | None:
    price = item.get("price") or item.get("price_value")
    if price is None:
        return None

    location = item.get("location") if isinstance(item.get("location"), dict) else {}
    retailer_name = (
        item.get("owner")
        or item.get("shop")
        or location.get("name")
        or item.get("location_osm_name")
        or "Unbekannter Markt"
    )

    observed_at = item.get("date") or item.get("created") or datetime.now(UTC).date().isoformat()

    return {
        "id": stable_price_id("open-prices", product.id, str(retailer_name), str(price), str(observed_at)),
        "product_id": product.id,
        "product_name": product.name,
        "retailer_name": str(retailer_name),
        "price": price,
        "currency": item.get("currency") or "EUR",
        "unit_price": item.get("price_per") or item.get("unit_price"),
        "unit": item.get("unit"),
        "observed_at": observed_at,
        "source": "Open Prices",
        "source_url": "https://prices.openfoodfacts.org",
        "source_license": "ODbL",
        "confidence": 0.70,
        "raw_payload": item,
    }


def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key or create_client is None:
        return None
    return create_client(url, key)


def upsert_products(client, products: list[ProductSeed]) -> None:
    rows = [
        {
            "id": product.id,
            "name": product.name,
            "category": product.category,
            "package_size": product.package_size,
            "search_terms": product.search_terms,
            "barcodes": product.barcodes,
        }
        for product in products
    ]
    client.table("products").upsert(rows).execute()


def insert_prices(client, rows: list[dict[str, Any]]) -> None:
    if rows:
        client.table("price_observations").upsert(rows).execute()


def main() -> None:
    load_dotenv()
    products = load_products()
    client = get_supabase_client()
    normalized_rows: list[dict[str, Any]] = []

    for product in products:
        for barcode in product.barcodes:
            try:
                open_price_items = fetch_open_prices_for_barcode(barcode)
            except requests.RequestException as error:
                print(f"Skipped Open Prices barcode {barcode}: {error}")
                continue

            for item in open_price_items:
                row = normalize_open_price(product, item)
                if row:
                    normalized_rows.append(row)

    for product in products:
        for retailer_id, (retailer_name, retailer_slug) in RETAILER_SLUGS.items():
            for query in query_candidates(product):
                try:
                    source_url, html = fetch_kaufda_html(retailer_slug, query)
                    rows = parse_kaufda_offers(
                        product=product,
                        retailer_id=retailer_id,
                        retailer_name=retailer_name,
                        source_url=source_url,
                        html=html,
                    )
                    normalized_rows.extend(rows)
                    if rows:
                        break
                except requests.RequestException as error:
                    print(f"Skipped kaufDA {retailer_name}/{query}: {error}")
                time.sleep(0.25)

    if client is None:
        print("Dry-run: Supabase secrets not configured.")
        print(f"Loaded {len(products)} seed products.")
        print(f"Normalized {len(normalized_rows)} price observations.")
        return

    upsert_products(client, products)
    insert_prices(client, normalized_rows)
    print(f"Imported {len(normalized_rows)} price observations.")


if __name__ == "__main__":
    main()
