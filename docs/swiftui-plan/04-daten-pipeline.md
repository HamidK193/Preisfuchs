# Teilplan 04 – Daten-Pipeline für die SwiftUI-App

Stand: 10.10.2026. Teil von `docs/SWIFTUI_PLAN.md`.
Grundlage sind `backend/jobs/*.py` mit Tests, `.github/workflows/*.yml`, `data/`,
`supabase/migrations/`, `docs/KATALOG_IMPORT.md`, `docs/PRODUKT_VERGLEICHSREGELN.md`,
`docs/GESAMTPLAN.md`, `memory.md` und `CHANGELOG.md`. Dazu kommt eine **nur lesende**
Abfrage der Supabase-Datenbank (`eanggjsdpjjskqycvknx`) vom 10.10.2026. Es wurde kein Job
ausgeführt und nichts geschrieben.

Das Backend bleibt für die SwiftUI-App unverändert. Dieser Teilplan beschreibt, was die
Pipeline heute liefert, wie die App die Daten ehrlich darstellt und welche Lücken vor einer
guten App-Erfahrung geschlossen werden müssen. Es gelten nur kostenlose oder offene Quellen
und kein Scraping geschützter Seiten.

---

## 1. Kurzfassung

- **Preise:** Die Preise kommen fast vollständig aus Open Prices (ODbL). Die öffentliche View
  `current_price_observations` hat 1.186 Zeilen, 1.180 bestätigte Artikel, 27 Händler und
  13 Bundesländer. Community-Meldungen über `report-price` sind technisch bereit, bisher gibt
  es aber keine.
- **Frische:** 443 Preise sind höchstens 30 Tage alt, 743 sind 31 bis 90 Tage alt. Die
  90-Tage-Grenze gilt nur beim Import. Veröffentlichte Preise altern in der View weiter.
  Der älteste öffentliche Preis (20.07.2026) überschreitet am **18.10.2026** die 90 Tage.
  Ein Ablauf-Job oder ein View-Filter ist deshalb die dringendste Pipeline-Aufgabe.
- **Märkte:** 26.300 aktive Filialen von 16 Ketten in allen 16 Bundesländern (OSM, wöchentlich).
- **Produktbilder:** Es gibt praktisch keine. `off_products` hat nur 6 Zeilen, nämlich die
  Seed-GTINs. Keines der Bilder ist geprüft (`image_reviewed = false`).
- **Prospekte und Angebote:** `retailer_offers` ist leer, weil die Händlerseiten automatische
  Abrufe blocken. kaufDA bleibt nur ein interner Prüf-Check.
- **Kategorien:** 132 Artikel liegen unter „Sonstiges“.
- **Packungsgrößen:** 1.080 Artikel speichern `package.total` in wissenschaftlicher Notation
  (z. B. `"5E+2"`).

---

## 2. Ist-Zustand

### 2.1 Agents und Zeitplan

| Agent | Takt (Workflow) | Quelle / Lizenz | Schreibt in | Status 10.10. |
| --- | --- | --- | --- | --- |
| `open_prices_de_agent.py` | täglich 05:00 UTC (`daily-price-update.yml`, Schritt mit `if: always()`) | Open Prices, ODbL 1.0 | `products`, `catalog_articles`, `price_observations`, `update_runs` (`source = "Open Prices DE"`) | läuft; Erstlauf 07.10. mit 1.439 Zeilen, danach 29/52/7 neue pro Tag |
| `price_update_job.py` (Seed-Job) | täglich, im selben Workflow vor dem DE-Agent | Open Prices je Seed-GTIN | `products`, `catalog_articles`, `price_observations`, `update_runs` (`"Open Prices"`), lokal `artifacts/latest-import.json` | läuft; importiert täglich dieselben 6 Zeilen; **nur Baden-Württemberg** (`outside_or_unverified_bw`), also ein Überbleibsel aus dem Pilot |
| `kaufda_check.py` | kein eigener Lauf; wird vom DE-Agent aufgerufen | kaufDA-HTML, Lizenz ungeklärt | nichts Öffentliches; Ergebnis nur in `raw_payload.kaufda_check` | aktiv als interner letzter Check |
| `osm_stores_agent.py` | wöchentlich Mo 02:00 UTC (`weekly-data-agents.yml`, eigener Job) | OpenStreetMap/Overpass, ODbL 1.0 | `retailers`, `stores`, `update_runs` | Volllauf 04.10.: 26.300 Filialen; erster geplanter Lauf am 12.10. |
| `off_products_agent.py` | wöchentlich Mo 02:00 UTC (eigener Job) | Open Food Facts, Daten ODbL, Bilder CC BY-SA 3.0 | `off_products`, `update_runs` | Lauf 04.10.: 6 GTINs. Der nächste Lauf nimmt alle 1.402 GTINs aus `catalog_articles` auf (bei 0,7 s Pause etwa 17 Minuten) |
| `retailer_offers_agent.py` | **nicht eingeplant** | Händlerseiten (nur bei robots.txt-Erlaubnis) | `retailer_offers` | Rewe-Adapter fertig, aber Rewe antwortet mit 403 (Fingerprint), Netto und Kaufland ebenfalls mit 403, Norma verbietet per robots.txt, Penny und Aldi laden per JavaScript-API → nicht umgehen |
| Edge Function `report-price` | bei Bedarf (App) | eigene Nutzermeldungen | `price_reports`, `price_observations` (`source = "Preisfuchs Nutzermeldung"`) | live; 0 Meldungen |

