import PreisfuchsDomain
import SwiftUI

@MainActor
struct ProductImage: View {
    let url: URL?
    let category: String
    var size: CGFloat = 72

    var body: some View {
        Group {
            if let url, let cached = ProductImageCache.shared.image(for: url) {
                cached.resizable().scaledToFit()
            } else if let url {
                AsyncImage(url: url) { phase in
                    if case .success(let image) = phase {
                        image.resizable().scaledToFit()
                            .onAppear { ProductImageCache.shared.insert(image, for: url) }
                    } else {
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .background(Color.secondary.opacity(0.07), in: RoundedRectangle(cornerRadius: 12))
        .clipped()
        .accessibilityHidden(true)
    }

    private var placeholder: some View {
        Image(systemName: CategorySymbol.name(for: category))
            .font(.system(size: size * 0.38))
            .foregroundStyle(.secondary)
    }
}

enum CategorySymbol {
    static func name(for category: String) -> String {
        let value = category.lowercased()
        if value.contains("milch") || value.contains("molkerei") { return "mug" }
        if value.contains("obst") || value.contains("frucht") { return "leaf" }
        if value.contains("gemüse") || value.contains("frische") { return "carrot" }
        if value.contains("getränk") { return "cup.and.saucer" }
        if value.contains("brot") || value.contains("back") { return "birthday.cake" }
        if value.contains("fleisch") || value.contains("fisch") { return "fish" }
        if value.contains("tiefkühl") { return "snowflake" }
        return "basket"
    }
}

/// iOS 17-compatible, bounded session cache. Only the main actor reads/writes Images.
@MainActor
private final class ProductImageCache {
    static let shared = ProductImageCache()
    private var images: [URL: Image] = [:]
    private var insertionOrder: [URL] = []

    func image(for url: URL) -> Image? { images[url] }

    func insert(_ image: Image, for url: URL) {
        guard images[url] == nil else { return }
        if insertionOrder.count >= 80 {
            images.removeValue(forKey: insertionOrder.removeFirst())
        }
        images[url] = image
        insertionOrder.append(url)
    }
}

#Preview("Kategorie-Platzhalter") {
    ProductImage(url: nil, category: "Gemüse")
}
