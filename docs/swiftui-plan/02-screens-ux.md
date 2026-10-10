# SwiftUI-Plan 02 – Screens & UX

Stand: 10.10.2026 · Teil des Gesamtplans `docs/SWIFTUI_PLAN.md`.
Quellen: `docs/APP_SCREENS_PLAN.md`, `docs/APP_UNTERSEITEN_PLAN.md`, `docs/FARBSCHEMA.md`,
`docs/MONETARISIERUNG.md`, `docs/APP_RABATTE.md`, `docs/PRODUKT_VERGLEICHSREGELN.md` und die
Expo-App unter `mobile/src/` als Feature-Referenz.

Die Service-Namen in diesem Dokument (`PriceService`, `FamilyService` …) sind Arbeitsnamen.
Die verbindlichen Namen und Schnittstellen stehen in den Teilplaenen fuer Architektur und
Backend-Anbindung.

---

## 1. Grundsaetze fuer jeden Screen

1. **Quelle und Datum sind immer sichtbar.** Jede Preisanzeige zeigt Quelle
   (Prospekt / Open Prices / Community / Demo) und `Stand: TT.MM.JJJJ`. Es gibt keine
   Preisanzeige ohne diese Zeile, auch nicht in Widgets, Live Activities oder Siri-Antworten.
2. **Keine Live-Genauigkeit.** Die Woerter "Live", "Echtzeit", "Verifiziert", "aktuell im Markt"
   kommen nicht vor. Preise sind Beobachtungen. Aeltere Preise als 30 Tage
   (`STALE_AFTER_DAYS` in `mobile/src/lib/prices.ts`) bekommen den Zusatz
   "moeglicherweise veraltet" in Warnfarbe.
3. **Rangliste nicht kaeuflich.** Werbung heisst sichtbar "Anzeige", Affiliate-Links
   "Partnerlink", Haendler-Platzierungen "Partner", gesponserte Produkte "Gesponsert".
   Keine dieser Flaechen veraendert Sortierung, Preisampel oder Marktvergleich.
4. **Schaetzungen als Schaetzung.** Ersparnis, Warenkorbsummen und Aufteilungen heissen
   "geschaetzt" bzw. "ca.".
5. **Ganz Deutschland.** Keine Region im Code oder Text voraussetzen. Beispiel-PLZ nur als
   Platzhalter.
6. **Ohne Konto nutzbar.** Login nur fuer Familie/Gruppen, Sync und spaeter Plus.
7. **App-Rabatte** (`docs/APP_RABATTE.md`): standardmaessig aus; jede betroffene Zeile zeigt
   "Nur mit <App-Name>"; personalisierte Coupons brauchen ein zweites Opt-in.
8. **Vergleichsgruppen** (`docs/PRODUKT_VERGLEICHSREGELN.md`): Die UI zeigt die konkrete Marke
   bzw. Eigenmarke je Preiszeile, auch wenn mehrere Artikel eine Vergleichsgruppe bilden.
   Packungsgroesse und Grundpreis stehen immer dabei.

---

## 2. Screen-Inventur

Status in Expo:
- **fertig**: Funktion wie im Screen-Plan, nutzt echte Daten oder lokalen Zustand.
- **teilweise**: Screen existiert, wichtige Teile fehlen (siehe Spalte).
- **Stub**: Screen oder Teil zeigt nur "bald verfuegbar" bzw. Platzhalter.
- **fehlt**: im Screen-Plan vorgesehen, in Expo nicht als Route vorhanden.

Prioritaet: **MVP** = erste TestFlight-Version, **P2** = Phase 2, **spaeter** = nach Launch.

### 2.1 App-Start und Onboarding

| Expo-Route / Komponente | SwiftUI-View | Status Expo | Daten / Services | Prio |
|---|---|---|---|---|
| `_layout.tsx` (Gate: geladen → Onboarding → Standort → Tabs) | `RootView` | fertig | `AppState` (lokal), `LocationStore` | MVP |
| `components/onboarding.tsx` – Intro | `OnboardingIntroView` | fertig | – | MVP |
| Onboarding – Anmelden (optional) | `OnboardingLoginStep` → nutzt `LoginPanel` | fertig | `AuthService` (E-Mail-Code 6 Ziffern, Google, Apple neu) | MVP |
| Onboarding – Einwilligung | `ConsentStepView` | teilweise (Schalter da, kein CMP/ATT) | `ConsentStore`; spaeter UMP-CMP + ATT | MVP (Schalter), P2 (CMP) |
| `components/location-setup.tsx` / Onboarding Standort | `LocationSetupView` | fertig | `LocationService` (CoreLocation), Geocoding, `StoreService` (OSM) | MVP |
| Onboarding – Lieblingsmaerkte | `FavoriteStoresStepView` | fertig | `StoreService` | MVP |
| Onboarding – Mitteilungen | `NotificationsStepView` | teilweise (nur Einstellung, keine Push-Anfrage) | `NotificationService` (UNUserNotificationCenter) | MVP |
| `auth/callback.tsx` | entfaellt (`ASWebAuthenticationSession` bzw. Google-SDK liefert Callback direkt); `onOpenURL` als Fallback | fertig | `AuthService` | MVP |
| Splash | Launch Screen (Info.plist / Storyboard-frei) | fertig (expo-splash-screen) | – | MVP |

