# Preisfuchs

Preisfuchs ist ein iOS- und Web-MVP für Lebensmittel-Preisvergleich in
ganz Deutschland (der erste Datenpilot lief in Baden-Württemberg). Die App zeigt für Standard-Lebensmittel beobachtete Preise,
Märkte, Quellen, Aktualität, Filialadressen und Öffnungszeiten an. Warenkörbe
können gespeichert und per Link geteilt werden; öffentliche App-Rabatte und
personalisierte Coupons bleiben getrennte, freiwillige Vergleichsoptionen.

Der erste kostenlose Ansatz kombiniert:

- lokale Demo-Daten für die iOS-App
- Supabase als Datenbank/API
- GitHub Actions als täglichen Update-Job
- Open Prices / Open Food Facts als offene Datenquelle
- OpenStreetMap/Overpass für Marktstandorte im PLZ-Umkreis

## Design-Konzept: 4. Oktober 2026

Das neue App-Design entsteht in Google Stitch (Projekt „Preisfuchs Grocery
Comparison App“), bevor weiter programmiert wird. Alle Seiten und die Sitemap
stehen im [Screen-Plan](docs/APP_SCREENS_PLAN.md), das Umsatzmodell (Plus-Abo,
markierte Anzeigen, Partnerlinks; Preis-Rangliste nie käuflich) in
[Monetarisierung](docs/MONETARISIERUNG.md).

Die neue App entsteht in `mobile/` mit Expo (React Native) für iOS und Android.
Testen auf dem iPhone ohne Mac: App „Expo Go“ installieren, PC und iPhone im
selben WLAN, dann `cd mobile` und `npx expo start --lan`, QR-Code scannen.
Die App zeigt vorerst Demo-Daten und kennzeichnet sie so.

## Arbeitsstand: 6. September 2026

Der ausführliche [Gesamtplan](docs/GESAMTPLAN.md) enthält die Reihenfolge für
Webdesign, Produktidentität, Quellen, Supabase-Rollout und Betrieb. Die
[Merkmalmatrix](docs/PRODUKT_VERGLEICHSREGELN.md) erfasst alle 76 bestehenden
Produktarten und die geplanten Ergänzungen Kinder Joy und Pokémon.

Die Weboberfläche wurde neu gestaltet: Einkaufszettel als Einstieg, sichtbarer
Demo-/Beobachtungsstatus, Händlerabdeckung, Quellen und Datum an Produktpreisen
sowie eine funktionierende Auswahl für Produkte mit Preisbeobachtung.
„Einkauf vergleichen“ führt zu Ein-Laden- und Mehr-Läden-Plänen.
Das strukturierte Katalogmodell trennt Produktart, Vergleichsgruppe, Artikel,
Packung und Preisbeobachtung. Eigenmarken benötigen vollständig bestätigte
Merkmale. Manuelle Korrekturen bleiben beim Reimport erhalten; Herstellerartikel
besitzen händlerübergreifende IDs. [Modell und Bedienung](docs/KATALOG_IMPORT.md).

Supabase ist wieder **aktiv**. Sechs Erweiterungsmigrationen sind eingespielt,
Initialschema und Migrationshistorie abgeglichen. Alle 8.935 alten Beobachtungen
sind gesichert und erhalten; wegen ungeklärter kaufDA-Lizenz bleiben sie intern.
Der [BW-Pilot vom 6. September](docs/PILOT_2026-09-06.md) veröffentlicht erstmals
**3 geprüfte Artikel mit 6 Preisbeobachtungen**; die Preisview zeigt 4 Einträge
für Artikel/Standort. Die Preise stammen vom 2. Juni bis 22. August und sind
als möglicherweise veraltet gekennzeichnet. Der Reimport erhält Korrekturen und
Freigaben ohne doppelte Quellen-IDs. Die Demo bleibt separat verfügbar.
Ältere Zahlen unten sind historische Befunde.

