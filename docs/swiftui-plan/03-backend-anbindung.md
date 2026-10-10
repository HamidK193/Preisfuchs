# Teilplan 03: Backend-Anbindung der SwiftUI-App

Stand: 10.10.2026. Teil des SwiftUI-Plans (`docs/SWIFTUI_PLAN.md`).
Dieser Teilplan beschreibt, wie die native SwiftUI-App an das **bestehende** Supabase-Backend
(Projekt `eanggjsdpjjskqycvknx`) angebunden wird. Die Expo-App unter `mobile/` ist die
Feature-Referenz; alle Fundstellen beziehen sich auf deren Code.

Grundsatz: Das Backend bleibt fuer den ersten SwiftUI-Meilenstein **unveraendert**. Alles, was
fehlt, steht in Abschnitt 10 als Vorschlag; nichts davon ist angewendet.

---

## 1. Quellen und Ist-Stand

| Bereich | Quelle im Repo | Live in Supabase? |
| --- | --- | --- |
| Katalog, Preise, View, Rechte | `supabase/migrations/2026*.sql`, Snapshot `backend/supabase/schema.sql` | ja |
| OSM-Filialen, `off_products`, `retailer_offers` | `20261004195159_weekly_source_agents.sql` | ja (04.10.) |
| Deutschlandweite Freigabe | `20261007072955_open_public_prices_germany.sql` | ja (07.10.) |
| Preismeldungen + Bucket | `20261007211854_price_reports.sql`, `supabase/functions/report-price/index.ts` | ja |
| Haushalte, gemeinsame Listen, RPCs | `backend/supabase/households.sql` | ja (10.10., als Migrationen `households_and_shared_lists`, `households_grants`) – **aber nicht unter `supabase/migrations/`** (siehe Luecke L1) |
| Auth-Mailvorlagen | `backend/supabase/email-templates/confirm-signup.html`, `magic-link.html` | manuell im Dashboard |
| Tests | `supabase/tests/database_security.test.sql`, `catalog_roles.sql` | – |

Wichtige Projekt-Eigenschaft: Das Projekt vergibt **keine Standard-Tabellenrechte**
(`alter default privileges ... revoke all`). Jede neue Tabelle braucht explizite `GRANT`s
fuer `anon`/`authenticated`, sonst sieht die App nichts – auch bei passender RLS-Policy.

---

## 2. Client-Setup in Swift

- Paket: `supabase-swift` (SPM, `https://github.com/supabase/supabase-swift`, Produkte
  `Supabase` bzw. einzeln `Auth`, `PostgREST`, `Functions`, `Realtime`). Version beim Anlegen
  des Projekts pinnen (exakte Version in `Package.resolved` committen).
- Konfiguration: `SUPABASE_URL` und `SUPABASE_ANON_KEY` ueber eine **nicht eingecheckte**
  `ios/Preisfuchs/Config/Secrets.xcconfig` → `Info.plist` → `Bundle.main`. Eingecheckt wird nur
  `Secrets.example.xcconfig`. `.gitignore` deckt `*.xcconfig` heute **nicht** ab → vor dem ersten
  Commit ergaenzen (Teil der Umsetzung, nicht dieses Plans).
- Nur der oeffentliche anon-Key gehoert in die App. Der Service-Role-Key **niemals** (SECURITY.md,
  docs/SUPABASE_SETUP.md Abschnitt 7).
- Ohne Konfiguration startet die App wie die Expo-App mit Demo-Daten und Overpass-Fallback
  (`mobile/src/lib/supabase.ts`: `supabase = null`).

```swift
// Skizze: Services/SupabaseProvider.swift
enum SupabaseProvider {
    static let client: SupabaseClient? = {
        guard let url = AppConfig.supabaseURL, let key = AppConfig.supabaseAnonKey else { return nil }
        return SupabaseClient(supabaseURL: url, supabaseKey: key,
            options: .init(auth: .init(flowType: .pkce, autoRefreshToken: true)))
    }()
}
```

Allgemeine Decoding-Regeln fuer alle Modelle:

- `numeric`-Spalten (Preise) liefert PostgREST als JSON-Zahl → in Swift als `Decimal` halten
  (eigener `init(from:)` ueber `String(describing:)` vermeidet Double-Rundungsfehler) und nur in der
  Anzeige formatieren.
- `timestamptz` → `Date` (ISO 8601 mit Bruchteilen und Offset).
- `date` (`valid_until`, `valid_from`, `observed_on`) → als `String` "yyyy-MM-dd" dekodieren und in
  einen eigenen Typ `LocalDate` wandeln; nicht als `Date` mit Zeitzone, sonst verschiebt sich der Tag.
- `jsonb` (`package`, `nutriments`) → tolerante Structs; Felder koennen Zahl **oder** String sein
  (`prices.ts` macht `Number(row.package?.total)`).
- `CodingKeys` mit `snake_case` → `.convertFromSnakeCase` am Decoder oder explizite Keys.

---

## 3. Endpunkte im Ueberblick

Legende Rolle: `anon` = ohne Konto (anon-Key), `auth` = angemeldet (User-JWT), `srv` = nur Service-Role.

