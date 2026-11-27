import Foundation
import PreisfuchsData
import Testing

@Suite("Demodaten")
struct DemoPriceServiceTests {
    @Test("Bündelte Demodaten sind lesbar und enthalten Produkte")
    func loadsBundledProducts() throws {
        let products = try DemoPriceService().loadProducts()

        #expect(!products.isEmpty)
        #expect(Set(products.map(\.id)).count == products.count)
        #expect(products.contains { !$0.prices.isEmpty })
    }

    @Test("Jede Demo-Beobachtung hat Quelle, Detail und Beobachtungsdatum")
    func demoObservationsHaveProvenance() throws {
        let products = try DemoPriceService().loadProducts()
        let observations = products.flatMap(\.prices)

        #expect(!observations.isEmpty)
        #expect(observations.allSatisfy { !$0.source.isEmpty && !$0.sourceDetail.isEmpty })
        #expect(observations.allSatisfy { $0.observedAt.timeIntervalSince1970 > 0 })
    }

    @Test("Demo-Service kennzeichnet den Ursprung als Demo")
    func snapshotIdentifiesDemoOrigin() async throws {
        let snapshot = try await DemoPriceService().loadCurrentPrices()

        #expect(snapshot.origin == .demo)
        #expect(!snapshot.products.isEmpty)
        #expect(!snapshot.truncated)
    }
}
