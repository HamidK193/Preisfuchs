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
- Der tägliche Import nutzt standardmäßig nur Open Prices. Der vorhandene
  kaufDA-HTML-Parser ist wegen ungeklärter Erlaubnis/Datenlizenz deaktiviert
  und nur über ein ausdrücklich gesetztes Experiment-Flag erreichbar.
- Web: zuerst neueste aktive Beobachtung je Artikel, beobachtetem Standort und
  Preisbedingung, dann günstigster erlaubter Preis je Händler. Fehlende Preise
  erzeugen eine gekennzeichnete Teilsumme und werden nie als `0 €` ausgegeben.
- Web-App lädt Filialdaten im Browser über OpenStreetMap/Overpass anhand von
  PLZ und Radius. Importierte Standortpreise bleiben am belegten Quellenort;
  eine andere nahe OSM-Filiale bekommt diesen Preis nicht zugeschrieben.
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
- Web-Warenkörbe werden lokal gespeichert und können als validierter,
  importierbarer URL-Parameter geteilt werden. Für den MVP ist dafür kein
  Account und kein zusätzliches Auth-System nötig.
- App-Rabatte starten aus. Öffentliche App-Preise benötigen ein Opt-in;
  personalisierte Coupons ein separates zweites Opt-in. Händler-Zugangsdaten
  werden nicht erhoben.
- Web und iOS wählen je Händler die neueste aktive Preisbeobachtung; fehlende
  `valid_until`-Werte werden nicht durch erfundene Gültigkeitsdaten ersetzt.
- Die nächste OSM-Filiale ist nur Navigations-/Öffnungszeitenhilfe. Ein
  händlerbezogener Preis wird nicht als für diese Filiale bestätigt dargestellt.
- Supabase-RLS gilt auch für `update_runs`. Browserrollen haben nur explizite
  Lesespalten und keinen Zugriff auf `raw_payload`; der Service-Role-Key bleibt
  im Backend.
- `current_price_observations` reduziert den Browser-Download auf aktive,
  neueste Beobachtungen pro Produktvariante, Händler und Rabattberechtigung.
  Die View läuft mit `security_invoker`, damit RLS und Spaltenrechte gelten.
- Preisbeobachtungen sind standardmäßig nicht öffentlich. Erst `is_public =
  true` nach Quellen-/Lizenzprüfung macht sie über RLS und die aktuelle View
  sichtbar; bestehende Open-Prices/ODbL-Zeilen werden per Migration freigegeben.
- Web-Prüfung: Vitest-Unit-Tests, Produktions-Build, npm-Audit und ein
  Playwright-Smoke-Test. GitHub Actions sind SHA-gepinnt und minimal berechtigt;
  Dependabot überwacht npm, pip und Actions.
- Memory bleibt kuratiertes Markdown. `claude-mem` wird auf Windows wegen
  aktueller Prozess-/Port-/Speicher-Issues nicht aktiviert; Serena/Repomix sind
  erst bei messbarem Bedarf vorgesehen. Recherche: `docs/RESEARCH_REPOS_SKILLS.md`.
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
- Preisbedingungen werden seit 2026-08-28 zweistufig ausgewählt: je Händler und
  Preisart zählt zuerst die neueste aktive Beobachtung, anschließend der
  günstigste aktivierte Preis. Bei Gleichstand gewinnt die Variante ohne App.
- Angebotskarten erfinden keine Rabattprozente mehr. Ohne beobachteten
  Normalpreis wird nur die Angebotsart, aber keine rechnerische Ersparnis gezeigt.
- Standortkopf zeigt den per Nominatim ermittelten Ort statt fest `Stuttgart`;
  der Lookup benötigt eine vollständige 5-stellige PLZ und meldet seinen Status.
- Web-Warenkorb bietet Rückgängig nach Entfernen und zeigt die nachweisbare
  Differenz zwischen vollständigem Ein-Laden-Plan und Mehr-Läden-Aufteilung.
- Native iOS-Liste besitzt nun ebenfalls getrennte Rabatt-Opt-ins sowie
  Ein-Laden- und Mehr-Läden-Summen; Build-Verifikation bleibt auf Windows offen.