### 2.2 Tab Start

| Expo-Route | SwiftUI-View | Status Expo | Daten / Services | Prio |
|---|---|---|---|---|
| `(tabs)/index.tsx` | `StartView` | fertig | `PriceService` (`current_price_observations`), `StoreService`, `AppState` (Warenkorb, Inbox) | MVP |
| `components/offers-callout.tsx` | `OffersCallout` | fertig | `PriceService` | MVP |
| `angebote.tsx` | `AngeboteView` | fertig (Wochenlabel, Markt-Filter, Raster) | `PriceService`; spaeter `AdSlot(.angebote)` | MVP |
| `kategorie/[id].tsx` | `KategorieView` | fertig | `ProductCatalog`, `PriceService` | MVP |
| Kategorien-Uebersicht | `KategorienView` | fehlt (nur Kacheln auf Start) | `ProductCatalog` | P2 |
| `markt/[id].tsx` | `MarktDetailView` | teilweise (Oeffnungszeiten der Woche, "Dein Warenkorb hier" pruefen) | `StoreService` (OSM-Filialen), `PriceService`, `Warenkorb` | MVP |
| Maerkte-Karte | `MaerkteKarteView` (MapKit) | fehlt als Route; `components/store-map.tsx` nur in Standort | `StoreService`, MapKit | P2 |
| `benachrichtigungen.tsx` | `InboxView` | fertig (lokal aus Preisen abgeleitet, kein Push) | `InboxBuilder`, `AlarmStore` | MVP |

### 2.3 Tab Suche

| Expo-Route | SwiftUI-View | Status Expo | Daten / Services | Prio |
|---|---|---|---|---|
| `(tabs)/suche.tsx` – leer (Verlauf, Shortcuts) | `SucheView` (Zustand `.leer`) | fertig | `AppState.recentSearches` | MVP |
| Suchergebnisse inkl. "Meintest du" | `SucheView` (Zustand `.treffer`) mit `.searchable` | fertig | `ProductCatalog`, `PriceService` | MVP |
| `components/search-filter-sheet.tsx` | `SuchFilterSheet` | fertig (Maerkte, Sortierung); Bio/Eigenmarke pruefen | lokal | MVP |
| Kein Treffer / Produkt vorschlagen | `KeinTrefferView` (`ContentUnavailableView`) | teilweise (Leerzustand ja, "Produkt vorschlagen" fehlt) | spaeter Edge Function o. Tabelle fuer Vorschlaege | P2 |
| `scanner.tsx` | `ScannerView` (VisionKit `DataScannerViewController`, Fallback AVFoundation) | teilweise (EAN nur gegen lokalen Katalog, kein Open-Food-Facts-Lookup) | `ProductCatalog`, spaeter OFF-API | MVP |
| Scan-Ergebnis | `ScanErgebnisSheet` | teilweise (springt direkt ins Produkt) | wie Produkt | MVP |
| Gesponserte Produkte oberhalb der Treffer | `SponsoredSlot` | fehlt | `app_config` | spaeter |

### 2.4 Produkt

| Expo-Route | SwiftUI-View | Status Expo | Daten / Services | Prio |
|---|---|---|---|---|
| `produkt/[id].tsx` (Sheet 60 % / 100 %) | `ProduktSheet` (`.presentationDetents([.fraction(0.6), .large])`) | fertig (Bester Preis, Ampel, Preise in der Naehe, Verlauf, Alternativen, Quelle) | `PriceService`, `ProductCatalog`, `AlarmStore`, `Favoriten` | MVP |
| Produktinfos Open Food Facts | Abschnitt `ProduktInfoSection` | teilweise (Nutri-Score; Zutaten/Naehrwerte "folgen") | `products`/OFF-Daten aus Backend | P2 |
| Preisverlauf gross | `PreisverlaufView` (Swift Charts) | fehlt (nur kleines Diagramm, Daten teils Demo) | Verlaufsdaten aus Backend; 12 Monate nur Plus | P2 |
| "Woher kommt dieser Preis?" | `PreisQuelleSheet` | teilweise (Text im Produkt-Sheet, kein eigenes Sheet) | Beobachtung (Quelle, Datum, Ort, Gueltigkeit) | MVP |
| `preisalarm/[id].tsx` | `PreisalarmSheet` | fertig (lokal; Limit 3 ohne Plus, Plus-Hinweis Stub) | `AlarmStore`, spaeter Push | MVP |
| `preis-melden/[id].tsx` | `PreisMeldenView` | fertig (Edge Function `report-price`, Foto optional) | `ReportService`, `PhotosPicker`/Kamera | MVP |
| "Online bestellen" (Partnerlink) | `PartnerLinkButton` | fehlt | `app_config` (Link-Vorlagen) | spaeter |

