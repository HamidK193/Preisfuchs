# Katalog, Korrekturen und Pilotimport

Stand: 06.09.2026. Regeln und Import sind umgesetzt. Der
[BW-Pilot](PILOT_2026-09-06.md) enthält drei geprüfte Artikel mit sechs
veröffentlichten Beobachtungen und vier Einträgen in der aktuellen Preisview.

## Datenmodell

- `data/product_rules.json`: Pflichtmerkmale für alle 76 Seed-IDs sowie Regeln
  für Kinder Joy und Pokémon-Karten. Die beiden Erweiterungen sind noch keine
  befüllten Katalogartikel. Werte stammen nicht automatisch aus Seed-Namen.
- `catalog_articles`: konkreter Artikel mit stabiler UUID aus GTIN, ansonsten
  Quelle und Quellenartikel-ID. Händler, Preis und Beobachtungsdatum sind keine
  Bestandteile dieser Artikel-ID.
- `comparison_key`: nur für bestätigte Eigenmarken/unmarkierte Ware mit allen
  bekannten Pflichtmerkmalen. Bio unbekannt ist kein konventionelles Produkt.
  Herstellerartikel bleiben über die konkrete Artikel-ID vergleichbar.
- `package`: ursprünglicher Text, Menge je Einheit, Multipack-Anzahl und
  Gesamtinhalt. Basiseinheiten sind g, ml, Stück, Waschladungen, Rollen und Beutel.
  `2 × 250 g` und `500 g` bleiben verschiedene Verkaufspackungen.
- `price_observations`: stabile UUID aus Open-Prices-ID; Preisänderungen einer
  Quellenbeobachtung erzeugen keine neue Zeile. Händler und beobachteter Standort
  bleiben sichtbar. Verschiedene Filialen bilden keinen Ein-Laden-Warenkorb.

`purchase_for_need()` berechnet ganze Packungen und Übermenge in Cent: 750 g
Bedarf bei 500 g für 1,29 Euro ergeben zwei Packungen, 2,58 Euro und 250 g Rest.
Das ist eine getestete Backendfunktion. Der aktuelle Warenkorb zählt weiterhin
Verkaufspackungen; eine Bedienung für beliebigen Mengenbedarf steht noch aus.
Variable Gewichte, Abtropfgewicht und Pfand werden nicht still umgerechnet.

## Dauerhafte manuelle Korrektur

Der Import erzeugt `artifacts/latest-import.json` mit Laufbericht, Artikel-
Prüfliste und normalisierten Beobachtungen. Abgewiesene Quellenbeobachtungen
werden nach Ablehnungsgrund gezählt. Das lokale Artefakt ist nicht öffentlich.

Die versionierbare Datei `data/catalog_corrections.json` enthält bestätigte
Korrekturen. Drei belegte Einträge bestätigen Joghurt, Sonnenblumenöl und
Stadionbratwurst aus dem BW-Pilot; unbekannte Merkmale bleiben unbekannt.
Ein Eintrag benötigt `source`, `source_product_ref`, `action`, `reason`,
`reviewed_at` mit Zeitzone, `evidence_url` sowie `before` und `after`.
Die Quellenartikel-ID bleibt stabil, auch wenn sich ein Preis oder Titel ändert.

`replace` überschreibt nur erlaubte Artikelfelder (`product_id`, `name`,
`brand_name`, `brand_type`, `attributes`, `package_text`, `identity_verified`).
`isolate` hält einen Artikel dauerhaft aus Zusammenführungen heraus und setzt
ihn zur Prüfung. Quellenwerte bleiben zusätzlich in `automatic_values` erhalten.
Die angewendete Korrektur wird am Artikel gespeichert. GTIN, Preis, Quelle und
Veröffentlichungsrechte lassen sich mit einer Artikelkorrektur nicht ersetzen.

Für neue Korrekturen zuerst die Quellenmetadaten und den Beleg prüfen, alle
erforderlichen Merkmale ausdrücklich eintragen und einen Dry-run ausführen.
Eine grafische Adminoberfläche und eine automatische Konfliktvorschau bei
widersprüchlichen Quellenrevisionen sind noch nicht vorhanden.

## Import ausführen

```powershell
$env:PRICEFUCHS_DRY_RUN = '1'
uv --cache-dir .uv-cache run --python 3.12 --with-requirements backend/jobs/requirements.txt python backend/jobs/price_update_job.py
Remove-Item Env:PRICEFUCHS_DRY_RUN
```

Ohne Dry-run benötigt der Job Backend-Zugangsdaten und prüft zuerst das Schema.
Neue Beobachtungen sind privat. `PRICEFUCHS_PUBLISH_REVIEWED=true` erlaubt die
Veröffentlichung nur ohne offene Artikel-, Packungs- oder Rabattprüfung.
Ein späterer Lauf ohne diese Option erhält bereits zulässige Freigaben.
Wird dieselbe Quellen-ID nachweislich unzulässig, nimmt der Import ihre
Freigabe zurück. Abruffehler gelten nicht als Nachweis einer Quellenlöschung.
Die Datenbank begrenzt auch direkte öffentliche Tabellenabfragen auf bestätigte
Artikel, Packungspreise, Deutschland und belegtes Baden-Württemberg.
Preisbeobachtungen bleiben historische Angaben, keine Verfügbarkeitsgarantie.

