import Foundation

public struct AppConfig: Sendable, Equatable {
    public let supabaseURL: URL
    public let anonKey: String

    public init?(info: [String: Any]) {
        guard let host = info["PFSupabaseHost"] as? String,
              let anonKey = info["PFSupabaseAnonKey"] as? String
        else { return nil }

        let cleanHost = host.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanKey = anonKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanHost.isEmpty,
              !cleanKey.isEmpty,
              !cleanHost.localizedCaseInsensitiveContains("your-"),
              !cleanKey.localizedCaseInsensitiveContains("your-"),
              !cleanHost.contains("$("),
              !cleanKey.contains("$("),
              let components = URLComponents(string: "https://\(cleanHost)"),
              let url = components.url,
              url.scheme == "https",
              url.host == cleanHost,
              components.path.isEmpty || components.path == "/",
              components.query == nil,
              components.fragment == nil
        else { return nil }

        self.supabaseURL = url
        self.anonKey = cleanKey
    }
}
