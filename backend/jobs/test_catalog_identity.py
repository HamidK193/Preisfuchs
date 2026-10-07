import json
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

from catalog_identity import load_corrections, load_rules, money_cents, package_key, parse_package, purchase_for_need, resolve_article


class CatalogIdentityTests(unittest.TestCase):
    def setUp(self):
        self.rules = load_rules()
        self.draft = {"product_id": "quark_500", "source": "test", "source_product_ref": "quark-a",
                      "name": "Magerquark", "brand_name": "Milbona", "brand_type": "private_label",
                      "identity_verified": True, "evidence_url": "https://example.org/proof", "package_text": "500 g",
                      "attributes": {"organic": False, "fat_in_dry_matter": "mager", "flavour": "natur",
                                     "animal": "cow", "lactose_free": False}}

    def test_rules_cover_every_seed_without_pretending_unknown_attributes_are_known(self):
        from price_update_job import load_products
        for product in load_products():
            self.assertTrue(self.rules[product.id]["required_attributes"])
        draft = {**self.draft, "attributes": {}}
        article = resolve_article(draft, self.rules, {})
        self.assertIsNone(article["comparison_key"])
        self.assertIn("organic", article["missing_attributes"])

    def test_private_labels_only_group_when_every_distinction_matches(self):
        base = resolve_article(self.draft, self.rules, {})
        other = {**self.draft, "source_product_ref": "quark-b", "brand_name": "ja!"}
        alternative = resolve_article(other, self.rules, {})
        self.assertNotEqual(base["id"], alternative["id"])
        self.assertEqual(base["comparison_key"], alternative["comparison_key"])
        for key, value in [("organic", True), ("fat_in_dry_matter", "20"), ("organic", "unknown")]:
            variant = deepcopy(other)
            variant["attributes"][key] = value
            self.assertNotEqual(base["comparison_key"], resolve_article(variant, self.rules, {})["comparison_key"])

    def test_global_article_identity_does_not_depend_on_retailer_price_or_generic_slot(self):
        draft = {**self.draft, "brand_type": "manufacturer", "brand_name": "Kinder", "gtin": "4008400401023"}
        first = resolve_article(draft, self.rules, {})
        second = resolve_article({**draft, "source": "another source", "source_product_ref": "42"}, self.rules, {})
        self.assertEqual(first["id"], second["id"])
        self.assertIsNone(first["comparison_key"])
        self.assertNotEqual(first["id"], resolve_article({**draft, "gtin": "4008400401528"}, self.rules, {})["id"])

    def test_packaging_and_actual_purchase_price(self):
        multi, single, metric = map(parse_package, ["2 × 250 g", "500 g", "0,5 kg"])
        self.assertEqual(single["total"], multi["total"])
        self.assertEqual(package_key(single), package_key(metric))
        self.assertNotEqual(package_key(single), package_key(multi))
        self.assertEqual(purchase_for_need(single, "750", "g", 129),
                         {"packs": 2, "cost_cents": 258, "surplus": "250", "unit": "g"})
        with self.assertRaises(ValueError):
            purchase_for_need(single, "750", "ml", 129)
        for value in ["ca. 500 g", "400 g / 250 g Abtropfgewicht", "2 x", "0 g", "1,5 Stück", "1 kg + 20% gratis"]:
            self.assertIsNone(parse_package(value), value)
        self.assertEqual(parse_package("20 WL")["unit"], "wash")

    def test_money_rejects_nonfinite_and_fractional_cents(self):
        for value in ["nan", "Infinity", -1, 0, "1.001", True]:
            self.assertIsNone(money_cents(value))
        self.assertEqual(money_cents("1,09"), 109)

    def test_manual_corrections_and_do_not_merge_survive_reimport(self):
        correction = {"source": "test", "source_product_ref": "quark-a", "action": "isolate",
                      "reason": "Different recipe", "reviewed_at": "2026-09-05T18:00:00+00:00",
                      "evidence_url": "https://example.org/verified", "before": {"name": "Wrong"},
                      "after": {"name": "Corrected quark", "identity_verified": True}}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "corrections.json"
            path.write_text(json.dumps({"version": 1, "corrections": [correction]}), encoding="utf-8")
            corrections = load_corrections(path)
        first = resolve_article(self.draft, self.rules, corrections)
        again = resolve_article({**self.draft, "name": "Changed provider title"}, self.rules, corrections)
        self.assertEqual(first["id"], again["id"])
        self.assertEqual(again["name"], "Corrected quark")
        self.assertIsNone(again["comparison_key"])
        self.assertEqual(again["automatic_values"]["name"], "Changed provider title")
        self.assertIn("manual_do_not_merge", again["review_reasons"])


if __name__ == "__main__":
    unittest.main()
