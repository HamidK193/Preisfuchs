# Preisfuchs – Projektinformation

## Kurzbeschreibung

Preisfuchs ist ein iOS- und Web-MVP für den Vergleich beobachteter
Lebensmittelpreise in Baden-Württemberg. Die Anwendung soll Menschen dabei
helfen, Produkte und Angebote bei Aldi Süd, Lidl, Rewe, Edeka und Kaufland zu
vergleichen und einen möglichst günstigen Einkauf zu planen.

Preisfuchs zeigt keine garantierten Live- oder Regalpreise. Jeder Preis wird
als Beobachtung mit Quelle, Beobachtungsdatum, Gültigkeit und Vertrauenswert
behandelt. Kostenlose Datenquellen können unvollständig, verzögert oder nur
auf Händlerebene statt auf Ebene einer einzelnen Filiale verfügbar sein.

## Ziel und Zweck

Das Hauptziel ist eine verständliche und vertrauenswürdige Preisvergleichs-App
für Standard-Lebensmittel und häufig gekaufte Alltagsprodukte. Nutzer sollen
schnell erkennen können:

- welches Produkt bei welchem Händler zuletzt am günstigsten beobachtet wurde,
- wie aktuell und zuverlässig eine Preisangabe ist,
- ob der Preis ein Normalpreis, Angebot oder App-Rabatt ist,
- welche Filialen im gewählten PLZ-Umkreis liegen,
- ob der gesamte Warenkorb besser in einem Laden oder verteilt auf mehrere
  Läden gekauft werden kann.

Der erste regionale Fokus liegt auf Baden-Württemberg. Die Architektur soll
später weitere Regionen, Händler und Datenquellen aufnehmen können.

## Zielgruppen

- Haushalte, Familien, Studierende und preisbewusste Käufer
- Personen, die ihren Einkauf vorab planen möchten
- Nutzer von Händler-Apps, die App-Rabatte bewusst ein- oder ausschließen
  möchten
- Tester und Entwickler, die das MVP auf iOS, Windows oder im mobilen Browser
  erproben

## Vorgesehene Fähigkeiten der App

### Produktsuche und Katalog

- Suche nach Produkt, Marke, Kategorie und Packungsgröße
- Kategorien wie Obst, Gemüse, Molkerei, Backen, Vorrat, Getränke,
  Süßigkeiten, Tiefkühl, Fleisch, Drogerie, Baby und Tierbedarf
- konkrete Produktvarianten statt ausschließlich allgemeiner Produktnamen
- Produktbilder und Packshots mit sinnvollen Fallback-Bildern
- Anzeige von Produkten nur dann, wenn echte Preisbeobachtungen vorliegen;
  klar gekennzeichnete Demo-Daten bleiben für Entwicklung und Tests möglich

### Preis- und Marktvergleich

- Sortierung der beobachteten Preise vom günstigsten zum teuersten
- bestes Angebot je Händler, damit ein Händler nicht mehrfach unnötig
  erscheint
- Anzeige von Endpreis und, soweit vorhanden, Grundpreis
- sichtbare Quelle, Aktualisierungsdatum, Gültigkeit und Konfidenz
- Kennzeichnung als Normalpreis, öffentliches Angebot oder App-Rabatt
- keine Aussage wie „garantiert günstigster Preis“, wenn die Datenabdeckung
  dafür nicht ausreicht

### Standort und Filialen

- Eingabe einer Postleitzahl und Auswahl eines Suchradius
- Suche nach nahe gelegenen Filialen
- Anzeige von Adresse, Entfernung und vorhandenen Öffnungszeiten
- Zuordnung einer händlerbezogenen Preisbeobachtung zur nächsten passenden
  Filiale als erkennbare Näherung

### Warenkorb und Sparplanung

- Produkte zum Warenkorb hinzufügen und Mengen verändern
- geschätzte Einkaufssumme berechnen
- Vergleich zweier Einkaufsstrategien:
  - „Ein Laden“: möglichst günstiger Einkauf bei nur einem Händler
  - „Maximal sparen“: günstigste Aufteilung auf mehrere Händler
- fehlende Produkte in einer Ein-Laden-Variante sichtbar machen
- für den errechneten Preis benötigte Händler-Apps nennen

### App-Rabatte

