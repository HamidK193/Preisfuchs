import SwiftUI

struct OffersScreen: View {
    let model: PriceListModel

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                CatalogFeedback(model: model)
                if model.offerProducts.isEmpty && !model.isLoading && model.errorMessage == nil {
                    CatalogEmptyView(title: "Keine Angebote beobachtet", message: "Sobald die Quellen Angebote melden, findest du sie hier.", symbol: "tag", actionTitle: "Erneut laden") {
                        Task { await model.reload() }
                    }
                } else {
                    ProductCards(model: model, products: model.offerProducts)
                }
            }
            .padding()
        }
        .navigationTitle("Angebote")
        .refreshable { await model.reload() }
    }
}
