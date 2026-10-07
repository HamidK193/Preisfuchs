# AGENTS.md

## Zweck

Diese Datei beschreibt die Arbeitsregeln fuer das Projekt Preisfuchs.
Preisfuchs ist ein MVP fuer Lebensmittel-Preisvergleich in ganz
Deutschland. Der erste Datenpilot lief in Baden-Wuerttemberg; Code, Texte und
Design duerfen keine Region fest voraussetzen.

## Arbeitsregeln

- Halte den Code klein, lesbar und gut erweiterbar.
- Bevorzuge SwiftUI-native Views und einfache Datenmodelle.
- Trenne iOS-App, Backend-Jobs und Datenbank-Schema klar.
- Speichere Demo- und Seed-Daten in `data/`.
- Pflege `README.md`, `memory.md` und `CHANGELOG.md` nach groesseren Schritten.
- Nach jedem abgeschlossenen Arbeitsschritt committen und auf `main` pushen
  (vorher `git pull --rebase`), damit alle Geraete und Sessions denselben Stand haben.
  Nie `.env`, `.env.local` oder Schluessel committen.
- Nutze kostenlose oder frei zugaengliche Datenquellen zuerst.
- Zeige Preisquelle und Aktualisierungsdatum immer sichtbar an.
- Behaupte keine Live-Genauigkeit, wenn Preise aus offenen oder alten Daten stammen.
- Behandle Preise als Beobachtungen, nicht als garantierte Marktpreise.
- Die Preis-Rangliste ist nie kaeuflich; Werbung immer als "Anzeige",
  Partnerlinks als "Partnerlink" markieren (siehe `docs/MONETARISIERUNG.md`).
- Neue Screens folgen dem Stitch-Konzept und `docs/APP_SCREENS_PLAN.md`.

## MVP-Ziel

- App "Preisfuchs" mit Suche nach Standard-Lebensmitteln
- Preisvergleich fuer Standard-Supermaerkte in ganz Deutschland (Standort per PLZ und Radius)
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

- `mobile/`: neue App (Expo / React Native, iOS + Android) nach dem Stitch-Design;
  Test auf dem iPhone ueber Expo Go (`cd mobile; npx expo start --lan`)
- `ios/Preisfuchs/`: bisherige native iOS-App (SwiftUI)
- `backend/supabase/schema.sql`: Datenbankschema
- `backend/jobs/price_update_job.py`: taeglicher Preis-Update-Job
- `.github/workflows/daily-price-update.yml`: geplanter GitHub-Actions-Lauf
- `data/standard_products.json`: erste Produktliste
- `docs/MVP_PLAN.md`: fachlicher und technischer MVP-Plan
- `docs/APP_SCREENS_PLAN.md`: alle App-Seiten und Sitemap (Design in Google Stitch)
- `docs/MONETARISIERUNG.md`: Umsatzmodell (Plus-Abo, Anzeigen, Partnerlinks)
