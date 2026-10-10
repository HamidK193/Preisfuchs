# Preisfuchs SwiftUI – Gesamtplan

Stand: 10.10.2026. Dieser Plan fuehrt die vier Teilplaene zusammen, die Details stehen dort:

| Teilplan | Inhalt |
|---|---|
| [01 Architektur & Build](swiftui-plan/01-architektur-build.md) | Projektaufbau, Pakete, Secrets, Build ohne Mac, TestFlight, CI |
| [02 Screens & UX](swiftui-plan/02-screens-ux.md) | ~45 Screens (Expo → SwiftUI), Navigation, Designsystem, Pflichtregeln in der UI |
| [03 Backend-Anbindung](swiftui-plan/03-backend-anbindung.md) | 26 Endpunkte, Auth, Familie/Listen, report-price, Cache, Backend-Luecken |
| [04 Daten-Pipeline](swiftui-plan/04-daten-pipeline.md) | Agents, Qualitaets-Gates, Datenstand, fehlende Daten, Monitoring |

## Zielbild

- Native iOS-App in SwiftUI (iOS 17+, gebaut mit Xcode 26) wird die primaere App. Die Expo-App unter `mobile/` dient als Feature-Referenz.
- Das Backend bleibt dasselbe: Supabase mit `current_price_observations`, `report-price`, Haushalten und OSM-Filialen. Die Daten-Agents laufen weiter ueber GitHub Actions.
- Architektur: `@Observable`, Feature-Ordner, Repository-/Service-Schicht, `AppEnvironment` fuer DI, SwiftData fuer Nutzerdaten, JSON-Cache fuer Preise. Das Xcode-Projekt wird mit XcodeGen (`ios/project.yml`) erzeugt.
- Pakete: supabase-swift und GoogleSignIn-iOS, beide frei. Fuer Barcodes VisionKit, fuer Karten MapKit.
- Die App ist ohne Konto nutzbar. Login per E-Mail-Code (6 Ziffern) oder Google ist nur fuer Familie und Sync noetig.

## Sofort (unabhaengig von SwiftUI) – Frist 18.10.2026

Der aelteste oeffentliche Preis ueberschreitet am 18.10. die 90-Tage-Grenze, und die oeffentliche View filtert alte Preise bisher nicht (Teilplan 04, 5.1):

1. `current_price_observations` filtert zusaetzlich `observed_at >= now() - interval '90 days'`.
2. Im Daily-Workflow ein Schritt, der aeltere Zeilen auf `is_public = false` / `too_old` setzt.

## Phasen

### Phase 0 – Fundament und Spike
- **Backend:**
  - Haushalts-Schema als Migration nach `supabase/migrations/` holen.
  - `data_status`-View fuer „Datenstand pro Quelle“ anlegen.
  - Den alten BW-Seed-Job abschalten (Empfehlung).
  - OFF-Agent einmal manuell laufen lassen.
  - Eigenen SMTP-Server fuer Login-Mails einrichten.
- **iOS:**
  - `ios/project.yml` anlegen, `.gitignore` um `*.xcconfig` ergaenzen, Config-Struktur aufsetzen.
  - `PreisfuchsKit` mit der portierten Vergleichslogik aus `PriceModels.swift` und Tests.
- **CI:** `ios-checks.yml` auf einem `macos-26`-Runner gruen bekommen.
- **Spike:** TabView-Grundgeruest mit einer Abfrage auf `current_price_observations` und E-Mail-Code-Login.
- **Verteilung:** erster TestFlight-Build an dich selbst, danach an einen Kollegen.

### Phase 1 – Lesende MVP-App
- Onboarding mit Standort und Lieblingsmaerkten, Start, Suche, Kategorien, Produkt mit Preisvergleich, Angebote, Maerkte.
- Alle Haendler anzeigen. Die Expo-App verwirft heute stillschweigend Preise von Ketten ausserhalb ihrer 9 bekannten, unter anderem 135 Netto-Preise.
- Quelle und Datum an jedem Preis. Keine Woerter wie „Live“ oder „Echtzeit“.
- Offline-Cache mit Datum.
- Daten: Bildpruefung fuer die 200 haeufigsten Artikel, bessere Kategorien („Sonstiges“ unter 5 %), Drogerie- und Bio-Ketten in OSM.

### Phase 2 – Mitmachen
- Scanner mit Fallback auf Open Food Facts, Preis melden mit Foto, Warenkorb und Listen, Einkaufsmodus, Familie und Listen-Teilen (Deep Link `preisfuchs://liste`), Preisalarm lokal.
- kaufDA-Gegencheck auch fuer Community-Meldungen, Volltextsuche auf dem Server.
- iOS-Extras: Widgets und Live Activity im Einkaufsmodus.

### Phase 3 – Angebote, Preisalarm serverseitig, Push
- Backend-Tabellen `push_devices` und `price_alerts`, eine Function fuer den Push-Versand, Alarm-Abgleich nach jedem Daily-Lauf.
- Community-Angebote mit `valid_until`.

### Phase 4 – Launch und Betrieb
- App-Store-Review, Datenschutz-Angaben, Plus-Abo und gekennzeichnete Anzeigen nach `docs/MONETARISIERUNG.md`.
- Monitoring der Datenquellen, Datenbankgroesse im Free-Tier beobachten.

## Build und Test ohne Mac

- **Bauen:** GitHub Actions mit macOS-Runner. Das ist kostenlos, solange das Repo oeffentlich ist.
- **Verteilen:** TestFlight ist der verlaessliche Weg zu Kollegen und loest das Expo-Go-Problem. Dafuer braucht es das Apple Developer Program (99 USD/Jahr bzw. den Betrag in Landeswaehrung).
- **Ehrliche Einschraenkung:** Ohne jeden Mac gibt es keine SwiftUI-Vorschau und keinen Simulator, die UI-Arbeit wird also langsam. Ein Cloud-Mac bei Scaleway kostet ab etwa 0,22 €/h netto, mindestens 24 h am Stueck.
- **Hinweis:** TestFlight wuerde auch mit einem Expo-Build funktionieren. Der Wechsel zu SwiftUI ist eine Produktentscheidung und kostet die Android-Version.

## Offene Entscheidungen fuer dich

Die wichtigsten sind zuerst genannt, die vollstaendigen Listen stehen in den Teilplaenen.

1. **Apple Developer Program buchen?** Das waere eine bewusste Ausnahme von „keine Bezahl-APIs“ in `AGENTS.md`. Ohne das Programm gibt es weder TestFlight noch Push.
2. **Expo-App und Android:** einfrieren oder weiter pflegen?
3. **Mac-Zugang:** nur ueber CI, tageweise ein Cloud-Mac oder ein eigener Mac?
4. **Repo:** bleibt es oeffentlich (dann ist CI gratis)? Und GitHub Actions oder Xcode Cloud?
5. **Mindestversion:** iOS 17 oder iOS 18?
6. **Login:** zusaetzlich Sign in with Apple? Moeglicherweise ist das Pflicht, sobald Google-Login angeboten wird (App Store Richtlinie 4.8, noch nicht geprueft).
7. **Daten:** BW-Seed-Job abschalten? Welche Prospektquelle? Weitere Haendler und Drogerien aufnehmen?
8. **Design:** endgueltiges Farbschema, Eckenradius, Dark Mode schon im MVP, iPad-Layout?
9. **TestFlight:** intern ohne Pruefung durch Apple oder extern per oeffentlichem Link (erster Build wird von Apple geprueft)?
