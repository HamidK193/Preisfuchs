import Foundation
import PreisfuchsData
import Testing
@testable import Preisfuchs

@Suite("Preismeldung im App-Modell")
@MainActor
struct PriceReportModelTests {
    @Test("Demo und leere oder fehlerhafte Filialdaten erlauben keine Meldung")
    func unavailableStores() async throws {
        let account = AccountModel(auth: ReportTestAuth())
        await account.observe()
        let demo = PriceReportModel(service: nil)
        await demo.loadStores()
        #expect(demo.stores.isEmpty)
        #expect(demo.storeMessage != nil)
        #expect(!demo.canSubmit(account: account))
        let empty = PriceReportModel(service: ReportTestService(stores: []))
        await empty.loadStores()
        #expect(empty.storeMessage != nil)
        #expect(!empty.canSubmit(account: account))
        let failed = PriceReportModel(service: ReportTestService(stores: [], failsLoading: true))
        await failed.loadStores()
        #expect(failed.stores.isEmpty)
        #expect(failed.storeMessage != nil)
    }

    @Test("Nur geladene aktive Filialen und angemeldete Nutzer können senden")
    func selectionAndLoginGate() async throws {
        let active = try store(active: true)
        let inactive = try store(active: false, id: "deaa07bc-9ced-46dd-863d-2ba12e84f350")
        let service = ReportTestService(stores: [active, inactive])
        let model = PriceReportModel(service: service)
        await model.loadStores()
        #expect(model.stores == [active])
        model.gtin = "4006381333931"
        model.priceText = "1,99"
        model.selectedStoreID = inactive.id
        #expect(throws: (any Error).self) { try model.payload() }
        model.selectedStoreID = UUID()
        #expect(throws: (any Error).self) { try model.payload() }
        model.selectedStoreID = active.id
        let signedOut = AccountModel(auth: nil)
        #expect(!model.canSubmit(account: signedOut))
        await model.submit(account: signedOut)
        #expect(model.failure == .loginRequired)
        #expect(await service.submissions == 0)
        let signedIn = AccountModel(auth: ReportTestAuth())
        await signedIn.observe()
        #expect(model.canSubmit(account: signedIn))
    }

