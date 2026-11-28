import PreisfuchsDomain
import SwiftUI

struct ShoppingScreen: View {
    let model: PriceListModel

    private var products: [GroceryProduct] {
        model.shoppingProducts
    }

    var body: some View {
        Group {
            if products.isEmpty {
                CatalogEmptyView(title: "Deine Liste ist noch leer", message: "Füge Produkte über das Plus in der Preisübersicht hinzu.", actionTitle: "Produkte suchen") {
                    model.selectedTab = .search
                }
            } else {
                List {
                    BasketSummary(estimates: model.basketEstimates)
                    ForEach(products) { product in
                        ProductListRow(model: model, product: product, showListAction: true)
                    }
                }
            }
        }
    }
}

