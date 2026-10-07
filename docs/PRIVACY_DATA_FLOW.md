# Datenschutz und Datenflüsse im MVP

## Grundsatz

Preisfuchs benötigt für den aktuellen Warenkorbvergleich kein Nutzerkonto und
keine Händler-Zugangsdaten. Es gibt keine Analyse-, Werbe- oder Tracking-SDKs.
Das reduziert die Menge personenbezogener Daten, ersetzt aber keine
Datenschutzerklärung vor einer öffentlichen Veröffentlichung.

## Datenflüsse der Web-App

| Daten | Ziel | Zweck | Speicherung |
| --- | --- | --- | --- |
| Produktkatalog und Preisbeobachtungen | Supabase | Katalog und Vergleich laden | Datenbank; Browser-Cache des Clients |
| Postleitzahl | OpenStreetMap/Nominatim | Mittelpunkt des Suchgebiets bestimmen | nach Regeln des externen Dienstes; Lookup bis zu 7 Tage lokal gecacht |
| Koordinaten und Radius | Overpass API | nahe Supermärkte und Öffnungszeiten laden | nach Regeln des externen Dienstes |
| Produktnamen (nur bei Entwicklungs-Opt-in) | Open Food Facts | höchstens 4 fehlende Packshots pro Ladevorgang suchen | nach Regeln des externen Dienstes |
| Produktbilder | jeweiliger Bildhost | Produktdarstellung | Browser-Cache; Host sieht technisch u. a. IP/Request |
| Warenkorb mit Produkt-IDs und Mengen | `localStorage` | Warenkorb auf dem Gerät behalten | nur im Browserprofil |
| Produkt-IDs, Mengen und Rabattoptionen | geteilter URL-Parameter | Warenkorb ohne Account gemeinsam nutzen | Link bei Sender, Empfänger und ggf. Messenger |

Die PLZ-Abfrage startet 1,1 Sekunden nach der letzten Eingabe einer vollständigen
5-stelligen PLZ. Standortergebnisse werden bis zu 7 Tage im Browser gespeichert, um
die öffentliche Geocoding-Infrastruktur zu schonen.
Sie sollte vor einem öffentlichen Release zusätzlich mit einer kurzen
Erklärung direkt am Feld und einer dokumentierten Datenschutzerklärung
versehen werden.

Die freie Open-Food-Facts-Bildsuche ist standardmäßig deaktiviert. Kuratierte
Bildadressen und lokale Kategorie-Fallbacks benötigen keine Übermittlung des
Suchbegriffs. Für Entwicklung kann sie mit `VITE_ENABLE_OFF_IMAGE_SEARCH=true`
aktiviert werden; pro Ladevorgang sind höchstens 4 Suchen zulässig.

## Geteilte Warenkörbe

Der Teilen-Link enthält keine Namen, E-Mail-Adressen, Standortdaten oder
Preise, aber Produkt-IDs, Mengen und gewählte Rabattoptionen können
Einkaufsgewohnheiten erkennen lassen. Jede Person mit dem Link kann den
Warenkorb lesen. Links besitzen im
MVP kein Ablaufdatum und keine Zugriffskontrolle; sensible Listen sollten nicht
öffentlich gepostet werden.

## Supabase-Schutz

- Browser verwenden ausschließlich den öffentlichen anon Key.
- Browserrollen besitzen nur Leserechte auf ausdrücklich freigegebene Spalten.
- `raw_payload` und `update_runs` sind nicht öffentlich lesbar.
- Der Service-Role-Key bleibt ausschließlich in Backend-Prozessen und GitHub
  Secrets.
- Es werden im MVP keine Händlerkonten oder Coupon-IDs gespeichert.

## Vor App-Store-/Produktivstart

- Externe Bildhosts durch lizenzgeprüfte, selbst gehostete Assets oder einen
  kontrollierten Proxy ersetzen.
- Auftragsverarbeitung, Hostingregion, Löschfristen und Datenschutzhinweise für
  Supabase und weitere Dienste prüfen.
- Nominatim-/Overpass-Nutzungsrichtlinien, Caching und eigene Instanz bzw.
  geeigneten Provider für Produktionslast klären.
- App-Privacy-Angaben in App Store Connect und eine öffentlich erreichbare
  Datenschutzerklärung erstellen.
- Entscheiden, ob geteilte Links Ablauf, Widerruf oder serverseitige
  Zugriffskontrolle benötigen.
