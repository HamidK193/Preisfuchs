# Phase 0 Backend und Daten: Umsetzungsplan

Stand 10.10.2026. Alle Abfragen waren nur lesend, nichts wurde geändert.

**Kurz vorab:**
- Zwei Live-Migrationen haben keine Datei im Repo.
- Der Seed-Job kann Preise des DE-Agents unbemerkt und dauerhaft verstecken.
- `report-price` braucht jetzt keine Änderung.
- Der OFF-Agent läuft am Montag ohnehin automatisch über alle GTINs.

---

## 1. Haushalts-Schema als Migrationsdateien

**Befund:** Ich habe `supabase_migrations.schema_migrations` mit `supabase/migrations/` verglichen. Zwei Remote-Migrationen haben keine Datei:

| version | name | statements | Länge | md5 (remote) |
|---|---|---|---|---|
| 20261010100034 | households_and_shared_lists | 1 | 11.490 | `9afb94dfb5ed6b075f8d397bef75a76a` |
| 20261010100204 | households_grants | 1 | 411 | `f116f8d75ff34c1cd0a4b9b7688d99c1` |

- Alle anderen 11 Versionen haben eine Datei.
- `202605090001_initial_schema` hat remote 0 Statements. Die lokale Datei bleibt, wie sie ist.
- `backend/supabase/households.sql` (13.214 Byte, mit Kommentaren) ist nicht identisch mit dem, was live angewendet wurde. Maßgeblich ist das Remote-SQL.

**Rekonstruktion:** Jede Migration hat genau ein Statement, also ist das SQL wortgleich:
```sql
select array_to_string(statements, E';\n') from supabase_migrations.schema_migrations
where version = '20261010100034';  -- danach 20261010100204
```
- Die Ausgabe 1:1 speichern als:
  - `supabase/migrations/20261010100034_households_and_shared_lists.sql`
  - `supabase/migrations/20261010100204_households_grants.sql`
- Das SQL enthält einen `do $$ … $$`-Block für die Realtime-Publication. Beim Kopieren nichts escapen.
- `supabase migration fetch` würde ich nicht nutzen. Der Befehl schreibt alle Versionen aus der Remote-Historie, und `initial_schema` ist dort leer.
- Zusätzlich:
  - `households.sql` bekommt einen Kopfkommentar: „Angewendet als Migrationen 20261010100034 und 20261010100204, die Quelle ist `supabase/migrations/`“.
  - `schema.sql` bekommt am Ende einen Abschnitt „Haushalte“, der die beiden Migrationen übernimmt.

**Verifikation:**
- `tr -d '\r' < <datei> | md5sum` muss den Remote-md5 ergeben. Das `tr` ist nötig, weil `core.autocrlf=true` gesetzt ist. Falls das Statement ohne abschließenden Zeilenumbruch gespeichert ist, die Datei ohne Newline am Ende speichern.
- `supabase migration list --linked` zeigt 13 von 13 als Local = Remote.
- Optional: In einem Preview-Branch oder mit `supabase db reset` entstehen die Tabellen `households*` und `shared_list*` sowie die 7 RPCs.

**User-Entscheidung:** keine.

## 2. `data_status`-View

**Befund (Abfrage):**
- `update_runs` hat die Spalten `id, started_at, finished_at, source, status, imported_count, notes, report`.
- RLS ist an, es gibt keine Policy und keinen Grant für anon oder authenticated. Der pgTAP-Test prüft genau das.
- Werte in `update_runs.source`: `Open Prices DE`, `Open Prices` (das ist der Seed-Job), `OpenStreetMap`, `Open Food Facts`.
- `price_observations.source` = `Open Prices` für beide Jobs.
- Frische-Spalten: `stores.last_seen_at`/`is_active` und `off_products.fetched_at`.

