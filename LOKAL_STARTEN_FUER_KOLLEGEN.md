# Preisfuchs lokal starten und weiterentwickeln

Diese Anleitung ist fuer Kollegen gedacht, die das Projekt lokal auf Windows starten und direkt weiterarbeiten wollen.

## 1. Voraussetzungen installieren

Installiere zuerst:

- Node.js LTS: https://nodejs.org
- Git: https://git-scm.com
- Python 3.12 nur dann, wenn Backend-Jobs getestet werden sollen

Pruefen:

```powershell
node --version
npm --version
git --version
python --version
```

## 2. Projekt holen

Empfohlen ueber Git:

```powershell
git clone https://github.com/HamidK193/Preisfuchs.git
Set-Location Preisfuchs
```

Wenn du stattdessen ein ZIP bekommen hast:

```powershell
Set-Location "PFAD\ZUM\Preisfuchs"
```

Wichtig: Nicht `node_modules`, `.venv`, `web/dist` oder lokale Logdateien aus einem anderen Rechner weiterverwenden.

## 3. Web-App installieren

```powershell
npm --prefix web install
```

## 4. Supabase-Zugang fuer echte Daten

Die Web-App laeuft auch ohne Supabase-Zugang mit Demo-/Fallback-Daten. Fuer echte Preis- und Produktdaten braucht die Web-App diese Datei:

```text
web\.env.local
```

Beispiel:

```env
VITE_SUPABASE_URL=https://eanggjsdpjjskqycvknx.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN_ANON_PUBLIC_KEY
```

Falls `web\.env.local.example` vorhanden ist, kann man sie kopieren:

```powershell
Copy-Item web\.env.local.example web\.env.local
```

Danach in `web\.env.local` den echten `VITE_SUPABASE_ANON_KEY` eintragen.

Wichtig: Den `SUPABASE_SERVICE_ROLE_KEY` nicht fuer die normale Web-App verwenden und nicht unnoetig weitergeben. Der ist nur fuer Backend-/Import-Jobs gedacht.

## 5. Entwicklungsserver starten

Fuer normales Entwickeln:

```powershell
npm --prefix web run dev
```

Dann im Browser oeffnen:

```text
http://localhost:5173
```

Wenn Port 5173 belegt ist, zeigt Vite im Terminal einen anderen Port an. Dann diesen Link verwenden.

## 6. Produktionsnah testen

Wenn man den gebauten Stand testen will:

```powershell
npm --prefix web run build
npm --prefix web run preview -- --host 0.0.0.0 --port 4173
```

Dann oeffnen:

```text
http://localhost:4173
```

Wenn Port 4173 belegt ist, nimmt Vite automatisch den naechsten freien Port und zeigt ihn im Terminal an.

## 7. Kurz online fuer 1-2 Tester

Erst Preview starten:

```powershell
npm --prefix web run build
npm --prefix web run preview -- --host 0.0.0.0 --port 4173
```

In einem zweiten Terminal:

```powershell
cloudflared tunnel --url http://localhost:4173
```

Wenn Vite auf einem anderen Port laeuft, z. B. 4174, dann Cloudflare auch darauf zeigen lassen:

```powershell
cloudflared tunnel --url http://localhost:4174
```

Der angezeigte `https://...trycloudflare.com` Link kann an Tester geschickt werden. Beide Terminals muessen offen bleiben.

## 8. Backend-Jobs optional

Nur noetig, wenn Preisimporte oder Supabase-Backend-Jobs lokal getestet werden sollen.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\jobs\requirements.txt
```

Backend-Env-Datei:

```text
backend\jobs\.env
```

Beispiel siehe:

```text
backend\jobs\.env.example
```

Benoetigte Werte fuer Backend-Jobs:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPEN_PRICES_BASE_URL=https://prices.openfoodfacts.org
```

Service-Role-Key nur an Personen geben, die wirklich Daten importieren oder Admin-Jobs ausfuehren duerfen.

## 9. Typische Fehler

### `npm error enoent Could not read package.json`

Du bist im falschen Ordner. Erst ins Projekt wechseln:

```powershell
Set-Location "PFAD\ZUM\Preisfuchs"
```

### `cloudflared wurde nicht als Name erkannt`

PowerShell neu starten oder den Pfad suchen:

```powershell
Get-Command cloudflared.exe -All
```

### Aenderungen erscheinen nicht im Preview

`npm run preview` zeigt den gebauten Stand. Nach Code-Aenderungen neu bauen:

```powershell
npm --prefix web run build
```

Dann Preview neu laden oder Preview neu starten.

Beim Entwickeln lieber `npm --prefix web run dev` nutzen, weil dort Hot Reload aktiv ist.

## 10. Sauberes ZIP weitergeben

Wenn kein Git verwendet wird, vor dem Zippen diese Ordner/Dateien weglassen:

- `.git`
- `.venv`
- `web\node_modules`
- `web\dist`
- `web\tsconfig.tsbuildinfo`
- `web\vite-server.out.log`
- `web\vite-server.err.log`
- lokale `.env` Dateien mit geheimen Schluesseln

Die Datei `web\.env.local.example` darf mitgegeben werden.
