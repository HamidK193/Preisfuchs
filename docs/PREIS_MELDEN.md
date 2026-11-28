# Preis melden: API-Vertrag fuer die Apps

Stand 2026-11-28. **Achtung: Migration 20261128120000 und neue Edge Function sind im Repo, aber noch nicht auf Supabase angewendet/deployt.** Nutzer melden einen Regalpreis; die Meldung ist **ungeprueft**, bis sie moderiert wird.
Ungepruefte Meldungen fliessen nie in die Preis-Rangliste (`current_price_observations`).

## Ablauf (unter 20 s)

1. Nutzer ist per E-Mail-OTP angemeldet (Supabase Auth). Anonyme Sessions und der anon key werden mit `401 login_required` abgelehnt.
2. Optional Foto: App laedt direkt mit der Nutzer-Session in den privaten Bucket `price-report-photos` hoch, Pfad
   `<auth.uid()>/<uuid>.<jpg|png|webp>`, max. 3 MB (`upsert: false`). Fremde Ordner und andere Pfade lehnt der Server ab.
3. `POST {SUPABASE_URL}/functions/v1/report-price` mit Header `Authorization: Bearer <access_token>` und `apikey: <anon key>`.

```json
{ "gtin": "4001234567890", "store_id": "<uuid aus stores>", "price": 1.99,
  "is_offer": false, "valid_until": null, "observed_on": "2026-11-28",
  "product_name": "optional, max. 200", "photo_path": "<uid>/<uuid>.jpg" }
```
Pflicht: `gtin` (gueltige Pruefziffer, Produkt im Katalog), `store_id` (aktive Filiale), `price` (0,01 bis unter 200 EUR).
`observed_on` optional (Standard heute, max. 14 Tage zurueck). `valid_until` nur mit `is_offer: true`.

## Antworten

| Status | Body | Bedeutung |
|---|---|---|
| 201 | `{id, status:"unverified", is_verified:false, created_at}` | gespeichert, ungeprueft |
| 400 | `{error:"invalid_field", field}` | `gtin`, `store_id`, `price`, `observed_on`, `valid_until`, `product_name`, `photo_path`, `is_offer` |
| 400 | `{error:"unknown_product", field:"gtin"}` | Produkt nicht im Katalog |
| 401 | `{error:"login_required"}` | kein gueltiger Nutzer-Token / anonyme Session |
| 409 | `{error:"duplicate", id}` | gleiche Meldung (Produkt, Markt, Preis, Tag) schon vorhanden |
| 429 | `{error:"rate_limited", retry_after_seconds}` | 60 = Minutenlimit (5), 3600 = Tageslimit (30) pro Nutzer |
| 500 | `{error:"insert_failed"}` | spaeter erneut versuchen |

## Meldungen anzeigen

Lesen mit anon key oder Nutzer-Session ueber die View `price_report_feed` (`GET /rest/v1/price_report_feed?gtin=eq.<gtin>&order=created_at.desc`).
Spalten: `id, gtin, store_id, retailer_id, product_name, price, is_offer, valid_until, observed_on, status, is_verified, has_photo, source, created_at, reviewed_at`.

- `is_verified = false`: Label **"ungeprueft"**, Quelle "Nutzermeldung", Datum `observed_on`; getrennt von der Rangliste, nie als Bestpreis hervorheben.
- `is_verified = true`: wurde als Preisbeobachtung (Quelle "Nutzermeldung") in die normalen Preise uebernommen; Meldung zeigt dann "geprueft".
- Abgelehnte Meldungen (`rejected`) sieht nur der Melder selbst (`GET /rest/v1/price_reports?select=id,status,price,created_at` mit Nutzer-Session). `product_name` ist Freitext: nur als Text darstellen.
- Nicht lesbar fuer Clients: `user_id`, Foto-Pfade, Fotos, Pruefnotizen. Fotos sind nie oeffentlich.

## Moderation (nur Betreiber)

`select private.moderate_price_report('<report-id>', 'verified' | 'rejected', '<pruefer>', '<notiz>');`
Nur `service_role`/SQL-Editor. `verified` erzeugt eine oeffentliche Preisbeobachtung (Quelle "Nutzermeldung", Konfidenz 0,7) und braucht einen verifizierten Katalogartikel zur GTIN. Warteschlange: `status = 'unverified'` nach `created_at`.

## Nicht enthalten

Kein Kassenbon-Scan, keine Punkte, kein automatisches Zurueckspielen an Open Prices.
