# SwiftUI-Plan 01: Architektur, Build und Verteilung

Stand: 10. Oktober 2026. Teilplan zu `docs/SWIFTUI_PLAN.md`. Ziel ist eine
native SwiftUI-iOS-App „Preisfuchs“, die die Expo-App unter `mobile/` als
primäre App ablöst. `mobile/` bleibt die Feature-Referenz. Das Backend
(Supabase, Edge Function `report-price`, GitHub-Actions-Agents) bleibt
unverändert.

Fakten zu Apple, GitHub und Cloud-Anbietern sind mit Quelle und Prüfdatum
markiert. Was nicht geprüft werden konnte, steht ausdrücklich als „nicht
geprüft“ da.

---

## 1. Bestandsaufnahme `ios/Preisfuchs/`

| Teil | Befund | Bewertung |
| --- | --- | --- |
| `Preisfuchs.xcodeproj/project.pbxproj` | Von Hand erzeugt (fortlaufende IDs `1A00000100…`), `objectVersion = 56`, `IPHONEOS_DEPLOYMENT_TARGET = 17.0`, `SWIFT_VERSION = 5.0`, Bundle-ID `de.preisfuchs.app`, keine SPM-Pakete, kein Test-Target, kein Team | Nicht weiterverwenden. Auf Windows lässt sich ein `.pbxproj` nicht sicher pflegen; jede neue Datei würde manuelle IDs erfordern. |
| `PreisfuchsApp.swift` (12 Zeilen) | `@StateObject` + `ObservableObject` | Ersetzen durch `@Observable`-Ansatz |
| `Models/PriceModels.swift` (190 Zeilen) | Fachlogik: `comparisonPrices` (je Händler neueste Beobachtung pro Bedingung, dann günstigste), App-/Personalisiert-Rabatte, Gültigkeit, Veraltet-Regel (14 Tage), Formatierung de_DE | **Weiterverwenden.** Wertvollster Teil; in das Domain-Modul übernehmen und mit Unit-Tests gegen `mobile/src/lib/pricing.ts` und `docs/PRODUKT_VERGLEICHSREGELN.md` abgleichen. `normalizedRetailer` kennt nur 5 Händler, Live-Daten haben 27 – erweitern. |
| `Services/PriceRepository.swift` (79 Zeilen) | Lädt nur Demo-JSON aus dem Bundle | Als Demo-/Offline-Fallback-Implementierung des neuen `PriceRepository`-Protokolls übernehmen |
| `Views/ContentView.swift` (568 Zeilen) | Alte 3-Tab-Oberfläche (Suche, Liste, Quellen) | Nicht übernehmen; neue Screens folgen Stitch-Konzept und `docs/APP_SCREENS_PLAN.md` |
| `Resources/DemoPrices.json`, `data/standard_products.json` | Demo-Daten | Weiter als Seed/Fallback nutzen |

**Empfehlung: neu aufsetzen, Fachlogik übernehmen.** Das Projekt wird per
Projektgenerator (XcodeGen, siehe Abschnitt 4) neu erzeugt, `PriceModels.swift`
und der Demo-Loader wandern ins Domain-Modul. Der alte Stand bleibt in der
Git-Historie (`5bb5ab5`). Ort: weiterhin `ios/` (AGENTS.md und README verweisen
darauf).

---

## 2. Ziel-iOS-Version und Toolchain

- **Build-Toolchain: Xcode 26 oder neuer, iOS-26-SDK.** Seit 28. April 2026
  nimmt App Store Connect nur noch Uploads an, die mit Xcode 26+ gegen ein
  26er-SDK gebaut sind (Quelle: Apple „Upcoming Requirements“, geprüft
  10.10.2026). Das gilt auch für TestFlight-Uploads. Es begrenzt nur die
  Toolchain, nicht das Mindest-iOS der Nutzer.
