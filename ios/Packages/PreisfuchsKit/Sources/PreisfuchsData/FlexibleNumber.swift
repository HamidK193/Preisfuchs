import Foundation

public struct FlexibleNumber: Codable, Hashable, Sendable {
    public let value: Decimal

    public init(value: Decimal) {
        self.value = value
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let number = try? container.decode(Decimal.self) {
            value = number
            return
        }

        if let string = try? container.decode(String.self) {
            let locale = Locale(identifier: "en_US_POSIX")
            if let decimal = Decimal(string: string, locale: locale) {
                value = decimal
                return
            }
            if let double = Double(string) {
                value = Decimal(double)
                return
            }
        }

        throw DecodingError.dataCorruptedError(in: container, debugDescription: "Expected a decimal number or numeric string")
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(value)
    }
}