**Design:** Eine View mit `security_invoker` allein würde für anon scheitern, weil anon `update_runs` nicht lesen darf. Eine View ohne `security_invoker` meldet der Supabase-Advisor als Fehler (`security_definer_view`). Deshalb:
- Eine `security definer`-Funktion gibt nur unkritische Spalten zurück.
- Eine Invoker-View darüber liefert den REST-Pfad `/rest/v1/data_status`.
- Neue Datei `supabase/migrations/<ts>_data_status.sql`:
```sql
create or replace function public.get_data_status()
returns table (source text, label text, last_success_at timestamptz,
               last_imported_count integer, newest_data_at timestamptz, item_count bigint)
language sql stable security definer set search_path = '' as $$
  with src(source, label, sort) as (values
    ('Open Prices DE',  'Preise (Open Prices)',          1),
    ('OpenStreetMap',   'Maerkte (OpenStreetMap)',       2),
    ('Open Food Facts', 'Produktinfos (Open Food Facts)', 3)),
  last_ok as (
    select distinct on (r.source) r.source, r.finished_at, r.imported_count
    from public.update_runs r
    where r.status = 'succeeded' and r.finished_at is not null
    order by r.source, r.finished_at desc)
  select s.source, s.label, l.finished_at, l.imported_count,
    case s.source
      when 'Open Prices DE'  then (select max(c.observed_at) from public.current_price_observations c)
      when 'OpenStreetMap'   then (select max(st.last_seen_at) from public.stores st where st.source = 'OpenStreetMap' and st.is_active)
      when 'Open Food Facts' then (select max(o.fetched_at) from public.off_products o) end,
    case s.source
      when 'Open Prices DE'  then (select count(*) from public.current_price_observations)
      when 'OpenStreetMap'   then (select count(*) from public.stores st where st.source = 'OpenStreetMap' and st.is_active)
      when 'Open Food Facts' then (select count(*) from public.off_products) end
  from src s left join last_ok l on l.source = s.source
  order by s.sort;
$$;

create or replace view public.data_status with (security_invoker = true) as
  select * from public.get_data_status();

revoke all on function public.get_data_status() from public, anon, authenticated;
grant execute on function public.get_data_status() to anon, authenticated, service_role;
revoke all on public.data_status from anon, authenticated;
grant select on public.data_status to anon, authenticated, service_role;
```

**Was anon sieht:**
- Nur die feste Quellenliste, den Zeitpunkt des letzten *erfolgreichen* Laufs, den Zähler, die neueste Datenzeit und die Anzahl.
- Kein `report`, keine `notes`, keine fehlgeschlagenen Läufe, keine Cursor und keine kaufDA-Statistik.
- Die View `current_price_observations` filtert `is_public` selbst. Darum zählt die Funktion nur öffentliche Preise, obwohl sie mit Owner-Rechten läuft.
- Der Seed-Lauf (`Open Prices`) ist absichtlich nicht dabei.
- Der Advisor wird die Funktion vermutlich als „security definer, für anon ausführbar“ warnen. Das ist hier gewollt und im Kommentar zu begründen. Alternative: die Funktion in ein nicht exponiertes Schema `private` legen. Das ist sauberer, aber mehr Aufwand.

**Achtung beim Anwenden:**
- `apply_migration` über MCP vergibt eine eigene Version, nämlich die Uhrzeit beim Anwenden.
- Den Dateinamen danach auf die Remote-Version umbenennen, sonst entsteht die gleiche Drift wie in Punkt 1.
- Alternativ mit `supabase db push` aus der Datei anwenden.

**Verifikation:**
```sql
begin; set local role anon;
select * from public.data_status;          -- 3 Zeilen
select count(*) from public.update_runs;   -- muss "permission denied" liefern
rollback;
```
- pgTAP in `supabase/tests/database_security.test.sql` erweitern: `plan(15)` wird `plan(17)`.
  - `has_table_privilege('anon','public.data_status','select')`
  - Kein Spaltenname `report` oder `notes` in `information_schema.columns` für `data_status`.
- Danach `get_advisors` (security) prüfen.

**User-Entscheidung:** keine. Die Texte in `label` lassen sich später anpassen.

## 3. Alter BW-Seed-Job (`backend/jobs/price_update_job.py`)

**Was er tut:**
- Er holt für die 76 Seed-Produkte aus `data/` jede GTIN einzeln aus Open Prices.
- Er akzeptiert nur Supermarkt, Discounter und Convenience in Baden-Württemberg (`outside_or_unverified_bw`).
- Er schreibt die Zeilen mit `region='Baden-Württemberg'` und `confidence 0.70` und upsertet dabei `products` und `catalog_articles`.
- Bericht in `update_runs` mit `source='Open Prices'` und in `artifacts/latest-import.json`.

**Risiko (Zeile 806):**
- Er setzt `is_public=false` für alle öffentlichen Zeilen mit `source='Open Prices'`, deren `source_ref` er abgelehnt hat.
- Der DE-Agent schreibt aber dieselbe `source` und dieselbe `source_ref`.
- Ein bundesweit gültiger Preis für eine Seed-GTIN außerhalb von BW wird also am nächsten Morgen versteckt.
- Der DE-Agent überspringt bekannte `source_ref`s. Die Zeile kommt deshalb nie zurück, und das ohne Fehlermeldung.

**Ist-Stand:**
- In den letzten 3 Läufen wurde nichts versteckt (`withdrawn` = 0). Abgelehnt wurden je 6 Zeilen als `outside_or_unverified_bw` und 1 als `not_a_supported_shop`.
- Es gibt 6 Seed-Zeilen, davon 5 öffentlich, und keine doppelten `source_ref`.
- Das Risiko ist also bisher nicht eingetreten, kann aber jederzeit eintreten.
- Zusätzlich vermischt der Seed-Job den Lauf `Open Prices` mit dem DE-Agent.