- **Deployment Target: iOS 17.0 (Empfehlung).** Begründung:
  - `@Observable` (Observation), SwiftData und die neue SwiftUI-`Map`-API mit
    `Marker`/`Annotation` gibt es ab iOS 17.
  - iOS 17 läuft nur auf Geräten ab A12 (iPhone XS/XR). Damit ist der
    VisionKit-Barcode-Scanner (A12+) auf jedem unterstützten iPhone verfügbar.
  - supabase-swift verlangt mindestens iOS 16, GoogleSignIn-iOS 10.0 mindestens
    iOS 15 (beides geprüft 10.10.2026, siehe Abschnitt 5).
  - Alternative iOS 18: neuere SwiftData-Features und `Tab`-API, aber
    Kollegen mit älteren iPhones fallen raus. Offene Entscheidung (Abschnitt 11).
- **Swift 6 Sprachmodus** mit strikter Concurrency. supabase-swift 2.50+
  setzt ohnehin Swift 6.1 / Xcode 16.3 voraus.
- Nur iPhone, Hochformat (wie `mobile/app.json`). iPad später.

---

## 3. Architektur

### 3.1 Grundsätze

- SwiftUI-native Views, `@Observable`-Stores (`@MainActor`), `async/await`.
- Kein Redux/TCA, kein DI-Framework. Kleine, lesbare Schichten:

```
View  ->  Feature-Store (@Observable)  ->  Repository-Protokoll  ->  Supabase / Datei-Cache / Demo
                                      \->  Domain (reine Logik, ohne UI/Netz)
```

- Preise sind Beobachtungen: Jedes Preis-Modell trägt `source`,
  `observedAt` und Konfidenz; die UI-Komponente für einen Preis zeigt Quelle und
  Datum immer mit an (eine gemeinsame `PriceSourceLabel`-View im Design-System,
  damit es nicht vergessen werden kann).
- Keine Region fest verdrahten: Standort kommt aus PLZ/Radius bzw.
  CoreLocation, nie aus Konstanten.

### 3.2 Ordnerstruktur

```
ios/
  project.yml                     # XcodeGen-Definition (statt handgepflegtem .pbxproj)
  Config/
    Base.xcconfig                 # gemeinsame Build-Settings, include? "Secrets.xcconfig"
    Debug.xcconfig / Release.xcconfig
    Secrets.example.xcconfig      # committet, Platzhalter
    Secrets.xcconfig              # NICHT committet (.gitignore)
  Packages/PreisfuchsKit/         # lokales Swift Package
    Sources/Domain/               # Modelle, Preisvergleich, Formatierung, Regeln
    Sources/Data/                 # Supabase-Repositories, DTOs, Cache
    Tests/DomainTests/, Tests/DataTests/
  Preisfuchs/                     # App-Target
    App/                          # PreisfuchsApp, AppEnvironment, RootView, Router
    Features/
      Start/  Suche/  Produkt/  Warenkorb/  Favoriten/  Profil/
      Listen/  Einkaufsmodus/  Marktvergleich/  Markt/  Angebote/
      Scanner/  PreisMelden/  Preisalarm/  Familie/  ListeTeilen/
      Onboarding/  Auth/  Einstellungen/  Plus/  Benachrichtigungen/
    DesignSystem/                 # Farben aus docs/FARBSCHEMA.md, Typo, Komponenten
    Resources/                    # Assets, DemoPrices.json, Localizable.xcstrings
  PreisfuchsTests/                # App-nahe Unit-Tests (Stores mit Mock-Repos)
  PreisfuchsUITests/              # wenige UI-Flows
```

Die Feature-Ordner spiegeln `mobile/src/app/**`, damit die Expo-App als
Referenz Screen für Screen abgehakt werden kann.

**Warum ein lokales Package `PreisfuchsKit`?** Domain-Logik ohne UIKit/SwiftUI
kann theoretisch auch mit der Swift-Toolchain für Windows bzw. auf einem
Linux-Runner gebaut und getestet werden. Das gibt dem User auf Windows
wenigstens für die Fachlogik eine lokale Testschleife. **Nicht geprüft:** ob
`Decimal`/`NumberFormatter` mit `de_DE` unter Windows identisch formatieren und
ob supabase-swift unter Windows baut. Deshalb hängt `Domain` nicht von
supabase-swift ab; die Prüfung ist Teil des Spikes (Phase 0).

### 3.3 Repository- und Service-Schicht

Abbildung der Expo-Clients auf Swift-Protokolle (je eine Live-, Demo- und
Mock-Implementierung):

