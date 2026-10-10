# Umsetzungsplan Phase 0: iOS-Grundgerüst (XcodeGen, PreisfuchsKit, Supabase-Spike)

Dieser Plan beruht auf `docs/SWIFTUI_PLAN.md`, den Teilplänen 01, 02 und 03, Teilplan 04 (Abschnitt 3.4 zur E-Notation), dem Code unter `ios/Preisfuchs/`, `mobile/src/lib/prices.ts`, `mobile/src/lib/pricing.ts`, `mobile/src/constants/theme.ts` und der View-Definition in `supabase/migrations/20261010202203_expire_stale_prices.sql`.

Kennzeichnung: **[Mac]** heißt, dass es nur auf dem MacBook oder dem `macos-26`-Runner geprüft werden kann. **[Linux]** heißt, dass `swift test` auf einem Ubuntu-Runner oder unter WSL reicht.

## 0. Grundentscheidungen (abweichend oder genauer als die Teilpläne)

1. **PreisfuchsKit hängt nicht von supabase-swift ab.** Kit enthält zwei Teile:
   - `PreisfuchsDomain`: reine Logik.
   - `PreisfuchsData`: DTOs, Decoding, Paginierung, Protokolle, Demo- und Mock-Implementierungen, nur mit Foundation.
   
   Alles, was supabase-swift braucht (`SupabaseClientProvider`, `SupabasePriceService`, `SupabaseAuthClient`), liegt im App-Target. So läuft der ganze Kit auf Linux. Supabase liefert nur rohe `Data`, dekodiert wird mit dem Decoder aus Kit. Damit ist auch das Decoding auf Linux testbar.
2. **Ordnernamen gleich den Target-Namen** (`Sources/PreisfuchsDomain`, nicht `Sources/Domain`). Ein Modul namens `Data` würde `Foundation.Data` verdecken.
3. **xcconfig mit Host statt URL:** `SUPABASE_HOST = xyz.supabase.co`. Das umgeht das `//`-Kommentarproblem, die URL baut `AppConfig` zusammen.
4. **`.gitignore` gezielt, nicht pauschal `*.xcconfig`.** `Base`, `Debug` und `Release` müssen committet werden.
5. **Version von supabase-swift exakt in `project.yml` pinnen** (`exactVersion: 2.55.3`). Das generierte `.xcodeproj` und damit auch `Package.resolved` sind gitignored, deshalb ersetzt der Pin die Sperrdatei.
6. **Asset-Symbol-Generierung abschalten** (`ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = NO`). Die Farbsets heißen `PF*`, damit nichts mit `Color.primary` kollidiert.
7. **Fehler im Bestandscode, die beim Portieren behoben werden:**
   - `normalizedRetailer` macht aus Aldi Nord „aldi sued“, weil die Prüfung nur auf `contains("aldi")` schaut.
   - `Calendar.current` und `Date()` sind fest im Code statt übergeben.
   - Bei „veraltet“ rechnet Swift mit 14 Tagen, Expo und Teilplan 03 mit 30. Vorschlag: 30 Tage als Konstante, die Entscheidung steht in Abschnitt 6.
   - `NumberFormatter`/`DateFormatter` als `static let` sind unter Swift 6 nicht `Sendable`. Ersatz: `FormatStyle`.
8. **Swift 6** (`SWIFT_VERSION: 6.0`, strikte Concurrency). Alle Kit-Typen sind `public`, `Sendable` und `Hashable` bzw. `Codable`.

## 1. Zielstruktur

```
ios/
  project.yml
  Config/        Base.xcconfig, Debug.xcconfig, Release.xcconfig, Secrets.example.xcconfig, (Secrets.xcconfig – ignoriert)
  Packages/PreisfuchsKit/
    Package.swift
    Sources/PreisfuchsDomain/   Sources/PreisfuchsData/(Resources/)
    Tests/PreisfuchsDomainTests/   Tests/PreisfuchsDataTests/(Fixtures/)
  Preisfuchs/    App/ Features/ DesignSystem/ Services/ Resources/Assets.xcassets
  PreisfuchsTests/
.github/workflows/ios-checks.yml
```

Was wegfällt (bleibt in der Git-Historie):
- `ios/Preisfuchs/Preisfuchs.xcodeproj/`
- `Views/ContentView.swift`
- `Services/PriceRepository.swift`
- `Resources/DemoPrices.json`, ersetzt durch `DemoPriceRows.json` im Kit

