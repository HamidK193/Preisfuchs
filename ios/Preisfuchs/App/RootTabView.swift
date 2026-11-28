import PreisfuchsDomain
import SwiftUI
import UIKit

struct RootTabView: View {
    @Bindable var model: PriceListModel

    var body: some View {
        TabView {
            NavigationStack {
                HomeScreen(model: model)
            }
            .tabItem { Label("Start", systemImage: "house") }

            NavigationStack {
                SearchScreen(model: model)
            }
            .tabItem { Label("Suche", systemImage: "magnifyingglass") }

            NavigationStack {
                ShoppingScreen(model: model)
            }
            .tabItem { Label("Einkaufsliste", systemImage: "basket") }

            NavigationStack {
                FavoritesScreen(model: model)
            }
            .tabItem { Label("Favoriten", systemImage: "heart") }

            NavigationStack {
                ProfileScreen(model: model)
            }
            .tabItem { Label("Profil", systemImage: "person.crop.circle") }
        }
        .task { await model.loadIfNeeded() }
    }
}

private struct HomeScreen: View {
    @Bindable var model: PriceListModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Clever einkaufen")
                        .font(.largeTitle.bold())
                    Text("Preise vergleichen. Bewusst entscheiden.")
                        .foregroundStyle(.secondary)
                }

                SearchField(text: $model.searchText)

                if model.origin == .demo {
                    Label("Demo-Daten · Beispielpreise, keine Live-Preise", systemImage: "info.circle.fill")
                        .font(.footnote.weight(.medium))
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
                }

                if let message = model.errorMessage {
                    ContentUnavailableView {
                        Label("Preise nicht verfügbar", systemImage: "wifi.exclamationmark")
                    } description: {
                        Text(message)
                    } actions: {
                        Button("Erneut versuchen") {
                            Task { await model.loadIfNeeded() }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                } else if model.isLoading && model.products.isEmpty {
                    ProgressView("Preise werden geladen …")
                        .frame(maxWidth: .infinity, minHeight: 160)
                } else if model.filteredProducts.isEmpty {
                    ContentUnavailableView.search(text: model.searchText)
                } else {
                    HStack {
                        Text(model.searchText.isEmpty ? "Preisübersicht" : "Suchergebnisse")
                            .font(.title2.bold())
                        Spacer()
                        Text("\(model.filteredProducts.count) Produkte")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    ProductCards(model: model, products: Array(model.filteredProducts.prefix(30)))
                }
            }
            .padding(.horizontal)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(Color(uiColor: .secondarySystemBackground).opacity(0.5))
        .navigationTitle("Korbwert")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct SearchScreen: View {
    @Bindable var model: PriceListModel

    var body: some View {
        List {
            Section {
                SearchField(text: $model.searchText)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            if model.filteredProducts.isEmpty {
                ContentUnavailableView.search(text: model.searchText)
                    .listRowBackground(Color.clear)
            } else {
                ForEach(model.filteredProducts) { product in
                    ProductListRow(model: model, product: product)
                }
            }
        }
        .navigationTitle("Produkte suchen")
        .task { await model.loadIfNeeded() }
    }
}

private struct ShoppingScreen: View {
    @Bindable var model: PriceListModel

    private var products: [GroceryProduct] {
        model.products.filter { model.shoppingIDs.contains($0.id) }
    }

    var body: some View {
        Group {
            if products.isEmpty {
                ContentUnavailableView {
                    Label("Deine Liste ist noch leer", systemImage: "basket")
                } description: {
                    Text("Füge Produkte über das Plus in der Preisübersicht hinzu.")
                }
            } else {
                List {
                    ForEach(products) { product in
                        ProductListRow(model: model, product: product, showListAction: true)
                    }
                }
            }
        }
        .navigationTitle("Einkaufsliste")
    }
}

private struct FavoritesScreen: View {
    @Bindable var model: PriceListModel

    private var products: [GroceryProduct] {
        model.products.filter { model.favoriteIDs.contains($0.id) }
    }

    var body: some View {
        Group {
            if products.isEmpty {
                ContentUnavailableView {
                    Label("Noch keine Favoriten", systemImage: "heart")
                } description: {
                    Text("Speichere Produkte mit dem Herzsymbol, um sie hier wiederzufinden.")
                }
            } else {
                List {
                    ForEach(products) { product in
                        ProductListRow(model: model, product: product)
                    }
                }
            }
        }
        .navigationTitle("Favoriten")
    }
}

private struct ProfileScreen: View {
    @Bindable var model: PriceListModel

    var body: some View {
        List {
            Section("Daten") {
                LabeledContent("Modus", value: model.origin == .demo ? "Demo" : "Online")
                if let loadedAt = model.loadedAt {
                    LabeledContent("Geladen am", value: PriceFormatting.date(loadedAt))
                }
                LabeledContent("Produkte", value: "\(model.products.count)")
            }

            Section("Über Korbwert") {
                Text("Preise sind Beobachtungen aus angegebenen Quellen und können sich ändern. Quelle und Beobachtungsdatum stehen direkt beim jeweiligen Preis.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Profil")
    }
}

private struct SearchField: View {
    @Binding var text: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            TextField("Lebensmittel suchen", text: $text)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .accessibilityLabel("Suche löschen")
            }
        }
        .padding(14)
        .background(.background, in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.primary.opacity(0.08), lineWidth: 1)
        }
    }
}

private struct ProductCards: View {
    @Bindable var model: PriceListModel
    let products: [GroceryProduct]

    var body: some View {
        LazyVStack(spacing: 12) {
            ForEach(products) { product in
                ProductPriceCard(
                    product: product,
                    isFavorite: model.favoriteIDs.contains(product.id),
                    isInList: model.shoppingIDs.contains(product.id),
                    toggleFavorite: { model.toggleFavorite(product) },
                    toggleShopping: { model.toggleShopping(product) }
                )
            }
        }
    }
}

private struct ProductPriceCard: View {
    let product: GroceryProduct
    let isFavorite: Bool
    let isInList: Bool
    let toggleFavorite: () -> Void
    let toggleShopping: () -> Void

    private var prices: [PriceObservation] {
        Array(product.comparisonPrices().prefix(3))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: product.symbolName.isEmpty ? "basket" : product.symbolName)
                    .font(.title2)
                    .foregroundStyle(Color(red: 0.12, green: 0.38, blue: 0.27))
                    .frame(width: 44, height: 44)
                    .background(Color.green.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 3) {
                    Text(product.name)
                        .font(.headline)
                    Text([product.category, product.packageSize].filter { !$0.isEmpty }.joined(separator: " · "))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
                Button(action: toggleFavorite) {
                    Image(systemName: isFavorite ? "heart.fill" : "heart")
                        .foregroundStyle(isFavorite ? .red : .secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen")
            }

            if prices.isEmpty {
                Text("Noch keine vergleichbaren Preise")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(prices.enumerated()), id: \.element.id) { index, price in
                        PriceObservationRow(price: price)
                        if index < prices.count - 1 {
                            Divider().padding(.leading, 12)
                        }
                    }
                }
                .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
            }

            Button(action: toggleShopping) {
                Label(isInList ? "Auf der Einkaufsliste" : "Zur Einkaufsliste", systemImage: isInList ? "checkmark.circle.fill" : "plus.circle")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)
            .foregroundStyle(Color(red: 0.12, green: 0.38, blue: 0.27))
        }
        .padding(14)
        .background(.background, in: RoundedRectangle(cornerRadius: 18))
    }
}