| Expo (`mobile/src/lib/`) | Swift-Protokoll | Backend |
| --- | --- | --- |
| `supabase.ts` | `SupabaseClientProvider` | `SupabaseClient` aus URL + Anon-Key |
| `prices.ts` (paginiertes Laden) | `PriceRepository` | PostgREST, View `current_price_observations` |
| `pricing.ts` | `Domain.PriceComparison` (kein Repo) | – |
| `reports.ts` | `PriceReportService` | Edge Function `report-price` (`functions.invoke`), Foto via Storage |
| `family.ts` | `HouseholdRepository` | Tabellen aus `backend/supabase/households.sql`, RLS |
| `google-auth.ts` + E-Mail-Code | `AuthService` | Supabase Auth (OTP 6 Ziffern, Google) |
| `osm.ts` | `StoreRepository` | Supabase-Filialen (OSM-Import), Overpass nur Fallback |
| `locate.ts` | `LocationService` | CoreLocation (When-In-Use) |
| `share-list.ts` | `ListShareService` | Supabase + `ShareLink`/Deep-Link |
| `inbox.ts` | `InboxRepository` | Supabase |

Details zu Tabellen, RLS und Queries stehen im Teilplan Backend-Anbindung.

### 3.4 Dependency Injection

- Ein `AppEnvironment` (Struct) hält alle Repositories/Services und wird in
  `PreisfuchsApp` einmal gebaut: `.live(config:)`, `.demo` (ohne Supabase-Config,
  wie heute in `mobile/` mit Demo-Preisen + OSM-Fallback) und `.mock` für
  Previews/Tests.
- Weitergabe per SwiftUI-`.environment(...)` an `@Observable`-Stores; Stores
  bekommen Protokolle per Initializer (testbar ohne SwiftUI).
- Kein Singleton-Zugriff aus Views heraus.

### 3.5 Offline-Cache und lokale Daten

| Daten | Speicher | Begründung |
| --- | --- | --- |
| Auth-Session | Keychain (Standard-Storage von supabase-swift auf Apple-Plattformen; im Spike bestätigen) | Tokens nicht in UserDefaults |
| Preis-Snapshot (letzte geladene Beobachtungen, Händler, Filialen) | Codable-JSON-Datei in `Caches/` mit Zeitstempel | Nur-Lese-Cache, einfach zu invalidieren; UI zeigt „Stand vom …“ |
| Einkaufslisten, Favoriten, Preisalarme (lokal), Einstellungen | SwiftData (iOS 17) | Relationale Nutzerdaten, offline änderbar |
| Ausstehende Preis-Meldungen (offline erfasst) | SwiftData-Queue, Upload bei Netz | kein Datenverlust beim Melden im Laden |
| Kleine Flags (Onboarding gesehen, PLZ, Radius) | `@AppStorage` | trivial |

Synchronisation geteilter Listen/Haushalte mit Supabase: Server ist führend,
lokal nur Cache. Konfliktregeln im Teilplan Backend-Anbindung.

### 3.6 Navigation

- **Root:** `TabView` mit den 5 Tabs der Expo-App (`mobile/src/app/(tabs)`):
  Start, Suche, Warenkorb, Favoriten, Profil.
- **Pro Tab ein `NavigationStack(path:)`** mit typisiertem `Route`-Enum
  (`Hashable`), z. B. `.produkt(id)`, `.markt(id)`, `.kategorie(id)`,
  `.liste(id)`, `.familie(id)`, `.einstellungen(...)`. Ein kleiner `Router`
  (`@Observable`) je Tab hält den Pfad, damit Deep Links und „Zurück zum Start“
  einfach sind.
- **Sheets:** Preis melden, Preisalarm anlegen, Liste teilen, Filter,
  Plus-Angebot. **`fullScreenCover`:** Barcode-Scanner, Einkaufsmodus,
  Onboarding/Login.
- **Deep Links:** `onOpenURL` für das Schema `preisfuchs://` (wie in
  `app.json`), Auth-Callback (Google über Browser) und geteilte Listen.
  Universal Links erst später (brauchen eigene Domain + Associated Domains).

---