Gemeinsames Gerüst (`agent_common.py`):

- `PRICEFUCHS_DRY_RUN=1` liest nur und schreibt nichts.
- Jeder Lauf erzeugt eine `update_runs`-Zeile mit `status` (`succeeded` / `partial` /
  `failed` / `no_data`), `imported_count` und dem JSON-`report`.
- Die GTIN-Prüfziffer wird geprüft.
- Der User-Agent lautet `Preisfuchs-MVP/0.2`.

Vor jedem Lauf führt CI die Unit-Tests aus (`test_*.py`, `test_source_agents`).

### 2.2 Datenfluss

```
Open Prices API ──(täglich, Cursor über alle Preise, nur DE)──► open_prices_de_agent
        │                                   │ kaufDA-Check (intern, ≤14 Tage alt)
        ▼                                   ▼
 products (gtin_<EAN>) ─ catalog_articles (verified/needs_review) ─ price_observations (is_public)
                                                                          │
App-Meldungen ── report-price (Edge Function) ────────────────────────────┤
                                                                          ▼
                          RLS-Policy + View current_price_observations (security_invoker)
                                                                          │
OSM/Overpass ──(wöchentlich)──► stores ────────────┐                      │
Open Food Facts ──(wöchentlich)──► off_products ───┼──► SwiftUI-App (supabase-swift, anon)
(leer) retailer_offers ────────────────────────────┘
```

### 2.3 Qualitäts-Gates

**Open-Prices-DE-Agent (Publikations-Gate, beschlossen am 07.10.2026).**
Eine Beobachtung wird importiert, wenn alle folgenden Punkte zutreffen:

- `osm_address_country_code = DE`
- `type = PRODUCT`
- EUR
- kein `duplicate_of`
- kein `price_per`
- gültige GTIN
- Preis > 0

Sie wird **öffentlich** (`is_public = true`, `confidence 0.85`), wenn zusätzlich keiner dieser
Gründe in `review_reasons` steht:

| Grund | Bedeutung | Ebene |
| --- | --- | --- |
| `not_in_open_food_facts` | Produkt ohne OFF-Datensatz oder ohne Namen | Artikel → `needs_review` |
| `quantity_ambiguous` | Menge nicht eindeutig lesbar (z. B. Abtropfgewicht, „ca.“) | Artikel |
| `unit_price_implausible` | Grundpreis außerhalb 0,05–150 €/kg bzw. l oder 0,01–50 €/Stück | Artikel |
| `too_old` | Beobachtung älter als **90 Tage** (`MAX_AGE_DAYS`) | nur Beobachtung |
| `kaufda_price_mismatch` | kaufDA-Angebot desselben Händlers weicht um mehr als Faktor 2 ab | nur Beobachtung |

**OSM-Relationen-Filter.** Nur `location_osm_type` NODE oder WAY wird übernommen. Relationen
sind in Open Prices oft Regionen wie ein ganzes Bundesland, also kein Ort zum Einkaufen. Dazu
muss `osm_tag_key` leer oder `shop` sein. Ältere Zeilen mit dem Grund `not_a_shop` (48) stammen
aus einer früheren Codeversion.

**kaufDA als letzter Check.**

- Der Check läuft nur für Beobachtungen, die alle anderen Prüfungen bestanden haben und höchstens
  14 Tage alt sind.
- Abgedeckt sind 9 Ketten (`KAUFDA_RETAILERS`).
- Er braucht eine Namensähnlichkeit von mindestens 0,5 (Jaccard auf Tokens). Als Abweichung
  gilt ein Verhältnis außerhalb von 0,5 bis 2,0.
- Budget: 120 Anfragen pro Lauf, Cache je (Händler, Suchbegriff), 1 s Pause.
- Bei 401, 403 oder 429 stoppt er sofort, statt es erneut zu versuchen.
- Nur `mismatch` blockiert eine Beobachtung. `no_match` und `unavailable` geben sie frei.
- **kaufDA-Daten werden nie veröffentlicht.** Der Seed-Job bricht sogar ab, wenn
  `ENABLE_UNLICENSED_KAUFDA_IMPORT` gesetzt ist. Die 8.935 alten kaufDA-Zeilen bleiben intern.
