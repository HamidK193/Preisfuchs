import PreisfuchsDomain
import SwiftUI

struct ProfileScreen: View {
    let model: PriceListModel

    var body: some View {
        List {
            Section("Daten") {
                LabeledContent("Modus", value: model.origin == .demo ? "Demo" : "Online")
                if let loadedAt = model.loadedAt {
                    LabeledContent("Geladen am", value: PriceFormatting.date(loadedAt))
                }
                LabeledContent("Produkte", value: "\(model.products.count)")
            }

            Section("Produktbilder") {
                Text("Open Food Facts · CC BY-SA 3.0")
                Text("Bilder werden anhand der EAN zugeordnet. Ohne passendes Bild erscheint ein Kategorie-Symbol.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Über Korbwert") {
                Text("Preise sind Beobachtungen aus angegebenen Quellen und können sich ändern. Quelle und Beobachtungsdatum stehen direkt beim jeweiligen Preis.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Profil")
    }
}

