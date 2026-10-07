# App-Rabatte in Preisfuchs

## Ziel

Preisfuchs behandelt Händler-App-Rabatte als bedingte Preisbeobachtungen.
Der reduzierte Preis darf in einen Vergleich einfließen, muss aber sichtbar
mit App, Einlösebedingung, Marktbezug, Gültigkeit und Quelle gekennzeichnet
sein. Ein App-Preis ist kein allgemein verfügbarer Regalpreis.

## Preisarten

- `regular`: beobachteter Normalpreis
- `sale`: öffentliches Angebot ohne Händler-App-Pflicht
- `app_discount`: Preis oder Coupon, der eine Händler-App voraussetzt

Für App-Rabatte speichert `price_observations` zusätzlich:

- `requires_app` und `app_name`
- `coupon_activation_required`
- `is_personalized`
- `regular_price`
- `valid_from` und `valid_until`
- `discount_description`

## Beschaffungsstrategie

1. Öffentlich erreichbare, offizielle Angebots- und App-Deal-Seiten der
   Händler auswerten, sofern deren Nutzung und Weiterverarbeitung zulässig ist.
2. Öffentliche Prospektquellen nur dann als App-Rabatt markieren, wenn im
   konkreten Angebot eindeutig Begriffe wie `Lidl Plus`, `EDEKA App` oder
   `App-Preis` stehen.
3. Mittelfristig Händler-Feeds oder Partnerschaften bevorzugen. Sie sind für
   strukturierte, vollständige Bedingungen verlässlicher als HTML-Erkennung.
4. Später können Nutzer eigene Coupons oder Screenshots freiwillig importieren.
   Erkannte Produkt-, Preis- und Gültigkeitsdaten müssen vor Veröffentlichung
   bestätigt werden; personenbezogene Coupon-IDs werden nicht geteilt.

Preisfuchs meldet sich nicht automatisiert in Händlerkonten an und umgeht
keine geschützten App-Schnittstellen. Personalisierte Coupons werden niemals
als für alle Nutzer verfügbar dargestellt.

## Händlerregeln

### EDEKA App

Coupons können vom ausgewählten Lieblingsmarkt, konkreten Artikelnummern und
einem Gültigkeitszeitraum abhängen. Zusätzlich können Angebote personalisiert
sein. Quelle: <https://www.edeka.de/services/edeka-app/faq/>

### Lidl Plus

Coupons müssen je nach Angebot in Lidl Plus aktiviert und beim Einkauf mit
der digitalen Kundenkarte eingelöst werden. Quelle:
<https://www.lidl.de/c/lidl-plus-teilnahmebedingungen/s10005289>

## Darstellung und Berechnung

- Der Vergleich startet ohne App-Rabatte.
- Nutzer können öffentliche App-Rabatte ausdrücklich einschalten.
- Personalisierte Coupons bleiben auch dann aus und benötigen ein zweites,
  separates Opt-in.
- Jede betroffene Preiszeile zeigt `Nur mit <App-Name>`.
- Warenkorb und Kasse nennen alle Apps, die für das berechnete Minimum nötig
  sind.
- Abgelaufene Angebote dürfen nicht in den aktuellen Bestpreis einfließen.
- Unklare Coupons werden nicht automatisch berücksichtigt. Als personalisiert
  markierte Coupons erhalten einen sichtbaren Hinweis und fließen nur nach dem
  separaten Opt-in ein.

## Nächster Daten-Schritt

Für jeden Kernhändler wird ein eigener Adapter mit Testfällen für Preis,
Produktbezug, Markt, Aktivierung und Gültigkeit benötigt. Vor einem produktiven
Import werden Nutzungsbedingungen und technische Zugriffsmöglichkeiten je
Quelle separat geprüft.
