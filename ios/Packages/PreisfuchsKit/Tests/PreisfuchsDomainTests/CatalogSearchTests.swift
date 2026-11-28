import PreisfuchsDomain
import Testing

@Suite("Katalogsuche")
struct CatalogSearchTests {
    @Test("Suche kombiniert Wörter, ignoriert Großschreibung und Umlaute")
    func normalizedTerms() {
        let milk = item("milk", name: "Bio Milch", category: "Molkerei")
        let vegetables = item("vegetables", name: "Gemüse", category: "Frische")
        let index = CatalogSearch(products: [milk, vegetables])
        #expect(index.products(matching: " MILCH bio ").map(\.id) == ["milk"])
        #expect(index.products(matching: "gemuse").map(\.id) == ["vegetables"])
        #expect(index.products(matching: "Milch Frische").isEmpty)
        #expect(index.products(matching: " ").count == 2)
        let branded = GroceryProduct(id: "brand", name: "Haferdrink", category: "Getränke", packageSize: "1 l", symbolName: "mug", prices: [], brandName: "Testmarke")
        #expect(CatalogSearch(products: [branded]).products(matching: "testmarke").map(\.id) == ["brand"])
    }

    @Test("Vorschläge sind begrenzt und enthalten nur Katalogprodukte")
    func suggestions() {
        let products = (0..<20).map { item("\($0)", name: "Milch \($0)") }
        let index = CatalogSearch(products: products)
        #expect(index.suggestions(for: "Milch").count == 6)
        #expect(index.suggestions(for: "").isEmpty)
        #expect(index.suggestions(for: "erfunden").isEmpty)
        #expect(index.suggestions(for: "Milch").map(\.id) == Array(products.prefix(6)).map(\.id))
    }

    @Test("Vorschläge aus 1000 Produkten liegen im 150-ms-Budget")
    func suggestionLatency() {
        let products = (0..<1_000).map { item("\($0)", name: "Produkt \($0)") }
        let index = CatalogSearch(products: products)
        let clock = ContinuousClock()
        let start = clock.now
        let result = index.suggestions(for: "Produkt 999")
        let elapsed = start.duration(to: clock.now)
        #expect(result.map(\.id) == ["999"])
        #expect(elapsed < .milliseconds(150))
    }
}

private func item(_ id: String, name: String, category: String = "Lebensmittel") -> GroceryProduct {
    GroceryProduct(id: id, name: name, category: category, packageSize: "1 l", symbolName: "basket", prices: [])
}
