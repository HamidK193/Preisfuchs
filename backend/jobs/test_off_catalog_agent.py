import time
import unittest
from datetime import UTC, date, datetime, timedelta

import off_catalog_agent as agent
import off_products_agent
import open_prices_de_agent
from agent_common import USER_AGENT, Deadline, close_stale_runs

NOW = "2026-11-28T05:00:00+00:00"


def hit(**overrides):
    base = {
        "code": "4014400400007", "product_name": "Toffifee", "brands": ["xx:Storck", "xx:Toffifee"],
        "quantity": "125g", "product_quantity": 125.0, "product_quantity_unit": "g",
        "image_front_url": "https://images.openfoodfacts.org/images/products/401/440/040/0007/front_de.1.400.jpg",
        "image_front_small_url": "https://images.openfoodfacts.org/images/products/401/440/040/0007/front_de.1.200.jpg",
        "categories": ["en:snacks", "en:sweet-snacks", "en:confectioneries"], "labels": ["en:vegetarian"],
        "allergens": ["en:milk"], "stores": ["Aldi", "Lidl"], "countries": ["en:austria", "en:germany"],
        "nutriscore_grade": "e", "unique_scans_n": 335, "last_modified_t": 1_795_124_650, "lang": "de",
    }
    base.update(overrides)
    return base


class FakeQuery:
    def __init__(self, rows, log):
        self.rows, self.log, self.updates = rows, log, None

    def select(self, *args):
        return self

    def eq(self, *args):
        return self

    def lt(self, *args):
        return self

    def in_(self, *args):
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, *args):
        return self

    def range(self, *args):
        return self

    def update(self, values):
        self.updates = values
        return self

    def execute(self):
        if self.updates is not None:
            self.log.append(self.updates)
        return type("Result", (), {"data": self.rows})()


class FakeClient:
    def __init__(self, rows):
        self.rows, self.log = rows, []

    def table(self, name):
        return FakeQuery(self.rows, self.log)


class HitRowsTests(unittest.TestCase):
    def test_maps_name_brand_quantity_category_and_image_with_attribution(self) -> None:
        rows = agent.hit_rows(hit(), NOW)
        off, product, article = rows["off"], rows["product"], rows["article"]
        self.assertEqual((off["gtin"], off["brand"], off["quantity"]), ("4014400400007", "Storck", "125g"))
        self.assertTrue(off["image_url"].startswith("https://images.openfoodfacts.org/"))
        self.assertEqual((off["image_license"], off["image_attribution"]), ("CC BY-SA 3.0", "Open Food Facts contributors"))
        self.assertEqual(off["data_license"], "ODbL 1.0")
        self.assertTrue(off["source_url"].endswith("/product/4014400400007"))
        self.assertTrue(off["image_plausible"])
        self.assertEqual(off["stores_tags"], ["Aldi", "Lidl"])
        self.assertEqual(product["id"], "gtin_4014400400007")
        self.assertEqual(product["category"], "Süßigkeiten")
        self.assertEqual(product["name"], "Storck Toffifee")
        self.assertEqual(article["review_status"], "verified")
        self.assertEqual(article["package"]["total"], "125")

    def test_article_id_matches_the_price_agent_identity(self) -> None:
        price_article = open_prices_de_agent.stable_id("open-prices-gtin", "4014400400007")
        self.assertEqual(agent.hit_rows(hit(), NOW)["article"]["id"], price_article)

    def test_unusable_hits_are_skipped(self) -> None:
        self.assertIsNone(agent.hit_rows(hit(code="4014400400008"), NOW))  # wrong check digit
        self.assertIsNone(agent.hit_rows(hit(product_name=""), NOW))
        self.assertIsNone(agent.hit_rows(hit(countries=["en:france"]), NOW))
        self.assertIsNone(agent.hit_rows(hit(obsolete=True), NOW))

    def test_without_image_or_package_nothing_is_invented(self) -> None:
        rows = agent.hit_rows(hit(image_front_url=None, image_front_small_url=None, quantity="Füllmenge: 350g",
                                  product_quantity=None, product_quantity_unit=None), NOW)
        self.assertIsNone(rows["off"]["image_url"])
        self.assertIsNone(rows["off"]["image_license"])
        self.assertFalse(rows["off"]["image_plausible"])
        self.assertEqual(rows["article"]["review_status"], "needs_review")
        self.assertIsNone(rows["article"]["package"])

    def test_german_name_is_preferred_and_brand_prefix_stripped(self) -> None:
        rows = agent.hit_rows(hit(product_name="Sunflower oil", product_name_de="Sonnenblumenöl",
                                  brands=["xx:bio sonne"]), NOW)
        self.assertEqual(rows["off"]["name"], "Sonnenblumenöl")
        self.assertEqual(rows["off"]["brand"], "Bio Sonne")
        self.assertEqual(agent.clean_brand("Ja!, Rewe"), "Ja!")
        self.assertIsNone(agent.clean_brand([]))


