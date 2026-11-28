import PreisfuchsDomain
import SwiftUI

struct ProfileScreen: View {
    let model: PriceListModel
    @AppStorage(AppearancePreference.storageKey) private var appearance = AppearancePreference.system.rawValue

    var body: some View {
        List {
            Section("Konto und Beiträge") {
                if let user = model.account.user {
                    Text("Angemeldet: \(user.email ?? "E-Mail-Konto")")
                    Button("Abmelden") { Task { await model.account.signOut() } }
                        .disabled(model.account.isWorking)
                    if let message = model.account.message { Text(message).foregroundStyle(.red) }
                } else {
                    NavigationLink("Mit E-Mail anmelden") { LoginScreen(account: model.account) }
                }
                PriceReportButton(model: model)
            }
            Section("Standort") { LocationButton() }
            Section("Darstellung") {
                Picker("Farbschema", selection: $appearance) {
                    ForEach(AppearancePreference.allCases) { preference in
                        Text(preference.title).tag(preference.rawValue)
                    }
                }
                .accessibilityIdentifier("profile.appearance")
            }
            Section("Informationen") {
                NavigationLink("Datenquellen") { DataSourcesScreen(model: model) }
                NavigationLink("Rechtliches") { LegalInformationScreen() }
            }
            Section("Über Korbwert") {
                LabeledContent("Daten", value: model.origin == .demo ? "Demo" : "Preisbeobachtungen")
                LabeledContent("Produkte", value: "\(model.products.count)")
                Text("Preise sind Beobachtungen aus angegebenen Quellen und können sich ändern. Quelle und Beobachtungsdatum stehen direkt beim jeweiligen Preis.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Profil")
    }
}

