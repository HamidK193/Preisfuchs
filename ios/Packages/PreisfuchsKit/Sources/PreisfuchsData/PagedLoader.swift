import Foundation

public enum PagedLoader {
    public static let pageSize = 1_000
    public static let maxPages = 10

    public static func loadAll<Element: Sendable>(
        pageSize: Int = Self.pageSize,
        maxPages: Int = Self.maxPages,
        fetchPage: @Sendable (_ from: Int, _ to: Int) async throws -> [Element]
    ) async throws -> (items: [Element], truncated: Bool) {
        guard pageSize > 0, maxPages > 0 else { return ([], false) }

        var items: [Element] = []
        for page in 0..<maxPages {
            let start = page * pageSize
            let end = start + pageSize - 1
            let pageItems = try await fetchPage(start, end)
            items.append(contentsOf: pageItems)
            if pageItems.count < pageSize {
                return (items, false)
            }
        }

        return (items, true)
    }
}
