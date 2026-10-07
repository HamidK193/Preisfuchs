"""Paginated, local pre-migration data snapshot. Never prints credentials or rows."""
import hashlib
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend" / "jobs"))
from price_update_job import get_supabase_client, load_dotenv


def main():
    load_dotenv()
    client = get_supabase_client()
    if client is None:
        raise SystemExit("Backend credentials missing")
    folder = ROOT / "artifacts" / ("supabase-backup-" + datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ"))
    folder.mkdir(parents=True, exist_ok=False)
    manifest = {}
    for table in ("products", "retailers", "stores", "price_observations", "update_runs"):
        expected = client.table(table).select("id", count="exact").limit(1).execute().count
        rows = []
        while True:
            page = client.table(table).select("*").order("id").range(len(rows), len(rows) + 999).execute().data
            rows.extend(page)
            if len(page) < 1000:
                break
        if len(rows) != expected or len({row["id"] for row in rows}) != expected:
            raise RuntimeError(f"Inconsistent snapshot for {table}; stop rollout")
        payload = json.dumps(rows, ensure_ascii=False, indent=2).encode("utf-8")
        (folder / f"{table}.json").write_bytes(payload)
        manifest[table] = {"rows": len(rows), "sha256": hashlib.sha256(payload).hexdigest()}
    (folder / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"folder": str(folder), "tables": manifest}, indent=2))


if __name__ == "__main__":
    main()
