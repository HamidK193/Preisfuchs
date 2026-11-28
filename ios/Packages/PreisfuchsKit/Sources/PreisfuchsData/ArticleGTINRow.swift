import Foundation

/// A fallback for observations whose comparison key does not contain an EAN.
public struct ArticleGTINRow: Decodable, Sendable {
    public let id: UUID
    public let gtin: String?
}
