import SwiftUI

struct SearchScreen: View {
    @Bindable var model: PriceListModel

    var body: some View {
        List {
            Section {
                SearchField(text: $model.searchText)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }
            CatalogFeedback(model: model)
                .listRowBackground(Color.clear)
            if model.filteredProducts.isEmpty && !model.isLoading && model.errorMessage == nil {
                CatalogEmptyView(
                    title: model.searchText.isEmpty ? "Noch keine Beobachtungen" : "Keine Treffer",
                    message: "Versuche einen anderen Suchbegriff oder lade die Daten erneut.",
                    symbol: "magnifyingglass",
                    actionTitle: model.searchText.isEmpty ? "Erneut laden" : "Suche löschen"
                ) {
                    if model.searchText.isEmpty { Task { await model.reload() } }
                    else { model.searchText = "" }
                }
                .listRowBackground(Color.clear)
            } else {
                ForEach(model.filteredProducts) { product in
                    ProductListRow(model: model, product: product)
                }
            }
        }
        .navigationTitle("Produkte suchen")
        .refreshable { await model.reload() }
    }
}
