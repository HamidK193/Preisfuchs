"""Shared helpers for the source agents (OSM, Open Food Facts, retailer offers).

Kept independent of price_update_job so each agent runs on its own.
"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import UTC, datetime
from pathlib import Path

try:
    from supabase import create_client
except ImportError:  # pragma: no cover - handled in CI by requirements.txt
    create_client = None

ROOT = Path(__file__).resolve().parents[2]
PRODUCTS_FILE = ROOT / "data" / "standard_products.json"
USER_AGENT = os.getenv(
    "PRICEFUCHS_USER_AGENT",
    "Preisfuchs-MVP/0.2 (https://github.com/HamidK193/Preisfuchs)",
)


def load_dotenv() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip().lstrip("﻿"), value.strip().strip('"'))


def is_dry_run() -> bool:
    return os.getenv("PRICEFUCHS_DRY_RUN", "").lower() in {"1", "true", "yes"}


def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key or create_client is None:
        return None
    return create_client(url, key)


def require_client():
    """Supabase client, or None for a dry run; exits when credentials are missing."""
    if is_dry_run():
        return None
    client = get_supabase_client()
    if client is None:
        raise SystemExit("Backend credentials missing. Set PRICEFUCHS_DRY_RUN=1 for a read-only run.")
    return client


def start_update_run(client, source: str) -> str:
    run_id = str(uuid.uuid4())
    client.table("update_runs").insert({"id": run_id, "source": source, "status": "running"}).execute()
    return run_id


def finish_update_run(client, run_id: str, *, status: str, report: dict) -> None:
    client.table("update_runs").update({
        "finished_at": datetime.now(UTC).isoformat(),
        "status": status,
        "imported_count": report.get("imported", 0),
        "report": report,
    }).eq("id", run_id).execute()


def is_valid_gtin(value: str) -> bool:
    if not value.isdigit() or len(value) not in {8, 12, 13, 14}:
        return False
    digits = [int(character) for character in value]
    check_digit = digits.pop()
    weighted_sum = sum(digit * (3 if index % 2 == 0 else 1) for index, digit in enumerate(reversed(digits)))
    return (10 - weighted_sum % 10) % 10 == check_digit


def seed_barcodes() -> set[str]:
    return {barcode for item in json.loads(PRODUCTS_FILE.read_text(encoding="utf-8"))
            for barcode in item.get("barcodes", [])}


def parse_euro_price(value: str) -> str | None:
    match = re.search(r"(\d{1,3}),(\d{2})", value)
    return f"{match.group(1)}.{match.group(2)}" if match else None
