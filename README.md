# Preisfuchs

Preisfuchs ist ein iOS- und Web-MVP fuer Lebensmittel-Preisvergleich in
Baden-Wuerttemberg. Die App zeigt fuer Standard-Lebensmittel beobachtete Preise,
Maerkte, Quellen, Aktualitaet, Filialadressen und Oeffnungszeiten an.

Der erste kostenlose Ansatz kombiniert:

- lokale Demo-Daten fuer die iOS-App
- Supabase als Datenbank/API
- GitHub Actions als taeglichen Update-Job
- Open Prices / Open Food Facts als offene Datenquelle
- OpenStreetMap/Overpass fuer Marktstandorte im PLZ-Umkreis

## Projektstruktur

```text
ios/Preisfuchs/                 SwiftUI-iOS-App
backend/supabase/schema.sql     Supabase-Datenbankschema
backend/jobs/                   Preis-Update-Job
data/standard_products.json     Standard-Lebensmittel fuer den MVP
docs/MVP_PLAN.md                Umsetzungsplan
```

## Produktauswahl

Die Web-App startet nicht mehr mit einer langen Produktliste, sondern mit
Kategorien:

- Obst
- Gemuese
- Frische
- Molkerei
- Vorrat
- Getraenke
- Suessigkeiten
- Tiefkuehl
- Backen

Die aktuelle Stammdatenliste enthaelt 76 Lebensmittel und Alltagsprodukte,
darunter Bananen, Eier, Tomaten, Milch, Nudeln, Schokolade, Tiefkuehlpizza,
Toastbrot, Muesli, Fleisch/Wurst, Drogerieartikel, Babyprodukte und Tierbedarf.
Produkte werden in der Web-App bevorzugt mit kuratierten echten Produkt- und
Packungsbildern angezeigt. Fuer bekannte Packshots nutzt die App Open Food
Facts, fuer frische Ware und Artikel ohne sauberen Packshot kuratierte
Lebensmittel-/Produktfotos. Erst danach faellt sie auf Kategorie-Bilder
zurueck.

In der Hauptansicht werden nur Produkte angezeigt, fuer die echte importierte
Preisbeobachtungen vorhanden sind. Produkte ohne aktuelle Quelle bleiben in der
Datenbank, werden aber nicht als Platzhalterpreis angezeigt.

## Shopping- und Warenkorb-Flow

Die Web-App ist als Einkaufsoberflaeche aufgebaut:

- Angebots-Hero mit aktuellem guenstigem Produkt
- Haendler-Leiste fuer Lidl, Aldi Sued, Rewe, Edeka und Kaufland
- Angebotskarten aus importierten Preisbeobachtungen und kaufDA-Angeboten
- Produktkarten mit echten Produktbildern, `Hinzufuegen` und Mengensteuerung
- Warenkorb mit Zwischensumme und Artikelverwaltung
- Checkout-Vergleich mit zwei Optionen:
  - nur ein Laden: guenstigster Gesamtpreis, wenn alles im selben Laden gekauft wird
  - maximal sparen: guenstigste Aufteilung der Produkte ueber mehrere Laeden
- obere Shop-Leiste mit Suche, PLZ, Umkreis und klickbarem Warenkorb
- linke Shop-Navigation mit Bereichen und Filtern
- eigener `Prospekte & Deals`-Tab und eigene Kassenansicht

Haendler werden als klare markenfarbige Badges angezeigt, nicht als
nachgebaute oder falsche Logo-Bilder. Im Marktvergleich wird pro Produkt nur
der beste Preis je Haendler angezeigt.

## Lokaler Start

### Windows-Testversion im Browser

Die native iOS-App kann auf Windows nicht direkt gebaut oder im iOS-Simulator
gestartet werden. Damit du Preisfuchs trotzdem sofort testen kannst, gibt es
zusaetzlich eine Web/PWA-Version.

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

Danach im Browser oeffnen:

```text
http://localhost:5173
```

Test auf deinem Handy im gleichen WLAN:

```text
http://192.168.178.92:5173
```

Falls das Handy die Seite nicht oeffnet, muss Windows den Node/Vite-Server in
der Firewall fuer private Netzwerke erlauben.

