import PreisfuchsDomain
import SwiftUI

struct ProductCards: View {
    let model: PriceListModel
    let products: [GroceryProduct]

    var body: some View {
        LazyVStack(spacing: 12) {
            ForEach(products) { product in
                ProductSelectionCard(model: model, product: product)
            }
        }
    }
}

struct ProductSelectionCard: View {
    let model: PriceListModel
    let product: GroceryProduct

    var body: some View {
        ProductCard(
            product: product,
            isFavorite: model.favoriteIDs.contains(product.id),
            isInList: model.shoppingIDs.contains(product.id),
            openProduct: { model.selectedProduct = product },
            toggleFavorite: { model.toggleFavorite(product) },
            toggleShopping: { model.toggleShopping(product) }
        )
    }
}

