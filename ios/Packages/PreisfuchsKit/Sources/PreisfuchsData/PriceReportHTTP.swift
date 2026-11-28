import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Supplied only by the shared Auth client, never constructed from the anon key.
public struct PriceReportSession: Sendable {
    public let accessToken: String
    public let email: String?
    public let isAnonymous: Bool

    public init(accessToken: String, email: String?, isAnonymous: Bool) {
        self.accessToken = accessToken
        self.email = email
        self.isAnonymous = isAnonymous
    }
}

public struct PriceReportHTTP: Sendable {
    public typealias Transport = @Sendable (URLRequest) async throws -> (Data, HTTPURLResponse)
    private let config: AppConfig
    private let session: @Sendable () async throws -> PriceReportSession?
    private let transport: Transport

    public init(config: AppConfig,
                session: @escaping @Sendable () async throws -> PriceReportSession?,
                transport: @escaping Transport) {
        self.config = config
        self.session = session
        self.transport = transport
    }

    public func submit(_ payload: PriceReportPayload) async throws -> PriceReportReceipt {
        let current: PriceReportSession?
        do { current = try await session() }
        catch is CancellationError { throw CancellationError() }
        catch is URLError { throw PriceReportFailure.network }
        catch { throw PriceReportFailure.loginRequired }
        guard let current, !current.isAnonymous,
              let email = current.email, LoginInput.normalizedEmail(email) != nil,
              !current.accessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              current.accessToken != config.anonKey else { throw PriceReportFailure.loginRequired }

        var request = URLRequest(url: config.supabaseURL.appendingPathComponent("functions/v1/report-price"))
        request.httpMethod = "POST"
        request.timeoutInterval = 30
        request.setValue("Bearer \(current.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)
        let data: Data
        let response: HTTPURLResponse
        do { (data, response) = try await transport(request) }
        catch is CancellationError { throw CancellationError() }
        catch { throw PriceReportFailure.network }

        if response.statusCode == 201 {
            guard let receipt = try? JSONDecoder().decode(PriceReportReceipt.self, from: data),
                  receipt.status == "unverified", !receipt.isVerified else { throw PriceReportFailure.server }
            return receipt
        }
        let body = try? JSONDecoder().decode(ErrorBody.self, from: data)
        switch response.statusCode {
        case 401: throw PriceReportFailure.loginRequired
        case 409 where body?.error == "duplicate": throw PriceReportFailure.duplicate
        case 429: throw PriceReportFailure.rateLimited(min(86_400, max(1, body?.retryAfterSeconds ?? 60)))
        case 400 where body?.error == "unknown_product": throw PriceReportFailure.unknownProduct
        case 400 where body?.error == "invalid_field": throw PriceReportFailure.invalidField(body?.field ?? "")
        default: throw PriceReportFailure.server
        }
    }

    private struct ErrorBody: Decodable {
        let error: String
        let field: String?
        let retryAfterSeconds: Int?
        enum CodingKeys: String, CodingKey {
            case error, field
            case retryAfterSeconds = "retry_after_seconds"
        }
    }
}
