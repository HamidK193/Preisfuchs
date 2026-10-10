# CI- und Build-Plan für Phase 0 (iOS)

**Kurz:** Den Teil für Simulator, Tests und Lint kann `ios-checks.yml` sofort auf `macos-26` übernehmen. TestFlight bleibt als Skizze abgeschaltet, bis das Apple Developer Program gebucht ist. Auf diesem Windows-Rechner ist weder Swift noch actionlint installiert, deshalb ist hier noch nichts lokal gebaut oder validiert. Die Recherche lief am 10.10.2026.

## 0. Geprüfte Fakten

| Punkt | Stand | Quelle |
|---|---|---|
| Runner `macos-26` (arm64) | Image `20260907.0351.1`; Xcode 26.6 (Standard), 26.5, 26.4.1, 26.3, 26.2, 26.1.1, 26.0.1 unter `/Applications/Xcode_26.x.app` | runner-images `macos-26-arm64-Readme.md` |
| Simulator-Laufzeiten | iOS 26.2, 26.4, 26.5. Eine 26.6-Laufzeit ist nicht gelistet. `iPhone 17` gibt es in allen dreien | dito |
| Vorinstalliert | SwiftFormat 0.63.0 (nicklockwood). **Nicht** gelistet: xcodegen, swiftlint, swift-format (Apple) | dito |
| `actions/cache` | v6.1.0 = `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` | Releases-Seite |
| `actions/upload-artifact` | v7.0.2 = `cf430e030ddbb5b0abf93d22962f4752f3646cd9` (07.10.) | Releases-Seite |
| `actions/checkout` | v5.1.0 = `fbc6f399…` (schon im Repo in Gebrauch) | `web-checks.yml` |
| XcodeGen | 2.46.0 (16.07.; das Jahr steht nicht auf der Seite), Installation per `brew` | Releases-Seite |
| SwiftLint | 0.65.1 (21.08.2026) | Releases-Seite |
| Swift für Windows | 6.4.0, Installation per `winget install --id Swift.Toolchain -e`. Vorher braucht es VS 2022 mit Windows 11 SDK 22621 und den VC-Tools | swift.org/install/windows |

**Ungeprüft (wird im ersten CI-Lauf bestätigt):**
- `xcrun swift-format` ist seit Xcode 16 in der Toolchain enthalten. Das weiß ich, im Image steht es aber nicht.
- Ob `OS=latest` mit Xcode 26.6 auf die Laufzeit 26.5 aufgelöst wird.
- Ob `swift test` und Swift Testing unter Windows für das Kit laufen.

## 1. `.github/workflows/ios-checks.yml`

Voraussetzungen im Repo (stammen aus Phase 0, Schritt 2):
- `ios/Config/Base.xcconfig` enthält `#include? "Secrets.xcconfig"`.
- `.gitignore` enthält `ios/Config/Secrets.xcconfig`, `ios/*.xcodeproj` und `ios/.spm/`.
- `PreisfuchsKit/Package.swift` deklariert **zusätzlich `.macOS(.v14)`**. Sonst kann `swift test` auf dem Mac-Host Observation und SwiftData nicht bauen.
- Die Paketversionen in `project.yml` stehen mit `exactVersion`. Das generierte `Package.resolved` wird nicht committet, und ohne feste Versionen würden sie im CI schwanken.

