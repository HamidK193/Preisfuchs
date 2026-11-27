import Foundation
import PreisfuchsData

struct AppEnvironment: Sendable {
    let origin: DataOrigin
    let prices: any PriceServicing
    let auth: (any PreisfuchsData.AuthClient)?

    static let demo = AppEnvironment(origin: .demo, prices: DemoPriceService(), auth: nil)

    static func live(config: AppConfig) -> AppEnvironment {
        let client = SupabaseClientProvider.makeClient(config: config)
        return AppEnvironment(
            origin: .live,
            prices: SupabasePriceService(client: client),
            auth: SupabaseAuthClient(client: client)
        )
    }

    static func bootstrap(info: [String: Any] = Bundle.main.infoDictionary ?? [:]) -> AppEnvironment {
        guard let config = AppConfig(info: info) else { return .demo }
        return .live(config: config)
    }
}
