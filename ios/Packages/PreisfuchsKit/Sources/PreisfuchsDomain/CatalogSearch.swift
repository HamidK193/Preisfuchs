import Foundation

/// Built once per catalog load. Querying does no networking or repeated normalization.
public struct CatalogSearch: Sendable {
    private let entries: [(product: GroceryProduct, text: String)]

    public init(products: [GroceryProduct]) {
        entries = products.map { ($0, Self.normalized("\($0.name) \($0.brandName ?? "") \($0.category) \($0.packageSize)")) }
    }

    public func products(matching query: String) -> [GroceryProduct] {
        let terms = Self.normalized(query).split(separator: " ")
        guard !terms.isEmpty else { return entries.map(\.product) }
        return entries.filter { entry in terms.allSatisfy { entry.text.contains($0) } }.map(\.product)
    }

    public func suggestions(for query: String, limit: Int = 6) -> [GroceryProduct] {
        let terms = Self.normalized(query).split(separator: " ")
        guard !terms.isEmpty, limit > 0 else { return [] }
        var result: [GroceryProduct] = []
        for entry in entries where terms.allSatisfy({ entry.text.contains($0) }) {
            result.append(entry.product)
            if result.count == limit { break }
        }
        return result
    }

    private static func normalized(_ value: String) -> String {
        value.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "de_DE"))
            .lowercased().split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }
}