- Verifizierte GTINs sind für Milbona Bio H-Milch, Milbona Gouda und Kölln
  Blütenzarte Haferflocken hinterlegt. Open Prices lieferte dafür 4 normalisierte
  Haferflocken-Beobachtungen aus 2025, die als veraltet gekennzeichnet werden.
- Supabase-Smoke-Test prüft Schema und negative anon-Rechte. Die verbundene
  Instanz ist noch veraltet (`requires_app` fehlt); produktive Imports bleiben
  bis zum Migrations-Rollout gesperrt.
- Data-API-Rechte für `service_role` sind nach der Supabase-Änderung von 2026
  explizit in Schema/Migrationen gesetzt; npm-Direktabhängigkeiten sind gepinnt.
- Freie Open-Food-Facts-Bildsuchen sind im Browser standardmäßig deaktiviert;
  das Entwicklungs-Opt-in ist auf 4 Suchen pro Ladevorgang begrenzt.

## Offene Punkte

### 2026-10-04: Quellen-Agents
- Pro Datenquelle ein eigener Agent: OSM-Filialen und Open Food Facts wöchentlich,
  Open Prices weiterhin täglich (`price_update_job.py`).
- Nutzer wollte kaufDA-Preise veröffentlichen und die Quelle in der App nur als
  "Prospekt"/"Scan" ausweisen. Abgelehnt: verschleiert die Herkunft und
  widerspricht der Regel "Preisquelle immer sichtbar". Offen: Prospekte direkt beim
  Händler (mit ehrlicher Quelle) oder Lizenz-Feed von Bonial/marktguru.
- Schema-Zusatz (Migration `weekly_source_agents`) am 04.10. in Supabase eingespielt:
  `stores`-Spalten, 11 neue Ketten, `off_products`, `retailer_offers`.
- `retailer_offers_agent.py`: Adapter je Händler, prüft robots.txt, stoppt bei
  401/403/429, speichert keine Bilder, Quelle ehrlich z. B. "REWE Angebote (rewe.de), 5.–11. Oktober" (kein "KW" in der App, App ist für Privatleute).
  Stand 04.10.: Rewe erlaubt die Angebotsseiten per robots.txt, blockt aber Python-
  Clients per Fingerprint (403, curl bekommt 200) -> nicht umgehen. Netto und Kaufland
  403, Norma robots `Disallow: /`, Penny/Aldi laden Angebote per JavaScript-API,
  Lidl-Prospekt nur als Bilder. Agent ist deshalb NICHT im Workflow eingeplant.
  Realistische Wege: Lizenz-Feed (Bonial/marktguru/Händler) oder Nutzer-Scans
  (Kassenbon/Prospektfoto) in die Tabelle `retailer_offers`.
- Öffentliche View/Policy sind seit 07.10.2026 deutschlandweit geöffnet (Migration `open_public_prices_germany`, kein region-Filter mehr; country_code='DE' bleibt).

### Aktueller Stand, 2026-09-06: erster veröffentlichter BW-Pilot

- Die Ausführung wurde mit „weiter“ fortgesetzt. Keine globale Konfiguration
  geändert; claude-mem bleibt deaktiviert. Keine erneute Freigabe abgefragt.
- Lesesuche in vier BW-Stadtumkreisen: 141 Zeilen gesichtet, 86 Kandidaten.
  `scripts/discover_bw_prices.py` schreibt einen lokalen Bericht ohne Import.
  Kein Anspruch auf Vollerhebung oder aktuelle flächendeckende Preise.
- Drei neue GTINs anhand OFF-v3.6-Metadaten geprüft: Dobler Joghurt 500 g
  (4006888000565), bio Sonnenblumenöl 500 ml (4061461377601), EDEKA Herzstücke
  Stadionbratwurst 400 g (4311501134627). Die 76 Seed-Produkte bleiben erhalten.
  `data/catalog_corrections.json` enthält jetzt drei belegte Korrekturen.
  Unbekannte Merkmale verhindern weiterhin generische Eigenmarken-Gruppen.
