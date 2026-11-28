import SwiftUI

struct ListScreen: View {
    let model: PriceListModel
    @State private var selection = Selection.shopping

    private enum Selection: String, CaseIterable, Hashable {
        case shopping = "Einkauf", favorites = "Favoriten"
    }

    var body: some View {
        VStack(spacing: 0) {
            Picker("Liste auswählen", selection: $selection) {
                ForEach(Selection.allCases, id: \.self) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding()
            if selection == .shopping {
                ShoppingScreen(model: model)
            } else {
                FavoritesScreen(model: model)
            }
        }
        .navigationTitle("Liste")
    }
}