| # | Endpunkt | Art | Zugriff App | Swift-Service | Expo-Fundstelle |
| --- | --- | --- | --- | --- | --- |
| E1 | `current_price_observations` | View (security_invoker) | anon/auth: select | `PriceService` | `lib/prices.ts` `loadRealProducts` |
| E2 | `products` | Tabelle | anon/auth: select (Spalten) | `CatalogService` | `lib/prices.ts` |
| E3 | `off_products` | Tabelle | anon/auth: select | `ProductInfoService` | `lib/prices.ts` |
| E4 | `stores` (+ Embed `retailers`) | Tabelle | anon/auth: select (Spalten) | `StoreService` | `lib/osm.ts` `findStoresInSupabase` |
| E5 | `retailers` | Tabelle | anon/auth: select | `StoreService` | indirekt (Embed in E4) |
| E6 | `retailer_offers` | Tabelle | anon/auth: select (`is_public`) | `OfferService` (neu) | in Expo **nicht** genutzt |
| E7 | `catalog_articles` | Tabelle | anon/auth: select (verifizierte, Spalten) | – (ueber View) | nicht direkt |
| E8 | `price_observations` | Tabelle | anon/auth: select (Policy-Filter) | – (nur ueber View) | nicht direkt |
| E9 | Edge Function `report-price` | HTTPS POST | anon (Bearer anon-Key) | `PriceReportService` | `lib/reports.ts` |
| E10 | Bucket `price-report-photos` | Storage (privat) | **kein** Client-Zugriff, nur via E9 | – | indirekt (E9) |
| E11 | Auth: E-Mail-OTP | GoTrue | anon → auth | `AuthService` | `state/family-state.tsx` `sendCode`/`verifyCode` |
| E12 | Auth: Google (ID-Token / OAuth+PKCE) | GoTrue | anon → auth | `AuthService` | `lib/google-auth.ts` |
| E13 | `households` | Tabelle | auth: select; update (`name`,`emoji`, nur Admin) | `HouseholdService` | `lib/family.ts` `loadHouseholds` |
| E14 | `household_members` | Tabelle | auth: select; update nur eigenes `display_name` | `HouseholdService` | `lib/family.ts` |
| E15 | `household_invites` | Tabelle | **kein** Direktzugriff, nur RPCs | – | – |
| E16 | `shared_lists` | Tabelle | auth: select/insert/update/delete (Mitglieder) | `SharedListService` | `lib/family.ts` |
| E17 | `shared_list_items` | Tabelle | auth: select/insert/update/delete (Mitglieder) | `SharedListService` | `lib/family.ts` `pushListChanges` |
| E18 | RPC `create_household` | Funktion (definer) | auth | `HouseholdService` | `lib/family.ts` |
| E19 | RPC `create_household_invite` | Funktion (definer) | auth (Mitglied) | `HouseholdService` | `lib/family.ts` |
| E20 | RPC `preview_household_invite` | Funktion (definer) | auth | `HouseholdService` | `lib/family.ts` |
| E21 | RPC `join_household` | Funktion (definer) | auth | `HouseholdService` | `lib/family.ts` |
| E22 | RPC `leave_household` | Funktion (definer) | auth | `HouseholdService` | `lib/family.ts` |
| E23 | RPC `delete_my_account` | Funktion (definer) | auth | `AccountService` | `lib/family.ts`, `family-state.tsx` |
| E24 | Realtime `postgres_changes` auf `shared_list_items` (+ `shared_lists` publiziert) | WebSocket | auth (RLS gilt) | `SharedListSyncEngine` | `state/family-state.tsx` |
| E25 | Overpass API (extern) | HTTPS POST | – | `StoreService` (Fallback) | `lib/osm.ts` `findStoresInOverpass` |
| E26 | Geocoding (Apple) | CoreLocation | – | `LocationService` | `lib/locate.ts` |

Nicht von der App genutzt und tabu: `update_runs` (keine Client-Policy), `price_reports`
(nur Service-Role), `raw_payload` (Spaltenrecht entzogen), kaufDA-Daten (bleiben intern, nur
Backend-Check).

---

## 4. Endpunkte im Detail mit Codable-Skizzen

### E1 `current_price_observations` → `PriceService`

- Inhalt: je Artikel/Produktvariante/Haendler/Ort/Rabattbedingung die **neueste aktive**
  oeffentliche Beobachtung. Filter in der View: `is_public`, Artikel `verified`, `country_code='DE'`,
  `price_basis='pack'`, `observed_at <= now()`, gueltig heute. Seit 07.10. kein Regionsfilter mehr.
- RLS: View laeuft mit `security_invoker`; es greift die Policy
  "published price observations are readable" auf `price_observations` und die Policy auf
  `catalog_articles` (nur `verified`). anon und authenticated duerfen lesen, niemand schreiben.
- Abfrage wie Expo (gleiche Spaltenauswahl, `order(id)`, `range` je 1000): siehe Abschnitt 7.

```swift
struct PriceRow: Decodable, Identifiable, Hashable {
    let id: UUID
    let productId: String            // product_id, z. B. "gtin_4001234567890" oder "butter_250"
    let articleId: UUID              // article_id
    let articleName: String?         // article_name
    let brandName: String?           // brand_name
    let package: PackageInfo?        // jsonb {unit,total,original}
    let comparisonKey: String?       // "gtin:<EAN>"
    let retailerId: String?          // optional mitladen (Expo laedt es nicht)
    let retailerName: String
    let price: Decimal
    let regularPrice: Decimal?       // regular_price (Streichpreis)
    let offerType: String?           // 'regular' | 'sale' | 'app_discount' (optional mitladen)
    let requiresApp: Bool?           // optional; Haendler-App-Rabatte nur nach Auswahl zeigen
    let appName: String?
    let isPersonalized: Bool?
    let observedAt: Date
    let validUntil: LocalDate?
    let source: String?              // "Open Prices" | "Preisfuchs Nutzermeldung" | ...
    let sourceUrl: String?
    let sourceLicense: String?       // z. B. "ODbL" – fuer die Quellenzeile
    let locationLabel: String?       // "Rewe, Stuttgart"
    let storeId: UUID?
}
struct PackageInfo: Decodable, Hashable { let unit: String?; let total: FlexibleNumber?; let original: String? }
```

