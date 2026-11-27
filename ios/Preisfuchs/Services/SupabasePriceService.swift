import Foundation
import PreisfuchsData
import PreisfuchsDomain
import Supabase

struct SupabasePriceService: PriceServicing {
    let client: SupabaseClient

    func loadCurrentPrices() async throws -> PriceSnapshot {
        let pageResult = try await PagedLoader.loadAll { from, to in
            let response = try await client
                .from("current_price_observations")
                .select(PriceRow.selectColumns)
                .order("id")
                .range(from: from, to: to)
                .execute()
            return try PriceDecoding.makeDecoder().decode([PriceRow].self, from: response.data)
        }

        return PriceSnapshot(
            products: makeProducts(from: pageResult.items),
            loadedAt: .now,
            truncated: pageResult.truncated,
            origin: .live
        )
    }

    private func makeProducts(from rows: [PriceRow]) -> [GroceryProduct] {
        Dictionary(grouping: rows, by: \.articleId)
            .map { entry in
                let articleId = entry.key
                let articleRows = entry.value
                let first = articleRows[0]
                return GroceryProduct(
                    id: articleId.uuidString,
                    name: first.articleName ?? first.productId,
                    category: first.productType ?? "Lebensmittel",
                    packageSize: packageDescription(first.package),
                    symbolName: symbolName(for: first.productType),
                    prices: articleRows.map(PriceObservation.init(row:))
                )
            }
            .sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
    }

    private func packageDescription(_ package: PackageInfo?) -> String {
        if let original = package?.original, !original.isEmpty { return original }
        guard let total = package?.total?.value, let unit = package?.unit else { return "Menge unbekannt" }
        return "\(NSDecimalNumber(decimal: total).stringValue) \(unit)"
    }

    private func symbolName(for productType: String?) -> String {
        return switch productType?.lowercased() {
        case "milch", "molkerei", "milchprodukte": "carton"
        case "obst", "gemüse", "frische": "leaf"
        case "getränke": "cup.and.saucer"
        default: "basket"
        }
    }
}
