# MVP-Plan Preisfuchs

Der aktuelle, ausführliche [Gesamtplan vom 05.09.2026](GESAMTPLAN.md)
konkretisiert Produktregeln, Webdesign, Quellen, Supabase-Rollout und Betrieb.
Der folgende ursprüngliche MVP-Plan bleibt als Grundlage erhalten.

## Ziel

Preisfuchs soll Nutzern in Baden-Wuerttemberg zeigen, wo Standard-Lebensmittel
aktuell oder zuletzt beobachtet guenstig waren.

## Datenquellen

1. Open Prices fuer beobachtete Lebensmittelpreise.
2. Open Food Facts fuer Produktinformationen.
3. Eigene Demo- und Seed-Daten fuer den ersten App-MVP.
4. Spaeter OpenStreetMap/Overpass fuer Marktstandorte.
5. Spaeter Nutzerbelege oder Kassenbons.
6. Oeffentliche, eindeutig gekennzeichnete Haendler-App-Deals; personalisierte
   Coupons nur nach freiwilligem Nutzerimport oder ueber offizielle Partnerfeeds.

## Phase 1: Lokaler App-MVP

- SwiftUI-App mit Produktsuche
- Produktdetail mit guenstigstem Preis
- Marktvergleich nach Preis
- Anzeige von Quelle und Aktualitaet
- Warenkorb mit Mengen, lokalem Speichern und Teilen
- Ein-Laden- und Mehr-Laden-Vergleich mit sichtbaren fehlenden Artikeln
- Vergleich mit und ohne App-Rabatte sowie sichtbare Einloesebedingungen

## Phase 2: Supabase-Backend

- Tabellen fuer Produkte, Haendler, Filialen und Preisbeobachtungen
- Bedingte Preisfelder fuer App, Aktivierung, Personalisierung und Gueltigkeit
- Lesender Zugriff fuer App
- Schreibender Zugriff nur ueber Service-Role im Update-Job
- Explizite Spaltenrechte; keine Browser-Leserechte auf `raw_payload` oder
  interne `update_runs`

## Phase 3: Taegliche Updates

- GitHub Actions startet taeglich den Python-Job.
- Job liest Seed-Produkte.
- Job ruft offene Preisquellen ab.
- Job normalisiert Preise und schreibt nach Supabase, wenn Secrets gesetzt sind.
- Job importiert standardmaessig nur Open Prices; HTML-Importe mit ungeklaerter
  Lizenz bleiben deaktiviert.
- Job protokolliert Status und Importanzahl in `update_runs`.

## Phase 4: Qualitaet und Vertrauen

- Preisalter sichtbar machen
- Quellen klar anzeigen
- Veraltete Preise abwerten
- Keine "garantiert guenstigster Preis"-Aussage ohne ausreichende Daten
- Automatische Tests fuer Aktualitaet, Rabatt-Opt-ins, fehlende Preise und
  geteilte Warenkoerbe
- Dependency-Audit, Dependabot und minimal berechtigte, SHA-gepinnte Workflows
- Seed-Katalog mit Pflichtfeld-, Eindeutigkeits- und GTIN-Prüfsummentests
- Keine Rabattprozent-Angabe ohne beobachteten Normalpreis

## Naechste Nutzer-Schritte

1. Verbundene Supabase-Instanz mit `backend/supabase/schema.sql` bzw. den
   eingecheckten Migrationen auf den aktuellen Stand bringen.
2. Den erweiterten Schema-/RLS-Smoke-Test erfolgreich ausführen.
3. Privates GitHub-Repo erstellen oder GitHub-CLI/Connector mit Repo-Erstellung bereitstellen.
4. GitHub-Secrets `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` eintragen.
5. Projekt auf einem Mac in Xcode oeffnen und App starten.
