# Preisfuchs

Preisfuchs ist ein iOS-MVP fuer Lebensmittel-Preisvergleich in
Baden-Wuerttemberg. Die App zeigt fuer Standard-Lebensmittel beobachtete Preise,
Maerkte, Quellen und Aktualitaet an.

Der erste kostenlose Ansatz kombiniert:

- lokale Demo-Daten fuer die iOS-App
- Supabase als Datenbank/API
- GitHub Actions als taeglichen Update-Job
- Open Prices / Open Food Facts als offene Datenquelle
- spaeter OpenStreetMap/Overpass fuer Marktstandorte

## Projektstruktur

```text
ios/Preisfuchs/                 SwiftUI-iOS-App
backend/supabase/schema.sql     Supabase-Datenbankschema
backend/jobs/                   Preis-Update-Job
data/standard_products.json     Standard-Lebensmittel fuer den MVP
docs/MVP_PLAN.md                Umsetzungsplan
```

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

Die kaufDA-Daten werden als `kaufDA Angebot` gespeichert. Das sind
Angebotspreise aus oeffentlichen Angebotsseiten, keine garantierten
Normalpreise.

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
