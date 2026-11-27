import Foundation
import PreisfuchsData
import Testing

@Suite("PreisfuchsData-Helfer")
struct DataUtilityTests {
    @Test("FlexibleNumber liest Zahlen, Dezimalstrings und Exponentialnotation")
    func flexibleNumberDecoding() throws {
        #expect(try decodeNumber("\"5E+2\"") == Decimal(500))
        #expect(try decodeNumber("\"1E+3\"") == Decimal(1_000))
        #expect(try decodeNumber("\"2.5E-1\"") == Decimal(string: "0.25"))
        #expect(try decodeNumber("\"250\"") == Decimal(250))
        #expect(try decodeNumber("\"1.5\"") == Decimal(string: "1.5"))
        #expect(try decodeNumber("500") == Decimal(500))
    }

    @Test("Ungültige und fehlende optionale Zahlen ergeben nil")
    func flexibleNumberInvalidInput() throws {
        let decoder = JSONDecoder()
        #expect(try decoder.decode(FlexibleNumber?.self, from: Data("null".utf8)) == nil)
        #expect((try? decoder.decode(FlexibleNumber?.self, from: Data("\"abc\"".utf8))) == nil)
    }

    @Test("AppConfig verlangt einen vollständigen Supabase-Host und Anon-Key")
    func appConfigValidation() {
        #expect(AppConfig(info: [:]) == nil)
        #expect(AppConfig(info: [
            "PFSupabaseHost": "YOUR-PROJECT.supabase.co",
            "PFSupabaseAnonKey": "YOUR-ANON-KEY"
        ]) == nil)
        #expect(AppConfig(info: [
            "PFSupabaseHost": "example.supabase.co/path",
            "PFSupabaseAnonKey": "anon-example"
        ]) == nil)

        let config = AppConfig(info: [
            "PFSupabaseHost": "example.supabase.co",
            "PFSupabaseAnonKey": "anon-example"
        ])
        #expect(config?.supabaseURL.absoluteString == "https://example.supabase.co")
        #expect(config?.anonKey == "anon-example")
    }

    @Test("Leere Abfrage beendet die Paginierung")
    func emptyPageStopsLoading() async throws {
        let result = try await PagedLoader.loadAll(pageSize: 2) { from, _ in
            from == 0 ? [1, 2] : []
        }

        #expect(result.items == [1, 2])
        #expect(!result.truncated)
    }

    @Test("Letzte Teilseite wird als vollständig erkannt")
    func partialLastPageStopsLoading() async throws {
        let result = try await PagedLoader.loadAll(pageSize: 2) { from, _ in
            switch from {
            case 0: [1, 2]
            case 2: [3]
            default: []
            }
        }

        #expect(result.items == [1, 2, 3])
        #expect(!result.truncated)
    }

    @Test("Erreicht ein voller letzter Abruf das Seitenlimit, ist das Ergebnis gekürzt")
    func pageLimitMarksResultTruncated() async throws {
        let result = try await PagedLoader.loadAll(pageSize: 2, maxPages: 2) { from, _ in
            [from, from + 1]
        }

        #expect(result.items == [0, 1, 2, 3])
        #expect(result.truncated)
    }

    @Test("Ladefehler werden weitergereicht")
    func pageErrorPropagates() async {
        do {
            _ = try await PagedLoader.loadAll(pageSize: 2) { _, _ in
                throw SampleError.failed
            }
            #expect(Bool(false))
        } catch let error as SampleError {
            #expect(error == .failed)
        } catch {
            #expect(Bool(false))
        }
    }
}

private enum SampleError: Error, Equatable {
    case failed
}

private func decodeNumber(_ json: String) throws -> Decimal {
    let number = try JSONDecoder().decode(FlexibleNumber.self, from: Data(json.utf8))
    return number.value
}
