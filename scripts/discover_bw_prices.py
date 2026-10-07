"""Bounded source discovery; writes candidates locally and never imports/publishes."""
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend" / "jobs"))
from price_update_job import USER_AGENT, canonical_retailer_name, normalize_text


def main():
    candidates = {}
    report = []
    for name, lat, lon in [("Stuttgart", 48.7758, 9.1829), ("Karlsruhe", 49.0069, 8.4037),
                           ("Mannheim", 49.4875, 8.4660), ("Freiburg", 47.9990, 7.8421)]:
        response = requests.get("https://prices.openfoodfacts.org/api/v1/prices", timeout=30,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            params={"lat": lat, "lon": lon, "radius_km": 30, "size": 100, "order_by": "-date", "type": "PRODUCT", "currency": "EUR"})
        response.raise_for_status()
        payload = response.json()
        report.append({"area": name, "total_in_radius": payload["total"], "inspected": len(payload["items"])})
        for item in payload["items"]:
            location, product = item.get("location") or {}, item.get("product") or {}
            retailer = canonical_retailer_name(location.get("osm_brand") or location.get("osm_name") or "")
            region_parts = {normalize_text(part).strip() for part in (location.get("osm_display_name") or "").split(",")}
            if not retailer or not region_parts.intersection({"baden-wurttemberg", "baden-wuerttemberg"}):
                continue
            if location.get("osm_tag_key") != "shop" or location.get("osm_tag_value") != "supermarket":
                continue
            if item.get("duplicate_of") or product.get("source") != "off":
                continue
            candidates[item["id"]] = {"price_id": item["id"], "gtin": item["product_code"],
                "date": item["date"], "price": item["price"], "discounted": item["price_is_discounted"],
                "brand": product.get("brands"), "name": product.get("product_name"), "pack": product.get("quantity"),
                "categories": product.get("categories_tags"), "retailer": retailer,
                "location": location.get("osm_display_name"), "source_url": f"https://prices.openfoodfacts.org/prices/{item['id']}"}
    ordered = sorted(candidates.values(), key=lambda item: (item["date"] or "", item["price_id"]), reverse=True)
    output = ROOT / "artifacts" / "bw-discovery.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"fetched_at": datetime.now(UTC).isoformat(), "areas": report, "candidates": ordered},
                                ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"areas": report, "candidates": len(ordered), "report": str(output)}, indent=2))
    for item in ordered[:30]:
        print(json.dumps({key: item[key] for key in ["price_id", "gtin", "date", "price", "discounted", "retailer", "name", "pack"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
