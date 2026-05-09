import SwiftUI

struct ContentView: View {
    @ObservedObject var repository: PriceRepository

    var body: some View {
        TabView {
            ProductSearchView(repository: repository)
                .tabItem {
                    Label("Suche", systemImage: "magnifyingglass")
                }

            ShoppingListView(products: repository.products)
                .tabItem {
                    Label("Liste", systemImage: "cart")
                }

            DataSourcesView()
                .tabItem {
                    Label("Quellen", systemImage: "checkmark.seal")
                }
        }
        .task {
            await repository.loadProducts()
        }
    }
}

struct ProductSearchView: View {
    @ObservedObject var repository: PriceRepository
    @State private var searchText = ""

    private var filteredProducts: [GroceryProduct] {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return repository.products
        }

        return repository.products.filter {
            $0.name.localizedCaseInsensitiveContains(searchText)
            || $0.category.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                switch repository.loadingState {
                case .idle, .loading:
                    ProgressView("Preise werden geladen")
                case .failed(let message):
                    ContentUnavailableView("Keine Daten", systemImage: "wifi.exclamationmark", description: Text(message))
                case .loaded:
                    List(filteredProducts) { product in
                        NavigationLink(value: product) {
                            ProductRow(product: product)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Preisfuchs")
            .searchable(text: $searchText, prompt: "Lebensmittel suchen")
            .navigationDestination(for: GroceryProduct.self) { product in
                ProductDetailView(product: product)
            }
        }
    }
}

struct ProductRow: View {
    let product: GroceryProduct

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: product.symbolName)
                .font(.title2)
                .foregroundStyle(.green)
                .frame(width: 36, height: 36)
                .background(.green.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text(product.name)
                    .font(.headline)
                Text("\(product.category) · \(product.packageSize)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if let cheapest = product.cheapestPrice {
                VStack(alignment: .trailing, spacing: 4) {
                    Text(cheapest.formattedPrice)
                        .font(.headline)
                    Text(cheapest.retailer)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 6)
    }
}

struct ProductDetailView: View {
    let product: GroceryProduct

    var sortedPrices: [PriceObservation] {
        product.prices.sorted { $0.price < $1.price }
    }

    var body: some View {
        List {
            if let cheapest = product.cheapestPrice {
                Section {
                    CheapestPriceCard(product: product, price: cheapest)
                }
                .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
                .listRowBackground(Color.clear)
            }

            Section("Maerkte") {
                ForEach(sortedPrices) { price in
                    PriceRow(price: price, isBest: price.id == product.cheapestPrice?.id)
                }
            }
        }
        .navigationTitle(product.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct CheapestPriceCard: View {
    let product: GroceryProduct
    let price: PriceObservation

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: product.symbolName)
                    .font(.title)
                    .foregroundStyle(.white)
                    .frame(width: 48, height: 48)
                    .background(.green, in: RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 3) {
                    Text("Bester beobachteter Preis")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(price.formattedPrice)
                        .font(.system(.largeTitle, design: .rounded, weight: .bold))
                }
            }

            Text("\(price.retailer) · \(price.storeLocation)")
                .font(.headline)

            Text("\(price.source) · \(price.freshnessText)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(16)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8))
    }
}

struct PriceRow: View {
    let price: PriceObservation
    let isBest: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: isBest ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(isBest ? .green : .secondary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 4) {
                Text(price.retailer)
                    .font(.headline)
                Text(price.storeLocation)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text("\(price.source) · \(price.freshnessText)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(price.formattedPrice)
                    .font(.headline)
                if let unitPrice = price.formattedUnitPrice {
                    Text(unitPrice)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct ShoppingListView: View {
    let products: [GroceryProduct]
    @State private var selectedProductIDs: Set<String> = []

    private var selectedProducts: [GroceryProduct] {
        products.filter { selectedProductIDs.contains($0.id) }
    }

    private var estimatedBestTotal: Decimal {
        selectedProducts.reduce(Decimal.zero) { partial, product in
            partial + (product.cheapestPrice?.price ?? .zero)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        Text("Geschaetztes Minimum")
                        Spacer()
                        Text(formatCurrency(estimatedBestTotal))
                            .font(.headline)
                    }
                }

                Section("Produkte") {
                    ForEach(products) { product in
                        Button {
                            if selectedProductIDs.contains(product.id) {
                                selectedProductIDs.remove(product.id)
                            } else {
                                selectedProductIDs.insert(product.id)
                            }
                        } label: {
                            HStack {
                                Image(systemName: selectedProductIDs.contains(product.id) ? "checkmark.square.fill" : "square")
                                    .foregroundStyle(.green)
                                Text(product.name)
                                Spacer()
                                Text(product.cheapestPrice?.formattedPrice ?? "-")
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .navigationTitle("Einkaufsliste")
        }
    }

    private func formatCurrency(_ value: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "de_DE")
        return formatter.string(from: value as NSDecimalNumber) ?? "\(value) EUR"
    }
}

struct DataSourcesView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Aktueller MVP") {
                    Label("Lokale Demo-Daten", systemImage: "iphone")
                    Label("Open Prices vorbereitet", systemImage: "tag")
                    Label("Supabase vorbereitet", systemImage: "externaldrive.connected.to.line.below")
                }

                Section("Wichtig") {
                    Text("Preise sind Beobachtungen mit Quelle und Datum. Kostenlose Datenquellen koennen unvollstaendig sein.")
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Quellen")
        }
    }
}

#Preview {
    ContentView(repository: PriceRepository())
}