Der Adapter prüft Quellen-ID, zugeordnete GTIN, EUR, endlichen Centpreis und
echtes Beobachtungsdatum. OSM-Shoptyp, Land, Bundesland und Händler müssen
passen. Er übernimmt keine Preise von Parkplätzen oder Aldi Nord. Das Feld
`price_per` ist bei Barcode-Artikeln vom Typ `PRODUCT` laut Upstream-Validator
absichtlich leer. Nach Artikel-/Packungsprüfung wird hier ein Packungspreis
übernommen. Gesetztes `price_per`, etwa `KILOGRAM`, ist für diesen Typ
widersprüchlich und wird abgewiesen. Rabattbedingungen werden nicht erraten.

Maximal zehn Seiten mit je 100 Treffern pro GTIN, zwei begrenzte Wiederholungen
bei temporären Fehlern. Ein überschrittenes Seitenbudget verwirft den gesamten
Barcodeabruf. Laufstatus: `succeeded`, `partial`, `failed`, `no_data`.
Teilfehler führen zu einem fehlgeschlagenen CI-Schritt und bleiben im Bericht
sichtbar. Der geplante Workflow schreibt die Kennzahlen in die Job-Zusammenfassung.

Geprüfte Grundlage: [Open-Prices-API](https://prices.openfoodfacts.org/api/docs)
und deren [OpenAPI-Schema](https://prices.openfoodfacts.org/api/schema) sowie der
[Preisvalidator](https://github.com/openfoodfacts/open-prices/blob/main/open_prices/prices/validators.py).

## Rollout und belegter Stand

Preisfuchs `eanggjsdpjjskqycvknx` wurde wieder aufgenommen. Vor dem Rollout wurden
76 Produkte, fünf Händler und sämtliche 8.935 Beobachtungen lokal exportiert,
mit Anzahl, eindeutigen IDs und SHA-256 geprüft. Keine Filial- oder Importlauf-
Datensätze waren vorhanden. Lokale Sicherung:
`artifacts/supabase-backup-20260905T180019Z/`.

Vier vorbereitete Migrationen und zwei Katalogmigrationen wurden remote
ausgeführt. Die zuvor manuell vorhandene Initialstruktur ist als Baseline
registriert; die vom Connector vergebenen Zeitstempel wurden den tatsächlichen
lokalen Migrationsversionen zugeordnet. Sieben Einträge stimmen jetzt überein.
Die ursprünglichen Connectorversionen und der Abgleich stehen im lokalen
Sicherungsordner. Ein `db reset` wurde nicht ausgeführt.

Alle 8.935 Altbeobachtungen stammen aus kaufDA mit unbekannter Lizenz und sind
weiterhin gespeichert, aber nicht öffentlich. 7.514 waren am Prüftag abgelaufen;
neueste Beobachtung: 10.08.2026. Der erste Pilot am 05.09. fragte drei GTINs ab:
sieben Treffer, davon sechs außerhalb/bezüglich BW unbelegt und einer an einem
Parkhaus. Ergebnis: **0 importiert, 0 veröffentlicht**, Status `no_data`.
Am 06.09. wurden nach gezielter BW-Suche drei weitere GTINs geprüft. Sechs von
13 Treffern erfüllten die Importregeln und wurden veröffentlicht. Nach Reimport:
8.941 Beobachtungen insgesamt, sechs öffentlich, vier View-Einträge, drei
bestätigte Artikel und keine doppelten Quellen-IDs. Die Preise sind historische
Beobachtungen vom 02.06. bis 22.08.2026. [Pilotbericht](PILOT_2026-09-06.md).

`supabase/tests/catalog_roles.sql` prüft echte SELECT-/UPDATE-Zugriffe mit
`anon`, `authenticated` und `service_role` in einer zurückgerollten Transaktion.
Private Preise, interne Rohdaten und Prüfinformationen bleiben gesperrt;
unbestätigte Artikel bleiben selbst bei gesetztem `is_public` verborgen.
Der separate API-Smoke-Test akzeptiert nur den konkreten PostgreSQL-Rechtefehler
`42501` als erfolgreichen Negativtest, keine beliebigen Netzwerkfehler.
Das ist ein SQL-Rollentest, kein neu angelegter Benutzer mit Auth-Login.

Supabase meldet nur den erwarteten INFO-Hinweis auf RLS ohne Client-Policy bei
`update_runs`; diese Tabelle ist ausschließlich für das Backend bestimmt.
[Erklärung des Hinweises](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Supabase CLI 2.116.0 wurde über `npx` verwendet. Docker/psql sind lokal nicht
vorhanden; ein kompletter Neuaufbau mit lokalem Supabase und pgTAP wurde deshalb
nicht ausgeführt. Remote-DDL, Rollenprüfungen und API-Zugriff sind separat geprüft.

## Nächste Arbeit

Aktuellere BW-Beobachtungen und weitere Artikel kategorieweise ergänzen.
Der erste geprüfte Packshot ist dem konkreten 500-ml-Sonnenblumenöl zugeordnet;
Artikel-ID, numerische Packung, Herkunft und Lizenz stehen in
`data/article_images.json`. Quelle und Lizenz erscheinen auch im Warenkorb.
Die übrigen neuen Artikel verwenden gekennzeichnete Symbolbilder.
Der frühere Demo-Bildbestand benötigt noch eine vollständige Prüfung.
Non-Food-Daten, Adminoberfläche, Bedarfsbedienung und Mac-/Xcode-Prüfung bleiben
eigene nachfolgende Arbeitspakete. kaufDA bleibt als Produktionsquelle gesperrt.
