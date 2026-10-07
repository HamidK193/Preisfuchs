"""Inspect the local demo without depending on Supabase or location providers."""

import argparse
import json
import re
import shutil
import socket
import subprocess
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--label", default="baseline")
    parser.add_argument("--url", default="http://127.0.0.1:5173/?demo=app-rabatte")
    parser.add_argument("--start-server", action="store_true")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--live", action="store_true", help="Read the configured public catalog; no database writes")
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[1] / "artifacts" / args.label
    output.mkdir(parents=True, exist_ok=True)

    server = None
    if args.start_server:
        # Own the Node process directly so cleanup also works on Windows.
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        root = Path(__file__).resolve().parents[1]
        server = subprocess.Popen(
            [shutil.which("node"), "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", str(port), "--strictPort"],
            cwd=root / "web", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        args.url = f"http://127.0.0.1:{port}/" + ("" if args.live else "?demo=app-rabatte")
        deadline = time.monotonic() + 15
        while True:
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=1):
                    break
            except OSError:
                if server.poll() is not None or time.monotonic() > deadline:
                    server.terminate()
                    server.wait(timeout=5)
                    raise RuntimeError("Local Vite server did not start")
                time.sleep(0.1)
    try:
        inspect(args, output)
    finally:
        if server is not None:
            server.terminate()
            server.wait(timeout=5)


