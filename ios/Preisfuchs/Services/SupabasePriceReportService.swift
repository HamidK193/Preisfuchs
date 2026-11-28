import Foundation
import PreisfuchsData
import Supabase

struct SupabasePriceReportService: PriceReportServicing {
    let client: SupabaseClient
    let config: AppConfig

    func loadActiveStores() async throws -> [ReportStore] {
        let result = try await PagedLoader.loadAll { from, to in
            let response = try await client.from("stores")
                .select("id,name,street,postcode,city,is_active")
                .eq("is_active", value: true)
                .order("id")
                .range(from: from, to: to)
                .execute()
            return try JSONDecoder().decode([ReportStore].self, from: response.data)
        }
        return result.items.filter(\.isActive).sorted { $0.label.localizedStandardCompare($1.label) == .orderedAscending }
    }

    func submit(_ payload: PriceReportPayload) async throws -> PriceReportReceipt {
        // auth.session refreshes expired sessions. A UI login flag is never authorization.
        let http = PriceReportHTTP(config: config, session: {
            let session = try await client.auth.session
            return PriceReportSession(accessToken: session.accessToken, email: session.user.email,
                                      isAnonymous: session.user.isAnonymous != false)
        }, transport: { request in
            // Do not follow redirects carrying a session token to another endpoint.
            let session = URLSession(configuration: .ephemeral, delegate: ReportRedirectPolicy(), delegateQueue: nil)
            defer { session.finishTasksAndInvalidate() }
            let (data, response) = try await session.data(for: request)
            guard let response = response as? HTTPURLResponse else { throw PriceReportFailure.server }
            return (data, response)
        })
        return try await http.submit(payload)
    }
}

private final class ReportRedirectPolicy: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
                    completionHandler: @escaping @Sendable (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}
