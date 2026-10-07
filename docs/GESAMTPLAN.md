# Preisfuchs: Gesamtplan

Stand: 6. September 2026. Dieser Plan konkretisiert den Wiedereinstieg aus
`memory.md:135` und ergänzt den ursprünglichen iOS-MVP-Plan.

## Ziel und Grenzen

Preisfuchs hilft, einen tatsächlichen Einkauf bei Lidl, Aldi Süd, Rewe, Edeka
und Kaufland in Baden-Württemberg zu vergleichen. Der Nutzer wählt Produkte,
Mengen und erlaubte Alternativen und erhält einen vollständigen Ein-Laden-Plan
oder eine Aufteilung. Fehlende Preise bleiben fehlend; historische Beobachtungen
und Demo-Daten sind sichtbar gekennzeichnet. Die Webversion ist zuerst auf
Desktop und Handy prüfbar. SwiftUI und dieselben fachlichen Regeln bleiben das
Ziel der nativen iOS-App.

Kostenlose Quellen zuerst. Keine Bezahl-API, kein automatisierter Zugriff auf
geschützte Händlerkonten. Keine Aussage über vollständige oder garantierte
Filialpreise. Tierbedarf, Drogerie und Non-Food gehören zum geplanten Katalog;
ein Katalogeintrag allein ist kein Nachweis für vorhandene Preisabdeckung.

## Ausgangsstand vor der Wiederaufnahme

| Bereich | Befund vom 05.09.2026 | Konsequenz |
| --- | --- | --- |
| Codex | `claude-mem@claude-mem-local` ist deaktiviert; Datei-/Suchaufrufe und Tests liefen ohne gemeldeten Hook-Abbruch | Deaktiviert lassen; die Ursache ist weiterhin nicht abschließend geklärt |
| Fehlerprotokoll | SQLite-Log: keine WARN/ERROR oder Hook-/Worker-Einträge ab 10:11 UTC; neuester auslesbarer Eintrag 10:13:32 UTC | Nur dieses Zeitfenster ist belegt; keine dauerhafte Stabilität behaupten |
| Web | 22 Tests bestanden; TypeScript und Vite-Build erfolgreich | Belastbare Ausgangsbasis für Änderungen |
| Backend | 6 Unit-Tests bestanden | Normalisierung und Seed-Prüfungen lokal funktionsfähig |
| Vorschau | Playwright/Edge bei 1440, 390 und 320 px; keine JS-Seitenfehler, keine kaputten geladenen Bilder | Mobil 2 px Überlauf; langer Weg von Suche zu Vergleich; Kopf behauptet „diese Woche“ |
| Supabase | Connector meldet Preisfuchs (`eanggjsdpjjskqycvknx`) als `INACTIVE` | Aktuelle Datenzahlen, Migrationen und Remote-RLS nicht verifiziert |
| Produktidentität | Unbekannte Marken werden wie generische Produkte gruppiert; gleiche Packungsgröße genügt teilweise für Basiszuordnung | Vor großen Imports fachliche Trennmerkmale und konservative Zuordnung umsetzen |
| Vorarbeiten | Viele bereits geänderte und unversionierte Dateien vorhanden | Vorarbeiten erhalten; keine pauschalen Resets oder Aufräumaktionen |

Die Datenzahlen vom August in README und Memory sind historisch. Der heutige
Connectorstatus ersetzt sie als Betriebsstatus, nicht als neuen Datenbestand.
Baseline-Screenshots und Bericht: `artifacts/baseline-20260905/` (lokal ignoriert).

## Reihenfolge und prüfbare Ergebnisse