**Minimale, umkehrbare Abschaltung** in `.github/workflows/daily-price-update.yml`:
```yaml
      # Old BW seed import; off by default. Re-enable: repo variable ENABLE_BW_SEED_JOB=true
      - name: Run update job (BW seed)
        if: ${{ vars.ENABLE_BW_SEED_JOB == 'true' }}
        env: ...unchanged...
        run: python backend/jobs/price_update_job.py
      ...
      - name: Write import summary
        if: ${{ always() && vars.ENABLE_BW_SEED_JOB == 'true' }}
```
- Die Unit-Tests, der DE-Agent (`if: always()`) und `expire_stale_price_observations` laufen unverändert weiter.
- Wieder einschalten: GitHub → Settings → Secrets and variables → Actions → Variables, dort `ENABLE_BW_SEED_JOB=true`. Eine Codeänderung ist dafür nicht nötig.
- Die 5 öffentlichen Seed-Zeilen bleiben und laufen nach 90 Tagen ab.
- Doku-Satz in `docs/swiftui-plan/04-daten-pipeline.md` 2.1 und `docs/KATALOG_IMPORT.md` anpassen.

**Falls behalten statt abschalten:** Die Rücknahme in Zeile 806 zusätzlich auf eigene IDs begrenzen, also `.in_("id", [stable_id("open-prices", ref) …])`, und den BW-Filter entfernen.

**Verifikation:**
- `workflow_dispatch` starten. Der Schritt zeigt „skipped“.
- `select source, max(started_at) from update_runs group by 1` zeigt einen neuen Eintrag nur bei `Open Prices DE`.
- Die Anzahl in `current_price_observations` bleibt stabil.

**User-Entscheidung: nötig** (offene Entscheidung 6.2). Meine Empfehlung: abschalten.

## 4. OFF-Agent einmal manuell

- **Workflow:** `.github/workflows/weekly-data-agents.yml`, Job `off-products`.
- `workflow_dispatch` hat **keine Inputs** und startet immer *beide* Jobs, also auch OSM. Der OSM-Lauf dauerte zuletzt rund 35 Minuten. Er ist unschädlich, weil er upsertet und bei `partial` nichts deaktiviert.
- **Aufruf:** `gh workflow run weekly-data-agents.yml --ref main` oder im Actions-Tab „Run workflow“. Als Input wird nichts übergeben.
- **Hinweis:** Der Lauf am 04.10. hatte nur 6 GTINs, weil der Katalog damals klein war.
  - `known_gtins()` liest heute alle `catalog_articles.gtin`, das sind rund 1.400.
  - Der Cron am **Montag, 12.10., 02:00 UTC** macht das ohnehin.
  - Manuell lohnt es sich also nur, wenn du die Daten schon vor Montag brauchst.
- **Risiko:** Mit 0,7 s Pause pro GTIN plus Anfrage dauert der Lauf rund 25–45 Minuten. Das Timeout liegt bei 60 Minuten. Der Upsert passiert erst am Ende, bei einem Timeout geht also alles verloren.
  - Optional vorher `timeout-minutes: 120` setzen.
  - Schon ein einziger Fehler bei einer GTIN ergibt `partial` und damit einen roten Lauf, obwohl die Daten gespeichert sind.
- **Verifikation:** `select count(*), count(image_url), max(fetched_at) from off_products;` sollte ungefähr `select count(distinct gtin) from catalog_articles` minus `not_found` ergeben. Den Bericht der letzten Zeile in `update_runs` mit `source='Open Food Facts'` prüfen.
- **User-Entscheidung:** keine. Höchstens: Montag abwarten oder jetzt starten.

## 5. `.gitignore` für iOS-Secrets

**Befund:**
- `*.xcuserdata` greift nicht, weil Xcode einen *Ordner* `xcuserdata/` anlegt.
- Der Plan in SWIFTUI_PLAN.md sagt „`*.xcconfig` ignorieren“. Das würde aber `Base.xcconfig`, `Debug.xcconfig` und `Release.xcconfig` mit ignorieren, die laut `01-architektur-build.md` Abschnitt 6 eingecheckt werden sollen. Deshalb gezielt ignorieren.

Ergänzung in `.gitignore`:
```gitignore
# iOS: secrets, signing, per-user Xcode state
ios/Config/Secrets.xcconfig
xcuserdata/
GoogleService-Info.plist
*.p8
*.p12
*.cer
*.mobileprovision
*.provisionprofile
```

