# MVP-Plan Preisfuchs

## Ziel

Preisfuchs soll Nutzern in Baden-Wuerttemberg zeigen, wo Standard-Lebensmittel
aktuell oder zuletzt beobachtet guenstig waren.

## Datenquellen

1. Open Prices fuer beobachtete Lebensmittelpreise.
2. Open Food Facts fuer Produktinformationen.
3. Eigene Demo- und Seed-Daten fuer den ersten App-MVP.
4. Spaeter OpenStreetMap/Overpass fuer Marktstandorte.
5. Spaeter Nutzerbelege oder Kassenbons.

## Phase 1: Lokaler App-MVP

- SwiftUI-App mit Produktsuche
- Produktdetail mit guenstigstem Preis
- Marktvergleich nach Preis
- Anzeige von Quelle und Aktualitaet
- Einkaufslisten-Ansicht als Platzhalter fuer Warenkorboptimierung

## Phase 2: Supabase-Backend

- Tabellen fuer Produkte, Haendler, Filialen und Preisbeobachtungen
- Lesender Zugriff fuer App
- Schreibender Zugriff nur ueber Service-Role im Update-Job

## Phase 3: Taegliche Updates

- GitHub Actions startet taeglich den Python-Job.
- Job liest Seed-Produkte.
- Job ruft offene Preisquellen ab.
- Job normalisiert Preise und schreibt nach Supabase, wenn Secrets gesetzt sind.

## Phase 4: Qualitaet und Vertrauen

- Preisalter sichtbar machen
- Quellen klar anzeigen
- Veraltete Preise abwerten
- Keine "garantiert guenstigster Preis"-Aussage ohne ausreichende Daten

## Naechste Nutzer-Schritte

1. Supabase-Projekt kostenlos anlegen.
2. `backend/supabase/schema.sql` ausfuehren.
3. Privates GitHub-Repo erstellen oder GitHub-CLI/Connector mit Repo-Erstellung bereitstellen.
4. GitHub-Secrets `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` eintragen.
5. Projekt auf einem Mac in Xcode oeffnen und App starten.
