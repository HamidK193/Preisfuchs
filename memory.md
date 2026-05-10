# Memory

## Projektentscheidungen

- App-Name: Preisfuchs
- Zielregion: Baden-Wuerttemberg
- Erste Maerkte: Aldi Sued, Lidl, Rewe, Edeka, Kaufland
- Produkte: 76 Standard-Lebensmittel und Alltagsprodukte, gruppiert nach Kategorien statt langer
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
- Web-App zeigt ein Fuchs-Logo, Haendler-Logo-Badges in Preiszeilen und eine
  aufklappbare Einkaufsliste oben rechts.
- Web-App filtert Produkte ohne echte Preisbeobachtung aus der Hauptauswahl,
  damit keine Platzhalterpreise angezeigt werden.
- Web-App wurde am 2026-05-10 in Richtung Shopping/Angebotsseite umgebaut:
  Angebots-Hero, Haendler-Leiste, Prospekt-/Angebotskarten, Produktkarten mit
  `Hinzufuegen`, rechter Warenkorb und Checkout-Vergleich.
- Warenkorb rechnet zwei Varianten: guenstigster kompletter Einkauf in einem
  Laden und maximal guenstige Aufteilung ueber mehrere Laeden.
- Haendler werden als markenfarbige Badges statt als falsche Logo-Bilder
  dargestellt. Der Marktvergleich zeigt pro Produkt nur den besten Preis je
  Haendler, damit dieselben Maerkte nicht mehrfach hintereinander auftauchen.
- Produktkatalog wurde am 2026-05-10 auf 76 Produkte erweitert. Neu sind u.a.
  Toastbrot, Aufbackbroetchen, Vollkornbrot, Muesli, Cornflakes, Marmelade,
  Honig, Saucen, Fleisch/Wurst, Drogerie, Baby und Tierbedarf. Ein gezielter
  Import schrieb 144 neue kaufDA-Preisbeobachtungen fuer 21 der 25 neuen
  Produkte in Supabase.
- Web-App nutzt kuratierte Produktbilder aus `web/src/productImages.ts` zuerst,
  darunter Open-Food-Facts-Packshots und echte Produkt-/Lebensmittelfotos fuer
  frische Ware, Drogerie, Baby und Tierbedarf. Die freie Open-Food-Facts-Suche
  laeuft nur noch fuer verpackte Produkte ohne feste Bildzuordnung.
- Shopping-Referenz vom 2026-05-10: linke Leiste soll wie ein Online-Shop
  Shopbereiche plus Filter enthalten; Suche, PLZ, Umkreis und Warenkorb gehoeren
  in die obere Leiste. `Prospekte & Deals` ist ein eigener klickbarer Tab.
  Klick auf den Warenkorb oben rechts oeffnet eine eigene Kassenansicht.
- Open Prices wurde am 2026-05-10 gegen das offizielle API-Schema geprueft.
  Der `country`-Parameter ist nicht dokumentiert und wurde aus dem Job
  entfernt. Der Live-Endpunkt liefert fuer `product_code` aktuell HTTP 500;
  der Job ueberspringt solche Barcode-Fehler pro Produkt und laeuft mit den
  uebrigen Quellen weiter.
- kaufDA-Parser repariert bekannte UTF-8/Windows-Mojibake-Reste und erkennt
  echte Umlaute, Euro-Zeichen und `Gueltig bis`-Daten robuster.

## Offene Punkte

- Open-Prices-Produktcode-Import erneut testen, sobald der Live-Endpunkt nicht
  mehr HTTP 500 liefert oder konkrete Barcodes fuer MVP-Produkte hinterlegt
  werden.
- Optional Filialdaten spaeter in Supabase cachen, damit die Web-App nicht bei
  jeder PLZ-Aenderung direkt Overpass abfragen muss.
- Native iOS-App auf einem Mac mit Xcode bauen oder spaeter per TestFlight verteilen.
- Supabase Cloud-Projekt ist erstellt und verbunden; letzter gezielter Import
  schrieb 25 zusaetzliche Produkte und 144 neue Preisbeobachtungen. Insgesamt
  liegen damit rund 693 Preisbeobachtungen vor; fuer mindestens 69 von 76
  Produkten liegen aktuell echte Preisbeobachtungen vor.
