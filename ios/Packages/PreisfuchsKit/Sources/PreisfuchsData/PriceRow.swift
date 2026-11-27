import Foundation

public struct PackageInfo: Codable, Hashable, Sendable {
    public let unit: String?
    public let total: FlexibleNumber?
    public let original: String?

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        unit = try? container.decodeIfPresent(String.self, forKey: .unit)
        total = try? container.decodeIfPresent(FlexibleNumber.self, forKey: .total)
        original = try? container.decodeIfPresent(String.self, forKey: .original)
    }

    private enum CodingKeys: String, CodingKey {
        case unit
        case total
        case original
    }
}

public struct PriceRow: Codable, Identifiable, Hashable, Sendable {
    public static let selectColumns = [
        "id", "product_id", "article_id", "article_name", "brand_name", "brand_type", "package",
        "comparison_key", "product_type", "retailer_id", "retailer_name", "price", "regular_price", "offer_type",
        "requires_app", "app_name", "is_personalized", "observed_at", "valid_from", "valid_until",
        "unit_price", "unit", "coupon_activation_required", "discount_description", "confidence",
        "region", "source", "source_url", "source_license", "location_label", "store_id"
    ].joined(separator: ",")

    public let id: UUID
    public let productId: String
    public let articleId: UUID
    public let articleName: String?
    public let brandName: String?
    public let brandType: String?
    public let package: PackageInfo?
    public let comparisonKey: String?
    public let productType: String?
    public let retailerId: UUID?
    public let retailerName: String
    public let price: Decimal
    public let regularPrice: Decimal?
    public let offerType: String?
    public let requiresApp: Bool?
    public let appName: String?
    public let isPersonalized: Bool?
    public let observedAt: Date
    public let validFrom: LocalDate?
    public let validUntil: LocalDate?
    public let unitPrice: Decimal?
    public let unit: String?
    public let couponActivationRequired: Bool?
    public let discountDescription: String?
    public let confidence: Double?
    public let region: String?
    public let source: String?
    public let sourceUrl: String?
    public let sourceLicense: String?
    public let locationLabel: String?
    public let storeId: UUID?

    public var gtin: String? {
        if let comparisonKey, comparisonKey.hasPrefix("gtin:") {
            return String(comparisonKey.dropFirst("gtin:".count))
        }
        if productId.hasPrefix("gtin_") {
            return String(productId.dropFirst("gtin_".count))
        }
        return nil
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case productId
        case articleId
        case articleName
        case brandName
        case brandType
        case package
        case comparisonKey
        case productType
        case retailerId
        case retailerName
        case price
        case regularPrice
        case offerType
        case requiresApp
        case appName
        case isPersonalized
        case observedAt
        case validFrom
        case validUntil
        case unitPrice
        case unit
        case couponActivationRequired
        case discountDescription
        case confidence
        case region
        case source
        case sourceUrl
        case sourceLicense
        case locationLabel
        case storeId
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        productId = try container.decode(String.self, forKey: .productId)
        articleId = try container.decode(UUID.self, forKey: .articleId)
        articleName = try? container.decodeIfPresent(String.self, forKey: .articleName)
        brandName = try? container.decodeIfPresent(String.self, forKey: .brandName)
        brandType = try? container.decodeIfPresent(String.self, forKey: .brandType)
        package = try? container.decodeIfPresent(PackageInfo.self, forKey: .package)
        comparisonKey = try? container.decodeIfPresent(String.self, forKey: .comparisonKey)
        productType = try? container.decodeIfPresent(String.self, forKey: .productType)
        retailerId = try? container.decodeIfPresent(UUID.self, forKey: .retailerId)
        retailerName = try container.decode(String.self, forKey: .retailerName)
        price = try container.decode(FlexibleNumber.self, forKey: .price).value
        regularPrice = try? container.decodeIfPresent(FlexibleNumber.self, forKey: .regularPrice)?.value
        offerType = try? container.decodeIfPresent(String.self, forKey: .offerType)
        requiresApp = try? container.decodeIfPresent(Bool.self, forKey: .requiresApp)
        appName = try? container.decodeIfPresent(String.self, forKey: .appName)
        isPersonalized = try? container.decodeIfPresent(Bool.self, forKey: .isPersonalized)
        observedAt = try container.decode(Date.self, forKey: .observedAt)
        validFrom = try? container.decodeIfPresent(LocalDate.self, forKey: .validFrom)
        validUntil = try? container.decodeIfPresent(LocalDate.self, forKey: .validUntil)
        unitPrice = try? container.decodeIfPresent(FlexibleNumber.self, forKey: .unitPrice)?.value
        unit = try? container.decodeIfPresent(String.self, forKey: .unit)
        couponActivationRequired = try? container.decodeIfPresent(Bool.self, forKey: .couponActivationRequired)
        discountDescription = try? container.decodeIfPresent(String.self, forKey: .discountDescription)
        confidence = try? container.decodeIfPresent(FlexibleNumber.self, forKey: .confidence).map {
            NSDecimalNumber(decimal: $0.value).doubleValue
        }
        region = try? container.decodeIfPresent(String.self, forKey: .region)
        source = try? container.decodeIfPresent(String.self, forKey: .source)
        sourceUrl = try? container.decodeIfPresent(String.self, forKey: .sourceUrl)
        sourceLicense = try? container.decodeIfPresent(String.self, forKey: .sourceLicense)
        locationLabel = try? container.decodeIfPresent(String.self, forKey: .locationLabel)
        storeId = try? container.decodeIfPresent(UUID.self, forKey: .storeId)
    }
}
