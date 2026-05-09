import Foundation

@MainActor
final class PriceRepository: ObservableObject {
    @Published private(set) var products: [GroceryProduct] = []
    @Published private(set) var loadingState: LoadingState = .idle

    enum LoadingState: Equatable {
        case idle
        case loading
        case loaded
        case failed(String)
    }

    func loadProducts() async {
        guard products.isEmpty else { return }
        loadingState = .loading

        do {
            products = try DemoPriceDataLoader.loadProducts()
            loadingState = .loaded
        } catch {
            loadingState = .failed("Demo-Daten konnten nicht geladen werden.")
        }
    }
}

enum DemoPriceDataLoader {
    static func loadProducts() throws -> [GroceryProduct] {
        guard let url = Bundle.main.url(forResource: "DemoPrices", withExtension: "json") else {
            throw CocoaError(.fileNoSuchFile)
        }

        let data = try Data(contentsOf: url)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode([GroceryProduct].self, from: data)
    }
}
