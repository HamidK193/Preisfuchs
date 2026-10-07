# Sicherheitsrichtlinie

## Sicherheitslücken melden

Bitte melde Sicherheitslücken bevorzugt über GitHubs private Security-Advisory-Funktion des Repositories. Falls diese Funktion nicht verfügbar ist, eröffne zunächst ein neutrales Issue ohne Exploit-Details, Zugangsdaten oder personenbezogene Daten, damit ein privater Kontaktweg vereinbart werden kann.

Veröffentliche niemals Supabase-Service-Role-Keys, Tokens, `.env`-Inhalte oder echte Händler-Zugangsdaten in einem Issue, Screenshot oder Log. Ein offengelegtes Geheimnis muss sofort beim jeweiligen Anbieter rotiert werden.

Eine hilfreiche Meldung enthält:

- betroffene Version oder Commit,
- reproduzierbare Schritte,
- mögliche Auswirkung,
- einen Vorschlag zur Risikoreduzierung, falls bekannt.

## Sicherheitsgrenzen des MVP

- Die Web- und iOS-Clients dürfen ausschließlich öffentliche/anon Keys enthalten.
- Der Supabase-Service-Role-Key bleibt ausschließlich in Backend-Jobs und geschützten GitHub Secrets.
- Händler-App-Zugangsdaten werden nicht erhoben oder gespeichert.
- Preisfuchs behandelt Preise als datierte Beobachtungen und nicht als garantierte Live-Filialpreise.
- Personalisierte Coupons werden nur nach ausdrücklicher Auswahl berücksichtigt.

## Unterstützte Version

Während der MVP-Phase wird nur der aktuelle Stand des `main`-Branches mit Sicherheitsupdates versorgt.
