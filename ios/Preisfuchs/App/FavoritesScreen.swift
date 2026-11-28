import PreisfuchsDomain
import SwiftUI

struct FavoritesScreen: View {
    let model: PriceListModel

    private var products: [GroceryProduct] {
        model.products.filter { model.favoriteIDs.contains($0.id) }
    }

    var body: some View {
        Group {
            if products.isEmpty {
                CatalogEmptyView(title: "Noch keine Favoriten", message: "Speichere Produkte mit dem Herzsymbol, um sie hier wiederzufinden.", symbol: "heart", actionTitle: "Produkte suchen") {
                    model.selectedTab = .search
                }
            } else {
                List {
                    ForEach(products) { product in
                        ProductListRow(model: model, product: product)
                    }
                }
            }
        }
    }
}

