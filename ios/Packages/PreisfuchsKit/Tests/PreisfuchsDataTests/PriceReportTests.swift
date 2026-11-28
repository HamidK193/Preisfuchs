import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import PreisfuchsData
import Testing

@Suite("Preismeldung: Eingaben und HTTP-Vertrag ohne Netzwerk")
struct PriceReportDataTests {
    @Test("GTIN verlangt genau 13 ASCII-Ziffern und die richtige Prüfziffer")
    func gtin() {
        #expect(PriceReportValidation.isValidGTIN("4006381333931"))
        for value in ["400638133393", "40063813339310", "4006381333932", "0000000000000", "４００６３８１３３３９３１", "40063813339 1"] {
            #expect(!PriceReportValidation.isValidGTIN(value))
        }
    }

    @Test("Preisgrenzen, deutsche Dezimaleingabe und keine stillen Umdeutungen")
    func price() {
        #expect(PriceReportValidation.price("0,01") == Decimal(string: "0.01"))
        #expect(PriceReportValidation.price("199.99") == Decimal(string: "199.99"))
        #expect(PriceReportValidation.price(" 1,99 ") == Decimal(string: "1.99"))
        for value in ["0", "0.00", "0.009", "200", "200,00", "-1", "+1", "NaN", "1e2", "1.000,00", "1,2,3", "1.", ".99", "١,٩٩"] {
            #expect(PriceReportValidation.price(value) == nil)
        }
    }

    @Test("Payload kodiert Zahlen, ISO-Tage und explizit null ohne Foto-Pfad")
    func payloadEncoding() throws {
        let input = try payload()
        let object = try #require(JSONSerialization.jsonObject(with: JSONEncoder().encode(input)) as? [String: Any])
        #expect(object["gtin"] as? String == "4006381333931")
        #expect((object["store_id"] as? String)?.lowercased() == input.storeID.uuidString.lowercased())
        #expect((object["price"] as? NSNumber)?.decimalValue == Decimal(string: "1.99"))
        #expect(object["is_offer"] as? Bool == false)
        #expect(object["valid_until"] is NSNull)
        #expect(object["observed_on"] as? String == "2026-11-28")
        #expect(object["photo_path"] == nil)
        #expect(Set(object.keys) == ["gtin", "store_id", "price", "is_offer", "valid_until", "observed_on"])
    }

    @Test("Gültigkeit verlangt ein echtes Datum und ein Angebot")
    func validity() throws {
        #expect(throws: (any Error).self) { try payload(isOffer: false, end: "2026-11-29") }
        #expect(throws: (any Error).self) { try payload(isOffer: true, end: "2026-11-27") }
        #expect(throws: (any Error).self) { try payload(isOffer: true, end: "2026-02-30") }
        #expect(throws: (any Error).self) { try payload(isOffer: true, end: "2026-11-29T12:00:00Z") }
        #expect(try payload(isOffer: true, end: "2026-11-28").validUntil == "2026-11-28")
        #expect(try payload(isOffer: true).validUntil == nil)
        let date = try #require(ISO8601DateFormatter().date(from: "2026-11-28T23:30:00Z"))
        #expect(PriceReportValidation.dateString(date) == "2026-11-29")
    }

    @Test("Ohne echte Session wird der Transport nie aufgerufen")
    func sessionGate() async throws {
        let sessions: [PriceReportSession?] = [
            nil,
            .init(accessToken: "anon-example", email: "user@example.org", isAnonymous: false),
            .init(accessToken: "user-token", email: "user@example.org", isAnonymous: true),
            .init(accessToken: "user-token", email: nil, isAnonymous: false),
            .init(accessToken: " ", email: "user@example.org", isAnonymous: false)
        ]
        for session in sessions {
            let http = PriceReportHTTP(config: try config(), session: { session }, transport: { _ in
                Issue.record("Transport darf ohne Session nicht laufen")
                throw URLError(.badServerResponse)
            })
            do {
                _ = try await http.submit(payload())
                Issue.record("Session hätte abgelehnt werden müssen")
            } catch {
                #expect(error as? PriceReportFailure == .loginRequired)
            }
        }
    }

