import PreisfuchsDomain
import Testing

@Suite("Standort · genau fünf Ziffern")
struct LocationPreferenceTests {
    @Test("Vier, sechs und sonstige ungültige Eingaben werden abgelehnt", arguments: ["1234", "123456", "12a45", "123 5", " 12345", "12345 ", "１２３４５", "١٢٣٤٥", "", "12345\n"])
    func rejectsPostalCodes(_ value: String) {
        #expect(!LocationPreference.isValidPostalCode(value))
        #expect(LocationPreference(postalCode: value, radiusKM: 10) == nil)
    }

    @Test("Fünf ASCII-Ziffern einschließlich führender Null sind gültig", arguments: ["10115", "01067", "99999"])
    func acceptsPostalCodes(_ value: String) {
        #expect(LocationPreference(postalCode: value, radiusKM: 10)?.postalCode == value)
    }

    @Test("Ungültiger Radius wird abgelehnt", arguments: [0.0, 101.0, -1.0, Double.infinity, Double.nan])
    func invalidRadius(_ value: Double) {
        #expect(LocationPreference(postalCode: "01067", radiusKM: value) == nil)
    }
}
