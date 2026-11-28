"""Search synonym groups for German grocery terms (data/synonyms/<category>.json).

Each file is a list of {"canonical": str, "terms": [str, ...]}. The app uses the groups so that
"Semmel", "Brötchen" and "Schrippe" find the same products. Terms are lower case, unique across
all files and at least three per group (the canonical term included).
"""
import json
import os
import unittest
from pathlib import Path

DIR = Path(__file__).resolve().parents[2] / "data" / "synonyms"
CATEGORIES = ["molkerei", "fleisch", "backwaren", "getraenke", "obst", "gemuese", "trockenware",
              "suessigkeiten", "tiefkuehl", "frische", "backen", "drogerie"]
MIN_GROUPS = 15


def load(category: str) -> list[dict]:
    return json.loads((DIR / f"{category}.json").read_text(encoding="utf-8"))


def all_terms() -> dict[str, tuple[str, str]]:
    seen: dict[str, tuple[str, str]] = {}
    for category in CATEGORIES:
        if not (DIR / f"{category}.json").exists():
            continue
        for group in load(category):
            for term in group["terms"]:
                seen.setdefault(term, (category, group["canonical"]))
    return seen


class SynonymTests(unittest.TestCase):
    def check_category(self, category: str) -> None:
        if os.getenv("CI") and not (DIR / f"{category}.json").exists():
            self.skipTest(f"{category}.json not delivered yet (local AI task); required outside CI")
        groups = load(category)
        self.assertGreaterEqual(len(groups), MIN_GROUPS)
        canonicals = set()
        for group in groups:
            self.assertEqual(set(group), {"canonical", "terms"})
            canonical, terms = group["canonical"], group["terms"]
            self.assertNotIn(canonical, canonicals, "duplicate canonical term")
            canonicals.add(canonical)
            self.assertIn(canonical, terms)
            self.assertGreaterEqual(len(terms), 3)
            self.assertEqual(len(terms), len(set(terms)), f"duplicate term in {canonical}")
            for term in terms:
                self.assertEqual(term, term.strip().lower(), f"term must be trimmed lower case: {term!r}")
                self.assertTrue(term and len(term) <= 40)

    def test_molkerei(self) -> None:
        self.check_category("molkerei")

    def test_fleisch(self) -> None:
        self.check_category("fleisch")

    def test_backwaren(self) -> None:
        self.check_category("backwaren")

    def test_getraenke(self) -> None:
        self.check_category("getraenke")

    def test_obst(self) -> None:
        self.check_category("obst")

    def test_gemuese(self) -> None:
        self.check_category("gemuese")

    def test_trockenware(self) -> None:
        self.check_category("trockenware")

    def test_suessigkeiten(self) -> None:
        self.check_category("suessigkeiten")

    def test_tiefkuehl(self) -> None:
        self.check_category("tiefkuehl")

    def test_frische(self) -> None:
        self.check_category("frische")

    def test_backen(self) -> None:
        self.check_category("backen")

    def test_drogerie(self) -> None:
        self.check_category("drogerie")

    def test_terms_are_unambiguous_across_files(self) -> None:
        owners: dict[str, str] = {}
        for category in CATEGORIES:
            if not (DIR / f"{category}.json").exists():
                continue
            for group in load(category):
                for term in group["terms"]:
                    owner = f"{category}/{group['canonical']}"
                    self.assertEqual(owners.setdefault(term, owner), owner, f"{term!r} belongs to two groups")


if __name__ == "__main__":
    unittest.main()
