"""Internal last check of observed prices against current kaufDA brochure offers.

kaufDA data is never stored as a public price or shown in the app. It is only
used to hold back an observation for review when it deviates strongly from a
matching current offer of the same retailer. Requests are budgeted, cached
per (retailer, term) and paused.
"""
from __future__ import annotations

import re
import time
import unicodedata
from typing import Any

import requests

from price_update_job import ProductSeed, fetch_kaufda_html, parse_kaufda_offers

# retailer_id -> (kaufDA retailer name, kaufDA slug)
KAUFDA_RETAILERS = {
    "aldi_sued": ("Aldi Süd", "Aldi-Sued"),
    "aldi_nord": ("Aldi Nord", "Aldi-Nord"),
    "lidl": ("Lidl", "Lidl"),
    "rewe": ("Rewe", "REWE"),
    "edeka": ("Edeka", "Edeka"),
    "kaufland": ("Kaufland", "Kaufland"),
    "penny": ("Penny", "Penny"),
    "netto_md": ("Netto", "Netto-Marken-Discount"),
    "norma": ("Norma", "Norma"),
}
# Generic shelf terms kaufDA knows, used when no word of the product name works.
CATEGORY_TERMS = {
    "Molkerei": ["Joghurt", "Käse", "Milch", "Butter", "Quark"],
    "Getränke": ["Saft", "Wasser", "Kaffee", "Bier", "Limonade"],
    "Süßigkeiten": ["Schokolade", "Kekse", "Chips", "Gummibärchen"],
    "Fleisch": ["Wurst", "Schinken", "Hähnchen", "Hackfleisch"],
    "Backwaren": ["Brot", "Brötchen", "Toast"],
    "Trockenware": ["Nudeln", "Reis", "Müsli", "Konserven"],
    "Tiefkühl": ["Pizza", "Eis", "Pommes"],
    "Obst": ["Äpfel", "Bananen"],
    "Gemüse": ["Kartoffeln", "Tomaten", "Gurken"],
}
MAX_RATIO = 2.0
MIN_RATIO = 0.5
MIN_NAME_SIMILARITY = 0.5


def tokens(value: str) -> set[str]:
    value = value.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return {token for token in re.split(r"[^a-z0-9]+", value) if len(token) >= 3}


def name_similarity(left: str, right: str) -> float:
    a, b = tokens(left), tokens(right)
    return len(a & b) / len(a | b) if a and b else 0.0


def candidate_terms(product_name: str, category: str) -> list[str]:
    """Generic shelf terms first (shared cache across products), then words of the name."""
    terms = [term for term in CATEGORY_TERMS.get(category, []) if term.lower() in product_name.lower()]
    words = [word for word in re.findall(r"[A-Za-zÄÖÜäöüß-]{4,}", product_name) if word[0].isupper()]
    return list(dict.fromkeys(terms + CATEGORY_TERMS.get(category, [])[:3] + list(reversed(words[-2:]))))


class KaufdaChecker:
    def __init__(self, budget: int = 120, pause_seconds: float = 1.0) -> None:
        self.budget = budget
        self.pause_seconds = pause_seconds
        self.cache: dict[tuple[str, str], list[dict[str, Any]] | None] = {}
        self.stats = {"requests": 0, "checked": 0, "matched": 0, "mismatch": 0, "unavailable": 0}
        self.blocked = False

    def offers(self, retailer_id: str, term: str) -> list[dict[str, Any]] | None:
        key = (retailer_id, term)
        if key in self.cache:
            return self.cache[key]
        if self.blocked or self.stats["requests"] >= self.budget:
            return None
        retailer_name, slug = KAUFDA_RETAILERS[retailer_id]
        if self.stats["requests"]:
            time.sleep(self.pause_seconds)
        self.stats["requests"] += 1
        try:
            url, html = fetch_kaufda_html(slug, term)
        except requests.HTTPError as error:
            status = error.response.status_code if error.response is not None else None
            if status in {401, 403, 429}:
                self.blocked = True  # Stop instead of retrying against an explicit refusal.
            self.cache[key] = None if status != 404 else []
            return self.cache[key]
        except requests.RequestException:
            self.cache[key] = None
            return None
        seed = ProductSeed(id="check", name=term, category="Frische", package_size="", search_terms=[term], barcodes=[])
        self.cache[key] = parse_kaufda_offers(product=seed, retailer_id=retailer_id, retailer_name=retailer_name,
                                              source_url=url, html=html)
        return self.cache[key]

    def check(self, retailer_id: str | None, product_name: str, category: str, price: float) -> dict[str, Any]:
        """Returns {"status": "ok"|"mismatch"|"no_match"|"unavailable", ...}; only "mismatch" blocks."""
        if retailer_id not in KAUFDA_RETAILERS:
            return {"status": "unavailable", "reason": "retailer_not_on_kaufda"}
        self.stats["checked"] += 1
        fetched_any = False
        best: tuple[float, dict[str, Any]] | None = None
        for term in candidate_terms(product_name, category):
            offers = self.offers(retailer_id, term)
            if offers is None:
                continue
            fetched_any = True
            for offer in offers:
                score = name_similarity(product_name, offer["product_name"])
                if score >= MIN_NAME_SIMILARITY and (best is None or score > best[0]):
                    best = (score, offer)
            if best:
                break
        if not fetched_any:
            self.stats["unavailable"] += 1
            return {"status": "unavailable", "reason": "kaufda_not_reachable"}
        if not best:
            return {"status": "no_match"}
        self.stats["matched"] += 1
        offer_price = float(best[1]["price"])
        ratio = price / offer_price if offer_price else None
        result = {"status": "ok", "kaufda_price": offer_price, "kaufda_name": best[1]["product_name"],
                  "kaufda_valid_until": best[1].get("valid_until"), "similarity": round(best[0], 2),
                  "ratio": round(ratio, 2) if ratio else None}
        if ratio is None or not MIN_RATIO <= ratio <= MAX_RATIO:
            self.stats["mismatch"] += 1
            result["status"] = "mismatch"
        return result