Empfehlung: Gegenueber Expo zusaetzlich `retailer_id, store_id, offer_type, requires_app,
app_name, is_personalized, source_license` laden. Alle Spalten sind fuer anon freigegeben.
Damit lassen sich App-Rabatte korrekt kennzeichnen (SECURITY.md: personalisierte Coupons nur nach
ausdruecklicher Auswahl) und die Lizenz sichtbar anzeigen (AGENTS.md: Quelle + Datum immer sichtbar).
Alles aelter als 30 Tage als "moeglicherweise veraltet" markieren (`STALE_AFTER_DAYS` in
`lib/prices.ts`). Die Quelle `Preisfuchs Nutzermeldung` wird als "Community" angezeigt.

### E2 `products` → `CatalogService`

- Spalten (anon): `id, name, category, package_size, search_terms, barcodes, created_at, updated_at`.
- Expo laedt nur `id,name,category,package_size` per `.in('id', …)` in Bloecken zu 150.
- Kategorien werden ueber `CATEGORY_MAP` (in `lib/prices.ts`) auf App-Kategorien gemappt; die
  Tabelle in Swift uebernehmen.

```swift
struct ProductRow: Decodable { let id: String; let name: String; let category: String; let packageSize: String
                               let searchTerms: [String]?; let barcodes: [String]? }
```

### E3 `off_products` → `ProductInfoService`

- RLS: alles lesbar (anon/auth). Lizenz ODbL, Bilder CC BY-SA – Bild nur zeigen, wenn
  `image_reviewed == true`, mit Namensnennung (`image_attribution`).
- Abfrage: `.in('gtin', …)` in Bloecken zu 150.

```swift
struct OffProductRow: Decodable {
    let gtin: String
    let nutriscoreGrade: String?          // a..e
    let nutriments: [String: Double]?      // energy-kcal_100g, fat_100g, ...
    let labelsTags: [String]?
    let imageUrl: String?
    let imageReviewed: Bool
    let imageAttribution: String?
}
```

### E4/E5 `stores` + `retailers` → `StoreService`

- RLS: alle Zeilen lesbar; Spalten `id, retailer_id, name, street, postcode, city, state,
  latitude, longitude, source, source_ref, opening_hours, source_license, is_active, last_seen_at, …`.
- Expo-Abfrage: `is_active = true`, Bounding-Box aus Radius, `order(id)`, Seiten zu 1000,
  hoechstens 5 Seiten, danach exakte Distanz (Haversine) clientseitig, je Kette die naechste Filiale.
- Ketten-Mapping ueber `retailers.normalized_name` (`mobile/src/data/stores.ts`, `chains[].retailer`).
- Die `stores.id` (UUID) ist Pflicht fuer Preismeldungen (E9) – deshalb immer mitfuehren.
- Overpass nur als Fallback (E25), mit `User-Agent: Preisfuchs-App/<Version>`, nur auf Nutzeraktion,
  Ergebnis lokal cachen. Hinweis "© OpenStreetMap-Mitwirkende, ODbL" anzeigen.

```swift
struct StoreRow: Decodable, Identifiable {
    let id: UUID
    let sourceRef: String?
    let street: String?, postcode: String?, city: String?
    let openingHours: String?
    let latitude: Double, longitude: Double
    let retailers: RetailerEmbed?        // select: "...,retailers(normalized_name)"
}
struct RetailerEmbed: Decodable { let normalizedName: String }
```

### E6 `retailer_offers` → `OfferService` (neu)

- Wochenangebote aus erlaubten Quellen; RLS `is_public`. In Expo noch nicht angebunden.
- Fuer die SwiftUI-App optional ab Phase 2 (Angebote-Tab). `source_label` **woertlich** anzeigen.

```swift
struct RetailerOfferRow: Decodable, Identifiable {
    let id: String; let retailerId: String; let retailerName: String
    let title: String; let details: String?
    let price: Decimal; let unitPrice: Decimal?; let unit: String?; let priceLabel: String?
    let category: String?; let validFrom: LocalDate?; let validUntil: LocalDate?; let offerWeek: String?
    let scope: String                    // national | regional | store
    let storeId: UUID?; let productId: String?
    let sourceLabel: String; let sourceUrl: String?; let fetchedAt: Date
}
```

### E9/E10 Edge Function `report-price` → `PriceReportService`

Vertrag (aus `supabase/functions/report-price/index.ts`):

- `POST {SUPABASE_URL}/functions/v1/report-price`, Header `apikey: <anon>`,
  `Authorization: Bearer <anon>`, `Content-Type: application/json`.
  In `supabase/config.toml` ist fuer die Function nichts eingestellt → Standard `verify_jwt = true`;
  der Bearer-Token muss also ein gueltiges JWT sein (heutiger anon-Key). Mit supabase-swift:
  `client.functions.invoke("report-price", options: .init(body: request))` sendet die Header selbst
  (ist der Nutzer angemeldet, geht sein User-JWT mit – die Function ignoriert die Identitaet).
- Request:

```swift
struct PriceReportRequest: Encodable {
    let deviceId: String        // device_id, 16..100 Zeichen, zufaellige UUID, einmal erzeugt und gespeichert
    let gtin: String            // 8 oder 12..14 Ziffern mit gueltiger Pruefziffer
    let storeId: UUID           // store_id aus Tabelle stores, muss is_active sein
    let price: Decimal          // > 0 und < 1000, Server rundet auf 2 Stellen
    let isOffer: Bool?          // is_offer
    let validUntil: String?     // "yyyy-MM-dd", nur bei Angebot
    let observedOn: String?     // "yyyy-MM-dd", Standard: heute (Serverzeit)
    let productName: String?    // max. 200 Zeichen
    let photoBase64: String?    // max. 4.000.000 Zeichen Base64
    let photoMime: String?      // image/jpeg | image/png | image/webp (Pflicht, wenn Foto)
}
```