- Vergleich wahlweise mit oder ohne App-Rabatte
- Kennzeichnung „Nur mit Händler-App“
- Anzeige von App-Name, Aktivierungspflicht, Gültigkeit, möglicher
  Personalisierung und Normalpreis
- abgelaufene App-Angebote nicht in den aktuellen Bestpreis einrechnen
- personalisierte Coupons niemals als allgemein verfügbare Preise darstellen

### Transparenz und Vertrauen

- Preisquelle und Beobachtungsdatum immer sichtbar halten
- Demo-, Angebots- und offene Daten klar unterscheiden
- Preise als Beobachtungen und nicht als garantierte Marktpreise behandeln
- unvollständige Datenabdeckung und Schätzungen offen kommunizieren
- keine automatisierte Anmeldung bei Händlerkonten und keine Umgehung
  geschützter Händler-Schnittstellen

## Bereits vorhandener Stand

### Native iOS-App

Die SwiftUI-App lädt lokale Demo-Daten und besitzt bereits:

- Produktsuche und Produktliste
- Produktdetail mit sortiertem Marktvergleich
- Anzeige des besten beobachteten Preises
- Quelle und Aktualität
- Schalter für App-Rabatte
- einfache Einkaufsliste mit geschätztem Minimum
- eigene Quellen- und Hinweisansicht

Die iOS-App ist derzeit der kleinere MVP-Client. Sie ist auf iOS 17 ausgelegt
und muss auf einem Mac mit Xcode gebaut und getestet werden.

### Web/PWA

Die React-Web-App ist aktuell funktional weiter ausgebaut und bietet:

- responsive Einkaufsoberfläche für Desktop und Mobilgeräte
- Suche, Kategorien, Produktarten und konkrete Angebotsvarianten
- Supabase-Daten mit Fallback auf lokale Demo-Daten
- PLZ- und Umkreisfilter mit Filialen aus OpenStreetMap/Overpass
- Produkt- und Angebotskarten mit Bildern
- Händlervergleich und Warenkorb
- Ein-Laden- und Mehr-Läden-Vergleich
- App-Rabatt-Schalter und Bedingungshinweise
- PWA-Manifest für eine installierbare Browser-App

Einige sichtbare Filter und Sortierknöpfe sind derzeit noch UI-Platzhalter und
müssen später mit echter Filterlogik verbunden werden.

### Backend und Datenbank

Vorhanden sind:

- ein Python-Job für Preisimporte,
- ein täglicher GitHub-Actions-Workflow,
- ein Supabase/PostgreSQL-Schema,
- Tabellen für Produkte, Händler, Filialen, Preisbeobachtungen und
  Aktualisierungsläufe,
- öffentliche Leserechte über Row Level Security,
- Schreibzugriff über den Service-Role-Key des Backend-Jobs,
- Seed-Daten für 76 Lebensmittel und Alltagsprodukte.

Der Import verarbeitet offene Open-Prices-Daten, sofern Barcodes vorhanden
sind, und öffentlich zugängliche kaufDA-Angebotsseiten. Da die aktuelle
Produktliste noch keine Barcodes enthält und externe Dienste ausfallen oder
ihre Struktur ändern können, ist der Import nicht als vollständige
Live-Preisversorgung zu verstehen.

## Werkzeuge und Technologien

| Bereich | Werkzeug / Technologie | Aufgabe im Projekt |
| --- | --- | --- |
| iOS | Swift, SwiftUI, Xcode | Native iPhone- und iPad-App |
| Web/PWA | React 19, TypeScript, Vite | Browser- und Windows-Testversion |
| UI-Symbole | SF Symbols, Lucide React | Verständliche Navigation und Statusanzeigen |
| Backend | Python 3.12 | Abruf, Normalisierung und Import von Preisen |
| HTTP/Parsing | Requests, Beautiful Soup | Abruf offener Daten und öffentlicher Angebotsseiten |
| Datenbank/API | Supabase, PostgreSQL | Zentrale Produkt-, Filial- und Preisdaten |
| Automatisierung | GitHub Actions | Täglicher geplanter Preis-Update-Job |
| Produktdaten | Open Food Facts | Produktinformationen und Produktbilder |
| Preisdaten | Open Prices | Offene beobachtete Preise |
| Angebote | kaufDA | Öffentlich auffindbare Angebotsbeobachtungen |
| Filialdaten | OpenStreetMap, Nominatim, Overpass | PLZ-Suche, Filialen, Adressen und Öffnungszeiten |
| Lokale Daten | JSON | Demo-, Seed- und Testdaten |
| Dokumentation | Markdown, Obsidian | Projektwissen, Status und technische Entscheidungen |