    @Test("Ein fehlgeschlagener Session-Refresh fällt niemals auf den anon key zurück")
    func refreshFailure() async throws {
        let http = PriceReportHTTP(config: try config(), session: {
            throw PriceReportFailure.loginRequired
        }, transport: { _ in
            Issue.record("Kein Versand bei fehlgeschlagenem Session-Refresh")
            throw URLError(.badServerResponse)
        })
        do {
            _ = try await http.submit(payload())
            Issue.record("Login erforderlich erwartet")
        } catch { #expect(error as? PriceReportFailure == .loginRequired) }
    }

    @Test("POST verwendet echten Bearer und separaten apikey; nur 201 gilt als ungeprüft")
    func requestContract() async throws {
        let input = try payload()
        let body = successBody
        let http = PriceReportHTTP(config: try config(), session: { validSession }, transport: { request in
            #expect(request.url?.absoluteString == "https://example.supabase.co/functions/v1/report-price")
            #expect(request.httpMethod == "POST")
            #expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer user-token")
            #expect(request.value(forHTTPHeaderField: "apikey") == "anon-example")
            #expect(request.value(forHTTPHeaderField: "Content-Type") == "application/json")
            let actual = try JSONSerialization.jsonObject(with: #require(request.httpBody)) as? NSDictionary
            let expected = try JSONSerialization.jsonObject(with: JSONEncoder().encode(input)) as? NSDictionary
            #expect(actual == expected)
            return (Data(body.utf8), try response(201))
        })
        let receipt = try await http.submit(input)
        #expect(receipt.status == "unverified")
        #expect(!receipt.isVerified)
    }

    @Test("Serverfehler, Duplikate, Login und Limits erhalten unterscheidbare Meldungen")
    func errors() async throws {
        let cases: [(Int, String, PriceReportFailure)] = [
            (400, #"{"error":"invalid_field","field":"store_id"}"#, .invalidField("store_id")),
            (400, #"{"error":"unknown_product","field":"gtin"}"#, .unknownProduct),
            (401, #"{"error":"login_required"}"#, .loginRequired),
            (401, "not json", .loginRequired),
            (409, #"{"error":"duplicate","id":"existing"}"#, .duplicate),
            (429, #"{"error":"rate_limited","retry_after_seconds":3600}"#, .rateLimited(3600)),
            (500, #"{"error":"insert_failed"}"#, .server),
            (404, "not deployed", .server),
            (200, successBody, .server),
            (201, #"{"id":"651320b8-c4d8-4c9e-87af-fae0013ce2ca","status":"verified","is_verified":true,"created_at":"2026-11-28T12:00:00Z"}"#, .server)
        ]
        for (status, body, expected) in cases {
            let http = PriceReportHTTP(config: try config(), session: { validSession }, transport: { _ in
                (Data(body.utf8), try response(status))
            })
            do {
                _ = try await http.submit(payload())
                Issue.record("Fehler erwartet für Status \(status)")
            } catch {
                #expect(error as? PriceReportFailure == expected)
                #expect(!expected.userMessage.isEmpty)
            }
        }
    }

    @Test("Verbindungsabbruch wird als Netzwerkfehler gemeldet")
    func offline() async throws {
        let http = PriceReportHTTP(config: try config(), session: { validSession }, transport: { _ in
            throw URLError(.notConnectedToInternet)
        })
        do {
            _ = try await http.submit(payload())
            Issue.record("Netzwerkfehler erwartet")
        } catch { #expect(error as? PriceReportFailure == .network) }
    }
}

private let validSession = PriceReportSession(accessToken: "user-token", email: "user@example.org", isAnonymous: false)
private let successBody = #"{"id":"651320b8-c4d8-4c9e-87af-fae0013ce2ca","status":"unverified","is_verified":false,"created_at":"2026-11-28T12:00:00Z"}"#

private func config() throws -> AppConfig {
    try #require(AppConfig(info: ["PFSupabaseHost": "example.supabase.co", "PFSupabaseAnonKey": "anon-example"]))
}

private func payload(isOffer: Bool = false, end: String? = nil) throws -> PriceReportPayload {
    try PriceReportPayload(gtin: "4006381333931", storeID: UUID(uuidString: "1d4aad3e-d5e6-4a67-9ceb-f698a3b98d13")!,
                           price: Decimal(string: "1.99")!, isOffer: isOffer, validUntil: end, observedOn: "2026-11-28")
}

private func response(_ status: Int) throws -> HTTPURLResponse {
    try #require(HTTPURLResponse(url: URL(string: "https://example.supabase.co/functions/v1/report-price")!,
                                statusCode: status, httpVersion: nil, headerFields: nil))
}
