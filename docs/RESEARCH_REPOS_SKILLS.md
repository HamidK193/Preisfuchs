# Recherche: Repositories, Skills, Memory und Security

Stand: 2026-08-28. Geprüft wurden GitHub, skills.sh, Reddit und X. Sterne und
Installationszahlen sind nur Aktivitätssignale, keine Sicherheitsgarantie.

## Direkt übernommen

- Die bereits lokal vorhandenen Skills `frontend-design`,
  `web-design-guidelines`, `verification-before-completion` und der offizielle
  Supabase-Skill decken Gestaltung, Accessibility, Verifikation und Datenbank-
  Regeln ab. Es wurden keine ungeprüften Skill-Pakete massenhaft installiert.
- [Vitest](https://github.com/vitest-dev/vitest) testet die ausgelagerte
  Preis-, Rabatt- und Warenkorblogik. Nach Installation wurde ein npm-Audit
  ausgeführt und alle gemeldeten Schwachstellen durch kompatible Updates
  behoben.
- [uv](https://github.com/astral-sh/uv) stellt lokal reproduzierbar Python 3.12
  bereit, ohne die kaputte Windows-Python-Verknüpfung zu verwenden.
- Die Sicherheitsbasis folgt
  [OWASP Secure Agent Playbook](https://github.com/OWASP/secure-agent-playbook),
  [OWASP MASVS](https://github.com/OWASP/masvs), den offiziellen
  [Supabase-RLS-Regeln](https://supabase.com/docs/guides/database/postgres/row-level-security)
  und GitHubs Hinweisen zu minimalen Workflow-Rechten und SHA-Pinning.
- Dependabot überwacht npm, pip und GitHub Actions. Repository-Secrets werden
  nicht in Clients verwendet; `raw_payload` und `update_runs` sind nicht für
  Browserrollen freigegeben.

## Daten- und Produktreferenzen

- [Open Prices](https://github.com/openfoodfacts/open-prices) bleibt die erste
  offene Preisquelle. Sein Modell aus Preis, Produkt, Ort und Nachweis passt zu
  Preisfuchs. Die Daten stehen unter ODbL; nicht frei weitergebbare Daten dürfen
  nicht in denselben offenen Datenbestand gemischt werden.
- [KorbKlar](https://github.com/lesecuritae/KorbKlar) ist eine nützliche kleine
  Architektur-Referenz für deutsche Angebote, Grundpreise, Loyalty-Preise,
  Caching und Tests. Wegen geringer Projektreife wird kein Code ungeprüft
  übernommen.
- [Deazl](https://github.com/Clement-Muth/deazl) zeigt kollaborative Listen und
  Barcode-Flows, ist aber archiviert und daher nur eine UX-Referenz.
- Inoffizielle Lidl-/EDEKA-Login-APIs und Browser-Automationen werden nicht
  integriert. Offizielle Bedingungen zeigen, dass Coupons Aktivierung,
  Kundenkonto, Lieblingsmarkt oder Personalisierung voraussetzen können:
  [Lidl Plus](https://www.lidl.de/c/lidl-plus-teilnahmebedingungen/s10005289),
  [EDEKA App](https://www.edeka.de/services/edeka-app/).

## Token- und Memory-Entscheidungen

- Projektwissen bleibt kuratiert in `AGENTS.md`, `memory.md`, Plan- und
  Entscheidungsdokumenten. Gezielte `rg`-/Symbolsuche ist für dieses noch kleine
  Repository günstiger als ein dauerhaft laufender Memory-Dienst.
- [Repomix](https://github.com/yamadashy/repomix) ist MIT-lizenziert und kann
  mit Secret-Scan, Kompression und Token-Budget für einen externen Modell-
  Handoff sinnvoll sein. Für den normalen agentischen Projektzugriff bringt es
  aktuell wenig zusätzlichen Nutzen; diese gemischte Erfahrung findet sich
  auch in der [Reddit-Diskussion](https://www.reddit.com/r/ChatGPTCoding/comments/1lzmicv/is_repomix_useful/).
- [Serena](https://github.com/oraios/serena) bietet symbolgenaue LSP-Suche und
  kann bei einer deutlich größeren Codebasis Credits sparen. Reddit-Berichte
  sind gemischt: [guter Fokus bei großen Codebasen](https://www.reddit.com/r/ClaudeAI/comments/1l42cn6/claude_and_serena_mcp_a_dream_team_for_coding/),
  aber auch [zusätzliche Latenz und Tool-Overhead](https://www.reddit.com/r/ClaudeAI/comments/1lrfasa/am_i_the_only_who_is_not_finding_any_value_in/).
  Deshalb noch nicht integrieren.
- [claude-mem](https://github.com/thedotmack/claude-mem) ist funktionsreich,
  wird auf diesem Windows-Arbeitsplatz aber nicht aktiviert. Aktuelle offene
  Issues berichten über [hängende Prozesse/Ports](https://github.com/thedotmack/claude-mem/issues/2926),
  [Speicherverbrauch](https://github.com/thedotmack/claude-mem/issues/3073) und
  [weitere Windows-Prozesslecks](https://github.com/thedotmack/claude-mem/issues/3248).
  Eine kritische [X-Erfahrung](https://x.com/b_azarkhalili/status/2009319370884059231)
  war allein nicht maßgeblich, wurde aber durch die aktuellen GitHub-Issues
  technisch plausibel.
- Allgemeine Reddit-Erfahrungen sprechen für kuratierte, menschenlesbare
  Langzeit-Memory statt unbegrenztem Log-Sammeln:
  [Diskussion zu persistentem Memory](https://www.reddit.com/r/ClaudeAI/comments/1s985ug/i_built_a_persistent_memory_layer_for_claude_and/).

## Später erneut prüfen

- [Gitleaks](https://github.com/gitleaks/gitleaks) als gepinnte CLI für lokale
  Secret-Scans. Die separate Action-Lizenz muss vor Einsatz im Organisations-
  Repository geprüft werden.
- [OSV-Scanner](https://github.com/google/osv-scanner) für Python-/npm-
  Abhängigkeiten und [zizmor](https://github.com/zizmorcore/zizmor) für
  GitHub-Actions-Fehlkonfigurationen.
- [Playwright](https://github.com/microsoft/playwright) als feste E2E-
  Abhängigkeit, sobald mehr als der aktuelle Smoke-Test benötigt wird.
- Serena erst dann, wenn Symbolsuche in der gewachsenen Swift-/TypeScript-
  Codebasis messbar Zeit oder Tokens spart.

## Ausschlusskriterien

Nicht übernommen werden Pakete ohne klare Lizenz, ungewartete Mini-Repositories,
Tools mit globalen Konfigurationsänderungen ohne klaren Mehrwert, Skills mit
erzwungener Mehragenten-Ausführung sowie Scraper oder Reverse-Engineering-
Adapter für geschützte Händlerkonten.