### 2.5 Tab Warenkorb

| Expo-Route | SwiftUI-View | Status Expo | Daten / Services | Prio |
|---|---|---|---|---|
| `(tabs)/warenkorb.tsx` | `WarenkorbView` | fertig (Kategorien, Mengen, Abhaken, Vorschlaege, Gruppen-Hinweis) | `ListStore`, `PriceService`, `FamilyService` | MVP |
| Leerer Warenkorb | `WarenkorbLeerView` | fertig | Favoriten, haeufige Artikel | MVP |
| `marktvergleich.tsx` | `MarktvergleichView` | fertig (Summe je Markt, fehlende Artikel, Aufteilen auf 2, Route Apple Maps) | `Pricing` (Port von `lib/pricing.ts`) | MVP |
| `einkaufsmodus.tsx` | `EinkaufsmodusView` | teilweise (nach Kategorie statt Gang, Bildschirm bleibt nicht an) | `ListStore`; `isIdleTimerDisabled` | MVP |
| `einkauf-fertig.tsx` | `EinkaufFertigView` (fullScreenCover) | fertig | `TripStore` | MVP |
| `listen.tsx` | `ListenSheet` | fertig | `ListStore` | MVP |
| `liste-bearbeiten.tsx` | `ListeBearbeitenSheet` | fertig | `ListStore` | MVP |
| `liste-teilen/[id].tsx` | `ListeTeilenSheet` (`ShareLink`) | fertig (Text + Link, kein QR) | `ShareListCodec` | MVP |
| `liste.tsx` (Ziel des Links) | `ListeUebernehmenView` | fertig | `ShareListCodec`, `ListStore` | MVP |
| QR-Code fuer Liste | im `ListeTeilenSheet` (CoreImage) | fehlt | – | P2 |

### 2.6 Familie & Gruppen

| Expo-Route | SwiftUI-View | Status Expo | Daten / Services | Prio |
|---|---|---|---|---|
| `familie/index.tsx` | `FamilieView` | fertig | `FamilyService` (Supabase, RLS) | MVP |
| `familie/neu.tsx` | `GruppeErstellenView` | fertig | `FamilyService` | MVP |
| `familie/beitreten.tsx` | `GruppeBeitretenView` | fertig (Code-Eingabe, Vorschau) | RPC `preview_household_invite`, `join_household` | MVP |
| `familie/[id].tsx` | `GruppeDetailView` | fertig (Mitglieder, Einladen, Listen teilen, Verlassen) | RPC `create_household_invite`, Realtime-Kanaele | MVP |
| Gemeinsamer Warenkorb ("hinzugefuegt von") | in `WarenkorbView` | fertig (Avatar/Name, Sync-Hinweis) | Supabase Realtime | MVP |
| Aktivitaet (Verlauf, Push "Papa hat 3 Artikel abgehakt") | `GruppeAktivitaetView` | fehlt | Aktivitaets-Tabelle + Push | P2 |
| `konto.tsx` / `components/login-panel.tsx` | `KontoSheet` + `LoginPanel` | fertig (Google, E-Mail-Code; Apple fehlt) | `AuthService` | MVP |

### 2.7 Tab Favoriten

| Expo-Route | SwiftUI-View | Status Expo | Daten / Services | Prio |
|---|---|---|---|---|
| `(tabs)/favoriten.tsx` | `FavoritenView` | teilweise (Favoritenliste fertig; Tabs Aktiv / Ausgeloest / Verlauf fehlen, Text "Preisalarme folgen") | `Favoriten`, `AlarmStore` | MVP |
| Alarm bearbeiten | `PreisalarmSheet` (Modus `.bearbeiten`) | teilweise (Bearbeiten/Loeschen ja, Pausieren fehlt) | `AlarmStore` | MVP |

### 2.8 Tab Profil und Einstellungen