- Antworten:

| Status | Body | App-Reaktion (Texte wie `lib/reports.ts`) |
| --- | --- | --- |
| 201 | `{ id, status: pending/confirmed/needs_review, reason, published }` | "Danke"; bei `published` "ist jetzt sichtbar", sonst "wird nach Bestaetigung sichtbar" |
| 400 | `{ error: "invalid_field", field }` oder `invalid_json` | Feldtext (`gtin`, `store_id`, `price`, `photo_base64`) |
| 429 | `{ error: "rate_limited", retry_after_seconds: 60 / 3600 }` + `Retry-After` | "in einer Minute" bzw. "morgen" |
| 500 | `photo_upload_failed` / `insert_failed` | allgemeiner Fehler, spaeter erneut |

- Rate-Limit: je **Geraet und IP** hoechstens 3 Meldungen pro Minute und 20 pro 24 h
  (gezaehlt ueber gesalzene Hashes in `price_reports`).
- Bestaetigung: zweite gleiche Meldung (GTIN, Filiale, Preis, 7 Tage) von anderem Geraet **und**
  anderer IP, oder Foto mit plausiblem Preis (0,5x–2x Median bekannter Preise). Veroeffentlicht wird
  nur, wenn es einen verifizierten Katalogartikel zur GTIN gibt; sonst `needs_review`.
- Foto: Die App laedt **nicht** selbst in Storage. Das Foto geht als Base64 im JSON an die Function,
  die es in den privaten Bucket `price-report-photos` schreibt (Bucket-Limit 3 MiB, JPEG/PNG/WebP).
  In Swift vorher verkleinern (z. B. lange Kante 1600 px, JPEG-Qualitaet 0,7) und auf < 2,9 MB
  Binaergroesse pruefen, sonst schlaegt der Upload serverseitig fehl, obwohl die Base64-Grenze passt.
- Geraete-ID: einmal `UUID().uuidString` erzeugen und im **Keychain** ablegen
  (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`), damit sie eine Neuinstallation nicht
  zwingend ueberlebt, aber nicht in Backups wandert. Expo-Key zum Abgleich: `preisfuchs-device-id`.
- Offline: Meldungen in eine lokale Warteschlange (`PendingReport`, Datei in Application Support)
  und bei Verbindung senden; `observedOn` beim Erfassen setzen, nicht beim Senden.

---

## 5. Auth mit supabase-swift

### 5.1 Anonyme Nutzung (Standard)

- Preise, Maerkte, Suche, Listen, Preisalarm, Preismeldung funktionieren **ohne Konto**
  (anon-Key). Ein Konto ist nur fuer Familie & Gruppen noetig (PRIVACY_DATA_FLOW.md: kein Konto
  fuer den Warenkorbvergleich).
- Supabase "Anonymous Sign-Ins" (`signInAnonymously`) wird **nicht** verwendet; anonym heisst hier
  schlicht: keine Session, Requests mit dem anon-Key.
- Lokale Daten (Listen, Favoriten, Alarme, Standort) bleiben auf dem Geraet und werden nicht
  hochgeladen; beim Anmelden wird nichts automatisch migriert.

### 5.2 E-Mail-Code (OTP, genau 6 Ziffern)

Referenz: `state/family-state.tsx` (`sendCode`, `verifyCode`), `components/login-panel.tsx`
(`CODE_LENGTH = 6`), Commit f154dbe "Require exactly 6 digit login codes".

```swift
try await client.auth.signInWithOTP(email: email.trimmed, shouldCreateUser: true)
try await client.auth.verifyOTP(email: email.trimmed, token: code, type: .email)
```

- UI: Eingabefeld `.textContentType(.oneTimeCode)`, `.keyboardType(.numberPad)`, nur Ziffern,
  Absenden erst bei **genau 6** Ziffern (`^\d{6}$`).
- Supabase-Dashboard (bereits so eingestellt laut memory.md, vor Start pruefen):
  Auth → Providers → Email → "Email OTP Length" = 6.
  Vorlagen "Magic Link" **und** "Confirm signup" muessen `{{ .Token }}` enthalten (neue Adressen
  bekommen "Confirm signup"); `type: .email` deckt beide ab. Vorlagen liegen in
  `backend/supabase/email-templates/`.
- Der eingebaute Supabase-Mailversand ist stark limitiert → vor TestFlight-Rollout an mehr als eine
  Handvoll Personen eigenen SMTP eintragen (siehe Luecke L6).

### 5.3 Google Sign-In nativ

Referenz: `lib/google-auth.ts`, `constants/app.ts`, `app.json`.

- Bundle-ID: `de.preisfuchs.app` (wie `mobile/app.json`). URL-Scheme `preisfuchs`.
- Client-IDs: Web-Client "Preisfuchs Supabase (Web)" und iOS-Client "Preisfuchs iOS" im
  Google-Cloud-Projekt "Preisfuchs"; die IDs stehen in `mobile/src/constants/app.ts` und werden in
  die Swift-Konfiguration uebernommen (Client-IDs sind oeffentlich, das Client-Secret nicht).
  Der iOS-Client muss auf die Bundle-ID `de.preisfuchs.app` lauten.
- Paket: `GoogleSignIn-iOS` (SPM). In `Info.plist`: `GIDClientID` (iOS-Client),
  `GIDServerClientID` (Web-Client, damit das ID-Token die Web-Client-ID als `aud` enthaelt) und
  den **umgekehrten iOS-Client-ID** als URL-Scheme.
- Ablauf:

```swift
let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootVC)
guard let idToken = result.user.idToken?.tokenString else { throw AuthError.noIdToken }
try await client.auth.signInWithIdToken(credentials: .init(provider: .google, idToken: idToken,
                                         accessToken: result.user.accessToken.tokenString))
