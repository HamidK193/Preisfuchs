import Foundation
import PreisfuchsData
import PreisfuchsDomain
import Testing
@testable import Preisfuchs

@Suite("Suche und Listen über Modell-Neustart")
struct SearchAndListTests {
    @Test("Neues Modell erhält Einkauf, Favoriten und Verlauf ohne Netzabruf")
    @MainActor
    func restoresListsOffline() async throws {
        let suite = "model-restart-test-\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let model = PriceListModel(environment: .demo, defaults: defaults)
        await model.loadIfNeeded()
        let milk = try #require(model.products.first { $0.id == "milk_15" })
        model.toggleShopping(milk)
        model.toggleFavorite(milk)
        model.searchText = "Milch"
        model.rememberSearch()
        let restarted = PriceListModel(environment: .demo, defaults: defaults)
        #expect(restarted.products.isEmpty) // Nothing fetched in this instance.
        #expect(restarted.shoppingProducts == [milk])
        #expect(restarted.favoriteProducts == [milk])
        #expect(restarted.shoppingProducts.first?.prices == milk.prices)
        #expect(restarted.searchHistory == ["Milch"])
        restarted.toggleShopping(milk)
        restarted.toggleFavorite(milk)
        let afterRemoval = PriceListModel(environment: .demo, defaults: defaults)
        #expect(afterRemoval.shoppingProducts.isEmpty)
        #expect(afterRemoval.favoriteProducts.isEmpty)
    }

    @Test("Verlauf ist dedupliziert, begrenzt und löschbar")
    @MainActor
    func boundedHistory() throws {
        let suite = "history-test-\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let model = PriceListModel(environment: .demo, defaults: defaults)
        for number in 0..<12 {
            model.searchText = "Suchbegriff \(number)"
            model.rememberSearch()
        }
        model.searchText = " suchbegriff 11 "
        model.rememberSearch()
        #expect(model.searchHistory.count == 10)
        #expect(model.searchHistory.first == "suchbegriff 11")
        model.clearSearchHistory()
        #expect(PriceListModel(environment: .demo, defaults: defaults).searchHistory.isEmpty)
    }

    @Test("Filter aktualisiert zwischengespeicherte Treffer und Vorschläge")
    @MainActor
    func filtersUpdateResults() async throws {
        let suite = "filter-test-\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let model = PriceListModel(environment: .demo, defaults: defaults)
        await model.loadIfNeeded()
        model.searchText = "milch"
        #expect(!model.searchSuggestions.isEmpty)
        model.filters.retailers = ["nicht vorhanden"]
        #expect(model.filteredProducts.isEmpty)
        #expect(model.searchSuggestions.isEmpty)
        model.filters = CatalogFilters()
        #expect(!model.filteredProducts.isEmpty)
    }
}