- Open-Prices-Upstream bestätigt: `PRODUCT` mit Barcode hat leeres `price_per`.
  Adapter entsprechend korrigiert; gesetzte widersprüchliche Werte abgewiesen.
  Der frühere pauschale Ausschluss leerer Werte war zu streng.
- Dry-run mit sechs GTINs: 13 Treffer, sechs passend, sieben abgewiesen.
  Sechs echte Beobachtungen nach Prüfung öffentlich in Supabase geschrieben.
  Unmittelbarer Reimport ohne Publish-Flag erhält Korrekturen und Freigaben.
  Nachweislich unzulässige Quellen-IDs verlieren ihre Freigabe; Abruffehler
  lösen keine Löschung aus. `imported` zählt Upserts, nicht nur neue Zeilen.
- Remote nach Reimport: 8.941 Beobachtungen, davon sechs öffentlich; drei
  bestätigte Artikel, vier View-Einträge, keine doppelten Quellen-IDs.
  Alle 8.935 alten kaufDA-Zeilen bleiben intern. Keine neue DDL seit 05.09.
- Preisorte: Edeka/Rewe Fellbach und Aldi Süd Stuttgart. Beobachtet zwischen
  02.06. und 22.08.2026, also alle älter als 14 Tage am Prüftag. Sichtbarer
  Altershinweis; keine Live-Preis- oder Verfügbarkeitszusage.
- Öl-Frontbild visuell bestätigt und unverändert lokal unter
  `web/public/products/off-4061461377601-front.jpg` gespeichert. Zuordnung mit
  Artikel-ID, numerischer Packung, Herkunft und CC-BY-SA in `data/article_images.json`.
  Credits auf Karten und im Warenkorb. Joghurt-/Wurstbilder lieferten 403;
  diese Artikel verwenden Symbolbilder. Älterer Demo-Bildbestand nicht voll geprüft.
- Preisquelle auf Karten, Detail und Warenkorb verlinkt den konkreten Beleg.
  Browsermodus `--live` liest die echte öffentliche Preisview, simuliert nur
  Standortdienste und schreibt nichts in Supabase. Zusätzlich synthetische
  Katalogfixture zur Prüfung von Artikel, Multipack und Warenkorb.
- Prüfstand: 33 Webtests, 19 Backendtests, Webbuild und API-Smoke-Test bestanden.
  Browser bei 320/390/768/1440 px inklusive echtem Öl-/Warenkorbfluss geprüft.
  Vite-Größenwarnung bei etwa 501 kB JavaScript (146 kB gzip), kein Buildfehler.
  Bericht/Screenshots: `artifacts/live-pilot-20260906-final/`.
- Desktop und mobiler Warenkorb visuell geprüft. Verifizierte Packungsbilder
  werden vollständig eingepasst; auch Deal-Karten zeigen den Altershinweis.
- Arbeitsgrundlage: `docs/PILOT_2026-09-06.md`, `docs/KATALOG_IMPORT.md` und
  `docs/GESAMTPLAN.md`. Als Nächstes aktuellere Beobachtungen und Sortiment
  erweitern; danach Bedarfsbedienung, Adminoberfläche, Non-Food, Bild-/A11y-Audit.
  Native iOS-App liest Demo-Daten, Modellnachzug und Mac-/Xcode-Prüfung offen.
  Kein Commit/Push oder Webdeployment; geänderter CI-Workflow noch nicht ausgerollt.
  Ältere Abschnitte darunter sind historische Zwischenstände.

### Fortsetzung, 2026-09-05 ab 18:00 UTC

- Nutzer hat Ausführungsfreigaben abgeschaltet und „ok mach weiter“ gesagt.
  Aktuelle Umgebung: danger-full-access, approval_policy never. Keine erneute
  Nachfrage für bereits beauftragte Implementierung. Globale Codex-Konfiguration
  in dieser Fortsetzung nicht verändert; claude-mem bleibt deaktiviert.
- Supabase Preisfuchs `eanggjsdpjjskqycvknx` wieder aufgenommen, ACTIVE_HEALTHY.
  Backup in `artifacts/supabase-backup-20260905T180019Z/`: 76 Produkte, 5 Händler,
  8.935 Beobachtungen, keine Stores/Läufe; Counts/IDs/SHA-256 geprüft.
