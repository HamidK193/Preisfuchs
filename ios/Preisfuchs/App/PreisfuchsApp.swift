import SwiftUI

@main
struct PreisfuchsApp: App {
    @State private var model: PriceListModel

    init() {
        _model = State(initialValue: PriceListModel(environment: .bootstrap()))
    }

    var body: some Scene {
        WindowGroup {
            RootTabView(model: model)
                .tint(.primary)
        }
    }
}