| Expo-Route | SwiftUI-View | Status Expo | Daten / Services | Prio |
|---|---|---|---|---|
| `(tabs)/profil.tsx` | `ProfilView` | fertig (Kopfkarte, Statistik "geschaetzt", Menue) | `AppState`, `TripStore`, `FamilyService` | MVP |
| `einstellungen/standort.tsx` | `StandortView` (MapKit mit Radius-Kreis) | fertig | `LocationService`, `StoreService` | MVP |
| `einstellungen/maerkte.tsx` | `MeineMaerkteView` | fertig (an/aus; Reihenfolge fehlt) | `StoreService` | MVP |
| `einstellungen/mitteilungen.tsx` | `MitteilungenView` | teilweise (Schalter; Ruhezeiten/Push-Versand fehlen) | `NotificationService` | MVP |
| `einstellungen/datenschutz.tsx` | `DatenschutzView` | teilweise (Einwilligungen; Export/Loeschen pruefen) | `ConsentStore`, `AuthService.deleteAccount` | MVP |
| `einstellungen/datenquellen.tsx` | `DatenquellenView` | teilweise ("Stand 02.10." im Profil fest verdrahtet) | Quellen-Metadaten aus Backend (letzter Job-Lauf) | MVP |
| `einstellungen/hilfe.tsx` | `HilfeView` | fertig (FAQ, Feedback per Mail) | `CONTACT_EMAIL` (noch Platzhalter) | MVP |
| `einstellungen/rechtliches.tsx` + `dokument/[doc].tsx` | `RechtlichesView`, `DokumentView` | fertig (Texte in `data/legal.ts`) | lokale Texte | MVP |
| Darstellung (Hell/Dunkel, Grundpreis immer) | `DarstellungView` | fehlt | `@AppStorage` | P2 |
| `plus.tsx` | `PlusPaywallView` | Stub ("Bald verfuegbar") | StoreKit 2 (`SubscriptionStoreView`), Entitlement `plus` | P2 |
| Plus verwalten | `PlusVerwaltenView` (`manageSubscriptionsSheet`) | fehlt | StoreKit 2 | P2 |
| App-Rabatte ein/aus (+ personalisiert) | Abschnitt in `MeineMaerkteView` oder eigener `AppRabatteView` | fehlt | `PriceService`-Filter | P2 |

### 2.9 Systemzustaende und Werbung

| Expo-Komponente | SwiftUI | Status Expo | Daten / Services | Prio |
|---|---|---|---|---|
| `components/system-states.tsx` – Leer | `FuchsEmptyState` (eigene View um `ContentUnavailableView`) | fertig | – | MVP |
| – Offline (mit Datum der letzten Daten) | `OfflineBanner` | fertig | Cache-Zeitstempel | MVP |
| – Fehler (`ErrorBoundary`) | `FuchsErrorView` | fertig | – | MVP |
| Laden (Skeleton) | `.redacted(reason: .placeholder)` auf echten Karten | teilweise | – | MVP |
| `DemoNotice` | `DemoHinweis` | fertig | Flag `demo` je Beobachtung | MVP |
| Werbe-Slots | `AdSlot(placement:)` | fehlt | Werbenetzwerk, `app_config`, Consent | spaeter |

**Zahlen:** rund 45 Views. Fuer die erste TestFlight-Version (MVP) reichen etwa 35; alles mit
"fehlt" ausser Einkaufsmodus-Details und Favoriten-Tabs ist P2 oder spaeter.

---

## 3. Navigationsstruktur

### 3.1 Wurzel

```swift
@main struct PreisfuchsApp: App {
    @State private var app = AppModel()          // @Observable, haelt Stores/Services
    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(app)
                .onOpenURL { app.router.handle($0) }   // Deep Links
        }
    }
}
```

`RootView` entscheidet wie `_layout.tsx`:
`!loaded` → Launch-Ansicht · `!onboarded` → `OnboardingFlow` · `!standortGesetzt` →
`LocationSetupView` · sonst `MainTabView`.

### 3.2 Tabs

`MainTabView` = `TabView(selection:)` mit fuenf Tabs, je ein eigener `NavigationStack`
mit eigenem Pfad (`[Route]`), damit jeder Tab seinen Verlauf behaelt.

| Tab | SF Symbol | Wurzel | Badge |
|---|---|---|---|
| Start | `house` / `house.fill` | `StartView` | – |
| Suche | `magnifyingglass` | `SucheView` | – |
| Warenkorb | `basket` / `basket.fill` | `WarenkorbView` | Anzahl Artikel (`.badge`) |
| Favoriten | `heart` / `heart.fill` | `FavoritenView` | ausgeloeste Alarme (P2) |
| Profil | `person` / `person.fill` | `ProfilView` | ungelesene Inbox |

Erneutes Tippen auf den aktiven Tab setzt dessen Pfad zurueck.

### 3.3 Push-Ziele (NavigationStack)

```swift
enum Route: Hashable {
    case angebote(storeId: String?)
    case kategorie(id: String)
    case kategorien
    case markt(id: String)
    case maerkteKarte
    case inbox
    case marktvergleich
    case familie, gruppe(id: UUID), gruppeNeu, gruppeBeitreten(code: String?)
    case einstellung(Einstellung)          // standort, maerkte, mitteilungen, ...
    case dokument(LegalDoc)
    case preisverlauf(productId: String)
    case listeUebernehmen(SharedList)
}
```

Unterseiten nutzen `.navigationTitle` mit `.navigationBarTitleDisplayMode(.large)` wie in Expo
(grosser iOS-Titel, Zurueck in Markenfarbe ueber `.tint`).