- *Prospekte:* Heute prüft der Check nur Open-Prices-Beobachtungen. Für `retailer_offers` und
  Community-Meldungen gibt es noch keinen kaufDA-Gegencheck. Er ist in Abschnitt 5 eingeplant
  (gleiche Klasse `KaufdaChecker`, Ergebnis nur intern).

**Datenbank-Gates.**

- Die RLS-Policy auf `price_observations` lässt nur `is_public`, `price_basis = 'pack'`,
  `country_code = 'DE'` und einen bestätigten Artikel durch.
- Die View `current_price_observations` filtert zusätzlich auf `valid_from` und `valid_until`
  und behält je Artikel, Händler, Standort und Preisbedingung nur die neueste Beobachtung.
- Seit der Migration `open_public_prices_germany` (07.10.) gibt es **keinen Regionsfilter**
  mehr. Der Hinweis auf „belegtes Baden-Württemberg“ in `KATALOG_IMPORT.md` ist veraltet.
- `raw_payload` und `review_reasons` sind für anon und authenticated nicht lesbar.

**Katalog-Gate (Seed-Katalog, `catalog_identity.py`).**

- Vergleichsgruppen (`comparison_key = group:…`) entstehen nur für bestätigte Eigenmarken oder
  unmarkierte Ware, bei der alle Pflichtmerkmale aus `data/product_rules.json` bekannt sind.
- Herstellerartikel bleiben über ihre GTIN vergleichbar (`gtin:<EAN>`).
- Manuelle Korrekturen stehen in `data/catalog_corrections.json` (`replace` / `isolate`) und
  brauchen einen Beleg.

### 2.4 Datenstand (lesend abgefragt, 10.10.2026)

| Kennzahl | Wert |
| --- | --- |
| `price_observations` gesamt / öffentlich | 10.468 / 1.239 (davon 8.935 interne kaufDA-Altzeilen) |
| `current_price_observations` (View) | 1.186 Zeilen, alle `source = Open Prices` |
| `catalog_articles` / verified | 1.402 / 1.180, alle mit GTIN |
| Seed-Produkte (76) mit öffentlichem Preis | 3 |
| Händler in der View | 27. Netto Marken-Discount 271, Rewe 204, Kaufland 156, Lidl 154, Netto (Stavenhagen) 135, Edeka 103, Penny 28, Aldi Süd 22, dm 16, Aldi Nord 15, Rest einstellig bis 15 (CAP, Rossmann, Go Asia, Norma, famila, Feneberg, Müller, tegut, HIT, Wochenmarkt …) |
| Bundesländer in der View | 13 plus 89 Zeilen ohne `region`. Brandenburg 294, Berlin 288, Bayern 170, NRW 155, BW 99, Thüringen 43, Sachsen 22, MV 13, sonst ≤ 4. Bremen, Hamburg und Saarland fehlen |
| Mit Filialbezug (`store_id`) | 1.094 von 1.186 |
| Alter | 0–30 Tage: 443, 31–90 Tage: 743 (davon > 60 Tage: 96), ältester 20.07.2026 |
| Kategorien (Artikel) | Trockenware 243, Molkerei 184, Getränke 149, **Sonstiges 132**, Süßigkeiten 127, Fleisch 70, Gemüse 60, Backwaren 49, Frische 47, Tiefkühl 35, Obst 29, Backen 7 |
| Interne Zeilen nach Grund | `quantity_ambiguous` 126, `not_in_open_food_facts` 58 (+49 kombiniert), `not_a_shop` 48, `too_old` 6, `unit_price_implausible` 3, `kaufda_price_mismatch` 2 |
| `stores` aktiv | 26.300 |
| `off_products` / mit Bild / Bild geprüft | 6 / 6 / **0** |
| `retailer_offers` | 0 |
| `price_reports` | 0 |
| `package.total` in E-Notation | 1.080 Artikel |

Das sind Beobachtungen aus Open Prices, keine flächendeckende Erhebung. Die Verteilung folgt
den Open-Prices-Mitwirkenden (Schwerpunkt Berlin und Brandenburg), nicht dem Markt.

### 2.5 Monitoring heute

- Jeder Lauf erzeugt eine Zeile in `update_runs` mit Bericht (Zähler, Gründe, Cursor,
  kaufDA-Statistik). Die Tabelle ist nur für das Backend da (RLS ohne Client-Policy).
- Der Seed-Job schreibt die Job-Zusammenfassung in GitHub Actions (`GITHUB_STEP_SUMMARY`). Der
  DE-Agent schreibt seinen Bericht nur ins Log.
