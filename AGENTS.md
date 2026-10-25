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
- **Die verpflichtende `.gitattributes`-Regel `app/tv-runtime.js text eol=lf` darf nicht entfernt werden.** Sie verhindert den jahrelang wiederkehrenden Windows-CRLF-vs.-Builder-LF-Pull-Konflikt. Bei bestehenden schmutzigen Windows-Checkouts nur **einmalig** die erzeugte Datei sichern und mit `git -c core.autocrlf=false -c core.eol=lf restore --source=HEAD --worktree -- app/tv-runtime.js` wiederherstellen, **Status prüfen, dann erst** `git -c core.autocrlf=false pull --ff-only origin main`. Nur wenn sonstige Quelländerungen *nicht* vorhanden und nichts vorgemerkt ist. Bei unerwartetem Status stoppen, keine wiederholten Versuche; siehe [docs/windows-update-workflow.md](docs/windows-update-workflow.md).
- **Nie** `git clean`, `git reset --hard`, `git restore .`, pauschale Stash-/Pop-Tricks oder Löschung von Tizen-/VS-Code-Verzeichnissen als schnelle Reparatur anbieten.
- Signiertes WGT in VS Code über **Build Project**, nicht `Run Project`. WITs Watch nur mit vorher eingerichteter WITs-Basis, kein Start-/Install-Fallback. Credential-Persistenz bei SDB-/Tizen-Update auf Hardware getrennt überprüfen; **kein** automatisches Neu-Pairing.
- Ist `npm.cmd run check` bereits erfolgreich und der Buildfingerprint korrekt, **nicht erneut Git-Pull/Build verlangen**, sondern zum separaten Paketierungs-/TV-Hardware-Gate übergehen.


