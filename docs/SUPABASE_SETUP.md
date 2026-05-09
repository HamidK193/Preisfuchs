# Supabase Setup fuer Preisfuchs

## 1. Projekt erstellen

1. Oeffne https://supabase.com/dashboard/projects
2. Erstelle ein neues Projekt, z.B. `Preisfuchs`
3. Region: am besten `Central EU` oder die naechste verfuegbare EU-Region
4. Warte, bis das Projekt bereit ist

## 2. Datenbank-Schema ausfuehren

1. Oeffne im Supabase-Projekt den SQL Editor
2. Kopiere den Inhalt aus `backend/supabase/schema.sql`
3. Fuehre das SQL aus

Danach existieren Tabellen fuer:

- `products`
- `retailers`
- `stores`
- `price_observations`
- `update_runs`

## 3. Lokale `.env` anlegen

Im Projektordner `A:\Codex\Preisfuchs` eine Datei `.env` erstellen:

```text
SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=DEIN_SERVICE_ROLE_KEY
```

Wichtig: Den `SERVICE_ROLE_KEY` nicht in Git committen. `.env` ist bereits in
`.gitignore`.

## 4. Verbindung testen

```powershell
cd A:\Codex\Preisfuchs
.\.venv\Scripts\python.exe backend\jobs\test_supabase_connection.py
```

Erwartete Ausgabe:

```text
Supabase connection OK
products rows: 0
retailers rows: 5
```

## 5. Seed- und Update-Job testen

```powershell
.\.venv\Scripts\python.exe backend\jobs\price_update_job.py
```

Der Job schreibt die Standard-Produkte in `products`. Preisbeobachtungen werden
erst importiert, wenn fuer Produkte Barcodes oder belastbare externe
Preisquellen angebunden sind.

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