### 3.4 Sheets und Vollbild

| Ziel | Darstellung | Detents |
|---|---|---|
| Produkt | `.sheet(item:)` | `.fraction(0.6)`, `.large`; Fusszeile "Menge + Zum Warenkorb" per `.safeAreaInset(edge: .bottom)` |
| Preisalarm | `.sheet` | `.large` (in Expo 90 %) |
| Preis melden | `.sheet` | `.large` |
| Woher kommt der Preis? | `.sheet` | `.medium` |
| Such-Filter | `.sheet` | `.medium`, `.large` |
| Konto / Login | `.sheet` | `.fraction(0.7)` |
| Listen, Liste bearbeiten, Liste teilen | `.sheet` | `.medium`/`.large` |
| Plus-Paywall | `.sheet` (modal, ohne Detents) | – |
| Scanner | `.fullScreenCover` | – |
| Einkaufsmodus | `.fullScreenCover` (statt Push), damit Tab-Leiste weg ist | – |
| Einkauf abgeschlossen | `.fullScreenCover`, nicht wegwischbar (`.interactiveDismissDisabled()`) | – |

Ein zentraler `Router` (`@Observable`) haelt `selectedTab`, die fuenf Pfade und das aktive
Sheet (`enum SheetRoute: Identifiable`). So koennen Deep Links, Widgets, Push und App Intents
dieselbe Logik nutzen. Produkt-Sheet ist global (aus jedem Tab erreichbar) und haengt am
`MainTabView`.

### 3.5 Deep Links

| Link | Ziel | Phase |
|---|---|---|
| `preisfuchs://liste?n=<Name>&e=<Emoji>&a=<id*menge,...>` | `ListeUebernehmenView` (kompatibel zur Expo-App, Format aus `lib/share-list.ts`) | MVP |
| `preisfuchs://familie/beitreten?code=<Code>` | `GruppeBeitretenView` mit vorausgefuelltem Code | MVP |
| `preisfuchs://produkt/<id>` | Produkt-Sheet (fuer Widgets, Push, Intents) | MVP |
| `preisfuchs://einkaufsmodus` | Einkaufsmodus (Live Activity) | P2 |
| Google-/OAuth-Callback | ueber `ASWebAuthenticationSession` bzw. Google-SDK, nicht ueber den Router | MVP |
| `https://<domain>/liste?...` als Universal Link | wie oben, aber in Messengern klickbar und mit Web-Fallback "App laden" | P2 |

Universal Links brauchen eine eigene Domain mit `apple-app-site-association` und das
Entitlement Associated Domains. Das Format im Link bleibt gleich, damit Links aus der
Expo-App weiter funktionieren. Eingaben aus Links werden wie in Expo begrenzt
(Menge 1–99, unbekannte Artikel werden genannt und nicht uebernommen).

---

## 4. Designsystem in SwiftUI

### 4.1 Farben

Ausgangspunkt ist Variante A "Fuchsrot" aus `docs/FARBSCHEMA.md`, wie sie in
`mobile/src/constants/theme.ts` umgesetzt ist. Umsetzung als **Color Sets im Asset-Catalog**
(Any/Dark) plus typsichere Tokens:

```swift
extension Color {
    static let pfPrimary      = Color("Primary")       // #E1262D / dark: #FF4A50 (zu testen)
    static let pfPrimaryDark  = Color("PrimaryPressed") // #B81D23
    static let pfPrimarySoft  = Color("PrimarySoft")    // #FDE8E8 / dark: 20 % Primary auf Grau
    static let pfDeal         = Color("Deal")           // = Primary, Angebotspreise und Rabatt
    static let pfSaving       = Color("Saving")         // #0F7A43 Flaeche, Text #13A05A
    static let pfSavingSoft   = Color("SavingSoft")     // #E4F5EA
    static let pfFox          = Color("Fox")            // #F07A2A nur Maskottchen
    static let pfTile         = Color("Tile")           // #F4F4F5
    static let pfBorder       = Color("Border")         // #E6E6E8
    static let pfWarning      = Color("Warning")        // #B7791F (veraltet)
    static let pfDanger       = Color("Danger")         // #C2362B
}
```

- Hintergrund, Karten und Text nutzen System-Farben (`Color(.systemBackground)`,
  `.secondarySystemBackground`, `.primary`, `.secondary`), damit Dark Mode und erhoehter
  Kontrast automatisch stimmen. Nur Marken- und Bedeutungsfarben sind eigene Assets.
- Regeln aus FARBSCHEMA: Rot = Marke + Angebote; Gruen nur fuer "gespart" und guenstigsten
  Markt; aktive Chips schwarz (`Color.primary` invertiert); Fuchs-Orange nie als UI-Farbe.
