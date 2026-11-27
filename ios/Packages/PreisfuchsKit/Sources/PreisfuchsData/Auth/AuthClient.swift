import Foundation

public struct AuthUser: Sendable, Equatable {
    public let id: UUID
    public let email: String?

    public init(id: UUID, email: String?) {
        self.id = id
        self.email = email
    }
}

public protocol AuthClient: Sendable {
    func sendEmailCode(to email: String) async throws
    func verifyEmailCode(email: String, code: String) async throws -> AuthUser
    func signOut() async throws
    func authStateStream() -> AsyncStream<AuthUser?>
}

public enum AuthFailure: Error, Equatable, Sendable {
    case invalidCode
    case expired
    case rateLimited
    case network
    case unknown(String)

    public var userMessage: String {
        return switch self {
        case .invalidCode:
            "Der Code stimmt nicht. Prüfe die sechs Ziffern."
        case .expired:
            "Der Code ist abgelaufen. Fordere einen neuen an."
        case .rateLimited:
            "Zu viele Versuche. Bitte warte kurz."
        case .network:
            "Keine Verbindung. Prüfe deine Internetverbindung."
        case .unknown:
            "Anmeldung fehlgeschlagen. Bitte versuche es später erneut."
        }
    }
}
