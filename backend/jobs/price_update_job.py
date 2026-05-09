from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import requests

try:
    from supabase import create_client
except ImportError:  # pragma: no cover - handled in CI by requirements.txt
    create_client = None


ROOT = Path(__file__).resolve().parents[2]
PRODUCTS_FILE = ROOT / "data" / "standard_products.json"
OPEN_PRICES_BASE_URL = os.getenv("OPEN_PRICES_BASE_URL", "https://prices.openfoodfacts.org").rstrip("/")
USER_AGENT = "Preisfuchs-MVP/0.1 (contact: local-development)"


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
        params={"product_code": barcode, "country": "de", "size": 25},
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    if isinstance(payload, dict):
        results = payload.get("items") or payload.get("results") or []
        return results if isinstance(results, list) else []
    return payload if isinstance(payload, list) else []


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
        client.table("price_observations").insert(rows).execute()


def main() -> None:
    load_dotenv()
    products = load_products()
    client = get_supabase_client()
    normalized_rows: list[dict[str, Any]] = []

    for product in products:
        for barcode in product.barcodes:
            for item in fetch_open_prices_for_barcode(barcode):
                row = normalize_open_price(product, item)
                if row:
                    normalized_rows.append(row)

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
