import SwiftUI

/// An unbooked preview slot. It never contributes products or price observations.
struct AdSlot: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Anzeige")
                .font(.caption.weight(.semibold))
                .accessibilityIdentifier("ad.label")
            Label("Ungebuchter Anzeigenplatz", systemImage: "megaphone")
                .font(.subheadline)
            Text("Vorschau · keine Kampagne gebucht")
                .font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("ad.slot")
    }
}

#Preview("Ungebuchter Anzeigenplatz") { AdSlot().padding() }
