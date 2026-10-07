# Preisfuchs – Screen-Plan (alle Seiten)

Stand: 04.10.2026 · Design-Konzept in Google Stitch, Projekt "Preisfuchs Grocery Comparison App".
Referenz-Stil: Screen "Start v2" (Fuchs-Orange, Waldgruen, Creme-Hintergrund, weisse Karten, Radius 16).

## Grundregeln fuer alle Screens

- Jeder Preis zeigt Quelle (Prospekt / Open Prices / Community) und "Stand: TT.MM.JJJJ".
- Keine Woerter wie "Live", "Echtzeit", "Verifiziert"; Preise sind Beobachtungen.
- Ein einziger Standort (PLZ + Radius), ueberall gleich.
- Deutschlandweit: keine BW-Badges oder BW-Claims; "72070 Tuebingen" ist nur ein Beispiel-Standort.
- Markt-Logos mind. 48 pt als gut lesbare farbige Wortmarken; Fuchs als grosse, klare Illustration.
- App ist ohne Konto nutzbar; Konto ist optional (nur fuer Sync zwischen Geraeten).
- Tab-Bar: Start · Suche · Warenkorb · Favoriten · Profil.

## Uebersicht (Sitemap)

```
Onboarding ─ Splash → Intro (3) → Standort → Lieblingsmaerkte → Mitteilungen
Start ─┬─ Angebote (alle) ─ Markt-Detail ─ Maerkte-Karte
       ├─ Kategorien ─ Kategorie-Detail
       └─ Benachrichtigungen (Glocke)
Suche ─┬─ Suchergebnisse ─ Filter & Sortierung (Sheet)
       ├─ Barcode-Scanner ─ Scan-Ergebnis
       └─ Kein Treffer / Produkt vorschlagen
Produkt ─┬─ Produktdetail ─ Preisverlauf (gross)
         ├─ Preisalarm setzen (Sheet)
         ├─ "Woher kommt dieser Preis?" (Sheet)
         └─ Preis melden / korrigieren
Warenkorb ─┬─ Einkaufsliste (aktiv) ─ Leerer Zustand
           ├─ Marktvergleich & Aufteilen
           ├─ Einkaufsmodus (im Markt abhaken)
           ├─ Meine Listen (mehrere) ─ Liste teilen
           └─ Einkauf abgeschlossen / Ersparnis
Favoriten ─┬─ Favoriten & Preisalarme (Tabs: Aktiv / Ausgeloest / Verlauf)
           └─ Alarm bearbeiten
Profil ─┬─ Profil-Uebersicht (Ersparnis-Statistik)
        ├─ Standort & Radius
        ├─ Meine Maerkte
        ├─ Mitteilungen-Einstellungen
        ├─ Darstellung (Hell/Dunkel, Schriftgroesse)
        ├─ Konto (optional: Anmelden, Sync, Daten loeschen)
        ├─ Datenquellen & Transparenz
        ├─ Hilfe & FAQ / Feedback
        └─ Rechtliches (Impressum, Datenschutz, Lizenzen)
Systemzustaende ─ Laden (Skeleton) · Offline · Fehler · Leere Zustaende
```

## Screens im Detail

### A. Onboarding
1. **Splash** – Fuchs-Logo, Claim "Clever einkaufen in ganz Deutschland".
2. **Intro 1–3** (Swipe) – Preise vergleichen · Liste guenstig aufteilen · Ehrliche Preise mit Quelle & Datum.
3. **Standort** – PLZ-Eingabe, "Meinen Standort verwenden", Radius-Slider 2–25 km, Vorschau Anzahl Maerkte.
4. **Lieblingsmaerkte** – Raster mit Marktlogos + Entfernung, Mehrfachauswahl.
5. **Mitteilungen** – Nutzen erklaeren (Preisalarme, Wochenangebote), "Erlauben" / "Spaeter".

