import Foundation
import PreisfuchsDomain

public enum PriceDataError: Error, Equatable {
    case demoDataMissing
    case duplicateProductIDs
}

/// Bundled observations are illustrative and must always be labelled as demo data in the UI.
public struct DemoPriceService: PriceServicing {
    public init() {}

    public func loadProducts() throws -> [GroceryProduct] {
        guard let url = Bundle.module.url(forResource: "DemoPrices", withExtension: "json") else {
            throw PriceDataError.demoDataMissing
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let products = try decoder.decode([GroceryProduct].self, from: Data(contentsOf: url))
        guard Set(products.map(\.id)).count == products.count else {
            throw PriceDataError.duplicateProductIDs
        }
        return products
    }

    public func loadCurrentPrices() async throws -> PriceSnapshot {
        PriceSnapshot(products: try loadProducts(), loadedAt: .now, truncated: false, origin: .demo)
    }
}
