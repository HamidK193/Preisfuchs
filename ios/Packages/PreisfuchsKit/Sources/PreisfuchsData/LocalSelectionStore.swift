import Foundation
import PreisfuchsDomain

public struct LocalSelections: Codable, Equatable, Sendable {
    public var shopping: [GroceryProduct]
    public var favorites: [GroceryProduct]
    public init(shopping: [GroceryProduct] = [], favorites: [GroceryProduct] = []) {
        self.shopping = shopping
        self.favorites = favorites
    }
}

/// JSON snapshots retain names, sources and observation dates even after an offline restart.
/// Main-actor-owned storage matches the UI model; no UserDefaults crosses actor boundaries.
@MainActor
public struct LocalSelectionStore {
    private let defaults: UserDefaults
    private let key: String

    public init(defaults: UserDefaults = .standard, namespace: String) {
        self.defaults = defaults
        key = "korbwert.selections.v1.\(namespace)"
    }

    public func load() throws -> LocalSelections {
        guard let data = defaults.data(forKey: key) else { return LocalSelections() }
        return try JSONDecoder().decode(LocalSelections.self, from: data)
    }

    public func save(_ selections: LocalSelections) throws {
        defaults.set(try JSONEncoder().encode(selections), forKey: key)
    }
}