| Schritt | Ergebnis | Abnahme | Status |
| --- | --- | --- | --- |
| 0. Wiedereinstieg | Hook-Prüffenster, lokale Tests, vorhandene Vorschau, Cloudstatus | Befunde mit Grenzen dokumentiert | Geprüft |
| 1. Produktregeln | Prüfung aller 76 bestehenden Produktarten, getrennte Identität und Packungsgröße | Bio, Fettstufe, Sorte, Marke und Non-Food-Editionen bleiben getrennt | Regeln und Packungsmodell umgesetzt; drei konkrete Artikel bestätigt, unbekannte Merkmale bleiben getrennt |
| 2. Webdesign | Neue Desktop-/Mobilgestaltung mit sichtbarer Datenbasis und kurzem Weg zum Einkauf | Screenshots, Tastaturbedienung, kein Seitenüberlauf bei 320/390/768/1440 px | Lokaler Entwurf und Browserfluss umgesetzt; vollständiges Accessibility-Audit offen |
| 3. Datenbank | Bestehende Rabatt-/Security-Migrationen, anschließend additive Katalogerweiterung | Migrationen + anon/authenticated/service-role geprüft | Wieder aufgenommen, gesichert, sechs Erweiterungen ausgerollt; Rechte geprüft |
| 4. Pilotimport | Kleine, geprüfte Produktgruppen, nachvollziehbare Quellen- und Bildzuordnung | Dry-run, Duplikatprüfung, Freigabe vor Veröffentlichung | Drei Artikel, sechs BW-Beobachtungen veröffentlicht; Reimport geprüft, ein Packshot bestätigt. Preise historisch |
| 5. Erweiterung | Kategorieweise Sortiment und Herstellerartikel ergänzen | Jede neue Art besitzt Regeln und reale Abdeckungszahlen | Nach Pilot |
| 6. Betrieb | Überwachte tägliche Läufe und dauerhafte Korrekturen | Fehlgeschlagene/teilweise Läufe sichtbar; Korrektur bleibt beim Reimport erhalten | Status/Prüfliste umgesetzt; Erhalt von Korrekturen und Freigaben remote geprüft. CI noch nicht ausgerollt; Adminoberfläche und Konfliktprüfung offen |
| 7. iOS | Vergleichsmodell und geeignete Bedienung nachziehen | Xcode-Build, Simulator und reales Gerät | Mac erforderlich |

Lokale Gestaltung, Regeln und Tests können auch bei inaktivem Supabase-Projekt
fortgesetzt werden. Produktive Imports hängen vom erfolgreichen Schema- und
Rechtetest ab.

## Produkt- und Vergleichsmodell

Vier Ebenen werden getrennt:

1. **Produktart:** z. B. Bananen, Quark, Katzen-Nassfutter oder Sammelkarten.
2. **Vergleichsgruppe:** fachlich passende Alternativen, z. B. Bio-Magerquark
   natur; verifizierte Eigenmarken dürfen zusammengehören.
3. **Konkreter Artikel:** Hersteller/Marke, Sorte, GTIN und Packung. Kinder Joy
   derselben Ausführung darf händlerübergreifend denselben Artikel bilden.
4. **Preisbeobachtung:** Artikel, Händler, gegebenenfalls belegte Filiale,
   Kaufpreis, Menge, Quelle, Beobachtungsdatum, Gültigkeit und Rabattbedingungen.

Die Merkmalmatrix steht in [PRODUKT_VERGLEICHSREGELN.md](PRODUKT_VERGLEICHSREGELN.md).
Fehlende Angaben bedeuten „unbekannt“. Insbesondere ist fehlendes „Bio“ kein
gesicherter Nachweis für konventionellen Anbau. Namen liefern Hinweise, aber
keine alleinige Freigabe. Unbekannte Marken werden nicht automatisch Eigenmarken.

Zuordnung in dieser Reihenfolge: geprüfte manuelle Regel → verifizierte
GTIN/Quellen-ID → vollständige strukturierte Merkmale → Prüfliste. Widersprüche
haben Vorrang vor Ähnlichkeit. „Bananen-Süßigkeiten“, „Milchschokolade“,
„Reiswaffeln“ und „Babywindeln“ dürfen nicht durch ein Wortfragment in Obst,
Milch, Eis oder Babybrei landen.

