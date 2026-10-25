# Repository-Regeln für vdr-suite-samsung

## Scope

- Nur `hotzenplotz5/vdr-suite-samsung` verändern. Keine impliziten Commits, Deployments oder PRs in `vdr-suite`, `vdr-suite-vidaa` oder Addon-Repositories.
- Samsung ist ein **eigenständiger** Client. Kein Fork des VDR-Suite-Webfrontends.
- `main` bleibt integrationsfähig; konkrete Slices separat, sofern später mehrere Entwickler parallel arbeiten.
- Jeder Slice mit Tests, Dokumentation, Hardware-Status und klarer Abbruch-/Rollback-Option.

## Contract first

- Öffentlicher, versionierter VDR-Suite-API-v1-Vertrag ist verbindlich; nie Browser-private `/api/...`-Routen, RESTful-Plugin-Rohdaten, SVDRP, native VDR-Dateipfade oder ungeschützte Media-URLs ersatzweise verwenden.
- Pairing, Device-Grant, Session, Recording-ID, Media-Policy und Resume gehören dem Server.
- Niemals Credentials, Pairing-Tokens, Media-Cookies, Hosts/IP-Adressen oder Zertifikate/Schlüssel committen oder loggen.
- Runtime-/Hardware-Erkenntnisse von ungetesteten SDK-Annahmen trennen.

## Tizen/TV

- Minimalziel Samsung TV 2020 / Tizen 5.5 / Chromium M69. Keine unverträglichen modernen JS-/CSS-Features ohne Fallback.
- Ein einheitlicher Eingabe- und Fokus-Owner; keine zweite Keydown-Instanz in View-Modulen.
- Eine einheitliche Playback-Steuerung; Samsung AVPlay ausschließlich hinter einem Plattformadapter.
- App-Start muss offline möglich sein; HTTP-Fehler dürfen den Startbildschirm nicht blockieren.
- In S1 ausschließlich das lokale, nichtblockierende VIDAA-Branding-Startvideo; **keine Inhalte/MediaSessions** und keine echten Backend-Aufrufe ohne S3-Gate.

## Entwicklung

- `npm test` ohne npm-Pakete, CI unabhängig von Servern und Samsung-TV.
- Samsung-Zertifikatserstellung, Geräteinstallation, Netzwerkverbindung und Wiedergabe sind **manuelle Gates**.
- README, ROADMAP und Abnahmeprotokoll aktualisieren, ohne ungeprüfte Hardware-Akzeptanz zu behaupten.
- Kein Secret und kein absoluter privater Benutzerpfad in Doku/Test-Fixtures.

## Verbindlicher Windows-/Tizen-Update-Pfad

- **Vor jedem Windows-Git-Pull oder Tizen-Build zuerst [docs/windows-update-workflow.md](docs/windows-update-workflow.md) lesen.** Der Workflow wurde am realen Windows-/VS-Code-Samsung-Setup mit 77/77 grünen Tests erprobt.
- **Keine pauschale Git-Clean-Guard:** `git status --porcelain` darf nicht allein wegen lokaler `.vscode/`, `app/.tizen-rds/`, `app/Debug/`, `app/tizen_web_project.yaml` oder der generierten `app/tv-runtime.js` abbrechen. Unversionierte lokale Entwicklungsdateien unangetastet lassen.
- **Wirklich erfolgreicher VS-Code-Windows-Pull am 25.10.2026:** Nach `i/lf w/lf attr/` bei `git ls-files --eol` war die getrackte `app/tv-runtime.js` **inhaltlich geändert, nicht CRLF-verändert**. Ausschließlich bei dieser einzigen veränderten getrackten Datei und ohne Staging: Runtime extern sichern, `git restore --source=HEAD --worktree -- app/tv-runtime.js`, Status auf sauber prüfen und **sofort** `git pull --ff-only origin main`; **niemals `npm run build:tv` dazwischen**. Erfolgreicher Fast-Forward `05d8af6 → 1bafaaa`. **Erst danach** `npm.cmd run build:tv` und `npm.cmd run check`. Das alles **innerhalb von VS Code**, kein externes PowerShell-Fenster oder Schließen von VS Code erforderlich. `.gitattributes` (`app/tv-runtime.js text eol=lf`) beibehalten – schützt zusätzlich gegen tatsächliche EOL-Fehler, **aber nicht** gegen echte Inhaltsänderungen. Alte 77/77 Tests waren S4.1 und bestätigten **nicht** einen zuvor gescheiterten S5.1-Pull. Bei anderen geänderten getrackten Dateien oder nach erneut unerwartetem Status stoppen. Siehe [docs/windows-update-workflow.md](docs/windows-update-workflow.md).
- **Nie** `git clean`, `git reset --hard`, `git restore .`, pauschale Stash-/Pop-Tricks oder Löschung von Tizen-/VS-Code-Verzeichnissen als schnelle Reparatur anbieten.
- Signiertes WGT in VS Code über **Build Project**, nicht `Run Project`. **WITs niemals im Produktionsordner `app/` starten.** Die Samsung-WITs-2.6.0-Host-App übernimmt sonst das Paket `VDRSuiteTV`, obwohl ihre App-ID `VDRSuiteTV.VDRSuiteWITs` lautet; dies ist NICHT isoliert. Nur die getrennte, Git-ignorierte `.tizen-wits-dev/`-Basis mit Paket `VDRSuitDev` und App-ID `VDRSuitDev.VDRSuiteWITs` darf für WITs-Watch verwendet werden; siehe [docs/wits-isolated-development.md](docs/wits-isolated-development.md). WITs-Initialinstallation ausschließlich nach explizitem Hardware-Gate, kein automatischer Start-/Install-Fallback. Credential-Persistenz bei SDB-/Tizen-Update auf Hardware getrennt überprüfen; **kein** automatisches Neu-Pairing.
- Ist `npm.cmd run check` bereits erfolgreich und der Buildfingerprint korrekt, **nicht erneut Git-Pull/Build verlangen**, sondern zum separaten Paketierungs-/TV-Hardware-Gate übergehen.


