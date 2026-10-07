# Drittquellen und Lizenzen

Diese Datei ist eine technische Bestandsaufnahme und keine Rechtsberatung.
Vor einer öffentlichen Veröffentlichung müssen Quellen, konkrete Assets und
die Art der Datenbankkombination rechtlich geprüft werden.

## Open Prices / Open Food Facts

- Preisfuchs nennt Open Prices als Quelle jeder übernommenen Beobachtung.
- Open-Prices-Daten stehen unter der Open Database License (ODbL) und verlangen
  Attribution sowie je nach Nutzung Share-Alike. Die offizielle Dokumentation
  warnt ausdrücklich davor, nicht frei weitergebbare Daten in denselben offenen
  Datenbestand zu mischen:
  <https://openfoodfacts.github.io/open-prices/guides/data/>.
- Open-Food-Facts-Produktdaten stehen ebenfalls unter ODbL; API-Aufrufe müssen
  die Quelle nennen, die Rate-Limits respektieren und einen eigenen User-Agent
  verwenden:
  <https://support.openfoodfacts.org/help/en-gb/12-api-data-reuse/94-are-there-conditions-to-use-the-api>.
- Die Lizenz eines konkreten Produktbilds muss vor Übernahme oder Self-Hosting
  einzeln geprüft und zusammen mit der nötigen Attribution dokumentiert werden.

## OpenStreetMap, Nominatim und Overpass

- Standortdaten: © OpenStreetMap-Mitwirkende, ODbL;
  <https://www.openstreetmap.org/copyright>.
- Die öffentliche Nominatim-Instanz erlaubt nur moderate, nutzerinitiierte
  Nutzung, höchstens 1 Anfrage pro Sekunde, verlangt Attribution und empfiehlt
  Caching sowie einen austauschbaren Dienst:
  <https://operations.osmfoundation.org/policies/nominatim/>.
- Die Web-App wartet deshalb 1,1 Sekunden nach der letzten PLZ-Änderung, cached
  Standortabfragen 7 Tage und erlaubt alternative Nominatim-/Overpass-Basis-URLs
  über Deployment-Variablen. Für größere oder kommerzielle Nutzung ist ein
  eigener oder vertraglich geeigneter Dienst erforderlich.

## Produkt- und Händlerbilder

### Geprüfter Pilot vom 06.09.2026

Das unverändert übernommene Frontfoto für GTIN `4061461377601` (bio
Sonnenblumenöl kaltgepresst, 500 ml) liegt unter
`web/public/products/off-4061461377601-front.jpg`. Artikel-ID, Packungsprüfung,
Original-URL, Abruf-/Prüfdatum und Lizenz stehen in `data/article_images.json`.

- Foto: Open Food Facts contributors;
  [Produkt und Quelle](https://world.openfoodfacts.org/product/4061461377601).
- [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), gemäß der
  [offiziellen Bildlizenz-Dokumentation](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/).
- Original: `https://images.openfoodfacts.org/images/products/406/146/137/7601/front_de.4.400.jpg`.
- SHA-256 der unveränderten Datei:
  `690da7bf481da790d5814a1fd15f4ff5a6b4000350fda06a35624d25fd48853b`.
- Quelle und Lizenz erscheinen bei Produktkarten, Angeboten und Warenkorb.
  Andere Packungsgrößen oder Artikel erhalten dieses Foto nicht automatisch.

Die Bildabrufe für Dobler-Joghurt und Stadionbratwurst wurden mit HTTP 403
abgewiesen. Dafür wurden keine Bilder freigegeben; sie verwenden gekennzeichnete
Symbolbilder. Das Cola-Foto wurde nur lokal geprüft und nicht übernommen.

### Älterer Demo-Bildbestand

Der aktuelle MVP enthält kuratierte externe Bild-URLs verschiedener Hosts.
Eine erreichbare URL ist keine Nutzungs- oder Hotlink-Erlaubnis. Vor App Store,
öffentlichem Web-Release oder Marketing müssen alle Bilder durch nachweislich
lizenzierte, selbst gehostete Assets ersetzt oder mit Quelle, Lizenz und
Attribution einzeln dokumentiert werden. Händlerzeichen werden im Web-MVP nur
als eigene textbasierte Farbbadges dargestellt.

### Händlerlogos in der App (`mobile/`, seit 04.10.2026)

Auf Wunsch zeigt die neue App echte Händlerlogos, lokal unter
`mobile/assets/images/stores/`. Quelle sind PNG-Renderings (Breite 330 px) dieser
Wikimedia-Commons-Dateien; Commons führt alle als „Public domain“ mit dem Hinweis
„trademarked“:

- `File:Lidl-Logo.svg`, `File:Aldi Süd 2017 logo.svg`, `File:Logo REWE.svg`,
  `File:Logo Edeka.svg`, `File:Kaufland 201x logo.svg`, `File:Penny-Logo.svg`,
  `File:Aldi Nord 201x logo.svg`, `File:Netto Marken-Discount 2018 logo.svg`,
  `File:Norma Logo.svg`
  (<https://commons.wikimedia.org/>).

Urheberrechtlich frei heißt nicht markenrechtlich frei: Die Logos sind Marken
der jeweiligen Händler. Sie dienen nur zur Kennzeichnung des Markts beim
Preisvergleich und dürfen keine Partnerschaft oder Empfehlung suggerieren.
Vor App-Store-Veröffentlichung rechtlich prüfen.

## Software-Abhängigkeiten

JavaScript-Abhängigkeiten sind in `web/package-lock.json`, Python-
Direktabhängigkeiten in `backend/jobs/requirements.txt` festgehalten.
Dependabot und der Web-Sicherheitsworkflow überwachen Aktualisierungen. Vor
einer Distribution der nativen App ist zusätzlich ein vollständiger
Lizenzbericht aller eingebundenen Binär- und Quellabhängigkeiten zu erzeugen.
