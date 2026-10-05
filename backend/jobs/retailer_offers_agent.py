"""Weekly agent: current offers published by retailers on their own websites.

One adapter per retailer. Adapters only read pages that the retailer's
robots.txt allows, pause between requests and store facts (name, price,
package, unit price, validity) with an honest source label such as
"REWE Angebote (rewe.de), 5.–11. Oktober". Product images are not copied.
Retailers that block automated access (e.g. HTTP 403) are skipped, never bypassed.
"""
from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any, Callable
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

from agent_common import (
    USER_AGENT, finish_update_run, is_dry_run, load_dotenv, parse_euro_price, require_client, start_update_run,
)

PAGE_PAUSE_SECONDS = float(os.getenv("OFFERS_PAUSE_SECONDS", "3"))
REWE_CATEGORIES = [
    "topangebote", "obst-und-gemuese", "frische-und-convenience", "kuehlung", "tiefkuehl", "fruehstueck",
    "kochen-und-backen", "suesses-und-salziges", "getraenke", "alkoholfreie-getraenke", "bier",
    "wein-und-spirituosen", "haushalt", "drogerie", "tier", "payback", "freizeit-und-mode",
]


@dataclass(frozen=True)
class Adapter:
    retailer_id: str
    label: str
    robots_url: str
    pages: Callable[[], list[tuple[str, str]]]  # (category, url)
    parse: Callable[[str, str, str, str], list[dict[str, Any]]]  # (html, category, url, fetched_at)


def iso_week_range(week: str) -> tuple[date, date] | None:
    match = re.fullmatch(r"(\d{4})/(\d{1,2})", week or "")
    if not match:
        return None
    year, number = int(match[1]), int(match[2])
    try:
        return date.fromisocalendar(year, number, 1), date.fromisocalendar(year, number, 7)
    except ValueError:
        return None


MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August",
          "September", "Oktober", "November", "Dezember"]


def week_label(start: date, end: date) -> str:
    """Plain-language date range for shoppers, e.g. "5.–11. Oktober"."""
    if start.month == end.month:
        return f"{start.day}.–{end.day}. {MONTHS[end.month - 1]}"
    return f"{start.day}. {MONTHS[start.month - 1]} – {end.day}. {MONTHS[end.month - 1]}"


def parse_unit_price_text(text: str) -> tuple[str | None, str | None]:
    match = re.search(r"1\s*(kg|l|g|ml|Stück|St\.|m|Wl\.?)\s*=\s*(\d+(?:[.,]\d+)?)\s*€", text)
    return (parse_euro_price(match[2]), match[1]) if match else (None, None)


def parse_rewe(html: str, category: str, url: str, fetched_at: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for tile in soup.select("article.cor-offer-renderer-tile"):
        link = tile.select_one("[data-offer-title]")
        price_tag = tile.select_one(".cor-offer-price__tag-price")
        if not link or not price_tag:
            continue
        price = parse_euro_price(price_tag.get_text(" ", strip=True))
        week = link.get("data-offer-week", "")
        validity = iso_week_range(week)
        if not price or not validity:
            continue
        details = " ".join(span.get_text(" ", strip=True) for span in tile.select(".cor-offer-information__additional"))
        details = re.sub(r"\s+,", ",", details).strip(" ,") or None
        unit_price, unit = parse_unit_price_text(details or "")
        label = tile.select_one(".cor-offer-price__tag-label")
        offer_ref = link.get("data-offer-nan") or link.get("data-offer-title")
        rows.append({
            "id": f"rewe:{week}:{offer_ref}",
            "retailer_id": "rewe",
            "retailer_name": "Rewe",
            "title": link["data-offer-title"].strip(),
            "details": details,
            "price": price,
            "unit_price": unit_price,
            "unit": unit,
            "price_label": label.get_text(" ", strip=True) if label else None,
            "category": category,
            "valid_from": validity[0].isoformat(),
            "valid_until": validity[1].isoformat(),
            "offer_week": week,
            "scope": "national",
            "source": "REWE Angebote (rewe.de)",
            "source_label": f"REWE Angebote (rewe.de), {week_label(*validity)}",
            "source_url": url,
            "source_ref": offer_ref,
            "fetched_at": fetched_at,
            "is_public": True,
        })
    return rows


ADAPTERS = {
    "rewe": Adapter(
        retailer_id="rewe",
        label="REWE nationale Angebote",
        robots_url="https://www.rewe.de/robots.txt",
        pages=lambda: [(c, f"https://www.rewe.de/angebote/nationale-angebote/{c}/") for c in REWE_CATEGORIES],
        parse=parse_rewe,
    ),
}


def load_robots(session: requests.Session, url: str) -> RobotFileParser:
    robots = RobotFileParser(url)
    response = session.get(url, timeout=20)
    response.raise_for_status()
    robots.parse(response.text.splitlines())
    return robots


def run_adapter(session: requests.Session, adapter: Adapter, fetched_at: str) -> tuple[list[dict], dict]:
    summary: dict[str, Any] = {"pages": 0, "offers": 0, "skipped_by_robots": [], "errors": []}
    robots = load_robots(session, adapter.robots_url)
    rows: dict[str, dict] = {}
    for index, (category, url) in enumerate(adapter.pages()):
        if not robots.can_fetch(USER_AGENT, url):
            summary["skipped_by_robots"].append(category)
            continue
        if index:
            time.sleep(PAGE_PAUSE_SECONDS)
        try:
            response = session.get(url, timeout=30)
            if response.status_code in {401, 403, 429}:
                summary["errors"].append({"category": category, "status": response.status_code})
                break  # The retailer is refusing automated access; stop instead of retrying.
            response.raise_for_status()
        except requests.RequestException as error:
            summary["errors"].append({"category": category, "error_type": type(error).__name__})
            continue
        summary["pages"] += 1
        for row in adapter.parse(response.text, category, url, fetched_at):
            rows.setdefault(row["id"], row)  # The first (most specific) category wins.
    summary["offers"] = len(rows)
    return list(rows.values()), summary


def main() -> None:
    load_dotenv()
    dry_run = is_dry_run()
    client = require_client()
    only = {name.strip() for name in os.getenv("OFFER_ADAPTERS", "").split(",") if name.strip()}
    fetched_at = datetime.now(UTC).isoformat()
    report: dict[str, Any] = {"status": "failed", "dry_run": dry_run, "adapters": {}, "imported": 0}
    run_id = start_update_run(client, "Retailer offers") if client else None
    try:
        with requests.Session() as session:
            session.headers.update({"User-Agent": USER_AGENT, "Accept": "text/html", "Accept-Language": "de-DE"})
            for name, adapter in ADAPTERS.items():
                if only and name not in only:
                    continue
                try:
                    rows, summary = run_adapter(session, adapter, fetched_at)
                except requests.RequestException as error:
                    report["adapters"][name] = {"errors": [{"error_type": type(error).__name__}], "offers": 0}
                    continue
                report["adapters"][name] = summary
                if client:
                    for offset in range(0, len(rows), 200):
                        client.table("retailer_offers").upsert(rows[offset:offset + 200]).execute()
                report["imported"] += len(rows)
                if dry_run:
                    report.setdefault("samples", {})[name] = rows[:3]
        failed = [n for n, s in report["adapters"].items() if s.get("errors") and not s.get("offers")]
        report["status"] = ("failed" if not report["imported"] else "partial" if failed or any(
            s.get("errors") for s in report["adapters"].values()) else "succeeded")
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
