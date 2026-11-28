import Foundation
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

    @Test("Ein fehlgeschlagenes Neuladen behält die letzten Beobachtungen samt Datenstand")
    @MainActor
    func failedRefreshRetainsSnapshot() async throws {
        let snapshot = try await DemoPriceService().loadCurrentPrices()
        let service = FirstSnapshotThenFailure(snapshot: snapshot)
        let environment = AppEnvironment(origin: .demo, prices: service, auth: nil)
        let model = PriceListModel(environment: environment)
        await model.loadIfNeeded()
        let products = model.products
        await model.reload()
        #expect(!products.isEmpty)
        #expect(model.products == products)
        #expect(model.loadedAt == snapshot.loadedAt)
        #expect(model.errorMessage != nil)
        #expect(!model.isLoading)
    }

    @Test("Das Startargument für UI-Tests erzwingt klar gekennzeichnete Demodaten")
    func demoLaunchArgument() {
        #expect(AppEnvironment.bootstrap(info: [:], arguments: ["--demo-data"]).origin == .demo)
    }
}

private actor FirstSnapshotThenFailure: PriceServicing {
    let snapshot: PriceSnapshot
    private var calls = 0

    init(snapshot: PriceSnapshot) { self.snapshot = snapshot }

    func loadCurrentPrices() async throws -> PriceSnapshot {
        calls += 1
        if calls > 1 { throw URLError(.notConnectedToInternet) }
        return snapshot
    }
}
