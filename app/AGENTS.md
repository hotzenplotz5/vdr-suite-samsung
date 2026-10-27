# AGENTS.md – verbindliche Regeln für die Samsung-TV-App (`app/`)

Diese Regeln gelten für **alle Arbeiten an der TV-App in `app/`**, insbesondere Installations-, Update-, WITs-, Fernbedienungs- und Pairing-Fragen. Die übergeordnete `../AGENTS.md` gilt zusätzlich.

## Vor JEDEM Update- oder Installationsvorschlag: Dokumentation lesen

**Pflicht, auch wenn die Schritte bereits aus früheren Chats bekannt erscheinen:**

1. `../docs/wits-isolated-development.md` – verbindlicher DEV-WITs-Watch-Workflow.
2. `../docs/windows-update-workflow.md` – Windows-/Git-Pull- und Build-Reihenfolge, Schutz lokaler Dateien.
3. `../docs/production-update-s7-2.md` – nur für ausdrücklich gewünschte Produktionsupdates.

**Niemals einen neuen Installations-/Synchronisationsweg erfinden, ohne diese Dateien gelesen zu haben.** Nicht wiederholt dieselben lokalen Prüfungen verlangen, wenn Build, Tests und DEV-Vorbereitung bereits nachweislich erfolgreich waren.

## Build ist NICHT die Installation und NICHT die Übertragung

Die folgenden Befehle sind **rein lokal** und übertragen allein **nichts** auf den Samsung:

```powershell
npm.cmd run build:tv
npm.cmd run check
npm.cmd run tv:dev:prepare
```

- `build:tv` erzeugt `app/tv-runtime.js`.
- `check` führt Quell-/Runtime-Tests aus.
- `tv:dev:prepare` kopiert freigegebene Dateien in `../.tizen-wits-dev/`. Ausgabe `No TV contact` ist wörtlich zu nehmen.
- Auch `Copy-Item` und ein erfolgreicher GitHub-CI-Lauf sind **keine bestätigte TV-Aktualisierung**.
- Erst ein tatsächlich funktionierender **WITs-Watch**, der die DEV-Dateien überträgt und die laufende DEV-App neu lädt, ermöglicht ein TV-seitiges Update. Den tatsächlichen Eingang anhand sichtbarer Buildkennung oder eines kontrollierten visuellen Markers am **TV** bestätigen. Kein `Hardware PASS` allein aus CI-/PowerShell-Ausgaben ableiten.

## Bereits vorhandene, gekoppelte DEV-App aktualisieren – Pflichtablauf (27.10.2026)

**Entscheidender Befehl: `npm.cmd run tv:watch` aus dem Repository-Hauptverzeichnis, aber NUR, wenn kein DEV-Watch läuft.** Die einzige verbindliche ausführliche Schrittfolge steht in `../docs/wits-isolated-development.md` unter **„Wichtigster Praxisablauf“** und ist VOR jeder Empfehlung zu lesen. Der Watch nutzt intern `.tizen-wits-dev/`, nicht `app/`.

1. Nach wirklich benötigtem, **sicherem branchrichtigem Git-Update** einmal `npm.cmd run build:tv`, `npm.cmd run check`, `npm.cmd run tv:dev:prepare` ausführen. Falls bereits erfolgreich: **nicht wiederholen**. Keine Änderungen an lokal bearbeiteten fremden Dateien verwerfen.
2. **Vor `npm.cmd run tv:watch` den laufenden Watch und Port 4050 lesen.** Ein vorhandener `node … wits/lib/cli.js --watch` bedeutet: **Watch läuft bereits; keinen zweiten starten!** Das ist allerdings noch **keine** Bestätigung eines TV-Reloads. In der realen PowerShell-Ausgabe vom 27.10.2026 lief ein `--watch` auf Port 4050; der zusätzliche Watch stürzte mit `EADDRINUSE` ab. **Nicht** als fehlenden DEV-Host oder Anlass für `wits --start` interpretieren.
3. Wenn noch kein Watch läuft, **einmal** aus dem Repo-Hauptverzeichnis starten und das Terminal offen lassen:

   ```powershell
   npm.cmd run tv:watch
   ```

