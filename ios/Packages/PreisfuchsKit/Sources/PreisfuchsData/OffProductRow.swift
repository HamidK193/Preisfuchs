import Foundation

/// Decode with PriceDecoding.makeDecoder() (snake_case REST keys).
public struct OffProductRow: Decodable, Sendable {
    public static let baseColumns = "gtin,image_url,image_license,image_attribution,source_url"
    public static let selectColumns = baseColumns + ",image_thumb_url"

    public let gtin: String
    public let imageUrl: String?
    public let imageThumbUrl: String?
    public let sourceUrl: String?
    public let imageLicense: String?
    public let imageAttribution: String?

    public var preferredImageURL: URL? {
        Self.webURL(imageThumbUrl) ?? Self.webURL(imageUrl)
    }

    public var sourceURL: URL? { Self.webURL(sourceUrl) }

    private static func webURL(_ value: String?) -> URL? {
        guard let value,
              let url = URL(string: value.trimmingCharacters(in: .whitespacesAndNewlines)),
              url.scheme?.lowercased() == "https",
              let host = url.host, !host.isEmpty else { return nil }
        return url
    }
}