- Kontrast: `#13A05A` auf Weiss liegt unter 4,5:1 fuer kleinen Text (vor Umsetzung messen).
  Kleiner gruener Text nutzt deshalb `#0F7A43`; `#13A05A` nur fuer grosse Zahlen.

### 4.2 Typografie

- Systemschrift (SF Pro), ausschliesslich ueber Text-Styles, damit Dynamic Type greift:
  `.largeTitle.weight(.heavy)` fuer Screen-Titel, `.title2.bold()` fuer Abschnitte,
  `.body`, `.subheadline`, `.caption` fuer Quelle/Datum.
- Preise: eigener Stil `Font.pfPrice` = `.system(.title, design: .rounded).weight(.heavy)`
  mit `.monospacedDigit()`, damit Spalten ruhig bleiben.
- Feste Groessen aus Expo (`size={22}` usw.) werden auf den naechsten Text-Style gemappt,
  nicht uebernommen. Wo eine feste Groesse noetig ist: `@ScaledMetric`.

### 4.3 Abstaende und Formen

Tokens aus `theme.ts` als `enum Spacing` (4, 8, 12, 16, 24, 32) und `enum Inset`.
Eckenradius: Expo nutzt durchgehend 5 pt, `APP_SCREENS_PLAN.md` nennt 16 (siehe offene
Entscheidungen). Ein einziger Token `Radius.card`, damit die Entscheidung eine Zeile ist.
Karten: weiss bzw. `secondarySystemBackground`, 1 pt Linie `pfBorder`, kein Schatten.

### 4.4 Wiederverwendbare Komponenten

| Komponente | Zweck | Pflichtinhalt |
|---|---|---|
| `PriceCard` | Preis eines Produkts in einem Markt (Start, Suche, Kategorie, Angebote) | Preis, Grundpreis, Packungsgroesse, Markt-Chip, **`SourceLine`**; optional Streichpreis + Rabatt-Badge |
| `PriceRow` | Zeile in "Preise in deiner Naehe" und Marktvergleich | Logo, Filiale, Entfernung, Preis, Grundpreis, `SourceLine`; ohne Preis: "kein Preis bekannt"; guenstigster mit `pfSaving` markiert |
| `SourceLine` | Quelle + Datum | `"<Quelle> · <Ort> · Stand: TT.MM.JJJJ"`, Zusatz "(Demo)" bzw. "moeglicherweise veraltet"; Tippen oeffnet `PreisQuelleSheet` |
| `AppDiscountBadge` | App-Rabatt | "Nur mit Lidl Plus" o. ae.; bei personalisiert zusaetzlich "Persoenliches Angebot" |
| `PriceLevelPill` | Preisampel | "Gerade guenstig · x % unter Ø" / "Normaler Preis" / "Gerade teuer"; Bezug 8-Wochen-Schnitt im Accessibility-Label |
| `DiscountBadge` | Rabatt in Prozent | rot, `-23 %` |
| `StoreChip` | Markt-Auswahl/-Filter | Logo (mind. 48 pt in Rastern laut Screen-Plan, klein im Chip), Name; aktiv = schwarz |
| `StoreLogo` | einheitliches Quadrat | Assets aus Wikimedia Commons, Lizenzhinweis in Rechtliches |
| `AdBadge` | "Anzeige" | immer sichtbar oben links in jedem `AdSlot`, nicht abschaltbar, gleicher Kontrast wie Text |
| `PartnerLinkBadge` | "Partnerlink" | direkt am Button "Online bestellen" |
| `PartnerBadge` / `SponsoredBadge` | "Partner" / "Gesponsert" | fuer Phase-3-Platzierungen |
| `AdSlot(placement:)` | Werbeflaeche | nur Start, Suche (nach Treffer 5), Angebote (jede 10. Kachel); nie Warenkorb, Einkaufsmodus, Marktvergleich, Alarm, Onboarding; leer bei Plus oder per `app_config` aus |
| `EstimateLabel` | "ca. 12,40 € (geschaetzt)" | fuer Ersparnis, Warenkorbsummen |
| `QuantityStepper` | Menge 1–99 | grosse Trefferflaeche (44 pt) |
| `SectionHeader` | Titel + Meta + Aktion "Alle" | – |
| `SettingsGroup`/`SettingsRow` | iOS-Einstellungsstil | `List` mit `.insetGrouped` |
| `FuchsEmptyState`, `FuchsErrorView`, `OfflineBanner`, `DemoHinweis` | Systemzustaende | Offline zeigt Datum der letzten Daten |
| `PriceChart` | Swift Charts Linie | Achsen mit Datum; letzter Punkt markiert; Quelle unter dem Diagramm |
| `LoginPanel` | Apple, Google, E-Mail-Code gleich gross | Hinweis "Nur noetig zum Teilen und Synchronisieren" |

Preview-Strategie: jede Komponente mit `#Preview` in Hell, Dunkel und `.accessibility3`.

