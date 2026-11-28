import PreisfuchsDomain
import SwiftUI

struct PriceObservationRow: View {
    let price: PriceObservation

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(price.retailer)
                    .font(.subheadline.weight(.semibold))
                Text(price.storeLocation)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                PriceProvenance(price: price)
            }
            Spacer(minLength: 4)
            VStack(alignment: .trailing, spacing: 3) {
                Text(PriceFormatting.euro(price.price))
                    .font(.headline.monospacedDigit())
                if let unitPrice = price.unitPrice, let unit = price.unit {
                    Text(PriceFormatting.unitPrice(unitPrice, unit: unit))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Grundpreis nicht angegeben")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(12)
        .accessibilityElement(children: .combine)
    }
}