`Models/PriceModels.swift` wird in den Kit verschoben (WP1).

## 2. Arbeitspakete und Dateien

### WP0: Gerüst, Config, Projekt (zuerst, allein)

| Datei | Zweck / Inhalt | Abh. |
|---|---|---|
| `.gitignore` (Root) | Neue Einträge: `ios/Config/Secrets.xcconfig`, `ios/*.xcodeproj/`, `ios/Preisfuchs/Info.plist` (erzeugt XcodeGen), `ios/Packages/PreisfuchsKit/.build/` (deckt `.build/` schon ab) | – |
| `ios/Config/Base.xcconfig` | `SUPABASE_HOST =`, `SUPABASE_ANON_KEY =` (leer = Demo), danach `#include? "Secrets.xcconfig"` | – |
| `ios/Config/Debug.xcconfig`, `Release.xcconfig` | `#include "Base.xcconfig"`, später Unterschiede pro Konfiguration | Base |
| `ios/Config/Secrets.example.xcconfig` | Platzhalter `YOUR-PROJECT.supabase.co` / `YOUR-ANON-KEY` und der Hinweis „kopieren nach Secrets.xcconfig, nie committen, kein Service-Role-Key“ | – |
| `ios/project.yml` | Siehe Skizze unten | Config, Kit-Package.swift |
| `ios/Packages/PreisfuchsKit/Package.swift` | Wird **in WP0 vollständig** angelegt, damit WP1 und WP2 diese Datei nicht anfassen müssen | – |
| Platzhalter `Sources/*/Placeholder.swift`, `Tests/*/Placeholder.swift` | Damit SPM sofort baut; WP1/WP2 löschen sie | – |
| `git rm` alter `.xcodeproj`, `ContentView.swift`, `PriceRepository.swift`, `DemoPrices.json`; `git mv` von `PriceModels.swift` nach `Sources/PreisfuchsDomain/` | Neuer Aufbau ohne Altlasten | – |

`Package.swift` (swift-tools-version 6.0):
- `platforms: [.iOS(.v17), .macOS(.v14)]`
- Produkte: `PreisfuchsDomain`, `PreisfuchsData`
- `PreisfuchsData` hängt von `PreisfuchsDomain` ab und hat `resources: [.process("Resources")]`
- Test-Targets: `PreisfuchsDomainTests`, `PreisfuchsDataTests` (letzteres mit `resources: [.copy("Fixtures")]`)
- Keine externen Abhängigkeiten

`project.yml`:

```yaml
name: Preisfuchs
options: { bundleIdPrefix: de.preisfuchs, deploymentTarget: { iOS: "17.0" }, xcodeVersion: "26.0",
           createIntermediateGroups: true }
configFiles: { Debug: Config/Debug.xcconfig, Release: Config/Release.xcconfig }
settings: { base: { SWIFT_VERSION: "6.0", SWIFT_STRICT_CONCURRENCY: complete } }
packages:
  Supabase: { url: https://github.com/supabase/supabase-swift, exactVersion: 2.55.3 }
  PreisfuchsKit: { path: Packages/PreisfuchsKit }
targets:
  Preisfuchs:
    type: application
    platform: iOS
    sources: [Preisfuchs]
    info:
      path: Preisfuchs/Info.plist
      properties:
        CFBundleDisplayName: Preisfuchs
        PFSupabaseHost: $(SUPABASE_HOST)
        PFSupabaseAnonKey: $(SUPABASE_ANON_KEY)
        UILaunchScreen: {}
        UISupportedInterfaceOrientations: [UIInterfaceOrientationPortrait]
        CFBundleURLTypes: [{ CFBundleURLSchemes: [preisfuchs] }]
        ITSAppUsesNonExemptEncryption: false
        LSApplicationCategoryType: public.app-category.shopping
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: de.preisfuchs.app
        TARGETED_DEVICE_FAMILY: "1"
        MARKETING_VERSION: 0.1.0
        CURRENT_PROJECT_VERSION: 1
        ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS: NO
    dependencies:
      - { package: PreisfuchsKit, product: PreisfuchsDomain }
      - { package: PreisfuchsKit, product: PreisfuchsData }
      - { package: Supabase, product: Supabase }
  PreisfuchsTests:
    type: bundle.unit-test
    platform: iOS
    sources: [PreisfuchsTests]
    dependencies: [{ target: Preisfuchs }]
schemes:
  Preisfuchs:
    build: { targets: { Preisfuchs: all } }
    test:
      targets: [PreisfuchsTests, { package: PreisfuchsKit/PreisfuchsDomainTests }, { package: PreisfuchsKit/PreisfuchsDataTests }]
```

