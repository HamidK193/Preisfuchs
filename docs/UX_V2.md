# UX v2 – Konzept nach Mobbin-Vorbildern

Stand: 28.11.2026. Anlass: Nutzer-Feedback zur ersten App: Navigation sehr schlecht, zu wenige
Produkte, keine echten Bilder. Gilt für die SwiftUI-App (`ios/`) und die Expo-App (`mobile/`).
App-Name in neuen UI-Texten: „Korbwert“ (entschieden am 28.11.2026).

## (a) Kurzskizze

```
Ziel:  In 10 Sekunden vom Öffnen zum günstigsten Markt für ein Produkt – mit Bild, Preis, Quelle, Datum.
Aufbau (Tab-Leiste: Start | Suche | Angebote | Liste | Profil; Favoriten wandern in Liste/Profil)
 ┌───────────────────────────────┐
 │ 📍 PLZ Ort · 10 km  ⌄    🔔   │  Standort immer oben, tippbar
 │ [🔍 Produkt oder Marke suchen]│  Suche ist das Erste
 │ (Bild)(Bild)(Bild)(Bild) ►    │  runde Kategorien mit Foto
 │ Angebote der Woche      Alle  │  Produktkarten: Bild, Preis, Markt, Stand
 │ [Bild][Bild][Bild] ►          │
 │ Günstig in deiner Nähe        │  Markt-Chips + Raster
 ├───────────────────────────────┤
 │ Start  Suche  Angebote  Liste  Profil │
 └───────────────────────────────┘
Ton:   ruhig, klar, weißer Grund, Rot nur für Angebote/Aktionen, Grün nur für „gespart“; „Beobachtung“ statt „aktuell“.
Muss:  Suche zuerst; Bild an jedem Produkt; Produkt als Bottom-Sheet mit Preisliste je Markt; Quelle + Datum an jedem Preis; ≥ 500 Produkte.
Weglassen: Konto-Zwang, Bestellen/Lieferung, Rezepte, Live-Preise, gekaufte Platzierungen in der Rangliste.
```

## Mobbin: was erreichbar war

Mobbin ließ sich im Browser öffnen (Nutzer angemeldet, aber ohne Pro). Der Free-Zugang zeigt je App nur
die ersten 3 Screens, der Rest hinter „Get Pro“; nichts angeklickt, was kaufen/abonnieren löst. Gesichtet:
Gopuff, Wolt, Instacart (je 3 Screens). DoorDash und Target stammen aus `docs/FARBSCHEMA.md` (frühere
Sichtung). Lidl Plus, REWE, Too Good To Go, Bring! wurden hier **nicht** gesichtet (Pro-Sperre, Seitenbudget);
dort sind nur Muster aus allgemeinem Wissen eingetragen und als „(Wissen)“ markiert. Keine Mobbin-Bilder im Repo.

Gesichtete Muster:
- **Gopuff**: Kopf mit Adresse + Lieferzeit, Suchfeld „Search gopuff + Marke“, runde Kategorie-Bilder,
  Banner, „Deals for all · 300 items“ als Karten (Foto, Name, Preis, roter „sale“-Badge, Plus-Button).
  Tab-Leiste: Home, Browse, Deals, My Cart, Account.
- **Wolt**: Stadt oben, Bell rechts, Kategorie-Kacheln mit Foto, Banner-Karussell, Abschnitte „Offers near you“ /
  „Brands you love“ mit „See all“, **Sponsored** klein an der Karte markiert, schwebender Pill-Button „Search“.
- **Instacart**: Adresse oben, Suchfeld „Search products, stores, recipes“, Filter-Chips (Offers, Pickup …),
  Markt-Logos als Raster. **Suchergebnisse nach Markt gruppiert**: je Markt eine Zeile mit Logo,
  Entfernung, dann horizontale Produktkarten mit Preis; Badge „Great price“ am günstigen Artikel.
  Das ist genau das Preisvergleichs-Muster, das wir brauchen.

## (b) Navigationsstruktur und Screenliste

Tab-Leiste, 5 Tabs, Reihenfolge nach Nutzungshäufigkeit: **Start, Suche, Angebote, Liste, Profil.**
Standort, Benachrichtigungen, Scanner sind Kopfbereich-Aktionen, keine Tabs. Favoriten = Herz auf
Karte, Liste im Tab „Liste“ (Segment „Einkauf | Favoriten“). Profil enthält Einstellungen, Datenquellen, Konto.

