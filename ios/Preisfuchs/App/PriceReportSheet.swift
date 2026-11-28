import PreisfuchsData
import PreisfuchsDomain
import SwiftUI

struct PriceReportButton: View {
    let model: PriceListModel
    @State private var showsReport = false

    var body: some View {
        Button { showsReport = true } label: { Label("Preis melden", systemImage: "barcode.viewfinder") }
            .accessibilityIdentifier("report.open")
            .sheet(isPresented: $showsReport) {
                PriceReportSheet(account: model.account, service: model.reportService)
                    .presentationDragIndicator(.visible)
            }
    }
}

struct PriceReportSheet: View {
    private enum Input: Hashable { case gtin, price }
    let account: AccountModel
    @State private var model: PriceReportModel
    @State private var showsScanner = false
    @FocusState private var focusedInput: Input?
    @Environment(\.dismiss) private var dismiss

    init(account: AccountModel, service: (any PriceReportServicing)?) {
        self.account = account
        // A fresh draft belongs to this presentation; no catalog state is copied back.
        _model = State(initialValue: PriceReportModel(service: service))
    }

    var body: some View {
        NavigationStack {
            Form {
                if let input = model.submittedPayload, model.receipt != nil {
                    Section("Meldung gespeichert") {
                        Label("ungeprüft", systemImage: "clock")
                            .accessibilityIdentifier("report.unverified")
                        LabeledContent("Quelle", value: "Nutzermeldung")
                        LabeledContent("Beobachtet am", value: input.observedOn)
                        LabeledContent("Preis", value: PriceFormatting.euro(input.price))
                        Text("Danke! Deine Meldung wird geprüft und ist noch nicht Teil der Preis-Rangliste.")
                    }
                } else {
                    accountSection
                    barcodeSection
                    storeSection
                    priceSection
                    Section("Foto") {
                        Text("Fotos sind derzeit nicht verfügbar. Du kannst den Preis ohne Foto melden.")
                            .foregroundStyle(.secondary)
                            .accessibilityIdentifier("report.photoUnavailable")
                    }
                    if let failure = model.failure {
                        Section { Text(failure.userMessage).foregroundStyle(.red).accessibilityIdentifier("report.error") }
                    }
                }
            }
            .disabled(model.isSending)
            .navigationTitle("Preis melden")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Schließen") { dismiss() }.disabled(model.isSending) }
                ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Tastatur schließen") { focusedInput = nil } }
            }
            .safeAreaInset(edge: .bottom) {
                if model.receipt == nil {
                    Button { Task { await model.submit(account: account) } } label: {
                        HStack {
                            if model.isSending { ProgressView() }
                            Text(model.isSending ? "Wird gesendet …" : "Preis als ungeprüft melden")
                        }
                        .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(!model.canSubmit(account: account))
                    .padding()
                    .background(.regularMaterial)
                    .accessibilityIdentifier("report.submit")
                }
            }
            .sheet(isPresented: $showsScanner) { BarcodeScannerSheet(gtin: $model.gtin) }
        }
        .interactiveDismissDisabled(model.isSending)
        .task { await model.loadStores() }
        .environment(\.calendar, .preisfuchs)
        .environment(\.timeZone, Calendar.preisfuchs.timeZone)
    }

    private var accountSection: some View {
        Section("Nutzermeldung") {
            Text("Melde den heute am Regal beobachteten Preis. Die Meldung bleibt bis zur Prüfung ungeprüft.")
                .font(.footnote)
            if let user = account.user {
                Label("Angemeldet: \(user.email ?? "E-Mail-Konto")", systemImage: "person.crop.circle.badge.checkmark")
            } else {
                Text("Zum Senden bitte mit E-Mail-Code anmelden. Deine Eingaben bleiben hier erhalten.")
                NavigationLink { LoginScreen(account: account) } label: { Text("Mit E-Mail anmelden") }
                    .accessibilityIdentifier("report.login")
            }
        }
    }

    private var barcodeSection: some View {
        Section("Barcode · GTIN-13") {
            TextField("Genau 13 Ziffern", text: $model.gtin)
                .keyboardType(.numberPad)
                .focused($focusedInput, equals: .gtin)
                .accessibilityIdentifier("report.gtin")
            Button { showsScanner = true } label: { Label("Barcode scannen", systemImage: "barcode.viewfinder") }
                .accessibilityIdentifier("report.scan")
            if !model.gtin.isEmpty && !PriceReportValidation.isValidGTIN(model.gtin) {
                Text(PriceReportFailure.invalidField("gtin").userMessage).font(.footnote).foregroundStyle(.red)
            }
            Text("Nur Produkte mit gültiger GTIN-13 aus dem Korbwert-Katalog können gemeldet werden.")
                .font(.footnote).foregroundStyle(.secondary)
        }
    }

    private var storeSection: some View {
        Section("Filiale") {
            if model.isLoadingStores { ProgressView("Aktive Filialen laden …") }
            if model.stores.isEmpty, !model.isLoadingStores {
                Text(model.storeMessage ?? "Keine aktiven Filialen verfügbar.")
                    .foregroundStyle(.secondary)
                    .accessibilityIdentifier("report.storeUnavailable")
            } else if !model.stores.isEmpty {
                Picker("Aktive Filiale", selection: $model.selectedStoreID) {
                    Text("Bitte auswählen").tag(nil as UUID?)
                    ForEach(model.stores) { store in Text(store.label).tag(Optional(store.id)) }
                }
                .pickerStyle(.navigationLink)
                .accessibilityIdentifier("report.store")
            }
            Button("Filialen erneut laden") { Task { await model.loadStores() } }
                .disabled(model.isLoadingStores)
        }
    }

    private var priceSection: some View {
        Section("Regalpreis in Euro") {
            TextField("Zum Beispiel 1,99", text: $model.priceText)
                .keyboardType(.decimalPad)
                .focused($focusedInput, equals: .price)
                .accessibilityIdentifier("report.price")
            if !model.priceText.isEmpty && PriceReportValidation.price(model.priceText) == nil {
                Text(PriceReportFailure.invalidField("price").userMessage).font(.footnote).foregroundStyle(.red)
            }
            Toggle("Angebot", isOn: $model.isOffer)
            if model.isOffer {
                Toggle("Gültigkeitsdatum angeben", isOn: $model.includesValidity)
                if model.includesValidity {
                    DatePicker("Gültig bis", selection: $model.validUntil,
                               in: Calendar.preisfuchs.startOfDay(for: .now)..., displayedComponents: .date)
                }
            }
        }
    }

}
