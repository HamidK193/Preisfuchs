# Changelog

## Unreleased

- Web/PWA von einer Preisuebersicht zu einer Shopping-Oberflaeche mit
  Angebots-Hero, Haendler-Leiste, Angebotskarten, Produktkarten und sichtbarem
  Warenkorb umgebaut.
- Web/PWA naeher an die Shopping-Referenz angepasst: linke Leiste mit
  Shopbereichen und Filtern, obere Such-/PLZ-/Radius-/Warenkorb-Leiste,
  Prospekte-&-Deals-Tab und eigene Kassenansicht.
- Produktbilder werden in der Web/PWA ueber eine kuratierte Bildliste mit
  Open-Food-Facts-Packshots und echten Produkt-/Lebensmittelfotos gesetzt; die
  freie Open-Food-Facts-Suche ist nur noch Fallback fuer verpackte Produkte.
- Standardkatalog von 51 auf 76 Produkte erweitert; gezielter Supabase-Import
  schrieb 25 neue Produkte und 144 neue kaufDA-Preisbeobachtungen fuer 21 neue
  Produkte.
- Warenkorb mit Mengensteuerung, Entfernen, Warenkorb-Summe und Checkout-
  Vergleich ergaenzt: guenstigster Gesamtpreis in einem Laden vs. maximal
  guenstige Aufteilung ueber mehrere Laeden.
- Haendlerdarstellung von falschen Logo-Kacheln auf klare markenfarbige Badges
  umgestellt und Marktvergleich pro Produkt auf den besten Preis je Haendler
  verdichtet.
- Open-Prices-Import gegen das offizielle API-Schema geprueft und den nicht
  dokumentierten `country`-Parameter entfernt.
- Open-Prices-HTTP-Fehler pro Barcode abgefangen, damit der taegliche Import
  bei API-Ausfaellen mit den uebrigen Quellen weiterlaufen kann.
- kaufDA-Parser robuster gegen UTF-8/Windows-Mojibake, echte Umlaute,
  Euro-Zeichen und `Gueltig bis`-Datumsangaben gemacht.

## 0.1.0 - 2026-05-09

- Projektordner in `Preisfuchs` umbenannt.
- SwiftUI-iOS-App mit Demo-Preisvergleich angelegt.
- Web/PWA-Testversion fuer Windows und Handy-Browser angelegt.
- Web/PWA kann Produkte aus Supabase laden und faellt bei fehlender Konfiguration auf Demo-Daten zurueck.
- Web/PWA um PLZ-/Umkreisfilter, Filialadressen, Oeffnungszeiten und naeheres App-Design erweitert.
- Supabase-Schema fuer Produkte, Haendler, Filialen und Preisbeobachtungen angelegt.
- Supabase-Smoke-Test und Setup-Anleitung ergaenzt.
- Supabase-Migrationsordner fuer GitHub-Integration ergaenzt.
- Taeglichen GitHub-Actions-Workflow fuer Preisupdates vorbereitet.
- Automatischen kaufDA-Angebotsimport in den taeglichen Preisjob integriert.
- Standard-Produktliste fuer Lebensmittel-MVP erstellt.
- Standard-Produktliste auf 51 Lebensmittel in neun Kategorien erweitert.
- Web/PWA-Design mit Kategorie-Navigation, Lebensmittelbildern, Produkt-Hero und
  Bildkarten ueberarbeitet.
- Supabase mit erweitertem Produktkatalog und 549 Preisbeobachtungen aktualisiert.
- Fuchs-Logo, Haendler-Logo-Badges und aufklappbare Einkaufsliste oben rechts
  ergaenzt.
- Web/PWA laedt bis zu 5000 Preisbeobachtungen aus Supabase und zeigt in der
  Hauptauswahl nur Produkte mit echten importierten Preisen.
- kaufDA-Import um mehrere Suchbegriffe und Haendler-Alias-Erkennung erweitert;
  letzter Import: 549 Preisbeobachtungen fuer 48 Produkte.
