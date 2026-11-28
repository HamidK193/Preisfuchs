import Foundation
import Observation
import PreisfuchsData
import PreisfuchsDomain

@MainActor
@Observable
final class PriceListModel {
    private let environment: AppEnvironment
    private let defaults: UserDefaults
    private var searchIndex = CatalogSearch(products: [])
    private let selectionStore: LocalSelectionStore
    private var savedProducts: [String: GroceryProduct] = [:]
    private(set) var selectionError: String?
    private(set) var products: [GroceryProduct] = []
    private(set) var origin: DataOrigin
    private(set) var loadedAt: Date?
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var isTruncated = false
    var searchText = "" { didSet { updateSearchResults() } }
    var filters = CatalogFilters() { didSet { updateSearchResults() } }
    private(set) var filteredProducts: [GroceryProduct] = []
    private(set) var searchHistory: [String]
    var selectedTab = AppTab.home
    var selectedProduct: GroceryProduct?
    private(set) var favoriteIDs: Set<String> = []
    private(set) var shoppingIDs: Set<String> = []

    init(environment: AppEnvironment, defaults: UserDefaults = .standard) {
        self.environment = environment
        self.defaults = defaults
        selectionStore = LocalSelectionStore(defaults: defaults, namespace: environment.origin == .demo ? "demo" : "observations")
        searchHistory = defaults.stringArray(forKey: "korbwert.searchHistory") ?? []
        origin = environment.origin
        do {
            let saved = try selectionStore.load()
            favoriteIDs = Set(saved.favorites.map(\.id))
            shoppingIDs = Set(saved.shopping.map(\.id))
            savedProducts = Dictionary((saved.shopping + saved.favorites).map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        } catch {
            selectionError = "Gespeicherte Listen konnten nicht gelesen werden. Die Daten bleiben auf diesem Gerät erhalten."
        }
    }

    var shoppingProducts: [GroceryProduct] { selectedProducts(ids: shoppingIDs) }
    var favoriteProducts: [GroceryProduct] { selectedProducts(ids: favoriteIDs) }
    var basketEstimates: [BasketEstimate] { BasketEstimate.calculate(products: shoppingProducts) }

    private func selectedProducts(ids: Set<String>) -> [GroceryProduct] {
        let current = Dictionary(products.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        return ids.compactMap { current[$0] ?? savedProducts[$0] }.sorted {
            let order = $0.name.localizedStandardCompare($1.name)
            return order == .orderedSame ? $0.id < $1.id : order == .orderedAscending
        }
    }

    private func persistSelections() {
        do {
            try selectionStore.save(LocalSelections(shopping: shoppingProducts, favorites: favoriteProducts))
            selectionError = nil
        } catch {
            selectionError = "Die Liste konnte nicht gespeichert werden. Bitte versuche es erneut."
        }
    }

    private func updateSearchResults() {
        let matches = searchIndex.products(matching: searchText)
        filteredProducts = filters == CatalogFilters() ? matches : filters.apply(to: matches)
    }

    var searchSuggestions: [GroceryProduct] {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return [] }
        return Array(filteredProducts.prefix(6))
    }

    var retailerOptions: [(id: String, name: String)] {
        let observations = products.flatMap(\.prices).sorted { $0.retailer < $1.retailer }
        let grouped = Dictionary(grouping: observations, by: \.normalizedRetailer)
        return grouped.keys.sorted().compactMap { key in
            grouped[key]?.first.map { (id: key, name: $0.retailer) }
        }
    }

    func rememberSearch() {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return }
        searchHistory.removeAll { $0.localizedCaseInsensitiveCompare(query) == .orderedSame }
        searchHistory.insert(query, at: 0)
        searchHistory = Array(searchHistory.prefix(10))
        defaults.set(searchHistory, forKey: "korbwert.searchHistory")
    }

    func clearSearchHistory() {
        searchHistory = []
        defaults.removeObject(forKey: "korbwert.searchHistory")
    }

    var offerProducts: [GroceryProduct] {
        products.filter { product in
            product.comparisonPrices().contains { $0.offerType == "sale" }
        }
    }

    var categories: [String] { Set(products.map(\.category)).sorted() }

    func imageURL(for category: String) -> URL? {
        products.first { $0.category == category && $0.imageURL != nil }?.imageURL
    }

    var lowestObservedProducts: [GroceryProduct] {
        let now = Date.now
        return products.compactMap { product -> (GroceryProduct, Decimal)? in
            guard let price = product.cheapestPrice(now: now)?.price else { return nil }
            return (product, price)
        }.sorted {
            $0.1 == $1.1 ? $0.0.id < $1.0.id : $0.1 < $1.1
        }.prefix(12).map { $0.0 }
    }

    func search(category: String) {
        searchText = category
        selectedTab = .search
    }

    func loadIfNeeded() async {
        guard products.isEmpty, !isLoading else { return }
        await reload()
    }

    func reload() async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let snapshot = try await environment.prices.loadCurrentPrices()
            try Task.checkCancellation()
            products = snapshot.products.sorted {
                let order = $0.name.localizedStandardCompare($1.name)
                return order == .orderedSame ? $0.id < $1.id : order == .orderedAscending
            }
            loadedAt = snapshot.loadedAt
            searchIndex = CatalogSearch(products: products)
            updateSearchResults()
            origin = snapshot.origin
            isTruncated = snapshot.truncated
            // Refresh saved selections with the last successfully loaded observations.
            if selectionError == nil && (!shoppingIDs.isEmpty || !favoriteIDs.isEmpty) {
                for product in shoppingProducts + favoriteProducts { savedProducts[product.id] = product }
                persistSelections()
            }
        } catch is CancellationError {
            return
        } catch {
            errorMessage = "Preise konnten gerade nicht geladen werden. Bitte versuche es erneut."
        }
    }

    func toggleFavorite(_ product: GroceryProduct) {
        savedProducts[product.id] = products.first { $0.id == product.id } ?? product
        if favoriteIDs.contains(product.id) {
            favoriteIDs.remove(product.id)
        } else {
            favoriteIDs.insert(product.id)
        }
        persistSelections()
    }

    func toggleShopping(_ product: GroceryProduct) {
        savedProducts[product.id] = products.first { $0.id == product.id } ?? product
        if shoppingIDs.contains(product.id) {
            shoppingIDs.remove(product.id)
        } else {
            shoppingIDs.insert(product.id)
        }
        persistSelections()
    }
}
