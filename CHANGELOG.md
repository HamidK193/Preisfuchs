# Changelog

## Unreleased

- App (`mobile/`): Familie & Gruppen. Optionales Konto per E-Mail-Code (Supabase Auth,
  Sitzung bleibt auf dem Gerät), Konto löschen. Gruppen (Familie/WG/Freunde, max. 6)
  erstellen, per 8-stelligem Code (7 Tage gültig) einladen und beitreten, verlassen.
  Eigene Listen mit der Gruppe teilen; gemeinsame Listen werden live abgeglichen
  (Supabase Realtime) und zeigen „von …“/„abgehakt …“ sowie den letzten Abgleich.
  Schema in `backend/supabase/households.sql` (RLS, RPC-Funktionen). Datenschutztext ergänzt.

- App (`mobile/`): Mehrere Einkaufslisten („Meine Listen“, neu/umbenennen/löschen, Symbol);
  der Warenkorb zeigt die aktive Liste, alter Warenkorb wird zur Liste „Wocheneinkauf“.
  Liste teilen als Text oder als Link (`preisfuchs://liste?...`), der in Preisfuchs als
  eigene Kopie übernommen wird (kein Live-Abgleich; Mitglieder kommen mit Familie &
  Gruppen). „Einkauf abgeschlossen“ nach dem Einkaufsmodus mit geschätzter Summe und
  Ersparnis (Vergleich zum Durchschnitt der aktiven Märkte, als Schätzung gekennzeichnet);
  Profil zeigt die geschätzte Monatsersparnis. Leerer Warenkorb mit Vorschlägen und Scanner.
  Benachrichtigungs-Inbox (Glocke auf Start, Profil): erreichte Wunschpreise und
  Wochenangebote, gelesen/ungelesen, lange drücken entfernt; kein Push.
  Typecheck, Lint, expo-doctor (21/21) und iOS-Bundle bestanden; nicht auf dem iPhone getestet.

- App (`mobile/`): Onboarding beim ersten Start (3 Intro-Seiten, Datenschutz-Einwilligung
  mit gleichwertigem Ablehnen/Akzeptieren, Standort, Lieblingsmärkte, Mitteilungen);
  bestehende Nutzer mit Standort überspringen es. Barcode-Scanner (`expo-camera`, EAN-8/13,
  UPC) mit manueller Eingabe und „Kein Treffer“-Zustand; Scan-Button auf Start und in der
  Suche. Suche mit „Zuletzt gesucht“, „Beliebt“, Filter-Sheet (Sortierung Grundpreis/Preis/
  Rabatt, Nur Angebote, Nur Bio, Märkte) und „Meintest du …“ bei keinem Treffer.
  Systemzustände: Fehler-Screen (Router-ErrorBoundary), echte Preise werden lokal
  zwischengespeichert und ohne Verbindung mit Datum angezeigt („Erneut laden“).
  Typecheck, Lint, expo-doctor (21/21) und iOS-Bundle bestanden; noch nicht auf dem
  iPhone getestet.

- Echte Preise für ganz Deutschland: `open_prices_de_agent.py` holt täglich alle
  neuen deutschen Open-Prices-Beobachtungen (kein Serverfilter vorhanden, daher
  Cursor über alle Preise). Jede GTIN wird ein eigenes Produkt (`gtin_<EAN>`,
  Kategorie aus Open Food Facts). Automatische Prüfung: Produkt in Open Food Facts,
  Menge eindeutig, plausibler Grundpreis, nur echte Geschäfte, höchstens 90 Tage alt.
  kaufDA dient nur als interner letzter Check (starke Abweichung -> intern zur
  Prüfung), nie als angezeigter Preis. Erster Lauf (60 Tage): 1.439 importiert,
  1.109 öffentlich zu 1.059 Artikeln, 13 Bundesländer (vorher 4 Preise).
