import Foundation

public enum LoginInput {
    public static func normalizedEmail(_ email: String) -> String? {
        let normalized = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalized.isEmpty, !normalized.contains(where: \.isWhitespace) else { return nil }
        let parts = normalized.split(separator: "@", omittingEmptySubsequences: false)
        guard parts.count == 2,
              !parts[0].isEmpty,
              parts[1].contains("."),
              !parts[1].hasPrefix("."),
              !parts[1].hasSuffix(".")
        else { return nil }
        return normalized
    }

    /// Supabase email OTPs must contain exactly six ASCII digits.
    public static func isValidCode(_ code: String) -> Bool {
        let digits = code.utf8
        return digits.count == 6 && digits.allSatisfy { (48...57).contains($0) }
    }
}