**[Mac]** zu prüfen:
- `xcodegen generate` läuft durch.
- `$(SUPABASE_HOST)` wird in der Info.plist aufgelöst.
- Die Syntax für Package-Testtargets im Scheme passt zur installierten XcodeGen-Version. Falls nicht, laufen die Kit-Tests nur per `swift test`.
- `exactVersion` der Supabase-Version löst auf.

### WP1: PreisfuchsDomain mit Tests [Linux]

| Datei | Typen / Signaturen |
|---|---|
| `Sources/PreisfuchsDomain/PriceObservation.swift` | Portierung von `PriceModels.swift`: `public struct PriceObservation: Identifiable, Codable, Hashable, Sendable`. Änderungen: `validFrom`/`validUntil: LocalDate?`, `confidence: Double?`, neue Felder `storeId: UUID?` und `sourceLicense: String?`. Weiter vorhanden: `isAppDiscount`, `priceConditionKey`, `priceRestrictionRank`, `appRequirementText`. Neu: `func isActive(at: Date, calendar: Calendar = .preisfuchs) -> Bool` und `func isStale(at: Date, maxAgeDays: Int = PricingRules.staleAfterDays) -> Bool` |
| `.../GroceryProduct.swift` | `public struct GroceryProduct`. `comparisonPrices(includeAppDiscounts:includePersonalizedDiscounts:now:calendar:) -> [PriceObservation]` und `cheapestPrice(...)` bleiben bei der Logik **1:1** |
| `.../LocalDate.swift` | `public struct LocalDate: Codable, Hashable, Comparable, Sendable { year, month, day }`. `init?(string:)` akzeptiert „yyyy-MM-dd“ oder ein ISO-Präfix, damit alte Demo-JSONs weiter dekodieren. `func endOfDay(in: Calendar) -> Date`, `func startOfDay(in: Calendar) -> Date`. Codable als String |
| `.../RetailerNormalizer.swift` | `public enum RetailerNormalizer { static func normalize(_ name: String) -> String }`. Tabelle nach `mobile/src/data/stores.ts`: Lidl, Aldi Nord, Aldi Süd, Rewe, Edeka/E-Center, Kaufland, Penny, Netto Marken-Discount, Norma. Unbekannte Namen gehen gefaltet und kleingeschrieben durch und werden **nicht verworfen** (Ziel für Phase 1). Ersetzt `normalizedRetailer` |
| `.../PricingRules.swift` | `public enum PricingRules { static let staleAfterDays = 30 }`, `extension Calendar { static let preisfuchs }` (gregorianisch, `Europe/Berlin`, `de_DE`) |
| `.../PriceFormatting.swift` | `public enum PriceFormatting`: `euro(_: Decimal) -> String`, `unitPrice(_: Decimal, unit: String) -> String`, `date(_: Date) -> String` (TT.MM.JJJJ), `freshnessText(observedAt:now:calendar:)`, `validityText(_: LocalDate?)`. Alles über `Decimal.FormatStyle.Currency` und `Date.FormatStyle` mit `de_DE`. Ersetzt die Formatter-Properties |

Tests mit Swift Testing (`@Test`):
- `ComparisonPricesTests`:
  - Fälle aus `docs/PRODUKT_VERGLEICHSREGELN.md`
  - je Händler und Bedingung die neueste Beobachtung
  - bei Gleichstand der Preis ohne App
  - App- und personalisierte Rabatte nur auf Wunsch
  - abgelaufene und noch nicht gültige Preise fallen raus
- `ValidityTests`: `validUntil` heute um 23:59 Berliner Zeit noch gültig.
- `StalenessTests`
- `RetailerNormalizerTests`: Aldi Nord ≠ Aldi Süd, „E center“ → edeka.
- `PriceFormattingTests`: Vergleich nach Normalisierung von U+00A0/U+202F zu einem Leerzeichen. Die Ausgabe unter Linux kann abweichen; das klärt der erste Linux-Lauf.

