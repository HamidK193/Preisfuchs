import Foundation
import Supabase
import PreisfuchsData

enum SupabaseClientProvider {
    static func makeClient(config: AppConfig) -> SupabaseClient {
        SupabaseClient(
            supabaseURL: config.supabaseURL,
            supabaseKey: config.anonKey,
            options: .init(
                auth: .init(
                    flowType: .pkce,
                    autoRefreshToken: true,
                    emitLocalSessionAsInitialSession: true
                )
            )
        )
    }
}
