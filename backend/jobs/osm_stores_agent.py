"""Weekly agent: supermarket branches across Germany from OpenStreetMap.

Loads every supermarket of the known chains per federal state via Overpass and
upserts address, coordinates and opening hours into `stores`. Data is
© OpenStreetMap contributors under ODbL 1.0; attribution must stay visible.
"""
from __future__ import annotations

import json
import os
import re
import time
import unicodedata
import uuid
from datetime import UTC, datetime
from typing import Any

import requests

from agent_common import USER_AGENT, finish_update_run, is_dry_run, load_dotenv, require_client, start_update_run

SOURCE = "OpenStreetMap"
LICENSE = "ODbL 1.0 – © OpenStreetMap contributors"
OVERPASS_URL = os.getenv("OVERPASS_URL", "https://overpass-api.de/api/interpreter")
STATE_PAUSE_SECONDS = float(os.getenv("OVERPASS_PAUSE_SECONDS", "10"))

STATES = {
    "DE-BW": "Baden-Württemberg", "DE-BY": "Bayern", "DE-BE": "Berlin", "DE-BB": "Brandenburg",
    "DE-HB": "Bremen", "DE-HH": "Hamburg", "DE-HE": "Hessen", "DE-MV": "Mecklenburg-Vorpommern",
    "DE-NI": "Niedersachsen", "DE-NW": "Nordrhein-Westfalen", "DE-RP": "Rheinland-Pfalz",
    "DE-SL": "Saarland", "DE-SN": "Sachsen", "DE-ST": "Sachsen-Anhalt",
    "DE-SH": "Schleswig-Holstein", "DE-TH": "Thüringen",
}

# id -> (display name, normalized_name, normalized OSM brand values)
RETAILERS = {
    "aldi_sued": ("Aldi Süd", "aldi sued", {"aldi sued", "aldi sud"}),
    "aldi_nord": ("Aldi Nord", "aldi nord", {"aldi nord"}),
    "lidl": ("Lidl", "lidl", {"lidl"}),
    "rewe": ("Rewe", "rewe", {"rewe", "rewe city", "rewe center", "rewe to go"}),
    "edeka": ("Edeka", "edeka", {"edeka", "e center", "edeka center", "e aktiv markt", "edeka xpress"}),
    "kaufland": ("Kaufland", "kaufland", {"kaufland"}),
    "penny": ("Penny", "penny", {"penny"}),
    # Plain "Netto" in Germany is almost always Netto Marken-Discount; the
    # Danish chain is identified via its Wikidata ID below.
    "netto_md": ("Netto Marken-Discount", "netto marken-discount", {"netto marken discount", "netto"}),
    "netto_dansk": ("Netto (Stavenhagen)", "netto stavenhagen", set()),
    "norma": ("Norma", "norma", {"norma"}),
    "globus": ("Globus", "globus", {"globus"}),
    "marktkauf": ("Marktkauf", "marktkauf", {"marktkauf"}),
    "nahkauf": ("nahkauf", "nahkauf", {"nahkauf"}),
    "tegut": ("tegut", "tegut", {"tegut", "tegut teo"}),
    "famila": ("famila", "famila", {"famila"}),
    "hit": ("HIT", "hit", {"hit"}),
}
WIKIDATA_RETAILERS = {
    "Q41171672": "aldi_sued", "Q41171373": "aldi_nord", "Q151954": "lidl",
    "Q879858": "netto_md", "Q552652": "netto_dansk",
}


def normalize(value: str) -> str:
    value = value.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


BRAND_INDEX = {alias: retailer_id for retailer_id, (_, _, aliases) in RETAILERS.items() for alias in aliases}


def detect_retailer(tags: dict[str, str]) -> str | None:
    wikidata = tags.get("brand:wikidata")
    if wikidata in WIKIDATA_RETAILERS:
        return WIKIDATA_RETAILERS[wikidata]
    if tags.get("brand"):
        return BRAND_INDEX.get(normalize(tags["brand"]))
    # Without a brand tag, only trust names that start with a known chain.
    name = normalize(tags.get("name", ""))
    for alias in sorted(BRAND_INDEX, key=len, reverse=True):
        if name == alias or name.startswith(alias + " "):
            return BRAND_INDEX[alias]
    return None


