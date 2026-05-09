import SwiftUI

@main
struct PreisfuchsApp: App {
    @StateObject private var repository = PriceRepository()

    var body: some Scene {
        WindowGroup {
            ContentView(repository: repository)
        }
    }
}