| Screen | Übernommenes Muster | Referenz |
|---|---|---|
| Start | Standort-Chip + Suchfeld oben, runde Foto-Kategorien, Karten-Slider „Angebote“, „Günstig in der Nähe“ | Gopuff, Wolt |
| Suche (leer) | Suchfeld fokussiert, Verlauf, beliebte Begriffe als Chips, Kategorie-Raster mit Foto | Instacart, Wolt (Wissen) |
| Suchvorschläge | Live-Liste beim Tippen: Produktname mit Mini-Bild, Treffer-Hervorhebung | Instacart (Wissen) |
| Suchergebnisse | Gruppiert nach Produkt; je Produkt Foto, Name, Packung, günstigster Markt, Grundpreis; Filter-Chips oben | Instacart |
| Filter-Sheet | Bottom-Sheet: Märkte, Sortierung (Preis/Grundpreis/Entfernung), Bio, Eigenmarke, Angebote; „X Ergebnisse zeigen“ | DoorDash (Wissen) |
| Produkt-Sheet | Bottom-Sheet 60 %/100 %: großes Foto, Name, Preisliste je Markt (Logo, Preis, Grundpreis, Entfernung, Quelle, Stand), Badge „Günstigster“, Liste-Button fest unten | Gopuff, Instacart |
| Preisverlauf / Alarm | Sheet aus dem Produkt-Sheet | Eigenes Muster |
| Angebote (Tab) | Wochenlabel, Markt-Chips, Raster mit rotem Rabatt-Badge | Gopuff Deals, Target |
| Kategorie | Kopf mit Foto, Unterkategorie-Chips, Raster | Wolt, Gopuff Browse |
| Markt-Detail | Logo, Entfernung, Öffnungszeiten, Angebote dieses Markts | Wolt |
| Standort/PLZ-Sheet | PLZ-Feld + „Standort verwenden“, Radius-Slider, Kartenvorschau | Wolt, Instacart |
| Liste (Tab) | Segment Einkauf/Favoriten, Summe je Markt als „geschätzt“, „Günstigster Markt für die Liste“ | Bring! (Wissen), Instacart |
| Onboarding | 3 Schritte: Nutzen, PLZ/Standort, optional Märkte; überspringbar; kein Login | Gopuff, Too Good To Go (Wissen) |
| Laden | Skeleton-Karten mit Bildplatzhalter, kein Spinner allein | alle |
| Leer / Kein Treffer | Illustration + ein Satz + eine Aktion („Anderen Begriff versuchen“, „Produkt vorschlagen“) | Wolt (Wissen) |
| Offline/Fehler | Letzte Daten mit Datum + „Erneut versuchen“ | eigenes Muster |
| Profil | Standort, Märkte, Mitteilungen, Darstellung, Datenquellen, Rechtliches, Konto optional | Gopuff Account |

Pflichtregeln für alle Screens (aus `AGENTS.md`):
- Jede Preiszeile zeigt Quelle und „Stand: TT.MM.JJJJ“. Preise > 30 Tage: „möglicherweise veraltet“.
- Wörter „Live“, „Echtzeit“, „verifiziert“ kommen nicht vor; Hinweis „Beobachtung“ im Produkt-Sheet.
- Rangliste nach Preis ist nie käuflich. Werbung trägt „Anzeige“, Partnerlinks „Partnerlink“; sie stehen
  nur in eigenen Slots (z. B. 1 Slot im Start-Slider), nie innerhalb der Preisliste oder Sortierung (Wolt zeigt
  „Sponsored“ in der Liste – das übernehmen wir bewusst nicht).
- Texte nutzen „‹App-Name›“ statt des alten Namens.

## (c) Problemliste der jetzigen Apps

Die Nutzer-Kritik „Navigation“, „zu wenige Produkte“, „keine echten Bilder“ lässt sich so belegen.

