import PreisfuchsDomain
import SwiftUI

struct BasketSummary: View {
    let estimates: [BasketEstimate]

    var body: some View {
        Section("Summe je Markt · geschätzt") {
            Text("Je eine Packung pro Produkt. Beobachtungen können aus verschiedenen Filialen stammen; Preise und Verfügbarkeit können abweichen.")
                .font(.caption).foregroundStyle(.secondary)
            if estimates.isEmpty {
                Text("Keine vergleichbaren Preisbeobachtungen für diese Liste vorhanden.")
            }
            ForEach(estimates) { estimate in
                DisclosureGroup {
                    ForEach(estimate.lines) { line in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(line.product.name)
                            Text(PriceFormatting.euro(line.observation.price))
                            PriceProvenance(price: line.observation)
                        }
                        .padding(.vertical, 4)
                    }
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(estimate.retailer) · \(PriceFormatting.euro(estimate.total)) geschätzt")
                        Text(estimate.isComplete ? "Alle \(estimate.productCount) Produkte berücksichtigt" : "Teilsumme · \(estimate.missingCount) Produkte ohne Preis")
                            .font(.caption).foregroundStyle(.secondary)
                        if estimate.isComplete && estimate.id == estimates.first?.id {
                            Text("Günstigster Markt für die vollständige Liste · geschätzt").font(.caption.weight(.semibold))
                        }
                        Text("Quellen: \(Set(estimate.lines.map { $0.observation.source }).sorted().joined(separator: ", "))")
                            .font(.caption)
                        if let oldest = estimate.lines.map({ $0.observation.observedAt }).min() {
                            Text("Stand ab: \(PriceFormatting.date(oldest)) · Einzelstände aufklappen").font(.caption)
                        }
                        if estimate.lines.contains(where: { $0.observation.isStale(at: .now) }) {
                            Text("möglicherweise veraltet").font(.caption).foregroundStyle(.orange)
                        }
                    }
                }
            }
        }
    }
}
