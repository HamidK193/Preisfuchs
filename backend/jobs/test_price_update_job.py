import unittest
from copy import deepcopy
from unittest.mock import patch

from price_update_job import (
    ALLOWED_PRODUCT_CATEGORIES,
    ProductSeed,
    canonical_retailer_name,
    clean_product_name,
    contains_retailer_name,
    is_valid_gtin,
    load_products,
    normalize_open_price,
    collect_prices,
    open_price_rejection,
    publication_allowed,
)


TEST_PRODUCT = ProductSeed(
    id="milk_15",
    name="Milch 1,5%",
    category="Molkerei",
    package_size="1 l",
    search_terms=["Milch"],
    barcodes=["4056489013105"],
)

def observation(**overrides):
    return {"id": 123, "type": "PRODUCT", "product_code": "4056489013105", "price": "1.09",
            "price_per": None, "currency": "EUR", "date": "2026-08-28", "price_is_discounted": False,
            "location": {"id": 42, "type": "OSM", "osm_name": "Lidl Stuttgart", "osm_brand": "Lidl",
                         "osm_tag_key": "shop", "osm_tag_value": "supermarket", "osm_address_country_code": "DE",
                         "osm_address_city": "Stuttgart", "osm_display_name": "Lidl, Stuttgart, Baden-Württemberg, Deutschland"},
            "product": {"code": "4056489013105", "source": "off", "product_name": "Bio H-Milch 1,5%",
                        "brands": "Milbona", "quantity": "1 l", "labels_tags": ["en:organic"]}, **overrides}


class OpenPricesNormalizationTests(unittest.TestCase):
    def test_seed_catalog_contains_only_unique_valid_barcodes(self) -> None:
        products = load_products()
        barcodes = [barcode for product in products for barcode in product.barcodes]

        self.assertEqual(len(products), 76)
        self.assertEqual(len(barcodes), len(set(barcodes)))
        self.assertTrue(all(is_valid_gtin(barcode) for barcode in barcodes))
        self.assertTrue(all(product.category in ALLOWED_PRODUCT_CATEGORIES for product in products))
        self.assertFalse(any(contains_retailer_name(product.name) for product in products))

    def test_retailer_names_are_removed_from_imported_product_names(self) -> None:
        self.assertEqual(clean_product_name("Lidl: Milbona H-Milch"), "Milbona H-Milch")
        self.assertEqual(clean_product_name("REWE Regional Äpfel"), "Regional Äpfel")
        self.assertEqual(clean_product_name("E-Center - Butter"), "Butter")

    def test_gtin_check_digit_validation(self) -> None:
        self.assertTrue(is_valid_gtin("4056489013105"))
        self.assertFalse(is_valid_gtin("4056489013106"))
        self.assertFalse(is_valid_gtin("not-a-barcode"))

    def test_uses_location_as_retailer_and_never_submitter_owner(self) -> None:
        row = normalize_open_price(
            TEST_PRODUCT,
            observation(owner="rewe-fan-account"),
        )

        self.assertIsNotNone(row)
        self.assertEqual(row["retailer_name"], "Lidl")
        self.assertEqual(row["price"], "1.09")
        self.assertFalse(row["is_public"])
        self.assertNotIn("owner", row["raw_payload"])

    def test_rejects_unknown_retailers_invalid_prices_and_foreign_currency(self) -> None:
        self.assertIsNone(normalize_open_price(TEST_PRODUCT, {"price": 1, "location": {"name": "Unbekannt"}}))
        self.assertIsNone(normalize_open_price(TEST_PRODUCT, {"price": -1, "location": {"name": "Lidl"}}))
        self.assertIsNone(
            normalize_open_price(
                TEST_PRODUCT,
                {"price": 1, "currency": "USD", "location": {"name": "Lidl"}},
            )
        )

    def test_normalizes_supported_retailer_aliases(self) -> None:
        self.assertEqual(canonical_retailer_name("E-Center in Stuttgart"), "Edeka")
        self.assertEqual(canonical_retailer_name("ALDI SÜD"), "Aldi Süd")
        self.assertIsNone(canonical_retailer_name("ALDI Nord"))
        self.assertIsNone(canonical_retailer_name("ALDI"))
        self.assertIsNone(canonical_retailer_name("Notrewe"))

    def test_source_id_survives_price_and_date_corrections(self):
        first = normalize_open_price(TEST_PRODUCT, observation())
        again = normalize_open_price(TEST_PRODUCT, observation(price="1.29", date="2026-08-29"))
        self.assertEqual(first["id"], again["id"])
        self.assertNotEqual(first["id"], normalize_open_price(TEST_PRODUCT, observation(id=124))["id"])
        self.assertEqual(first["source_url"], "https://prices.openfoodfacts.org/prices/123")

    def test_rejects_misleading_places_missing_dates_and_unmapped_codes(self):
        for field, value in [("osm_tag_key", "amenity"), ("osm_address_country_code", "FR"),
                             ("osm_display_name", "Lidl, München, Bayern, Deutschland"), ("osm_brand", "Aldi Nord")]:
            item = observation()
            item["location"][field] = value
            self.assertIsNone(normalize_open_price(TEST_PRODUCT, item))
        for overrides in [{"date": None}, {"date": "2099-01-01"}, {"product_code": "123"}, {"price": "NaN"}, {"id": None}]:
            self.assertIsNone(normalize_open_price(TEST_PRODUCT, observation(**overrides)))

    def test_does_not_inherit_seed_package_or_treat_price_per_as_money(self):
        item = observation()
        item["product"]["quantity"] = None
        row = normalize_open_price(TEST_PRODUCT, item)
        self.assertEqual(row["price_basis"], "pack")
        self.assertIsNone(row["unit_price"])
        self.assertIsNone(row["_article"]["package"])
        self.assertIn("package_unknown", row["review_reasons"])

    def test_respects_documented_product_price_basis_contract(self):
        row = normalize_open_price(TEST_PRODUCT, observation())
        self.assertEqual(row["price_basis"], "pack")
        self.assertEqual(row["unit_price"], "1.09")
        self.assertEqual(row["unit"], "l")
        for price_per in ["KILOGRAM", "UNIT", 1.09]:
            self.assertIsNone(normalize_open_price(TEST_PRODUCT, observation(price_per=price_per)))

    def test_discount_conditions_require_review(self):
        row = normalize_open_price(TEST_PRODUCT, observation(price_is_discounted=True, discount_type="LOYALTY_PROGRAM"))
        self.assertIn("discount_conditions_need_review", row["review_reasons"])
        self.assertFalse(row["is_public"])

    def test_failed_source_is_not_reported_as_success(self):
        from catalog_identity import load_rules
        import requests
        with patch("price_update_job.fetch_open_prices_for_barcode", side_effect=requests.Timeout()):
            rows, report = collect_prices([TEST_PRODUCT], load_rules(), {})
        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["successful_barcodes"], 0)
        self.assertEqual(rows, [])

    def test_reimport_keeps_approval_but_revokes_it_when_quality_changes(self):
        self.assertTrue(publication_allowed({"review_reasons": []}, True, False))
        self.assertFalse(publication_allowed({"review_reasons": []}, False, False))
        self.assertTrue(publication_allowed({"review_reasons": []}, False, True))
        self.assertFalse(publication_allowed({"review_reasons": ["package_unknown"]}, True, True))


if __name__ == "__main__":
    unittest.main()