### B. Start
6. **Start v2** – (fertig) Suche-Hero, Maerkte-Reihe, Angebots-Slider, Listen-Karte, Kategorien, Gerade guenstig.
7. **Alle Angebote** – Filter-Chips nach Markt, Wochenwechsel („Diese Woche“ / „Nächste Woche“ mit Datum, z. B. 5.–11. Oktober; nie „KW“), Raster 2-spaltig, Sortierung (Rabatt, Preis).
8. **Kategorien-Uebersicht** – alle Kategorien mit Unterkategorien.
9. **Kategorie-Detail** – Unterkategorie-Chips, Produktliste mit guenstigstem Preis + Markt, Sortierung Grundpreis.
10. **Markt-Detail** – Logo, Filiale, Adresse, Oeffnungszeiten, Entfernung, "Route", Angebote dieses Markts, Quelle.
11. **Maerkte-Karte** – Karte (OpenStreetMap-Stil) mit Pins, Liste unten als Bottom-Sheet.
12. **Benachrichtigungen** – Inbox: ausgeloeste Preisalarme, neue Wochenangebote, gelesen/ungelesen.

### C. Suche
13. **Suche (leer)** – Verlauf, beliebt in deiner Naehe, Kategorien-Shortcuts.
14. **Suchergebnisse** – Treffer mit Bild, Groesse, Grundpreis, guenstigster Markt, Anzahl Maerkte, "+" zum Warenkorb.
15. **Filter & Sortierung (Sheet)** – Maerkte, Kategorie, Bio, Nur Angebote, Eigenmarke/Marke, Sortierung Preis/Grundpreis/Rabatt.
16. **Barcode-Scanner** – (fertig) Kamera-Sucher, EAN manuell.
17. **Scan-Ergebnis** – Produkt erkannt → Preisvergleich kompakt, "Zum Warenkorb", "Alarm setzen".
18. **Kein Treffer** – freundlicher Leerzustand, Vorschlaege, "Produkt vorschlagen".

### D. Produkt
19. **Produktdetail** – (fertig) Preis-Rangliste, Preisindikator, Verlauf, Quelle.
20. **Preisverlauf gross** – Zeitraum 4W/8W/6M, pro Markt umschaltbar, Tiefst-/Hoechstpreis.
21. **Preisalarm setzen (Sheet)** – Wunschpreis-Stepper, Maerkte waehlen, Push an/aus.
22. **Woher kommt dieser Preis? (Sheet)** – Quelle, Datum, Gueltigkeit, Hinweis "Beobachtung, kein garantierter Preis".
23. **Preis melden** – Preis falsch / Produkt nicht verfuegbar / neuer Preis, optional Foto vom Preisschild.

### E. Warenkorb
24. **Einkaufsliste** – (fertig) gruppiert nach Kategorie, Mengen, Abhaken.
25. **Leerer Warenkorb** – Illustration Fuchs, "Erste Artikel hinzufuegen", Vorschlaege.
26. **Marktvergleich & Aufteilen** – Gesamtsumme pro Markt, fehlende Artikel je Markt, "Alles bei einem Markt" vs. "Auf 2 Maerkte aufteilen", Ersparnis, Route.
27. **Einkaufsmodus** – grosse Abhak-Zeilen, sortiert nach Gang, Fortschritt, Bildschirm bleibt an.
28. **Meine Listen** – mehrere Listen (Wocheneinkauf, Party, WG), neue Liste, Teilen.
29. **Liste teilen** – Link / QR-Code, Mitglieder.
30. **Einkauf abgeschlossen** – Zusammenfassung, geschaetzte Ersparnis (als Schaetzung gekennzeichnet).