### 4.5 Dark Mode

- Expo ist nur hell (`StatusBar style="dark"`). SwiftUI unterstuetzt Dark Mode von Anfang an,
  weil Color Sets und System-Farben das fast kostenlos liefern.
- Haendlerlogos bekommen in Dark Mode eine helle Kachel, damit dunkle Wortmarken lesbar bleiben.
- Override in `DarstellungView` (System/Hell/Dunkel) per `.preferredColorScheme` (P2).

### 4.6 Dynamic Type und Barrierefreiheit

- Bis `.accessibility5` testen; Preiskarten-Raster wechselt per `ViewThatFits` bzw.
  `dynamicTypeSize.isAccessibilitySize` von 2 Spalten auf 1, Zeilen von `HStack` auf `VStack`.
- VoiceOver: `PriceCard` ist ein Element mit zusammengesetztem Label, z. B.
  "Milbona Magerquark 500 Gramm, 0,79 Euro bei Lidl, Grundpreis 1,58 Euro pro Kilogramm,
  Quelle Open Prices, Stand 2. Oktober 2026". Werbung beginnt mit "Anzeige".
- Preise als `Decimal` mit `.formatted(.currency(code: "EUR"))` und Locale `de_DE`,
  damit VoiceOver Euro korrekt vorliest.
- Farbe nie als einziges Signal: guenstigster Markt zusaetzlich mit Symbol/Text
  ("Am guenstigsten"), Preisampel mit Text.
- Trefferflaechen mind. 44 × 44 pt; Haptik (`.sensoryFeedback`) beim Abhaken und
  Zum-Warenkorb.
- Reduce Motion respektieren (keine Slider-Autoanimation auf Start).
- Einkaufsmodus: extra grosse Zeilen, hoher Kontrast, Bildschirm bleibt an.

### 4.7 Lokalisierung

- Entwicklungssprache **Deutsch**, String Catalog (`Localizable.xcstrings`) von Anfang an,
  auch wenn zunaechst nur `de` ausgeliefert wird. Keine Strings im Code zusammensetzen,
  Plural ueber den Catalog ("1 Artikel" / "3 Artikel").
- Datum: `Date.FormatStyle` mit `de_DE`, Format `TT.MM.JJJJ` fuer "Stand:";
  Angebotswoche als "Diese Woche · 5.–11. Oktober", nie "KW".
- Einheiten fuer Grundpreis (`€/kg`, `€/l`, `€/Stk.`) zentral in einer Funktion.
- Rechtstexte bleiben deutsch (Impressum, Datenschutz).

---

## 5. Pflichtregeln aus AGENTS.md in der UI

| Regel | Umsetzung in SwiftUI | Pruefung |
|---|---|---|
| Quelle und Aktualisierungsdatum immer sichtbar | `PriceCard`/`PriceRow` haben keinen Initializer ohne `PriceObservation`; `SourceLine` ist fester Teil des Layouts | Snapshot-Tests je Komponente; Review-Checkliste |
| Datenquellen mit letzter Aktualisierung | `DatenquellenView` liest Stand je Quelle aus dem Backend statt fest verdrahtet | UI-Test |
| Keine Live-Genauigkeit | Verbotswortliste ("Live", "Echtzeit", "Verifiziert") als Test ueber den String Catalog | Unit-Test |
| Veraltete Preise kennzeichnen | `observation.isStale` (> 30 Tage) → Warnfarbe + Text | Unit-Test |
| Demo-Daten kennzeichnen | `DemoHinweis` + "(Demo)" in `SourceLine` | – |
| Preise als Beobachtungen | `PreisQuelleSheet` mit Hinweis "Beobachtung, im Markt kann der Preis abweichen" + "Preis melden" | – |
| Werbung als "Anzeige" | `AdSlot` rendert `AdBadge` selbst, Platzierung nur ueber Enum mit erlaubten Orten | Unit-Test fuer verbotene Platzierungen |
| Partnerlinks als "Partnerlink" | `PartnerLinkButton` enthaelt Badge fest | – |
| Rangliste nicht kaeuflich | Sortierung in `Pricing` kennt keine Werbe-/Partnerdaten; Slots werden nach der Sortierung eingefuegt | Unit-Test |
| Schaetzungen kennzeichnen | `EstimateLabel` fuer alle Summen/Ersparnisse | – |
| App-Rabatte nur mit Opt-in | Filter in `PriceService`; Warenkorb nennt benoetigte Apps | Unit-Test |

---

## 6. iOS-spezifische Extras