Prüfstand: 33 Webtests, 19 Backendtests, Webbuild, Browserfluss mit echter
Preisview bei vier Breiten sowie Remote-Rollen- und API-Prüfung bestanden.
Vite meldet eine Größenwarnung für das etwa 501-kB-JavaScript-Bündel.
iOS benötigt weiterhin den Modellnachzug und Xcode.

Die lokale Gestaltung verwendet `web/src/shop.css`; `styles.css` enthält noch
den vorherigen Entwurf und wird nicht geladen. Screenshots und Browserbericht
liegen lokal unter `artifacts/live-pilot-20260906-final/` und werden nicht versioniert.
Der reproduzierbare Browsercheck startet und beendet seinen eigenen Vite-Prozess:

```powershell
uv --cache-dir .uv-cache run --python 3.12 --with-requirements scripts/requirements-browser.txt python scripts/inspect_web.py --start-server --live --label live-pilot --verify
```

Er verwendet einen installierten Edge-Browser, mit `--live` die echte öffentliche
Preisview, sonst die gekennzeichnete Demo. Standortantworten werden simuliert.
Das bestätigte Öl-Packungsfoto wird lokal geladen; Quelle und CC-BY-SA-Lizenz
sind sichtbar. Die anderen Pilotartikel verwenden gekennzeichnete Symbolbilder.
Zusätzlich prüft er den strukturierten Loader mit ausdrücklich synthetischen
API-Antworten. Echte Datenbankrechte werden durch separate Remote-Tests geprüft.

## Projektstruktur

```text
ios/Preisfuchs/                 SwiftUI-iOS-App
backend/supabase/schema.sql     Supabase-Datenbankschema
backend/jobs/                   Preis-Update-Job
data/standard_products.json     Standard-Lebensmittel für den MVP
docs/MVP_PLAN.md                Umsetzungsplan
docs/RESEARCH_REPOS_SKILLS.md   Recherche und Toolentscheidungen
docs/PRIVACY_DATA_FLOW.md       Datenschutz und Datenflüsse
THIRD_PARTY_NOTICES.md          Datenquellen, Attribution und Asset-Risiken
```

## Produktauswahl

Die Web-App startet nicht mehr mit einer langen Produktliste, sondern mit
Kategorien:

- Obst
- Gemüse
- Frische
- Molkerei
- Vorrat
- Getränke
- Süßigkeiten
- Tiefkühl
- Backen

Die aktuelle Stammdatenliste enthält 76 Lebensmittel und Alltagsprodukte,
darunter Bananen, Eier, Tomaten, Milch, Nudeln, Schokolade, Tiefkühlpizza,
Toastbrot, Müsli, Fleisch/Wurst, Drogerieartikel, Babyprodukte und Tierbedarf.
Produkte werden nicht mehr nur als generische Oberbegriffe angezeigt. Der
Katalog nutzt konkrete Produktnamen und Packungsgrößen wie `Milka Alpenmilch
Schokolade 100 g`, `funny-frisch Chipsfrisch Oriental 175 g`, `Barilla
Spaghetti n.5 500 g` oder `Milbona H-Milch 1,5% 1 l`. Importierte kaufDA-
Angebote mit eigenem Prospektnamen werden zusätzlich als eigene Warenkorb-
fähige Varianten gruppiert.

Produkte werden in der Web-App bevorzugt mit kuratierten echten Produkt- und
Packungsbildern angezeigt. Für bekannte Packshots nutzt die App Open Food
Facts, für frische Ware und Artikel ohne sauberen Packshot kuratierte
Lebensmittel-/Produktfotos. Erst danach fällt sie auf Kategorie-Bilder zurück.
Die freie Produktsuche bei Open Food Facts ist standardmäßig aus und kann nur
für Entwicklung mit einem Limit von 4 Suchen pro Ladevorgang aktiviert werden.
Neue strukturierte Artikel bekommen nur bei bestätigter Artikel-ID und passender
Packungsgröße ein Packshot aus `data/article_images.json`. Der frühere
Demo-Bildbestand ist noch nicht vollständig geprüft; bekannte Fehlzuordnungen
für Barilla, Backpulver und Senf wurden entfernt.
Für bekannte Prospektvarianten gibt es zusätzlich direkte produktspezifische
Packshots, damit z. B. Haribo Goldbären, Milka Alpenmilch, HiPP Fruchtbrei oder
Fairy Spülmittel nicht mehr nur ein generisches Kategorie-Bild bekommen.

