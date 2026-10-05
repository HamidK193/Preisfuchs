import unittest

from off_products_agent import product_row
from retailer_offers_agent import iso_week_range, parse_rewe, week_label
from osm_stores_agent import RETAILERS, STATES, detect_retailer, store_row


class OsmStoresAgentTests(unittest.TestCase):
    def test_detects_chains_by_brand_wikidata_and_name(self) -> None:
        self.assertEqual(detect_retailer({"brand": "Aldi Süd"}), "aldi_sued")
        self.assertEqual(detect_retailer({"brand": "Netto Marken-Discount"}), "netto_md")
        self.assertEqual(detect_retailer({"brand": "Netto", "brand:wikidata": "Q552652"}), "netto_dansk")
        self.assertEqual(detect_retailer({"brand": "E center"}), "edeka")
        self.assertEqual(detect_retailer({"name": "REWE City Kronprinzstraße"}), "rewe")
        self.assertIsNone(detect_retailer({"brand": "Denns BioMarkt"}))
        self.assertIsNone(detect_retailer({"name": "Hitze-Kiosk"}))

    def test_store_row_keeps_address_hours_and_license(self) -> None:
        element = {"type": "way", "id": 42, "center": {"lat": 48.77, "lon": 9.18},
                   "tags": {"brand": "Lidl", "name": "Lidl", "addr:street": "Hauptstraße",
                            "addr:housenumber": "5", "addr:postcode": "70173", "addr:city": "Stuttgart",
                            "opening_hours": "Mo-Sa 07:00-22:00"}}
        row = store_row(element, "Baden-Württemberg", "2026-10-05T03:00:00+00:00")
        self.assertEqual(row["retailer_id"], "lidl")
        self.assertEqual(row["street"], "Hauptstraße 5")
        self.assertEqual(row["opening_hours"], "Mo-Sa 07:00-22:00")
        self.assertEqual(row["source_ref"], "way/42")
        self.assertIn("OpenStreetMap", row["source_license"])
        self.assertEqual(row["id"], store_row(element, "Baden-Württemberg", "later")["id"])

    def test_skips_unknown_chains_and_missing_coordinates(self) -> None:
        self.assertIsNone(store_row({"type": "node", "id": 1, "tags": {"brand": "Lidl"}}, "Bayern", "x"))
        self.assertIsNone(store_row({"type": "node", "id": 2, "lat": 1, "lon": 2, "tags": {"name": "Hofladen"}}, "Bayern", "x"))

    def test_covers_all_federal_states_and_unique_retailer_names(self) -> None:
        self.assertEqual(len(STATES), 16)
        normalized = [norm for _, norm, _ in RETAILERS.values()]
        self.assertEqual(len(normalized), len(set(normalized)))


class OffProductsAgentTests(unittest.TestCase):
    def test_product_row_maps_fields_and_attribution(self) -> None:
        row = product_row("4061461377601", {
            "product_name_de": "Bio Sonnenblumenöl", "brands": "Bio Sonne, Aldi", "quantity": "500 ml",
            "nutriscore_grade": "b", "nutriments": {"fat_100g": 92, "foo": 1, "salt_100g": "x"},
            "image_front_url": "https://images.openfoodfacts.org/x.jpg", "last_modified_t": 1_700_000_000,
        }, "2026-10-05T03:00:00+00:00")
        self.assertEqual(row["brand"], "Bio Sonne")
        self.assertEqual(row["nutriments"], {"fat_100g": 92})
        self.assertEqual(row["image_license"], "CC BY-SA 3.0")
        self.assertEqual(row["data_license"], "ODbL 1.0")
        self.assertTrue(row["source_url"].endswith("/product/4061461377601"))

    def test_product_without_name_or_image_is_handled(self) -> None:
        self.assertIsNone(product_row("4006888000565", {"brands": "X"}, "now"))
        row = product_row("4006888000565", {"product_name": "Joghurt", "nutriscore_grade": "unknown"}, "now")
        self.assertIsNone(row["image_url"])
        self.assertIsNone(row["image_license"])
        self.assertIsNone(row["nutriscore_grade"])


REWE_TILE = """
<article class="cor-offer-renderer-tile cor-link"><div class="cor-offer-information">
<h3><a data-offer-nan="7179702" data-offer-title="Ehrmann Grand Dessert" data-offer-week="2026/41">Ehrmann</a></h3>
<span class="cor-offer-information__additional">versch. Sorten</span>
<span class="cor-offer-information__additional">, je 190-g-Becher</span>
<span class="cor-offer-information__additional">, (1 kg = 2,32 €)</span></div>
<div class="cor-offer-price__tag-label">Aktion</div><div class="cor-offer-price__tag-price">0,44 €</div></article>
<article class="cor-offer-renderer-tile"><a data-offer-title="Ohne Preis" data-offer-week="2026/41"></a></article>
"""


class RetailerOffersAgentTests(unittest.TestCase):
    def test_iso_week_range(self) -> None:
        start, end = iso_week_range("2026/41")
        self.assertEqual((start.isoformat(), end.isoformat()), ("2026-10-05", "2026-10-11"))
        self.assertIsNone(iso_week_range("KW41"))
        self.assertEqual(week_label(*iso_week_range("2026/44")), "26. Oktober – 1. November")

    def test_parse_rewe_tile_with_honest_source_label(self) -> None:
        rows = parse_rewe(REWE_TILE, "kuehlung", "https://www.rewe.de/angebote/nationale-angebote/kuehlung/", "now")
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual((row["title"], row["price"], row["unit_price"], row["unit"]),
                         ("Ehrmann Grand Dessert", "0.44", "2.32", "kg"))
        self.assertEqual(row["details"], "versch. Sorten, je 190-g-Becher, (1 kg = 2,32 €)")
        self.assertEqual(row["source_label"], "REWE Angebote (rewe.de), 5.–11. Oktober")
        self.assertEqual(row["id"], "rewe:2026/41:7179702")


if __name__ == "__main__":
    unittest.main()
