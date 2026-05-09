# Memory

## Projektentscheidungen

- App-Name: Preisfuchs
- Zielregion: Baden-Wuerttemberg
- Erste Maerkte: Aldi Sued, Lidl, Rewe, Edeka, Kaufland
- Produkte: Standard-Lebensmittel
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

## Offene Punkte

- Privates GitHub-Repo erstellen, sobald GitHub-Remote-Erstellung verfuegbar ist.
- Supabase-Projekt anlegen und Secrets im GitHub-Repo setzen.
- Open-Prices-Response gegen echte API-Daten testen.
- Optional OpenStreetMap/Overpass-Import fuer Marktstandorte in BW ergaenzen.
- Native iOS-App auf einem Mac mit Xcode bauen oder spaeter per TestFlight verteilen.
- Supabase Cloud-Projekt ist noch nicht erstellt; Schema und Testskript sind vorbereitet.