In der Hauptansicht werden nur Produkte angezeigt, für die echte importierte
Preisbeobachtungen vorhanden sind. Produkte ohne aktuelle Quelle bleiben in der
Datenbank, werden aber nicht als Platzhalterpreis angezeigt.

## Shopping- und Warenkorb-Flow

Die Web-App ist als Einkaufsoberfläche aufgebaut:

- Angebots-Hero mit aktuellem günstigem Produkt
- Händler-Leiste für Lidl, Aldi Süd, Rewe, Edeka und Kaufland
- Angebotskarten aus aktiven, datierten Preisbeobachtungen
- Produktkarten mit echten Produktbildern, `Hinzufügen` und Mengensteuerung
- Produktart-Auswahl innerhalb einer Kategorie, z. B. `Chips`,
  `Gummibärchen`, `Kekse`, `Schokolade` und `Nüsse` unter `Süßigkeiten`
- Warenkorb mit Zwischensumme und Artikelverwaltung
- Checkout-Vergleich mit zwei Optionen:
  - nur ein Laden: günstigster Gesamtpreis, wenn alles im selben Laden gekauft wird
  - maximal sparen: günstigste Aufteilung der Produkte über mehrere Läden
- obere Shop-Leiste mit Suche, PLZ, Umkreis und klickbarem Warenkorb
- linke Shop-Navigation mit Bereichen und Filtern
- eigener `Prospekte & Deals`-Tab und eigene Kassenansicht
- im Browser gespeicherter Warenkorb und importierbarer Teilen-Link
- App-Rabatte standardmäßig aus; personalisierte Coupons mit eigenem Opt-in
- Rückgängig-Aktion nach dem Entfernen eines Warenkorbartikels
- sichtbare Ersparnis zwischen vollständigem Ein-Laden-Einkauf und Aufteilung;
  Fahrtkosten und zusätzliche Einkaufszeit bleiben ausdrücklich unberücksichtigt

Händler werden als klare markenfarbige Badges angezeigt, nicht als
nachgebaute oder falsche Logo-Bilder. Im Marktvergleich wird pro Produkt nur
die neueste aktive Beobachtung je Händler verwendet; bei mehreren
Beobachtungen desselben Zeitpunkts gewinnt der günstigere Preis. Fehlende
Artikel werden nicht mit `0 €` verrechnet, sondern machen eine Summe sichtbar
zur unvollständigen Teilsumme.

## Lokaler Start

### Windows-Testversion im Browser

Die native iOS-App kann auf Windows nicht direkt gebaut oder im iOS-Simulator
gestartet werden. Damit du Preisfuchs trotzdem sofort testen kannst, gibt es
zusätzlich eine Web/PWA-Version.

Wenn die Web-App Supabase-Daten laden soll, lege zuerst `web/.env.local` an:

```text
VITE_SUPABASE_URL=https://eanggjsdpjjskqycvknx.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN_ANON_PUBLIC_KEY
```

Start auf deinem Windows-PC:

```powershell
cd A:\Codex\Preisfuchs
.\start-web.ps1
```

Danach im Browser öffnen:

```text
http://localhost:5173
```

Test auf deinem Handy im gleichen WLAN:

```text
http://192.168.178.92:5173
```

Falls das Handy die Seite nicht öffnet, muss Windows den Node/Vite-Server in
der Firewall für private Netzwerke erlauben.

## Standortfilter

Die Web-App kann nach Postleitzahl und Umkreis filtern. Dafür werden
Filialdaten aus OpenStreetMap/Overpass im Browser geladen:

