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
    var searchText = ""
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

    func loadIfNeeded() async {
        guard products.isEmpty, !isLoading else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let snapshot = try await environment.prices.loadCurrentPrices()
            products = snapshot.products.sorted {
                $0.name.localizedStandardCompare($1.name) == .orderedAscending
            }
            loadedAt = snapshot.loadedAt
            origin = snapshot.origin
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
