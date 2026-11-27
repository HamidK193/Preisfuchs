import Foundation
import PreisfuchsData
import PreisfuchsDomain
import Testing

@Suite("Preisbeobachtungsdaten")
struct PriceRowTests {
    @Test("Supabase-Zeile dekodiert Dezimalpreis, EAN, Datum und optionale Felder")
    func decodeViewPage() throws {
        let rows = try PriceDecoding.makeDecoder().decode([PriceRow].self, from: fixture())
        let row = try #require(rows.first)

        #expect(rows.count == 1)
        #expect(row.price == Decimal(string: "0.79"))
        #expect(row.regularPrice == Decimal(string: "1.05"))
        #expect(row.gtin == "4001234567890")
        #expect(row.productType == "Milch")
        #expect(row.package?.total?.value == Decimal(1))
        #expect(row.validFrom == nil)
        #expect(row.validUntil?.description == "2026-11-28")
        #expect(row.storeId != nil)
    }

    @Test("Preiszeile wird mit Quelle und App-Bedingung ins Domainmodell übertragen")
    func mapsPriceObservation() throws {
        let rows = try PriceDecoding.makeDecoder().decode([PriceRow].self, from: fixture())
        let row = try #require(rows.first)
        let observation = PriceObservation(row: row)

        #expect(observation.source == "Open Prices DE")
        #expect(observation.sourceDetail.contains("ODbL"))
        #expect(observation.isAppDiscount)
        #expect(observation.appRequirementText == "Nur mit Händler-App")
        #expect(observation.price == Decimal(string: "0.79"))
    }

    @Test("Preiszeile bezieht alle selektierten Spalten aus der aktuellen View")
    func selectColumnsContainRequiredFields() {
        #expect(PriceRow.selectColumns.contains("source_license"))
        #expect(PriceRow.selectColumns.contains("valid_from"))
        #expect(PriceRow.selectColumns.contains("unit_price"))
        #expect(PriceRow.selectColumns.contains("location_label"))
    }

    @Test("Preiszeilen bleiben für den späteren lokalen Cache codierbar")
    func priceRowCodableRoundTrip() throws {
        let row = try #require(PriceDecoding.makeDecoder()
            .decode([PriceRow].self, from: fixture())
            .first)
        let encoded = try JSONEncoder().encode(row)
        let decoded = try PriceDecoding.makeDecoder().decode(PriceRow.self, from: encoded)

        #expect(decoded == row)
    }
}

private func fixture() throws -> Data {
    let url = try #require(Bundle.module.url(
        forResource: "current_price_observations_page",
        withExtension: "json",
        subdirectory: "Fixtures"
    ))
    return try Data(contentsOf: url)
}