### WP2: PreisfuchsData mit Tests [Linux], parallel zu WP1

| Datei | Typen / Signaturen |
|---|---|
| `Sources/PreisfuchsData/FlexibleNumber.swift` | `public struct FlexibleNumber: Decodable, Hashable, Sendable { let value: Decimal }`. Dekodiert JSON-Zahl **oder** String. String-Pfad: zuerst `Decimal(string:locale: POSIX)`, bei Exponent bzw. Fehlschlag `Double(String)` → `Decimal`. Ungültige Werte ergeben `nil` statt eines Fehlers (`decodeIfPresent` plus `try?`) |
| `.../PriceRow.swift` | `public struct PriceRow: Decodable, Identifiable, Hashable, Sendable` nach Teilplan 03, E1, erweitert um `validFrom`, `unitPrice`, `unit`, `couponActivationRequired`, `discountDescription`, `confidence`, `region`. Dazu `public struct PackageInfo { unit: String?; total: FlexibleNumber?; original: String? }`, `public static let selectColumns: String` (feste Spaltenliste, alle laut View vorhanden), `var gtin: String?` (aus `comparison_key` oder `product_id`) |
| `.../PriceRow+Observation.swift` | `extension PriceObservation { public init(row: PriceRow) }` (Quelle „Preisfuchs Nutzermeldung“ → „Community“) |
| `.../PriceDecoding.swift` | `public enum PriceDecoding { static func makeDecoder() -> JSONDecoder }`: `.convertFromSnakeCase`, eigene Datumsstrategie (ISO 8601 mit 0 bis 6 Nachkommastellen und Offset `+00:00`), Preise als `Decimal` über `String(describing: Double)` |
| `.../PagedLoader.swift` | `public enum PagedLoader { static let pageSize = 1000, maxPages = 10; static func loadAll<T: Sendable>(pageSize: Int = 1000, maxPages: Int = 10, fetchPage: @Sendable (_ from: Int, _ to: Int) async throws -> [T]) async throws -> (items: [T], truncated: Bool) }`. Seiten nacheinander, Abbruch bei einer Seite mit weniger als `pageSize` Zeilen |
| `.../PriceServicing.swift` | `public protocol PriceServicing: Sendable { func loadCurrentPrices() async throws -> PriceSnapshot }`; `public struct PriceSnapshot: Codable, Sendable { rows: [PriceRow]; loadedAt: Date; truncated: Bool; origin: DataOrigin }`; `public enum DataOrigin: String, Codable { live, cached, demo }` (`PriceRow` zusätzlich `Encodable` für den späteren Cache) |
| `.../DemoPriceService.swift`, `Resources/DemoPriceRows.json` | `public struct DemoPriceService: PriceServicing`, lädt über `Bundle.module`. Etwa 10 Zeilen im View-Format, abgeleitet aus dem alten `DemoPrices.json`, einschließlich `"total": "5E+2"` |
| `.../AppConfig.swift` | `public struct AppConfig: Sendable, Equatable { supabaseURL: URL; anonKey: String; static func from(info: [String: Any]) -> AppConfig? }`. Gibt `nil` zurück, wenn ein Wert leer ist, `$(` oder `YOUR-` enthält oder der Host ungültig ist |
| `.../Auth/AuthClient.swift` | `public protocol AuthClient: Sendable { func sendEmailCode(to: String) async throws; func verifyEmailCode(email: String, code: String) async throws -> AuthUser; func signOut() async throws; func authStateStream() -> AsyncStream<AuthUser?> }`; `public struct AuthUser: Sendable, Equatable { id: UUID; email: String? }`; `public enum AuthFailure: Error { invalidCode, expired, rateLimited, network, unknown(String) }` mit `userMessage` (deutsch) |
| `.../Auth/LoginInput.swift` | `public enum LoginInput { static func normalizedEmail(_: String) -> String?; static func isValidCode(_: String) -> Bool }` (`^\d{6}$`) |
| `.../Mocks/MockPriceService.swift`, `MockAuthClient.swift` | Für Previews und App-Tests (Kit ist `public`, die App importiert die Mocks) |