## 4. Projektgenerierung (wichtig wegen Windows)

Auf Windows gibt es kein Xcode. Ein `.pbxproj` von Hand oder per Agent zu
pflegen ist fehleranfällig. Empfehlung:

- **XcodeGen** (Open Source, MIT): `ios/project.yml` beschreibt Targets,
  Pakete, Info.plist-Werte, Schemes. Das `.xcodeproj` wird **nicht committet**,
  sondern lokal auf dem Mac bzw. im CI mit `xcodegen generate` erzeugt.
- Neue Swift-Dateien werden über die Ordnerstruktur automatisch erfasst; auf
  Windows reicht es, Dateien anzulegen und zu pushen.
- Alternative Tuist (ebenfalls Open Source) ist mächtiger, aber für dieses
  Projekt unnötig komplex.

---

## 5. Abhängigkeiten (Swift Package Manager, nur kostenlos/Open Source)

| Paket | Zweck | Stand (geprüft 10.10.2026) | Lizenz |
| --- | --- | --- | --- |
| `supabase/supabase-swift` | Auth, PostgREST, Functions, Storage, (Realtime optional) | v2.55.3; Mindestanforderung laut v2.50.0: iOS 16, Swift 6.1, Xcode 16.3 | MIT |
| `google/GoogleSignIn-iOS` | Natives Google-Login, ID-Token an `auth.signInWithIdToken` | v10.0.0; Mindest-iOS 15; SPM unterstützt | Apache-2.0 |
| XcodeGen | Projektgenerierung (Tool, nicht in der App) | – | MIT |
| SwiftLint | Lint (Tool, nicht in der App) | – | MIT |

**Bewusst ohne Zusatzpaket (Apple-Frameworks, kostenlos):**

- **Barcode-Scan: VisionKit `DataScannerViewController`** (Empfehlung) mit
  `.barcode(symbologies: [.ean13, .ean8, .upce])`. Läuft auf A12+ (Apple-Doku),
  bei iOS-17-Target also auf allen unterstützten iPhones. Vor dem Start
  `isSupported && isAvailable` prüfen (Kamera-Erlaubnis, Bildschirmzeit).
  Liefert Hervorhebung und Tap-to-Select ohne eigenen Code.
  **AVFoundation** (`AVCaptureMetadataOutput`) nur als Fallback, falls
  `isAvailable` false ist oder Feinsteuerung nötig wird. Der Scanner läuft
  **nicht im Simulator** – für UI-Tests einen Mock-Scanner per
  `AppEnvironment` einhängen; echte Tests nur auf dem Gerät (TestFlight).
- **Karten: MapKit für SwiftUI** (`Map`, `Marker`, `MapCameraPosition`, iOS 17).
  Kostenlos, keine API-Schlüssel. Filialdaten stammen aus OSM →
  Attribution „© OpenStreetMap-Mitwirkende (ODbL)“ in der App anzeigen, wie in
  `mobile/src/lib/osm.ts`. MapLibre/OSM-Kacheln nur, falls Apple-Karten nicht
  reichen (aktuell kein Grund).
- **Fotos zum Preisschild:** `PhotosPicker` (PhotosUI) und Kamera über eine
  kleine `UIImagePickerController`-Brücke; Upload per supabase-swift Storage.
- **Standort:** CoreLocation, nur „Beim Verwenden“. Texte aus `app.json`
  übernehmen.
- **Google-Login ohne SDK (Alternative):** `auth.signInWithOAuth` über
  `ASWebAuthenticationSession` (PKCE), wie der Browser-Weg in
  `google-auth.ts`. Spart die Abhängigkeit, ist aber weniger „nativ“.
  Empfehlung: zuerst nativ mit GoogleSignIn-iOS, Browser-Weg als Rückfall.

**Hinweis App-Review (Risiko, vor App-Store-Einreichung prüfen):** Apples
Review-Richtlinie 4.8 verlangt bei Login über Drittanbieter (Google) unter
bestimmten Bedingungen eine gleichwertige datensparsame Login-Option, typisch
„Sign in with Apple“. Ob der E-Mail-Code-Login das bereits erfüllt, ist nicht
geprüft. Sign in with Apple ist im Developer Program enthalten und mit Supabase
kombinierbar. Für TestFlight intern ist das nicht relevant.

