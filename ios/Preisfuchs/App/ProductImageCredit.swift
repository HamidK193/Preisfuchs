import PreisfuchsDomain
import SwiftUI

struct ProductImageCredit: View {
    let product: GroceryProduct

    var body: some View {
        if product.imageURL != nil {
            VStack(alignment: .leading, spacing: 3) {
                if let sourceURL = product.imageSourceURL {
                    Link("Bild: Open Food Facts", destination: sourceURL)
                } else {
                    Text("Bild: Open Food Facts")
                }
                Text(product.imageLicense ?? "CC BY-SA 3.0")
                if let attribution = product.imageAttribution, !attribution.isEmpty {
                    Text(attribution)
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
    }
}
