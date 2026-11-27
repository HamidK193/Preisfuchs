import PreisfuchsData
import Testing
@testable import Preisfuchs

@Suite("App-Startkonfiguration")
struct AppEnvironmentTests {
    @Test("Fehlende Backend-Konfiguration startet ohne Konto mit Demodaten")
    func missingConfigUsesDemoMode() {
        let environment = AppEnvironment.bootstrap(info: [:])

        #expect(environment.origin == .demo)
        #expect(environment.auth == nil)
    }

    @Test("Die Preisübersicht lädt die gebündelten Beispieldaten")
    @MainActor
    func loadsBundledDemoPrices() async {
        let model = PriceListModel(environment: .demo)

        await model.loadIfNeeded()

        #expect(model.origin == .demo)
        #expect(!model.products.isEmpty)
        #expect(model.loadedAt != nil)
        #expect(model.products.allSatisfy { $0.prices.allSatisfy { $0.storeLocation == "Demo-Standort" } })
    }

    @Test("Suche, Favoriten und Einkaufsliste reagieren auf Auswahl")
    @MainActor
    func searchAndSelectionsWork() async {
        let model = PriceListModel(environment: .demo)
        await model.loadIfNeeded()

        model.searchText = "milch"
        #expect(model.filteredProducts.contains { $0.id == "milk_15" })

        guard let milk = model.products.first(where: { $0.id == "milk_15" }) else {
            Issue.record("Milch-Beispiel fehlt")
            return
        }

        model.toggleFavorite(milk)
        model.toggleShopping(milk)
        #expect(model.favoriteIDs.contains(milk.id))
        #expect(model.shoppingIDs.contains(milk.id))
    }
}
