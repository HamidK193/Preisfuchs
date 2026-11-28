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

        let articleGTINs = await loadArticleGTINs(for: pageResult.items)
        let images = await loadImages(for: pageResult.items, articleGTINs: articleGTINs)
        try Task.checkCancellation()
        return PriceSnapshot(
            products: PriceProductMapper.products(from: pageResult.items, images: images, articleGTINs: articleGTINs),
            loadedAt: .now,
            truncated: pageResult.truncated,
            origin: .live
        )
    }

    private func loadArticleGTINs(for rows: [PriceRow]) async -> [ArticleGTINRow] {
        let missing = Set(rows.filter { $0.gtin == nil }.map { $0.articleId.uuidString }).sorted()
        var result: [ArticleGTINRow] = []
        for start in stride(from: 0, to: missing.count, by: 50) {
            guard !Task.isCancelled else { break }
            let batch = Array(missing[start..<min(start + 50, missing.count)])
            do {
                let response = try await client.from("catalog_articles")
                    .select("id,gtin")
                    .in("id", values: batch)
                    .execute()
                result += try PriceDecoding.makeDecoder().decode([ArticleGTINRow].self, from: response.data)
            } catch {
                // Keep the observations even when optional catalog metadata is unavailable.
                continue
            }
        }
        return result
    }

    private func loadImages(for rows: [PriceRow], articleGTINs: [ArticleGTINRow]) async -> [OffProductRow] {
        let gtins = Set(rows.compactMap(\.gtin) + articleGTINs.compactMap(\.gtin)).sorted()
        var images: [OffProductRow] = []
        var columns = OffProductRow.selectColumns
        // Bounded filters avoid oversized URLs and stay below the REST row cap.
        for start in stride(from: 0, to: gtins.count, by: 50) {
            guard !Task.isCancelled else { break }
            let batch = Array(gtins[start..<min(start + 50, gtins.count)])
            do {
                images += try await fetchImages(gtins: batch, columns: columns)
            } catch let error as PostgrestError where error.code == "42703" || error.code == "PGRST204" {
                // Older deployments have image_url only; no schema mutation is needed here.
                columns = OffProductRow.baseColumns
                if let legacy = try? await fetchImages(gtins: batch, columns: columns) { images += legacy }
            } catch {
                // Image enrichment is optional; prices remain useful without it.
                continue
            }
        }
        return images
    }

    private func fetchImages(gtins: [String], columns: String) async throws -> [OffProductRow] {
        let response = try await client.from("off_products")
            .select(columns)
            .in("gtin", values: gtins)
            .execute()
        return try PriceDecoding.makeDecoder().decode([OffProductRow].self, from: response.data)
    }
}