class PagingTests(unittest.TestCase):
    def test_full_page_continues_with_next_page(self) -> None:
        self.assertEqual(agent.next_position(2, 3, 100, 10), (2, 4, False))

    def test_last_page_moves_to_next_store_and_wraps_after_the_last(self) -> None:
        self.assertEqual(agent.next_position(2, 10, 100, 10), (3, 1, False))
        self.assertEqual(agent.next_position(1, 4, 37, None), (2, 1, False))
        last = len(agent.STORES) - 1
        self.assertEqual(agent.next_position(last, 2, 12, 2), (0, 1, True))

    def test_search_params_respect_page_size_and_sort_by_popularity(self) -> None:
        params = agent.search_params("Aldi Süd", 7)
        self.assertEqual((params["page"], params["page_size"], params["sort_by"]), (7, 100, "-unique_scans_n"))
        self.assertIn('stores:"Aldi Süd"', params["q"])
        self.assertIn('countries:"en:germany"', params["q"])

    def test_last_position_reads_cursor_of_latest_usable_run(self) -> None:
        client = FakeClient([{"report": {"cursor": {"store": 99, "page": 1}}},
                             {"report": {"cursor": {"store": 4, "page": 12}}}])
        self.assertEqual(agent.last_position(client), (4, 12))
        self.assertEqual(agent.last_position(FakeClient([{"report": {}}])), (0, 1))


class RunHygieneTests(unittest.TestCase):
    def test_user_agent_is_generic_without_personal_data(self) -> None:
        self.assertTrue(USER_AGENT.startswith("Preisfuchs"))
        for forbidden in ("@", "github.com", "HamidK193", "karat"):
            self.assertNotIn(forbidden, USER_AGENT)

    def test_stale_running_runs_are_closed_as_failed(self) -> None:
        client = FakeClient([{"id": "a"}, {"id": "b"}])
        self.assertEqual(close_stale_runs(client, "Open Food Facts"), 2)
        self.assertEqual({update["status"] for update in client.log}, {"failed"})
        self.assertTrue(all(update["finished_at"] for update in client.log))

    def test_deadline_expires(self) -> None:
        self.assertFalse(Deadline(60).expired())
        self.assertTrue(Deadline(0).expired())
        time.sleep(0.01)


class OffRefreshTests(unittest.TestCase):
    def test_recently_fetched_gtins_are_skipped_and_oldest_come_first(self) -> None:
        now = datetime(2026, 11, 28, tzinfo=UTC)
        rows = [{"gtin": "1", "fetched_at": (now - timedelta(days=2)).isoformat()},
                {"gtin": "2", "fetched_at": (now - timedelta(days=40)).isoformat()},
                {"gtin": "3", "fetched_at": (now - timedelta(days=20)).isoformat()}]
        client = FakeClient(rows)
        self.assertEqual(off_products_agent.stale_gtins(client, ["1", "2", "3", "4"], now), ["4", "2", "3"])


class OpenPricesFilterTests(unittest.TestCase):
    def test_list_params_filter_germany_and_age_on_the_server(self) -> None:
        params = open_prices_de_agent.list_params(3, date(2026, 9, 1))
        self.assertEqual(params["location__osm_address_country_code"], "DE")
        self.assertEqual((params["date__gte"], params["page"], params["order_by"]), ("2026-09-01", 3, "-id"))

    def test_fetch_stops_at_cursor(self) -> None:
        pages = {1: [{"id": 9}, {"id": 8}], 2: [{"id": 7}, {"id": 5}], 3: [{"id": 4}]}

        class Session:
            def get(self, url, params, timeout):
                return type("R", (), {"status_code": 200, "raise_for_status": lambda self: None,
                                      "json": lambda self: {"items": pages.get(params["page"], [])}})()

        original = open_prices_de_agent.time.sleep
        open_prices_de_agent.time.sleep = lambda seconds: None
        try:
            items, newest = open_prices_de_agent.fetch_new_items(Session(), 6, date(2026, 9, 1))
        finally:
            open_prices_de_agent.time.sleep = original
        self.assertEqual([item["id"] for item in items], [9, 8, 7])
        self.assertEqual(newest, 9)


if __name__ == "__main__":
    unittest.main()
