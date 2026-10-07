# Supabase Setup fuer Preisfuchs

Stand 06.09.2026: Das bestehende Preisfuchs-Projekt ist wieder aktiv. Die sieben
lokalen Migrationsversionen einschließlich Initial-Baseline sind registriert;
Remote-Rollen- und API-Prüfungen bestanden. Bestandsbackup, Rollout und Pilot:
[KATALOG_IMPORT.md](KATALOG_IMPORT.md). Bestehende Instanzen über Migrationen
aktualisieren; `backend/supabase/schema.sql` ist der Snapshot für neue Instanzen.
Der [BW-Pilot](PILOT_2026-09-06.md) ergänzt drei bestätigte Artikel und sechs
öffentliche Beobachtungen. Alle 8.935 alten kaufDA-Beobachtungen bleiben intern.

## 1. Projekt erstellen

1. Oeffne https://supabase.com/dashboard/projects
2. Erstelle ein neues Projekt, z.B. `Preisfuchs`
3. Region: am besten `Central EU` oder die naechste verfuegbare EU-Region
4. Warte, bis das Projekt bereit ist

## 2. Datenbank-Schema ausfuehren

### Schnellster Weg fuer den ersten Test

1. Oeffne im Supabase-Projekt den SQL Editor
2. Kopiere den Inhalt aus `backend/supabase/schema.sql`
3. Fuehre das SQL aus

Danach existieren Tabellen fuer:

- `products`
- `retailers`
- `stores`
- `price_observations`
- `update_runs`
- `catalog_articles`

### GitHub-Integration fuer spaeter

Die Supabase-GitHub-Integration ist sinnvoll, damit Datenbank-Migrationen aus
dem Repo nachvollziehbar laufen. Das Repo enthaelt dafuer jetzt:

```text
supabase/config.toml
supabase/migrations/202605090001_initial_schema.sql
supabase/migrations/20260810151027_app_discount_prices.sql
supabase/migrations/20260828090000_harden_public_access.sql
supabase/migrations/20260828092000_price_publication_gate.sql
supabase/migrations/20260828093000_current_price_view.sql
supabase/migrations/20260905180235_structured_catalog.sql
supabase/migrations/20260905181351_enforce_catalog_publication.sql
```

In Supabase:

1. Project Settings
2. Integrations
3. GitHub Integration autorisieren
4. Repository `HamidK193/Preisfuchs` auswaehlen
5. Working directory: `.`
6. Integration aktivieren

Fuer den allerersten Test ist der SQL Editor trotzdem oft schneller und
leichter zu kontrollieren.

## 3. Lokale `.env` anlegen

Im Projektordner `A:\Codex\Preisfuchs` eine Datei `.env` erstellen:

```text
SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=DEIN_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY=DEIN_OEFFENTLICHER_ANON_KEY
```

Wichtig: Den `SERVICE_ROLE_KEY` nicht in Git committen. `.env` ist bereits in
`.gitignore`.

## 4. Verbindung testen

```powershell
cd A:\Codex\Preisfuchs
uv --cache-dir .uv-cache run --python 3.12 --with-requirements backend/jobs/requirements.txt python backend/jobs/test_supabase_connection.py
```

Erwartete Ausgabe:

```text
Supabase connection OK
products rows: 0
retailers rows: 5
schema: app discounts + publication gate + current-price view OK
anon security: raw payload and update runs denied
```

Der Test beendet sich absichtlich mit `Supabase schema is outdated`, wenn die
eingecheckten Rabatt-, Veröffentlichungs- oder View-Migrationen noch fehlen.

## 5. Seed- und Update-Job testen

```powershell
uv --cache-dir .uv-cache run --python 3.12 --with-requirements backend/jobs/requirements.txt python backend/jobs/price_update_job.py
```

Der Job schreibt die Standard-Produkte in `products`. Für drei exakt geprüfte
Produkte sind erste Barcodes hinterlegt. Der aktuelle Open-Prices-Dry-Run findet
4 offene Beobachtungen; sie stammen aus 2025 und werden deshalb in der App als
möglicherweise veraltet gekennzeichnet.

## 6. GitHub-Secrets setzen

Im privaten GitHub-Repo:

1. Settings
2. Secrets and variables
3. Actions
4. New repository secret

Eintragen:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Danach kann `.github/workflows/daily-price-update.yml` taeglich laufen.

## 7. Sicherheitspruefung nach Migrationen

- `anon` und `authenticated` duerfen Katalog- und freigegebene Preisspalten
  lesen, aber nichts schreiben.
- `raw_payload` ist fuer Browserrollen nicht lesbar.
- `update_runs` besitzt RLS und keine Client-Policy.
- Nur der serverseitige `SUPABASE_SERVICE_ROLE_KEY` darf Produkte,
  Preisbeobachtungen und Update-Laeufe schreiben.
- Der Service-Role-Key darf nie als `VITE_*`-Variable oder im iOS-Bundle
  landen.

Die Migrationen zuerst in einer Staging-/Preview-Umgebung ausrollen. Danach
Supabase Security Advisors sowie echte anon-, authenticated- und
service-role-Anfragen prüfen, bevor dieselben Migrationen produktiv laufen.
