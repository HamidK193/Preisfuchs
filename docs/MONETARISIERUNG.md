# Preisfuchs – Monetarisierung

Stand: 04.10.2026 · Entwurf, noch nicht umgesetzt.

## Grundregel

Die Preis-Rangliste ist **nie kaeuflich**. Werbung und Partner-Inhalte sind immer
klar markiert ("Anzeige", "Gesponsert", "Partnerlink") und veraendern keine
Sortierung, keinen Preisindikator und keinen Marktvergleich.
Kein Cashback-Modell (hohe Kosten fuer Belegpruefung und Auszahlung, Abhaengigkeit
von Marken-Budgets – Lehre aus der Smhaggle-Insolvenz 09/2026).

## Reihenfolge

| Phase | Wann | Einnahmequelle | Aufwand |
|---|---|---|---|
| 1 | ab Launch | Abo "Preisfuchs Plus" (Freemium, Kern bleibt kostenlos) | mittel |
| 1 | ab Launch | Native Werbebanner ("Anzeige") ueber Werbenetzwerk | gering |
| 1 | ab Launch | Affiliate-Links zu Online-Lieferdiensten ("Partnerlink") | gering |
| 2 | ab einigen tausend Nutzern | Direkte lokale Werbepartner (selbststaendige Kaufleute, Getraenkemaerkte, Bioläden) | mittel |
| 3 | ab ca. 50.000 aktive Nutzer/Monat | Prospekt-Partnerschaften mit Haendlern (B2B) | hoch (Vertrieb) |
| 3 | ab ca. 50.000 aktive Nutzer/Monat | Gesponserte Produkte (eigener Slot, nicht in der Rangliste) | mittel |
| spaeter | mit Datenbasis | Anonyme Markt-Reports (nur eigene Daten; ODbL beachten) | hoch |

## Phase 1 – Werbung

- **Anbieter:** Google AdMob (Native Ads) als Start; spaeter optional direkte Kampagnen.
- **Platzierungen (max. 1 pro Screen):**
  - Start: zwischen "Kategorien" und "Gerade guenstig".
  - Suchergebnisse: nach Treffer 5, im selben Kartenstil, Label "Anzeige".
  - Alle Angebote: jede 10. Kachel.
- **Nie** in Warenkorb, Einkaufsmodus, Marktvergleich, Preisalarm-Sheets oder Onboarding.
- **Einwilligung:** Consent-Screen im Onboarding (TCF-2.2-konformes CMP, z. B. Googles UMP).
  Ohne Einwilligung nur nicht-personalisierte Anzeigen. iOS zusaetzlich App Tracking Transparency.
- **Technik:** Werbe-Slots als eigene Komponente `AdSlot(placement:)`; ein- und ausschaltbar
  per Remote-Konfiguration (Supabase-Tabelle `app_config`), damit Platzierungen ohne
  App-Update angepasst werden koennen. Plus-Nutzer sehen keine Slots.

## Phase 1 – Affiliate

- Button "Online bestellen" auf Produktdetail und im Marktvergleich, Label "Partnerlink".
- Partnerprogramme pruefen (z. B. ueber Awin/Partnerize): Online-Supermaerkte und -Drogerien.
- Technik: Link-Vorlagen mit Partner-ID in `app_config`, Klick-Zaehlung ohne personenbezogene Daten.

## Werbepartner gewinnen

1. **Werbenetzwerke (ab Launch, kein Vertrieb noetig):** Google AdMob, spaeter ggf. AppLovin /
   Meta Audience Network. Voraussetzungen: App im Store, AdMob-Konto, Website mit `app-ads.txt`,
   Impressum, Datenschutzerklaerung, Gewerbe und Steuernummer.
2. **Affiliate-Netzwerke (ab Launch):** Als Publisher bei Awin, Adcell, Amazon PartnerNet bewerben,
   dann einzelne Partnerprogramme (Online-Supermaerkte, Drogerien, Getraenke-Lieferdienste) beantragen.
3. **Direkte Partner (ab einigen tausend Nutzern):** Mediadaten-PDF erstellen (Nutzerzahlen, Regionen,
   Zielgruppe, Preise). Zuerst selbststaendige Edeka-/Rewe-Kaufleute vor Ort ansprechen (eigenes
   lokales Marketingbudget), dann Getraenkemaerkte, Bioläden, Baeckereien; spaeter Marken/Agenturen
   und Retail-Media-Abteilungen der Haendler.

## Phase 1 – Preisfuchs Plus

- **Preis:** 1,99 EUR/Monat oder 14,99 EUR/Jahr, 14 Tage kostenlos testen.
- **Kostenlos bleibt:** Suche, Preisvergleich, Warenkorb, Marktvergleich, 3 Preisalarme, 8 Wochen Preisverlauf.
- **Plus:** werbefrei, unbegrenzte Preisalarme, 12 Monate Preisverlauf, Familiengruppe
  (bis 6 Personen, unbegrenzte geteilte Warenkoerbe mit Sync), Aufteilen auf bis zu 3 Maerkte,
  Ersparnis-Statistik. Ein Plus-Abo gilt fuer die ganze Familiengruppe.
- **Kostenlos teilen:** 1 geteilter Warenkorb mit 1 weiteren Person (Einstieg, macht Plus sichtbar).
- **Login:** Apple, Google oder E-Mail; nur fuer Sync und Teilen noetig (z. B. Supabase Auth).
- **Technik:** StoreKit 2 (iOS) / Google Play Billing (Android), z. B. ueber RevenueCat
  (kostenlos bis zu einer Umsatzgrenze). Entitlement `plus` steuert Slots und Limits.
  Apple/Google behalten 15 % (Small Business Program).

## Phase 3 – Haendler und Marken

- **Prospekt-Partner:** Haendler zahlen fuer prominente Platzierung ihres Wochenprospekts
  im Bereich "Angebote" (markiert als "Partner").
- **Gesponserte Produkte:** eigener Slot "Gesponsert" oberhalb der Suchergebnisse,
  getrennt von der Preis-Rangliste.

## Benoetigte Screens (Block 8 im Screen-Plan)

1. Datenschutz-Einwilligung (Onboarding)
2. Preisfuchs Plus – Paywall / Vorteile
3. Plus verwalten (Profil)
4. Werbe-Slot-Varianten auf Start und in Suchergebnissen
5. "Online bestellen"-Partnerlink auf Produktdetail