---

## 6. Konfiguration und Secrets

**Heute in `mobile/`:** `mobile/src/lib/supabase.ts` und `reports.ts` lesen
`EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` aus
`mobile/.env.local` (nicht committet, über `.gitignore` `.env`, `.env.*`,
`.env.local` ausgeschlossen). Expo bettet `EXPO_PUBLIC_*`-Werte beim Bauen in
das JS-Bundle ein. Ohne Werte läuft die App im Demo-Modus. (Die `.env`-Dateien
wurden für diesen Plan nicht gelesen.)

**SwiftUI-Äquivalent:**

1. `ios/Config/Secrets.xcconfig` (nicht committet) mit
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GOOGLE_IOS_CLIENT_ID`,
   `GOOGLE_REVERSED_CLIENT_ID`. `ios/Config/Secrets.example.xcconfig` mit
   Platzhaltern wird committet.
2. `Base.xcconfig` bindet sie optional ein: `#include? "Secrets.xcconfig"`.
3. Info.plist-Einträge per Build-Setting-Variablen
   (`SupabaseURL = $(SUPABASE_URL)`), gelesen über eine kleine
   `AppConfig`-Struktur. Fehlen sie → `AppEnvironment.demo` (gleiches Verhalten
   wie Expo).
4. Stolperfalle: In xcconfig beginnt `//` einen Kommentar. URLs daher als
   `https:/$()/xyz.supabase.co` schreiben oder Schema und Host getrennt
   ablegen.
5. `.gitignore` ergänzen um `ios/Config/Secrets.xcconfig` und
   `ios/*.xcodeproj` (generiert) – Umsetzung in Phase 0, nicht in diesem Schritt.
6. **CI:** Werte als GitHub-Actions-Secrets; der Workflow schreibt daraus
   `Secrets.xcconfig` vor dem Build. Test-Builds laufen ohne Secrets im
   Demo-Modus.

**Einordnung (ehrlich):** URL und Anon-Key sind wie bei Expo **keine echten
Geheimnisse** – sie landen im App-Binary und lassen sich auslesen. Schutz
kommt allein von RLS und der Edge Function. Das xcconfig-Verfahren verhindert
nur, dass Werte im Repo stehen und erleichtert Umgebungswechsel. Der
Service-Role-Key gehört niemals in die App.

---

## 7. Build- und Testweg vom Windows-Rechner

Grundfakt: **iOS-Apps mit Xcode bauen, signieren und im Simulator testen geht
nur auf macOS.** Es gibt keinen offiziellen Windows-Weg.

### 7.1 Optionen im Vergleich

| Weg | Kosten (geprüft 10.10.2026) | Was geht | Grenzen |
| --- | --- | --- | --- |
| **GitHub Actions `macos-26`-Runner** | Repo `HamidK193/Preisfuchs` ist öffentlich (API-Abfrage 200 ohne Login). Standard-Runner sind in öffentlichen Repos **kostenlos** (GitHub Docs). Bei privatem Repo: 0,062 USD/Min für macOS, angerechnet auf 2.000 Freiminuten/Monat (GitHub Free) | Build, Unit-/UI-Tests im Simulator, Archiv, Signieren, Upload zu TestFlight | Kein interaktives Arbeiten, keine SwiftUI-Previews, kein Debugger. Jede Änderung = Push + Wartezeit. Runner-Labels laut `actions/runner-images`: `macos-26` (= `macos-latest`, arm64), `macos-15`; `xcode-27` als Preview |
| **Xcode Cloud** | 25 Compute-Stunden/Monat **im Developer Program enthalten**; mehr ab 49,99 USD/Monat (100 h) (Apple, geprüft) | Build, Test, Upload zu TestFlight, direkt mit App Store Connect verbunden | Braucht das bezahlte Developer Program. Die **Ersteinrichtung des ersten Workflows ist laut Apple-Doku in Xcode** vorgesehen (also einmal ein Mac nötig); ob es rein über App Store Connect im Web geht, ist nicht bestätigt |
| **Gemieteter Cloud-Mac (z. B. Scaleway)** | Mac mini M4 16 GB: 0,22 €/h bzw. 149 €/Monat netto; **Mindestmietdauer 24 h** wegen Apple-Lizenz (Scaleway-FAQ). Ein Tag ≈ 5,28 € netto | Volles Xcode per Remote-Desktop: Previews, Simulator, Debugger, Gerät nur indirekt | Latenz per VNC; nach 24 h löschen nicht vergessen. MacinCloud: nur Sekundärquellen (ca. 1 USD/h Pay-as-you-go), nicht verifiziert |
| **Eigener Mac / Mac mini** | Einmalkosten, Preise vorab selbst prüfen (nicht recherchiert) | Alles, inkl. Gerät per Kabel, schnellste Schleife | Anschaffung |
| **xtool (Open Source, Linux/WSL)** | kostenlos | Baut SwiftPM-basierte SwiftUI-Apps unter WSL und installiert aufs Gerät | Laut Projekt/Berichten: keine Asset-Catalogs, die meisten Entitlements und Binär-Abhängigkeiten nicht unterstützt, Passwort-Login nutzt private Apple-APIs, braucht Xcode.xip. **Für diese App (Google-SDK, Kamera, Keychain) nicht empfohlen**, höchstens als Experiment |

