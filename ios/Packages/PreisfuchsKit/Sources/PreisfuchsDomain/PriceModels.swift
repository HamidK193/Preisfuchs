import Foundation

public enum PricingRules {
    public static let staleAfterDays = 30
}

public struct LocalDate: Codable, Hashable, Comparable, Sendable, CustomStringConvertible {
    public let year: Int
    public let month: Int
    public let day: Int

    public init?(string: String) {
        let prefix = String(string.prefix(10))
        let parts = prefix.split(separator: "-", omittingEmptySubsequences: false)
        guard parts.count == 3,
              parts[0].count == 4,
              parts[1].count == 2,
              parts[2].count == 2,
              let year = Int(parts[0]),
              let month = Int(parts[1]),
              let day = Int(parts[2])
        else { return nil }

        var components = DateComponents()
        components.calendar = Calendar(identifier: .gregorian)
        components.timeZone = TimeZone(secondsFromGMT: 0)
        components.year = year
        components.month = month
        components.day = day
        guard let date = components.calendar?.date(from: components) else { return nil }
        let verified = components.calendar?.dateComponents([.year, .month, .day], from: date)
        guard verified?.year == year, verified?.month == month, verified?.day == day else { return nil }

        self.year = year
        self.month = month
        self.day = day
    }

    public var description: String {
        String(format: "%04d-%02d-%02d", year, month, day)
    }

    public static func < (lhs: LocalDate, rhs: LocalDate) -> Bool {
        if lhs.year != rhs.year { return lhs.year < rhs.year }
        if lhs.month != rhs.month { return lhs.month < rhs.month }
        return lhs.day < rhs.day
    }

    public func startOfDay(in calendar: Calendar = .preisfuchs) -> Date {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        return calendar.date(from: components) ?? .distantPast
    }

    public func nextDayStart(in calendar: Calendar = .preisfuchs) -> Date? {
        calendar.date(byAdding: .day, value: 1, to: startOfDay(in: calendar))
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let value = try container.decode(String.self)
        guard let parsed = LocalDate(string: value) else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid ISO calendar date: \(value)")
        }
        self = parsed
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(description)
    }
}

public struct GroceryProduct: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let category: String
    public let packageSize: String
    public let symbolName: String
    public let prices: [PriceObservation]

    public init(
        id: String,
        name: String,
        category: String,
        packageSize: String,
        symbolName: String,
        prices: [PriceObservation]
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.packageSize = packageSize
        self.symbolName = symbolName
        self.prices = prices
    }

    public func cheapestPrice(
        includeAppDiscounts: Bool = false,
        includePersonalizedDiscounts: Bool = false,
        now: Date = .now
    ) -> PriceObservation? {
        comparisonPrices(
            includeAppDiscounts: includeAppDiscounts,
            includePersonalizedDiscounts: includePersonalizedDiscounts,
            now: now
        ).first
    }

    public func comparisonPrices(
        includeAppDiscounts: Bool = false,
        includePersonalizedDiscounts: Bool = false,
        now: Date = .now
    ) -> [PriceObservation] {
        let eligible = prices.filter { price in
            price.isActive(at: now)
                && (includeAppDiscounts || !price.isAppDiscount)
                && (includePersonalizedDiscounts || price.personalized != true)
        }

        let latestByCondition = eligible.reduce(into: [String: PriceObservation]()) { result, candidate in
            let key = "\(candidate.normalizedRetailer):\(candidate.priceConditionKey)"
            guard let current = result[key] else {
                result[key] = candidate
                return
            }
            if candidate.observedAt > current.observedAt
                || (candidate.observedAt == current.observedAt && candidate.price < current.price) {
                result[key] = candidate
            }
        }

        let bestByRetailer = latestByCondition.values.reduce(into: [String: PriceObservation]()) { result, candidate in
            let key = candidate.normalizedRetailer
            guard let current = result[key] else {
                result[key] = candidate
                return
            }
            if candidate.price < current.price
                || (candidate.price == current.price && candidate.priceRestrictionRank < current.priceRestrictionRank) {
                result[key] = candidate
            }
        }

        return bestByRetailer.values.sorted { left, right in
            if left.price != right.price { return left.price < right.price }
            if left.priceRestrictionRank != right.priceRestrictionRank {
                return left.priceRestrictionRank < right.priceRestrictionRank
            }
            return left.normalizedRetailer < right.normalizedRetailer
        }
    }
}