```

- Supabase (Auth → Providers → Google), laut memory.md eingerichtet: beide Client-IDs
  (Web zuerst, kommagetrennt), Client-Secret des Web-Clients, "Skip nonce checks" **an**.
  Alternative ohne "Skip nonce checks": eine Nonce erzeugen, gehasht an Google und roh an
  `signInWithIdToken(… nonce:)` geben – ob die eingesetzte GoogleSignIn-Version die Nonce
  durchreicht, beim Bau pruefen; bis dahin die heutige Einstellung belassen.
- Browser-Fallback (wie Expo Go): `signInWithOAuth(provider: .google, redirectTo:
  URL(string: "preisfuchs://auth/callback"))` mit `ASWebAuthenticationSession`, danach
  `client.auth.session(from: url)`. Redirect-URL `preisfuchs://**` ist in Supabase bereits erlaubt.
- Sign in with Apple: Sobald Google angeboten wird, verlangt die App-Store-Richtlinie 4.8
  voraussichtlich eine gleichwertige datensparsame Option. Das ist **vor der Einreichung zu
  pruefen**; eingeplant ist Apple-Login ohnehin (memory.md). Braucht Apple Developer Program,
  Capability "Sign in with Apple" und den Apple-Provider in Supabase (Services-ID, Key). Code:
  `signInWithIdToken(credentials: .init(provider: .apple, idToken:, nonce:))`.

### 5.4 Session-Speicherung und Lebenszyklus

- supabase-swift speichert die Session auf Apple-Plattformen standardmaessig im **Keychain**
  (`KeychainLocalStorage`). Beim Bau verifizieren und Accessibility auf
  `AfterFirstUnlockThisDeviceOnly` setzen (eigenes `AuthLocalStorage`, falls der Default nicht passt).
  Keine Tokens in `UserDefaults`.
- `client.auth.authStateChanges` als `AsyncStream` in einem `@Observable AuthService` beobachten
  (`initialSession`, `signedIn`, `signedOut`, `tokenRefreshed`, `userDeleted`).
- Auto-Refresh nur im Vordergrund (Expo: `startAutoRefresh`/`stopAutoRefresh` je AppState) →
  ueber `scenePhase` steuern.
- Abmelden: `signOut()`; gemeinsame Listen bleiben als normale lokale Listen (Expo `signOut`).
  Konto loeschen: RPC `delete_my_account`, danach `signOut(scope: .local)`.

---

## 6. Haushalte/Familie, Listen-Teilen, Preisalarm, Benachrichtigungen

### 6.1 Haushalte → `HouseholdService`

Alle Aufrufe nur mit Session. Fehlertexte wie `familyErrorText` in `lib/family.ts`
(`invalid or expired code`, `household full`, `not authenticated`).

| Funktion | Aufruf | Rueckgabe | Regeln |
| --- | --- | --- | --- |
| Gruppen laden | `from("households").select("id,name,kind,emoji").order("created_at")` und `from("household_members").select("household_id,user_id,display_name,role").order("joined_at")` | Listen | RLS: nur eigene Gruppen |
| Gruppe anlegen | `rpc("create_household", p_name, p_kind, p_emoji, p_display_name)` | `UUID` | Ersteller wird Admin; Name 1–40, Anzeigename 1–30 |
| Einladen | `rpc("create_household_invite", p_household)` | `String` (8 Zeichen, ohne 0/O/1/I) | 7 Tage gueltig, nur Mitglieder |
| Vorschau | `rpc("preview_household_invite", p_code)` | `[InvitePreview]` (0 oder 1) | nur angemeldet |
| Beitreten | `rpc("join_household", p_code, p_display_name)` | `UUID` | max. 6 Mitglieder |
| Verlassen | `rpc("leave_household", p_household)` | – | Admin-Uebergabe, leere Gruppe wird geloescht |
| Umbenennen | `from("households").update(name, emoji)` | – | nur Admin (Policy) |
| Eigenen Namen aendern | `from("household_members").update(display_name).eq(user_id, me)` | – | nur eigene Zeile, nur diese Spalte |

```swift
enum HouseholdKind: String, Codable { case familie, wg, freunde }
struct Household: Codable, Identifiable { let id: UUID; var name: String; let kind: HouseholdKind; var emoji: String }
struct Member: Codable { let householdId: UUID; let userId: UUID; var displayName: String; let role: Role
                         enum Role: String, Codable { case admin, mitglied } }
struct InvitePreview: Decodable { let householdId: UUID; let name: String; let kind: HouseholdKind
                                  let emoji: String; let memberCount: Int }
```

Einladungscode teilen: Text plus Deep-Link `preisfuchs://gruppe?code=XXXXXXXX` (Link-Format in
Teilplan Screens festlegen; heute gibt es dafuer keinen Expo-Link, nur Codeeingabe).

### 6.2 Gemeinsame Listen → `SharedListService` + `SharedListSyncEngine`

```swift
struct SharedList: Codable, Identifiable { let id: UUID; let householdId: UUID; var name: String; var emoji: String }
struct SharedListItem: Codable, Hashable {
    let listId: UUID; let productId: String           // 1..80 Zeichen
    var quantity: Int                                  // 1..99
    var checked: Bool
    let addedBy: UUID?; let checkedBy: UUID?           // setzt der Server-Trigger
    let updatedAt: Date                                // setzt der Server-Trigger
}
```

- Teilen: `insert` in `shared_lists` (`household_id, name, emoji`) → ID, danach alle Artikel per
  `upsert(onConflict: "list_id,product_id")`.
- Aenderungen: Expo sendet nur Diffs gegen den letzten Server-Stand (Snapshot), gebuendelt nach
  400 ms (`pushListChanges`). Geaenderte Zeilen per Upsert, entfernte per
  `delete().eq(list_id).in(product_id, …)`. `added_by`, `checked_by`, `updated_at` nie selbst senden.