## Standortfilter

Die Web-App kann nach Postleitzahl und Umkreis filtern. Dafuer werden
Filialdaten aus OpenStreetMap/Overpass im Browser geladen:

- Adresse
- Entfernung in km
- Oeffnungszeiten, sofern in OpenStreetMap gepflegt

Die Preisbeobachtungen sind aktuell meist haendlerbezogen. Preisfuchs ordnet sie
deshalb der naechsten passenden Filiale im gewaehlten Umkreis zu.

### Native iOS-App

1. Oeffne `ios/Preisfuchs/Preisfuchs.xcodeproj` in Xcode.
2. Waehle ein iPhone-Simulator-Ziel.
3. Starte die App.

Hinweis: Dieser Rechner laeuft aktuell unter Windows. Ich kann die Dateien
erstellen und Git vorbereiten, aber den iOS-Simulator nur auf einem Mac mit
Xcode ausfuehren.

## Supabase Setup

Die genaue Anleitung liegt in `docs/SUPABASE_SETUP.md`.

Kurzfassung:

1. Neues Supabase-Projekt anlegen.
2. `backend/supabase/schema.sql` im SQL Editor ausfuehren oder GitHub-Integration mit Working directory `.` aktivieren.
3. Lokale `.env` mit Supabase-Werten anlegen.
4. Verbindung testen:

```powershell
.\.venv\Scripts\python.exe backend\jobs\test_supabase_connection.py
```

5. Diese GitHub-Secrets spaeter im privaten Repo eintragen:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Der Update-Job laeuft auch ohne Secrets im Dry-Run und schreibt dann nichts in
die Datenbank.

## Automatische Preisquellen

Der taegliche Job `backend/jobs/price_update_job.py` importiert aktuell:

- Open Prices, falls fuer Produkte Barcodes hinterlegt sind
- kaufDA-Angebotsseiten fuer die Standardprodukte und Kernhaendler

Die Open-Prices-API wurde am 2026-05-10 gegen das offizielle Schema unter
`https://prices.openfoodfacts.org/api/schema` geprueft. Der Preis-Endpunkt
unterstuetzt `product_code` und `size`, aber keinen `country`-Filter. Live-
Aufrufe mit `product_code` lieferten beim Test serverseitig HTTP 500; der Job
ueberspringt solche Open-Prices-Ausfaelle pro Barcode und importiert die
uebrigen Quellen weiter.

Die kaufDA-Daten werden als `kaufDA Angebot` gespeichert. Das sind
Angebotspreise aus oeffentlichen Angebotsseiten, keine garantierten
Normalpreise. Wenn einzelne Sortimentsseiten nicht existieren, wird das Produkt
uebersprungen und der Job importiert die uebrigen Treffer weiter.

Der Import probiert pro Produkt mehrere Suchbegriffe und erkennt verschiedene
Haendler-Schreibweisen wie `Aldi Sued` und die kaufDA-Schreibweise mit Umlaut.
Der letzte gezielte Import hat den Supabase-Stand um 25 Produkte und 144
Preisbeobachtungen erweitert. Insgesamt liegen damit rund 693 importierte
Preisbeobachtungen vor; fuer mindestens 69 von 76 Produkten sind aktuell echte
Preisbeobachtungen verfuegbar.

## Lokaler Projekttest

```powershell
cd A:\Codex\Preisfuchs
.\test-local.ps1
```

Der Test baut die Web-App, startet den Backend-Dry-Run und prueft Supabase,
falls eine `.env` vorhanden ist.

## GitHub Actions

`.github/workflows/daily-price-update.yml` fuehrt den Update-Job taeglich aus.
Der erste Lauf ist bewusst vorsichtig: Er liest offene Quellen und protokolliert
normalisierte Ergebnisse. Das Schreiben in Supabase passiert erst mit gesetzten
Secrets.

## Datenrealitaet

Kostenlose Quellen liefern keine vollstaendige Echtzeit-Abdeckung aller
Supermarkt-Filialpreise. Preisfuchs zeigt deshalb immer Quelle und
Aktualisierungsdatum. Preise werden als Beobachtungen modelliert, nicht als
garantierte Live-Preise.
