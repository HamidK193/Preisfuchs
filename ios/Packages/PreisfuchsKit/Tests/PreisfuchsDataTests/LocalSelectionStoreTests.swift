import Foundation
import PreisfuchsData
import PreisfuchsDomain
import Testing

@Suite("Lokale JSON-Listen")
struct LocalSelectionStoreTests {
    @Test("Neue Speicherinstanz erhält Einkauf und Favoriten samt Quelle und Datum")
    @MainActor
    func restartRetainsSelections() throws {
        let suite = "selection-test-\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let product = try #require(DemoPriceService().loadProducts().first)
        let saved = LocalSelections(shopping: [product], favorites: [product])
        try LocalSelectionStore(defaults: defaults, namespace: "demo").save(saved)
        let reopenedDefaults = try #require(UserDefaults(suiteName: suite))
        #expect(try LocalSelectionStore(defaults: reopenedDefaults, namespace: "demo").load() == saved)
        #expect(try LocalSelectionStore(defaults: reopenedDefaults, namespace: "observations").load() == LocalSelections())
        try LocalSelectionStore(defaults: reopenedDefaults, namespace: "demo").save(LocalSelections())
        #expect(try LocalSelectionStore(defaults: defaults, namespace: "demo").load() == LocalSelections())
    }

    @Test("Beschädigtes JSON wird gemeldet und beim Lesen nicht überschrieben")
    @MainActor
    func corruptJSON() throws {
        let suite = "selection-test-\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let data = Data("invalid".utf8)
        defaults.set(data, forKey: "korbwert.selections.v1.demo")
        #expect(throws: (any Error).self) { try LocalSelectionStore(defaults: defaults, namespace: "demo").load() }
        #expect(defaults.data(forKey: "korbwert.selections.v1.demo") == data)
    }
}