SwiftUI (`ios/Preisfuchs/App/`):
1. `RootTabView.swift:8-33` – Tabs „Start“ und „Suche“ sind fast identisch (beide Suchfeld + Produktliste, Zeilen 51 und 106); der Nutzer weiß nicht, wo er suchen soll.
2. `RootTabView.swift:75-88` – Startseite ist eine flache Liste aller Produkte, nur `prefix(30)`; keine Kategorien, keine Angebote, kein Slider.
3. `RootTabView.swift:115-117` – Suchergebnisse ohne Gruppierung, ohne Filter und ohne Sortierung; kein Verlauf, keine Vorschläge (`PriceListModel.swift:23-31`: reiner `contains`-Filter).
4. `RootTabView.swift:115-117, 143` – Zeile öffnet nichts: kein `NavigationLink`, kein Produkt-Detail/Bottom-Sheet; die Preise je Markt sind nur als Top 3 in der Karte (`:108-110`) sichtbar.
5. `RootTabView.swift:115, 207, 211` – keine Bilder: nur SF-Symbol (`symbolName`, `PriceModels.swift:81`); `GroceryProduct` hat kein Bildfeld, obwohl `data/article_images.json` Open-Food-Facts-Bilder liefert.
6. Kein Standort/PLZ-Wahl und keine Entfernung (nur Text in `PriceObservationRow`, `:174`); AGENTS.md verlangt PLZ + Radius.
7. `RootTabView.swift:22, 27` – Einkaufsliste und Favoriten sind zwei getrennte Tabs, beide meist leer (`:136`, `:14` Leerzustände ohne Aktion); Liste hat keine Summe je Markt.
8. `RootTabView.swift:32, 200-214` – Profil ist nur Debug-Info („Modus“, „Produkte“); keine Einstellungen, keine Datenquellen-Seite.
9. `PriceListModel.swift:15-16` – Favoriten/Einkaufsliste nur im Speicher, gehen beim Beenden verloren.
10. `RootTabView.swift:53-59` – Demo-Hinweis nur auf Start; auf Suche/Liste fehlt er (Regel „keine Live-Genauigkeit“ nicht überall sichtbar).
11. `RootTabView.swift:45, 95, 200` – Titel und `Über Korbwert` verwenden den beschlossenen App-Namen Korbwert.

Expo (`mobile/src/`):
12. `app/(tabs)/_layout.tsx:11-31` – 5 Tabs mit Favoriten als eigenem Tab; Angebote nur als Unterseite (Route `angebote`, `app/_layout.tsx`), also zwei Taps weg.
13. `app/(tabs)/index.tsx:15-150` – Startseite ist überladen: Logo, Glocke, Standort, Gruß, Suchfeld, Scanner, Chips, Angebotsbanner, Kategorien, Slider, Listenkarte (150+ Zeilen, ~10 Blöcke), kein klarer Einstiegspunkt.
14. `app/(tabs)/index.tsx:75-93` – das „Suchfeld“ ist ein Link auf `/suche` (kein echtes Feld): ein Extra-Tap und Tastatur erscheint erst danach.
15. `data/products.ts:55-62` – nur 25 Demo-Produkte; Bilder sind Unsplash-Fotos (Stimmungsbilder), keine echten Packungsfotos; `data/standard_products.json` hat 76 Einträge, nutzt aber die App nicht.
16. `app/(tabs)/suche.tsx:14-20` – Suche nur über 25 lokale Produkte; „Meintest du“ ersetzt keine echte Katalogsuche.
17. `app/_layout.tsx:65-72` – Onboarding und Standortabfrage blockieren die App vollständig; 2 Vorschaltseiten vor dem ersten Produkt.
18. `app/_layout.tsx:77-88` – rund 30 Routen, viele Sheets mit festen Höhen (`sheetOptions`, Zeile 38-47); Navigationsstruktur ohne klaren Hauptpfad.
19. Beide Apps: Märkte/Preise sind Demo-Daten; „Quelle + Datum“ ist nur teilweise einheitlich dargestellt.

## (d) Umsetzungsaufgaben

Legende: **[F]** einfache Fleißarbeit (für lokale KI geeignet) · **[K]** Kernlogik (Claude/Codex).
Jede Aufgabe höchstens ½ Tag.

### Daten (gemeinsam, beide Apps)

| # | Aufgabe | Abnahme | Art |
|---|---|---|---|
| D1 | `data/standard_products.json` auf ≥ 500 Produkte erweitern (Kategorie, Marke, Packung, EAN wo bekannt) | JSON-Schema-Test grün; je Kategorie ≥ 20 Produkte | F |
| D2 | Bild-Zuordnung aus Open Food Facts (`data/article_images.json`) auf alle Produkte mit EAN ausdehnen; Lizenz/Quelle je Bild | ≥ 80 % der Produkte haben `image_url` + `source_page`; Rest bekommt Kategorie-Platzhalter | K |
| D3 | Demo-Preise je Produkt in ≥ 4 Märkten mit Quelle und Datum generieren | Jedes Produkt: ≥ 3 Preise, jede Zeile mit `source` und `observed_at` | F |
| D4 | Zentrale Textdatei für App-Name (‹App-Name›) | Keine harte Kodierung des alten Namens in UI-Dateien (grep-Test) | F |

### SwiftUI

