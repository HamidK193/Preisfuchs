import Foundation

public struct LocationPreference: Equatable, Sendable {
    public static let postalCodeKey = "korbwert.location.postalCode"
    public static let radiusKey = "korbwert.location.radiusKM"
    public let postalCode: String
    public let radiusKM: Double

    public init?(postalCode: String, radiusKM: Double) {
        guard Self.isValidPostalCode(postalCode), radiusKM.isFinite, (1...100).contains(radiusKM) else { return nil }
        self.postalCode = postalCode
        self.radiusKM = radiusKM
    }

    public static func isValidPostalCode(_ value: String) -> Bool {
        value.utf8.count == 5 && value.utf8.allSatisfy { (48...57).contains($0) }
    }
}
