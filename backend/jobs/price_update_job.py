from __future__ import annotations

import json
import os
import re
import time
import unicodedata
import uuid
from dataclasses import dataclass, field
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from catalog_identity import load_corrections, load_rules, money_cents, resolve_article, stable_id

try:
    from supabase import create_client
except ImportError:  # pragma: no cover - handled in CI by requirements.txt
    create_client = None


ROOT = Path(__file__).resolve().parents[2]
PRODUCTS_FILE = ROOT / "data" / "standard_products.json"
OPEN_PRICES_BASE_URL = os.getenv("OPEN_PRICES_BASE_URL", "https://prices.openfoodfacts.org").rstrip("/")
USER_AGENT = os.getenv(
    "PRICEFUCHS_USER_AGENT",
    "Preisfuchs-MVP/0.2 (https://github.com/HamidK193/Preisfuchs)",
)

RETAILER_SLUGS = {
    "aldi_sued": ("Aldi Süd", "Aldi-Sued"),
    "lidl": ("Lidl", "Lidl"),
    "rewe": ("Rewe", "REWE"),
    "edeka": ("Edeka", "Edeka"),
    "kaufland": ("Kaufland", "Kaufland"),
}

RETAILER_ALIASES = {
    "Aldi Süd": ["aldi sued", "aldi sud"],
    "Lidl": ["lidl"],
    "Rewe": ["rewe"],
    "Edeka": ["edeka", "e center", "e-center"],
    "Kaufland": ["kaufland"],
}

ALLOWED_PRODUCT_CATEGORIES = {
    "Obst",
    "Gemüse",
    "Frische",
    "Molkerei",
    "Backen",
    "Backwaren",
    "Trockenware",
    "Getränke",
    "Süßigkeiten",
    "Tiefkühl",
    "Fleisch",
    "Drogerie",
    "Baby",
    "Tierbedarf",
}

RETAILER_NAME_TOKENS = {
    "aldi süd",
    "aldi sued",
    "aldi",
    "lidl",
    "rewe",
    "edeka",
    "e center",
    "e-center",
    "kaufland",
    "penny",
    "netto",
    "norma",
    "globus",
    "tegut",
    "hit",
    "rossmann",
    "dm",
    "müller",
}

PRIVATE_LABEL_BRANDS = {
    "Gut & Günstig", "Gut Bio", "Milbona", "Milsani", "K-Classic", "K-Bio",
    "REWE Regional", "REWE Beste Wahl", "ja!", "Snack Day", "Solevita", "Rio D'Oro",
    "Brölio", "WIFFKIDS", "Cucina Nobile", "Combino", "Fin Carré", "Alesto",
    "Sondey", "Chef Select", "Cien", "Crownfield", "Freshona", "Dulano", "Bellarom",
    "Snack Fun", "Choceur", "Grandessa", "Goldähren", "Meine Metzgerei", "Naturgut",
    "Food for Future", "BioBio",
}

MANUFACTURER_BRANDS = {
    "Rügenwalder Mühle", "funny-frisch", "Dr. Oetker", "Coca-Cola", "Kellogg's",
    "Kellogg’s", "Kerrygold", "Langnese", "Schwartau", "Valensina", "Pringles",
    "Barilla", "Kölln", "Oryza", "Milka", "Haribo", "Katjes", "Leibniz", "Meggle",
    "Innocent", "Trolli", "Lay's", "Chiquita", "Iglo", "Volvic", "Persil", "Fairy",
    "Pampers", "HiPP", "Sheba", "Pedigree", "Harry", "ültje",
}