Packungsdaten werden numerisch geführt: Menge, Einheit und Multipack-Anzahl,
zusätzlich Originaltext. `2 × 250 g` ergibt 500 g Inhalt, bleibt aber eine
konkrete Verkaufspackung. Stück, Waschladungen, kg und Liter werden nicht
ineinander umgerechnet. Abtropfgewicht, Pfand und variable Gewichte benötigen
eigene Felder beziehungsweise einen unvollständigen Berechnungshinweis.

Zunächst bleiben Packungsgrößen getrennte Warenkorbpositionen. Ein späterer
Bedarfsmodus berechnet notwendige ganze Packungen mit Aufrundung und zeigt
Übermenge: für 750 g Bedarf sind bei 500-g-Packungen zwei Packungen zu bezahlen.
Grundpreis-Rang und tatsächlicher Kaufpreis sind getrennte Anzeigen. Erst nach
expliziter Wahl von Alternativen wird über verschiedene Artikel optimiert.

Geld wird bei der künftigen Normalisierung in Cent gerechnet. Ein vollständiger
Ein-Laden-Plan wird nur mit einem vollständigen Mehr-Läden-Plan verglichen.
Fahrtkosten und Zeit werden nicht stillschweigend als null bewertet; sie sind
zunächst nicht Teil des Modells. App- und personalisierte Preise bleiben
getrennte Opt-ins, mit sichtbaren Bedingungen direkt am verwendeten Preis.

## Neues Webdesign

Aufgabe der Seite: einen Einkaufszettel zusammenstellen und seine beobachteten
Preise nachvollziehen. Die Startansicht bekommt weniger Werbefläche und mehr
Platz für Suche, Produkte und den eigenen Einkauf.

Gestaltungsrichtung: klare Einkaufsoberfläche mit Fuchsorange als Aktion,
dunklem Tannengrün für Schrift und einem hellen Minzton als Fläche. Eine
kompakte Darstellung des Einkaufszettels mit Summen ist das wiederkehrende
Gestaltungselement. Keine dekorative Prozentzahl ohne belegten Rabatt.

| Token | Wert | Verwendung |
| --- | --- | --- |
| Tinte | `#173D36` | Überschriften, Haupttext |
| Fuchsorange | `#C34C17` | primäre Aktionen |
| Minze | `#EAF4EE` | Einstieg, ausgewählte Bereiche |
| Papier | `#FFFFFF` | Karten, Eingaben |
| Hintergrund | `#F5F7F6` | ruhige Grundfläche |
| Sekundärtext | `#52675F` | Metadaten und Hinweise |

Überschriften nutzen `Trebuchet MS` mit Systemfallback, Fließtext `Segoe UI`;
Preise erhalten tabellarische Ziffern. Das funktioniert ohne externe Fontabrufe.

```text
Desktop
┌ Kategorien ┬ Suche                    PLZ / Umkreis     Einkauf ┐
│ Preisfuchs │ Datenstand / Demo sichtbar                         │
│            │ Dein Einkauf. Gut verglichen.                     │
│ Bereiche   │ Produkte / Angebote       Händlerabdeckung        │
│            ├ Produktkarten              ┬ Dein Einkaufszettel  │
│ Rabattwahl │ Quelle + Datum je Preis    │ Mengen / Teilsumme    │
│            │ ausgewählter Preisvergleich│ Ein Laden / Aufteilen │
└────────────┴────────────────────────────┴───────────────────────┘

Mobil
┌ Preisfuchs                                  Einkauf ┐
│ Suche                                               │
│ PLZ / Umkreis                 Kategorien horizontal │
│ Datenstand / Demo                                   │
│ Produkte / Angebote                                 │
│ kompakte Produktkarten mit Quelle und Datum          │
│ Vergleich / eigener Einkaufszettel                   │
└─────────────────────────────────────────────────────┘
```

