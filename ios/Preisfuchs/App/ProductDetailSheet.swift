import PreisfuchsDomain
import SwiftUI

struct ProductDetailSheet: View {
    let model: PriceListModel
    let product: GroceryProduct
    @Environment(\.dismiss) private var dismiss

    private var prices: [PriceObservation] { product.comparisonPrices() }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    DataNotice(model: model)
                    HStack(alignment: .top, spacing: 16) {
                        ProductImage(url: product.imageURL, category: product.category, size: 112)
                        VStack(alignment: .leading, spacing: 6) {
                            Text(product.name).font(.title2.bold())
                            Text(product.packageSize).foregroundStyle(.secondary)
                            Text(product.category).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    Text("Preisbeobachtungen · Preise und Verfügbarkeit können je Filiale abweichen.")
                        .font(.footnote).foregroundStyle(.secondary)
                    PriceReportButton(model: model)
                    Text("Preise je Markt").font(.headline)
                    if prices.isEmpty {
                        Text("Noch keine vergleichbaren Preise beobachtet.")
                            .foregroundStyle(.secondary)
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(prices) { price in
                                MarketObservationRow(price: price, isCheapest: price.price == prices.first?.price)
                            }
                        }
                        .accessibilityIdentifier("product.priceList")
                    }
                    Text("Je Markt wird die neueste passende Beobachtung verglichen. App- und personalisierte Preise sind im Vergleich ausgeschlossen.")
                        .font(.caption).foregroundStyle(.secondary)
                    ProductImageCredit(product: product)
                }
                .padding()
            }
            .navigationTitle("Produkt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Schließen") { dismiss() } }
            }
            .safeAreaInset(edge: .bottom) {
                Button { model.toggleShopping(product) } label: {
                    Label(model.shoppingIDs.contains(product.id) ? "Von der Liste entfernen" : "Zur Einkaufsliste", systemImage: model.shoppingIDs.contains(product.id) ? "checkmark.circle" : "plus.circle")
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.borderedProminent)
                .padding()
                .background(.regularMaterial)
                .accessibilityIdentifier("product.listAction")
            }
        }
    }
}

private struct MarketObservationRow: View {
    let price: PriceObservation
    let isCheapest: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if isCheapest {
                Label("Günstigster", systemImage: "tag")
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 12)
            }
            PriceObservationRow(price: price)
            Text("Entfernung nicht bestimmt")
                .font(.caption).foregroundStyle(.secondary)
                .padding(.horizontal, 12)
            if let validity = PriceFormatting.validityText(price.validUntil) {
                Text(validity).font(.caption).padding(.horizontal, 12)
            }
            if !price.sourceDetail.isEmpty {
                Text(price.sourceDetail)
                    .font(.caption2).foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
            }
        }
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("observation.\(price.id)")
    }
}
