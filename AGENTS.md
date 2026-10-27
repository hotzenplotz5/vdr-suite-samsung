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

## Pflicht vor Arbeit an der Samsung-TV-App (`app/`)

- **`app/AGENTS.md` vor jedem App-Update, WITs-/Installationsbefehl oder TV-Hardware-PASS lesen.** Sie enthält die verbindliche Reihenfolge für die gekoppelte DEV-App; die vollständige Ein-Watch-Anleitung steht in `docs/wits-isolated-development.md` ganz oben.
- Immer auch `docs/wits-isolated-development.md` und bei Windows-/Git-Updates `docs/windows-update-workflow.md` lesen, **bevor** ein Kommando vorgeschlagen wird. Bereits bestandene Tests und DEV-Vorbereitung nicht unnötig wiederholen.
- **`build:tv`, `check`, `tv:dev:prepare`, `Copy-Item` und CI führen kein TV-Update aus.** Entscheidender Übertragungsbefehl ist **`npm.cmd run tv:watch` im Repo-Hauptverzeichnis**, aber **nur bei noch nicht laufendem Watch**. Port 4050 nicht durch zweiten Watch doppelt belegen (`EADDRINUSE`). Bestehenden Watch weiterverwenden; bei gezieltem Neustart nur im zugehörigen Terminal `Strg+C`, danach genau einen Watch starten. WITs-Reload durch neue sichtbare TV-Funktion belegen, `--smoke` nur optional.
- Wenn am TV **keine Änderung sichtbar wird**, nicht Erfolg behaupten und nicht blind `wits --start`, `Run Project`, einen zweiten Watch, Prozess-Kills oder neue Kopplung vorschlagen. Die Watch-Ausgabe, den tatsächlichen Prozess und Staging/Reload gezielt prüfen. `wits --start` hat am echten Testgerät die DEV-Kopplung zerstört.
- Das Hardware-Feedback korrekt weiterführen: INFO funktioniert, physische SETTINGS-Taste nicht. **S6.17 realer Hardware-PASS 27.10.2026: Neuer HLS-TS/AAC-Testbutton sichtbar, Nutzer bestätigt hörbaren Ton!** Diesen positiven Befund nicht wieder als `Audio OPEN` beschreiben; andere Aufnahmen/AVPlay-Controls/Standardmodus und S6.16-IME bleiben gesonderte Prüfungen.

## Verbindlicher Windows-/Tizen-Update-Pfad

- **Vor jedem Windows-Git-Pull oder Tizen-Build zuerst [docs/windows-update-workflow.md](docs/windows-update-workflow.md) lesen.** Der Workflow wurde am realen Windows-/VS-Code-Samsung-Setup mit 77/77 grünen Tests erprobt.
- **Keine pauschale Git-Clean-Guard:** `git status --porcelain` darf nicht allein wegen lokaler `.vscode/`, `app/.tizen-rds/`, `app/Debug/`, `app/tizen_web_project.yaml` oder der generierten `app/tv-runtime.js` abbrechen. Unversionierte lokale Entwicklungsdateien unangetastet lassen.
- **Wirklich erfolgreicher VS-Code-Windows-Pull am 25.10.2026:** Nach `i/lf w/lf attr/` bei `git ls-files --eol` war die getrackte `app/tv-runtime.js` **inhaltlich geändert, nicht CRLF-verändert**. Ausschließlich bei dieser einzigen veränderten getrackten Datei und ohne Staging: Runtime extern sichern, `git restore --source=HEAD --worktree -- app/tv-runtime.js`, Status auf sauber prüfen und **sofort** `git pull --ff-only origin main`; **niemals `npm run build:tv` dazwischen**. Erfolgreicher Fast-Forward `05d8af6 → 1bafaaa`. **Erst danach** `npm.cmd run build:tv` und `npm.cmd run check`. Das alles **innerhalb von VS Code**, kein externes PowerShell-Fenster oder Schließen von VS Code erforderlich. `.gitattributes` (`app/tv-runtime.js text eol=lf`) beibehalten – schützt zusätzlich gegen tatsächliche EOL-Fehler, **aber nicht** gegen echte Inhaltsänderungen. Alte 77/77 Tests waren S4.1 und bestätigten **nicht** einen zuvor gescheiterten S5.1-Pull. Bei anderen geänderten getrackten Dateien oder nach erneut unerwartetem Status stoppen. Siehe [docs/windows-update-workflow.md](docs/windows-update-workflow.md).
- **Nie** `git clean`, `git reset --hard`, `git restore .`, pauschale Stash-/Pop-Tricks oder Löschung von Tizen-/VS-Code-Verzeichnissen als schnelle Reparatur anbieten.
- Signiertes WGT in VS Code über **Build Project**, nicht `Run Project`. **WITs niemals im Produktionsordner `app/` starten.** Die Samsung-WITs-2.6.0-Host-App übernimmt sonst das Paket `VDRSuiteTV`, obwohl ihre App-ID `VDRSuiteTV.VDRSuiteWITs` lautet; dies ist NICHT isoliert. Nur die getrennte, Git-ignorierte `.tizen-wits-dev/`-Basis mit Paket `VDRSuitDev` und App-ID `VDRSuitDev.VDRSuiteWITs` darf für WITs-Watch verwendet werden; siehe [docs/wits-isolated-development.md](docs/wits-isolated-development.md). WITs-Initialinstallation ausschließlich nach explizitem Hardware-Gate, kein automatischer Start-/Install-Fallback. Credential-Persistenz bei SDB-/Tizen-Update auf Hardware getrennt überprüfen; **kein** automatisches Neu-Pairing.
- Ist `npm.cmd run check` bereits erfolgreich und der Buildfingerprint korrekt, **nicht erneut Git-Pull/Build verlangen**, sondern zum separaten Paketierungs-/TV-Hardware-Gate übergehen.



## S7.2 Produktions-Update (zusätzlich verbindlich)

- [docs/production-update-s7-2.md](docs/production-update-s7-2.md) ist der verbindliche Preflight für ein **signiertes** Produktions-WGT. Vor realem Update Original-Package `VDRSuiteTV`, App-ID `VDRSuiteTV.VDRSuite`, **höhere Version** und identische Author-Zertifikat-Identität gegenüber einem tatsächlich installierten Basis-WGT nachweisen.
- `node scripts/tv-update-preflight.mjs --candidate ... --baseline ...` ist **offline und read-only**; niemals eine TV-Installation daraus ableiten. Eine alte/andere Debug-WGT ist kein Beweis, dass sie wirklich installiert wurde. Keine Signing-Dateien/Credentials ins Repo übertragen.
- Samsung Tizen-Studio-Testinstallationen können zuerst deinstallieren: **`Run Project` ist kein sicherer Updatepfad.** Gleichnamiges Paket allein sichert keine KeyManager-Persistenz. Kein ungeprüftes `sdb install`, `vd_appinstall`, WITs Start oder anderer Ersatz. Kein automatisches Re-Pairing/Secret-Export.
- `package.json` / `app/config.xml` nur bei einer bewusst vorbereiteten neuen Release-Version zusammen hochsetzen; das generierte `app/tv-runtime.js` anschließend neu generieren und committen. Keine künstliche Versionsanhebung im reinen S7.2-Infrastruktur-Slice.
- S7.2-Hardware-PASS verlangt beobachtete unveränderte Device-ID und Authentifizierung nach datenbewahrendem TV-Update **und** Neustart. CI-GRÜN beweist dies nicht.
