import SwiftUI

enum AppTab: String, CaseIterable, Hashable {
    case home = "Start", search = "Suche", offers = "Angebote", list = "Liste", profile = "Profil"
}

struct RootTabView: View {
    @Bindable var model: PriceListModel
    @AppStorage(AppearancePreference.storageKey) private var appearance = AppearancePreference.system.rawValue

    var body: some View {
        TabView(selection: $model.selectedTab) {
            NavigationStack { HomeScreen(model: model) }
                .tabItem { Label("Start", systemImage: "house") }.tag(AppTab.home)
            NavigationStack { SearchScreen(model: model) }
                .tabItem { Label("Suche", systemImage: "magnifyingglass") }.tag(AppTab.search)
            NavigationStack { OffersScreen(model: model) }
                .tabItem { Label("Angebote", systemImage: "tag") }.tag(AppTab.offers)
            NavigationStack { ListScreen(model: model) }
                .tabItem { Label("Liste", systemImage: "basket") }.tag(AppTab.list)
            NavigationStack { ProfileScreen(model: model) }
                .tabItem { Label("Profil", systemImage: "person.crop.circle") }.tag(AppTab.profile)
        }
        .safeAreaInset(edge: .top, spacing: 0) { DataNotice(model: model) }
        .sheet(item: $model.selectedProduct) { product in
            ProductDetailSheet(model: model, product: product)
                .presentationDetents([.fraction(0.6), .large])
                .presentationDragIndicator(.visible)
        }
        .task { await model.loadIfNeeded() }
        .task { await model.account.observe() }
        .preferredColorScheme((AppearancePreference(rawValue: appearance) ?? .system).colorScheme)
    }
}