### 7.2 Empfehlung

1. **Sofort, ohne Mac:** Entwickeln auf Windows, Build + Tests auf GitHub
   Actions `macos-26` (kostenlos, solange das Repo öffentlich bleibt).
   Domain-Logik zusätzlich lokal/Linux testen (Abschnitt 3.2).
2. **Für die Kollegen-Tests:** Apple Developer Program + TestFlight, Upload
   aus GitHub Actions (oder Xcode Cloud). Das ist der einzige Weg, der für
   externe Kollegen ohne Kabel und ohne Mac zuverlässig funktioniert.
3. **Für UI-Arbeit:** Ohne Previews/Simulator ist SwiftUI-Layoutarbeit über
   CI-Schleifen sehr langsam. Für die Screen-Phasen tageweise einen Cloud-Mac
   mieten (24-h-Minimum beachten) oder mittelfristig einen eigenen Mac.
   Realistisch: **ohne irgendeinen Mac-Zugang wird die Entwicklung zäh**; das
   sollte vor dem Start entschieden werden.

### 7.3 Verteilung an Tester

| Weg | Voraussetzung | Für externe Kollegen? |
| --- | --- | --- |
| **TestFlight intern** | Developer Program; Tester werden als App-Store-Connect-Nutzer ins Team eingeladen; bis 100 Personen | Ja, ohne Review; Build sofort nach Verarbeitung verfügbar |
| **TestFlight extern** | Developer Program; bis 10.000 Tester per E-Mail oder **öffentlichem Link** | Ja; **erster Build einer Gruppe braucht Beta-App-Review**, Folge-Builds evtl. nicht |
| Ad-hoc-Verteilung | Developer Program; Geräte-UDIDs vorab registrieren (begrenzte Anzahl je Jahr) | Umständlich, TestFlight ist besser |
| Kostenloser Apple-Account („Personal Team“) | Mac mit Xcode, iPhone per Kabel | **Nein.** Max. 3 Geräte, 3 Apps pro Gerät, Profile laufen nach **7 Tagen** ab (Apple, geprüft) |
| Web-App `web/` (GitHub Pages) | nichts | Ja, aber nicht die native App |

TestFlight-Fakten (Apple-Doku, geprüft 10.10.2026): Tester installieren die
kostenlose TestFlight-App und brauchen **keinen** Developer-Account; Builds
sind **90 Tage** testbar.

**Kosten:** Apple Developer Program laut Apple 99 USD/Jahr „bzw. Betrag in
Landeswährung“; in Deutschland wurden historisch 99 € genannt. Den aktuellen
Euro-Betrag zeigt Apple bei der Registrierung – vorher prüfen. Das ist eine
**Bezahlposition** und kollidiert mit der Regel „keine Bezahl-APIs“ aus
`AGENTS.md` zumindest im Geist → bewusste Entscheidung des Users nötig.