Tests:
- `FlexibleNumberTests`: `"5E+2"`→500, `"1E+3"`→1000, `"2.5E-1"`→0,25, `"250"`, `"1.5"`, Zahl 500, `null`, `"abc"`→nil.
- `PriceRowDecodingTests`: `Fixtures/current_price_observations_page.json` mit 6 Nachkommastellen, Preis 0.79 exakt als `Decimal`, Nullfeldern und E-Notation.
- `PagedLoaderTests`: Fälle 0, 1000+0, 2500, Limit erreicht → `truncated`, Fehler wird weitergereicht.
- `AppConfigTests`
- `LoginInputTests`
- `ObservationMappingTests`: hängt von WP1 ab, zuletzt schreiben.

### WP3: Designsystem (nur App-Dateien), parallel

| Datei | Inhalt |
|---|---|
| `ios/Preisfuchs/Resources/Assets.xcassets/Contents.json`, `AppIcon.appiconset/` | Aus dem Altbestand verschoben |
| `.../Assets.xcassets/Colors/PF{Primary,PrimaryPressed,PrimarySoft,Deal,Saving,SavingText,SavingSoft,Fox,Tile,Border,Warning,Danger}.colorset/Contents.json` | Any/Dark mit Hex-Werten aus `theme.ts` bzw. Teilplan 02, 4.1. Dunkle Werte vorläufig, z. B. Primary dunkel `#FF4A50` |
| `ios/Preisfuchs/DesignSystem/ColorTokens.swift` | `extension Color { static let pfPrimary = Color("PFPrimary") … }`, Namen in `enum ColorToken: String, CaseIterable` |
| `.../DesignSystem/Metrics.swift` | `enum Spacing { xs=4, s=8, m=12, l=16, xl=24, xxl=32 }`, `enum Radius { static let card: CGFloat = 5 }` (offene Entscheidung 5 oder 16), `extension Font { static let pfPrice }` |
| `ios/PreisfuchsTests/ColorTokenTests.swift` | Jedes `ColorToken` muss sich per `UIColor(named:)` laden lassen |

**[Mac]** zu prüfen: Asset-Catalog kompiliert, Dark-Mode-Darstellung, Kontrast.

### WP4: App-Shell mit TabView, parallel zu WP3 und WP5

| Datei | Inhalt |
|---|---|
| `ios/Preisfuchs/App/PreisfuchsApp.swift` | `@main struct PreisfuchsApp: App`. `@State private var environment = AppEnvironment.bootstrap()`, `@State private var auth: AuthModel`. Body: `RootView().environment(\.appEnvironment, environment).environment(auth)` |
| `.../App/RootView.swift` | Phase 0: direkt `MainTabView()`. Später kommen Onboarding und Standort dazu (Teilplan 02, 3.1) |
| `.../App/MainTabView.swift` | `TabView(selection: $router.selectedTab)` mit `.tabItem` und `.tag`, iOS 17, keine `Tab`-API. Je Tab ein `NavigationStack` |
| `.../App/AppTab.swift` | `enum AppTab: Hashable, CaseIterable { start, suche, warenkorb, favoriten, profil }` mit `title` und `systemImage` (house, magnifyingglass, basket, heart, person) |
| `.../App/Router.swift` | `@MainActor @Observable final class Router { var selectedTab: AppTab = .start }`. Pfade und `Route` erst in Phase 1 |
| `.../Features/{Start,Suche,Warenkorb,Favoriten,Profil}/<Name>View.swift` | Platzhalter mit `ContentUnavailableView` und `#Preview` |

### WP5: Services und DI im App-Target (braucht die WP2-Protokolle)

