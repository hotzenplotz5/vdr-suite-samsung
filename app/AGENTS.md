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

## Bereits vorhandene, gekoppelte DEV-App aktualisieren

Nur wenn das einmalig isoliert installierte WITs-Hostpaket vorhanden ist und die DEV-Kopplung erhalten bleiben soll:

1. Nach ggf. erforderlichem, **sicherem branchrichtigem Git-Update** lokal `npm.cmd run build:tv`, `npm.cmd run check` und `npm.cmd run tv:dev:prepare` durchführen. Wenn das bereits erledigt ist, **nicht wiederholen**.
2. Den **bereits laufenden** Watch verwenden. Nur wenn **noch keiner läuft**, im Repo-Hauptverzeichnis `npm.cmd run tv:watch` starten und das Terminal offen lassen. Das Skript arbeitet ausschließlich mit `../.tizen-wits-dev/` und ruft `wits --watch` auf, **nicht** `--start`.
3. **Watch-Ausgabe auf erfolgreiche Dateisynchronisation und Reload prüfen.** Ein vorhandener `node.exe`-Prozess oder Listener auf Port 4050 beweist **nicht**, dass der Watch gerade die richtigen Dateien überträgt.
4. Für eine sichtbare Prüfung bei nachweislich laufendem Watch in **zweitem** Terminal, im Repository-Hauptverzeichnis: `node scripts/tv-wits-isolated.mjs --smoke`. Das verändert ausschließlich die DEV-Staging-`index.html` und muss am Samsung den Schriftzug `VDR-Suite · DEV-RELOAD-TEST` sichtbar machen. **Das Skript selbst sendet nichts an den TV.** Bleibt der Marker aus, keine erfolgreiche Übertragung behaupten; die konkrete Watch-Ausgabe und die lokale WITs-Konfiguration gezielt prüfen.
5. Nach erfolgreicher Prüfung Marker mit `npm.cmd run tv:dev:prepare` zurücksetzen und den tatsächlichen TV-Reload ebenfalls bestätigen. `tv:watch:check` ist ein **Offline-Preflight**, kein Sync.
6. Bei ausbleibendem Update nicht durch Neustarts, erneutes Kopieren, pauschales Stoppen von Prozessen oder Neuinstallation raten. Zuerst den realen Watch-Zustand, dessen Arbeitsverzeichnis und Übertragungsprotokoll feststellen. Fehler und **noch unbestätigten** TV-Stand ehrlich ausweisen.

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
