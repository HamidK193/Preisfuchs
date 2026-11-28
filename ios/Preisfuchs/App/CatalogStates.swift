import PreisfuchsDomain
import SwiftUI

struct CatalogLoadingView: View {
    var body: some View {
        VStack(spacing: 16) {
            ForEach(0..<3) { _ in
                HStack(spacing: 14) {
                    RoundedRectangle(cornerRadius: 12).frame(width: 72, height: 72)
                    VStack(alignment: .leading, spacing: 10) {
                        RoundedRectangle(cornerRadius: 4).frame(height: 16)
                        RoundedRectangle(cornerRadius: 4).frame(width: 120, height: 12)
                        RoundedRectangle(cornerRadius: 4).frame(height: 12)
                    }
                }
            }
        }
        .foregroundStyle(Color.secondary.opacity(0.15))
        .padding()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Produktbeobachtungen werden geladen")
    }
}

struct CatalogEmptyView: View {
    let title: String
    let message: String
    var symbol = "basket"
    let actionTitle: String
    let action: () -> Void

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: symbol)
        } description: {
            Text(message)
        } actions: {
            Button(actionTitle, action: action).buttonStyle(.borderedProminent)
        }
    }
}

struct CatalogOfflineView: View {
    let lastLoadedAt: Date?
    let retry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Daten konnten nicht geladen werden", systemImage: "wifi.exclamationmark")
                .font(.headline)
            if let lastLoadedAt {
                Text("Letzte geladene Daten vom \(PriceFormatting.date(lastLoadedAt)). Quelle und Beobachtungsdatum stehen an jedem Preis.")
            } else {
                Text("Prüfe deine Verbindung und versuche es erneut.")
            }
            Button("Erneut versuchen", action: retry).buttonStyle(.bordered)
        }
        .font(.subheadline)
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
    }
}

/// Retained observations are still rendered by the surrounding screen.
struct CatalogFeedback: View {
    let model: PriceListModel

    var body: some View {
        if model.isLoading && model.products.isEmpty {
            CatalogLoadingView()
        } else if model.errorMessage != nil {
            CatalogOfflineView(lastLoadedAt: model.loadedAt) {
                Task { await model.reload() }
            }
        }
    }
}

struct DataNotice: View {
    let model: PriceListModel

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            if model.origin == .demo {
                Label("Demo · Beispielbeobachtungen, keine Marktpreise", systemImage: "info.circle")
            } else if model.origin == .cached, let date = model.loadedAt {
                Label("Gespeicherte Daten · geladen am \(PriceFormatting.date(date))", systemImage: "clock")
            } else {
                Text("Preise sind Beobachtungen und können abweichen.")
            }
            if model.isTruncated { Text("Die Quelle liefert derzeit nur einen Teil der Beobachtungen.") }
        }
        .font(.caption)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal)
        .padding(.vertical, 6)
        .background(Color.secondary.opacity(0.07))
    }
}

#Preview("Laden") { CatalogLoadingView() }
#Preview("Leer") {
    CatalogEmptyView(title: "Keine Treffer", message: "Versuche einen anderen Suchbegriff.", actionTitle: "Suche löschen", action: {})
}
#Preview("Offline mit letztem Datenstand") {
    CatalogOfflineView(lastLoadedAt: Date(timeIntervalSince1970: 1_795_824_000), retry: {})
        .padding()
}