### E2. Familie & Gruppen (synchronisierte Warenkoerbe)
45. **Login-Sheet** – erscheint erst beim Teilen/Sync: "Mit Apple", "Mit Google", "Mit E-Mail".
46. **Haushalt / Gruppe** – Name ("Familie Mueller"), Mitglieder mit Avatar und Rolle (Admin/Mitglied), Einladen, gemeinsame Listen.
47. **Gruppe erstellen** – Typ (Familie, WG, Freunde), Name, Emoji/Farbe, Mitglieder einladen.
48. **Einladung annehmen** – "Anna laedt dich in Familie Mueller ein", Vorschau der Listen, Beitreten.
49. **Gemeinsamer Warenkorb** – Artikel mit Avatar "hinzugefuegt von", wer kauft wo ein ("Ich gehe zu Lidl"), abgehakt von, synchronisiert-Hinweis mit Uhrzeit.
50. **Aktivitaet** – Verlauf: wer hat was hinzugefuegt/abgehakt, Push "Papa hat 3 Artikel abgehakt".

### F. Favoriten
31. **Favoriten & Preisalarme** – (fertig) Tabs Aktiv / Ausgeloest / Verlauf.
32. **Alarm bearbeiten** – Wunschpreis aendern, pausieren, loeschen.

### G. Profil
33. **Profil-Uebersicht** – Avatar/Name optional, Ersparnis-Statistik (Monat), Menue-Liste aller Einstellungen.
34. **Standort & Radius** – wie Onboarding, mit Kartenvorschau.
35. **Meine Maerkte** – Maerkte an/aus, Reihenfolge.
36. **Mitteilungen-Einstellungen** – Preisalarme, Wochenangebote, Ruhezeiten.
37. **Darstellung** – Hell/Dunkel/System, Grundpreis immer anzeigen.
38. **Konto (optional)** – Anmelden mit Apple/E-Mail, Sync, Daten exportieren, Konto/Daten loeschen.
39. **Datenquellen & Transparenz** – Open Prices, Open Food Facts, Prospekte, OSM; letzte Aktualisierung pro Quelle; Haftungshinweis.
40. **Hilfe & FAQ / Feedback** – haeufige Fragen, Feedback-Formular.
41. **Rechtliches** – Impressum, Datenschutz, Lizenzen (ODbL etc.).

### H. Systemzustaende
42. **Laden** – Skeleton-Karten.
43. **Offline** – zuletzt geladene Daten mit Datum, "Erneut versuchen".
44. **Fehler** – freundliche Meldung mit Fuchs.

## Stitch-Generierung (Reihenfolge)

| Block | Screens |
|---|---|
| 1 | Onboarding 1–5 |
| 2 | Alle Angebote, Kategorien, Kategorie-Detail, Markt-Detail, Maerkte-Karte, Benachrichtigungen |
| 3 | Suche leer, Suchergebnisse, Filter-Sheet, Scan-Ergebnis, Kein Treffer |
| 4 | Preisverlauf gross, Preisalarm-Sheet, Quelle-Sheet, Preis melden |
| 5 | Leerer Warenkorb, Marktvergleich, Einkaufsmodus, Meine Listen, Liste teilen, Einkauf abgeschlossen |
| 6 | Alarm bearbeiten, Profil-Uebersicht, Standort, Meine Maerkte, Mitteilungen, Darstellung |
| 7 | Konto, Datenquellen, Hilfe, Rechtliches, Laden/Offline/Fehler |
| 8 | Monetarisierung: Datenschutz-Einwilligung, Plus-Paywall, Plus verwalten, Start mit Anzeige, Suchergebnisse mit Anzeige, Produktdetail mit Partnerlink (siehe `MONETARISIERUNG.md`) |
| 9 | Konsistenz-Runde ueber alle Screens |
| 10 | Mobbin-Referenzen (Gopuff, Glovo, Wolt): Start v2, Produktdetail als Bottom-Sheet, Kategorie-Detail, Suchergebnisse, Filter-Sheet, Markt-Detail, Plus-Paywall |
| 11 | Login mit Google, Familie & Gruppen (Screens 45–50) |

Login-Anbieter: Apple, Google, E-Mail. Login ist nur fuer Sync/Teilen noetig.
