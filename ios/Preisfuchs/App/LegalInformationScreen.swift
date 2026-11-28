import SwiftUI

struct LegalInformationScreen: View {
    var body: some View {
        List {
            Section("Entwicklungsstand") {
                Text("Korbwert ist eine Testversion. Vollständige Anbieter- und Datenschutzangaben für eine öffentliche Veröffentlichung sind noch nicht hinterlegt.")
                Text("Impressum: Anbieterangaben fehlen noch.")
                    .foregroundStyle(.secondary)
            }
            Section("Lokale Einstellungen") {
                Text("Standortauswahl, Darstellung, Suchverlauf, Einkaufsliste und Favoriten werden auf diesem Gerät gespeichert. Ein Konto ist dafür nicht erforderlich.")
            }
            Section("Verbindungen zu Datenquellen") {
                Text("Beim Laden von Beobachtungen verbindet sich die App mit dem eingerichteten Datendienst. Produktbilder werden von den angegebenen Bildadressen geladen; dabei wird die IP-Adresse an den jeweiligen Server übertragen. Externe Links öffnen die verlinkte Website.")
            }
            Section("Preise und Kennzeichnung") {
                Text("Preisbeobachtungen können von den Preisen und der Verfügbarkeit in einer Filiale abweichen. Die Rangfolge wird nicht durch Werbung beeinflusst. Werbung wird als „Anzeige“, ein Partnerlink als „Partnerlink“ gekennzeichnet.")
            }
        }
        .navigationTitle("Rechtliches")
        .navigationBarTitleDisplayMode(.inline)
    }
}