private struct PriceObservationRow: View {
    let price: PriceObservation

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(price.retailer)
                    .font(.subheadline.weight(.semibold))
                Text("\(price.storeLocation) · \(price.source)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                Text("\(PriceFormatting.date(price.observedAt)) · \(PriceFormatting.freshnessText(observedAt: price.observedAt, now: .now))")
                    .font(.caption2)
                    .foregroundStyle(price.isStale(at: .now) ? .orange : .secondary)
            }
            Spacer(minLength: 4)
            VStack(alignment: .trailing, spacing: 3) {
                Text(PriceFormatting.euro(price.price))
                    .font(.headline.monospacedDigit())
                if let unitPrice = price.unitPrice, let unit = price.unit {
                    Text(PriceFormatting.unitPrice(unitPrice, unit: unit))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(12)
        .accessibilityElement(children: .combine)
    }
}

private struct ProductListRow: View {
    @Bindable var model: PriceListModel
    let product: GroceryProduct
    var showListAction = false

    private var bestPrice: PriceObservation? { product.cheapestPrice() }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: product.symbolName.isEmpty ? "basket" : product.symbolName)
                .foregroundStyle(.green)
                .frame(width: 34)
            VStack(alignment: .leading, spacing: 3) {
                Text(product.name).font(.subheadline.weight(.semibold))
                if let bestPrice {
                    Text("\(bestPrice.retailer) · \(PriceFormatting.euro(bestPrice.price))")
                        .font(.caption)
                    Text("\(bestPrice.source) · \(PriceFormatting.date(bestPrice.observedAt))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Noch kein Preis").font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            if showListAction {
                Button {
                    model.toggleShopping(product)
                } label: {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Von der Einkaufsliste entfernen")
            } else {
                Button {
                    model.toggleFavorite(product)
                } label: {
                    Image(systemName: model.favoriteIDs.contains(product.id) ? "heart.fill" : "heart")
                        .foregroundStyle(model.favoriteIDs.contains(product.id) ? .red : .secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Favorit umschalten")
            }
        }
        .padding(.vertical, 5)
    }
}