**Ehrliche Einordnung zum Expo-Problem:** Das gescheiterte Szenario war
**Expo Go** (Account-Bindung von CLI und App). TestFlight würde auch mit einem
Expo-Build (EAS) funktionieren und braucht dort genauso das Developer
Program. Der Wechsel zu SwiftUI ist also nicht nötig, um das Testproblem zu
lösen – er ist eine Produktentscheidung (native App, Apple-Frameworks). Ebenso
ehrlich: Mit SwiftUI entfällt Android.

---

## 8. CI-Workflows

### 8.1 `ios-checks.yml` (bei Push/PR auf `ios/**`)

```yaml
runs-on: macos-26            # öffentlich: kostenlos
timeout-minutes: 30
steps:
  - checkout (gepinnter SHA wie in web-checks.yml, persist-credentials: false)
  - Xcode-Version wählen (xcode-select auf Xcode 26.x des Images)
  - brew install xcodegen swiftlint   # oder als SPM-Plugin
  - swift format lint --strict -r ios/   # swift-format ist in der Xcode-Toolchain enthalten
  - swiftlint --strict
  - xcodegen generate --spec ios/project.yml
  - xcodebuild test -scheme Preisfuchs
      -destination 'platform=iOS Simulator,name=iPhone 17'   # Gerätename je nach Image prüfen
      -resultBundlePath TestResults.xcresult
  - xcresult als Artefakt hochladen
```

Ohne Secrets → Demo-Modus, Tests gegen Mock-Repositories. Optional ein
zusätzlicher `ubuntu-latest`-Job für `swift test` im `PreisfuchsKit/Domain`.

### 8.2 `ios-testflight.yml` (manuell per `workflow_dispatch` oder Tag `ios-v*`)

- Secrets: App-Store-Connect-API-Key (`.p8`, Key-ID, Issuer-ID),
  Supabase-/Google-Werte.
- `xcodebuild archive` + `-exportArchive` mit
  `-allowProvisioningUpdates -authenticationKeyPath …` (automatisches Signieren
  über API-Key) und Upload, z. B. mit fastlane (`upload_to_testflight`, MIT)
  oder `xcrun altool`. Genaue Upload-Variante im Spike festlegen und testen.
- Build-Nummer aus `github.run_number`.
- Alternative: denselben Schritt in Xcode Cloud abbilden (dann ohne eigenes
  Signatur-Handling).

### 8.3 Lint und Format

- **swift-format (Apple)** für Formatierung – kein Zusatz-Install nötig.
  SwiftFormat (nicklockwood) wäre gleichwertig; nur eines von beiden nutzen.
- **SwiftLint** für Regeln (z. B. kein `force_unwrapping`, Dateilänge).
  Konfiguration `ios/.swiftlint.yml`, `.swift-format` im Repo.

### 8.4 Tests

- **Unit-Tests (Swift Testing, `@Test`)** für Domain: Preisvergleich,
  App-Rabatte, Gültigkeit, Veraltet-Regel, Händler-Normalisierung, Formatierung
  de_DE. Testfälle aus `docs/PRODUKT_VERGLEICHSREGELN.md` und
  `mobile/src/lib/pricing.ts` übernehmen, damit iOS und Expo gleich rechnen.
- **Store-Tests** mit Mock-Repositories (Laden, Fehler, Offline-Fallback).
- **Data-Tests:** DTO-Decoding gegen gespeicherte JSON-Antworten der
  Supabase-Views (keine Live-Calls im CI).
- **UI-Tests (XCTest/XCUITest)**, wenige Kernflüsse im Demo-Modus: Onboarding
  überspringen → Produkt suchen → Detail mit sichtbarer Quelle/Datum → auf
  Liste. Scanner über Mock.

---

## 9. Phase 0 (Spike) – Vorschlag

1. Developer-Program-Entscheidung treffen (Abschnitt 11).
2. `ios/project.yml`, Config-Struktur, `.gitignore`-Ergänzung,
   `PreisfuchsKit` mit portierter `PriceModels.swift` + ersten Tests.
3. `ios-checks.yml` grün auf `macos-26`.
4. Leere TabView-App + Supabase-Verbindung (eine Abfrage auf
   `current_price_observations`) + E-Mail-Code-Login.