- Vier vorbereitete und zwei neue Katalogmigrationen remote ausgeführt.
  Initialschema war manuell vorhanden und ist jetzt als Baseline registriert;
  Connector-Zeitstempel auf lokale Migrationsversionen abgeglichen. Sieben
  Versionen stimmen überein. Abgleich-SQL im lokalen Sicherungsordner.
- Alle alten Beobachtungen sind kaufDA mit unbekannter Lizenz: erhalten,
  aber intern. 7.514 am Prüftag abgelaufen, neueste vom 10.08.2026.
  Keine Fake- oder Testpreise dauerhaft in Supabase eingefügt.
- Strukturierte Regeln für 76 Seed-IDs sowie Kinder-Joy-/Pokémon-Regeln in
  `data/product_rules.json`. Die beiden neuen Arten sind noch nicht befüllt.
  `catalog_identity.py`: stabile GTIN-/Quellenartikel-ID, vollständige Merkmale
  vor Eigenmarken-Gruppierung, numerische Packungen und Cent-Bedarfsrechnung.
- Dauerhafte `catalog_corrections.json` mit replace/isolate, Evidenz, Zeitstempel
  und vorher/nachher; zunächst leer. Automatische Werte und angewendete Korrektur
  bleiben am Artikel erhalten. Grafische Adminoberfläche/Konfliktvorschau offen.
- Preisimport: stabile Open-Prices-ID, echte Datums-/GTIN-/Centprüfung, OSM-
  Shoptyp, Land/BW und Händler. Keine Aldi-Nord-/Parkhaus-Zuordnung; unbekannte
  Preisbasis und Rabattbedingungen bleiben ungeprüft. Begrenzte Seiten/Retry,
  Schema-Preflight, no_data/partial/failed-Status und Bericht/Prüfliste ergänzt.
- Echter Pilot: 3/3 GTIN-Abrufe erfolgreich, 7 Treffer, 6 außerhalb/unbezüglich
  BW belegt und 1 Parkhaus; 0 importiert/veröffentlicht. Ein update_runs-Eintrag
  mit no_data gespeichert. `catalog_articles` leer, öffentliche Preisview leer.
- Web liest ausschließlich geprüfte View. Globale Artikel-IDs und strukturierte
  Packungen kommen im Warenkorb an. Filialen werden beim Ein-Laden-Plan getrennt;
  beobachtete Preise nicht einer anderen nahen Filiale zugeordnet. Neue Artikel
  erhalten gekennzeichnete Symbolbilder bis zum geprüften Packshot.
- Prüflauf: 32 Webtests, 17 Backendtests, Webbuild bestanden. Browserprüfung bei
  320/390/768/1440 px und synthetischer strukturierter Katalogfixture bestanden;
  Quelle, Multipack, Artikel-ID, Standort und Warenkorb geprüft. Screenshot
  `artifacts/catalog-20260905/catalog-fixture-390.png` visuell geprüft.
- Remote: `supabase/tests/catalog_roles.sql` mit anon/authenticated/service_role
  bestanden, alles zurückgerollt. API-Smoke-Test prüft explizit 42501 als
  Rechtefehler. Supabase nur erwarteter INFO-Hinweis update_runs ohne Client-Policy.
- CLI 2.116.0 über npx; Playwright 1.62.0 in scripts/requirements-browser.txt.
  Docker/psql fehlen, kein kompletter lokaler DB-Neuaufbau/pgTAP-Lauf. iOS noch
  nicht mit Xcode gebaut. Kein Commit/Push, kein Webdeployment.
- Neue Arbeitsgrundlage: `docs/KATALOG_IMPORT.md`. Nächster Schritt: gezielt
  passende BW-Beobachtungen/GTINs beschaffen, echte Artikel und Bilder bestätigen.
  Weiter offen: Non-Food-Befüllung, Bedarfsbedienung, Adminoberfläche, vollständige
  Bild-/Accessibility-Prüfung und iOS-Nachzug. Die älteren Abschnitte darunter
  sind historische Zwischenstände, insbesondere ihr INACTIVE-Vermerk.

