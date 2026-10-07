"""Conservative article identity and comparison rules, independent of retailers."""
from __future__ import annotations

import hashlib
import json
import re
import uuid
from copy import deepcopy
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_CEILING
from pathlib import Path

DATA = Path(__file__).resolve().parents[2] / "data"
UNITS = {
    "g": ("g", 1), "kg": ("g", 1000), "ml": ("ml", 1), "l": ("ml", 1000),
    "stück": ("each", 1), "stuck": ("each", 1), "stk": ("each", 1),
    "wl": ("wash", 1), "rollen": ("roll", 1), "beutel": ("bag", 1),
}


def parse_package(text: str | None) -> dict | None:
    """Parse an entire quantity label; ambiguous/variable/drained weights need review."""
    if not isinstance(text, str):
        return None
    match = re.fullmatch(
        r"\s*(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|stück|stuck|stk\.?|wl|rollen|beutel)\s*",
        text, re.I,
    )
    if not match:
        return None
    count = int(match[1] or 1)
    unit, factor = UNITS[match[3].lower().rstrip(".")]
    amount = Decimal(match[2].replace(",", ".")) * factor
    if not 0 < count <= 10000 or not 0 < amount <= 1000000:
        return None
    if unit in {"each", "wash", "roll", "bag"} and amount != amount.to_integral_value():
        return None
    return {"amount": str(amount.normalize()), "unit": unit, "count": count,
            "total": str((amount * count).normalize()), "original": text.strip()}


def package_key(package: dict) -> str:
    # Same total content does not erase the distinction between single and multipack.
    return f"{package['count']}x{Decimal(package['amount']).normalize()}{package['unit']}"


def purchase_for_need(package: dict, need: str, unit: str, price_cents: int) -> dict:
    quantity = Decimal(need)
    if unit != package["unit"] or not quantity.is_finite() or quantity <= 0:
        raise ValueError("Need must be positive and use the package's canonical unit")
    if isinstance(price_cents, bool) or not isinstance(price_cents, int) or price_cents < 0:
        raise ValueError("Price must be integer cents")
    content = Decimal(package["total"])
    count = int((quantity / content).to_integral_value(rounding=ROUND_CEILING))
    return {"packs": count, "cost_cents": count * price_cents,
            "surplus": str(content * count - quantity), "unit": unit}


def money_cents(value) -> int | None:
    try:
        amount = Decimal(str(value).replace(",", "."))
        if not amount.is_finite() or not 0 < amount <= 1000 or amount != amount.quantize(Decimal(".01")):
            return None
        return int(amount * 100)
    except (InvalidOperation, ValueError):
        return None


def load_rules(path: Path = DATA / "product_rules.json") -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload["version"] != 1:
        raise ValueError("Unsupported product rule version")
    return payload["products"]


def load_corrections(path: Path = DATA / "catalog_corrections.json") -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload["version"] != 1:
        raise ValueError("Unsupported correction version")
    result = {}
    allowed = {"product_id", "name", "brand_name", "brand_type", "attributes", "package_text", "identity_verified"}
    for entry in payload["corrections"]:
        key = (entry["source"], entry["source_product_ref"])
        if key in result or not all(key) or entry["action"] not in {"replace", "isolate"}:
            raise ValueError(f"Invalid or duplicate correction: {key}")
        if not entry.get("reason") or not entry.get("evidence_url", "").startswith("https://"):
            raise ValueError(f"Correction needs reason and evidence: {key}")
        if datetime.fromisoformat(entry["reviewed_at"]).tzinfo is None:
            raise ValueError("Correction timestamp needs a timezone")
        if not isinstance(entry.get("before"), dict) or not isinstance(entry.get("after"), dict):
            raise ValueError("Correction needs before/after audit values")
        if set(entry["after"]) - allowed:
            raise ValueError(f"Correction cannot override protected fields: {key}")
        result[key] = entry
    return result


def stable_id(namespace: str, reference: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"preisfuchs:{namespace}:{reference}"))


def resolve_article(draft: dict, rules: dict, corrections: dict) -> dict:
    automatic = deepcopy(draft)
    correction = corrections.get((draft["source"], draft["source_product_ref"]))
    if correction:
        draft = {**draft, **deepcopy(correction["after"])}
    rule = rules.get(draft["product_id"])
    if rule is None:
        raise ValueError(f"Product has no comparison rule: {draft['product_id']}")
    attrs = draft.get("attributes", {})
    package = parse_package(draft.get("package_text"))
    reasons = []
    verified = draft.get("identity_verified") is True
    if not verified:
        reasons.append("article_identity_unverified")
    if not (correction or {}).get("evidence_url", draft.get("evidence_url", "")).startswith("https://"):
        reasons.append("evidence_missing")
    if package is None:
        reasons.append("package_unknown")
    brand_type = draft.get("brand_type", "unknown")
    if brand_type not in {"private_label", "manufacturer", "unbranded"}:
        reasons.append("brand_status_unknown")
    if brand_type in {"private_label", "manufacturer"} and not draft.get("brand_name"):
        reasons.append("brand_name_missing")
    if not draft.get("name", "").strip():
        reasons.append("article_name_missing")
    missing = [key for key in rule["required_attributes"]
               if key not in attrs or attrs[key] is None or attrs[key] == "" or attrs[key] == "unknown"]
    isolated = correction is not None and correction["action"] == "isolate"
    if isolated:
        reasons.append("manual_do_not_merge")
    # A verified GTIN identifies a manufacturer article even if comparison
    # attributes are incomplete. Alternatives require EVERY attribute explicitly.
    article_ref = draft.get("gtin") or f"{draft['source']}:{draft['source_product_ref']}"
    article_id = stable_id("article", article_ref)
    comparison_key = None
    if not reasons and not missing and brand_type in {"private_label", "unbranded"}:
        values = {key: attrs[key] for key in rule["required_attributes"]}
        # Preserve any additional known distinctions, too.
        values.update(attrs)
        canonical = json.dumps([rule["product_type"], values, package_key(package)], sort_keys=True, ensure_ascii=False)
        comparison_key = "group:" + hashlib.sha256(canonical.encode()).hexdigest()[:32]
    return {
        "id": article_id, "product_id": draft["product_id"], "product_type": rule["product_type"],
        "source": draft["source"], "source_product_ref": draft["source_product_ref"],
        "gtin": draft.get("gtin"), "name": draft.get("name", ""),
        "brand_name": draft.get("brand_name"), "brand_type": brand_type,
        "attributes": attrs, "package": package, "comparison_key": comparison_key,
        "review_status": "verified" if not reasons else "needs_review",
        "review_reasons": reasons, "missing_attributes": missing,
        "evidence_url": correction["evidence_url"] if correction else draft.get("evidence_url"),
        "correction": correction, "automatic_values": automatic,
    }