def store_row(element: dict[str, Any], state: str, seen_at: str) -> dict[str, Any] | None:
    tags = element.get("tags") or {}
    retailer_id = detect_retailer(tags)
    lat = element.get("lat", (element.get("center") or {}).get("lat"))
    lon = element.get("lon", (element.get("center") or {}).get("lon"))
    if not retailer_id or not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        return None
    source_ref = f"{element['type']}/{element['id']}"
    street = " ".join(filter(None, [tags.get("addr:street"), tags.get("addr:housenumber")])) or None
    return {
        "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"https://www.openstreetmap.org/{source_ref}")),
        "retailer_id": retailer_id,
        "name": tags.get("name") or RETAILERS[retailer_id][0],
        "street": street,
        "postcode": tags.get("addr:postcode"),
        "city": tags.get("addr:city"),
        "state": state,
        "latitude": lat,
        "longitude": lon,
        "opening_hours": tags.get("opening_hours"),
        "source": SOURCE,
        "source_ref": source_ref,
        "source_license": LICENSE,
        "is_active": True,
        "last_seen_at": seen_at,
        "updated_at": seen_at,
    }


def overpass_query(iso_code: str) -> str:
    return f"""
[out:json][timeout:600];
area["ISO3166-2"="{iso_code}"]["admin_level"="4"]->.state;
nwr["shop"~"^(supermarket|discount_supermarket)$"](area.state);
out center tags;
"""


def fetch_state(session: requests.Session, iso_code: str) -> list[dict[str, Any]]:
    for attempt in range(4):
        response = session.post(OVERPASS_URL, data={"data": overpass_query(iso_code)}, timeout=700)
        if response.status_code in {429, 502, 503, 504}:
            time.sleep(60 * (attempt + 1))
            continue
        response.raise_for_status()
        payload = response.json()
        if payload.get("remark", "").lower().startswith("runtime error"):
            raise ValueError(f"Overpass error for {iso_code}: {payload['remark'][:200]}")
        return payload.get("elements", [])
    raise ValueError(f"Overpass unavailable for {iso_code}")


def retailer_rows() -> list[dict[str, str]]:
    return [{"id": rid, "name": name, "normalized_name": norm} for rid, (name, norm, _) in RETAILERS.items()]


def main() -> None:
    load_dotenv()
    dry_run = is_dry_run()
    client = require_client()
    started = datetime.now(UTC).isoformat()
    only = {code.strip() for code in os.getenv("OSM_STATES", "").split(",") if code.strip()}
    states = {code: name for code, name in STATES.items() if not only or code in only}
    report: dict[str, Any] = {"status": "failed", "dry_run": dry_run, "states": {}, "errors": [], "imported": 0}
    run_id = start_update_run(client, SOURCE) if client else None
    try:
        if client:
            client.table("retailers").upsert(retailer_rows()).execute()
        with requests.Session() as session:
            session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})
            for index, (iso_code, state) in enumerate(states.items()):
                if index:
                    time.sleep(STATE_PAUSE_SECONDS)
                try:
                    elements = fetch_state(session, iso_code)
                except (requests.RequestException, ValueError) as error:
                    report["errors"].append({"state": iso_code, "error_type": type(error).__name__})
                    continue
                rows = {row["id"]: row for e in elements if (row := store_row(e, state, started))}
                report["states"][iso_code] = {"elements": len(elements), "stores": len(rows)}
                if client:
                    batch = list(rows.values())
                    for offset in range(0, len(batch), 500):
                        client.table("stores").upsert(batch[offset:offset + 500]).execute()
                report["imported"] += len(rows)
        # Deactivate branches that vanished from OSM, but only after a complete run.
        if client and not report["errors"] and not only:
            closed = (client.table("stores").update({"is_active": False}).eq("source", SOURCE)
                      .eq("is_active", True).lt("last_seen_at", started).execute().data)
            report["deactivated"] = len(closed)
        report["status"] = "failed" if not report["states"] else "partial" if report["errors"] else "succeeded"
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