- Adresse
- Entfernung in km
- Öffnungszeiten, sofern in OpenStreetMap gepflegt

Die Preisbeobachtungen sind aktuell meist händlerbezogen. Die nächste passende
Filiale im gewählten Umkreis dient deshalb nur als Orientierung für Weg und
Öffnungszeiten. Die Oberfläche kennzeichnet ausdrücklich, dass der angezeigte
Preis nicht für diese konkrete Filiale bestätigt ist.

### Native iOS-App

1. Öffne `ios/Preisfuchs/Preisfuchs.xcodeproj` in Xcode.
2. Wähle ein iPhone-Simulator-Ziel.
3. Starte die App.

Hinweis: Dieser Rechner läuft aktuell unter Windows. Ich kann die Dateien
erstellen und Git vorbereiten, aber den iOS-Simulator nur auf einem Mac mit
Xcode ausführen.

## Supabase Setup

Die genaue Anleitung liegt in `docs/SUPABASE_SETUP.md`.

Kurzfassung:

1. Neues Supabase-Projekt anlegen.
2. `backend/supabase/schema.sql` im SQL Editor ausführen oder GitHub-Integration mit Working directory `.` aktivieren.
3. Lokale `.env` mit `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` und
   `SUPABASE_ANON_KEY` anlegen.
4. Verbindung testen:

```powershell
uv --cache-dir .uv-cache run --python 3.12 --with-requirements backend/jobs/requirements.txt python backend/jobs/test_supabase_connection.py
```

5. Diese GitHub-Secrets später im privaten Repo eintragen:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Der Update-Job läuft auch ohne Secrets im Dry-Run und schreibt dann nichts in
die Datenbank.

Die Migrationen schalten Row Level Security auch für interne Update-Läufe ein,
entziehen Browserrollen sämtliche Schreibrechte und geben nur benötigte
Lesespalten frei. `raw_payload` bleibt für `anon` und `authenticated` gesperrt.
Die Web-App liest bevorzugt eine RLS-respektierende View mit den aktiven,
neuesten Beobachtungen statt die vollständige Preishistorie zu übertragen. Ein
zusätzliches `is_public`-Gate veröffentlicht nur Beobachtungen, deren Quelle und
Weiterverwendung ausdrücklich geprüft wurden; ungeklärte Altimporte bleiben
intern.
Der lokale Supabase-Smoke-Test prüft zusätzlich, dass Rabattspalten,
Veröffentlichungs-Gate und aktuelle View vorhanden sind. In der momentan
verbundenen Instanz fehlt `requires_app` noch; dort müssen die eingecheckten
Migrationen vor dem nächsten produktiven Import ausgerollt werden.

Der lokale App-Rabatt-Demomodus ist unter
`http://localhost:5173/?demo=app-rabatte` erreichbar. Seine Beispielpreise
sind ausdrücklich keine aktuellen Live-Angebote.

## Automatische Preisquellen

Der tägliche Job `backend/jobs/price_update_job.py` importiert standardmäßig:

- Open Prices, falls für Produkte Barcodes hinterlegt sind
- keine geschützten oder lizenzrechtlich ungeklärten Händlerseiten

Die Open-Prices-API wurde am 2026-05-10 gegen das offizielle Schema unter
`https://prices.openfoodfacts.org/api/schema` geprüft. Der Preis-Endpunkt
unterstützt `product_code` und `size`, aber keinen `country`-Filter. Live-
Aufrufe mit `product_code` lieferten beim Test serverseitig HTTP 500; der Job
überspringt solche Open-Prices-Ausfälle pro Barcode und importiert die
übrigen Quellen weiter.

Der vorhandene kaufDA-HTML-Parser bleibt ausschließlich für lokale,
ausdrücklich aktivierte Experimente im Code. Er ist im täglichen Lauf
deaktiviert, weil eine belastbare Erlaubnis und Datenlizenz für Veröffentlichung
nicht nachgewiesen ist. Er darf nicht als produktive Preisquelle behandelt
werden.

