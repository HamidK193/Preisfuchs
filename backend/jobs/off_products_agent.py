"""Weekly agent: product reference data from Open Food Facts.

Fetches name, brand, quantity, nutrition, labels and front image for every
known GTIN (seed catalog plus catalog articles) and upserts `off_products`.
Data is ODbL 1.0, images CC BY-SA 3.0; both need visible attribution. Images
stay unreviewed until the package on the photo is checked against the article.
"""
from __future__ import annotations

import json
import os
import time
from datetime import UTC, datetime
from typing import Any

import requests

from agent_common import (
    USER_AGENT, finish_update_run, is_dry_run, is_valid_gtin, load_dotenv, require_client, seed_barcodes,
    start_update_run,
)

SOURCE = "Open Food Facts"
OFF_BASE_URL = os.getenv("OFF_BASE_URL", "https://world.openfoodfacts.org").rstrip("/")
# Open Food Facts allows 100 product reads per minute.
REQUEST_PAUSE_SECONDS = float(os.getenv("OFF_PAUSE_SECONDS", "0.7"))
FIELDS = ",".join([
    "code", "product_name", "product_name_de", "brands", "quantity", "image_front_url",
    "nutriments", "nutriscore_grade", "categories_tags", "labels_tags", "allergens_tags", "last_modified_t",
])
NUTRIMENT_KEYS = [
    "energy-kcal_100g", "fat_100g", "saturated-fat_100g", "carbohydrates_100g",
    "sugars_100g", "proteins_100g", "salt_100g",
]


def product_row(gtin: str, product: dict[str, Any], fetched_at: str) -> dict[str, Any] | None:
    name = (product.get("product_name_de") or product.get("product_name") or "").strip()
    if not name:
        return None
    nutriments = product.get("nutriments") or {}
    modified = product.get("last_modified_t")
    image_url = product.get("image_front_url") or None
    return {
        "gtin": gtin,
        "name": name,
        "brand": (product.get("brands") or "").split(",")[0].strip() or None,
        "quantity": (product.get("quantity") or "").strip() or None,
        "nutriscore_grade": product.get("nutriscore_grade") if product.get("nutriscore_grade") in set("abcde") else None,
        "nutriments": {key: nutriments[key] for key in NUTRIMENT_KEYS if isinstance(nutriments.get(key), (int, float))},
        "categories_tags": product.get("categories_tags") or [],
        "labels_tags": product.get("labels_tags") or [],
        "allergens_tags": product.get("allergens_tags") or [],
        "image_url": image_url,
        "image_license": "CC BY-SA 3.0" if image_url else None,
        "image_attribution": "Open Food Facts contributors" if image_url else None,
        "source": SOURCE,
        "source_url": f"{OFF_BASE_URL}/product/{gtin}",
        "data_license": "ODbL 1.0",
        "off_last_modified": datetime.fromtimestamp(modified, UTC).isoformat() if isinstance(modified, int) else None,
        "fetched_at": fetched_at,
    }


def fetch_product(session: requests.Session, gtin: str) -> dict[str, Any] | None:
    for attempt in range(3):
        response = session.get(f"{OFF_BASE_URL}/api/v2/product/{gtin}.json", params={"fields": FIELDS}, timeout=30)
        if response.status_code == 404:
            return None
        if response.status_code in {429, 502, 503, 504}:
            time.sleep(30 * (attempt + 1))
            continue
        response.raise_for_status()
        payload = response.json()
        return payload.get("product") if payload.get("status") == 1 else None
    raise ValueError(f"Open Food Facts unavailable for {gtin}")


def known_gtins(client) -> list[str]:
    gtins = seed_barcodes()
    if client:
        for offset in range(0, 100_000, 1000):
            rows = (client.table("catalog_articles").select("gtin").not_.is_("gtin", "null")
                    .range(offset, offset + 999).execute().data)
            gtins.update(row["gtin"] for row in rows)
            if len(rows) < 1000:
                break
    return sorted(gtin for gtin in gtins if is_valid_gtin(gtin))


def main() -> None:
    load_dotenv()
    dry_run = is_dry_run()
    client = require_client()
    fetched_at = datetime.now(UTC).isoformat()
    report: dict[str, Any] = {"status": "failed", "dry_run": dry_run, "requested": 0, "imported": 0,
                              "not_found": 0, "errors": []}
    run_id = start_update_run(client, SOURCE) if client else None
    try:
        gtins = known_gtins(client)
        report["requested"] = len(gtins)
        rows = []
        with requests.Session() as session:
            session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})
            for index, gtin in enumerate(gtins):
                if index:
                    time.sleep(REQUEST_PAUSE_SECONDS)
                try:
                    product = fetch_product(session, gtin)
                except (requests.RequestException, ValueError) as error:
                    report["errors"].append({"gtin": gtin, "error_type": type(error).__name__})
                    continue
                row = product_row(gtin, product, fetched_at) if product else None
                if row:
                    rows.append(row)
                else:
                    report["not_found"] += 1
        if client:
            for offset in range(0, len(rows), 200):
                client.table("off_products").upsert(rows[offset:offset + 200]).execute()
        report["imported"] = len(rows)
        report["with_image"] = sum(bool(row["image_url"]) for row in rows)
        report["status"] = ("failed" if report["errors"] and not rows else
                            "partial" if report["errors"] else "succeeded")
    except Exception as error:
        report["error_type"] = type(error).__name__
        raise
    finally:
        if client and run_id:
            finish_update_run(client, run_id, status=report["status"], report=report)
        print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["status"] != "succeeded":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
