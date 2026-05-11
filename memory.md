# Memory

## Projektentscheidungen

- App-Name: Preisfuchs
- Zielregion: Baden-Württemberg
- Erste Märkte: Aldi Süd, Lidl, Rewe, Edeka, Kaufland
- Produkte: 76 Standard-Lebensmittel und Alltagsprodukte, gruppiert nach Kategorien statt langer
  Linkliste
- Cloud-Empfehlung: Supabase
- GitHub-Repo: privat
- OpenAI: später, nicht im ersten MVP

## Architektur

- iOS-App liest im ersten Schritt lokale Demo-Daten.
- Web/PWA-Testversion unter `web/` erlaubt Tests auf Windows und Handy-Browser.
- Backend-Jobs bereiten tägliche Aktualisierung über offene Quellen vor.
- Supabase speichert Produkte, Händler, Filialen, Preisbeobachtungen und
  Update-Läufe.
- Preise sind Beobachtungen mit Quelle und Zeitstempel.
- Automatischer Import aus kaufDA-Angebotsseiten ist aktiv und schreibt
  `kaufDA Angebot` in `price_observations`.
- Web-App lädt Filialdaten im Browser über OpenStreetMap/Overpass anhand von
  PLZ und Radius. Preisbeobachtungen werden der nächsten passenden Filiale des
  Händlers zugeordnet.
- Web-App nutzt links Kategorie-Kacheln mit Lebensmittelbildern. Produktwahl
  erfolgt im Hauptbereich über Bildkarten und aktiven Produkt-Hero.
- Web-App zeigt ein Fuchs-Logo, Händler-Logo-Badges in Preiszeilen und eine
  aufklappbare Einkaufsliste oben rechts.
- Web-App filtert Produkte ohne echte Preisbeobachtung aus der Hauptauswahl,
  damit keine Platzhalterpreise angezeigt werden.
- Web-App wurde am 2026-05-10 in Richtung Shopping/Angebotsseite umgebaut:
  Angebots-Hero, Händler-Leiste, Prospekt-/Angebotskarten, Produktkarten mit
  `Hinzufügen`, rechter Warenkorb und Checkout-Vergleich.
- Warenkorb rechnet zwei Varianten: günstigster kompletter Einkauf in einem
  Laden und maximal günstige Aufteilung über mehrere Läden.
- Händler werden als markenfarbige Badges statt als falsche Logo-Bilder
  dargestellt. Der Marktvergleich zeigt pro Produkt nur den besten Preis je
  Händler, damit dieselben Märkte nicht mehrfach hintereinander auftauchen.
- Produktkatalog wurde am 2026-05-10 auf 76 Produkte erweitert. Neu sind u.a.
  Toastbrot, Aufbackbrötchen, Vollkornbrot, Müsli, Cornflakes, Marmelade,
  Honig, Saucen, Fleisch/Wurst, Drogerie, Baby und Tierbedarf. Ein gezielter
  Import schrieb 144 neue kaufDA-Preisbeobachtungen für 21 der 25 neuen
  Produkte in Supabase.
- Produktkatalog wurde am 2026-05-10 von generischen Slots auf konkrete
  Produkt- und Packungsnamen umgestellt, z. B. `Milka Alpenmilch Schokolade
  100 g`, `funny-frisch Chipsfrisch Oriental 175 g`, `Milbona H-Milch 1,5%
  1 l` und `Barilla Spaghetti n.5 500 g`.
- Web-App gruppiert `price_observations.product_name` zu eigenen
  Produktvarianten. Prospektdetails werden dadurch einzelne Warenkorb-Produkte,
  nicht nur Preiszeilen unter einem generischen Produkt.
- Prospektvarianten werden anhand ihres Angebotstitels neu klassifiziert. Treffer
  aus einer Apfel-Suche wie Apfelschorle, Direktsaft, Babybrei oder Wurst
  wandern dadurch in Getränke, Baby oder Fleisch statt in Obst/Äpfel.
- Kategorien besitzen jetzt eine Produktart-Auswahl. Unter `Süßigkeiten`
  erscheinen z. B. `Chips`, `Gummibärchen`, `Kekse`, `Schokolade` und `Nüsse`,
  danach erst die konkreten Marken-/Sortenprodukte.
- Web-App nutzt kuratierte Produktbilder aus `web/src/productImages.ts` zuerst,
  darunter Open-Food-Facts-Packshots und echte Produkt-/Lebensmittelfotos für
  frische Ware, Drogerie, Baby und Tierbedarf. Die freie Open-Food-Facts-Suche
  läuft nur noch für verpackte Produkte ohne feste Bildzuordnung.
- Für konkrete Prospektvarianten prüft die Web-App zuerst feste Packshot-Regeln
  mit verifizierten Bild-URLs. Abgedeckt sind u. a. Haribo Goldbären, Katjes
  Tappsy, Pringles Hot & Spicy, Milka Alpenmilch, Barilla Spaghetti, Milbona
  H-Milch/Gouda, HiPP Fruchtbrei, funny-frisch Oriental und Fairy Original.
- Shopping-Referenz vom 2026-05-10: linke Leiste soll wie ein Online-Shop
  Shopbereiche plus Filter enthalten; Suche, PLZ, Umkreis und Warenkorb gehören
  in die obere Leiste. `Prospekte & Deals` ist ein eigener klickbarer Tab.
  Klick auf den Warenkorb oben rechts öffnet eine eigene Kassenansicht.
- Mobile Web-App wurde am 2026-05-11 stabilisiert: Desktop-Spalten werden unter
  760 px konsequent zu einem einspaltigen Einkaufsfluss, die Seiten-Navigation
  wird zur horizontalen Kategorie-Leiste, Produktkarten werden kompakte
  Listenkarten und Warenkorb/Sparoptionen liegen ohne Überlappung untereinander.
- Open Prices wurde am 2026-05-10 gegen das offizielle API-Schema geprüft.
  Der `country`-Parameter ist nicht dokumentiert und wurde aus dem Job
  entfernt. Der Live-Endpunkt liefert für `product_code` aktuell HTTP 500;
  der Job überspringt solche Barcode-Fehler pro Produkt und läuft mit den
  übrigen Quellen weiter.
- kaufDA-Parser repariert bekannte UTF-8/Windows-Mojibake-Reste und erkennt
  echte Umlaute, Euro-Zeichen und `Gültig bis`-Daten robuster.

## Offene Punkte

- Open-Prices-Produktcode-Import erneut testen, sobald der Live-Endpunkt nicht
  mehr HTTP 500 liefert oder konkrete Barcodes für MVP-Produkte hinterlegt
  werden.
- Optional Filialdaten später in Supabase cachen, damit die Web-App nicht bei
  jeder PLZ-Änderung direkt Overpass abfragen muss.
- Native iOS-App auf einem Mac mit Xcode bauen oder später per TestFlight verteilen.
- Supabase Cloud-Projekt ist erstellt und verbunden; aktueller Stand vom
  2026-05-10: 76 Produkte, 1176 Preisbeobachtungen und 59 Produkte mit
  mindestens einer echten Beobachtung.
