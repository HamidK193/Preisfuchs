import PreisfuchsDomain
import SwiftUI

struct ProductListRow: View {
    let model: PriceListModel
    let product: GroceryProduct
    var showListAction = false

    private var bestPrice: PriceObservation? { product.cheapestPrice() }

    var body: some View {
        HStack(spacing: 12) {
            Button { model.selectedProduct = product } label: {
                HStack(alignment: .top, spacing: 12) {
                    ProductImage(url: product.imageURL, category: product.category, size: 48)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(product.name).font(.subheadline.weight(.semibold))
                        Text(product.packageSize).font(.caption).foregroundStyle(.secondary)
                        if let bestPrice {
                            Text("\(bestPrice.retailer) · \(PriceFormatting.euro(bestPrice.price))")
                                .font(.caption)
                            PriceProvenance(price: bestPrice)
                        } else {
                            Text("Noch kein Preis beobachtet").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("product.open.\(product.id)")
            if showListAction {
                Button { model.toggleShopping(product) } label: {
                    Image(systemName: "checkmark.circle.fill").frame(minWidth: 44, minHeight: 44)
                }
                .accessibilityLabel("Von der Einkaufsliste entfernen")
            } else {
                Button { model.toggleFavorite(product) } label: {
                    Image(systemName: model.favoriteIDs.contains(product.id) ? "heart.fill" : "heart")
                        .frame(minWidth: 44, minHeight: 44)
                        .foregroundStyle(model.favoriteIDs.contains(product.id) ? .red : .secondary)
                }
                .accessibilityLabel("Favorit umschalten")
            }
        }
        .buttonStyle(.plain)
        .padding(.vertical, 5)
    }
}