- Bei `partial` oder `failed` beenden sich die Agents mit Exit-Code 1, und der Workflow-Lauf
  wird rot. Benachrichtigt wird nur über die Standard-Mails von GitHub.
- Es gibt keine Prüfung auf Frische („seit X Tagen kein neuer Preis“), keinen Alarm für Läufe,
  die ausbleiben, und keine öffentliche Statusanzeige für die App.

---

## 3. Wie die SwiftUI-App die Daten konsumiert

### 3.1 Lesepfade (anon-Key, `supabase-swift`)

| Zweck | Quelle | Felder / Abfrage |
| --- | --- | --- |
| Preise | `current_price_observations` | `id, product_id, article_id, article_name, brand_name, package, comparison_key, retailer_id, retailer_name, store_id, region, price, regular_price, offer_type, observed_at, valid_until, source, source_url, source_license, location_label, requires_app, app_name` |
| Kategorie und Seed-Infos | `products` | `id, name, category, package_size, search_terms` |
| Produktinfos und Bild | `off_products` | `gtin, nutriscore_grade, nutriments, labels_tags, allergens_tags, image_url, image_reviewed, image_attribution, image_license` |
| Märkte in der Nähe | `stores` + `retailers` | Bounding-Box auf `latitude/longitude`, `is_active = true`. Fallback Overpass wie in `mobile/src/lib/osm.ts` |
| Angebote | `retailer_offers` | `is_public` und `valid_until >= heute` (heute leer) |
| Preis melden | Edge Function `report-price` | siehe Teilplan Backend-Anbindung |

Die Expo-App (`mobile/src/lib/prices.ts`) lädt die View in Seiten zu 1.000 Zeilen (maximal 10)
komplett und gruppiert auf dem Gerät nach `article_id`. Bei ~1.200 Zeilen ist das in Ordnung.
Ab etwa 5.000 Zeilen sollte die SwiftUI-App serverseitig filtern (Suche, Kategorie, Umkreis),
siehe 5.3.

### 3.2 Frische, Quelle und Datum je Preis (Pflicht nach `AGENTS.md`)

Jeder Preis zeigt in Liste, Detail und Warenkorb:

- **Quelle** als Klartext: „Open Prices“ bzw. „Community“ für
  `source = "Preisfuchs Nutzermeldung"`, bei Angeboten `source_label` wörtlich. Dazu gehört ein
  Link auf `source_url`, den konkreten Beleg.
- **„Beobachtet am TT.MM.JJJJ“** aus `observed_at`. Nie „aktuell“ oder „live“.
- **Ort** aus `location_label` (z. B. „Rewe, Berlin“). Der Preis gilt für diese beobachtete
  Filiale und wird nicht der nächsten OSM-Filiale zugeschrieben.
- **Altersstufen** (wie `STALE_AFTER_DAYS = 30` in der Expo-App):
  - 0–30 Tage: normal.
  - 31–90 Tage: Hinweis „möglicherweise veraltet“.
  - > 90 Tage: darf nicht mehr erscheinen. Die App filtert das zusätzlich selbst, solange der
    Server es nicht tut.
- **Angebot:** `offer_type = sale` mit `regular_price`. Eine Ersparnis wird nur gezeigt, wenn ein
  Normalpreis beobachtet wurde. Rabattprozente werden nie erfunden.
- **Lizenzhinweise** im Screen 39 „Datenquellen & Transparenz“ und im Impressum: Open Prices und
  OSM (ODbL, „© OpenStreetMap-Mitwirkende“), Open Food Facts (ODbL bzw. Bilder CC BY-SA 3.0 mit
  Namensnennung direkt am Bild).
- **Datenstand pro Quelle** (letzter erfolgreicher Lauf): Heute kann die App diesen Wert nicht
  lesen, weil `update_runs` gesperrt ist. Eine öffentliche View `data_status` ist nötig (5.1).

### 3.3 Abdeckung ehrlich darstellen

- **Händler:** Die View enthält 27 Händlernamen. Die Expo-App kennt nur 9 Ketten (`chainFor`)
  und **verwirft alle anderen Preise stillschweigend**, darunter Netto (Stavenhagen) mit 135
  Zeilen sowie dm, Rossmann und Globus. Die SwiftUI-App soll alle Händler zeigen: bekannte
  Ketten mit Logo, alle anderen mit neutralem Badge und Namen. Das Mapping kommt aus
  `retailer_id` (gleiche IDs wie `osm_stores_agent.RETAILERS`), nicht aus einem Regex auf den
  Namen.
- **Regionen:** Preise kommen aus ganz Deutschland. Für PLZ und Umkreis zählt der Ort der
  Beobachtung (`store_id` → `stores.latitude/longitude`), nicht ein festes Bundesland. Fehlen
  nahe Preise, zeigt die App das offen („Für deine Umgebung liegen wenige Beobachtungen vor;
  angezeigt werden Preise aus …“).
