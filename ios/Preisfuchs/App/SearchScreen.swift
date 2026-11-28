import PreisfuchsDomain
import SwiftUI

struct SearchScreen: View {
    @Bindable var model: PriceListModel
    @State private var showsFilters = false

    private var groups: [(category: String, products: [GroceryProduct])] {
        Dictionary(grouping: model.filteredProducts, by: \.category)
            .sorted { $0.key.localizedStandardCompare($1.key) == .orderedAscending }
            .map { (category: $0.key, products: $0.value) }
    }

    var body: some View {
        List {
            CatalogFeedback(model: model)
                .listRowBackground(Color.clear)
            if model.searchText.isEmpty && !model.searchHistory.isEmpty {
                Section("Zuletzt gesucht") {
                    ForEach(model.searchHistory, id: \.self) { query in
                        Button { model.searchText = query } label: {
                            Label(query, systemImage: "clock")
                        }
                    }
                    Button("Verlauf löschen") { model.clearSearchHistory() }
                }
            }
            if model.filteredProducts.isEmpty && !model.isLoading && model.errorMessage == nil {
                CatalogEmptyView(
                    title: model.products.isEmpty ? "Noch keine Beobachtungen" : "Keine Treffer",
                    message: model.products.isEmpty ? "Lade die verfügbaren Beobachtungen erneut." : "Versuche einen anderen Suchbegriff oder entferne die Filter.",
                    symbol: "magnifyingglass",
                    actionTitle: model.products.isEmpty ? "Erneut laden" : "Suche zurücksetzen"
                ) {
                    if model.products.isEmpty { Task { await model.reload() } }
                    else {
                        model.searchText = ""
                        model.filters = CatalogFilters()
                    }
                }
                .listRowBackground(Color.clear)
            } else {
                if model.filters.sort != .name {
                    ForEach(model.filteredProducts) { ProductListRow(model: model, product: $0) }
                } else {
                    ForEach(groups, id: \.category) { group in
                        Section(group.category) {
                            ForEach(group.products) { product in
                                ProductListRow(model: model, product: product)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Produkte suchen")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { showsFilters = true } label: { Label("Filter", systemImage: "line.3.horizontal.decrease.circle") }
            }
        }
        .sheet(isPresented: $showsFilters) { FilterSheet(model: model) }
        .searchable(text: $model.searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "Lebensmittel suchen")
        .searchSuggestions {
            ForEach(model.searchSuggestions) { product in
                Button {
                    model.searchText = product.name
                    model.rememberSearch()
                    model.selectedProduct = product
                } label: {
                    HStack {
                        ProductImage(url: product.imageURL, category: product.category, size: 32)
                        Text(product.name)
                    }
                }
                .accessibilityIdentifier("search.suggestion.\(product.id)")
            }
        }
        .onSubmit(of: .search) { model.rememberSearch() }
        .refreshable { await model.reload() }
    }
}