```yaml
name: iOS checks

on:
  pull_request:
    paths: ["ios/**", ".github/workflows/ios-checks.yml"]
  push:
    branches: [main]
    paths: ["ios/**", ".github/workflows/ios-checks.yml"]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ios-checks-${{ github.ref }}
  cancel-in-progress: true

env:
  XCODE_APP: /Applications/Xcode_26.6.app   # bewusst gepinnt, Image-Default kann wechseln
  SIM_DEST: "platform=iOS Simulator,name=iPhone 17,OS=latest"  # UNGEPRUEFT: OS=latest -> 26.5?

jobs:
  checks:
    runs-on: macos-26
    timeout-minutes: 30
    defaults:
      run:
        working-directory: ios
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0
        with:
          persist-credentials: false

      - name: Select Xcode
        run: |
          sudo xcode-select -s "$XCODE_APP"
          xcodebuild -version
          xcrun simctl list devices available | grep -E "iPhone 17 " || true

      - name: Install tools
        run: brew install xcodegen swiftlint

      - name: Format check (swift-format)
        run: xcrun swift-format lint --strict --recursive --parallel Preisfuchs Packages PreisfuchsTests

      - name: Lint (SwiftLint)
        run: swiftlint lint --strict --config .swiftlint.yml

      - name: Dummy secrets (demo mode)
        # Keine echten Werte im Check-Lauf: leere Werte -> AppEnvironment.demo
        run: cp Config/Secrets.example.xcconfig Config/Secrets.xcconfig

      - name: Cache SwiftPM
        uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        with:
          path: |
            ios/.spm
            ios/Packages/PreisfuchsKit/.build
          key: spm-${{ runner.os }}-xcode26.6-${{ hashFiles('ios/project.yml', 'ios/Packages/**/Package.swift', 'ios/Packages/**/Package.resolved') }}
          restore-keys: spm-${{ runner.os }}-xcode26.6-

      - name: Test PreisfuchsKit (swift test)
        run: swift test --package-path Packages/PreisfuchsKit --parallel

      - name: Generate Xcode project
        run: xcodegen generate --spec project.yml

      - name: Build and unit-test app (simulator, unsigned)
        run: |
          set -o pipefail
          xcodebuild test \
            -project Preisfuchs.xcodeproj -scheme Preisfuchs \
            -destination "$SIM_DEST" \
            -only-testing:PreisfuchsTests \
            -clonedSourcePackagesDirPath .spm \
            -resultBundlePath TestResults.xcresult \
            CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
            | tee xcodebuild.log

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: ios-test-results
          path: |
            ios/TestResults.xcresult
            ios/xcodebuild.log
          retention-days: 7
```

Begründungen:
- **Kein DerivedData-Cache.** Der wäre groß und fehleranfällig. Gecacht werden nur die SPM-Checkouts. Dafür schreibt `-clonedSourcePackagesDirPath` sie an einen festen Ort.
- **Brew nicht cachen.** Die Installation dauert etwa eine Minute, ein Cache wäre umständlicher.
- **`swift test` vor `xcodegen`**, damit Fehler in der Fachlogik schnell auffallen.
- **UI-Tests (`PreisfuchsUITests`) noch nicht.** Sie kommen erst mit Phase 1 dazu.
- **`CODE_SIGNING_ALLOWED=NO` für den Simulator:** Falls ein Keychain-Entitlement den Test-Host stört, die drei Overrides weglassen. Der Simulator signiert dann ad hoc und braucht kein Team. Ungeprüft.
- **Fehlende Secrets:** Der Check-Workflow nutzt bewusst **nie** Secrets. Bei PRs aus Forks wären sie ohnehin leer. Das kopierte Beispiel-xcconfig macht den Demo-Modus ausdrücklich. Dank `#include?` würde der Build auch ganz ohne Datei laufen.
- **Formatter-Entscheidung:** SwiftFormat ist im Image schon vorinstalliert. Wird das offene Thema 9 aus Teilplan 01 so entschieden, entfällt der Formatter-Schritt mit `swift-format` zugunsten von `swiftformat --lint .`.

## 2. Skizze `ios-testflight.yml` (abgeschaltet)

Es gibt nur einen manuellen Trigger. Zusätzlich muss die Repo-Variable `IOS_TESTFLIGHT_ENABLED` auf `true` stehen, solange gilt, dass der Lauf übersprungen wird. Damit kann der Workflow nicht versehentlich ohne Developer Program laufen.

**Secrets:**

| Secret | Inhalt |
|---|---|
| `ASC_KEY_ID`, `ASC_ISSUER_ID` | App-Store-Connect-API-Key. Rolle „Admin“ oder „App Manager“; welche Rolle für Cloud-Signierung reicht, ist ungeprüft |
| `ASC_KEY_P8_BASE64` | `.p8`-Datei als Base64 |
| `APPLE_TEAM_ID` | Team-ID des Developer-Kontos des Users (nicht des Kollegen) |
| `SUPABASE_URL_HOST`, `SUPABASE_ANON_KEY`, `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_REVERSED_CLIENT_ID` | Echte App-Konfiguration |

**Empfehlung: automatische, cloud-verwaltete Signierung** über den API-Key (`-allowProvisioningUpdates`). Damit braucht es kein `.p12` und kein `.mobileprovision` in den Secrets. Die manuelle Variante bleibt Rückfall, falls das nicht klappt; sie bräuchte zusätzlich `DIST_CERT_P12_BASE64`, `DIST_CERT_PASSWORD`, `PROFILE_BASE64` und einen temporären Keychain.