PRODUCT_QUERY_OVERRIDES = {
    "milk_15": "Milch",
    "butter_250": "Butter",
    "eggs_10": "Eier",
    "yogurt_500": "Joghurt",
    "cheese_slices_400": "Käse",
    "quark_500": "Quark",
    "cream_200": "Sahne",
    "mozzarella_125": "Mozzarella",
    "pasta_500": "Nudeln",
    "rice_1kg": "Reis",
    "oats_500": "Haferflocken",
    "lentils_500": "Linsen",
    "canned_tomatoes_400": "Dosentomaten",
    "tuna_195": "Thunfisch",
    "flour_1kg": "Mehl",
    "sugar_1kg": "Zucker",
    "oil_1l": "Öl",
    "baking_powder": "Backpulver",
    "cocoa_250": "Kakao",
    "yeast": "Hefe",
    "coffee_500": "Kaffee",
    "water_15l": "Mineralwasser",
    "orange_juice_1l": "Orangensaft",
    "cola_125l": "Cola",
    "tea_20": "Tee",
    "beer_05": "Pils",
    "bananas_1kg": "Bananen",
    "apples_1kg": "Äpfel",
    "oranges_1kg": "Orangen",
    "strawberries_500": "Erdbeeren",
    "grapes_500": "Weintrauben",
    "pears_1kg": "Birnen",
    "lemons_500": "Zitronen",
    "tomatoes_500": "Tomaten",
    "cucumber_each": "Gurken",
    "carrots_1kg": "Karotten",
    "potatoes_25kg": "Kartoffeln",
    "onions_1kg": "Zwiebeln",
    "bell_peppers_500": "Paprika",
    "salad_each": "Salat",
    "broccoli_500": "Broccoli",
    "chocolate_100": "Schokolade",
    "gummy_bears_200": "Fruchtgummi",
    "cookies_200": "Kekse",
    "chips_175": "Chips",
    "nuts_200": "Nüsse",
    "frozen_pizza_each": "Tiefkühlpizza",
    "fries_750": "Pommes",
    "icecream_500": "Eis",
    "frozen_vegetables_750": "Gemüse",
    "fish_sticks_450": "Fischstäbchen",
    "toast_500": "Toastbrot",
    "bread_rolls_6": "Aufbackbrötchen",
    "wholegrain_bread_500": "Vollkornbrot",
    "muesli_500": "Müsli",
    "cornflakes_500": "Cornflakes",
    "jam_450": "Marmelade",
    "honey_500": "Honig",
    "ketchup_500": "Ketchup",
    "mayonnaise_500": "Mayonnaise",
    "mustard_250": "Senf",
    "chicken_breast_400": "Hähnchen",
    "minced_meat_500": "Hackfleisch",
    "salami_200": "Salami",
    "ham_200": "Schinken",
    "sausages_400": "Würstchen",
    "toilet_paper_10": "Toilettenpapier",
    "detergent_20": "Waschmittel",
    "dish_soap_500": "Spülmittel",
    "kitchen_towels_4": "Küchenrollen",
    "diapers_4": "Windeln",
    "baby_food_190": "Babybrei",
    "wet_wipes_80": "Feuchttücher",
    "cat_food_400": "Katzenfutter",
    "dog_food_1kg": "Hundefutter",
    "cat_litter_10l": "Katzenstreu",
}


def load_dotenv() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return

    for line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip().lstrip("\ufeff"), value.strip().strip('"'))


@dataclass(frozen=True)
class ProductSeed:
    id: str
    name: str
    category: str
    package_size: str
    search_terms: list[str]
    barcodes: list[str]
    barcode_product_names: dict[str, str] = field(default_factory=dict)


def load_products() -> list[ProductSeed]:
    payload = json.loads(PRODUCTS_FILE.read_text(encoding="utf-8"))
    products = [ProductSeed(**item) for item in payload]
    seen_ids: set[str] = set()
    seen_barcodes: set[str] = set()
    for product in products:
        if not re.fullmatch(r"[a-z0-9_]+", product.id) or product.id in seen_ids:
            raise ValueError(f"Invalid or duplicate product id: {product.id!r}")
        if not product.name.strip() or not product.category.strip() or not product.package_size.strip():
            raise ValueError(f"Incomplete product seed: {product.id}")
        if product.category not in ALLOWED_PRODUCT_CATEGORIES:
            raise ValueError(f"Unknown category for {product.id}: {product.category!r}")
        if contains_retailer_name(product.name):
            raise ValueError(f"Retailer name must not be part of product name: {product.id}")
        if not product.search_terms or any(not term.strip() for term in product.search_terms):
            raise ValueError(f"Missing search terms: {product.id}")
        if not set(product.barcode_product_names).issubset(product.barcodes):
            raise ValueError(f"Barcode metadata without matching barcode: {product.id}")
        if any(not name.strip() for name in product.barcode_product_names.values()):
            raise ValueError(f"Empty barcode product name: {product.id}")
        for barcode in product.barcodes:
            if not is_valid_gtin(barcode) or barcode in seen_barcodes:
                raise ValueError(f"Invalid or duplicate barcode for {product.id}: {barcode!r}")
            seen_barcodes.add(barcode)
        seen_ids.add(product.id)
    return products