App-exklusive Händlerpreise werden als eigene, bedingte Preisart modelliert.
Die Web- und iOS-Oberfläche kennzeichnet `Nur mit <App-Name>`; in der Web-App
kann der Vergleich freiwillig auf öffentliche App-Rabatte erweitert werden.
Personalisierte Coupons benötigen ein zweites ausdrückliches Opt-in. App-Name,
Coupon-Aktivierung, Personalisierung, Normalpreis und Gültigkeit werden separat
gespeichert. Details und Beschaffungsstrategie stehen in
`docs/APP_RABATTE.md`.

Der Import probiert pro Produkt zuerst konkrete Produktnamen und Suchbegriffe
aus dem Katalog und nutzt breitere Fallback-Begriffe erst danach. Dadurch
landen Prospektdetails wie Marke, Sorte und Packungsgröße in
`price_observations.product_name`. Die Web-App bildet daraus einzelne
Produktkarten und vergleicht diese Varianten im Warenkorb. Jede Variante wird
zusätzlich anhand ihres echten Angebotstitels klassifiziert, damit z. B.
Apfelschorle, Babybrei oder Wurst nicht im Obst-/Äpfel-Tab hängen bleiben.

Für `Milbona Bio H-Milch 1,5% 1 l`, `Milbona Gouda jung 400 g` und
`Kölln Blütenzarte Haferflocken 500 g` sind über den offiziellen
Open-Food-Facts-Produktendpunkt geprüfte GTINs hinterlegt. Der Open-Prices-
Dry-Run normalisierte damit 4 Beobachtungen für Haferflocken. Diese Treffer
stammen aus 2025 und werden daher nicht als aktuell behauptet, sondern sichtbar
als möglicherweise veraltet markiert.

Prüfstand der verbundenen Supabase-Instanz vom 2026-08-27: 76 Produkte und
8.935 Preisbeobachtungen. 7.452 davon waren bereits abgelaufen; die neueste
Beobachtung stammte vom 2026-08-10. Die App-Rabatt-Migration war in dieser
Instanz noch nicht ausgerollt. Dieser Stand ist keine Aussage über heutige
Preisabdeckung.

## Lokaler Projekttest

```powershell
cd A:\Codex\Preisfuchs
.\test-local.ps1
```

Der Test baut die Web-App, startet den Backend-Dry-Run und prüft Supabase,
falls eine `.env` vorhanden ist. Bei einer veralteten verbundenen Datenbank
schlägt der letzte Schritt bewusst mit einem Migrationshinweis fehl.

Die gezielten Tests können unabhängig davon gestartet werden:

```powershell
cd web
npm test
npm run build

cd ..
uv --cache-dir .uv-cache run --python 3.12 --with-requirements backend/jobs/requirements.txt python -m unittest discover -s backend/jobs -p test_price_update_job.py -v
```

## GitHub Actions

`.github/workflows/daily-price-update.yml` führt den Update-Job täglich aus.
Der erste Lauf ist bewusst vorsichtig: Er liest offene Quellen und protokolliert
normalisierte Ergebnisse. Das Schreiben in Supabase passiert erst mit gesetzten
Secrets. GitHub Actions sind auf vollständige Commit-SHAs gepinnt und besitzen
nur Leserechte am Repository. Ein zweiter Workflow prüft Web-Tests, npm-Audit
und Produktions-Build; Dependabot überwacht npm, Python und Actions.

## Datenrealität

Kostenlose Quellen liefern keine vollständige Echtzeit-Abdeckung aller
Supermarkt-Filialpreise. Preisfuchs zeigt deshalb immer Quelle und
Aktualisierungsdatum. Preise werden als Beobachtungen modelliert, nicht als
garantierte Live-Preise.

Das gilt besonders für App-Coupons: Sie können marktbezogen,
aktivierungspflichtig oder personalisiert sein. Preisfuchs zeigt diese
Bedingungen an und behandelt den App-Preis nicht als allgemein verfügbaren
Regalpreis.