```yaml
name: iOS TestFlight
on:
  workflow_dispatch:
permissions: { contents: read }
concurrency: { group: ios-testflight, cancel-in-progress: false }
jobs:
  upload:
    if: vars.IOS_TESTFLIGHT_ENABLED == 'true'
    runs-on: macos-26
    timeout-minutes: 45
    defaults: { run: { working-directory: ios } }
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0
        with: { persist-credentials: false }
      - run: sudo xcode-select -s /Applications/Xcode_26.6.app && brew install xcodegen
      - name: Write secrets and API key
        env:
          SUPABASE_URL_HOST: ${{ secrets.SUPABASE_URL_HOST }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          GOOGLE_IOS_CLIENT_ID: ${{ secrets.GOOGLE_IOS_CLIENT_ID }}
          GOOGLE_REVERSED_CLIENT_ID: ${{ secrets.GOOGLE_REVERSED_CLIENT_ID }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          ASC_KEY_P8_BASE64: ${{ secrets.ASC_KEY_P8_BASE64 }}
        run: |
          {
            echo "SUPABASE_URL = https:/\$()/$SUPABASE_URL_HOST"
            echo "SUPABASE_ANON_KEY = $SUPABASE_ANON_KEY"
            echo "GOOGLE_IOS_CLIENT_ID = $GOOGLE_IOS_CLIENT_ID"
            echo "GOOGLE_REVERSED_CLIENT_ID = $GOOGLE_REVERSED_CLIENT_ID"
            echo "DEVELOPMENT_TEAM = $APPLE_TEAM_ID"
          } > Config/Secrets.xcconfig
          echo "$ASC_KEY_P8_BASE64" | base64 --decode > "$RUNNER_TEMP/asc.p8"
      - run: xcodegen generate --spec project.yml
      - name: Archive
        run: |
          xcodebuild archive -project Preisfuchs.xcodeproj -scheme Preisfuchs \
            -configuration Release -destination "generic/platform=iOS" \
            -archivePath "$RUNNER_TEMP/Preisfuchs.xcarchive" \
            CURRENT_PROJECT_VERSION=${{ github.run_number }} \
            -allowProvisioningUpdates \
            -authenticationKeyPath "$RUNNER_TEMP/asc.p8" \
            -authenticationKeyID "${{ secrets.ASC_KEY_ID }}" \
            -authenticationKeyIssuerID "${{ secrets.ASC_ISSUER_ID }}"
      - name: Export and upload   # ExportOptions.plist: method=app-store-connect, destination=upload (UNGEPRUEFT)
        run: |
          xcodebuild -exportArchive -archivePath "$RUNNER_TEMP/Preisfuchs.xcarchive" \
            -exportOptionsPlist Config/ExportOptions.plist -exportPath "$RUNNER_TEMP/export" \
            -allowProvisioningUpdates -authenticationKeyPath "$RUNNER_TEMP/asc.p8" \
            -authenticationKeyID "${{ secrets.ASC_KEY_ID }}" \
            -authenticationKeyIssuerID "${{ secrets.ASC_ISSUER_ID }}"
      - if: always()
        run: rm -f "$RUNNER_TEMP/asc.p8" Config/Secrets.xcconfig
```

Vor der Aktivierung gibt es einmalig Handarbeit:
1. App-Eintrag in App Store Connect anlegen.
2. Bundle-ID registrieren (offene Entscheidung 5 in Teilplan 01).
3. API-Key erzeugen.
4. Den Upload über `destination=upload` im Spike prüfen. Rückfall ist fastlane `upload_to_testflight`.

Das Secret mit dem Host für die Supabase-URL umgeht die Stolperfalle, dass `//` in xcconfig einen Kommentar beginnt.

## 3. Lokaler Ablauf auf dem MacBook des Kollegen