Nicht funktionsfähige Filter werden aus der Hauptbedienung entfernt. Suche,
Kategorie, Produktart und Rabattoptionen müssen tatsächliche Wirkung haben.
Der Begriff „Kasse“ wird durch „Einkauf vergleichen“ ersetzt, weil Preisfuchs
keine Waren verkauft. Leere Ergebnisse nennen einen nächsten sinnvollen Schritt.
Der Datenstatus steht auch mobil im Hauptbereich; Datenbanknamen gehören nicht
in die normale Kaufentscheidung. Quellen und Beobachtungsdatum bleiben bei
Angebot, Produktpreis, Detail und Warenkorb sichtbar.

Die Baseline zeigt passende Naturfotos, aber auch ein unpassendes generisches
Milchbild und eine sehr lange mobile Seite. Produktbilder erhalten eine klare
Rolle: verifizierter Packshot oder gekennzeichnetes Symbolbild. Fehlende Bilder
bekommen einen ruhigen, verständlichen Fallback. Keine falschen Markenkartons.

## Quellen und Beschaffung

| Quelle | Nutzung | Geprüfter Stand / Freigabe |
| --- | --- | --- |
| Open Prices | Preisbeobachtungen, Nachweise und Orte | Offizielle API und Exporte vorhanden; vorhandenen Adapter zuerst mit kleinem Dry-run prüfen |
| Open Food Facts | GTIN, Produktmerkmale, Packshots | Produktdaten sind keine Preisgarantie; neue Integration an aktueller Dokumentation ausrichten |
| Open Beauty / Pet Food / Products Facts | Kandidaten für Drogerie, Tierbedarf und Non-Food | Eigene Datenbestände; Unterstützung und tatsächliche Abdeckung separat testen |
| kaufDA / Bonial | Zunächst Links, möglicher Partnerfeed | Veröffentlichung/Übernahme nicht freigegeben; produktiver Parser bleibt aus |
| Händler-/Partnerfeeds | Bedingte Angebote und korrekte Filialbezüge | Nur mit bestätigtem Zugang und Nutzungsrecht |
| OSM / Overpass | Filialen, Wege, gepflegte Öffnungszeiten | Kein Beleg für einen Filialpreis |
| Eigene Belege / manuelle Beobachtungen | Spätere Ergänzung | Nachweise vor Veröffentlichung von personenbezogenen Angaben bereinigen |

