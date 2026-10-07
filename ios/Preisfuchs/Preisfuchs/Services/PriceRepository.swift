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
        guard let demoURL = Bundle.main.url(forResource: "DemoPrices", withExtension: "json"),
              let catalogURL = Bundle.main.url(forResource: "standard_products", withExtension: "json") else {
            throw CocoaError(.fileNoSuchFile)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let pricedProducts = try decoder.decode([GroceryProduct].self, from: Data(contentsOf: demoURL))
        let pricedProductsByID = Dictionary(uniqueKeysWithValues: pricedProducts.map { ($0.id, $0) })
        let catalog = try decoder.decode([CatalogProductSeed].self, from: Data(contentsOf: catalogURL))

        guard Set(catalog.map(\.id)).count == catalog.count else {
            throw CocoaError(.coderInvalidValue)
        }

        return catalog.map { seed in
            GroceryProduct(
                id: seed.id,
                name: seed.name,
                category: seed.category,
                packageSize: seed.packageSize,
                symbolName: symbolName(for: seed.category),
                prices: pricedProductsByID[seed.id]?.prices ?? []
            )
        }
    }

    private static func symbolName(for category: String) -> String {
        switch category {
        case "Molkerei": return "carton"
        case "Obst", "Gemüse", "Frische": return "leaf"
        case "Getränke": return "cup.and.saucer"
        default: return "basket"
        }
    }
}

private struct CatalogProductSeed: Decodable {
    let id: String
    let name: String
    let category: String
    let packageSize: String

    private enum CodingKeys: String, CodingKey {
        case id
        case name
        case category
        case packageSize = "package_size"
    }
}