1. Xcode 26.x installieren und einmal starten. Danach `xcode-select -p` und `brew install xcodegen swiftlint` ausführen.
2. `git pull --rebase`, dann `cd ios && cp Config/Secrets.example.xcconfig Config/Secrets.xcconfig`. Supabase-Host und Anon-Key vom User eintragen, die URL als `https:/$()/host`. Die Datei nie committen.
3. `xcodegen generate && open Preisfuchs.xcodeproj`. **Nach jedem Pull, der Dateien hinzufügt oder entfernt, erneut generieren**, denn das `.xcodeproj` ist nicht im Repo.
4. Simulator: Scheme `Preisfuchs`, Ziel „iPhone 17“, ⌘R. Tests mit ⌘U oder `swift test --package-path Packages/PreisfuchsKit`.
5. Vor dem Push dieselben Prüfungen wie im CI: `xcrun swift-format lint --strict -r Preisfuchs Packages && swiftlint --strict`.
6. Kostenlose Signierung auf dem eigenen iPhone:
   - Unter Xcode → Settings → Accounts die **Apple-ID des Users** hinzufügen, nicht die des Kollegen.
   - In `Secrets.xcconfig` lokal `DEVELOPMENT_TEAM = <Personal-Team-ID>` und eine eindeutige `PRODUCT_BUNDLE_IDENTIFIER` setzen, z. B. `de.preisfuchs.app.dev`. Dafür muss `project.yml` die Bundle-ID über eine xcconfig-Variable überschreibbar machen.
   - iPhone per Kabel anschließen, „Diesem Computer vertrauen“ bestätigen und am iPhone unter Einstellungen → Datenschutz & Sicherheit den Entwicklermodus einschalten.
   - Nach dem ersten Start unter Einstellungen → Allgemein → VPN und Geräteverwaltung dem Entwickler vertrauen.
   - Grenzen: Das Profil läuft nach **7 Tagen** ab, es gehen höchstens 3 Geräte und kein Push.

## 4. Was sich unter Windows vorab prüfen lässt

| Prüfung | Machbar? | Wie |
|---|---|---|
| `swift build` / `swift test` für `PreisfuchsKit/Domain` | **Wahrscheinlich ja, ungeprüft** | Swift 6.4 per winget installieren, dazu VS 2022 Build Tools, dann `swift test --package-path ios\Packages\PreisfuchsKit --filter DomainTests`. Risiken: Die Formatierung über `NumberFormatter`/`Decimal` mit `de_DE` kann unter Windows anders ausfallen (ICU), und supabase-swift baut unter Windows möglicherweise nicht. **Empfehlung:** `Domain` in ein eigenes Paket ohne Abhängigkeiten auslagern (`ios/Packages/PreisfuchsDomain`), damit Windows nie supabase-swift auflösen muss. Tests, die von der Locale abhängen, unter Windows mit `#if os(Windows)` markieren statt sie stillschweigend anzupassen |
| SwiftUI, Simulator, `xcodebuild`, XcodeGen | Nein | Nur auf macOS bzw. im CI |
| Workflow-YAML | Ja | Binary von actionlint (rhysd/actionlint, Windows-Release) laden und `actionlint .github/workflows/ios-*.yml` ausführen. Die Version ist noch nicht recherchiert. Für reine YAML-Syntax reicht `python -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" <datei>`, falls PyYAML installiert ist |
| `project.yml` (XcodeGen) | Nur die YAML-Syntax | Das Schema prüft erst `xcodegen generate` auf dem Mac oder im CI |
| SwiftLint und swift-format | Teilweise, ungeprüft | swift-format lässt sich aus dem Quellcode mit Swift für Windows bauen. Einfacher ist, sich auf das CI zu verlassen |
| Ersatz für einen fehlenden Windows-Swift | Ja | Optionaler zweiter Job in `ios-checks.yml` auf `ubuntu-latest`, der `swift test` nur für das Domain-Paket ausführt. Ob und in welcher Version Swift im Ubuntu-Image vorinstalliert ist, ist ungeprüft; sonst ein offizielles `swift`-Container-Image nutzen (Tag vorher prüfen) |

**Reihenfolge in Phase 0:**
1. `.gitignore`, Config-Struktur und `project.yml` anlegen.
2. `PreisfuchsKit` bzw. `PreisfuchsDomain` mit Tests aufbauen.
3. `ios-checks.yml` anlegen und mit `workflow_dispatch` den ersten Lauf auslösen.
4. Aus dem Log Simulatorname, `swift-format` und Signier-Overrides bestätigen und die Markierungen „ungeprüft“ entfernen.
5. Die TestFlight-Skizze erst nach der Entscheidung über das Developer Program aktivieren.

### Critical Files for Implementation
- `A:\Codex\Preisfuchs\.github\workflows\ios-checks.yml` (neu)
- `A:\Codex\Preisfuchs\.github\workflows\ios-testflight.yml` (neu, abgeschaltet)
- `A:\Codex\Preisfuchs\ios\project.yml` (neu; Pakete mit `exactVersion`, Bundle-ID und Team über xcconfig)
- `A:\Codex\Preisfuchs\ios\Config\Base.xcconfig` und `A:\Codex\Preisfuchs\ios\Config\Secrets.example.xcconfig` (neu)
- `A:\Codex\Preisfuchs\.gitignore` (um `ios/Config/Secrets.xcconfig`, `ios/*.xcodeproj` und `ios/.spm/` ergänzen)
