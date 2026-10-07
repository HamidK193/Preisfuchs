from __future__ import annotations

import os
from pathlib import Path

from supabase import create_client
from postgrest.exceptions import APIError


ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / ".env"


def load_dotenv() -> None:
    if not ENV_FILE.exists():
        return

    for line in ENV_FILE.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip().lstrip("\ufeff"), value.strip().strip('"'))


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(
            f"Missing {name}. Lege eine .env Datei im Projektordner an oder setze die Variable in PowerShell."
        )
    return value


def main() -> None:
    load_dotenv()
    url = require_env("SUPABASE_URL")
    service_role_key = require_env("SUPABASE_SERVICE_ROLE_KEY")
    anon_key = require_env("SUPABASE_ANON_KEY")

    client = create_client(url, service_role_key)
    anon_client = create_client(url, anon_key)

    products_response = client.table("products").select("id", count="exact").limit(1).execute()
    retailers_response = client.table("retailers").select("id", count="exact").limit(1).execute()
    try:
        client.table("price_observations").select("id,requires_app,is_public,article_id,source_ref,price_basis").limit(1).execute()
        anon_client.table("current_price_observations").select("id,requires_app,article_name,package,comparison_key").limit(1).execute()
    except Exception as error:
        raise SystemExit(
            "Supabase schema is outdated. Apply the checked-in migrations for app discounts, "
            "publication gating and current_price_observations before enabling imports. "
            f"Details: {error}"
        ) from error

    assert_anon_select_denied(
        anon_client,
        relation="price_observations",
        columns="raw_payload",
        label="price_observations.raw_payload",
    )
    assert_anon_select_denied(
        anon_client,
        relation="update_runs",
        columns="id",
        label="update_runs",
    )

    print("Supabase connection OK")
    print(f"products rows: {products_response.count}")
    print(f"retailers rows: {retailers_response.count}")
    print("schema: app discounts + publication gate + current-price view OK")
    print("anon security: raw payload and update runs denied")


def assert_anon_select_denied(client, *, relation: str, columns: str, label: str) -> None:
    try:
        client.table(relation).select(columns).limit(1).execute()
    except APIError as error:
        if error.code == "42501":
            return
        raise
    raise SystemExit(f"Security check failed: anon can read {label}.")


if __name__ == "__main__":
    main()
