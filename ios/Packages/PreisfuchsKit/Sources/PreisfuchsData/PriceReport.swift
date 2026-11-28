import Foundation
import PreisfuchsDomain

public struct ReportStore: Decodable, Identifiable, Equatable, Sendable {
    public let id: UUID
    public let name: String
    public let street: String?
    public let postcode: String?
    public let city: String?
    public let isActive: Bool

    enum CodingKeys: String, CodingKey {
        case id, name, street, postcode, city
        case isActive = "is_active"
    }

    public var label: String {
        [name, street, [postcode, city].compactMap { $0 }.joined(separator: " ")]
            .compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
    }
}

public enum PriceReportValidation {
    public static func isValidGTIN(_ value: String) -> Bool {
        let digits = Array(value.utf8)
        guard digits.count == 13, digits.allSatisfy({ (48...57).contains($0) }),
              digits.contains(where: { $0 != 48 }) else { return false }
        let sum = digits.prefix(12).enumerated().reduce(0) { sum, item in
            sum + Int(item.element - 48) * (item.offset.isMultiple(of: 2) ? 1 : 3)
        }
        return (10 - sum % 10) % 10 == Int(digits[12] - 48)
    }

    /// Decimal input only: no grouping, exponents, signs or fractional cents.
    public static func price(_ input: String) -> Decimal? {
        let value = input.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: ",", with: ".")
        let parts = value.split(separator: ".", omittingEmptySubsequences: false)
        guard (1...2).contains(parts.count), (1...3).contains(parts[0].utf8.count),
              parts.allSatisfy({ !$0.isEmpty && $0.utf8.allSatisfy { (48...57).contains($0) } }),
              parts.count == 1 || (1...2).contains(parts[1].utf8.count),
              let price = Decimal(string: value, locale: Locale(identifier: "en_US_POSIX")),
              price >= Decimal(string: "0.01")!, price < 200 else { return nil }
        return price
    }

    public static func dateString(_ date: Date) -> String {
        let parts = Calendar.preisfuchs.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year!, parts.month!, parts.day!)
    }
}

public struct PriceReportPayload: Encodable, Equatable, Sendable {
    public let gtin: String
    public let storeID: UUID
    public let price: Decimal
    public let isOffer: Bool
    public let validUntil: String?
    public let observedOn: String

    public init(gtin: String, storeID: UUID, price: Decimal, isOffer: Bool,
                validUntil: String?, observedOn: String) throws {
        guard PriceReportValidation.isValidGTIN(gtin) else { throw PriceReportFailure.invalidField("gtin") }
        var original = price
        var rounded = Decimal()
        NSDecimalRound(&rounded, &original, 2, .plain)
        guard price >= Decimal(string: "0.01")!, price < 200, rounded == price else {
            throw PriceReportFailure.invalidField("price")
        }
        guard let observed = LocalDate(string: observedOn), observed.description == observedOn else {
            throw PriceReportFailure.invalidField("observed_on")
        }
        if let validUntil {
            guard isOffer, let end = LocalDate(string: validUntil), end.description == validUntil, end >= observed else {
                throw PriceReportFailure.invalidField("valid_until")
            }
        }
        self.gtin = gtin
        self.storeID = storeID
        self.price = price
        self.isOffer = isOffer
        self.validUntil = validUntil
        self.observedOn = observedOn
    }

    enum CodingKeys: String, CodingKey {
        case gtin, price
        case storeID = "store_id", isOffer = "is_offer", validUntil = "valid_until", observedOn = "observed_on"
    }

    public func encode(to encoder: Encoder) throws {
        var values = encoder.container(keyedBy: CodingKeys.self)
        try values.encode(gtin, forKey: .gtin)
        try values.encode(storeID, forKey: .storeID)
        try values.encode(price, forKey: .price)
        try values.encode(isOffer, forKey: .isOffer)
        try values.encode(validUntil, forKey: .validUntil)
        try values.encode(observedOn, forKey: .observedOn)
    }
}

public struct PriceReportReceipt: Decodable, Equatable, Sendable {
    public let id: UUID
    public let status: String
    public let isVerified: Bool
    public let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, status
        case isVerified = "is_verified", createdAt = "created_at"
    }
}

public protocol PriceReportServicing: Sendable {
    func loadActiveStores() async throws -> [ReportStore]
    func submit(_ payload: PriceReportPayload) async throws -> PriceReportReceipt
}

public enum PriceReportFailure: Error, Equatable, Sendable {
    case loginRequired, unknownProduct, duplicate, network, server, unavailable
    case invalidField(String)
    case rateLimited(Int)

    public var userMessage: String {
        switch self {
        case .loginRequired: "Bitte melde dich mit deinem E-Mail-Code an. Deine Sitzung kann abgelaufen sein."
        case .unknownProduct: "Dieses Produkt ist noch nicht im Katalog. Prüfe den Barcode; eine Meldung ist dafür noch nicht möglich."
        case .duplicate: "Diese Meldung für Produkt, Filiale, Preis und Tag liegt bereits vor."
        case .network: "Keine Verbindung. Prüfe dein Internet und versuche es erneut."
        case .server: "Die Meldung konnte nicht bestätigt werden. Bitte versuche es später erneut."
        case .unavailable: "Preis melden ist im Demo-Modus nicht verfügbar."
        case .rateLimited(let seconds): "Zu viele Meldungen. Bitte warte mindestens \(max(1, Int(ceil(Double(seconds) / 60)))) Minute(n)."
        case .invalidField(let field):
            switch field {
            case "gtin": "Bitte gib genau 13 Ziffern mit gültiger GTIN-Prüfziffer ein."
            case "store_id": "Bitte wähle eine verfügbare aktive Filiale. Lade die Filialen bei Bedarf erneut."
            case "price": "Bitte gib einen Preis von 0,01 bis unter 200 Euro mit höchstens zwei Nachkommastellen ein."
            case "valid_until": "Bitte prüfe das Gültigkeitsdatum. Es darf nicht vor dem Beobachtungstag liegen."
            case "observed_on": "Der Beobachtungstag ist ungültig. Öffne das Sheet erneut."
            default: "Bitte prüfe deine Angaben und versuche es erneut."
            }
        }
    }
}