Open Prices stellt API, JSONL-Exporte und einen Parquet-Datensatz bereit; die
offizielle Dokumentation nennt ODbL und die Trennung nicht frei weitergebbarer
Daten. Daraus folgt für Preisfuchs: Quellenfreigaben pro Beobachtung erhalten,
keine pauschale Freigabe alter Prospektimporte.
[Open-Prices-Datendokumentation](https://github.com/openfoodfacts/open-prices/blob/main/docs/guides/data.md)

Open Food Facts dokumentiert eigene Lizenzen für Daten und Bilder sowie Limits
für Produkt- und Suchabfragen. Für größere Importe sind Exporte vorgesehen.
Backend-Caching und gezielte GTIN-Abfragen ersetzen unbeschränkte Browsersuche.
[OFF-API-Dokumentation](https://openfoodfacts.github.io/openfoodfacts-server/api/)

Die offizielle Dokumentation nennt Beauty, Pet Food und Products als getrennte
Instanzen und weist darauf hin, dass Open Prices dort noch nicht unterstützt
wird. Diese Kandidaten liefern daher keine belegte Preisabdeckung für Pokémon
oder Tierbedarf. Edition, Sprache und Packungsart von Sammelkarten müssen aus
einer gesondert geprüften Quelle stammen.
[Non-Food-APIs](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/scanning-cosmetics-pet-food-and-other-products/)

Die kaufDA-AGB beschränken Kopieren, Weitergabe und Veröffentlichung und sehen
für nicht ausdrücklich zugelassene Nutzungen vorherige schriftliche Zustimmung
vor. Projektentscheidung: ohne dokumentierte Erlaubnis keine öffentliche
Übernahme; ein technischer Parser allein reicht nicht.
[kaufDA-AGB](https://www.kaufda.de/AGB)

## Bilder und dauerhafte Korrekturen

Für jedes zugeordnete Bild speichern: Artikel-/Gruppen-ID, Original-URL,
Urheber/Quelle, Lizenz, Abrufdatum, Bildart, geprüfte Packungsgröße und
Prüfstatus. Verifizierte Originalbilder haben Vorrang. Eine manuelle Auswahl
überschreibt automatische Vorschläge dauerhaft; sie wird beim Import nicht
zurückgesetzt. Gebrochene URLs werden gemeldet statt still durch einen falschen
Packshot ersetzt.

KI-Bilder sind für generische Symbolbilder erlaubt, müssen sichtbar als solche
gekennzeichnet sein und dürfen keine erfundenen Markenverpackungen zeigen.
Die erste Umsetzung kann vorhandene geeignete Fotos nutzen; Bilderzeugung ist
kein Ersatz für ungeklärte Produktidentität.

Korrekturen benötigen einen stabilen Schlüssel aus Quelle und Quellen-ID,
einen Grund, vorherigen/neuen Wert, Zeitstempel und Bearbeitungsstatus.
„Nicht zusammenführen“ ist eine dauerhafte negative Regel. Automatisch
normalisierte Werte und manuell bestätigte Werte bleiben unterscheidbar.

## Supabase und Rollout

1. Inaktives Projekt wieder zugänglich machen und dann Migrationstabelle,
   Spalten, RLS, Views sowie Datenzahlen neu lesen. Kein Reset, keine Löschung.
2. Vor produktiven Änderungen Datenexport/Backup und Rollout-SQL prüfen.
3. Bestehende Migrationen in Reihenfolge prüfen: App-Rabatte → explizite
   Rechte/RLS → Veröffentlichungsgate → aktuelle Preisview. Bereits angewendete
   Schritte nicht blind erneut ausführen.
4. Vorhandene SQL-Sicherheitstests und API-Smoke-Test ausführen. Anon und
   authenticated dürfen keine Rohpayloads oder internen Läufe lesen und keine
   Katalog-/Preiswerte schreiben. Service role bleibt ausschließlich im Backend.
5. Additiv Produktarten, Vergleichsgruppen, strukturierte Packungen,
   Quellenfreigaben, Bildzuordnungen und Korrekturen einführen. Neue Felder zuerst
   optional; Altimporte zunächst ungeprüft. Keine heuristische Massenmigration
   in bestätigte Vergleichsgruppen.
6. Pilot in kleinen Batches importieren, Ergebnisse prüfen, danach explizit
   publizieren. Bei Fehlern den Import stoppen; bestehende veröffentlichte,
   zulässige Beobachtungen erhalten.

Views müssen RLS respektieren (`security_invoker`); Tabellenzugriff und
Zeilenzugriff werden getrennt geprüft. Aktuelle Supabase-Hinweise werden vor
dem Rollout erneut gelesen. Der Changelog wurde am 05.09.2026 geöffnet; das
Markdown-Format war über das Webwerkzeug nicht auslesbar.
[Supabase-Changelog](https://supabase.com/changelog),
[API-Zugriff](https://supabase.com/docs/guides/api/securing-your-api)

## Import und Betrieb

Jeder Adapter liefert denselben internen Entwurf: Quellen-ID, Abrufzeit,
Artikelidentität, Packung, Preis, Währung, Ort, Gültigkeit, Rabattbedingungen,
Lizenzstatus und Nachweis. Schritte: abrufen → normalisieren → plausibilisieren
→ zuordnen oder Prüfliste → speichern → freigeben. Retries mit begrenztem
Backoff und Quellenbudget; leere Antworten nicht als erfolgreiche Abdeckung
zählen. Keine Duplikate bei erneutem Lauf derselben Quellen-ID.

Ein Laufbericht enthält angefragte/erfolgreiche Produkte, neue und aktualisierte
Beobachtungen, abgewiesene und ungeklärte Treffer, Fehler je Quelle, älteste und
neueste Daten sowie Dauer. Status mindestens erfolgreich, teilweise erfolgreich
und fehlgeschlagen. Manuellen Korrekturen gehört eine Prüfliste mit Vorschau;
später kann dafür eine geschützte Adminoberfläche entstehen.

Abdeckung wird getrennt gezeigt: Katalogartikel, Artikel mit veröffentlichten
Beobachtungen, aktive Beobachtungen, höchstens 14 Tage alte Beobachtungen und
belegte Filialzuordnung. Händler ohne Treffer bleiben als Lücke sichtbar.

## Werkzeuge und Verifikation

Vorhandene Skills: frontend-design, webapp-testing, Supabase und
verification-before-completion. Playwright ist für die Bestandsaufnahme im
lokalen uv-Cache verfügbar. Dauerhafte Testabhängigkeiten werden gepinnt;
axe wird bei der Accessibility-Prüfung gezielt ergänzt. Supabase CLI 2.116.0
wurde über npx verwendet. Der Connector ist verbunden, das Projekt wieder aktiv.
Docker/psql fehlen für einen vollständigen lokalen DB-Neuaufbau. Vercel-Regeln sind bei konkreten
React-Performanceproblemen ergänzend, keine Voraussetzung für Gestaltung.

Tests konzentrieren sich auf fachliche Fehler: falsche Zusammenführung,
Multipacks, fehlende Preise, aktuelle/abgelaufene Preise, App-/Coupon-Opt-ins,
Warenkorbteilung und dauerhafte Korrekturen. Browserprüfungen decken Suche,
Kategorien, Mengen, Entfernen/Rückgängig, geteilte Links, Tastatur, mobile
Bedienung, Quellenanzeige und Seitenüberlauf ab. Nach Codeänderungen Webtests
und Build; Backendtests bei Änderungen an Katalog/Import; Remote-Securitytests
nach Rollout. iOS-Build bleibt ohne Mac ausdrücklich ungeprüft.

## Abhängigkeiten, die lokal nicht auflösbar sind

- Supabase ist wieder aktiv; Migrationen und Remote-Rechte sind geprüft.
  Ein vollständiger lokaler Neuaufbau wurde ohne Docker nicht geprüft.
- kaufDA benötigt einen belegten zulässigen Datenzugang; derzeit gibt es keine
  Grundlage, daraus eine produktive Quelle zu machen.
- Verifizierte Preis- und Bildabdeckung muss pro Artikel erhoben werden. Eine
  technische Integration liefert keine Zusage über vorhandene Treffer.
- Der native iOS-Build benötigt macOS/Xcode.

Diese Abhängigkeiten blockieren nicht die lokalen Arbeitspakete 1 und 2.

## Umsetzungsstand dieser Fortsetzung

Neue Gestaltung in `web/src/shop.css`, importiert von `main.tsx`. Der alte
CSS-Entwurf wird nicht mehr geladen. Die Browserprüfung unterstützt eine
isolierte Demo und mit `--live` die echte öffentliche Preisview. In beiden
Fällen werden Standortantworten simuliert. Neuester Bericht und Screenshots:
`artifacts/live-pilot-20260906-final/`.

Die erste Heuristik ist durch das strukturierte Katalogmodell ergänzt und für
automatische Zusammenführungen abgelöst. Regeln für alle Seed-IDs stehen in
`data/product_rules.json`; Artikel-/Packungsmodell und dauerhafte Korrekturen
sind implementiert. Die Web-App verwendet die bestätigten IDs und getrennte
Standorte. Preisimporte erben keine Artikelmerkmale aus dem Suchprodukt.

Rollout, Pilotbefund, Korrekturablauf und verbleibende Grenzen stehen in
[KATALOG_IMPORT.md](KATALOG_IMPORT.md) und im [BW-Pilotbericht](PILOT_2026-09-06.md).
Die erste Bildzuordnung ist für das konkrete 500-ml-Öl samt Lizenz geprüft;
andere Pilotartikel verwenden Symbolbilder. Backend-Bedarfsrechnung ist getestet.
Aktuellere/größere Preisabdeckung, Bedarfsbedienung, weitere geprüfte Bilder,
befüllte Non-Food-Artikel, Adminoberfläche und iOS-Nachzug bleiben offen.