def inspect(args, output: Path) -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="msedge", headless=True)
        results = []
        for width, height in [(1440, 1000), (768, 1024), (390, 844), (320, 740)]:
            page = browser.new_page(viewport={"width": width, "height": height})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.route("**/nominatim.openstreetmap.org/**", lambda route: route.fulfill(json=[]))
            page.route("**/*overpass*/**", lambda route: route.fulfill(json={"elements": []}))
            page.goto(args.url, wait_until="networkidle")
            page.get_by_role("searchbox", name="Produkte suchen").wait_for()
            page.get_by_text("Beobachtete Preise" if args.live else "Demo zum Ausprobieren", exact=True).wait_for()
            page.evaluate("document.querySelectorAll('img').forEach(image => image.loading = 'eager')")
            page.wait_for_load_state("networkidle")
            page.screenshot(path=str(output / f"home-{width}.png"), full_page=True)
            if width == 1440:
                page.screenshot(path=str(output / "desktop-viewport.png"))
            layout = page.evaluate("""() => ({
                width: innerWidth,
                documentWidth: document.documentElement.scrollWidth,
                headings: [...document.querySelectorAll('h1,h2,h3,h4')].map(e => e.textContent),
                buttons: [...document.querySelectorAll('button')].filter(e => e.checkVisibility()).map(e => e.textContent.trim()),
                imageCount: document.images.length,
                brokenImages: [...document.images].filter(e => e.complete && !e.naturalWidth).length
            })""")
            results.append({"viewport": width, "layout": layout, "pageErrors": errors})
            if args.verify:
                assert layout["documentWidth"] <= width, f"Page overflow at {width}px"
                assert not errors, errors
                if width == 390:
                    if args.live:
                        verify_live_catalog(page, output)
                    else:
                        verify_shopping(page, output)
            page.close()
        if args.verify:
            verify_catalog(browser, args.url.split("?")[0], output)
        browser.close()
    (output / "report.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=True, indent=2))


def verify_live_catalog(page, output: Path) -> None:
    """Read-only smoke check of the published pilot, including its reviewed image."""
    page.get_by_role("searchbox", name="Produkte suchen").fill("Sonnenblumen")
    card = page.locator(".product-card")
    assert card.count() == 1
    assert "500 ml" in card.inner_text()
    assert "möglicherweise veraltet" in card.inner_text()
    assert "Open Prices" in card.inner_text()
    assert card.get_by_role("link", name="Open Prices", exact=True).get_attribute("href").startswith("https://prices.openfoodfacts.org/prices/")
    assert "CC BY-SA 3.0" in card.inner_text()
    assert card.locator("img").get_attribute("src") == "/products/off-4061461377601-front.jpg"
    assert card.locator("img").evaluate("image => image.complete && image.naturalWidth > 0")
    assert card.locator("img").evaluate("image => getComputedStyle(image).objectFit") == "contain"
    card.locator(".product-image-button").click()
    page.get_by_text("Beobachteter Standort", exact=True).wait_for()
    card.get_by_role("button", name="In den Warenkorb", exact=True).click()
    page.get_by_role("button", name=re.compile(r"^Warenkorb:")).click()
    assert page.locator(".checkout-cart .cart-item").count() == 1
    page.get_by_text("Aldi Süd, 70173, Stuttgart", exact=True).first.wait_for()
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.screenshot(path=str(output / "live-pilot-cart-390.png"), full_page=True)
    print("Published pilot OK: real public API, 500-ml pack, dated source, reviewed photo/credit, observed branch, cart")


def verify_catalog(browser, base_url: str, output: Path) -> None:
    """Exercise the real loader with explicit, synthetic API fixtures."""
    page = browser.new_page(viewport={"width": 390, "height": 844})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("**/nominatim.openstreetmap.org/**", lambda route: route.fulfill(json=[]))
    page.route("**/*overpass*/**", lambda route: route.fulfill(json={"elements": []}))
    product = {"id": "quark_500", "name": "Magerquark", "category": "Molkerei", "package_size": "500 g"}
    price = {
        "id": "fixture-price", "product_id": "quark_500", "product_name": "Testmarke Bio Magerquark",
        "article_id": "fixture-article", "article_name": "Testmarke Bio Magerquark",
        "article_review_status": "verified", "brand_name": "Testmarke", "brand_type": "manufacturer",
        "package": {"amount": "250", "unit": "g", "count": 2, "total": "500", "original": "2 × 250 g"},
        "retailer_name": "Lidl", "price": 1.29, "unit_price": 2.58, "unit": "kg", "confidence": 1,
        "observed_at": "2026-09-05T08:00:00Z", "source": "Synthetische Testquelle", "source_url": None,
        "location_label": "Testfiliale Ulm", "location_source_ref": "fixture-store", "region": "Baden-Württemberg",
    }

    def api(route):
        relation = route.request.url.split("/rest/v1/")[1].split("?")[0]
        route.fulfill(json=[product] if relation == "products" else [price] if relation == "current_price_observations" else [])

    page.route("**/rest/v1/**", api)
    page.goto(base_url, wait_until="networkidle")
    card = page.locator(".product-card").filter(has_text="Testmarke Bio Magerquark")
    card.wait_for()
    assert card.count() == 1
    assert "2 × 250 g" in card.inner_text()
    assert "Symbolbild" in card.inner_text()
    assert "Synthetische Testquelle" in card.inner_text()
    card.get_by_role("button", name="In den Warenkorb", exact=True).click()
    page.get_by_role("button", name=re.compile(r"^Warenkorb:")).click()
    page.get_by_text("Testfiliale Ulm", exact=True).first.wait_for()
    assert page.locator(".checkout-cart .cart-item").count() == 1
    assert page.evaluate("JSON.parse(localStorage.getItem('preisfuchs-cart-v1'))['article:fixture-article']") == 1
    page.screenshot(path=str(output / "catalog-fixture-390.png"), full_page=True)
    assert not errors, errors
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.close()
    print("Structured catalog fixture OK: loader, stable article ID, multipack, source, observed location, cart")


def verify_shopping(page, output: Path) -> None:
    page.keyboard.press("Tab")
    assert page.evaluate("document.activeElement.textContent") == "Zum Hauptinhalt"
    page.keyboard.press("Enter")
    assert page.evaluate("document.activeElement.id") == "main-content"
    page.get_by_role("button", name="Gemüse", exact=True).click()
    assert page.locator(".product-strip .section-label").inner_text() == "GEMÜSE"
    assert page.locator(".comparison-panel").count() == 0
    search = page.get_by_role("searchbox", name="Produkte suchen")
    search.fill("Quark")
    page.get_by_text("Hier fehlen noch passende Preise.", exact=True).wait_for()
    page.get_by_role("button", name="Auch ohne Preis anzeigen", exact=True).click()
    product = page.locator(".product-card")
    assert product.count() == 1
    product.get_by_role("button", name="In den Warenkorb", exact=True).click()

    page.get_by_role("button", name="Mit App vergleichen", exact=True).click()
    page.get_by_role("button", name="Persönliche Coupons einschalten", exact=True).click()
    assert page.get_by_role("button", name="Persönliche Coupons ausschalten", exact=True).get_attribute("aria-pressed") == "true"
    page.get_by_role("button", name="Ohne App vergleichen", exact=True).click()
    assert "personalized=1" not in page.url

    page.get_by_role("button", name=re.compile(r"^Warenkorb:")).click()
    page.get_by_role("heading", name="So kannst du einkaufen", exact=True).wait_for()
    items = page.locator(".checkout-cart .cart-item")
    assert items.count() == 5
    first = items.first
    first.get_by_role("button", name="Menge erhöhen", exact=True).click()
    assert first.locator(".cart-item-actions > span").inner_text() == "2"
    first.get_by_role("button", name="Artikel entfernen", exact=True).click()
    assert items.count() == 4
    page.get_by_role("button", name="Rückgängig", exact=True).click()
    assert items.count() == 5
    assert page.get_by_text("Vergleich unvollständig", exact=True).is_visible()
    page.get_by_role("heading", name="So kannst du einkaufen", exact=True).click()
    page.screenshot(path=str(output / "checkout-390.png"), full_page=True)
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")

    page.reload(wait_until="networkidle")
    page.get_by_role("button", name=re.compile(r"^Warenkorb:")).click()
    assert page.locator(".checkout-cart .cart-item").count() == 5
    print("Shopping flow OK: search, missing prices, app/coupon opt-ins, quantity, remove/undo, persisted cart, partial totals")


if __name__ == "__main__":
    main()