public struct PriceObservation: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let retailer: String
    public let storeLocation: String
    public let price: Decimal
    public let unitPrice: Decimal?
    public let unit: String?
    public let observedAt: Date
    public let source: String
    public let sourceDetail: String
    public let confidence: Double
    public let offerType: String?
    public let requiresApp: Bool?
    public let appName: String?
    public let couponActivationRequired: Bool?
    public let personalized: Bool?
    public let regularPrice: Decimal?
    public let validFrom: LocalDate?
    public let validUntil: LocalDate?
    public let discountDescription: String?

    public init(
        id: String,
        retailer: String,
        storeLocation: String,
        price: Decimal,
        unitPrice: Decimal? = nil,
        unit: String? = nil,
        observedAt: Date,
        source: String,
        sourceDetail: String,
        confidence: Double,
        offerType: String? = nil,
        requiresApp: Bool? = nil,
        appName: String? = nil,
        couponActivationRequired: Bool? = nil,
        personalized: Bool? = nil,
        regularPrice: Decimal? = nil,
        validFrom: LocalDate? = nil,
        validUntil: LocalDate? = nil,
        discountDescription: String? = nil
    ) {
        self.id = id
        self.retailer = retailer
        self.storeLocation = storeLocation
        self.price = price
        self.unitPrice = unitPrice
        self.unit = unit
        self.observedAt = observedAt
        self.source = source
        self.sourceDetail = sourceDetail
        self.confidence = confidence
        self.offerType = offerType
        self.requiresApp = requiresApp
        self.appName = appName
        self.couponActivationRequired = couponActivationRequired
        self.personalized = personalized
        self.regularPrice = regularPrice
        self.validFrom = validFrom
        self.validUntil = validUntil
        self.discountDescription = discountDescription
    }

    public var isAppDiscount: Bool {
        requiresApp == true || offerType == "app_discount"
    }

    public var priceConditionKey: String {
        if personalized == true { return "personalized-app" }
        if isAppDiscount { return "public-app" }
        return "public"
    }

    public var priceRestrictionRank: Int {
        if personalized == true { return 2 }
        if isAppDiscount { return 1 }
        return 0
    }

    public var appRequirementText: String? {
        guard isAppDiscount else { return nil }
        let personalization = personalized == true ? " · personalisiert" : ""
        return "Nur mit \(appName ?? "Händler-App")\(personalization)"
    }

    public var normalizedRetailer: String {
        let normalized = retailer
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "de_DE"))
            .lowercased()
            .replacingOccurrences(of: "-", with: " ")
        if normalized.contains("aldi") {
            return normalized.contains("nord") ? "aldi nord" : "aldi sued"
        }
        if normalized.contains("lidl") { return "lidl" }
        if normalized.contains("rewe") { return "rewe" }
        if normalized.contains("edeka") || normalized.contains("e center") { return "edeka" }
        if normalized.contains("kaufland") { return "kaufland" }
        if normalized.contains("penny") { return "penny" }
        if normalized.contains("netto") { return "netto" }
        if normalized.contains("norma") { return "norma" }
        return normalized
    }

    public func isActive(at date: Date, calendar: Calendar = .preisfuchs) -> Bool {
        if let validFrom, validFrom.startOfDay(in: calendar) > date { return false }
        if let validUntil,
           let nextDay = validUntil.nextDayStart(in: calendar),
           nextDay <= date {
            return false
        }
        return true
    }

    public func isStale(at date: Date, maxAgeDays: Int = PricingRules.staleAfterDays) -> Bool {
        date.timeIntervalSince(observedAt) > Double(maxAgeDays) * 24 * 60 * 60
    }
}

public extension Calendar {
    static var preisfuchs: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "de_DE")
        calendar.timeZone = TimeZone(identifier: "Europe/Berlin") ?? .current
        return calendar
    }
}

public enum PriceFormatting {
    private static let locale = Locale(identifier: "de_DE")

    public static func euro(_ value: Decimal) -> String {
        value.formatted(.currency(code: "EUR").locale(locale))
    }

    public static func unitPrice(_ value: Decimal, unit: String) -> String {
        "\(euro(value)) / \(unit)"
    }

    public static func date(_ value: Date) -> String {
        value.formatted(
            .dateTime
                .day(.twoDigits)
                .month(.twoDigits)
                .year()
                .locale(locale)
                .timeZone(Calendar.preisfuchs.timeZone)
        )
    }

    public static func freshnessText(observedAt: Date, now: Date, calendar: Calendar = .preisfuchs) -> String {
        let observedDay = calendar.startOfDay(for: observedAt)
        let currentDay = calendar.startOfDay(for: now)
        let days = calendar.dateComponents([.day], from: observedDay, to: currentDay).day ?? 0
        if days <= 0 { return "heute beobachtet" }
        if days == 1 { return "gestern beobachtet" }
        if days > PricingRules.staleAfterDays {
            return "vor \(days) Tagen beobachtet · möglicherweise veraltet"
        }
        return "vor \(days) Tagen beobachtet"
    }

    public static func validityText(_ value: LocalDate?) -> String? {
        guard let value else { return nil }
        return "gültig bis \(value.description)"
    }
}
