import Foundation
import Observation
import PreisfuchsData

@MainActor
@Observable
final class AccountModel {
    private let auth: (any AuthClient)?
    private(set) var user: AuthUser?
    private(set) var isWorking = false
    private(set) var message: String?
    var isAvailable: Bool { auth != nil }

    init(auth: (any AuthClient)?) { self.auth = auth }

    func observe() async {
        guard let auth else { return }
        for await user in auth.authStateStream() {
            guard !Task.isCancelled else { return }
            self.user = user
        }
    }

    func sendCode(to email: String) async -> Bool {
        guard let auth, !isWorking, LoginInput.normalizedEmail(email) != nil else { return false }
        isWorking = true
        message = nil
        defer { isWorking = false }
        do {
            try await auth.sendEmailCode(to: email)
            return true
        } catch {
            message = (error as? AuthFailure ?? .network).userMessage
            return false
        }
    }

    func verify(email: String, code: String) async -> Bool {
        guard let auth, !isWorking, LoginInput.isValidCode(code) else { return false }
        isWorking = true
        message = nil
        defer { isWorking = false }
        do {
            user = try await auth.verifyEmailCode(email: email, code: code)
            return true
        } catch {
            message = (error as? AuthFailure ?? .network).userMessage
            return false
        }
    }

    func requireLogin() {
        user = nil
        message = PriceReportFailure.loginRequired.userMessage
    }

    func signOut() async {
        guard let auth, !isWorking else { return }
        isWorking = true
        defer { isWorking = false }
        do {
            try await auth.signOut()
            user = nil
            message = nil
        } catch {
            message = (error as? AuthFailure ?? .network).userMessage
        }
    }
}
