# Preisfuchs

Preisfuchs ist ein iOS- und Web-MVP für Lebensmittel-Preisvergleich in
Baden-Württemberg. Die App zeigt für Standard-Lebensmittel beobachtete Preise,
Märkte, Quellen, Aktualität, Filialadressen und Öffnungszeiten an.

Der erste kostenlose Ansatz kombiniert:

- lokale Demo-Daten für die iOS-App
- Supabase als Datenbank/API
- GitHub Actions als täglichen Update-Job
- Open Prices / Open Food Facts als offene Datenquelle
- OpenStreetMap/Overpass für Marktstandorte im PLZ-Umkreis

## Projektstruktur

```text
ios/Preisfuchs/                 SwiftUI-iOS-App
backend/supabase/schema.sql     Supabase-Datenbankschema
backend/jobs/                   Preis-Update-Job
data/standard_products.json     Standard-Lebensmittel für den MVP
docs/MVP_PLAN.md                Umsetzungsplan
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
- Angebotskarten aus importierten Preisbeobachtungen und kaufDA-Angeboten
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

Händler werden als klare markenfarbige Badges angezeigt, nicht als
nachgebaute oder falsche Logo-Bilder. Im Marktvergleich wird pro Produkt nur
der beste Preis je Händler angezeigt.

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

Die Preisbeobachtungen sind aktuell meist händlerbezogen. Preisfuchs ordnet sie
deshalb der nächsten passenden Filiale im gewählten Umkreis zu.

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
3. Lokale `.env` mit Supabase-Werten anlegen.
4. Verbindung testen:

```powershell
.\.venv\Scripts\python.exe backend\jobs\test_supabase_connection.py
```

5. Diese GitHub-Secrets später im privaten Repo eintragen:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Der Update-Job läuft auch ohne Secrets im Dry-Run und schreibt dann nichts in
die Datenbank.

## Automatische Preisquellen

Der tägliche Job `backend/jobs/price_update_job.py` importiert aktuell:

- Open Prices, falls für Produkte Barcodes hinterlegt sind
- kaufDA-Angebotsseiten für die Standardprodukte und Kernhändler

Die Open-Prices-API wurde am 2026-05-10 gegen das offizielle Schema unter
`https://prices.openfoodfacts.org/api/schema` geprüft. Der Preis-Endpunkt
unterstützt `product_code` und `size`, aber keinen `country`-Filter. Live-
Aufrufe mit `product_code` lieferten beim Test serverseitig HTTP 500; der Job
überspringt solche Open-Prices-Ausfälle pro Barcode und importiert die
übrigen Quellen weiter.

Die kaufDA-Daten werden als `kaufDA Angebot` gespeichert. Das sind
Angebotspreise aus öffentlichen Angebotsseiten, keine garantierten
Normalpreise. Wenn einzelne Sortimentsseiten nicht existieren, wird das Produkt
übersprungen und der Job importiert die übrigen Treffer weiter.

Der Import probiert pro Produkt zuerst konkrete Produktnamen und Suchbegriffe
aus dem Katalog und nutzt breitere Fallback-Begriffe erst danach. Dadurch
landen Prospektdetails wie Marke, Sorte und Packungsgröße in
`price_observations.product_name`. Die Web-App bildet daraus einzelne
Produktkarten und vergleicht diese Varianten im Warenkorb. Jede Variante wird
zusätzlich anhand ihres echten Angebotstitels klassifiziert, damit z. B.
Apfelschorle, Babybrei oder Wurst nicht im Obst-/Äpfel-Tab hängen bleiben.

Aktueller Supabase-Stand vom 2026-05-10: 76 Produkte, 1176 importierte
Preisbeobachtungen und 59 Produkte mit mindestens einer echten Beobachtung.

## Lokaler Projekttest

```powershell
cd A:\Codex\Preisfuchs
.\test-local.ps1
```

Der Test baut die Web-App, startet den Backend-Dry-Run und prüft Supabase,
falls eine `.env` vorhanden ist.

## GitHub Actions

`.github/workflows/daily-price-update.yml` führt den Update-Job täglich aus.
Der erste Lauf ist bewusst vorsichtig: Er liest offene Quellen und protokolliert
normalisierte Ergebnisse. Das Schreiben in Supabase passiert erst mit gesetzten
Secrets.

## Datenrealität

Kostenlose Quellen liefern keine vollständige Echtzeit-Abdeckung aller
Supermarkt-Filialpreise. Preisfuchs zeigt deshalb immer Quelle und
Aktualisierungsdatum. Preise werden als Beobachtungen modelliert, nicht als
garantierte Live-Preise.
