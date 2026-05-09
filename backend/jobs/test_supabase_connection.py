from __future__ import annotations

import os
from pathlib import Path

from supabase import create_client


ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / ".env"


def load_dotenv() -> None:
    if not ENV_FILE.exists():
        return

    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"'))


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
    key = require_env("SUPABASE_SERVICE_ROLE_KEY")

    client = create_client(url, key)

    products_response = client.table("products").select("id", count="exact").limit(1).execute()
    retailers_response = client.table("retailers").select("id", count="exact").limit(1).execute()

    print("Supabase connection OK")
    print(f"products rows: {products_response.count}")
    print(f"retailers rows: {retailers_response.count}")


if __name__ == "__main__":
    main()