- **Kein Preis ist kein 0 €:** Fehlende Preise im Warenkorb erzeugen eine gekennzeichnete
  Teilsumme.

### 3.4 Bekannte Datenqualitätsprobleme, die die App abfangen muss

| Problem | Ursache | Umgang in SwiftUI |
| --- | --- | --- |
| `package.total`/`amount` als `"5E+2"` (1.080 Artikel) | `Decimal.normalize()` in `catalog_identity.parse_package`. Laut `memory.md` hängen Vergleichsschlüssel daran, also nicht ohne Migration ändern | Mit `Double(String)` parsen (das versteht Exponenten) oder mit `Decimal(string:)` und einem Unit-Test für `"5E+2"`, `"1E+3"`, `"250"`, `"1.5"`. Als Anzeigetext immer `package.original` verwenden, nie `total` |
| `package_size` = OFF-Rohtext (z. B. „500 g ℮“, „1 l = 1000 ml“) | Agent übernimmt `quantity` ungefiltert | Für die Anzeige `package.original`, für Rechnungen `total` und `unit` |
| 132 Artikel „Sonstiges“ | `CATEGORY_RULES` greift nicht | Eigene Kategorie „Weitere Produkte“, siehe 4.4 |
| 89 Preise ohne `region` bzw. `store_id` | Filiale nicht in `stores` (andere Kette, fehlende OSM-ID) | Ort aus `location_label` zeigen; aus der Umkreissuche ausschließen oder getrennt anzeigen |
| Mehrere Zeilen je Artikel und Händler (verschiedene Filialen) | View ist je Standort eindeutig | Je Händler die neueste Beobachtung anzeigen, die anderen Filialen im Detail; bei Gleichstand den Preis ohne App |
| Name ohne Marke oder in Großbuchstaben | OFF-Daten | Nur anzeigen, nicht umformatieren (keine erfundenen Namen) |
| Doppelte Produktwelt: 76 Seed-Produkte (`milk_15` …) und GTIN-Produkte (`gtin_<EAN>`) | Zwei Jobs, zwei Modelle | Die App behandelt `article_id` als Produktidentität. Seed-Produkte haben nur 3 Preise; als Kategorie- bzw. Such-Einstieg nutzen |
| Seed-Job ist auf BW beschränkt und nimmt Freigaben für abgewiesene `source_ref` zurück (`source = "Open Prices"`) | Pilot-Code | Heute ohne Folgen (0 doppelte `source_ref`). Latentes Risiko: Eine Seed-GTIN außerhalb BW, die der DE-Agent veröffentlicht, würde am nächsten Tag wieder verborgen. Siehe 5.1 |
| Bilder ungeprüft | `image_reviewed` wird nirgends gesetzt | Gekennzeichnetes Kategorie-Symbolbild statt ungeprüftem Packshot |

---

## 4. Was für eine gute App-Erfahrung fehlt

### 4.1 Produktbilder-Pipeline

- **Ist:** Ein geprüftes Bild (`data/article_images.json`, Öl 500 ml). `off_products` hat
  6 ungeprüfte Bilder. Die Expo-App zeigt nur Bilder mit `image_reviewed = true` und damit heute
  keines.
- **Vorschlag (kostenlos):**
  1. `off_products_agent` deckt ab dem nächsten Lauf alle 1.402 GTINs ab. Dafür reicht der
     geplante Montagslauf, sonst ein manueller `workflow_dispatch`.
  2. **Halbautomatische Prüfung:**
     - Ein neuer Schritt im OFF-Agent setzt `image_candidate_status`. Automatisch „plausibel“
       wird ein Bild, wenn das OFF-Bild existiert, die OFF-`quantity` zur geparsten Packung des
       Artikels passt und der OFF-Datensatz jünger als 2 Jahre ist.
     - `image_reviewed = true` bleibt eine menschliche Entscheidung. Kleine Prüfliste als
       GitHub-Issue oder als einfache Admin-Seite, z. B. 50 Bilder pro Woche nach Häufigkeit
       in Listen.
     - *Entscheidung des Users:* Reicht „plausibel“ für die Anzeige mit dem Hinweis
       „Foto: Open Food Facts, nicht geprüft“?
  3. Die Bilder werden **per URL von `images.openfoodfacts.org`** geladen, mit Namensnennung am
     Bild (CC BY-SA 3.0). Kein eigenes Hosting nötig. Optional später Kopien im
     Supabase-Storage (Free-Tier-Grenzen beachten).
  4. Fallback: Kategorie-Symbolbilder, sichtbar als Symbolbild gekennzeichnet. KI-Bilder nur
     nach Freigabe einer Bezahl-API, laut `AGENTS.md` derzeit ausgeschlossen.
