import Foundation
import PreisfuchsDomain
import Testing

@Suite("Preisvergleich")
struct PriceModelsTests {
    @Test("Aldi Nord und Aldi Süd bleiben getrennte Händler")
    func aldiRegionsStaySeparate() {
        #expect(observation("nord", retailer: "ALDI Nord").normalizedRetailer == "aldi nord")
        #expect(observation("sued", retailer: "Aldi Süd").normalizedRetailer == "aldi sued")
        #expect(observation("edeka", retailer: "E-Center").normalizedRetailer == "edeka")
    }

    @Test("Je Händler und Preisbedingung zählt die neueste Beobachtung")
    func newestObservationWinsPerCondition() {
        let product = product(prices: [
            observation("old", retailer: "Lidl", price: "0.89", observedAt: "2026-11-20T12:00:00Z"),
            observation("new", retailer: "Lidl", price: "0.99", observedAt: "2026-11-25T12:00:00Z"),
            observation("aldi", retailer: "Aldi Nord", price: "1.10")
        ])

        #expect(product.comparisonPrices(now: date("2026-11-27T12:00:00Z")).map(\.id) == ["new", "aldi"])
    }

    @Test("App- und personalisierte Preise werden standardmäßig ausgeschlossen")
    func restrictedPricesAreOptIn() {
        let product = product(prices: [
            observation("regular", retailer: "Lidl", price: "1.05"),
            observation("app", retailer: "Lidl", price: "0.89", offerType: "app_discount", requiresApp: true),
            observation("personal", retailer: "Lidl", price: "0.50", personalized: true)
        ])

        #expect(product.cheapestPrice(now: date("2026-11-27T12:00:00Z"))?.id == "regular")
        #expect(product.cheapestPrice(
            includeAppDiscounts: true,
            includePersonalizedDiscounts: true,
            now: date("2026-11-27T12:00:00Z")
        )?.id == "personal")
    }

    @Test("Preis ist bis zum Ende des Berliner Gültigkeitstags aktiv")
    func validUntilIncludesBerlinDay() {
        let price = observation("valid", retailer: "Rewe", validUntil: "2026-11-27")
        let calendar = Calendar.preisfuchs
        let finalMoment = date("2026-11-27T22:59:59Z") // 23:59:59 in Berlin (CET)
        let nextDay = date("2026-11-27T23:00:00Z")

        #expect(price.isActive(at: finalMoment, calendar: calendar))
        #expect(!price.isActive(at: nextDay, calendar: calendar))
    }

    @Test("LocalDate dekodiert sowohl ein Datum als auch ein ISO-Datum")
    func localDateDecodesDateFormats() throws {
        let decoder = JSONDecoder()
        let dateOnly = try decoder.decode(LocalDate.self, from: Data("\"2026-11-27\"".utf8))
        let isoDate = try decoder.decode(LocalDate.self, from: Data("\"2026-11-27T00:00:00Z\"".utf8))

        #expect(dateOnly == isoDate)
        #expect(dateOnly.description == "2026-11-27")
        #expect(LocalDate(string: "2026-02-30") == nil)
    }

    @Test("Veraltungsgrenze ist 30 Tage")
    func staleBoundaryIsThirtyDays() {
        let price = observation("old", retailer: "Rewe", observedAt: "2026-10-28T12:00:00Z")
        #expect(!price.isStale(at: date("2026-11-27T12:00:00Z")))
        #expect(price.isStale(at: date("2026-11-27T12:00:01Z")))
    }

    @Test("Quellenalter wird in deutscher Sprache angezeigt")
    func freshnessTextUsesObservedDate() {
        #expect(PriceFormatting.freshnessText(
            observedAt: date("2026-11-26T12:00:00Z"),
            now: date("2026-11-27T12:00:00Z")
        ) == "gestern beobachtet")
        #expect(PriceFormatting.freshnessText(
            observedAt: date("2026-10-01T12:00:00Z"),
            now: date("2026-11-27T12:00:00Z")
        ).contains("möglicherweise veraltet"))
        let expiry = LocalDate(string: "2026-11-27")!
        #expect(PriceFormatting.validityText(expiry) == "gültig bis 27.11.2026")
    }
}

private func product(prices: [PriceObservation]) -> GroceryProduct {
    GroceryProduct(
        id: "milk",
        name: "Milch 1,5 %",
        category: "Molkerei",
        packageSize: "1 l",
        symbolName: "carton",
        prices: prices
    )
}

private func observation(
    _ id: String,
    retailer: String,
    price: String = "1.00",
    observedAt: String = "2026-11-26T12:00:00Z",
    validUntil: String? = nil,
    offerType: String? = nil,
    requiresApp: Bool? = nil,
    personalized: Bool? = nil
) -> PriceObservation {
    PriceObservation(
        id: id,
        retailer: retailer,
        storeLocation: "Deutschland",
        price: Decimal(string: price)!,
        observedAt: date(observedAt),
        source: "Test",
        sourceDetail: "Testbeobachtung",
        confidence: 1,
        offerType: offerType,
        requiresApp: requiresApp,
        personalized: personalized,
        validUntil: validUntil.flatMap(LocalDate.init(string:))
    )
}

private func date(_ string: String) -> Date {
    ISO8601DateFormatter().date(from: string)!
}
