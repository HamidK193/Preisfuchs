import PreisfuchsDomain
import SwiftUI

struct FilterSheet: View {
    @Bindable var model: PriceListModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Märkte · ohne Auswahl alle") {
                    ForEach(model.retailerOptions, id: \.id) { retailer in
                        Toggle(retailer.name, isOn: Binding(
                            get: { model.filters.retailers.contains(retailer.id) },
                            set: { selected in
                                if selected { model.filters.retailers.insert(retailer.id) }
                                else { model.filters.retailers.remove(retailer.id) }
                            }
                        ))
                    }
                }
                Section("Sortierung") {
                    Picker("Sortieren nach", selection: $model.filters.sort) {
                        ForEach(CatalogSort.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    Text("Grundpreise werden nur innerhalb derselben Einheit sortiert. Entfernungen sind in diesem App-Datenpfad noch nicht angebunden.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Section("Produkte") {
                    Toggle("Bio", isOn: $model.filters.organicOnly)
                    Toggle("Eigenmarke", isOn: $model.filters.privateLabelOnly)
                    Toggle("Angebote", isOn: $model.filters.offersOnly)
                    Text("Bio berücksichtigt eine ausdrückliche Bio-Angabe im Namen; Eigenmarken benötigen eine Kennzeichnung der Quelle. Fehlende Angaben werden nicht ergänzt.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Button("Filter zurücksetzen") { model.filters = CatalogFilters() }
            }
            .navigationTitle("Filter")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("\(model.filteredProducts.count) Ergebnisse zeigen") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