| Extra | Inhalt | Nutzen | Phase | Hinweise |
|---|---|---|---|---|
| **Widget (WidgetKit)** "Einkaufsliste" | aktive Liste mit Anzahl offener Artikel, Tippen oeffnet Warenkorb | schneller Blick vor dem Einkauf | P2 | App Group fuer geteilte Daten; keine Preise ohne Quelle/Datum |
| **Widget** "Preisalarm / Angebot" | Produkt, Preis, Markt, **Stand-Datum** | Alarme sichtbar ohne Push | P2 | Daten nur so frisch wie letzter App-Abruf; Text "Stand: …" Pflicht |
| **Interaktives Widget** | Artikel abhaken (App Intent im Widget) | – | spaeter | erst nach stabilem Listen-Sync |
| **Live Activity (ActivityKit)** im Einkaufsmodus | Markt, "7 von 15 abgehakt", geschaetzte Summe; Dynamic Island kompakt | Fortschritt auf dem Sperrbildschirm beim Einkaufen | P2 | lokal gestartet, keine Push-Updates noetig; Ende bei "Einkauf abgeschlossen" |
| **App Intents / Siri / Kurzbefehle** | "Fuege Milch zu Preisfuchs hinzu", "Oeffne meine Einkaufsliste", "Wo ist Butter am guenstigsten?" | Hinzufuegen per Sprache | P2 (Hinzufuegen, Oeffnen), spaeter (Preisfrage) | Preisantwort muss Quelle und Datum nennen; App Shortcuts fuer Spotlight |
| **Share Extension** | Text oder Liste aus anderer App (z. B. Rezept, Notizen) teilen → Artikel erkennen → in Liste | Listen schnell fuellen | spaeter | Erkennung nur gegen eigenen Katalog, Rest als "nicht erkannt"; kein KI-Einsatz im ersten Schritt |
| **Spotlight (Core Spotlight)** | Produkte und Listen durchsuchbar | – | spaeter | – |
| **VisionKit DataScanner** | Barcode-Scanner nativ | ersetzt expo-camera | MVP | Fallback AVFoundation fuer aeltere Geraete |
| **Sign in with Apple** | im `LoginPanel` | Screen-Plan sieht Apple vor | MVP | App Store Review Guideline 4.8 vor Einreichung pruefen, wenn Google-Login angeboten wird |
| **Push (APNs)** | Preisalarm ausgeloest, Gruppenaktivitaet | Inbox heute nur lokal | P2 | braucht Server-Komponente (Edge Function/Job) und Apple Developer Account |
| **TipKit** | Hinweise "Tippe auf die Quelle" | Transparenz erklaeren | spaeter | – |

---

## 7. Offene UX-Entscheidungen fuer den User

1. **Farbschema endgueltig:** Variante A "Fuchsrot" (so in Expo) festschreiben oder B/C testen?
   `FARBSCHEMA.md` ist noch als Entwurf markiert.
2. **Eckenradius:** 5 pt (Expo, `APP_UNTERSEITEN_PLAN.md`) oder 16 (`APP_SCREENS_PLAN.md`,
   "Start v2")? Mein Vorschlag: 12–16 fuer Karten wirkt auf iOS natuerlicher; 5 ist die
   aktuelle Expo-Optik.
3. **Mindest-iOS-Version:** iOS 17 (Observation, `ContentUnavailableView`, interaktive Widgets)
   oder hoeher. Bestimmt, welche APIs aus Abschnitt 6 ohne Fallback nutzbar sind.
4. **Dark Mode im MVP** oder erst P2? (Aufwand gering, aber Logos und Fotos muessen geprueft werden.)
5. **Einkaufsmodus:** Push im Tab oder Vollbild (Vorschlag: Vollbild)? Sortierung nach
   Kategorie (heute) oder pro Markt gespeicherte Gang-Reihenfolge (Datenaufwand)?
6. **Favoriten-Tab:** Tabs Aktiv / Ausgeloest / Verlauf schon im MVP, obwohl Alarme ohne Push
   nur beim Oeffnen der App geprueft werden?
7. **Sign in with Apple** im MVP aufnehmen (Screen-Plan sagt ja, Expo hat es nicht)?
8. **Universal Links:** Eigene Domain fuer klickbare Listen-/Einladungslinks anschaffen, oder
   vorerst beim Schema `preisfuchs://` bleiben?
9. **Werbung und Plus vor Launch:** Ab TestFlight sichtbar (als Platzhalter "Anzeige") oder
   erst zum Store-Launch? Werbenetzwerk und Abo kosten Einrichtungsaufwand und brauchen
   Gewerbe/Impressum (`MONETARISIERUNG.md`).
10. **App-Rabatte:** Schalter im MVP anbieten, obwohl es noch keine Daten mit `app_discount`
    gibt? Vorschlag: erst wenn Daten da sind (P2).
11. **Expo-App parallel:** Wird `mobile/` eingefroren oder weiter gepflegt? Davon haengt ab, ob
    das Link-Format (`liste?n=&e=&a=`) dauerhaft kompatibel bleiben muss.
12. **iPad:** nur iPhone (wie Expo) oder iPad-Layout (`NavigationSplitView`) spaeter?
