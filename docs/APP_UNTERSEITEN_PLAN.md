# Preisfuchs – Plan der Unterseiten (App `mobile/`)

Stand: 05.10.2026. Ergänzt `APP_SCREENS_PLAN.md` um alle Seiten, die von den fünf
Haupt-Tabs aus erreichbar sind. Erst Design in Google Stitch, dann Umsetzung.

## Stil (wie die laufende App)

- Weißer Hintergrund, SF Pro (iOS-Systemschrift), Eckenradius 5 px.
- Großzügige Innenabstände: Karten 16 px, Zeilen 12–14 px, Buttons 24 × 14 px.
- Fuchs-Orange `#E8692B` als Akzent, Waldgrün `#1F4D3A` für Ersparnis.
- Echte Händlerlogos, SF-Symbols-Icons, Unterseiten mit iOS-Navigationsleiste
  (großer Titel, Zurück-Pfeil).
- Jeder Preis mit Quelle und Datum; nie „Live“, „Echtzeit“, „Verifiziert“.

## A. Produkt-Sheet (Swipe-up beim Tippen auf ein Produkt)

Öffnet als Bottom-Sheet mit zwei Stufen: halbe Höhe (Überblick) und ganz
hochgewischt (alle Details). Unten immer fest: Menge und „Zum Warenkorb“.

1. **Kopf:** Produktfoto, Marke, Name, Packungsgröße, Grundpreis, Herz (Favorit),
   Teilen.
2. **Bester Preis:** große Karte mit Logo des günstigsten Markts, Preis,
   Streichpreis, Rabatt, Ersparnis, gültig bis, Quelle und Stand.
3. **Preisampel:** „Gerade günstig / Normal / Teuer“ im Vergleich zum
   8-Wochen-Durchschnitt.
4. **Preise in deiner Nähe:** alle Märkte mit Logo, Filiale, Entfernung, Preis,
   Grundpreis, Rabatt, Quelle und Datum; günstigster grün markiert; Märkte ohne
   Preis als „kein Preis bekannt“.
5. **Preisverlauf:** Diagramm 8 Wochen / 6 Monate (6 Monate später mit Plus).
6. **Preisalarm:** Zeile „Alarm bei unter … €“ → öffnet Alarm-Sheet.
7. **Produktinfos (Open Food Facts):** Nutri-Score, Labels (Bio, vegan),
   Zutaten, Nährwerte pro 100 g, Allergene, EAN.
8. **Günstigere Alternativen:** vergleichbare Produkte bzw. Eigenmarken mit
   Grundpreis.
9. **Woher kommt der Preis?** Erklärung der Quellen und Hinweis
   „Beobachtungen, im Markt kann der Preis abweichen“, Link „Preis melden“.

## B. Profil-Unterseiten

10. **Standort & Radius:** PLZ-Feld, „Aktuellen Standort verwenden“,
    Kartenvorschau mit Radius-Kreis und Markt-Pins, Radius-Regler 1–25 km,
    Ergebnis „8 Märkte im Umkreis“, Button „Speichern“.
11. **Meine Märkte:** Liste aller Ketten im Umkreis mit Logo, Anzahl Filialen,
    nächste Entfernung, Schalter an/aus; Abschnitt „Weitere Ketten“; Hinweis,
    dass Preisvergleich nur aktive Märkte nutzt.
12. **Markt-Detail (Filiale):** großes Logo, Adresse, Entfernung, Öffnungszeiten
    der Woche (heute hervorgehoben), Buttons „Route“ und „Als Lieblingsmarkt“,
    Angebote dieses Markts, „Dein Warenkorb hier: 23,80 €“.
13. **Familie & Gruppen:** Teaser solange nicht verfügbar; später Gruppenübersicht
    (siehe Stitch-Screens „Meine Gruppe“, „Gemeinsamer Warenkorb“).
14. **Mitteilungen:** Schalter für Preisalarme, Wochenangebote (Wochentag),
    Preisänderungen im Warenkorb, Tipps; Ruhezeiten.
15. **Datenschutz & Werbung:** Einwilligungen (Notwendig, personalisierte
    Anzeigen, anonyme Statistik), gleichwertige Buttons, Daten exportieren/löschen.
16. **Datenquellen & Transparenz:** Karte je Quelle (Prospekte, Open Prices,
    Open Food Facts, OpenStreetMap, Community) mit Lizenz und letzter
    Aktualisierung; Grundsatz „Rangliste nicht käuflich“.
17. **Hilfe & Feedback:** Suchfeld, FAQ zum Aufklappen, Feedback mit Sternen und
    Text, Kontakt.
18. **Rechtliches:** Liste Impressum, Datenschutzerklärung, Nutzungsbedingungen,
    Lizenzen & Marken (inkl. Händlerlogos) → jeweils Textseite.
19. **Konto anlegen (Sheet):** „Mit Apple“, „Mit Google“, „Mit E-Mail“ gleich groß;
    „Nur nötig zum Teilen und Synchronisieren“.
20. **Preisfuchs Plus:** Paywall mit Vorteils-Kacheln, Jahres-/Monatsabo,
    „14 Tage kostenlos testen“, „Käufe wiederherstellen“.

## C. Weitere Unterseiten von Start, Suche und Warenkorb

21. **Alle Angebote:** Datumsbereich der Angebotswoche, Markt-Filter mit Logos,
    Sortierung, zweispaltiges Raster.
22. **Kategorie:** Unterkategorien als runde Bilder, Produkte nach Grundpreis.
23. **Preisalarm-Sheet:** Wunschpreis-Stepper, Märkte wählen, Push an/aus.
24. **Marktvergleich-Detail (Warenkorb):** pro Markt, welche Artikel fehlen;
    Aufteilen auf 2 Märkte mit Route.

## Reihenfolge

| Schritt | Inhalt |
|---|---|
| Stitch 1 | Produkt-Sheet halb und ganz offen (1–9) |
| Stitch 2 | Standort, Meine Märkte, Markt-Detail (10–12) |
| Stitch 3 | Mitteilungen, Datenschutz, Datenquellen, Hilfe, Rechtliches (14–18) |
| Stitch 4 | Konto-Sheet, Plus, Alle Angebote, Kategorie, Preisalarm, Marktvergleich (19–24) |
| Code | Produkt-Sheet zuerst, dann Profil-Unterseiten |