## Technische Architektur

```text
iOS-App (SwiftUI) --------> lokale Demo-Daten

Web/PWA (React) ----------> Supabase API
      |                         ^
      +--> OpenStreetMap        |
      +--> Open Food Facts      |
                                |
GitHub Actions ------------> Python-Importjob
                                |
                                +--> Open Prices
                                +--> öffentliche kaufDA-Angebote
```

Die drei Hauptbereiche bleiben bewusst getrennt:

- `ios/Preisfuchs/` enthält die native iOS-App.
- `web/` enthält die Web/PWA-Test- und Einkaufsoberfläche.
- `backend/` und `supabase/` enthalten Importjobs und Datenbankschema.
- `data/` enthält lokale Stamm-, Demo- und Seed-Daten.

## Datenmodell in Kurzform

- **Produkt:** Name, Kategorie, Packungsgröße, Suchbegriffe und Barcodes
- **Händler:** Händlername und normalisierte Zuordnung
- **Filiale:** Händler, Adresse, Koordinaten und Herkunft der Standortdaten
- **Preisbeobachtung:** Produkt, Händler/Filiale, Preis, Grundpreis, Zeitpunkt,
  Gültigkeit, Preisart, App-Bedingungen, Quelle, Lizenz und Konfidenz
- **Update-Lauf:** Quelle, Start, Ende, Status, Importmenge und Hinweise

## Nicht-Ziele des ersten MVP

- keine Garantie vollständiger oder sekundengenauer Filialpreise
- kein aktives Scraping geschützter Supermarktseiten
- keine automatisierte Anmeldung bei Händler-Apps oder Kundenkonten
- keine Veröffentlichung persönlicher Coupon- oder Kundendaten
- keine kostenpflichtigen Daten-APIs
- kein OpenAI-Einsatz im ersten MVP
- noch kein vollständiger Bezahl- oder Bestellvorgang

## Wichtige nächste Ausbauschritte

1. Zeichencodierung und deutsche Umlaute im bestehenden Datenbestand prüfen
   und vereinheitlichen.
2. Tests für Warenkorboptimierung, Angebotsklassifizierung, Ablaufdaten und
   Händlerzuordnung ergänzen.
3. Verlässliche Barcodes in den Produktstammdaten hinterlegen und Open Prices
   erneut anbinden.
4. Händler- und Quellenadapter rechtlich sowie technisch einzeln prüfen und
   robuster gestalten.
5. Datenalter und Konfidenz stärker in Sortierung und Darstellung einbeziehen.
6. Standortdaten optional in Supabase zwischenspeichern, um externe
   Overpass-Abfragen zu reduzieren.
7. Die native iOS-App an den Funktionsumfang der Web-App annähern und auf
   einem Mac mit Xcode testen.
8. Datenschutz, Impressum, Nutzungsbedingungen und Quellenlizenzen vor einer
   öffentlichen Veröffentlichung vervollständigen.

## Wichtige Projektpfade

- `ios/Preisfuchs/` – native SwiftUI-App
- `web/` – React-Web-App und PWA
- `backend/jobs/price_update_job.py` – Preisimport und Normalisierung
- `backend/supabase/schema.sql` – vollständiges Datenbankschema
- `supabase/migrations/` – nachvollziehbare Datenbankmigrationen
- `.github/workflows/daily-price-update.yml` – tägliche Automatisierung
- `data/standard_products.json` – Produktstammdaten
- `docs/MVP_PLAN.md` – Umsetzungsphasen und offene Schritte
- `docs/APP_RABATTE.md` – Regeln für bedingte Händler-App-Preise
- `docs/SUPABASE_SETUP.md` – Einrichtung des Backends

## Leitprinzip

Preisfuchs soll nicht den Eindruck perfekter Marktabdeckung erzeugen, sondern
aus offenen, nachvollziehbaren Preisbeobachtungen einen praktischen und
transparenten Einkaufsvergleich machen.