5. Erster TestFlight-Build an den User selbst, dann an einen Kollegen.
6. Prüfpunkte des Spikes: Keychain-Session, Upload-Weg, Domain-Tests unter
   Windows/Linux, Simulator-Gerätename im Runner-Image.

---

## 10. Risiken

- Langsame Entwicklungsschleife ohne Mac (Push → CI → TestFlight).
- `macos`-Minuten werden teuer, falls das Repo privat wird (0,062 USD/Min).
- App-Review-Anforderungen (Sign in with Apple, Datenschutzangaben,
  Privacy-Manifest) vor dem öffentlichen Release.
- Doppelpflege Expo/SwiftUI während der Übergangszeit.
- Apple ändert Toolchain-Pflichten jährlich (nächster Sprung erwartbar mit
  Xcode 27; Runner-Image `xcode-27` ist bereits als Preview gelistet).

---

## 11. Offene Entscheidungen für den User

1. **Apple Developer Program (ca. 99 €/Jahr, Betrag bei Apple prüfen)** buchen?
   Ohne geht weder TestFlight noch Xcode Cloud noch Verteilung an Kollegen.
   Ausnahme von der Regel „keine Bezahl-APIs“ in `AGENTS.md` dokumentieren?
2. **Mac-Zugang:** nur CI (kostenlos, zäh), tageweise Cloud-Mac
   (ab ca. 5,28 €/Tag netto, 24-h-Minimum) oder eigener Mac?
3. **CI-Weg:** GitHub Actions (kostenlos bei öffentlichem Repo) oder
   Xcode Cloud (25 h/Monat inklusive, Ersteinrichtung in Xcode)? Bleibt das
   Repo öffentlich?
4. **Deployment Target:** iOS 17 (Empfehlung) oder iOS 18? Welche iPhones
   haben die Kollegen?
5. **Bundle-ID:** `de.preisfuchs.app` von Expo übernehmen (Expo-App wird dann
   nicht mehr parallel in TestFlight/App Store geführt) oder neue ID für die
   Übergangszeit?
6. **Expo-App/Android:** `mobile/` einfrieren, parallel pflegen oder als
   Android-Variante behalten?
7. **TestFlight intern vs. extern:** Kollegen als App-Store-Connect-Nutzer
   einladen (kein Review) oder öffentlicher Link (Beta-Review beim ersten
   Build)?
8. **Google-Login:** natives SDK (GoogleSignIn-iOS) oder nur Browser-OAuth?
   Zusätzlich Sign in with Apple einplanen?
9. **Formatter:** Apple swift-format (Empfehlung) oder SwiftFormat?

---

## Quellen (geprüft 10.10.2026)

- Apple, SDK-Mindestanforderungen: https://developer.apple.com/news/upcoming-requirements/
- Apple, TestFlight-Überblick: https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/
- Apple, Mitgliedschaften vergleichen (Personal-Team-Grenzen): https://developer.apple.com/support/compare-memberships/
- Apple, Enrollment-Hilfe (Gebühr 99 USD bzw. Landeswährung): https://developer.apple.com/de/support/enrollment/
- Apple, Xcode Cloud: https://developer.apple.com/xcode-cloud/
- Apple, erster Xcode-Cloud-Workflow: https://developer.apple.com/documentation/xcode/configuring-your-first-xcode-cloud-workflow
- Apple, VisionKit Datenscanner: https://developer.apple.com/documentation/visionkit/scanning-data-with-the-camera
- GitHub, Actions-Abrechnung: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- GitHub, Runner-Preise: https://docs.github.com/en/billing/reference/actions-runner-pricing
- GitHub, Runner-Images: https://github.com/actions/runner-images
- Scaleway, Apple-Silicon-Preise: https://www.scaleway.com/en/pricing/apple-silicon/
- Scaleway, Apple-Silicon-FAQ (24-h-Minimum): https://www.scaleway.com/en/docs/apple-silicon/faq/
- supabase-swift Releases: https://github.com/supabase/supabase-swift/releases
- GoogleSignIn-iOS Releases: https://github.com/google/GoogleSignIn-iOS/releases
- xtool: https://github.com/xtool-org/xtool
