import Foundation
import PreisfuchsData
import PreisfuchsDomain
import Testing

@Suite("OFF-Produktbilder")
struct ProductImageTests {
    @Test("Thumbnail vor großem Bild, HTTPS-Fallback bei ungültigen Angaben", arguments: [
        ("https://images.openfoodfacts.org/thumb.jpg", "https://images.openfoodfacts.org/thumb.jpg"),
        ("", "https://images.openfoodfacts.org/large.jpg"),
        ("kein-bild", "https://images.openfoodfacts.org/large.jpg"),
        ("http://example.org/insecure.jpg", "https://images.openfoodfacts.org/large.jpg"),
        ("file:///tmp/photo.jpg", "https://images.openfoodfacts.org/large.jpg")
    ])
    func preferredImage(values: (String, String)) throws {
        let image = try decodeImage([
            "gtin": "04001234567890",
            "image_thumb_url": values.0,
            "image_url": "https://images.openfoodfacts.org/large.jpg",
            "source_url": "https://world.openfoodfacts.org/product/04001234567890",
            "image_license": "CC BY-SA 3.0",
            "image_attribution": "Open Food Facts contributors"
        ])
        #expect(image.preferredImageURL?.absoluteString == values.1)
        #expect(image.gtin == "04001234567890")
        #expect(image.sourceURL?.host == "world.openfoodfacts.org")
        #expect(image.imageLicense == "CC BY-SA 3.0")
    }

    @Test("Fehlende und null Bildfelder erlauben den Platzhalter")
    func absentImages() throws {
        #expect(try decodeImage(["gtin": "00012345"]).preferredImageURL == nil)
        #expect(try decodeImage([
            "gtin": "00012345", "image_url": NSNull(), "image_thumb_url": NSNull()
        ]).preferredImageURL == nil)
    }

    @Test("EAN-Zuordnung überträgt Bild, Quellenlink und Lizenz; fremde EAN bleibt ohne Bild")
    func mapsImagesByEAN() throws {
        let row = try fixtureRow()
        let image = try decodeImage([
            "gtin": "4001234567890", "image_thumb_url": "https://images.openfoodfacts.org/thumb.jpg",
            "source_url": "https://world.openfoodfacts.org/product/4001234567890",
            "image_attribution": "Open Food Facts contributors"
        ])
        let product = try #require(PriceProductMapper.products(from: [row], images: [image]).first)
        #expect(product.imageURL == image.preferredImageURL)
        #expect(product.imageSourceURL == image.sourceURL)
        #expect(product.imageLicense == "CC BY-SA 3.0")
        #expect(product.imageAttribution == "Open Food Facts contributors")
        #expect(product.prices.count == 1)
        let unrelated = try decodeImage(["gtin": "00012345", "image_url": "https://example.org/other.jpg"])
        #expect(PriceProductMapper.products(from: [row], images: [unrelated]).first?.imageURL == nil)
    }

    @Test("Beide GTIN-Formen erhalten führende Nullen", arguments: [true, false])
    func gtinForms(comparisonKey: Bool) throws {
        var object = try fixtureObject()
        object["product_id"] = "gtin_00012345"
        if comparisonKey { object["comparison_key"] = "gtin:00012345" }
        else { object["comparison_key"] = NSNull() }
        let row = try PriceDecoding.makeDecoder().decode(PriceRow.self, from: JSONSerialization.data(withJSONObject: object))
        #expect(row.gtin == "00012345")
    }

    @Test("Alte Demo-Daten ohne Bildfelder und neuer Codable-Roundtrip funktionieren")
    func domainCompatibility() throws {
        let demo = try #require(DemoPriceService().loadProducts().first)
        #expect(demo.imageURL == nil)
        let row = try fixtureRow()
        let image = try decodeImage([
            "gtin": row.gtin!, "image_url": "https://example.org/photo.jpg",
            "source_url": "https://world.openfoodfacts.org/product/4001234567890"
        ])
        let product = try #require(PriceProductMapper.products(from: [row], images: [image]).first)
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()
        #expect(try decoder.decode(GroceryProduct.self, from: encoder.encode(product)) == product)
        let cached = try PriceDecoding.makeCacheEncoder().encode(product)
        #expect(try PriceDecoding.makeDecoder().decode(GroceryProduct.self, from: cached) == product)
    }

    @Test("Katalog-EAN ergänzt Beobachtungen ohne EAN-Schlüssel")
    func catalogGTINFallback() throws {
        var object = try fixtureObject()
        object["product_id"] = "milk"
        object["comparison_key"] = "milk:1l"
        let row = try PriceDecoding.makeDecoder().decode(PriceRow.self, from: JSONSerialization.data(withJSONObject: object))
        let catalog = try PriceDecoding.makeDecoder().decode(ArticleGTINRow.self, from: JSONSerialization.data(withJSONObject: [
            "id": row.articleId.uuidString, "gtin": "00012345"
        ]))
        let image = try decodeImage(["gtin": "00012345", "image_thumb_url": "https://example.org/thumb.jpg"])
        let product = try #require(PriceProductMapper.products(from: [row], images: [image], articleGTINs: [catalog]).first)
        #expect(row.gtin == nil)
        #expect(catalog.gtin == "00012345")
        #expect(product.imageURL == image.preferredImageURL)
    }

    @Test("Widersprüchliche Artikel-EANs ergeben kein möglicherweise falsches Bild")
    func conflictingGTINsHaveNoImage() throws {
        let row = try fixtureRow()
        let catalog = try PriceDecoding.makeDecoder().decode(ArticleGTINRow.self, from: JSONSerialization.data(withJSONObject: [
            "id": row.articleId.uuidString, "gtin": "00012345"
        ]))
        let image = try decodeImage(["gtin": row.gtin!, "image_url": "https://example.org/photo.jpg"])
        let product = try #require(PriceProductMapper.products(from: [row], images: [image], articleGTINs: [catalog]).first)
        #expect(product.imageURL == nil)
        #expect(product.prices.count == 1)
    }
}

private func decodeImage(_ object: [String: Any]) throws -> OffProductRow {
    try PriceDecoding.makeDecoder().decode(OffProductRow.self, from: JSONSerialization.data(withJSONObject: object))
}

private func fixtureObject() throws -> [String: Any] {
    let url = try #require(Bundle.module.url(forResource: "current_price_observations_page", withExtension: "json", subdirectory: "Fixtures"))
    let objects = try #require(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [[String: Any]])
    return try #require(objects.first)
}

private func fixtureRow() throws -> PriceRow {
    try PriceDecoding.makeDecoder().decode(PriceRow.self, from: JSONSerialization.data(withJSONObject: fixtureObject()))
}
