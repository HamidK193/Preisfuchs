import PreisfuchsData
import PreisfuchsDomain
import SwiftUI

struct ProductCard: View {
    let product: GroceryProduct
    let isFavorite: Bool
    let isInList: Bool
    let openProduct: () -> Void
    let toggleFavorite: () -> Void
    let toggleShopping: () -> Void

    private var bestPrice: PriceObservation? { product.cheapestPrice() }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(action: openProduct) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top, spacing: 12) {
                        ProductImage(url: product.imageURL, category: product.category)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(product.name).font(.headline)
                            Text(product.packageSize).font(.subheadline).foregroundStyle(.secondary)
                            Text(product.category).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 0)
                    }
                    if let bestPrice {
                        if bestPrice.offerType == "sale" {
                            Label("Angebot beobachtet", systemImage: "tag.fill")
                                .font(.caption.weight(.semibold)).foregroundStyle(.red)
                        }
                        Text("Günstigster beobachteter Preis").font(.caption.weight(.semibold))
                        PriceObservationRow(price: bestPrice)
                            .background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
                    } else {
                        Text("Noch keine vergleichbaren Preise beobachtet")
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("product.open.\(product.id)")
            .accessibilityHint("Öffnet die Preisbeobachtungen je Markt")

            HStack {
                Button(action: toggleShopping) {
                    Label(isInList ? "Auf der Liste" : "Zur Einkaufsliste", systemImage: isInList ? "checkmark.circle.fill" : "plus.circle")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                }
                Button(action: toggleFavorite) {
                    Image(systemName: isFavorite ? "heart.fill" : "heart")
                        .frame(minWidth: 44, minHeight: 44)
                        .foregroundStyle(isFavorite ? .red : .secondary)
                }
                .accessibilityLabel(isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen")
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .background(.background, in: RoundedRectangle(cornerRadius: 18))
        .overlay { RoundedRectangle(cornerRadius: 18).stroke(Color.secondary.opacity(0.15)) }
    }
}

#Preview("Produktkarte mit Demo-Beobachtung") {
    if let product = try? DemoPriceService().loadProducts().first {
        ProductCard(product: product, isFavorite: false, isInList: false, openProduct: {}, toggleFavorite: {}, toggleShopping: {})
            .padding()
    }
}
