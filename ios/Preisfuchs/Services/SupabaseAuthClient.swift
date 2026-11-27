import Foundation
import PreisfuchsData
import Supabase

struct SupabaseAuthClient: PreisfuchsData.AuthClient {
    let client: SupabaseClient

    func sendEmailCode(to email: String) async throws {
        guard let normalizedEmail = LoginInput.normalizedEmail(email) else {
            throw AuthFailure.unknown("Ungültige E-Mail-Adresse")
        }
        do {
            try await client.auth.signInWithOTP(email: normalizedEmail, shouldCreateUser: true)
        } catch {
            throw map(error)
        }
    }

    func verifyEmailCode(email: String, code: String) async throws -> PreisfuchsData.AuthUser {
        guard let normalizedEmail = LoginInput.normalizedEmail(email), LoginInput.isValidCode(code) else {
            throw AuthFailure.invalidCode
        }
        let response: AuthResponse
        do {
            response = try await client.auth.verifyOTP(email: normalizedEmail, token: code, type: .email)
        } catch {
            throw map(error)
        }
        guard let user = response.session?.user else {
            throw AuthFailure.unknown("Für dieses Konto ist noch eine Bestätigung nötig")
        }
        return PreisfuchsData.AuthUser(id: user.id, email: user.email)
    }

    func signOut() async throws {
        do {
            try await client.auth.signOut(scope: .local)
        } catch {
            throw map(error)
        }
    }

    func authStateStream() -> AsyncStream<PreisfuchsData.AuthUser?> {
        let changes = client.auth.authStateChanges
        return AsyncStream { continuation in
            let task = Task {
                for await (_, session) in changes {
                    let user = session.map { PreisfuchsData.AuthUser(id: $0.user.id, email: $0.user.email) }
                    continuation.yield(user)
                }
            }
            continuation.onTermination = { @Sendable _ in task.cancel() }
        }
    }

    private func map(_ error: Error) -> AuthFailure {
        guard let authError = error as? AuthError else {
            return error is URLError ? .network : .unknown("Supabase-Anmeldung fehlgeschlagen")
        }
        if authError.errorCode == .otpExpired { return .expired }
        if authError.errorCode == .overRequestRateLimit || authError.errorCode == .overEmailSendRateLimit {
            return .rateLimited
        }
        if authError.errorCode == .validationFailed { return .invalidCode }
        return .unknown("Supabase-Anmeldung fehlgeschlagen")
    }
}
