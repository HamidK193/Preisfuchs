import Foundation

struct GroceryProduct: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let category: String
    let packageSize: String
    let symbolName: String
    let prices: [PriceObservation]

    var cheapestPrice: PriceObservation? {
        cheapestPrice(includeAppDiscounts: false, includePersonalizedDiscounts: false)
    }

    func cheapestPrice(
        includeAppDiscounts: Bool,
        includePersonalizedDiscounts: Bool = false,
        now: Date = Date()
    ) -> PriceObservation? {
        comparisonPrices(
            includeAppDiscounts: includeAppDiscounts,
            includePersonalizedDiscounts: includePersonalizedDiscounts,
            now: now
        ).first
    }

    func comparisonPrices(
        includeAppDiscounts: Bool,
        includePersonalizedDiscounts: Bool,
        now: Date = Date()
    ) -> [PriceObservation] {
        let eligiblePrices = prices.filter { price in
            price.isActive(at: now)
            && (includeAppDiscounts || !price.isAppDiscount)
            && (includePersonalizedDiscounts || price.personalized != true)
        }

        let latestByCondition = eligiblePrices.reduce(into: [String: PriceObservation]()) { result, candidate in
            let conditionKey = "\(candidate.normalizedRetailer):\(candidate.priceConditionKey)"
            guard let current = result[conditionKey] else {
                result[conditionKey] = candidate
                return
            }
            if candidate.observedAt > current.observedAt
                || (candidate.observedAt == current.observedAt && candidate.price < current.price) {
                result[conditionKey] = candidate
            }
        }

        let bestByRetailer = latestByCondition.values.reduce(into: [String: PriceObservation]()) { result, candidate in
            let retailerKey = candidate.normalizedRetailer
            guard let current = result[retailerKey] else {
                result[retailerKey] = candidate
                return
            }
            if candidate.price < current.price
                || (candidate.price == current.price && candidate.priceRestrictionRank < current.priceRestrictionRank) {
                result[retailerKey] = candidate
            }
        }

        return bestByRetailer.values.sorted { left, right in
            left.price == right.price
                ? left.priceRestrictionRank < right.priceRestrictionRank
                : left.price < right.price
        }
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
    let offerType: String?
    let requiresApp: Bool?
    let appName: String?
    let couponActivationRequired: Bool?
    let personalized: Bool?
    let regularPrice: Decimal?
    let validFrom: Date?
    let validUntil: Date?
    let discountDescription: String?

    var isAppDiscount: Bool {
        requiresApp == true || offerType == "app_discount"
    }

    var priceConditionKey: String {
        if personalized == true { return "personalized-app" }
        if isAppDiscount { return "public-app" }
        return "public"
    }

    var priceRestrictionRank: Int {
        if personalized == true { return 2 }
        if isAppDiscount { return 1 }
        return 0
    }

    var appRequirementText: String? {
        guard isAppDiscount else { return nil }
        let personalization = personalized == true ? " · personalisiert" : ""
        return "Nur mit \(appName ?? "Händler-App")\(personalization)"
    }

    var normalizedRetailer: String {
        let normalized = retailer
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "de_DE"))
            .lowercased()
        if normalized.contains("aldi") { return "aldi sued" }
        if normalized.contains("lidl") { return "lidl" }
        if normalized.contains("rewe") { return "rewe" }
        if normalized.contains("edeka") || normalized.contains("e center") { return "edeka" }
        if normalized.contains("kaufland") { return "kaufland" }
        return normalized
    }

    func isActive(at date: Date = Date()) -> Bool {
        let calendar = Calendar.current
        if let validFrom, calendar.startOfDay(for: validFrom) > date {
            return false
        }
        if let validUntil,
           let endOfDay = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: calendar.startOfDay(for: validUntil)),
           endOfDay < date {
            return false
        }
        return true
    }

    func isStale(at date: Date = Date(), maxAgeDays: Int = 14) -> Bool {
        date.timeIntervalSince(observedAt) > Double(maxAgeDays) * 24 * 60 * 60
    }

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
        if days <= 0 { return "heute beobachtet" }
        if days == 1 { return "gestern beobachtet" }
        if days > 14 { return "vor \(days) Tagen beobachtet · möglicherweise veraltet" }
        return "vor \(days) Tagen beobachtet"
    }

    var observedDateText: String {
        "beobachtet am \(Self.dateFormatter.string(from: observedAt))"
    }

    var validityText: String? {
        guard let validUntil else { return nil }
        return "gültig bis \(Self.dateFormatter.string(from: validUntil))"
    }

    private static let currencyFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.locale = Locale(identifier: "de_DE")
        return formatter
    }()

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()
}

struct ShoppingListItem: Identifiable, Hashable {
    let id: String
    let productName: String
    var isSelected: Bool
}
