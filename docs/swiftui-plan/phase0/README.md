# Phase 0 – Umsetzungsplan

Stand 10.10.2026. Die Details stehen in den drei Teilplaenen:

- [01 iOS-Grundgeruest](01-ios-grundgeruest.md): Arbeitspakete WP0–WP8
- [02 CI & Build](02-ci-build.md)
- [03 Backend & Daten](03-backend-daten.md): Punkte 1–7

## Festgelegte Abweichungen und Vereinheitlichungen

Diese Punkte gelten vor den Teilplaenen:

1. **Paket:** `ios/Packages/PreisfuchsKit` mit den Targets `PreisfuchsDomain` und `PreisfuchsData`. Es hat keine Abhaengigkeit zu supabase-swift. Alles mit Supabase-Bezug liegt im App-Target (Teilplan 01, Abschnitt 0).
2. **Secrets:** `ios/Config/Secrets.xcconfig` mit `SUPABASE_HOST` (Host ohne `https://`) und `SUPABASE_ANON_KEY` (Legacy-anon-Key). Die CI-Skizze in Teilplan 02 nennt das Secret `SUPABASE_URL_HOST`; massgeblich ist `SUPABASE_HOST`.
3. **.gitignore:** gezielt `ios/Config/Secrets.xcconfig`, `ios/*.xcodeproj/`, `ios/Preisfuchs/Info.plist`, `ios/.spm/`, `xcuserdata/` und Signier-Dateien. Ausdruecklich **nicht** `*.xcconfig`.
4. **CI (`ios-checks.yml`):** Job `kit-linux` (Container `swift:6.1`, `swift test` fuer das Kit) plus Job `app-macos` aus Teilplan 02. Lint und Format laufen in Phase 0 nur als Hinweis (`continue-on-error: true`), bis die Formatter-Entscheidung gefallen ist.
5. **Veraltet-Grenze:** 30 Tage, wie in der Expo-App.
6. **Eckenradius:** vorlaeufig 5, wie in der Expo-App. Bundle-ID `de.preisfuchs.app`.
7. **BW-Seed-Job:** standardmaessig aus. Er laesst sich ueber die Repo-Variable `ENABLE_BW_SEED_JOB=true` wieder einschalten (Teilplan 03, Punkt 3).
8. **OFF-Agent:** kein manueller Lauf. Der Cron am Montag, 12.10., verarbeitet ohnehin alle rund 1.400 GTINs.
9. **report-price:** `verify_jwt = true` wird ausdruecklich in `supabase/config.toml` festgehalten. Die App nutzt den Legacy-anon-Key.

## Reihenfolge der Umsetzung

| Stufe | Pakete (parallel innerhalb einer Stufe) | Wer |
|---|---|---|
| A | `.gitignore` · Backend 1, 2, 3, 6 · iOS WP0 · CI WP7 | Agents `[Phase0-Bau] …` |
| B | WP1 Domain · WP2 Data · WP3+WP4 Design und Shell | Agents |
| C | WP5 Services/DI · WP6 Spike-Verdrahtung | Agent |
| D | WP8 Doku, erster CI-Lauf (`workflow_dispatch`), Fixes aus dem Log | Hauptsession |

Nach jeder Stufe wird committet und gepusht (`AGENTS.md`).

## Braucht den User oder einen Mac

- **SMTP (Punkt 7):** Anbieter waehlen und im Supabase-Dashboard eintragen.
- **Apple Developer Program:** noetig fuer TestFlight. Die Skizze `ios-testflight.yml` bleibt bis dahin aus.
- **Auf dem MacBook pruefen:** Simulator-Start, OTP-Login, Keychain-Session, de_DE-Formatierung. Alles mit **[Mac]** in Teilplan 01.