### Fortsetzung nach Wiedereinstieg, 2026-09-05

- Gesamtplan: `docs/GESAMTPLAN.md`; Merkmalmatrix für alle 76 Seed-IDs:
  `docs/PRODUKT_VERGLEICHSREGELN.md`. Das ist die nächste Arbeitsgrundlage.
- `claude-mem@claude-mem-local` bleibt deaktiviert. Datei-/Suchaufrufe,
  Webtests und Backendtests liefen ohne gemeldeten Hook-Abbruch. SQLite-Log
  enthielt ab 10:11 UTC keine WARN/ERROR bzw. Hook-/Worker-Einträge; letzter
  auslesbarer Eintrag war 10:13:32 UTC. Nur dieses Zeitfenster ist belegt,
  die Ursache der früheren Abbrüche bleibt ungeklärt.
- Supabase-Connector ist verbunden; Projekt Preisfuchs `eanggjsdpjjskqycvknx`
  wurde als `INACTIVE` gemeldet. Kein Remote-Rollout, kein produktiver Import
  und keine Wiederaufnahme des Projekts durchgeführt. Augustzahlen historisch.
- Vorhandene Vorschau zuerst geprüft; danach neue Gestaltung in
  `web/src/shop.css` umgesetzt. `styles.css` enthält den vorherigen Entwurf
  und wird nicht mehr importiert. Desktop und mobile Demo bleiben lokal.
- Sichtbarer Datenstatus, Händlerabdeckung, Quellen/Datum an Produktkarten,
  funktionierende Auswahl „mit Preisbeobachtung“, Einkauf statt Kasse,
  öffentliche und personalisierte Rabattwahl auch mobil umgesetzt.
- Erste Zuordnungsabsicherung: Eigenmarken nur bei passender vollständiger
  Artikelbeschreibung; unbekannte Marken sowie Bio-/Fettstufenabweichungen
  bleiben als ungeprüfte Varianten getrennt. Kinder erkannt, Multipacktext
  erhalten, Bananen-Süßigkeiten und „Reis“/„Eis“-Fehlklassifikation abgesichert.
  Die vollständige strukturierte Matrix, numerische Packungs-/Bedarfsrechnung,
  dauerhafte manuelle Prüfliste und globale Hersteller-IDs bleiben offen.
- Bisheriger Prüfstand dieser Fortsetzung: 28 Webtests und Build erfolgreich,
  6 Backendtests erfolgreich. Browsercheck bei 320/390/768/1440 px ohne
  Seitenüberlauf und JS-Seitenfehler; Suche, Preisfilter, Rabattwahl, Mengen,
  Entfernen/Rückgängig, lokale Speicherung und Teilsummen geprüft.
- Browserwerkzeug: Python-Playwright im lokalen uv-Cache; Edge vorhanden.
  `scripts/inspect_web.py --start-server --verify` verwaltet den Node-Prozess
  direkt, weil der generische Serverhelfer unter Windows Kindprozesse übrig
  lassen kann. Bilder benötigen Netzwerkzugriff. Standortantworten sind im
  Test simuliert; Remote-Daten und echte Filialabdeckung nicht dadurch geprüft.
- Nächste Arbeit: vollständiges Merkmals-/Packungsmodell und Korrekturregeln;
  aktives Supabase-Projekt, Migrationen/Rechte frisch prüfen; erst dann kleiner
  Pilotimport mit belegten Quellen und Bildrechten. kaufDA bleibt deaktiviert.
  Kein KI-Bild erstellt, kein globaler Skill installiert, kein Commit/Push.

### Wiedereinstieg nach Codex-Neustart, 2026-09-05

- Nutzer hat vereinbart: zuerst Hook-Ausfälle stabilisieren, danach den
  ausführlichen Preisfuchs-Gesamtplan ausarbeiten und anschließend umsetzen.
- In der globalen Codex-Konfiguration wurde ausschließlich
  `plugins."claude-mem@claude-mem-local".enabled` auf `false` gesetzt.
  Die unveränderte Ausgangsdatei ist daneben als
  `config.toml.preisfuchs-hook-backup-20260905-100836-cf9f2af0b22a41af8ca2f21969cf8216.bak`
  gesichert. Der Vergleich bestätigte, dass keine andere Einstellung verändert wurde.
  Memory-Daten und die Claude-Installation wurden nicht verändert.
