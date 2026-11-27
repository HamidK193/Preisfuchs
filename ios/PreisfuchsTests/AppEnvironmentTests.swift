import PreisfuchsData
import Testing
@testable import Preisfuchs

@Suite("App-Startkonfiguration")
struct AppEnvironmentTests {
    @Test("Fehlende Backend-Konfiguration startet ohne Konto mit Demodaten")
    func missingConfigUsesDemoMode() {
        let environment = AppEnvironment.bootstrap(info: [:])

        #expect(environment.origin == .demo)
        #expect(environment.auth == nil)
    }
}