- Live-Sync: je Liste ein Realtime-Channel `shared-list-<id>` mit
  `postgresChange(AnyAction.self, schema: "public", table: "shared_list_items", filter: "list_id=eq.<id>")`;
  zusaetzlich ein Channel fuer `DELETE` ohne Filter (geloeschte Zeilen tragen nur den Primaerschluessel;
  `list_id` ist Teil davon). Bei jedem Ereignis die Liste neu laden (wie Expo `pull`), nicht das
  Event-Payload einmischen. Beim Wechsel in den Vordergrund alle geteilten Listen neu laden.
- Konflikte: letzter Schreiber gewinnt (bekannte Einschraenkung, memory.md). Offline-Aenderungen an
  gemeinsamen Listen in einer Warteschlange halten und nach dem naechsten `pull` erneut als Diff senden.

### 6.3 Listen-Teilen ohne Konto → `ShareLinkService`

- Rein lokal, kein Backend: `preisfuchs://liste?n=<Name>&e=<Emoji>&a=<produktId*menge,...>`
  (`lib/share-list.ts`). Menge auf 1–99 begrenzen. Gleiches Format in Swift, damit Expo- und
  Swift-Links kompatibel bleiben.
- Universal Links (https) brauchen eine eigene Domain mit `apple-app-site-association` → fehlt (L9).
- Datenschutz-Hinweis aus PRIVACY_DATA_FLOW.md beim Teilen anzeigen (Link ist fuer jeden lesbar).

### 6.4 Preisalarm → lokal (`AlarmStore`)

- Heute **rein lokal**: `PriceAlarm { productId, targetPrice, storeIds, push }` in
  `state/app-state.tsx`, max. 3 in der Gratis-Version (`FREE_ALARM_LIMIT`).
- Ausloesen: beim Laden neuer Preise lokal pruefen (`lib/inbox.ts` `buildInbox`): Treffer, wenn eine
  Beobachtung in den gewaehlten Maerkten `<= targetPrice` ist. Eintrags-ID
  `alarm:<produkt>:<markt>:<preis>:<datum>`.
- In Swift: `Codable`-Struct in der lokalen Persistenz; Pruefung nach jedem Preis-Reload und in einem
  `BGAppRefreshTask` (ohne Server-Push nur "best effort", iOS bestimmt den Zeitpunkt). Treffer als
  **lokale** Mitteilung (`UNUserNotificationCenter`) – braucht kein Backend und keinen APNs-Key.

### 6.5 Benachrichtigungen / Inbox

- Inbox wird abgeleitet, nicht gespeichert (`lib/inbox.ts`); gespeichert werden nur gelesene und
  entfernte IDs (max. 200). Arten: `alarm`, `offers` (Angebotswoche Mo–Sa). In Swift 1:1 uebernehmen.
- Einstellungen `NotificationSettings { priceAlerts, cartChanges, weeklyOffers, weekday, quietHours }`
  bleiben lokal.
- **Was fuer echte Push-Nachrichten (APNs) im Backend fehlt:**
  1. Tabelle fuer Geraete-Tokens (APNs-Token je Geraet, optional Nutzer).
  2. Serverseitige Kopie der Preisalarme (sonst weiss der Server nicht, wen er benachrichtigen soll).
  3. Edge Function zum Versand an APNs (HTTP/2, JWT mit `.p8`-Key, Key-ID, Team-ID als Function-Secrets).
  4. Ausloeser: nach dem taeglichen Preis-Job (GitHub Action ruft die Function auf) bzw.
     Datenbank-Webhook/Trigger auf `shared_list_items` fuer "Papa hat 3 Artikel abgehakt".
  5. Apple Developer Program (APNs-Key, Push-Capability) – kostenpflichtig, Entscheidung beim User.
  Details und Migrationsvorschlag: L2–L4.

---

## 7. Paginiertes Laden aller Preise

