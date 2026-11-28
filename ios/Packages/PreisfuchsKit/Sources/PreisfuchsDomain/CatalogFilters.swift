import Foundation

public enum CatalogSort: String, CaseIterable, Sendable {
    case name = "Name", price = "Preis", unitPrice = "Grundpreis"
}

public struct CatalogFilters: Equatable, Sendable {
    public var retailers: Set<String> = []
    public var sort: CatalogSort = .name
    public var organicOnly = false
    public var privateLabelOnly = false
    public var offersOnly = false

    public init() {}

    public func apply(to products: [GroceryProduct], now: Date = .now) -> [GroceryProduct] {
        let candidates = products.compactMap { product -> GroceryProduct? in
            let words = "\(product.name) \(product.brandName ?? "")".lowercased().split { !$0.isLetter }
            if organicOnly && !words.contains("bio") { return nil }
            if privateLabelOnly && product.brandType != "private_label" { return nil }
            let prices = product.comparisonPrices(now: now).filter {
                (retailers.isEmpty || retailers.contains($0.normalizedRetailer))
                    && (!offersOnly || $0.offerType == "sale")
            }
            if (!retailers.isEmpty || offersOnly) && prices.isEmpty { return nil }
            return product.replacingPrices(prices)
        }
        return candidates.sorted { left, right in
            switch sort {
            case .name: break
            case .price:
                let a = left.cheapestPrice(now: now)?.price
                let b = right.cheapestPrice(now: now)?.price
                if a != b { return Self.less(a, b) }
            case .unitPrice:
                let a = Self.unitObservation(left, now: now)
                let b = Self.unitObservation(right, now: now)
                // Unlike units are grouped, never treated as comparable quantities.
                if a?.unit != b?.unit { return (a?.unit ?? "~") < (b?.unit ?? "~") }
                if a?.unitPrice != b?.unitPrice { return Self.less(a?.unitPrice, b?.unitPrice) }
            }
            let order = left.name.localizedStandardCompare(right.name)
            return order == .orderedSame ? left.id < right.id : order == .orderedAscending
        }
    }

    private static func less(_ a: Decimal?, _ b: Decimal?) -> Bool {
        guard let a else { return false }
        guard let b else { return true }
        return a < b
    }

    private static func unitObservation(_ product: GroceryProduct, now: Date) -> PriceObservation? {
        product.comparisonPrices(now: now).filter { $0.unitPrice != nil && $0.unit != nil }.sorted {
            if $0.unit != $1.unit { return ($0.unit ?? "") < ($1.unit ?? "") }
            if $0.unitPrice != $1.unitPrice { return less($0.unitPrice, $1.unitPrice) }
            return $0.id < $1.id
        }.first
    }
}

public extension GroceryProduct {
    func replacingPrices(_ prices: [PriceObservation]) -> GroceryProduct {
        GroceryProduct(id: id, name: name, category: category, packageSize: packageSize,
                       symbolName: symbolName, prices: prices, imageURL: imageURL,
                       imageSourceURL: imageSourceURL, imageLicense: imageLicense,
                       imageAttribution: imageAttribution, brandName: brandName, brandType: brandType)
    }
}