def is_valid_gtin(value: str) -> bool:
    if not value.isdigit() or len(value) not in {8, 12, 13, 14}:
        return False
    digits = [int(character) for character in value]
    check_digit = digits.pop()
    weighted_sum = sum(
        digit * (3 if index % 2 == 0 else 1)
        for index, digit in enumerate(reversed(digits))
    )
    return (10 - weighted_sum % 10) % 10 == check_digit


def fetch_open_prices_for_barcode(barcode: str) -> list[dict[str, Any]]:
    """Fetch observed prices for one barcode from Open Prices.

    The Open Prices API is evolving, so the importer is defensive and keeps the
    raw payload for later inspection.
    """
    url = f"{OPEN_PRICES_BASE_URL}/api/v1/prices"
    rows = []
    with requests.Session() as session:
        session.mount("https://", HTTPAdapter(max_retries=Retry(
            total=2, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"], respect_retry_after_header=False,
        )))
        for page in range(1, 11):
            response = session.get(url, params={"product_code": barcode, "size": 100, "page": page, "order_by": "id"},
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"}, timeout=30)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
                raise ValueError("Open Prices returned an unexpected response")
            rows.extend(payload["items"])
            if page >= int(payload["pages"]):
                return rows
    raise ValueError("Open Prices page budget exceeded; no partial barcode import")


def fetch_kaufda_html(retailer_slug: str, query: str) -> tuple[str, str]:
    url = f"https://www.kaufda.de/{retailer_slug}/Sortiment/{quote(query)}"
    response = requests.get(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
        timeout=30,
    )
    response.raise_for_status()
    return response.url, response.text


def parse_kaufda_offers(
    *,
    product: ProductSeed,
    retailer_id: str,
    retailer_name: str,
    source_url: str,
    html: str,
) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    valid_until = parse_valid_until(soup.get_text("\n"))
    rows: list[dict[str, Any]] = []

    for item in soup.select('[role="listitem"]'):
        texts = [text.strip() for text in item.stripped_strings if text.strip()]
        price_text = first_price_text(texts)
        if not price_text:
            continue

        price = parse_euro_price(price_text)
        if price is None:
            continue

        if not matches_retailer(texts, retailer_name):
            continue

        brand = texts[0] if texts else ""
        offer_name = find_offer_name(texts, retailer_name)
        if not offer_name:
            continue

        unit_text = next((text for text in texts if re.search(r"\b(kg|l|g|ml)\b", text, re.I)), None)
        unit_price, unit = parse_unit_price(unit_text)
        full_name = clean_product_name(f"{brand} {offer_name}", fallback=product.name)
        brand_name, brand_type = classify_product_brand(brand, trust_unknown=True)
        access = classify_offer_access(texts, retailer_name)
        observed = datetime.now(UTC).isoformat()
        row_id = stable_price_id(
            "kaufda",
            product.id,
            retailer_id,
            full_name,
            str(price),
            valid_until.isoformat() if valid_until else date.today().isoformat(),
        )

        rows.append(
            {
                "id": row_id,
                "product_id": product.id,
                "retailer_id": retailer_id,
                "product_name": full_name[:240],
                "brand_name": brand_name,
                "brand_type": brand_type,
                "retailer_name": retailer_name,
                "price": price,
                "currency": "EUR",
                "unit_price": unit_price,
                "unit": unit,
                "observed_at": observed,
                "valid_until": valid_until.isoformat() if valid_until else None,
                **access,
                "source": "kaufDA Angebot",
                "source_url": source_url,
                "source_license": "unknown",
                "confidence": 0.58,
                "raw_payload": {
                    "texts": texts[:20],
                    "academic_mvp_source": True,
                },
            }
        )

    return dedupe_rows(rows)[:8]


def classify_offer_access(texts: list[str], retailer_name: str) -> dict[str, Any]:
    """Mark app-only offers without treating generic weekly deals as app prices."""
    combined = " ".join(texts).casefold()
    app_markers = (
        "lidl plus",
        "edeka app",
        "kaufland card",
        "rewe app",
        "aldi app",
        "app-preis",
        "app preis",
        "app-deal",
        "app deal",
        "app-rabatt",
        "nur mit app",
    )
    requires_app = any(marker in combined for marker in app_markers)
    if not requires_app:
        return {
            "offer_type": "sale",
            "requires_app": False,
            "is_personalized": False,
        }

    retailer_key = retailer_name.casefold()
    if "lidl" in retailer_key:
        app_name = "Lidl Plus"
    elif "edeka" in retailer_key:
        app_name = "EDEKA App"
    elif "kaufland" in retailer_key:
        app_name = "Kaufland Card"
    elif "rewe" in retailer_key:
        app_name = "REWE App"
    elif "aldi" in retailer_key:
        app_name = "ALDI App"
    else:
        app_name = f"{retailer_name} App"

    activation_required = True if app_name == "Lidl Plus" or "aktivier" in combined else None
    personalized = any(marker in combined for marker in ("personalisiert", "persönlich", "für dich"))
    return {
        "offer_type": "app_discount",
        "requires_app": True,
        "app_name": app_name,
        "coupon_activation_required": activation_required,
        "is_personalized": personalized,
        "discount_description": "App-Bedingungen und Verfügbarkeit vor dem Einkauf prüfen",
    }


def first_price_text(texts: list[str]) -> str | None:
    for text in texts:
        repaired = repair_mojibake(text)
        if re.fullmatch(r"\d{1,3},\d{2}\s*(?:\u20ac)?", repaired):
            return text
    return None


def parse_euro_price(value: str) -> str | None:
    match = re.search(r"(\d{1,3}),(\d{2})", value)
    if not match:
        return None
    return f"{match.group(1)}.{match.group(2)}"


def find_offer_name(texts: list[str], retailer_name: str) -> str | None:
    ignored = {
        retailer_name.lower(),
        "uvp",
        "mehr angebote",
    }
    candidates = []
    for text in texts[:8]:
        repaired = repair_mojibake(text)
        lowered = repaired.lower()
        if lowered in ignored or "\u20ac" in repaired or re.fullmatch(r"\d{1,3},\d{2}", repaired):
            continue
        if re.search(r"\b(kg|l|g|ml)\b", text, re.I):
            continue
        candidates.append(text)
    if len(candidates) >= 2:
        return candidates[1]
    return candidates[0] if candidates else None


def matches_retailer(texts: list[str], retailer_name: str) -> bool:
    haystack = normalize_text(" ".join(texts))
    return any(alias in haystack for alias in RETAILER_ALIASES.get(retailer_name, [normalize_text(retailer_name)]))


def normalize_text(value: str) -> str:
    repaired = repair_mojibake(value).lower().replace("\u00df", "ss")
    without_accents = unicodedata.normalize("NFKD", repaired)
    return "".join(char for char in without_accents if not unicodedata.combining(char))


def repair_mojibake(value: str) -> str:
    try:
        return value.encode("cp1252").decode("utf-8")
    except UnicodeError:
        return value


def contains_retailer_name(value: str) -> bool:
    normalized = normalize_text(value)
    return any(
        re.search(rf"\b{re.escape(normalize_text(retailer))}\b", normalized)
        for retailer in RETAILER_NAME_TOKENS
    )


def clean_product_name(value: str, fallback: str = "Produkt") -> str:
    cleaned = repair_mojibake(value)
    for retailer in sorted(RETAILER_NAME_TOKENS, key=len, reverse=True):
        cleaned = re.sub(
            rf"\b(?:(?:bei|von|im|aus dem)\s+)?{re.escape(retailer)}(?:\s+(?:markt|filiale))?\b",
            " ",
            cleaned,
            flags=re.IGNORECASE,
        )
    cleaned = re.sub(r"\b(?:mehr angebote|uvp|werbung)\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" :|,;-–—·")
    if cleaned:
        return cleaned
    fallback_cleaned = re.sub(r"\s+", " ", repair_mojibake(fallback)).strip()
    if fallback == "":
        return ""
    return fallback_cleaned or "Produkt"


def classify_product_brand(value: str, trust_unknown: bool = False) -> tuple[str | None, str]:
    normalized = normalize_brand_key(value)
    for brand in sorted(PRIVATE_LABEL_BRANDS, key=len, reverse=True):
        if re.search(rf"\b{re.escape(normalize_brand_key(brand))}\b", normalized):
            return brand, "private_label"
    for brand in sorted(MANUFACTURER_BRANDS, key=len, reverse=True):
        if re.search(rf"\b{re.escape(normalize_brand_key(brand))}\b", normalized):
            return brand, "manufacturer"

    candidate = clean_product_name(value, fallback="")
    if trust_unknown and candidate and not contains_retailer_name(candidate) and 1 < len(candidate) <= 80:
        return candidate, "manufacturer"
    return None, "unknown"


def normalize_brand_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", normalize_text(value)).strip()


def query_candidates(product: ProductSeed) -> list[str]:
    candidates = [product.name, *product.search_terms, PRODUCT_QUERY_OVERRIDES.get(product.id, product.name)]
    seen: set[str] = set()
    unique_candidates = []
    for candidate in candidates:
        normalized = normalize_text(candidate).strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        unique_candidates.append(candidate)
    return unique_candidates[:4]


def parse_unit_price(value: str | None) -> tuple[str | None, str | None]:
    if not value:
        return None, None
    match = re.search(r"(\d{1,3})[,.](\d{2}).*?\b(kg|l|g|ml)\b", value, re.I)
    if not match:
        return None, None
    return f"{match.group(1)}.{match.group(2)}", match.group(3).lower()


def parse_valid_until(text: str) -> date | None:
    match = re.search(r"G(?:\u00fc|ue|u)ltig bis\s+(\d{1,2})\.(\d{1,2})\.(\d{4})", repair_mojibake(text), re.I)
    if not match:
        return None
    day, month, year = (int(part) for part in match.groups())
    try:
        return date(year, month, day)
    except ValueError:
        return None


def stable_price_id(*parts: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "|".join(parts)))


def dedupe_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique_rows = []
    for row in rows:
        if row["id"] in seen:
            continue
        seen.add(row["id"])
        unique_rows.append(row)
    return unique_rows


def open_price_rejection(product: ProductSeed, item: dict[str, Any]) -> str | None:
    if money_cents(item.get("price")) is None:
        return "invalid_price"
    if item.get("currency") != "EUR":
        return "unsupported_currency"
    if not isinstance(item.get("id"), int) or isinstance(item["id"], bool) or item["id"] <= 0:
        return "missing_source_id"
    if item.get("duplicate_of") is not None:
        return "source_duplicate"
    if item.get("type") != "PRODUCT" or item.get("product_code") not in product.barcodes:
        return "unmapped_gtin"
    # Upstream validator forbids price_per on PRODUCT rows. It is required only
    # for loose/category goods (UNIT/KILOGRAM), not a numeric unit price.
    # https://github.com/openfoodfacts/open-prices/blob/main/open_prices/prices/validators.py
    if item.get("price_per") not in (None, ""):
        return "inconsistent_product_price_basis"
    if not isinstance(item.get("price_is_discounted"), bool):
        return "unknown_discount_status"
    try:
        observed = date.fromisoformat(item.get("date") or "")
        if observed > datetime.now(UTC).date():
            return "future_observation"
    except (TypeError, ValueError):
        return "missing_observation_date"
    location = item.get("location") or {}
    if location.get("type") != "OSM" or location.get("osm_tag_key") != "shop" or location.get("osm_tag_value") not in {"supermarket", "convenience", "discount"}:
        return "not_a_supported_shop"
    if str(location.get("osm_address_country_code") or "").upper() != "DE":
        return "outside_germany"
    regions = {normalize_text(part).strip() for part in str(location.get("osm_display_name") or "").split(",")}
    if "baden-wurttemberg" not in regions and "baden-wuerttemberg" not in regions:
        return "outside_or_unverified_bw"
    if not location.get("id"):
        return "missing_location_id"
    if canonical_retailer_name(str(location.get("osm_brand") or location.get("osm_name") or "")) is None:
        return "unsupported_retailer"
    metadata = item.get("product") or {}
    if metadata.get("code") != item["product_code"] or metadata.get("source") != "off":
        return "conflicting_product_metadata"
    return None


def normalize_open_price(product: ProductSeed, item: dict[str, Any], *, rules=None, corrections=None) -> dict[str, Any] | None:
    if open_price_rejection(product, item):
        return None
    cents = money_cents(item["price"])
    location = item["location"]
    metadata = item["product"]
    code = item["product_code"]
    # Never inherit package size, Bio status or an article name from a generic seed.
    name = str(metadata.get("product_name") or item.get("product_name") or "")
    explicit_brand = str(metadata.get("brands") or "")
    brand_name, brand_type = classify_product_brand(explicit_brand)
    draft = {
        "product_id": product.id, "source": "Open Food Facts", "source_product_ref": code, "gtin": code,
        "name": f"{explicit_brand} {name}".strip(), "brand_name": brand_name or explicit_brand or None,
        "brand_type": brand_type, "attributes": {},
        "package_text": metadata.get("quantity"), "identity_verified": False,
        "evidence_url": f"https://world.openfoodfacts.org/product/{code}",
    }
    if "en:organic" in (metadata.get("labels_tags") or []):
        draft["attributes"]["organic"] = True
    article = resolve_article(draft, rules if rules is not None else load_rules(),
                              corrections if corrections is not None else load_corrections())
    basis = "pack"  # Validated barcoded PRODUCT; upstream deliberately leaves price_per empty.
    reasons = list(article["review_reasons"])
    discounted = item.get("price_is_discounted") is True
    if discounted or item.get("discount_type"):
        # Open Prices does not give enough eligibility/validity detail to silently
        # treat a loyalty, quantity or short-dated reduction as an ordinary price.
        reasons.append("discount_conditions_need_review")
    package = article["package"]
    unit_price, unit = None, None
    if basis == "pack" and package and package["unit"] in {"g", "ml"}:
        unit = "kg" if package["unit"] == "g" else "l"
        unit_price = str((Decimal(cents) / Decimal(100) * 1000 / Decimal(package["total"])).quantize(Decimal(".01"), rounding=ROUND_HALF_UP))
    retailer = canonical_retailer_name(str(location.get("osm_brand") or location.get("osm_name")))
    return {
        "id": stable_id("open-prices", str(item["id"])), "source_ref": str(item["id"]),
        "product_id": article["product_id"], "article_id": article["id"],
        "product_name": article["name"], "brand_name": article["brand_name"], "brand_type": article["brand_type"],
        "retailer_name": retailer,
        "retailer_id": next(key for key, value in RETAILER_SLUGS.items() if value[0] == retailer),
        "price": str(Decimal(cents) / 100), "currency": "EUR", "price_basis": basis,
        "unit_price": unit_price, "unit": unit, "observed_at": item["date"],
        "offer_type": "sale" if discounted else "regular", "requires_app": False, "is_personalized": False,
        "source": "Open Prices", "source_url": f"https://prices.openfoodfacts.org/prices/{item['id']}",
        "source_license": "ODbL-1.0", "is_public": False, "confidence": 0.70,
        "country_code": "DE", "region": "Baden-Württemberg",
        "location_label": ", ".join(str(location[key]) for key in ("osm_name", "osm_address_postcode", "osm_address_city") if location.get(key)),
        "location_source_ref": str(location["id"]), "review_reasons": reasons,
        "raw_payload": {"open_prices_id": item["id"], "product_code": code, "location_id": location["id"],
                        "price_per": item.get("price_per"), "discount_type": item.get("discount_type")},
        "_article": article,
    }


def canonical_retailer_name(value: str) -> str | None:
    normalized = normalize_brand_key(value)
    if re.search(r"\baldi nord\b", normalized):
        return None
    for retailer_name, aliases in RETAILER_ALIASES.items():
        if any(re.search(rf"\b{re.escape(normalize_brand_key(alias))}\b", normalized) for alias in aliases):
            return retailer_name
    return None


def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key or create_client is None:
        return None
    return create_client(url, key)


def upsert_products(client, products: list[ProductSeed]) -> None:
    rows = [
        {
            "id": product.id,
            "name": product.name,
            "category": product.category,
            "package_size": product.package_size,
            "search_terms": product.search_terms,
            "barcodes": product.barcodes,
        }
        for product in products
    ]
    client.table("products").upsert(rows).execute()


def insert_prices(client, rows: list[dict[str, Any]]) -> None:
    if rows:
        client.table("price_observations").upsert(rows).execute()


def start_update_run(client, source: str) -> str:
    run_id = str(uuid.uuid4())
    client.table("update_runs").insert(
        {
            "id": run_id,
            "source": source,
            "status": "running",
        }
    ).execute()
    return run_id


def finish_update_run(client, run_id: str, *, status: str, imported_count: int, notes: str | None = None) -> None:
    client.table("update_runs").update(
        {
            "finished_at": datetime.now(UTC).isoformat(),
            "status": status,
            "imported_count": imported_count,
            "notes": notes[:500] if notes else None,
        }
    ).eq("id", run_id).execute()


def schema_preflight(client) -> None:
    client.table("price_observations").select("id,article_id,source_ref,price_basis,requires_app,is_public").limit(1).execute()
    client.table("catalog_articles").select("id,automatic_values,correction").limit(1).execute()
    client.table("update_runs").select("id,report").limit(1).execute()
    client.table("current_price_observations").select("id,article_name,package,comparison_key").limit(1).execute()


def collect_prices(products, rules, corrections):
    rows, errors, rejected = [], [], Counter()
    rejected_refs = set()
    attempted = succeeded = fetched = 0
    for product in products:
        for barcode in product.barcodes:
            attempted += 1
            try:
                items = fetch_open_prices_for_barcode(barcode)
                succeeded += 1
            except (requests.RequestException, ValueError, KeyError) as error:
                errors.append({"barcode": barcode, "error_type": type(error).__name__})
                continue
            fetched += len(items)
            for item in items:
                rejection = open_price_rejection(product, item)
                if rejection:
                    rejected[rejection] += 1
                    if isinstance(item.get("id"), int) and not isinstance(item["id"], bool):
                        rejected_refs.add(str(item["id"]))
                    continue
                row = normalize_open_price(product, item, rules=rules, corrections=corrections)
                if row:
                    rows.append(row)
    rows = dedupe_rows(rows)
    status = "failed" if errors and succeeded == 0 else "partial" if errors else "succeeded" if rows else "no_data"
    return rows, {
        "status": status, "requested_barcodes": attempted, "successful_barcodes": succeeded,
        "fetched": fetched, "accepted": len(rows), "rejected": dict(rejected), "errors": errors,
        "rejected_source_refs": sorted(rejected_refs),
        "needs_review": sum(bool(row["review_reasons"]) for row in rows),
        "oldest": min((row["observed_at"] for row in rows), default=None),
        "newest": max((row["observed_at"] for row in rows), default=None),
    }


def publication_allowed(row: dict, was_approved: bool, publish_reviewed: bool) -> bool:
    return not row["review_reasons"] and (was_approved or publish_reviewed)


def main() -> None:
    load_dotenv()
    products = load_products()
    rules, corrections = load_rules(), load_corrections()
    if set(product.id for product in products) - set(rules):
        raise ValueError("Seed catalog has product types without comparison rules")
    if os.getenv("ENABLE_UNLICENSED_KAUFDA_IMPORT", "").lower() in {"1", "true", "yes"}:
        raise SystemExit("kaufDA production import is unavailable without documented reuse permission")
    dry_run = os.getenv("PRICEFUCHS_DRY_RUN", "").lower() in {"1", "true", "yes"}
    client = None if dry_run else get_supabase_client()
    if client is None and not dry_run:
        raise SystemExit("Backend credentials missing. Set PRICEFUCHS_DRY_RUN=1 for a read-only run.")
    publish_reviewed = os.getenv("PRICEFUCHS_PUBLISH_REVIEWED", "").lower() in {"1", "true", "yes"}
    run_id = None
    report = {"status": "failed", "imported": 0, "published": 0, "dry_run": dry_run,
              "started_at": datetime.now(UTC).isoformat()}
    try:
        if client:
            schema_preflight(client)
            run_id = start_update_run(client, "Open Prices")
        rows, summary = collect_prices(products, rules, corrections)
        report.update(summary)
        report["run_id"] = run_id
        articles = {row["_article"]["id"]: row.pop("_article") for row in rows}
        previous_approvals = set()
        if client:
            for offset in range(0, len(rows), 100):
                ids = [row["id"] for row in rows[offset:offset + 100]]
                previous = client.table("price_observations").select("id,is_public").in_("id", ids).execute().data
                previous_approvals.update(row["id"] for row in previous if row["is_public"])
        for row in rows:
            row["is_public"] = publication_allowed(row, row["id"] in previous_approvals, publish_reviewed)
        report["publication_candidates"] = sum(not row["review_reasons"] for row in rows)
        # The report is a durable local review queue, excluded from version control.
        output = Path(os.getenv("PRICEFUCHS_REPORT_PATH", str(ROOT / "artifacts" / "latest-import.json")))
        output.parent.mkdir(parents=True, exist_ok=True)
        if client and report["status"] != "failed":
            report["withdrawn"] = 0
            rejected_refs = report["rejected_source_refs"]
            for offset in range(0, len(rejected_refs), 100):
                withdrawn = client.table("price_observations").update({"is_public": False}).eq("source", "Open Prices").eq("is_public", True).in_("source_ref", rejected_refs[offset:offset + 100]).execute().data
                report["withdrawn"] += len(withdrawn)
            upsert_products(client, products)
            for article in articles.values():
                client.table("catalog_articles").upsert(article).execute()
            for offset in range(0, len(rows), 100):
                batch = rows[offset:offset + 100]
                insert_prices(client, batch)
                report["imported"] += len(batch)
                report["published"] += sum(row["is_public"] for row in batch)
        report["finished_at"] = datetime.now(UTC).isoformat()
        output.write_text(json.dumps({"report": report, "review_queue": list(articles.values()), "observations": rows},
                                     ensure_ascii=False, indent=2), encoding="utf-8")
        if run_id:
            client.table("update_runs").update({"report": report}).eq("id", run_id).execute()
            finish_update_run(client, run_id, status=report["status"], imported_count=report["imported"],
                              notes=json.dumps(summary, ensure_ascii=False))
        print(json.dumps(report, ensure_ascii=False, indent=2))
        print(f"Report: {output}")
        if report["status"] in {"partial", "failed"}:
            raise SystemExit(1)
    except Exception as error:
        report.update(status="failed", error_type=type(error).__name__)
        if client and run_id:
            client.table("update_runs").update({"report": report}).eq("id", run_id).execute()
            finish_update_run(client, run_id, status="failed", imported_count=report["imported"], notes=type(error).__name__)
        raise


if __name__ == "__main__":
    main()