- Codex muss vollständig neu gestartet werden. Erst danach Datei-/Suchaufrufe
  und einen Projektcheck ausführen und neue Hook-Fehler prüfen. Die Ursache
  wiederholter Worker-Abbrüche ist noch nicht abschließend geklärt; nicht als
  behoben behaupten. Das Plugin nicht automatisch wieder aktivieren.
- Preisfuchs-Ziel: Einkauf vergleichen, zunächst Lidl, Aldi Süd, Rewe, Edeka
  und Kaufland in Baden-Württemberg. Bestehende lokale Vorschau zuerst ansehen;
  danach ein vollständiges neues Webdesign für Desktop und Mobilgeräte.
- Vor dem großen Import jede Produktart auf notwendige Trennmerkmale prüfen:
  etwa Bio/konventionell bei Bananen, Fettstufe/Bio bei Quark. Vergleichbare
  Eigenmarken bündeln, konkrete Markenartikel wie Kinder Joy händlerübergreifend
  zuordnen. Packungsgröße separat modellieren und beim Kaufpreis berücksichtigen.
  Keine Kategorien allein nach Titelteil bestimmen: Bananen-Süßigkeiten sind
  Süßigkeiten. Unsichere Zuordnungen prüfen statt automatisch zusammenführen.
- Sortiment einschließlich Tierbedarf, Drogerie und Non-Food wie Pokémon
  erweitern. Tatsächliche Quellenabdeckung kenntlich machen. Open Food Facts,
  Open Prices und Prospektseiten wie kaufDA als Kandidaten prüfen; ein produktiver
  kaufDA-Zugang und die erlaubte Weiterverwendung sind noch nicht bestätigt.
- Passende Originalbilder bevorzugen. Nutzer erlaubt KI-Bilder als Ersatz;
  für generische Produkte gekennzeichnete Symbolbilder, keine erfundenen
  Markenverpackungen. Bilder dauerhaft zuordnen und inhaltlich prüfen.
- Supabase-Zustand neu prüfen, Migration und Konnektoren planen, Importe und
  dauerhafte manuelle Korrekturen überwachen. Alte Datenstände unten sind historisch.
- Zusätzliche Werkzeuge sind recherchiert, aber noch nicht installiert:
  Playwright, @axe-core/playwright, Supabase CLI und Vercel React Best Practices.
  Vorhandene Design-/Supabase-Skills verwenden; OCR erst bei konkretem Bedarf.
  Autorisierung zur gezielten Installation und Umsetzung ist bereits gegeben.

- App-Rabatte sind seit 2026-08-10 als bedingte Preisbeobachtungen modelliert.
  Die Oberfläche kann mit/ohne App vergleichen und zeigt nötige Händler-Apps.
  Produktive Händler-Adapter oder Partnerfeeds für EDEKA App, Lidl Plus und
  weitere Apps fehlen noch; keine geschützten App-Schnittstellen automatisiert
  abrufen und personalisierte Coupons nie als allgemein verfügbar ausgeben.

- App-Rabatt- und Security-Migrationen in der verbundenen Supabase-Instanz
  ausrollen und danach RLS/Spaltenrechte mit anon-, authenticated- und
  service-role-Szenarien prüfen.
- Weitere konkrete, lizenzsaubere Barcodes/Produktzuordnungen ergänzen. Drei
  Produkte sind verifiziert; die übrige Katalogabdeckung ist noch offen.
- Optional Filialdaten später in Supabase cachen, damit die Web-App nicht bei
  jeder PLZ-Änderung direkt Overpass abfragen muss.
- Native iOS-App auf einem Mac mit Xcode bauen oder später per TestFlight verteilen.
- Prüfstand Supabase 2026-08-27: 76 Produkte, 8.935 Beobachtungen, davon 7.452
  abgelaufen; neueste Beobachtung 2026-08-10. `requires_app` war remote noch
  nicht vorhanden. Das ist ein Datenqualitätsstatus, keine Live-Abdeckung.