Referenz: `lib/prices.ts` `loadRealProducts` (Observation #945).

1. `current_price_observations` mit fester Spaltenliste, `order("id")`, `range(page*1000, page*1000+999)`;
   Abbruch, sobald eine Seite < 1000 Zeilen hat. Expo-Limit: 10 Seiten (10.000 Zeilen); in Swift als
   Sicherung beibehalten und loggen, wenn das Limit greift. (Supabase liefert je Abfrage max. 1000
   Zeilen – `max_rows` des Projekts.)
2. Produkt-IDs sammeln → `products` mit `.in("id", chunk)` in Bloecken zu 150 (URL-Laenge).
3. GTINs aus `comparison_key` ("gtin:…") bzw. `product_id` ("gtin_…") → `off_products` in Bloecken zu 150.
4. Gruppieren nach `article_id`; je Kette die neueste Beobachtung behalten; Ketten ueber Muster auf
   `retailer_name` (`chains[].pattern` in `data/stores.ts`) zuordnen. Unbekannte Ketten verwerfen.
5. Schritte 2 und 3 parallel (`async let` / `TaskGroup`), Seiten in Schritt 1 sequenziell (stabile Ordnung).

Hinweis: `order(id)` ueber eine `distinct on`-View ist bei ~1.100 Zeilen unkritisch. Waechst der
Bestand stark, eine schlanke RPC oder materialisierte Sicht erwaegen (L8).

---

## 8. Offline-Cache-Strategie

| Daten | Speicher | Gueltigkeit / Aktualisierung | Anzeige |
| --- | --- | --- | --- |
| Preise (Rohzeilen E1 + E2 + E3) | JSON-Datei `prices-v1.json` in Application Support (Codable), mit `loadedAt` | Laden bei Start und bei Rueckkehr in den Vordergrund, hoechstens alle 6 h automatisch (Job laeuft taeglich); Pull-to-Refresh jederzeit | Status `live` / `cached` / `offline` / `demo` wie `PriceDataStatus` in `app-state.tsx`; immer "Stand: <Datum>" und Quelle sichtbar |
| Filialen je Standort | JSON-Datei je Standort-Schluessel (PLZ+Radius) | bei Standortwechsel neu; sonst 7 Tage | Hinweis "© OpenStreetMap-Mitwirkende" |
| Geocoding-Ergebnisse | im Standort-Cache | 7 Tage (wie Web-App) | – |
| Listen, Favoriten, Alarme, Einstellungen, Inbox-IDs, Trips | SwiftData oder eine Codable-Datei (Entscheidung im Architektur-Teilplan) | dauerhaft lokal | – |
| Gemeinsame Listen | lokale Kopie + Snapshot je Liste + Ausgangs-Warteschlange | Realtime + Pull bei Vordergrund | Sync-Status je Liste ("synchronisiert um …" / Fehler) |
| Preismeldungen | Warteschlange (Datei) | Senden bei Verbindung (`NWPathMonitor`) | "wird gesendet" |
| Session, Geraete-ID | Keychain | – | – |

Regeln: Bei Fehlern nie leere Ansicht, sondern den letzten Cache mit Datum zeigen; ohne Cache Demo-Daten
klar als "Demo" kennzeichnen. Cache nur nach vollstaendig erfolgreichem Laden ersetzen (atomar schreiben).
Preise bleiben Beobachtungen – auch frische Daten nie als "live im Markt" bezeichnen.

Optional spaeter: Delta-Laden. Die View hat `created_at`, aber abgelaufene Zeilen verschwinden
still – ein reines `created_at > lastSync` reicht deshalb nicht. Erst eine Versions-RPC (L8) erlaubt
"nur neu laden, wenn sich etwas geaendert hat".

---

## 9. Swift-Service-Landkarte

| Service | Aufgabe | Endpunkte | Session noetig |
| --- | --- | --- | --- |
| `SupabaseProvider` | Client aus Konfiguration, `nil` ohne Konfiguration | – | – |
| `PriceService` (ersetzt `PriceRepository`-Stub) | Preise paginiert laden, zu Produkten bauen, Cache | E1, E2, E3 | nein |
| `CatalogService` / `ProductInfoService` | Produktstammdaten, OFF-Infos | E2, E3 | nein |
| `StoreService` | Filialen im Umkreis, Overpass-Fallback | E4, E5, E25 | nein |
| `OfferService` | Wochenangebote (Phase 2) | E6 | nein |
| `LocationService` | Standort, (Reverse-)Geocoding mit CoreLocation | E26 | nein |
| `PriceReportService` | Preis melden, Warteschlange, Geraete-ID | E9 (E10 indirekt) | nein |
| `AuthService` | OTP, Google, (Apple), Session, Abmelden | E11, E12 | – |
| `AccountService` | Konto loeschen | E23 | ja |
| `HouseholdService` | Gruppen, Einladungen | E13–E15, E18–E22 | ja |
| `SharedListService` / `SharedListSyncEngine` | gemeinsame Listen, Diff-Upload, Realtime | E16, E17, E24 | ja |
| `ShareLinkService` | Liste per Link teilen/oeffnen | – (lokal) | nein |
| `AlarmStore` / `InboxBuilder` | Preisalarm, Inbox, lokale Mitteilungen | – (lokal) | nein |
| `PushService` (spaeter) | APNs-Token registrieren | L2 | nein/optional |

Alle Services als `actor` oder `@MainActor @Observable`-Klassen hinter Protokollen
(`PriceServicing` usw.), damit Previews und Tests mit Demo-Daten laufen.

---

## 10. Luecken: Was die SwiftUI-App braucht und im Backend fehlt

Priorisiert. **Nur Vorschlaege** – nichts davon ist angewendet. Jede Migration zuerst lokal bzw. in
einem Supabase-Branch testen, dann `supabase/tests/*.sql` erweitern, dann produktiv.
Neue Tabellen brauchen explizite `GRANT`s (Projekt vergibt keine Standardrechte).

### P0 – vor dem ersten TestFlight-Build

**L1 – Haushalts-Schema als Migration im Repo.** `households.sql` ist live (10.10.), liegt aber nur
unter `backend/supabase/`. Die Remote-Migrationen `households_and_shared_lists` und
`households_grants` als Dateien nach `supabase/migrations/` ziehen (z. B. per
`supabase migration fetch` / `db pull` oder Abgleich mit `list_migrations`), sonst baut eine neue
Instanz bzw. ein Preview-Branch keine Familienfunktion. Snapshot `schema.sql` ergaenzen.

**L5 – Edge-Function-Auth gegen neue API-Keys absichern.** `report-price` nutzt `verify_jwt` (Default).
Falls das Projekt auf die neuen `sb_publishable_…`-Keys umgestellt wird (keine JWTs), lehnt das Gateway
anon-Aufrufe ab. Vorschlag in `supabase/config.toml`:

```toml
[functions.report-price]
verify_jwt = false   # Function prueft selbst (Validierung + Rate-Limit), nutzt Service-Role intern
```

Vorher entscheiden; solange der Legacy-anon-Key aktiv ist, funktioniert der heutige Weg.

**L6 – Eigener SMTP fuer Auth-Mails.** Ohne eigenen SMTP sind nur sehr wenige OTP-Mails pro Stunde
moeglich – mehrere Tester scheitern sonst am Login. Dashboard-Einstellung, keine Migration.

### P1 – fuer Push und serverseitigen Preisalarm

**L2 – Tabelle fuer Push-Geraete.** Anonyme Nutzer sollen Push bekommen koennen, daher geraetebasiert
mit optionalem Nutzer. Schreiben nur ueber eine Edge Function (wie `report-price`), damit anon keine
fremden Tokens lesen/aendern kann.

```sql
-- Vorschlag: supabase/migrations/2026XXXXXXXXXX_push_devices.sql
create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  device_hash text not null unique,             -- gesalzener Hash der App-Geraete-ID
  user_id uuid references auth.users(id) on delete set null,
  platform text not null check (platform in ('ios','android')),
  apns_token text not null,
  environment text not null default 'production' check (environment in ('sandbox','production')),
  locale text not null default 'de-DE',
  topics jsonb not null default '{"priceAlerts":true,"cartChanges":true,"weeklyOffers":true}',
  quiet_hours boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated, service_role;
grant select, insert, update, delete on public.push_devices to service_role;
-- keine Client-Policy: Zugriff nur ueber Edge Function "register-device"
```

Neue Edge Function `register-device`: `POST { device_id, apns_token, environment, topics, quiet_hours }`,
Upsert per `device_hash`, setzt `user_id` aus dem JWT, falls angemeldet; Rate-Limit wie `report-price`;
`DELETE` zum Abmelden von Push.

**L3 – Serverseitige Preisalarme.**

```sql
create table public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.push_devices(id) on delete cascade,
  product_id text not null references public.products(id),
  target_price numeric(10,2) not null check (target_price > 0 and target_price < 1000),
  retailer_ids text[] not null default '{}',      -- leer = aktive Maerkte des Nutzers
  last_notified_observation uuid,                 -- verhindert Doppelversand
  created_at timestamptz not null default now(),
  unique (device_id, product_id)
);
-- RLS an, keine Client-Policy, nur service_role; Pflege ueber Edge Function "sync-price-alerts"
-- (Limit 3 je Geraet in der Gratis-Version serverseitig pruefen, docs/MONETARISIERUNG.md).
```

Datenschutz: Damit landen erstmals Einkaufsinteressen auf dem Server → PRIVACY_DATA_FLOW.md und
App-Privacy-Angaben anpassen; Alarme ohne Push-Wunsch bleiben lokal.

**L4 – Versand-Function `send-notifications`.** Liest neue Beobachtungen seit dem letzten Lauf aus
`current_price_observations`, gleicht mit `price_alerts` ab, sendet ueber APNs (Secrets:
`APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID=de.preisfuchs.app`), entfernt Tokens bei
APNs-Status 410. Ausloeser: letzter Schritt in `.github/workflows/daily-price-update.yml`
(`curl` mit Service-Role-Secret) oder `pg_cron` + `pg_net`. Ruhezeiten beachten. Voraussetzung:
Apple Developer Program.

**L7 – Push bei Aenderungen in gemeinsamen Listen.** Database Webhook (bzw. Trigger + `pg_net`) auf
`shared_list_items` → Function `notify-household`, die Ereignisse 2–5 Minuten buendelt
("Papa hat 3 Artikel abgehakt") und an die `push_devices` der anderen Mitglieder sendet
(`user_id` ueber `household_members`). Haengt an L2/L4.

### P2 – Komfort und Skalierung

**L8 – Preis-Versions-RPC fuer guenstiges Neuladen.**

```sql
create or replace function public.price_catalog_version()
returns table (row_count bigint, max_created_at timestamptz, max_observed_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select count(*), max(created_at), max(observed_at) from public.current_price_observations;
$$;
grant execute on function public.price_catalog_version() to anon, authenticated;
```

Die App laedt alle Seiten nur neu, wenn sich die Version vom Cache unterscheidet.

**L9 – Umkreissuche als RPC.** `stores_nearby(p_lat, p_lon, p_radius_km)` (security invoker,
Haversine in SQL, sortiert, je Kette die naechste Filiale + Anzahl) ersetzt Bounding-Box-Paging mit
bis zu 5.000 Zeilen pro Standort. Ohne PostGIS umsetzbar.

**L10 – Status eigener Preismeldungen.** `price_reports` ist fuer Clients gesperrt (richtig so). Fuer
"Meine Meldungen" eine Function `report-status` (`POST { device_id, ids[] }` → `status`, `published`),
die nur Meldungen mit passendem `device_hash` liefert.

**L11 – Universal Links / Einladungslinks.** Domain mit `apple-app-site-association` fuer
`/liste` und `/gruppe`, damit geteilte Links ohne installierte App auf eine Infoseite fuehren.
Kein Datenbank-Bedarf.

**L12 – Sign in with Apple in Supabase.** Provider-Konfiguration (Services-ID, Key, Team-ID); siehe 5.3.

**L13 – `.gitignore` fuer iOS-Secrets.** `ios/**/Secrets.xcconfig` (bzw. `*.xcconfig` ausser
`*.example.xcconfig`) aufnehmen, bevor die erste Konfiguration angelegt wird.

---

## 11. Akzeptanzkriterien fuer die Anbindung

- Ohne Konto: Preise laden (alle Seiten), Quelle + Datum sichtbar, Filialen im Umkreis, Preis melden
  inkl. Foto und Rate-Limit-Texte, Offline-Start mit Cache und Datum.
- Mit Konto: 6-stelliger Code und Google-Login, Session ueberlebt Neustart (Keychain), Gruppe anlegen,
  einladen, beitreten (zweites Geraet), Liste teilen, Abhaken erscheint live auf dem anderen Geraet,
  Gruppe verlassen, Konto loeschen.
- Sicherheit: App-Bundle enthaelt keinen Service-Role-Key; Zugriffe auf `price_reports`,
  `update_runs`, `household_invites` mit dem anon-Key schlagen fehl (bestehende Tests in
  `supabase/tests/` als Referenz).
