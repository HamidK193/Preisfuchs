import PreisfuchsDomain
import SwiftUI

struct ShoppingScreen: View {
    let model: PriceListModel

    private var products: [GroceryProduct] {
        model.products.filter { model.shoppingIDs.contains($0.id) }
    }

    var body: some View {
        Group {
            if products.isEmpty {
                CatalogEmptyView(title: "Deine Liste ist noch leer", message: "Füge Produkte über das Plus in der Preisübersicht hinzu.", actionTitle: "Produkte suchen") {
                    model.selectedTab = .search
                }
            } else {
                List {
                    ForEach(products) { product in
                        ProductListRow(model: model, product: product, showListAction: true)
                    }
                }
            }
        }
    }
}

