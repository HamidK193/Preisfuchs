import Foundation
import PreisfuchsDomain
import Testing

@Suite("Geschätzte Einkaufssumme")
struct BasketEstimateTests {
    private let now = Date(timeIntervalSince1970: 1_795_824_000)

    @Test("Decimal-Summe, neueste Beobachtung und genau eine Packung pro Produkt")
    func exactTotals() throws {
        let milk = product("milk", prices: [price("old", amount: "0.50", age: 100), price("new", amount: "1.19")])
        let bread = product("bread", prices: [price("bread", amount: "2.39")])
        let estimate = try #require(BasketEstimate.calculate(products: [milk, bread, milk], now: now).first)
        #expect(estimate.total == Decimal(string: "3.58"))
        #expect(estimate.lines.count == 2)
        #expect(estimate.isComplete)
        #expect(estimate.lines.allSatisfy { $0.observation.source == "Test" })
    }

    @Test("Fehlende Preise sind Teilsummen, vollständige Märkte stehen zuerst")
    func partialTotals() {
        let milk = product("milk", prices: [price("a", amount: "0.10"), price("b", amount: "1.00", retailer: "Rewe")])
        let bread = product("bread", prices: [price("c", amount: "2.00", retailer: "Rewe")])
        let estimates = BasketEstimate.calculate(products: [milk, bread], now: now)
        #expect(estimates.map(\.id) == ["rewe", "lidl"])
        #expect(estimates.first?.total == 3)
        #expect(estimates.last?.missingCount == 1)
        #expect(estimates.last?.isComplete == false)
        let missing = product("missing", prices: [])
        #expect(BasketEstimate.calculate(products: [milk, missing], now: now).allSatisfy { !$0.isComplete })
    }

    private func product(_ id: String, prices: [PriceObservation]) -> GroceryProduct {
        GroceryProduct(id: id, name: id, category: "Test", packageSize: "1 Stück", symbolName: "basket", prices: prices)
    }

    private func price(_ id: String, amount: String, age: TimeInterval = 0, retailer: String = "Lidl") -> PriceObservation {
        PriceObservation(id: id, retailer: retailer, storeLocation: "Testort", price: Decimal(string: amount)!,
                         observedAt: now.addingTimeInterval(-age), source: "Test", sourceDetail: "Testbeobachtung", confidence: 1)
    }
}