| # | Aufgabe | Abnahme | Art |
|---|---|---|---|
| S1 | `RootTabView` auf Tabs Start/Suche/Angebote/Liste/Profil umbauen, Views in eigene Dateien | 5 Tabs sichtbar, Build grün, UI-Test „Tab wechselt“ | K |
| S2 | `GroceryProduct` um `imageURL` erweitern, `AsyncImage` mit Platzhalter und Cache in `ProductImage` | Bild erscheint; ohne Netz Symbol-Platzhalter; Unit-Test fürs Dekodieren | K |
| S3 | Startseite neu: Standort-Chip, Suchfeld, runde Kategorien, Angebote-Slider | Screenshot-Test; alle Karten mit Quelle + Datum | K |
| S4 | `ProductCard` (Bild, Name, Packung, günstigster Markt, Preis, Grundpreis, Badge) | Vorschau; Quelle/Datum sichtbar (Snapshot) | F |
| S5 | Produkt-Bottom-Sheet (`presentationDetents` 0.6/large) mit Preisliste je Markt | Tipp auf Karte öffnet Sheet; Zeilen nach Preis sortiert; veraltete Preise markiert | K |
| S6 | Suche: `.searchable`, Verlauf, Vorschläge, Ergebnisse gruppiert | Tippen zeigt Vorschläge ≤ 150 ms; leerer Zustand mit Aktion | K |
| S7 | Filter-Sheet (Märkte, Sortierung, Bio, Eigenmarke, Angebote) | Filter ändern Ergebnisanzahl; Test auf Sortierstabilität | K |
| S8 | Standort-Sheet: PLZ-Feld + Radius, Speicherung in `@AppStorage` | Gültige PLZ (5 Ziffern) wird gespeichert, 4 und 6 Ziffern abgelehnt (Test) | K |
| S9 | Liste-Tab mit Segment Einkauf/Favoriten, Summe je Markt („geschätzt“), Persistenz (SwiftData oder JSON) | Neustart behält Liste; Summe stimmt im Unit-Test | K |
| S10 | Lade-/Leer-/Offline-Zustände als wiederverwendbare Views (Skeleton) | Alle 3 Zustände in der Vorschau, Texte ohne „Live“ | F |
| S11 | Profil: Standort, Datenquellen-Seite, Rechtliches, Darstellung | Datenquellen-Seite listet Quelle + letzte Aktualisierung | F |
| S12 | Anzeige-Slot (`AdSlot`) mit Label „Anzeige“, nur außerhalb der Preisliste | UI-Test: Slot nie zwischen Preiszeilen; Label sichtbar | F |

### Expo

| # | Aufgabe | Abnahme | Art |
|---|---|---|---|
| E1 | Tabs auf Start/Suche/Angebote/Liste/Profil umstellen (`_layout.tsx`), Favoriten in Liste | 5 Tabs, Warenkorb-Badge bleibt, Route `/angebote` im Tab | K |
| E2 | Startseite entschlacken: Kopf (Standort, Glocke), echtes Suchfeld, Kategorien, 2 Slider | Datei ≤ 100 Zeilen, Komponenten ausgelagert | K |
| E3 | Echtes Suchfeld (`TextInput`) auf Start, fokussiert Suche-Tab mit Tastatur | Ein Tap bis Tastatur sichtbar | F |
| E4 | Daten aus `data/standard_products.json` (≥ 500) laden statt 25 Demo-Produkte | App zeigt ≥ 500 Produkte; Suche < 100 ms | K |
| E5 | `ProductCard` mit Open-Food-Facts-Bild, `expo-image` Cache, Platzhalter | Bilder laden; Platzhalter bei Fehlern | F |
| E6 | Suchergebnisse je Markt gruppiert (Instacart-Muster) als Umschalter „Nach Produkt / Nach Markt“ | Gruppenzeile zeigt Entfernung und Stand | K |
| E7 | Produkt-Sheet: Preisliste je Markt vorn, Verlauf/Alarm nach hinten | Preisliste ohne Scrollen sichtbar bei Detent 0.6 | F |
| E8 | Onboarding auf 3 Schritte kürzen (Nutzen, PLZ, Märkte optional), überspringbar | Erste Produktansicht ≤ 3 Taps nach Installation | F |
| E9 | Skeleton-Karten, Leer- und Offline-Zustände vereinheitlichen | Alle Listen nutzen eine Komponente | F |
| E10 | Anzeige-Slot mit „Anzeige“-Label (nicht in Preisliste) | Test: Sortierung unverändert mit/ohne Slot | F |

Reihenfolge: D1 → D2/D3 → S1/E1 → S2/E5 → S3/S4/E2 → S5/E7 → S6/E6 → S8 → S9 → Rest. Expo bleibt laut `AGENTS.md`
eingefroren, bis die SwiftUI-App fertig ist; E-Aufgaben nur nach Freigabe.
