# Memory

## Projektentscheidungen

- App-Name: Preisfuchs
- Zielregion: Baden-Wuerttemberg
- Erste Maerkte: Aldi Sued, Lidl, Rewe, Edeka, Kaufland
- Produkte: 51 Standard-Lebensmittel, gruppiert nach Kategorien statt langer
  Linkliste
- Cloud-Empfehlung: Supabase
- GitHub-Repo: privat
- OpenAI: spaeter, nicht im ersten MVP

## Architektur

- iOS-App liest im ersten Schritt lokale Demo-Daten.
- Web/PWA-Testversion unter `web/` erlaubt Tests auf Windows und Handy-Browser.
- Backend-Jobs bereiten taegliche Aktualisierung ueber offene Quellen vor.
- Supabase speichert Produkte, Haendler, Filialen, Preisbeobachtungen und
  Update-Laeufe.
- Preise sind Beobachtungen mit Quelle und Zeitstempel.
- Automatischer Import aus kaufDA-Angebotsseiten ist aktiv und schreibt
  `kaufDA Angebot` in `price_observations`.
- Web-App laedt Filialdaten im Browser ueber OpenStreetMap/Overpass anhand von
  PLZ und Radius. Preisbeobachtungen werden der naechsten passenden Filiale des
  Haendlers zugeordnet.
- Web-App nutzt links Kategorie-Kacheln mit Lebensmittelbildern. Produktwahl
  erfolgt im Hauptbereich ueber Bildkarten und aktiven Produkt-Hero.

## Offene Punkte

- Open-Prices-Response gegen echte API-Daten testen.
- Optional Filialdaten spaeter in Supabase cachen, damit die Web-App nicht bei
  jeder PLZ-Aenderung direkt Overpass abfragen muss.
- Native iOS-App auf einem Mac mit Xcode bauen oder spaeter per TestFlight verteilen.
- Supabase Cloud-Projekt ist erstellt und verbunden; letzter Import schrieb
  51 Produkte und 388 Preisbeobachtungen.
