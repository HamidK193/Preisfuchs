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
                    Text("\(cheapest.source) · \(cheapest.observedDateText)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    if let requirement = cheapest.appRequirementText {
                        Text(requirement)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.green)
                    }
                }
            }
        }
        .padding(.vertical, 6)
    }
}

struct ProductDetailView: View {
    let product: GroceryProduct
    @State private var includeAppDiscounts = false
    @State private var includePersonalizedDiscounts = false

    var sortedPrices: [PriceObservation] {
        product.comparisonPrices(
            includeAppDiscounts: includeAppDiscounts,
            includePersonalizedDiscounts: includePersonalizedDiscounts
        )
    }

    var cheapestPrice: PriceObservation? {
        sortedPrices.first
    }

    var body: some View {
        List {
            Section {
                Toggle("App-Rabatte einrechnen", isOn: $includeAppDiscounts)
                if includeAppDiscounts {
                    Toggle("Personalisierte Coupons einrechnen", isOn: $includePersonalizedDiscounts)
                }
                Text("App-Preise können Aktivierung, Anmeldung oder einen ausgewählten Markt voraussetzen. Personalisierte Coupons bleiben standardmäßig aus.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let cheapest = cheapestPrice {
                Section {
                    CheapestPriceCard(product: product, price: cheapest)
                }
                .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
                .listRowBackground(Color.clear)
            }

            Section("Märkte") {
                ForEach(sortedPrices) { price in
                    PriceRow(price: price, isBest: price.id == cheapestPrice?.id)
                }
            }
        }
        .navigationTitle(product.name)
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: includeAppDiscounts) { _, value in
            if !value { includePersonalizedDiscounts = false }
        }
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

            Text("\(price.source) · \(price.observedDateText)")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            if let validity = price.validityText {
                Text(validity)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if price.isStale() {
                Label("Älter als 14 Tage", systemImage: "exclamationmark.triangle")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.orange)
            }

            if let requirement = price.appRequirementText {
                Label(requirement, systemImage: "tag.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.green)
            }
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
                Text("\(price.source) · \(price.observedDateText)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let validity = price.validityText {
                    Text(validity)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                if price.isStale() {
                    Text("Möglicherweise veraltet")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.orange)
                }
                if let requirement = price.appRequirementText {
                    Label(requirement, systemImage: "tag.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.green)
                }
                if price.couponActivationRequired == true {
                    Text("Coupon vorher aktivieren")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
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
    @State private var quantities: [String: Int]
    @State private var includeAppDiscounts = false
    @State private var includePersonalizedDiscounts = false

    private struct StoreBasketPlan {
        let retailer: String
        let total: Decimal
        let availableCount: Int
        let missingCount: Int
        let staleCount: Int

        var isComplete: Bool { availableCount > 0 && missingCount == 0 }
    }

    init(products: [GroceryProduct]) {
        self.products = products
        _quantities = State(initialValue: Self.loadCart())
    }

    private var selectedProducts: [GroceryProduct] {
        products.filter { (quantities[$0.id] ?? 0) > 0 }
    }

    private var estimatedBestTotal: Decimal {
        selectedProducts.reduce(Decimal.zero) { partial, product in
            partial + (comparisonPrice(for: product)?.price ?? .zero) * Decimal(quantities[product.id] ?? 0)
        }
    }

    private var missingPriceCount: Int {
        selectedProducts.filter { comparisonPrice(for: $0) == nil }.count
    }

    private var stalePriceCount: Int {
        selectedProducts.filter { comparisonPrice(for: $0)?.isStale() == true }.count
    }

    private var splitRetailerCount: Int {
        Set(selectedProducts.compactMap { comparisonPrice(for: $0)?.normalizedRetailer }).count
    }

    private var singleStorePlans: [StoreBasketPlan] {
        let productPrices = selectedProducts.map { product in
            (
                product,
                product.comparisonPrices(
                    includeAppDiscounts: includeAppDiscounts,
                    includePersonalizedDiscounts: includePersonalizedDiscounts
                )
            )
        }
        let retailerKeys = Set(productPrices.flatMap { $0.1.map(\.normalizedRetailer) })

        return retailerKeys.map { retailerKey in
            var total = Decimal.zero
            var availableCount = 0
            var staleCount = 0
            var displayName = retailerKey

            for (product, prices) in productPrices {
                guard let price = prices.first(where: { $0.normalizedRetailer == retailerKey }) else { continue }
                displayName = price.retailer
                total += price.price * Decimal(quantities[product.id] ?? 0)
                availableCount += 1
                if price.isStale() { staleCount += 1 }
            }

            return StoreBasketPlan(
                retailer: displayName,
                total: total,
                availableCount: availableCount,
                missingCount: selectedProducts.count - availableCount,
                staleCount: staleCount
            )
        }
        .sorted { left, right in
            if left.isComplete != right.isComplete { return left.isComplete && !right.isComplete }
            if left.missingCount != right.missingCount { return left.missingCount < right.missingCount }
            return left.total < right.total
        }
    }

    private var bestSingleStore: StoreBasketPlan? {
        singleStorePlans.first
    }

    private var splitSavings: Decimal {
        guard missingPriceCount == 0, let bestSingleStore, bestSingleStore.isComplete else { return .zero }
        return max(.zero, bestSingleStore.total - estimatedBestTotal)
    }

    private var shareText: String {
        let rows = selectedProducts.map { product in
            let quantity = quantities[product.id] ?? 0
            let priceText = comparisonPrice(for: product).map {
                let requirement = $0.appRequirementText.map { ", \($0)" } ?? ""
                return "ab \($0.formattedPrice) bei \($0.retailer) (\($0.source), \($0.observedDateText)\(requirement))"
            } ?? "kein Preis"
            return "- \(quantity) × \(product.name) (\(product.packageSize)): \(priceText)"
        }
        let totalLabel = missingPriceCount == 0 ? "Geschätztes Minimum" : "Unvollständige Teilsumme"
        return (["Preisfuchs-Warenkorb", ""] + rows + [
            "",
            "\(totalLabel): \(formatCurrency(estimatedBestTotal))",
            "Preise sind datierte Beobachtungen, keine garantierten Live-Filialpreise."
        ]).joined(separator: "\n")
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Rabatte") {
                    Toggle("App-Rabatte einrechnen", isOn: $includeAppDiscounts)
                    if includeAppDiscounts {
                        Toggle("Personalisierte Coupons einrechnen", isOn: $includePersonalizedDiscounts)
                    }
                    Text("App-Preise können Aktivierung oder Anmeldung voraussetzen. Personalisierte Coupons bleiben separat freiwillig.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text(missingPriceCount == 0 ? "Maximal sparen" : "Unvollständige Teilsumme")
                            Spacer()
                            Text(formatCurrency(estimatedBestTotal))
                                .font(.headline)
                        }
                        Text("\(splitRetailerCount) \(splitRetailerCount == 1 ? "Markt" : "Märkte")")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        if let bestSingleStore {
                            Divider()
                            HStack {
                                Text(bestSingleStore.missingCount == 0 ? "Bester Ein-Laden-Einkauf" : "Beste Ein-Laden-Teilsumme")
                                Spacer()
                                Text(formatCurrency(bestSingleStore.total))
                                    .font(.headline)
                            }
                            Text("\(bestSingleStore.retailer) · \(bestSingleStore.availableCount) von \(selectedProducts.count) Artikeln")
                                .font(.caption)
                                .foregroundStyle(bestSingleStore.isComplete ? Color.secondary : Color.orange)
                            if bestSingleStore.staleCount > 0 {
                                Text("\(bestSingleStore.staleCount) Preise dieses Ein-Laden-Vergleichs sind älter als 14 Tage.")
                                    .font(.caption2)
                                    .foregroundStyle(.orange)
                            }
                        }
                        if splitSavings > 0 {
                            Text("Die Aufteilung spart \(formatCurrency(splitSavings)) gegenüber dem besten vollständigen Ein-Laden-Einkauf.")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.green)
                        }
                        if splitRetailerCount > 1 {
                            Text("Fahrtkosten und zusätzliche Einkaufszeit sind nicht eingerechnet.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        if missingPriceCount > 0 {
                            Text("Für \(missingPriceCount) ausgewählte Produkte fehlt eine Preisbeobachtung.")
                                .font(.caption)
                                .foregroundStyle(.orange)
                        }
                        if stalePriceCount > 0 {
                            Text("\(stalePriceCount) verwendete Preisbeobachtungen sind älter als 14 Tage.")
                                .font(.caption)
                                .foregroundStyle(.orange)
                        }
                        ShareLink(item: shareText, subject: Text("Mein Preisfuchs-Warenkorb")) {
                            Label("Warenkorb teilen", systemImage: "square.and.arrow.up")
                        }
                        .disabled(selectedProducts.isEmpty)
                    }
                }

                Section("Produkte") {
                    ForEach(products) { product in
                        HStack(spacing: 10) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(product.name)
                                if let price = comparisonPrice(for: product) {
                                    Text("\(price.formattedPrice) · \(price.retailer) · \(price.source)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    if let requirement = price.appRequirementText {
                                        Text(requirement)
                                            .font(.caption2.weight(.semibold))
                                            .foregroundStyle(.green)
                                    }
                                } else {
                                    Text("Keine aktive Preisbeobachtung")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                            HStack(spacing: 8) {
                                Button {
                                    updateQuantity(for: product.id, delta: -1)
                                } label: {
                                    Image(systemName: "minus.circle.fill")
                                }
                                .disabled((quantities[product.id] ?? 0) == 0)

                                Text("\(quantities[product.id] ?? 0)")
                                    .monospacedDigit()
                                    .frame(minWidth: 20)

                                Button {
                                    updateQuantity(for: product.id, delta: 1)
                                } label: {
                                    Image(systemName: "plus.circle.fill")
                                }
                            }
                            .foregroundStyle(.green)
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .navigationTitle("Einkaufsliste")
            .onChange(of: quantities) { _, value in
                Self.saveCart(value)
            }
            .onChange(of: includeAppDiscounts) { _, value in
                if !value { includePersonalizedDiscounts = false }
            }
        }
    }

    private func comparisonPrice(for product: GroceryProduct) -> PriceObservation? {
        product.cheapestPrice(
            includeAppDiscounts: includeAppDiscounts,
            includePersonalizedDiscounts: includePersonalizedDiscounts
        )
    }

    private func updateQuantity(for productID: String, delta: Int) {
        let quantity = min(99, max(0, (quantities[productID] ?? 0) + delta))
        if quantity == 0 {
            quantities.removeValue(forKey: productID)
        } else {
            quantities[productID] = quantity
        }
    }

    private func formatCurrency(_ value: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "de_DE")
        return formatter.string(from: value as NSDecimalNumber) ?? "\(value) EUR"
    }

    private static let cartStorageKey = "preisfuchs-cart-v1"

    private static func loadCart() -> [String: Int] {
        guard let data = UserDefaults.standard.data(forKey: cartStorageKey),
              let decoded = try? JSONDecoder().decode([String: Int].self, from: data) else {
            return [:]
        }
        return decoded.filter { !$0.key.isEmpty && $0.key.count <= 200 && (1...99).contains($0.value) }
    }

    private static func saveCart(_ cart: [String: Int]) {
        let sanitized = cart.filter { !$0.key.isEmpty && $0.key.count <= 200 && (1...99).contains($0.value) }
        guard let data = try? JSONEncoder().encode(sanitized) else { return }
        UserDefaults.standard.set(data, forKey: cartStorageKey)
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
