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

1. Oeffne `ios/Preisfuchs/Preisfuchs.xcodeproj` in Xcode.
2. Waehle ein iPhone-Simulator-Ziel.
3. Starte die App.

Hinweis: Dieser Rechner laeuft aktuell unter Windows. Ich kann die Dateien
erstellen und Git vorbereiten, aber den iOS-Simulator nur auf einem Mac mit
Xcode ausfuehren.

## Supabase Setup

1. Neues Supabase-Projekt anlegen.
2. `backend/supabase/schema.sql` im SQL Editor ausfuehren.
3. Diese GitHub-Secrets spaeter im privaten Repo eintragen:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Der Update-Job laeuft auch ohne Secrets im Dry-Run und schreibt dann nichts in
die Datenbank.

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
