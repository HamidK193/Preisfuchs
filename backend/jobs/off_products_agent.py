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
from datetime import UTC, datetime, timedelta
from typing import Any

import requests

from agent_common import (
    USER_AGENT, Deadline, Terminated, close_stale_runs, finish_update_run, install_sigterm_handler, is_dry_run,
    is_valid_gtin, load_dotenv, require_client, seed_barcodes, start_update_run,
)

SOURCE = "Open Food Facts"
OFF_BASE_URL = os.getenv("OFF_BASE_URL", "https://world.openfoodfacts.org").rstrip("/")
# Open Food Facts allows 100 product reads per minute.
REQUEST_PAUSE_SECONDS = float(os.getenv("OFF_PAUSE_SECONDS", "0.7"))
# The job stops itself before the workflow timeout; GTINs fetched recently are skipped, so the
# next run continues where this one stopped instead of starting from the first GTIN again.
MAX_SECONDS = float(os.getenv("OFF_MAX_SECONDS", "2700"))
REFRESH_AFTER_DAYS = int(os.getenv("OFF_REFRESH_AFTER_DAYS", "14"))
UPSERT_BATCH = 50
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


def stale_gtins(client, gtins: list[str], now: datetime) -> list[str]:
    """GTINs never fetched or fetched longer ago than the refresh interval, oldest first."""
    if not client:
        return gtins
    cutoff = now - timedelta(days=REFRESH_AFTER_DAYS)
    fetched: dict[str, datetime] = {}
    for offset in range(0, 100_000, 1000):
        rows = client.table("off_products").select("gtin,fetched_at").range(offset, offset + 999).execute().data
        fetched.update({row["gtin"]: datetime.fromisoformat(row["fetched_at"]) for row in rows})
        if len(rows) < 1000:
            break
    due = [gtin for gtin in gtins if gtin not in fetched or fetched[gtin] < cutoff]
    return sorted(due, key=lambda gtin: fetched.get(gtin, datetime.min.replace(tzinfo=UTC)))


def main() -> None:
    load_dotenv()
    install_sigterm_handler()
    dry_run = is_dry_run()
    client = require_client()
    deadline = Deadline(MAX_SECONDS)
    now = datetime.now(UTC)
    fetched_at = now.isoformat()
    report: dict[str, Any] = {"status": "failed", "dry_run": dry_run, "requested": 0, "imported": 0,
                              "not_found": 0, "with_image": 0, "errors": [], "error_count": 0}
    run_id = None
    batch: list[dict[str, Any]] = []

    def flush() -> None:
        if client and batch:
            client.table("off_products").upsert(batch).execute()
        batch.clear()

    try:
        if client:
            report["closed_stale_runs"] = close_stale_runs(client, SOURCE)
            run_id = start_update_run(client, SOURCE)
        gtins = stale_gtins(client, known_gtins(client), now)
        report["requested"] = len(gtins)
        with requests.Session() as session:
            session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})
            for index, gtin in enumerate(gtins):
                if deadline.expired():
                    report["stopped_reason"] = "time_budget"
                    break
                if index:
                    time.sleep(REQUEST_PAUSE_SECONDS)
                try:
                    product = fetch_product(session, gtin)
                except (requests.RequestException, ValueError) as error:
                    report["error_count"] += 1
                    report["errors"] = (report["errors"] + [{"gtin": gtin, "error_type": type(error).__name__}])[:20]
                    continue
                row = product_row(gtin, product, fetched_at) if product else None
                if row:
                    batch.append(row)
                    report["imported"] += 1
                    report["with_image"] += bool(row["image_url"])
                    if len(batch) >= UPSERT_BATCH:
                        flush()
                else:
                    report["not_found"] += 1
            flush()
        # Single bad GTINs do not fail a run; no product at all although requested does.
        report["status"] = "failed" if report["error_count"] and not report["imported"] and not report["not_found"]             else "succeeded"
    except BaseException as error:  # includes Terminated: the run must always be closed
        report["error_type"] = type(error).__name__
        report["status"] = "failed"
        if not isinstance(error, (Terminated, KeyboardInterrupt)):
            raise
    finally:
        if client and run_id:
            try:
                flush()
            except Exception:  # noqa: BLE001 - closing the run matters more than the last batch
                pass
            finish_update_run(client, run_id, status=report["status"], report=report)
        print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["status"] != "succeeded":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
