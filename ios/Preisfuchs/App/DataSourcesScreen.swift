import PreisfuchsDomain
import SwiftUI

struct DataSourcesScreen: View {
    let model: PriceListModel

    private var sources: [ObservationSource] {
        Dictionary(grouping: model.products.flatMap(\.prices), by: \.source)
            .compactMap { source, observations in
                observations.map(\.observedAt).max().map { ObservationSource(name: source, lastObservedAt: $0) }
            }
            .sorted { $0.name < $1.name }
    }

    var body: some View {
        List {
            Section("Preisbeobachtungen") {
                if model.origin == .demo {
                    Text("Demo: Diese Beispieldaten sind keine Marktpreise.")
                }
                if sources.isEmpty {
                    Text("Noch keine Preisquellen geladen.")
                }
                ForEach(sources) { source in
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Quelle: \(source.name.isEmpty ? "Nicht angegeben" : source.name)")
                        Text("Stand: \(PriceFormatting.date(source.lastObservedAt))")
                        Text("Letzte geladene Beobachtung dieser Quelle")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                if let loadedAt = model.loadedAt {
                    Text("Daten auf diesem Gerät geladen: \(PriceFormatting.date(loadedAt))")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            Section("Produktbilder") {
                Link("Quelle: Open Food Facts", destination: URL(string: "https://world.openfoodfacts.org")!)
                Link("Bildlizenz: CC BY-SA 3.0", destination: URL(string: "https://creativecommons.org/licenses/by-sa/3.0/deed.de")!)
                Text("Bilder stammen von Open Food Facts und seinen Mitwirkenden. Die Zuordnung erfolgt über EAN/GTIN. Quelle, Lizenz und gegebenenfalls Urheberangabe stehen am Produktbild in der Produktansicht.")
                Text("Ein eigenes Änderungsdatum der Bilder ist in der App nicht verfügbar. Fehlende Bilder werden durch ein Kategorie-Symbol ersetzt.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Section("Einordnung") {
                Text("Korbwert vergleicht Beobachtungen, keine garantierten Filialpreise. Angaben können unvollständig oder veraltet sein. Beobachtungen über 30 Tage werden am Preis gekennzeichnet.")
                Text("Die Preisrangliste ist nicht käuflich. Anzeigen stehen in eigenen Bereichen außerhalb des Preisvergleichs.")
            }
        }
        .navigationTitle("Datenquellen")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct ObservationSource: Identifiable {
    let name: String
    let lastObservedAt: Date
    var id: String { name }
}
