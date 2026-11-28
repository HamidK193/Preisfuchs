import Foundation
import Observation
import PreisfuchsData
import PreisfuchsDomain

@MainActor
@Observable
final class PriceListModel {
    private let environment: AppEnvironment
    private(set) var products: [GroceryProduct] = []
    private(set) var origin: DataOrigin
    private(set) var loadedAt: Date?
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var isTruncated = false
    var searchText = ""
    var selectedTab = AppTab.home
    var selectedProduct: GroceryProduct?
    var favoriteIDs: Set<String> = []
    var shoppingIDs: Set<String> = []

    init(environment: AppEnvironment) {
        self.environment = environment
        origin = environment.origin
    }

    var filteredProducts: [GroceryProduct] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return products }
        return products.filter {
            $0.name.localizedCaseInsensitiveContains(query)
                || $0.category.localizedCaseInsensitiveContains(query)
                || $0.packageSize.localizedCaseInsensitiveContains(query)
        }
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
                $0.name.localizedStandardCompare($1.name) == .orderedAscending
            }
            loadedAt = snapshot.loadedAt
            origin = snapshot.origin
            isTruncated = snapshot.truncated
        } catch is CancellationError {
            return
        } catch {
            errorMessage = "Preise konnten gerade nicht geladen werden. Bitte versuche es erneut."
        }
    }

    func toggleFavorite(_ product: GroceryProduct) {
        if favoriteIDs.contains(product.id) {
            favoriteIDs.remove(product.id)
        } else {
            favoriteIDs.insert(product.id)
        }
    }

    func toggleShopping(_ product: GroceryProduct) {
        if shoppingIDs.contains(product.id) {
            shoppingIDs.remove(product.id)
        } else {
            shoppingIDs.insert(product.id)
        }
    }
}