- Preismeldungen ohne Konto: Tabelle `price_reports`, privater Bucket
  `price-report-photos`, Edge Function `report-price` (Validierung, Rate-Limit
  3/Minute und 20/Tag je Gerät und IP, nur gesalzene Hashes). Veröffentlichung nach
  zweiter übereinstimmender Meldung von anderem Gerät und anderer IP oder mit
  plausiblem Belegfoto. Live getestet, Testdaten entfernt.
- Web-App lädt Filialen im PLZ-Umkreis jetzt aus Supabase (26.300 Filialen,
  wöchentlich aus OpenStreetMap); Live-Overpass nur noch als Ausweichweg.
  Aldi Nord wird nicht mehr als Aldi Süd erkannt. 36 Webtests und Build bestanden.
- Wöchentliche Daten-Agents (`.github/workflows/weekly-data-agents.yml`, montags
  02:00 UTC), ein Job pro Quelle: `osm_stores_agent.py` lädt Filialen von 16
  Ketten in allen 16 Bundesländern mit Adresse, Koordinaten und Öffnungszeiten
  (ODbL); `off_products_agent.py` lädt Name, Marke, Menge, Nährwerte, Labels und
  Frontbild je GTIN aus Open Food Facts (Bilder bleiben bis zur Prüfung
  `image_reviewed = false`). Schema um `stores.opening_hours/is_active/last_seen_at`,
  neue Ketten und `off_products` erweitert. Open Prices bleibt täglich.
  kaufDA bleibt gesperrt. Probelauf: Bremen 188 Filialen, 6/6 GTINs.
  Migration in Supabase eingespielt. Erster Volllauf: 26.300 Filialen in allen
  16 Bundesländern (davon ca. 94 % mit Öffnungszeiten), 6 Produkte aus Open Food Facts.
  Neue Tabelle `retailer_offers` und Agent
  `retailer_offers_agent.py` (Rewe-Adapter, robots.txt-Prüfung, ehrliche Quelle);
  noch nicht geplant, weil Händlerseiten automatische Abrufe derzeit blocken.