| Datei | Inhalt |
|---|---|
| `ios/Preisfuchs/Services/SupabaseClientProvider.swift` | `enum SupabaseClientProvider { static func makeClient(config: AppConfig) -> SupabaseClient }` mit `options: .init(auth: .init(flowType: .pkce, autoRefreshToken: true, emitLocalSessionAsInitialSession: true))`. Kein globaler Singleton, die Instanz gehört dem `AppEnvironment` |
| `.../Services/SupabasePriceService.swift` | `struct SupabasePriceService: PriceServicing { let client: SupabaseClient }`. Ablauf: `PagedLoader.loadAll { from, to in try await client.from("current_price_observations").select(PriceRow.selectColumns).order("id").range(from: from, to: to).execute().data }`, dekodiert mit `PriceDecoding.makeDecoder()`. Ein `os.Logger` meldet, wenn `truncated` |
| `.../Services/SupabaseAuthClient.swift` | `struct SupabaseAuthClient: AuthClient`: `signInWithOTP(email:shouldCreateUser: true)`, `verifyOTP(email:token:type: .email)`, `signOut()`. `authStateChanges` wird auf `AsyncStream<AuthUser?>` abgebildet. Supabase-`AuthError` wird auf `AuthFailure` abgebildet |
| `.../App/AppEnvironment.swift` | `struct AppEnvironment: Sendable { let origin: DataOrigin; let prices: any PriceServicing; let auth: (any AuthClient)? }`. Fabriken: `static func live(config: AppConfig)`, `static let demo` (`DemoPriceService`, `auth = nil`), `static let mock`, `static func bootstrap(info: [String: Any] = Bundle.main.infoDictionary ?? [:])` (Config vorhanden → live, sonst demo). Dazu `extension EnvironmentValues { @Entry var appEnvironment: AppEnvironment = .mock }` |
| `.../Features/Auth/AuthModel.swift` | `@MainActor @Observable final class AuthModel`. `enum State: Equatable { unavailable, signedOut, codeSent(email: String), signedIn(AuthUser) }`, `private(set) var state`, `isBusy`, `errorMessage`. `init(client: (any AuthClient)?)`. Methoden: `func observe() async`, `func sendCode(to: String) async`, `func verify(code: String) async`, `func signOut() async` |
| `ios/PreisfuchsTests/AuthModelTests.swift`, `AppEnvironmentTests.swift` | Mit `MockAuthClient`: Code darf nur mit genau 6 Ziffern abgeschickt werden, Zustandsfolge, Fehlertexte. Ohne Config → `.demo` |

**[Mac]** zu prüfen:
- Genaue supabase-swift-Signaturen in 2.55.3: `execute().data`, `emitLocalSessionAsInitialSession`, die Form von `authStateChanges`.
- Session liegt im Keychain und überlebt einen Neustart.
- OTP-Mail kommt an, und der 6-stellige Code meldet an.

### WP6: Spike-Verdrahtung (nach WP4 und WP5, fasst deren Views an)

- `Features/Start/StartView.swift` + `StartModel.swift`: `@Observable` mit `load()` über `environment.prices`. Zeigt Anzahl der Zeilen, Herkunft (live/demo, Demo deutlich gekennzeichnet), „Stand: TT.MM.JJJJ“ und die ersten 20 Zeilen mit Quelle und Datum. Keine Wörter wie „Live“ oder „Echtzeit“ im UI-Text.
- `Features/Profil/ProfilView.swift` + `Features/Auth/LoginSheet.swift`:
  - E-Mail-Feld
  - Codefeld mit `.textContentType(.oneTimeCode)`, `.keyboardType(.numberPad)`, gefiltert auf 6 Ziffern
  - Hinweis „Nur nötig zum Teilen und Synchronisieren“
  - Abmelden
  - Im Demo-Modus Login ausblenden (`state == .unavailable`)

### WP7: CI (nach WP0, parallel zu WP1–WP6)

`.github/workflows/ios-checks.yml`, ausgelöst bei Änderungen unter `ios/**`. Actions per SHA pinnen wie in `web-checks.yml`, `persist-credentials: false`.
- **Job `kit-linux`:** `ubuntu-latest`, Container `swift:6.1`, `swift test --package-path ios/Packages/PreisfuchsKit`. Das ist die schnelle Testschleife ohne Mac.
- **Job `app-macos`:** `macos-26`, Xcode 26 wählen, `brew install xcodegen`, `xcodegen generate --spec ios/project.yml`, dann `xcodebuild test -scheme Preisfuchs -destination 'platform=iOS Simulator,name=iPhone 17'`. Der Gerätename hängt vom Image ab, deshalb vorher `xcrun simctl list` ausgeben lassen. Das `.xcresult` als Artefakt hochladen. Ohne Secrets läuft das im Demo-Modus.

### WP8: Dokumentation (zum Schluss)

- `README.md`, `memory.md`, `CHANGELOG.md` (Pflicht laut AGENTS.md).
- In `SWIFTUI_PLAN.md`, „Start auf dem MacBook“, Schritt 4 auf `SUPABASE_HOST` anpassen. Teilplan 03 nennt außerdem den falschen Pfad `ios/Preisfuchs/Config/`; das korrigieren.

## 3. Reihenfolge und Parallelität

