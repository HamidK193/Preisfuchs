import PreisfuchsDomain
import SwiftUI

struct PriceProvenance: View {
    let price: PriceObservation
    var now: Date = .now

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text("Quelle: \(price.source)")
            Text("Stand: \(PriceFormatting.date(price.observedAt))")
            if price.isStale(at: now) {
                Label("möglicherweise veraltet", systemImage: "clock.badge.exclamationmark")
                    .foregroundStyle(.orange)
            }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
    }
}