4. Bei **bereits laufendem, eindeutig richtigen** DEV-Watch dessen Terminal behalten; nach einem neuen Build in einem **zweiten** Terminal bei Bedarf `npm.cmd run tv:dev:prepare` ausführen. Dies schreibt nur die DEV-Staging-Dateien; die Synchronisation erfolgt (falls funktionsfähig) über den laufenden Watch. WITs-Ausgabe auf echte Synchronisierung und Reload prüfen.
5. **Nur wenn ein identifizierter Watch neu gestartet werden muss**, im **zugehörigen eigenen Watch-Terminal** `Strg+C` drücken, warten bis Port 4050 frei ist, dann **einmal** `npm.cmd run tv:watch`. Keine PIDs blind beenden; bei unbekannter Belegung zuerst Ursache untersuchen.
6. Erfolg am echten Samsung an neuer **Buildkennung oder sichtbarer Funktion** bestätigen, z. B. **S6.17: „HLS-TS + AAC-Ton testen“** im Aufnahmen-UI; anschließend bestehende Anmeldung prüfen. `npm.cmd run tv:dev:prepare`, `git pull`, grünes CI, `Success to connect` und ein vorhandener Listener sind **kein** TV-Erfolgsnachweis.
7. Bei fehlender Änderung erst den **realen Watch-Log, Arbeitsordner und Staging** prüfen. `node scripts/tv-wits-isolated.mjs --smoke` ist ein **optionaler** Test zur Diagnose und **nicht** Teil jedes Updates; es schreibt nur einen DEV-HTML-Marker und überträgt selbst nichts. Danach Markierung mit `npm.cmd run tv:dev:prepare` entfernen und TV-Ergebnis beobachten. `tv:watch:check` ist ausschließlich Offline-Preflight, niemals Sync.

**Verbotene Kurzschlüsse:** Kein zweiter Watch bei belegtem 4050; kein `wits --start`/`Run Project`, kein Install-/Uninstall-Fallback, kein Neu-Pairing, keine Änderung am PROD-Paket. Kein `Stop-Process` ohne verifizierte Prozessherkunft und Zustimmung.

## Strikte Sicherheitsgrenzen

- **NIE `wits --start` / `wits -s`, VS Code `Run Project`, Install-/Uninstall-Kommandos oder einen zweiten Watch als Routine-Update empfehlen.** Im echten Samsung-Test hat `wits --start` den DEV-Host deinstalliert/neu installiert und die DEV-Gerätekopplung ging verloren. Eine solche Operation nur nach ausdrücklicher, informierter Freigabe und Prüfung des Zielpakets.
- `VDRSuiteTV` / `VDRSuiteTV.VDRSuite` ist die **produktive App** und bleibt unberührt.
- Zulässiges isoliertes DEV-Paket: `VDRSuitDev`, App `VDRSuitDev.VDRSuite`, installierter WITs-Host `VDRSuitDev.VDRSuiteWITs`. **WITs niemals aus `app/` ausführen!**
- Bestehende lokale `app/config.xml` und `package.json` mit Entwickler-Version **0.1.1** nicht auf Repository-Version 0.1.0 zurücksetzen. Lokale SDK-/VS-Code-Dateien nicht löschen. Kein `git reset --hard`, `git clean` oder pauschales `git restore .`.
- Git-Branch `work/s6-tv-api-v1` und PR #33 **DRAFT** beachten; kein beiläufiger Merge nach `main`, keine andere App oder Repositorien anfassen.
- Keine erneute Geräteanmeldung, Credential-Löschung oder Berechtigungsänderung als Update-Workaround anbieten.

## Bekannte reale Fehler, nicht verwechseln

- **S6.16 / Serveradresse:** Bei aktiver Samsung-Bildschirmtastatur gehören BACKSPACE und Pfeiltasten **der IME**. Keine globale App-Menünavigation während der Eingabe. Quell-/CI-Fix ist **kein TV-Nachweis**, bis die neue Runtime wirklich per Watch geladen wurde.
- **SETTINGS vs INFO:** Laut Nutzer funktioniert **INFO**, aber die physische **SETTINGS**-Taste nicht. Nicht wieder fälschlich INFO als Hardware-FAIL melden. `Menu`/Keycode 18 ist im Quellcode bereits registriert; ohne echtes DOM-Tastenereignis ist die Unterstützung der physischen SETTINGS-Taste ungeklärt.
- Ein erfolgreicher WITs-Reload ist nur dann bewiesen, wenn die Änderung auf dem TV **sichtbar nachweisbar** ist. Die bestehende DEV-Kopplung währenddessen bewahren.

**Grundregel:** Erst Dokumentation → nachgewiesenen Ist-Zustand verstehen → exakt einen passenden, nichtdestruktiven Schritt ausführen → TV-Ergebnis beobachten. Nie einen lokalen Build oder Kopiervorgang als installierte neue TV-Version verkaufen.
