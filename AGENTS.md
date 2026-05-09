# AGENTS.md

## Zweck

Diese Datei beschreibt die Arbeitsregeln fuer das Projekt Preisfuchs.
Preisfuchs ist ein iOS-MVP fuer Lebensmittel-Preisvergleich in
Baden-Wuerttemberg.

## Arbeitsregeln

- Halte den Code klein, lesbar und gut erweiterbar.
- Bevorzuge SwiftUI-native Views und einfache Datenmodelle.
- Trenne iOS-App, Backend-Jobs und Datenbank-Schema klar.
- Speichere Demo- und Seed-Daten in `data/`.
- Pflege `README.md`, `memory.md` und `CHANGELOG.md` nach groesseren Schritten.
- Nutze kostenlose oder frei zugaengliche Datenquellen zuerst.
- Zeige Preisquelle und Aktualisierungsdatum immer sichtbar an.
- Behaupte keine Live-Genauigkeit, wenn Preise aus offenen oder alten Daten stammen.
- Behandle Preise als Beobachtungen, nicht als garantierte Marktpreise.

## MVP-Ziel

- iOS-App "Preisfuchs" mit Suche nach Standard-Lebensmitteln
- Preisvergleich fuer Standard-Supermaerkte in Baden-Wuerttemberg
- Demo-Daten lokal in der App
- Supabase-Schema fuer Produkte, Maerkte, Filialen und Preisbeobachtungen
- Taeglicher GitHub-Actions-Job fuer kostenlose Datenquellen
- Open Prices / Open Food Facts als erste offene Preis- und Produktquelle
- OpenStreetMap/Overpass spaeter fuer Marktstandorte

## Nicht-Ziele fuer den ersten MVP

- Kein aktives Scraping geschuetzter Supermarktseiten
- Keine Garantie fuer vollstaendige Filialpreise
- Kein OpenAI-Einsatz im ersten Schritt
- Keine Bezahl-APIs

## Wichtige Pfade

- `ios/Preisfuchs/`: native iOS-App
- `backend/supabase/schema.sql`: Datenbankschema
- `backend/jobs/price_update_job.py`: taeglicher Preis-Update-Job
- `.github/workflows/daily-price-update.yml`: geplanter GitHub-Actions-Lauf
- `data/standard_products.json`: erste Produktliste
- `docs/MVP_PLAN.md`: fachlicher und technischer MVP-Plan
