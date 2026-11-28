import Foundation

public struct BasketEstimate: Identifiable, Sendable {
    public struct Line: Identifiable, Sendable {
        public let product: GroceryProduct
        public let observation: PriceObservation
        public var id: String { product.id }
    }

    public let id: String
    public let retailer: String
    public let lines: [Line]
    public let productCount: Int
    public var total: Decimal { lines.reduce(0) { $0 + $1.observation.price } }
    public var missingCount: Int { max(0, productCount - lines.count) }
    public var isComplete: Bool { missingCount == 0 }

    /// One package per selected product. Missing observations never count as zero-priced items.
    public static func calculate(products: [GroceryProduct], now: Date = .now) -> [BasketEstimate] {
        let unique = Dictionary(products.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
            .values.sorted { $0.id < $1.id }
        var markets: [String: [Line]] = [:]
        for product in unique {
            for observation in product.comparisonPrices(now: now) {
                markets[observation.normalizedRetailer, default: []].append(Line(product: product, observation: observation))
            }
        }
        return markets.compactMap { key, lines -> BasketEstimate? in
            guard let first = lines.first else { return nil }
            return BasketEstimate(id: key, retailer: first.observation.retailer, lines: lines, productCount: unique.count)
        }.sorted {
            if $0.isComplete != $1.isComplete { return $0.isComplete }
            if $0.total != $1.total { return $0.total < $1.total }
            return $0.id < $1.id
        }
    }
}