```
WP0 ──┬── WP1 (Domain) ──┐
      ├── WP2 (Data) ────┴─(Mapping-Test)─┐
      ├── WP3 (Design)                    ├── WP5 (Services/DI) ── WP6 (Spike) ── WP8
      ├── WP4 (Shell) ────────────────────┘
      └── WP7 (CI)
```

Dateizuständigkeit, ohne Überschneidung:
- **WP1:** `Sources/PreisfuchsDomain/**`, `Tests/PreisfuchsDomainTests/**`
- **WP2:** `Sources/PreisfuchsData/**`, `Tests/PreisfuchsDataTests/**`
- **WP3:** `Resources/Assets.xcassets/**`, `DesignSystem/**`, `PreisfuchsTests/ColorTokenTests.swift`
- **WP4:** `App/{PreisfuchsApp,RootView,MainTabView,AppTab,Router}.swift`, `Features/*/…View.swift`
- **WP5:** `Services/**`, `App/AppEnvironment.swift`, `Features/Auth/AuthModel.swift`, `PreisfuchsTests/{Auth,AppEnvironment}*`
- **WP7:** `.github/workflows/ios-checks.yml`

Konflikte und Absprachen:
- `Package.swift` und `project.yml` gehören **nur WP0**.
- `PreisfuchsApp.swift` legt WP4 an. WP5 hängt `AppEnvironment` und `AuthModel` in einem kleinen, abgesprochenen Schritt danach ein, oder WP4 legt dafür vorab `.mock`-Platzhalter an.
- Die Signatur `PriceObservation` aus WP1 (Abschnitt 2) ist der Vertrag für WP2; `PriceObservation(row:)` wird erst gemergt, wenn WP1 fertig ist.

Kritischer Pfad: WP0 → WP2 → WP5 → WP6 → grüner `app-macos`-Lauf.

## 4. Was wo verifiziert werden kann

| Prüfung | Windows | Linux-CI/WSL | Mac/macos-26 |
|---|---|---|---|
| Domain- und Data-Tests (`swift test`) | nur mit Swift für Windows (nicht geprüft) | ja | ja |
| de_DE-Formatierung identisch zu iOS | – | nur eingeschränkt | **ja** |
| `xcodegen generate`, Info.plist-Variablen, Scheme | – | – | **ja** |
| App-Build, Asset-Catalog, Previews | – | – | **ja** |
| supabase-swift-API und -Version, Abfrage auf `current_price_observations` | – | – | **ja** (Simulator mit `Secrets.xcconfig`) |
| OTP-Login, Keychain-Session, Neustart | – | – | **ja** (Simulator/Gerät; SMTP-Limit beachten) |
| TestFlight | – | – | **ja** + Developer Program |

## 5. Risiken

- Die XcodeGen-Syntax für Package-Testtargets im Scheme kann abweichen. Rückfall: Kit-Tests nur per `swift test` in CI.
- Unter Linux formatiert Foundation Währungen eventuell anders. Rückfall: Formatierungstests mit `.enabled(if:)` nur auf Apple-Plattformen laufen lassen.
- `@Entry` braucht Xcode 16+. Das ist gegeben, aber erst auf dem Mac geprüft.
- Weil das `.xcodeproj` gitignored ist, fehlt `Package.resolved`. `exactVersion` in `project.yml` gleicht das aus.

## 6. Offene Entscheidungen, die diesen Plan berühren

- Veraltet-Grenze: 30 Tage (Expo) oder 14 Tage (alter Swift-Code)? Vorschlag: 30.
- Eckenradius 5 oder 16 (`Radius.card`).
- Dunkle Farbwerte endgültig festlegen.
- Bundle-ID `de.preisfuchs.app` übernehmen? Vorgesehen ist ja.

### Critical Files for Implementation
- A:\Codex\Preisfuchs\ios\project.yml (neu)
- A:\Codex\Preisfuchs\ios\Packages\PreisfuchsKit\Package.swift (neu)
- A:\Codex\Preisfuchs\ios\Preisfuchs\Preisfuchs\Models\PriceModels.swift (Quelle der Portierung)
- A:\Codex\Preisfuchs\mobile\src\lib\prices.ts (Referenz für Paginierung, Spalten und Package-Parsing)
- A:\Codex\Preisfuchs\supabase\migrations\20261010202203_expire_stale_prices.sql (aktuelle View-Spalten von `current_price_observations`)
- A:\Codex\Preisfuchs\.gitignore
