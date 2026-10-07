import unittest
from datetime import date
from decimal import Decimal

from kaufda_check import KaufdaChecker, candidate_terms, name_similarity
from open_prices_de_agent import build_records, category_for, package_for, unit_price_plausible

TODAY = date(2026, 10, 7)


def item(**overrides):
    base = {
        "id": 342096, "type": "PRODUCT", "product_code": "4002971010107", "price": 0.71, "price_per": None,
        "currency": "EUR", "date": "2026-10-06", "price_is_discounted": True, "price_without_discount": 0.89,
        "duplicate_of": None, "proof_id": 1, "location_osm_type": "WAY", "location_osm_id": 28390567,
        "location": {"osm_address_country_code": "DE", "osm_brand": "Netto Marken-Discount",
                     "osm_name": "Netto", "osm_address_city": "Villingen-Schwenningen"},
        "product": {"source": "off", "product_name": "Almighurt - Erdbeere", "brands": "Ehrmann",
                    "quantity": "150 g", "categories_tags": ["en:dairies", "en:yogurts"]},
    }
    base.update(overrides)
    return base


class FakeChecker:
    def __init__(self, status):
        self.status = status

    def check(self, *args):
        return {"status": self.status}


class PackageAndCategoryTests(unittest.TestCase):
    def test_package_spellings(self) -> None:
        self.assertEqual(Decimal(package_for({"quantity": "300 g ℮"})["total"]), 300)
        self.assertEqual(Decimal(package_for({"quantity": "4 x 35 g = 140 g"})["total"]), 140)
        self.assertEqual(Decimal(package_for({"quantity": "300 g (6 x 50 g)"})["total"]), 300)
        self.assertEqual(Decimal(package_for({"quantity": "1 Liter"})["total"]), 1000)
        self.assertEqual(Decimal(package_for({"quantity": "2 * 365 g (730 g)"})["total"]), 730)
        self.assertIsNone(package_for({"quantity": "Füllmenge: 350g Abtropfgewicht: 180g"}))

    def test_structured_quantity_fallback(self) -> None:
        self.assertEqual(Decimal(package_for({"product_quantity": 500, "product_quantity_unit": "g"})["total"]), 500)
        self.assertIsNone(package_for({}))

    def test_category_uses_most_specific_tag(self) -> None:
        self.assertEqual(category_for(["en:plant-based-foods-and-beverages", "en:beverages", "en:fruit-juices"]),
                         "Getränke")
        self.assertEqual(category_for(["en:dairies", "en:yogurts"]), "Molkerei")
        self.assertEqual(category_for([]), "Sonstiges")

    def test_unit_price_bounds(self) -> None:
        ok, per, unit = unit_price_plausible(Decimal("0.71"), package_for({"quantity": "150 g"}))
        self.assertEqual((ok, per, unit), (True, Decimal("4.73"), "kg"))
        self.assertFalse(unit_price_plausible(Decimal("71.00"), package_for({"quantity": "150 g"}))[0])


class BuildRecordsTests(unittest.TestCase):
    def test_verified_german_observation_is_published_with_source(self) -> None:
        records = build_records(item(), {}, FakeChecker("no_match"), TODAY)
        obs = records["observation"]
        self.assertTrue(obs["is_public"])
        self.assertEqual(obs["product_id"], "gtin_4002971010107")
        self.assertEqual(obs["product_name"], "Ehrmann Almighurt - Erdbeere")
        self.assertEqual((obs["offer_type"], obs["regular_price"]), ("sale", "0.89"))
        self.assertEqual(obs["location_source_ref"], "way/28390567")
        self.assertEqual(obs["source_license"], "ODbL 1.0")
        self.assertEqual(records["article"]["review_status"], "verified")
        self.assertEqual(records["product"]["category"], "Molkerei")

    def test_kaufda_mismatch_keeps_price_internal(self) -> None:
        records = build_records(item(), {}, FakeChecker("mismatch"), TODAY)
        self.assertFalse(records["observation"]["is_public"])
        self.assertIn("kaufda_price_mismatch", records["observation"]["review_reasons"])

    def test_matches_known_store(self) -> None:
        store = {"id": "s1", "retailer_id": "netto_md", "state": "Baden-Württemberg"}
        obs = build_records(item(), {"way/28390567": store}, None, TODAY)["observation"]
        self.assertEqual((obs["store_id"], obs["region"]), ("s1", "Baden-Württemberg"))

    def test_out_of_scope_items_are_skipped(self) -> None:
        self.assertIsNone(build_records(item(location={"osm_address_country_code": "FR"}), {}, None, TODAY))
        self.assertIsNone(build_records(item(price_per="KILOGRAM"), {}, None, TODAY))
        self.assertIsNone(build_records(item(product_code="123"), {}, None, TODAY))
        self.assertIsNone(build_records(item(duplicate_of=5), {}, None, TODAY))

    def test_unknown_quantity_needs_review(self) -> None:
        records = build_records(item(product={"source": "off", "product_name": "Joghurt"}), {}, None, TODAY)
        self.assertFalse(records["observation"]["is_public"])
        self.assertIn("quantity_ambiguous", records["observation"]["review_reasons"])


class KaufdaCheckTests(unittest.TestCase):
    def test_terms_prefer_shared_shelf_terms(self) -> None:
        self.assertEqual(candidate_terms("Ehrmann Almighurt Erdbeere", "Molkerei")[:3], ["Joghurt", "Käse", "Milch"])
        self.assertEqual(candidate_terms("Weihenstephan Butter", "Molkerei")[0], "Butter")

    def test_similarity_and_mismatch(self) -> None:
        self.assertGreaterEqual(name_similarity("Ehrmann Almighurt Erdbeere", "Ehrmann Almighurt"), 0.5)
        checker = KaufdaChecker(budget=0)
        checker.cache[("lidl", "Butter")] = [{"product_name": "Meggle Feine Butter", "price": "1.39"}]
        self.assertEqual(checker.check("lidl", "Meggle Feine Butter", "Molkerei", 1.49)["status"], "ok")
        self.assertEqual(checker.check("lidl", "Meggle Feine Butter", "Molkerei", 3.99)["status"], "mismatch")
        self.assertEqual(checker.check("dm", "Meggle Feine Butter", "Molkerei", 3.99)["status"], "unavailable")


if __name__ == "__main__":
    unittest.main()
