import Foundation

struct GroceryProduct: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let category: String
    let packageSize: String
    let symbolName: String
    let prices: [PriceObservation]

    var cheapestPrice: PriceObservation? {
        prices.min { $0.price < $1.price }
    }
}

struct PriceObservation: Identifiable, Codable, Hashable {
    let id: String
    let retailer: String
    let storeLocation: String
    let price: Decimal
    let unitPrice: Decimal?
    let unit: String?
    let observedAt: Date
    let source: String
    let sourceDetail: String
    let confidence: Double

    var formattedPrice: String {
        Self.currencyFormatter.string(from: price as NSDecimalNumber) ?? "\(price) EUR"
    }

    var formattedUnitPrice: String? {
        guard let unitPrice, let unit else { return nil }
        let value = Self.currencyFormatter.string(from: unitPrice as NSDecimalNumber) ?? "\(unitPrice) EUR"
        return "\(value) / \(unit)"
    }

    var freshnessText: String {
        let days = Calendar.current.dateComponents([.day], from: observedAt, to: Date()).day ?? 0
        if days <= 0 { return "heute aktualisiert" }
        if days == 1 { return "gestern aktualisiert" }
        return "vor \(days) Tagen aktualisiert"
    }

    private static let currencyFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "de_DE")
        return formatter
    }()
}

struct ShoppingListItem: Identifiable, Hashable {
    let id: String
    let productName: String
    var isSelected: Bool
}
