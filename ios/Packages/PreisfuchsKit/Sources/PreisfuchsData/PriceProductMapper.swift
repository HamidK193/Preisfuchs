import Foundation
import PreisfuchsDomain

public enum PriceProductMapper {
    public static func products(
        from rows: [PriceRow],
        images: [OffProductRow] = [],
        articleGTINs: [ArticleGTINRow] = []
    ) -> [GroceryProduct] {
        let imagesByGTIN = Dictionary(images.map { ($0.gtin, $0) }, uniquingKeysWith: { first, _ in first })
        let catalogGTINs = Dictionary(articleGTINs.compactMap { row in
            row.gtin.map { (row.id, $0) }
        }, uniquingKeysWith: { first, _ in first })
        return Dictionary(grouping: rows, by: \.articleId).map { articleID, observations in
            let orderedRows = observations.sorted { $0.id.uuidString < $1.id.uuidString }
            let first = orderedRows[0]
            let gtins = Set(orderedRows.compactMap(\.gtin) + [catalogGTINs[articleID]].compactMap { $0 })
            // Ambiguous article/EAN mappings must not show a different product's photo.
            let image = gtins.count == 1 ? gtins.first.flatMap { imagesByGTIN[$0] } : nil
            return GroceryProduct(
                id: articleID.uuidString,
                name: first.articleName ?? first.productId,
                category: first.productType ?? "Lebensmittel",
                packageSize: packageDescription(first.package),
                symbolName: symbolName(for: first.productType),
                prices: orderedRows.map(PriceObservation.init(row:)),
                imageURL: image?.preferredImageURL,
                imageSourceURL: image?.sourceURL,
                imageLicense: image?.preferredImageURL == nil ? nil : (image?.imageLicense ?? "CC BY-SA 3.0"),
                imageAttribution: image?.imageAttribution
            )
        }.sorted {
            let comparison = $0.name.localizedStandardCompare($1.name)
            return comparison == .orderedSame ? $0.id < $1.id : comparison == .orderedAscending
        }
    }

    private static func packageDescription(_ package: PackageInfo?) -> String {
        if let original = package?.original, !original.isEmpty { return original }
        guard let total = package?.total?.value, let unit = package?.unit else { return "Menge unbekannt" }
        return "\(NSDecimalNumber(decimal: total).stringValue) \(unit)"
    }

    private static func symbolName(for category: String?) -> String {
        switch category?.lowercased() {
        case "milch", "molkerei", "milchprodukte": "mug"
        case "obst", "gemüse", "frische": "carrot"
        case "getränke": "cup.and.saucer"
        case "backwaren", "brot": "birthday.cake"
        default: "basket"
        }
    }
}