- Design-Konzept in Google Stitch erstellt (Projekt "Preisfuchs Grocery Comparison
  App", 04.10.2026): alle App-Seiten inkl. Onboarding, Suche, Produkt, Warenkorb,
  Favoriten, Profil, Systemzustaende und Monetarisierung. Ausrichtung jetzt
  deutschlandweit. Screen-Plan in `docs/APP_SCREENS_PLAN.md`, Umsatzmodell
  (Plus-Abo, markierte Anzeigen, Partnerlinks) in `docs/MONETARISIERUNG.md`.
  Noch nicht programmiert.
- Neue App in `mobile/` (Expo SDK 57, Expo Router, Plus Jakarta Sans) mit Demo-Daten:
  Start, Suche, Produktdetail als Sheet, Warenkorb mit Marktvergleich und Aufteilen
  auf 2 Maerkte, Favoriten, Profil. Testbar auf dem iPhone ueber Expo Go.
  Typecheck, Lint und expo-doctor bestanden; iOS-Bundle baut.
- App-Design nach erstem iPhone-Test: SF-Pro-Systemschrift, weißer Hintergrund,
  echte Händlerlogos (Wikimedia Commons, siehe `THIRD_PARTY_NOTICES.md`),
  Eckenradius 5 px, gestaffelte Innenabstände (`Inset` in `mobile/src/constants/theme.ts`),
  SF Symbols statt Emoji-Icons, Angebotswoche als Datumsbereich statt Kalenderwoche
  und neu gestaltete Profilseite (Kopfkarte, Kennzahlen, Plus-Karte, gruppierte
  Einstellungen).
- Unterseiten der App nach `docs/APP_UNTERSEITEN_PLAN.md` umgesetzt: ausgebautes
  Produkt-Sheet (Bestpreis, alle Märkte inkl. „kein Preis bekannt“, Preisverlauf,
  Produktinfos, Alternativen), Preisalarm-Sheet (3 kostenlos), Standort & Radius
  (mit GPS-PLZ), Meine Märkte, Markt-Detail, Mitteilungen, Datenschutz & Werbung,
  Datenquellen, Hilfe & Feedback, Rechtliches, Konto-Sheet, Plus, Alle Angebote,
  Kategorie, Marktvergleich. Preisvergleich nutzt nur aktive Märkte; Einstellungen
  werden lokal gespeichert. Leeres Produkt-Sheet behoben (formSheet ohne Höhe).
  Rechtstexte und Kontaktadresse sind Platzhalter für die Testversion.
- Farbschema „Fuchsrot“ (`docs/FARBSCHEMA.md`, Variante A nach Stitch-Vergleich):
  Rot für Marke und Angebote, Grün nur für Ersparnis, schwarze Auswahl-Chips.
- Standort: beim ersten Start sofort Standortabfrage, sonst Adresseingabe; Märkte
  werden per OpenStreetMap (Overpass) am genauen Standort gesucht und ersetzen die
  Tübinger Beispielmärkte. Karte mit Apple Maps, Radius und Logo-Markern
  (Google Maps vorbereitet, braucht eigenen App-Build mit API-Schlüssel).
- Einheitliche Logo-Quadrate, Produkt-Sheet mit ScreenContentWrapper gegen leeren
  Inhalt, Warenkorb mit Rangliste und neuem Einkaufsmodus.
- Supabase-Anbindung der App (`mobile/src/lib/supabase.ts`, anon-Key in
  `mobile/.env.local`): Filialen aus `stores` (26.300 aktive, OSM-Import) statt
  Overpass live (Overpass bleibt Fallback); neue Ketten Aldi Nord, Netto, Norma.
  Echte Preise aus `current_price_observations` mit Quelle, Ort, Beleg-Link und
  Hinweis „möglicherweise veraltet“ (älter als 30 Tage); übrige Preise bleiben
  als Demo markiert.
- Migration `open_public_prices_germany`: öffentliche Preis-Policy und View ohne
  BW-Filter (deutschlandweit); in `backend/supabase/schema.sql` angehängt.
- BW-Pilot vom 06.09.2026 veröffentlicht: drei geprüfte Artikel mit sechs
  Open-Prices-Beobachtungen; vier Artikel-/Standorteinträge in der öffentlichen
  View. Preise vom 02.06. bis 22.08. werden als möglicherweise veraltet gezeigt.
- Barcode-Preisadapter an den offiziellen Vertrag angepasst: `PRODUCT` hat
  leeres `price_per`; widersprüchliche Preisbasis und ungeklärte Rabatte bleiben
  ausgeschlossen. Begrenzte BW-Kandidatensuche als separates Leseskript ergänzt.
- Drei belegte Artikelkorrekturen hinterlegt. Wiederholter Import erhält ihre
  Werte und bestehende zulässige Freigaben; nachweislich unzulässige Quellen-IDs
  werden zurückgezogen. 8.941 Beobachtungen nach Reimport, keine doppelten IDs.
- Geprüftes Öl-Frontfoto mit fester Artikel-/Packungszuordnung und sichtbarer
  CC-BY-SA-Attribution lokal eingebunden. Preisquellen führen direkt zum Beleg.
- Prüfstand vom 06.09.: 33 Webtests, 19 Backendtests, Build, echte öffentliche
  API und Browserfluss bei vier Breiten bestanden. Vite meldet eine Größenwarnung
  für das etwa 501-kB-JavaScript-Bündel. Pilotbericht und nächste Schritte ergänzt.

- Supabase wieder aufgenommen, alle 8.935 Altbeobachtungen lokal gesichert und
  sechs Erweiterungsmigrationen ausgerollt. Migrationshistorie abgeglichen;
  alte kaufDA-Daten erhalten und wegen ungeklärter Lizenz intern gehalten.
- Strukturierte Pflichtmerkmale für alle 76 Produktarten, globale Artikel-IDs,
  numerische Packungen, Cent-/Bedarfsrechnung und dauerhafte Korrekturen ergänzt.
  Titelähnlichkeit allein gibt keine Eigenmarken-Zusammenführung mehr frei.
- Open-Prices-Import prüft Datum, Quellen-ID, Preisbasis, GTIN, OSM-Shoptyp,
  Händler und BW-Bezug; Seitenbudget, Wiederholungen, Prüfliste und Laufstatus
  ergänzt. Erster Pilot am 05.09.: drei GTINs, sieben unpassende Treffer,
  keine Veröffentlichung.
- Web nutzt ausschließlich die geprüfte Preisview und übernimmt beobachtete
  Standorte. Unterschiedliche Filialen werden nicht als Ein-Laden-Einkauf
  kombiniert. Neue strukturierte Artikel erhalten gekennzeichnete Symbolbilder.
- Remote-Prüfung für anon/authenticated/service_role mit zurückgerollten
  Testeinträgen bestanden. API-Negativtests prüfen konkrete Rechtefehler.
- Prüfstand dieser Erweiterung: 32 Webtests, 17 Backendtests, Webbuild und
  Browsercheck einschließlich strukturiertem Katalogfixture erfolgreich.

- Wiedereinstieg vom 05.09.2026 geprüft: claude-mem weiterhin deaktiviert,
  lokale Web-/Backendtests und Build erfolgreich; Supabase-Projekt inaktiv.
  Keine Behauptung einer dauerhaft behobenen Hook-Ursache.
- Ausführlichen Gesamtplan sowie Merkmalmatrix für alle 76 Seed-Produktarten
  und geplante Kinder-Joy-/Pokémon-Erweiterungen ergänzt.
- Neue Webgestaltung für Desktop und Mobil mit Einkaufszettel-Einstieg,
  sichtbarem Demo-/Beobachtungsstatus, Händlerabdeckung und Quellen/Datum an
  Produktkarten. Unbelegte Wochenangebotswerbung entfernt.
- Wirkungslose Filter entfernt; Produkte mit Preisbeobachtung sind auswählbar.
  „Einkauf vergleichen“ ersetzt die bisherige Kassenbezeichnung; personalisierte
  Coupons können auch mobil separat ein- und ausgeschaltet werden.
- Eigenmarken nur bei passender vollständiger Beschreibung zusammengeführt;
  unbekannte Marken sowie abweichende Bio-/Fettstufen als ungeprüfte Varianten
  erhalten. Markenerkennung verwendet Wortgrenzen, Multipacks bleiben vollständig.
- Bananen-Süßigkeiten und Schoko-Bananen als Süßigkeiten eingeordnet;
  Kategorien erkennen vollständige Wörter statt etwa „Eis“ innerhalb von „Reis“.
- Reproduzierbaren Playwright-/Edge-Check mit vier Bildschirmbreiten und
  Warenkorbfluss ergänzt; eigener Vite-Prozess wird unter Windows beendet.

- Reguläre, öffentliche App- und personalisierte Preise werden je Händler
  getrennt auf Aktualität geprüft; danach gewinnt die günstigste aktivierte
  Preisart. Bei Gleichstand wird die Variante ohne App-Bedingung bevorzugt.
- Erfundenen Rabatt-Prozentwert aus Angebotskarten entfernt. Ohne beobachteten
  Normalpreis zeigt die App keine rechnerische Ersparnis an.
- Warenkorbvergleich zeigt die echte Differenz zwischen Ein-Laden-Einkauf und
  Mehr-Läden-Aufteilung sowie den Hinweis, dass Fahrtkosten und Zeit fehlen.
- Standortanzeige nutzt den zur PLZ ermittelten Ort statt fest „Stuttgart“,
  meldet den Lookup-Status sichtbar und akzeptiert nur vollständige 5-stellige
  deutsche Postleitzahlen.
- Entfernte Warenkorbartikel können 6 Sekunden lang rückgängig gemacht werden;
  mobile Rabattbox und Such-/Standortleiste wurden gegen Überbreite gehärtet.
- Native iOS-Einkaufsliste um Ein-Laden-vs.-Mehr-Läden-Vergleich und getrennte
  Opt-ins für öffentliche App-Rabatte und personalisierte Coupons ergänzt.
- Drei Produktbarcodes über Open Food Facts verifiziert. Der Open-Prices-Dry-Run
  normalisiert damit 4 offen lizenzierte, aber klar veraltete Beobachtungen.
- Nicht passende Packshots für Barilla, Backpulver und Senf entfernt und den
  Seed-Katalog um GTIN-Prüfsumme, Eindeutigkeits- und Pflichtfeldtests gehärtet.
- Supabase-Smoke-Test prüft nun Rabatt-/Publikationsschema, aktuelle View sowie
  den gesperrten anon-Zugriff auf Rohpayloads und interne Update-Läufe.
- Data-API-Rechte für `service_role` explizit gemacht, direkte npm-Versionen
  gepinnt und eine restriktive Basis-CSP für die Web-App ergänzt.
- Unbegrenzte parallele Open-Food-Facts-Bildsuche entfernt: standardmäßig aus,
  optionales Entwicklungs-Opt-in mit höchstens 4 Suchen pro Ladevorgang.
- Preisvergleich korrigiert: pro Händler zählt die neueste aktive Beobachtung
  statt des historischen Tiefstpreises; abgelaufene und zukünftige Angebote
  werden ausgeschlossen.
- Fehlende Preise werden in Ein-Laden- und Mehr-Läden-Plänen als fehlend
  ausgewiesen. Unvollständige Summen heißen Teilsumme und können nicht mehr
  künstlich als günstigster kompletter Warenkorb erscheinen.
- Web-Warenkorb startet leer, bleibt lokal gespeichert und kann als validierter
  Link geteilt und wieder geöffnet werden.
- App-Rabatte standardmäßig deaktiviert; personalisierte Coupons besitzen ein
  separates ausdrückliches Opt-in. Erfundenes `Gültig bis` wurde entfernt.
- Native iOS-Liste um Mengen, Teilsummenhinweis und ShareLink ergänzt; iOS nutzt
  dieselbe Aktualitäts- und Rabattlogik wie die Web-App.
- Supabase-Zugriff gehärtet: RLS für `update_runs`, explizite Spaltenrechte,
  kein Browserzugriff auf Rohpayloads und private Standardrechte für neue
  Tabellen.
- RLS-respektierende Supabase-View für aktive neueste Preisbeobachtungen
  ergänzt, damit der Browser nicht mehr die vollständige Historie laden muss.
- Veröffentlichungs-Gate für Preisquellen ergänzt: neue Beobachtungen bleiben
  standardmäßig intern, nur lizenzgeprüfte Quellen werden per RLS publiziert.
- Täglichen Import auf Open Prices als Standardquelle begrenzt; ungeklärter
  kaufDA-HTML-Import ist deaktiviert. Update-Läufe und Importstatus werden
  protokolliert, Open-Prices-Zeilen plausibilisiert.
- GitHub Actions mit minimalen Rechten und vollständigen Commit-SHAs gehärtet;
  Web-Testworkflow, Dependabot und `SECURITY.md` ergänzt.
- Vitest- und Python-Regressionstests ergänzt; npm-Abhängigkeiten geprüft und
  alle gefundenen Audit-Warnungen durch kompatible Updates behoben.
- Recherche zu GitHub-Repositories, Skills, Reddit-/X-Erfahrungen, Tokenkosten,
  Memory, Security und Datenquellen in `docs/RESEARCH_REPOS_SKILLS.md`
  dokumentiert.
- App-exklusive Preise als eigene bedingte Preisart ergänzt: Web-Vergleich mit
  und ohne App-Rabatte, sichtbare App-/Aktivierungs-/Personalisierungshinweise,
  Warenkorbwarnung sowie entsprechende SwiftUI-Darstellung.
- Supabase-Preisbeobachtungen um App-Name, Coupon-Aktivierung,
  Personalisierung, Normalpreis, Gültigkeitsbeginn und Rabattbeschreibung
  erweitert; kaufDA-Treffer werden nur bei eindeutigen App-Markern als
  App-Rabatt klassifiziert.

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