    @Test("Erfolg bleibt ungeprüft, doppelte Taps senden nicht erneut")
    func success() async throws {
        let active = try store(active: true)
        let service = ReportTestService(stores: [active])
        let suite = "report-catalog-test-\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let catalog = PriceListModel(environment: AppEnvironment(origin: .demo, prices: DemoPriceService(),
                                                                auth: ReportTestAuth(), reports: service), defaults: defaults)
        await catalog.loadIfNeeded()
        let rankedProducts = catalog.products
        let account = catalog.account
        await account.observe()
        let model = PriceReportModel(service: catalog.reportService)
        await model.loadStores()
        model.selectedStoreID = active.id
        model.gtin = "4006381333931"
        model.priceText = "0,01"
        await model.submit(account: account)
        #expect(model.receipt?.status == "unverified")
        #expect(model.receipt?.isVerified == false)
        #expect(model.submittedPayload?.price == Decimal(string: "0.01"))
        #expect(!model.canSubmit(account: account))
        await model.submit(account: account)
        #expect(await service.submissions == 1)
        #expect(!rankedProducts.isEmpty)
        #expect(catalog.products == rankedProducts)
    }

    @Test("Abgelaufene Session führt mit erhaltenem Entwurf zur Anmeldung")
    func expiredSession() async throws {
        let active = try store(active: true)
        let service = ReportTestService(stores: [active], failure: .loginRequired)
        let model = PriceReportModel(service: service)
        let account = AccountModel(auth: ReportTestAuth())
        await account.observe()
        await model.loadStores()
        model.selectedStoreID = active.id
        model.gtin = "4006381333931"
        model.priceText = "1,99"
        await model.submit(account: account)
        #expect(account.user == nil)
        #expect(model.failure == .loginRequired)
        #expect(model.gtin == "4006381333931")
        #expect(model.priceText == "1,99")
        #expect(model.receipt == nil)
    }

    @Test("Angebotsdatum darf nicht vor dem Beobachtungstag liegen")
    func offerDate() async throws {
        let active = try store(active: true)
        let model = PriceReportModel(service: ReportTestService(stores: [active]))
        await model.loadStores()
        model.selectedStoreID = active.id
        model.gtin = "4006381333931"
        model.priceText = "1,99"
        model.isOffer = true
        let now = Date.now
        model.validUntil = now.addingTimeInterval(-86_400)
        #expect(throws: (any Error).self) { try model.payload(now: now) }
        model.includesValidity = false
        #expect(try model.payload(now: now).validUntil == nil)
        model.isOffer = false
        #expect(try model.payload(now: now).isOffer == false)
    }

    @Test("OTP-Login lehnt fünf und sieben Ziffern vor dem Auth-Aufruf ab")
    func otpInput() async {
        let account = AccountModel(auth: ReportTestAuth())
        #expect(!(await account.verify(email: "test@example.org", code: "12345")))
        #expect(account.user == nil)
        #expect(!(await account.verify(email: "test@example.org", code: "1234567")))
        #expect(account.user == nil)
        #expect(await account.verify(email: "test@example.org", code: "012345"))
        #expect(account.user?.email == "test@example.org")
    }

    @Test("Fehler bleiben sichtbar und erlauben einen korrigierten neuen Versuch")
    func recoverableFailures() async throws {
        let active = try store(active: true)
        for failure in [PriceReportFailure.duplicate, .rateLimited(60), .unknownProduct, .invalidField("price"), .network] {
            let model = PriceReportModel(service: ReportTestService(stores: [active], failure: failure))
            let account = AccountModel(auth: ReportTestAuth())
            await account.observe()
            await model.loadStores()
            model.selectedStoreID = active.id
            model.gtin = "4006381333931"
            model.priceText = "1,99"
            await model.submit(account: account)
            #expect(model.failure == failure)
            #expect(model.receipt == nil)
            #expect(!model.isSending)
            #expect(model.canSubmit(account: account))
        }
    }

    @Test("Erneutes Laden entfernt eine zuvor ausgewählte Filiale")
    func reloadClearsSelection() async throws {
        let active = try store(active: true)
        let model = PriceReportModel(service: ReportTestService(stores: [active]))
        await model.loadStores()
        model.selectedStoreID = active.id
        await model.loadStores()
        #expect(model.selectedStoreID == nil)
    }
}

private struct ReportTestAuth: AuthClient {
    let user = AuthUser(id: UUID(), email: "test@example.org")
    func sendEmailCode(to email: String) async throws {}
    func verifyEmailCode(email: String, code: String) async throws -> AuthUser { user }
    func signOut() async throws {}
    func authStateStream() -> AsyncStream<AuthUser?> {
        AsyncStream { continuation in
            continuation.yield(user)
            continuation.finish()
        }
    }
}

private actor ReportTestService: PriceReportServicing {
    let stores: [ReportStore]
    let failure: PriceReportFailure?
    let failsLoading: Bool
    private(set) var submissions = 0

    init(stores: [ReportStore], failure: PriceReportFailure? = nil, failsLoading: Bool = false) {
        self.stores = stores
        self.failure = failure
        self.failsLoading = failsLoading
    }

    func loadActiveStores() async throws -> [ReportStore] {
        if failsLoading { throw URLError(.notConnectedToInternet) }
        return stores
    }

    func submit(_ payload: PriceReportPayload) async throws -> PriceReportReceipt {
        submissions += 1
        if let failure { throw failure }
        return try JSONDecoder().decode(PriceReportReceipt.self, from: Data(#"{"id":"651320b8-c4d8-4c9e-87af-fae0013ce2ca","status":"unverified","is_verified":false,"created_at":"2026-11-28T12:00:00Z"}"#.utf8))
    }
}

private func store(active: Bool, id: String = "1d4aad3e-d5e6-4a67-9ceb-f698a3b98d13") throws -> ReportStore {
    let data = try JSONSerialization.data(withJSONObject: ["id": id, "name": "Testfiliale (Fixture)", "is_active": active])
    return try JSONDecoder().decode(ReportStore.self, from: data)
}