**Verifikation:**
- `git check-ignore -v ios/Config/Secrets.xcconfig` meldet einen Treffer.
- `git check-ignore ios/Config/Base.xcconfig ios/Config/Secrets.example.xcconfig` gibt nichts aus.
- `git ls-files ios` enthält kein `xcuserdata`. Heute ist das sauber.

**User-Entscheidung:** keine. SWIFTUI_PLAN.md entsprechend von `*.xcconfig` auf `ios/Config/Secrets.xcconfig` korrigieren.

## 6. `verify_jwt` bei `report-price`

**Befund:**
- Deployt ist `report-price` in Version 1 mit `verify_jwt: true`.
- `supabase/config.toml` hat keinen `[functions]`-Abschnitt. Es gilt also der Default.
- Im Projekt sind *beide* Schlüssel aktiv: der Legacy-anon-JWT und `sb_publishable_…`.
- Expo (`mobile/src/lib/reports.ts`) schickt den Legacy-anon-Key als Bearer. Das funktioniert.

**Jetzt nötig?** Nein, solange auch die iOS-App den Legacy-anon-Key für `functions/v1/report-price` nutzt. Nötig wird es erst, wenn die App den `sb_publishable_…`-Key nutzt oder der Legacy-Key abgeschaltet wird.

**Vorschlag:** Den Ist-Zustand ausdrücklich festhalten, damit ein Redeploy nichts unbemerkt ändert. In `supabase/config.toml`:
```toml
[functions.report-price]
verify_jwt = true   # legacy anon JWT; set false (function validates + rate-limits itself) before switching to sb_publishable keys
```

**Verifikation:** `list_edge_functions` zeigt weiterhin `verify_jwt: true`. Ein POST ohne `Authorization` liefert 401, ein POST mit dem anon-Key liefert 400 oder 200 je nach Inhalt.

**User-Entscheidung:** Welchen Key nutzt die iOS-App? Empfehlung für Phase 0: den Legacy-anon-Key. Die Umstellung auf neue Keys wird ein eigener Schritt, zusammen mit `verify_jwt = false`.

## 7. SMTP für Login-Mails (Dashboard, keine Migration)

**Kostenlose Optionen:**
- **Brevo:** 300 Mails pro Tag kostenlos. Ein einzelner Absender lässt sich ohne Domain verifizieren, die Zustellung ist mit eigener Domain aber besser.
- **Resend:** 100 Mails pro Tag bzw. 3.000 pro Monat kostenlos. Braucht eine eigene Domain mit DNS-Einträgen.
- **Gmail mit App-Passwort:** rund 500 Mails pro Tag. Absender ist dann die Gmail-Adresse. Das ist der schnellste Weg für die Testphase, aber nicht für den Launch.

**Schritte für dich:**
1. Beim Anbieter ein Konto anlegen und den Absender bzw. die Domain verifizieren (SPF/DKIM). SMTP-Zugangsdaten erzeugen.
2. Supabase Dashboard → Authentication → Emails → **SMTP Settings** → „Enable custom SMTP“ einschalten.
   - Host, Port 587 (STARTTLS) oder 465, Benutzer und Passwort eintragen.
   - Sender email und Sender name „Preisfuchs“ eintragen.
3. Authentication → **Rate Limits** → „Emails sent per hour“ von der Vorgabe (30 nach Umstellung) auf z. B. 100 erhöhen, passend zum Tageslimit des Anbieters.
4. Prüfen, ob die vorhandenen Vorlagen aus `backend/supabase/email-templates` noch aktiv sind und den 6-stelligen `{{ .Token }}` enthalten.

**Verifikation:**
- Mit zwei verschiedenen Adressen hintereinander einen OTP anfordern. Beide Mails kommen innerhalb einer Minute an, nicht im Spam.
- Die Auth-Logs (`query_logs`, Service auth) zeigen keine Fehler.

**User-Entscheidung: nötig.** Welcher Anbieter, und gibt es eine eigene Domain? Ohne Domain empfehle ich Brevo mit Einzelabsender oder Gmail nur für die Testphase.

---

**Reihenfolge:** 5 und 1 (nur Repo, ohne Risiko) → 3 (nach deiner Entscheidung) → 2 (Migration, danach Datei umbenennen) → 6 (`config.toml`) → 4 (am Montag automatisch oder jetzt manuell) → 7 (Dashboard).

### Wichtigste Dateien für die Umsetzung
- `A:\Codex\Preisfuchs\supabase\migrations\` (neu: `20261010100034_households_and_shared_lists.sql`, `20261010100204_households_grants.sql`, `<ts>_data_status.sql`)
- `A:\Codex\Preisfuchs\.github\workflows\daily-price-update.yml`
- `A:\Codex\Preisfuchs\supabase\tests\database_security.test.sql`
- `A:\Codex\Preisfuchs\.gitignore`
- `A:\Codex\Preisfuchs\supabase\config.toml`
