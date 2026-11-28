import Foundation
import Observation
import PreisfuchsData

@MainActor
@Observable
final class PriceReportModel {
    private let service: (any PriceReportServicing)?
    var gtin = ""
    var priceText = ""
    var selectedStoreID: UUID?
    var isOffer = false
    var includesValidity = true
    var validUntil = Date.now
    private(set) var stores: [ReportStore] = []
    private(set) var isLoadingStores = false
    private(set) var storeMessage: String?
    private(set) var isSending = false
    private(set) var failure: PriceReportFailure?
    private(set) var receipt: PriceReportReceipt?
    private(set) var submittedPayload: PriceReportPayload?

    init(service: (any PriceReportServicing)?) { self.service = service }

    func payload(now: Date = .now) throws -> PriceReportPayload {
        guard let id = selectedStoreID, stores.contains(where: { $0.id == id && $0.isActive }) else {
            throw PriceReportFailure.invalidField("store_id")
        }
        guard let price = PriceReportValidation.price(priceText) else { throw PriceReportFailure.invalidField("price") }
        return try PriceReportPayload(gtin: gtin, storeID: id, price: price, isOffer: isOffer,
                                      validUntil: isOffer && includesValidity ? PriceReportValidation.dateString(validUntil) : nil,
                                      observedOn: PriceReportValidation.dateString(now))
    }

    func canSubmit(account: AccountModel) -> Bool {
        account.user != nil && service != nil && !isSending && !isLoadingStores && receipt == nil && (try? payload()) != nil
    }

    func loadStores() async {
        guard !isLoadingStores, !isSending else { return }
        selectedStoreID = nil
        stores = []
        guard let service else {
            storeMessage = "Im Demo-Modus sind keine echten aktiven Filialen verfügbar. Eine Meldung kann nicht gesendet werden."
            return
        }
        isLoadingStores = true
        storeMessage = nil
        defer { isLoadingStores = false }
        do {
            let loaded = try await service.loadActiveStores()
            try Task.checkCancellation()
            stores = loaded.filter(\.isActive)
            if stores.isEmpty { storeMessage = "Keine aktiven Filialen verfügbar. Eine Meldung kann derzeit nicht gesendet werden." }
        } catch is CancellationError {
            return
        } catch {
            storeMessage = "Filialen konnten nicht geladen werden. Prüfe deine Verbindung und lade erneut. Ohne aktive Filiale ist keine Meldung möglich."
        }
    }

    func submit(account: AccountModel) async {
        guard !isSending, receipt == nil else { return }
        failure = nil
        guard account.user != nil else { failure = .loginRequired; return }
        guard let service else { failure = .unavailable; return }
        isSending = true
        defer { isSending = false }
        do {
            let input = try payload()
            let result = try await service.submit(input)
            // A receipt is separate from the catalog and its ranked observations.
            guard result.status == "unverified", !result.isVerified else { throw PriceReportFailure.server }
            submittedPayload = input
            receipt = result
        } catch is CancellationError {
            return
        } catch {
            let failure = error as? PriceReportFailure ?? (error is URLError ? .network : .server)
            self.failure = failure
            if failure == .loginRequired { account.requireLogin() }
            if failure == .invalidField("store_id") { selectedStoreID = nil }
        }
    }
}
