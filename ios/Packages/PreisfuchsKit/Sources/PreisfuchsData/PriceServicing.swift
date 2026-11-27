import Foundation
import PreisfuchsDomain

public enum DataOrigin: String, Codable, Hashable, Sendable {
    case live
    case cached
    case demo
}

public struct PriceSnapshot: Codable, Hashable, Sendable {
    public let products: [GroceryProduct]
    public let loadedAt: Date
    public let truncated: Bool
    public let origin: DataOrigin

    public init(products: [GroceryProduct], loadedAt: Date, truncated: Bool, origin: DataOrigin) {
        self.products = products
        self.loadedAt = loadedAt
        self.truncated = truncated
        self.origin = origin
    }
}

public protocol PriceServicing: Sendable {
    func loadCurrentPrices() async throws -> PriceSnapshot
}