- In SwiftUI: `AsyncImage` mit Platzhalter und Cache (`URLCache`). Die Bildquelle steht als
  Overlay oder unter dem Bild.

### 4.2 Prospekt- und Angebotsdaten

- **Ist:** Die Tabelle `retailer_offers` und der Rewe-Adapter sind fertig, aber blockiert.
  kaufDA ist nicht lizenziert. Screen 7 „Alle Angebote“ hat damit keine echten Daten.
  Angebote gibt es heute nur indirekt über Open-Prices-Zeilen mit `price_is_discounted`.
- **Offene, kostenlose Wege (ohne Umgehung):**
  1. **Community-Angebote:** Nutzer melden Prospektpreise oder Regalaktionen über
     `report-price` mit `valid_until` und optionalem Foto. Bei „gilt bis“ übernimmt der Server
     `valid_until`; die View blendet abgelaufene Angebote aus. Gleiche Freigabe-Regel wie heute:
     zwei übereinstimmende Meldungen oder ein plausibles Foto.
  2. **Open-Prices-Rabatte** prominent als „Angebot (beobachtet)“ zeigen: `offer_type = sale`
     und Beobachtung höchstens 14 Tage alt.
  3. **Händler-Adapter erneut prüfen** (vierteljährlich, automatisch als Dry-Run): robots.txt
     und HTTP-Status je Händler protokollieren. Eingeplant wird ein Adapter erst, wenn der
     Abruf erlaubt ist und funktioniert. Fingerprinting wird nie umgangen.
  4. **Lizenz-Feed** (Bonial/kaufDA, marktguru, Händler direkt): nur mit schriftlicher
     Erlaubnis. Wahrscheinlich kostenpflichtig, deshalb eine Entscheidung des Users.
- **kaufDA als letzter Check für Angebote:** `KaufdaChecker.check()` läuft vor
  `is_public = true` auch für `retailer_offers` und Community-Angebote (gleiche Regeln:
  ≤ 14 Tage, Faktor 0,5–2, Budget). Das Ergebnis geht nur in ein internes Feld, nie in die App.
- Die App zeigt den Angebotszeitraum als „5.–11. Oktober“ (nie „KW“), dazu immer die Quelle.

### 4.3 Markt-Standorte

