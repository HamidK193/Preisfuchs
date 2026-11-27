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
                .tint(Color(red: 0.12, green: 0.38, blue: 0.27))
        }
    }
}
