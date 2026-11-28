import Foundation
import PreisfuchsDomain
import Testing

@Suite("Suchfilter und stabile Sortierung")
struct CatalogFilterTests {
    private let now = Date(timeIntervalSince1970: 1_795_824_000)

    @Test("Alle Sortierungen haben einen stabilen ID-Tiebreak", arguments: CatalogSort.allCases)
    func stableSort(sort: CatalogSort) {
        let products = [product("b"), product("a"), product("c", price: 2)]
        var filters = CatalogFilters()
        filters.sort = sort
        let forward = filters.apply(to: products, now: now).map(\.id)
        #expect(forward == ["a", "b", "c"])
        #expect(filters.apply(to: Array(products.reversed()), now: now).map(\.id) == forward)
    }

    @Test("Marktfilter entfernt fremde Preiszeilen und ändert Anzahl")
    func markets() {
        var filters = CatalogFilters()
        filters.retailers = ["lidl"]
        let products = [product("a"), product("b", retailer: "Rewe")]
        let result = filters.apply(to: products, now: now)
        #expect(result.map(\.id) == ["a"])
        #expect(result.flatMap(\.prices).allSatisfy { $0.normalizedRetailer == "lidl" })
    }

    @Test("Bio, Eigenmarken und Angebote brauchen explizite Quelldaten")
    func explicitMetadata() {
        let plain = product("plain")
        let bio = product("bio", name: "Bio Milch", brandType: "private_label", offerType: "sale")
        var filters = CatalogFilters()
        filters.organicOnly = true
        filters.privateLabelOnly = true
        filters.offersOnly = true
        #expect(filters.apply(to: [plain, bio], now: now).map(\.id) == ["bio"])
        #expect(filters.apply(to: [product("notbio", name: "Biotin")], now: now).isEmpty)
    }

    @Test("Fehlende Grundpreise stehen hinten, Einheiten bleiben getrennt")
    func units() {
        var filters = CatalogFilters()
        filters.sort = .unitPrice
        #expect(filters.apply(to: [product("none", unitPrice: nil), product("l", unit: "l"), product("kg", unit: "kg")], now: now).map(\.id) == ["kg", "l", "none"])
    }

    private func product(_ id: String, name: String = "Milch", price: Decimal = 1,
                         retailer: String = "Lidl", brandType: String? = nil,
                         offerType: String? = nil, unitPrice: Decimal? = 1, unit: String = "l") -> GroceryProduct {
        GroceryProduct(id: id, name: name, category: "Molkerei", packageSize: "1 l", symbolName: "mug", prices: [
            PriceObservation(id: id, retailer: retailer, storeLocation: "Testort", price: price,
                             unitPrice: unitPrice, unit: unit, observedAt: now, source: "Test",
                             sourceDetail: "Testbeobachtung", confidence: 1, offerType: offerType)
        ], brandType: brandType)
    }
}
