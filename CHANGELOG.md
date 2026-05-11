# Changelog

## Unreleased

- Web/PWA von einer Preisübersicht zu einer Shopping-Oberfläche mit
  Angebots-Hero, Händler-Leiste, Angebotskarten, Produktkarten und sichtbarem
  Warenkorb umgebaut.
- Web/PWA näher an die Shopping-Referenz angepasst: linke Leiste mit
  Shopbereichen und Filtern, obere Such-/PLZ-/Radius-/Warenkorb-Leiste,
  Prospekte-&-Deals-Tab und eigene Kassenansicht.
- Mobile Shopping-Ansicht überarbeitet: Navigation, Suche, Prospekte,
  Produktkarten, Marktvergleich, Warenkorb und Sparoptionen stapeln sich auf
  kleinen Displays sauber ohne überlappende Desktop-Spalten.
- Produktbilder werden in der Web/PWA über eine kuratierte Bildliste mit
  Open-Food-Facts-Packshots und echten Produkt-/Lebensmittelfotos gesetzt; die
  freie Open-Food-Facts-Suche ist nur noch Fallback für verpackte Produkte.
- Bekannte Prospektprodukte erhalten jetzt zuerst produktspezifische Packshots
  aus geprüften Quellen, z. B. Haribo Goldbären, Katjes Tappsy, Pringles,
  Milka Alpenmilch, Barilla Spaghetti, HiPP Fruchtbrei und Fairy Spülmittel.
- Standardkatalog von 51 auf 76 Produkte erweitert; gezielter Supabase-Import
  schrieb 25 neue Produkte und 144 neue kaufDA-Preisbeobachtungen für 21 neue
  Produkte.
- Standardkatalog auf konkrete Produkt-, Marken- und Packungsnamen umgestellt,
  statt nur generische Begriffe wie Butter, Schokolade oder Chips zu zeigen.
- Web/PWA erzeugt aus `price_observations.product_name` eigene Produktvarianten
  und macht Prospektdetails als einzelne Warenkorb-Produkte sichtbar.
- Prospektvarianten werden anhand ihres echten Angebotstitels neu klassifiziert,
  damit z. B. Apfelschorle, Babybrei oder Wurst nicht mehr im Äpfel-Tab landen.
- Kategorien um eine Produktart-Auswahl ergänzt, z. B. Chips, Gummibärchen,
  Kekse, Schokolade und Nüsse innerhalb von Süßigkeiten.
- Warenkorb mit Mengensteuerung, Entfernen, Warenkorb-Summe und Checkout-
  Vergleich ergänzt: günstigster Gesamtpreis in einem Laden vs. maximal
  günstige Aufteilung über mehrere Läden.
- Händlerdarstellung von falschen Logo-Kacheln auf klare markenfarbige Badges
  umgestellt und Marktvergleich pro Produkt auf den besten Preis je Händler
  verdichtet.
- Open-Prices-Import gegen das offizielle API-Schema geprüft und den nicht
  dokumentierten `country`-Parameter entfernt.
- Open-Prices-HTTP-Fehler pro Barcode abgefangen, damit der tägliche Import
  bei API-Ausfällen mit den übrigen Quellen weiterlaufen kann.
- kaufDA-Parser robuster gegen UTF-8/Windows-Mojibake, echte Umlaute,
  Euro-Zeichen und `Gültig bis`-Datumsangaben gemacht.

## 0.1.0 - 2026-05-09

- Projektordner in `Preisfuchs` umbenannt.
- SwiftUI-iOS-App mit Demo-Preisvergleich angelegt.
- Web/PWA-Testversion für Windows und Handy-Browser angelegt.
- Web/PWA kann Produkte aus Supabase laden und fällt bei fehlender Konfiguration auf Demo-Daten zurück.
- Web/PWA um PLZ-/Umkreisfilter, Filialadressen, Öffnungszeiten und näheres App-Design erweitert.
- Supabase-Schema für Produkte, Händler, Filialen und Preisbeobachtungen angelegt.
- Supabase-Smoke-Test und Setup-Anleitung ergänzt.
- Supabase-Migrationsordner für GitHub-Integration ergänzt.
- Täglichen GitHub-Actions-Workflow für Preisupdates vorbereitet.
- Automatischen kaufDA-Angebotsimport in den täglichen Preisjob integriert.
- Standard-Produktliste für Lebensmittel-MVP erstellt.
- Standard-Produktliste auf 51 Lebensmittel in neun Kategorien erweitert.
- Web/PWA-Design mit Kategorie-Navigation, Lebensmittelbildern, Produkt-Hero und
  Bildkarten überarbeitet.
- Supabase mit erweitertem Produktkatalog und 549 Preisbeobachtungen aktualisiert.
- Fuchs-Logo, Händler-Logo-Badges und aufklappbare Einkaufsliste oben rechts
  ergänzt.
- Web/PWA lädt bis zu 5000 Preisbeobachtungen aus Supabase und zeigt in der
  Hauptauswahl nur Produkte mit echten importierten Preisen.
- kaufDA-Import um mehrere Suchbegriffe und Händler-Alias-Erkennung erweitert;
  letzter Import: 549 Preisbeobachtungen für 48 Produkte.
