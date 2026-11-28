import PreisfuchsDomain
import SwiftUI

struct HomeScreen: View {
    @Bindable var model: PriceListModel
    @State private var showsCoverage = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Button { showsCoverage = true } label: {
                    Label("Deutschland · Standortinfo", systemImage: "mappin.and.ellipse")
                        .font(.subheadline.weight(.semibold))
                        .frame(minHeight: 44)
                }
                SearchField(text: $model.searchText)
                    .submitLabel(.search)
                    .onSubmit { model.selectedTab = .search }
                CatalogFeedback(model: model)

                if !model.products.isEmpty {
                    CategoryStrip(model: model)
                    HomeOffersSection(model: model)
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Günstig beobachtet").font(.title2.bold())
                        Text("Niedrige Packungspreise aus allen erfassten Standorten. Unterschiedliche Produkte sind nicht direkt vergleichbar.")
                            .font(.caption).foregroundStyle(.secondary)
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 280), spacing: 14)], spacing: 14) {
                            ForEach(model.lowestObservedProducts) { product in
                                ProductSelectionCard(model: model, product: product)
                            }
                        }
                    }
                } else if !model.isLoading && model.errorMessage == nil {
                    CatalogEmptyView(title: "Noch keine Beobachtungen", message: "Lade die verfügbaren Produktbeobachtungen erneut.", actionTitle: "Erneut laden") {
                        Task { await model.reload() }
                    }
                }
            }
            .padding()
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Korbwert")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await model.reload() }
        .sheet(isPresented: $showsCoverage) { LocationCoverageSheet() }
    }
}

private struct CategoryStrip: View {
    let model: PriceListModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Kategorien").font(.title2.bold())
            ScrollView(.horizontal) {
                HStack(alignment: .top, spacing: 18) {
                    ForEach(model.categories, id: \.self) { category in
                        Button { model.search(category: category) } label: {
                            VStack(spacing: 8) {
                                ProductImage(url: model.imageURL(for: category), category: category, size: 72)
                                    .clipShape(.circle)
                                Text(category).font(.caption).multilineTextAlignment(.center)
                            }
                            .frame(width: 88)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Kategorie \(category) suchen")
                    }
                }
            }
            .scrollIndicators(.hidden)
        }
        .accessibilityIdentifier("home.categories")
    }
}

private struct HomeOffersSection: View {
    let model: PriceListModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Beobachtete Angebote").font(.title2.bold())
                Spacer()
                Button("Alle") { model.selectedTab = .offers }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityLabel("Alle beobachteten Angebote")
            }
            if model.offerProducts.isEmpty {
                Text("Die Quellen melden derzeit keine vergleichbaren Angebote.")
                    .font(.subheadline).foregroundStyle(.secondary)
            } else {
                ScrollView(.horizontal) {
                    LazyHStack(alignment: .top, spacing: 14) {
                        ForEach(model.offerProducts.prefix(12)) { product in
                            ProductSelectionCard(model: model, product: product)
                                .containerRelativeFrame(.horizontal, count: 1, spacing: 14)
                        }
                    }
                    .scrollTargetLayout()
                }
                .scrollTargetBehavior(.viewAligned)
                .scrollIndicators(.hidden)
            }
        }
        .accessibilityIdentifier("home.offers")
    }
}

private struct LocationCoverageSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Label("Deutschland", systemImage: "mappin.and.ellipse")
                Text("Die Übersicht umfasst alle erfassten Beobachtungen in Deutschland. Es ist kein Standortfilter gesetzt.")
                Text("Der Ort der Beobachtung steht an jedem Preis. Preise und Verfügbarkeit können je Filiale abweichen.")
            }
            .navigationTitle("Standort der Beobachtungen")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Fertig") { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview("Start · Demo") {
    let model = PriceListModel(environment: .demo)
    NavigationStack { HomeScreen(model: model) }
        .task { await model.loadIfNeeded() }
}