- **Ist:** Gut abgedeckt (26.300 Filialen, ~94 % mit Öffnungszeiten, ODbL).
- **Lücken:**
  - Drogerien (dm, Rossmann, Müller), Bio-Märkte (denn's, Alnatura) und Regionalketten
    (Feneberg, CAP, Globus u. a.) erscheinen in Preisen, aber nicht in `stores`. Grund: Die
    Abfrage holt nur `shop=supermarket|discount_supermarket` und 16 Ketten. Erweiterung um
    `shop=chemist` und weitere Ketten über `brand:wikidata`.
  - Für die Kartenansicht fehlt eine Umkreissuche auf dem Server (PostGIS oder
    Bounding-Box-RPC). Heute filtert der Client per Bounding-Box. Bei Radien bis 20 km reicht
    das.
  - `opening_hours` ist OSM-Syntax. Die App braucht einen Parser für „Jetzt geöffnet“. Es gibt
    keine Swift-Bibliothek dafür ohne Prüfung, also einen eigenen kleinen Parser für die
    häufigen Formen (`Mo-Sa 07:00-22:00`) und sonst den Rohtext.
  - Deaktivierung geschlossener Filialen nur nach vollständigem Lauf (schon umgesetzt).
- PLZ → Koordinate: heute über Nominatim (Web). Für die App besser auf dem Gerät
  (`CLGeocoder`/`MapKit`, kostenlos) oder als OSM-PLZ-Tabelle in Supabase. Entscheidung offen.

### 4.4 Kategorien

- 12 App-Kategorien aus `CATEGORY_RULES`, dazu „Sonstiges“ (132 Artikel). Drogerie hat keinen
  eigenen Treffer, Baby und Tierbedarf kaum.
- **Vorschlag:**
  - `CATEGORY_RULES` um häufige OFF-Tags der „Sonstiges“-Artikel erweitern: einmal die Tags
    auswerten, Ergebnis als Testfälle festhalten.
  - Nicht-Lebensmittel über Open Beauty Facts und Open Products Facts erkennen (Drogerie,
    Haushalt).
  - Kategorie-Overrides je GTIN in `data/catalog_corrections.json` (vorhandenes
    `replace`-Format) statt im Code.
  - Die App bekommt die Kategorie-ID aus `products.category`. Eine Zuordnungstabelle zu den
    App-Kategorien liegt im Swift-Code (wie `CATEGORY_MAP` in Expo).

### 4.5 Barcode- und GTIN-Abdeckung

- Alle 1.402 Katalogartikel haben eine GTIN. Der Scanner findet aber nur Produkte, für die
  schon ein Preis existiert.
- **Vorschlag:**
  - Scan ohne Preis: `off_products` bzw. die OFF-API live (100 Abrufe/Minute erlaubt) liefert
    Name und Bild. Danach „Noch kein Preis – jetzt melden?“ über `report-price`. So wächst die
    Abdeckung durch Nutzer.
  - Die 76 Seed-Produkte haben nur 6 Barcodes. Sie werden über die GTIN-Artikel abgedeckt,
    nicht über weitere Seed-Barcodes.
  - Optional: Preisfuchs-Meldungen mit Zustimmung des Nutzers an Open Prices zurückspielen
    (offene Lizenz, eigener Account bei Open Prices). Entscheidung des Users, siehe 6.

### 4.6 Suche

- `products.search_terms` enthält nur Name und Anzeigename. Es fehlen Synonyme („H-Milch“,
  „Haltbarmilch“), Umlaut-Varianten und Marke.
- Vorschlag: serverseitige Volltextsuche (Postgres `tsvector`, Sprache `german`) als RPC
  `search_products(q, lat, lon, radius_km)`. Bis dahin sucht die App lokal in den geladenen
  Daten.

---

## 5. Roadmap der Pipeline nach App-Phasen

Die Phasennamen sollen in `docs/SWIFTUI_PLAN.md` angeglichen werden. Alle Schritte nutzen das
vorhandene Backend und kostenlose Quellen. Neue DDL läuft nur als Migration mit expliziten
GRANTs (das Projekt vergibt keine Standardrechte).

### 5.1 Phase 0 – vor dem ersten SwiftUI-Build (sofort, unabhängig von Xcode)

1. **Ablauf der 90-Tage-Grenze (bis 18.10.2026).** Beides wird umgesetzt:
   - Die View `current_price_observations` bekommt zusätzlich
     `and p.observed_at >= now() - interval '90 days'`.
   - Ein täglicher Schritt im Daily-Workflow setzt `is_public = false` mit Grund `too_old` für
     ältere Zeilen (Historie bleibt erhalten).
2. **`data_status`-View** (öffentlich lesbar): je Quelle der letzte erfolgreiche Lauf,
   `imported_count` und die neueste `observed_at`. Ohne den Bericht, ohne Fehlermeldungen. Damit
   zeigt Screen 39 „Datenstand pro Quelle“.
3. **Seed-Job bereinigen:**
   - Entweder den BW-Filter auf DE umstellen und die Rücknahme von Freigaben auf
     Zeilen mit eigener `id` begrenzen.
   - Oder den Seed-Job ganz abschalten, weil der DE-Agent dieselben GTINs bereits abdeckt.
   - Empfehlung: abschalten. Entscheidung des Users, siehe 6.
4. **OFF-Agent einmal manuell starten** (`workflow_dispatch`), damit `off_products` alle
   1.402 GTINs enthält. Danach weiter wöchentlich.
5. **E-Notation dokumentieren** und als Swift-Unit-Test festhalten. Das Backend bleibt
   unverändert.

### 5.2 Phase 1 – lesende MVP-App (Suche, Produkt, Preise, Märkte)

- `retailer_id` in die App-Abfrage aufnehmen und alle Händler anzeigen (kein stilles Verwerfen).
- Kategorie-Regeln erweitern („Sonstiges“ < 5 %) und Kategorie-Overrides per Korrekturdatei.
- Bildprüfung starten (4.1). Ziel: geprüfte oder plausible Bilder für die 200 häufigsten
  Artikel.
- OSM-Agent: Drogerie- und Bio-Ketten ergänzen, `brand:wikidata` als Hauptschlüssel.
- Lesepfad: Bis 5.000 Zeilen lädt die App die View komplett und cacht sie offline mit Datum.
  Darüber übernimmt die RPC `search_products` bzw. eine Abfrage pro Umkreis.

### 5.3 Phase 2 – Mitmachen (Scanner, Preis melden, Listen und Familie)

- Scanner-Fallback auf OFF für unbekannte GTINs. Neue GTINs aus Meldungen nimmt der nächste
  OFF-Lauf automatisch auf, weil sie über `catalog_articles` laufen. Zu prüfen ist, ob
  `report-price` einen Artikel anlegt.
- kaufDA-Gegencheck auch für Community-Meldungen (intern, mit Budget).
- Servervolltextsuche (`tsvector german`, Synonymliste in `data/`).

### 5.4 Phase 3 – Angebote, Preisalarme, Push

- Community-Angebote mit `valid_until`. Die View blendet abgelaufene aus.
- Vierteljährlicher Dry-Run-Check der Händler-Adapter (nur Protokoll, kein Import).
- Preisalarm-Abgleich serverseitig nach jedem Daily-Lauf (neue Beobachtung unter dem
  Wunschpreis). Push über APNs braucht das Apple Developer Program, siehe Teilplan Architektur.

### 5.5 Phase 4 – Launch und Betrieb

- Optional ein Lizenz-Feed für Prospekte (nur nach Entscheidung und schriftlicher Erlaubnis).
- Optional die Rückgabe von Community-Preisen an Open Prices.
- Datenbankgröße im Free-Tier beobachten (heute ~10.000 Beobachtungen, Wachstum ~50 pro Tag).
  Interne kaufDA-Altzeilen können archiviert werden.

### 5.6 Monitoring und Fehlerbehandlung (ab Phase 0, kostenlos)

| Was | Wie |
| --- | --- |
| Lauf fehlgeschlagen | Exit-Code 1 → roter Workflow → GitHub-Mail (vorhanden). Zusätzlich die DE-Agent- und Weekly-Berichte in `GITHUB_STEP_SUMMARY` schreiben |
| Lauf ausgeblieben (GitHub-Cron startet oft verspätet, der Daily-Lauf z. B. um ~11:30 statt 05:00 UTC; bei öffentlichen Repos deaktiviert GitHub Zeitpläne nach 60 Tagen ohne Aktivität) | Täglicher Health-Check-Schritt: Ist der letzte `succeeded`-Lauf je Quelle älter als die Schwelle (Open Prices DE 2 Tage, OSM und OFF 9 Tage), schlägt der Schritt fehl und legt ein GitHub-Issue an |
| Frische | Health-Check: neueste öffentliche `observed_at` älter als 7 Tage → Warnung. Anteil > 30 Tage über 70 % → Warnung |
| Qualitätsdrift | Health-Check vergleicht `review_reasons`-Verteilung und Veröffentlichungsquote mit dem 7-Tage-Mittel (z. B. Quote < 50 % → Warnung) |
| Quellen-Sperren | kaufDA `blocked`, Overpass 429/504, OFF 429: werden schon gezählt bzw. per Backoff behandelt. Neu: als Warnung im Bericht hervorheben, nie umgehen |
| Teilerfolg | OSM: `partial` deaktiviert keine Filialen (vorhanden). OFF: Fehler je GTIN, Lauf läuft weiter (vorhanden). Open Prices: Cursor nur aus `succeeded`-Läufen, also wiederholt ein Fehlschlag automatisch (vorhanden) |
| Rollback | Jede Beobachtung hat `source_ref`. Fehlerhafte Importe lassen sich per `is_public = false` gezielt zurücknehmen, ohne zu löschen |
| App-Seite | `data_status` zeigt den Datenstand. Ohne Verbindung zeigt die App den Cache mit Datum („Stand: …, offline“). Leere oder fehlerhafte Antworten werden nie als „keine Preise“ ohne Hinweis angezeigt |

---

## 6. Offene Entscheidungen für den User

1. **Ablauf alter Preise:** 90 Tage als harte Grenze (View und Ablauf-Job) bestätigen, oder
   eine kürzere Grenze (z. B. 60 Tage)? Mit 60 Tagen fielen heute 96 von 1.186 Preisen weg.
2. **Seed-Job (`price_update_job.py`):** abschalten (Empfehlung) oder auf ganz Deutschland
   umbauen?
3. **Produktbilder:** Dürfen automatisch „plausible“ OFF-Bilder mit dem Hinweis „nicht geprüft“
   gezeigt werden, oder nur manuell geprüfte? Wer prüft, und wie viele pro Woche?
4. **Prospekte:** Community-Angebote als einzige kostenlose Quelle akzeptieren, oder Anfrage
   bei Bonial/marktguru bzw. Händlern nach einem (vermutlich kostenpflichtigen) Lizenz-Feed?
5. **Händler außerhalb der 9 Logo-Ketten** (dm, Rossmann, Netto Stavenhagen, Regionalketten):
   in der App mit neutralem Badge zeigen (Empfehlung) oder ausblenden?
6. **Drogerie und Bio-Märkte** in den OSM-Agent aufnehmen?
7. **PLZ-Geocoding:** auf dem Gerät mit Apple `CLGeocoder` (kostenlos, Apple-Dienst) oder über
   eine OSM-PLZ-Tabelle in Supabase (offen, mehr Pflege)?
8. **Rückgabe an Open Prices:** Community-Preise mit Zustimmung des Nutzers an Open Prices
   zurückgeben?
9. **Monitoring-Kanal:** reichen GitHub-Mails und Issues, oder zusätzlich ein Kanal wie E-Mail
   an eine eigene Adresse?
