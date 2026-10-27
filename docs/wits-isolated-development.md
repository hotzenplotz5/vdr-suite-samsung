# S7.1 — WITs only in a separate Samsung development package

**Stand 27.10.2026 – realer DEV-TV-Erfolg:** Die isolierte DEV-App ist gekoppelt, und der Nutzer hat den neu eingeführten S6.17-Button **`HLS-TS + AAC-Ton testen` auf dem Samsung tatsächlich gesehen und hörbaren Ton bestätigt**. Damit ist die **Übertragung des S6.17-Funktionsstands an den TV** nachgewiesen. Der exakte technische Watch-Synchronisationsablauf/Log und die dauerhafte Kopplungspersistenz nach einem Neustart sind nicht separat belegt; keine Rückschlüsse auf die Produktionsinstallation.
This procedure explicitly does **not** modify the installed production `VDR-Suite` package or its KeyManager data.
No device installation, uninstall, new pairing, grant or credential export is automated.

## Wichtigster Praxisablauf: bereits installierte und gekoppelte DEV-App aktualisieren

**Der Befehl für die Live-Übertragung heißt `npm.cmd run tv:watch` (im Repository-Hauptverzeichnis).** Er startet den isolierten **WITs-Watch** mit Arbeitsverzeichnis `.tizen-wits-dev/`. Er ist **keine** Erstinstallation und darf nicht mehrfach parallel laufen. Kein `wits --start` verwenden.

1. **Bereits erledigte Schritte anerkennen:** Nach einem sicheren, branchrichtigen Git-Pull nur bei geändertem Code `npm.cmd run build:tv`, `npm.cmd run check` und `npm.cmd run tv:dev:prepare` ausführen. Wurden diese Schritte bereits erfolgreich ausgeführt, sind sie **nicht nochmals** nötig.
2. **Vor jedem `tv:watch` prüfen, ob der Watch schon läuft.** Dazu das vorhandene WITs-Terminal verwenden; bei Unklarheit Port 4050 und Kommandozeile nur lesend prüfen:

   ```powershell
   Get-NetTCPConnection -LocalPort 4050 -State Listen -ErrorAction SilentlyContinue |
     Select-Object LocalAddress,LocalPort,OwningProcess
   Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
     Where-Object { $_.CommandLine -match 'wits[\\/]+lib[\\/]+cli\.js' } |
     Select-Object ProcessId,CommandLine
   ```

   **Am 27.10.2026 real beobachtet:** Port `4050` gehörte bereits einem `node …/@tizentv/wits/lib/cli.js --watch`-Prozess. Ein zweites `npm.cmd run tv:watch` endete daher mit `EADDRINUSE`, obwohl der Samsung erreichbar war. **EADDRINUSE bedeutet Port belegt, nicht `DEV host fehlt` und nicht `neu installieren`.** Ein laufender Watch-Prozess ist allerdings noch **kein Beweis**, dass die neuen Dateien synchronisiert wurden.
3. **Wenn der korrekte DEV-Watch bereits läuft:** **Kein zweites `npm.cmd run tv:watch` starten.** Nach Build/Check bei Bedarf `npm.cmd run tv:dev:prepare` ausführen. **WICHTIG: Ein bloß laufender alter Watch (z. B. PID 39448 am 27.10.2026) und die `tv:dev:prepare`-Ausgabe belegen KEINE tatsächliche Übertragung.** Im echten Watch-Terminal prüfen, ob die Änderung synchronisiert und die neue Funktion am TV sichtbar wurde. Falls der Watch trotz geänderter DEV-Dateien keine Übertragung anzeigt oder der neue Button am Fernseher fehlt: **denselben bestehenden Watch wie in Schritt 5 kontrolliert beenden und neu starten**, damit der installierte DEV-Host erneut verbunden wird und den Datei-Push anfordern kann. Kein zweiter Watch und keine Installation.
4. **Wenn kein Watch läuft:** Nach vorbereiteten DEV-Dateien **genau einmal** im VS-Code-PowerShell-Terminal, Repository-Hauptverzeichnis:

   ```powershell
   npm.cmd run tv:watch
   ```

   **Dieses Terminal offen lassen.** Der Wrapper führt `wits --watch` **innerhalb der isolierten `.tizen-wits-dev/`-Kopie** aus; weder `--start` noch `Run Project` sind für dieses Update nötig.
5. **Fehlende Übertragung bei einem älteren Watch: genau diesen Watch kontrolliert neu verbinden.** Nur den **identifizierten, eigenen DEV-Watch** im **zugehörigen Terminal mit Strg+C** beenden und warten, bis Port 4050 frei ist. Dann im Repository-Hauptverzeichnis **genau einmal**:

   ```powershell
   if (Get-NetTCPConnection -LocalPort 4050 -State Listen -ErrorAction SilentlyContinue) {
     throw "Port 4050 noch belegt; keinen zweiten Watch starten."
   }
   npm.cmd run tv:watch
   ```

   Das vorhandene Terminal offen lassen. **Das ist der fehlende TV-Übertragungsschritt nach bereits bestandenem Build und erfolgreichem `tv:dev:prepare`; beides NICHT nochmals ausführen.** Samsung-WITs `watch.js` startet dabei den bereits installierten DEV-Host neu (ohne Uninstall/Install); `watchHelper.js` erwartet die Verbindung des DEV-Hosts und dessen `push_request`, dann werden die DEV-Staging-Dateien via `sdb push` zum TV übertragen. Im Watch-Terminal auf `a user connected`, `socket on::::push_request`, `Total File Number : ...`, erfolgreiche Push-Statusmeldungen und den sichtbaren neuen TV-Build achten. **Wenn diese fehlen, ist der Transfer nicht bestätigt!** Ein `EADDRINUSE` besagt nur, dass der Port durch einen anderen Listener belegt ist, **NICHT**, dass der DEV-Host fehlt. Niemals blind Node-Prozesse/PIDs abschießen oder an einem unbekannten Listener `Stop-Process` ausführen. Bei unklarem Portbesitzer die Prozessausgabe untersuchen, **nicht neu installieren**.
6. **Wirkliche Übertragung belegen:** Auf dem Samsung **VDR-Suite DEV** öffnen und an der **neuen sichtbaren Funktion/Buildkennung** prüfen, ob der aktuelle Stand geladen ist. **Realer Erfolg 27.10.2026:** S6.17-Button **`HLS-TS + AAC-Ton testen`** sichtbar, Nutzer bestätigt hörbaren Ton. Das bloße Vorhandensein des Watch-Prozesses, die `Success to connect`-Meldung, `195/195` Quelltests, die vorbereitete Staging-Datei oder ein Git-Pull reichen **nicht** aus. Die bestehende Geräteanmeldung nach dem Update prüfen, **ohne neu zu koppeln**.
7. **Falls die Änderung am TV fehlt:** Watch-Terminal-Ausgabe und WITs-Arbeitsverzeichnis/DEV-Konfiguration prüfen; nicht wiederholt den Watch starten. Der unten beschriebene `--smoke`-Marker ist **nur ein optionaler Diagnosetest**, keine vorgeschriebene Update-/Installationsstufe. Er überträgt selbst keine Daten und muss anschließend aus dem Staging entfernt werden.

**Harte Grenze:** PROD `VDRSuiteTV.VDRSuite` (Paket `VDRSuiteTV`) unangetastet lassen. DEV `VDRSuitDev.VDRSuite`, WITs-Host `VDRSuitDev.VDRSuiteWITs` (Paket `VDRSuitDev`) schützen. Keine Neuinstallation, kein `wits --start`, kein `Run Project`, keine Änderung an KeyManager, Zertifikaten oder Pairing. Die lokalen Versionen `0.1.1` in `package.json` und `app/config.xml` nicht zurücksetzen.

## Proven cause (Samsung WITs 2.6.0 source)

1. `Samsung/Wits/lib/hostAppHelper.js` changes `tizen:application id` by appending `WITs`, but **does not change `package`** when generating its container `config.xml`.
2. `Samsung/webIDE-common-tizentv/lib/projectHelper.js`: `TVWebApp.buildWidget()` packages/signs the existing container manifest; it does **not** call `init()` to change its package attribute.
3. `Samsung/Wits/command/start.js` invokes `unInstallPackage` and `installPackage`; `command/watch.js` does not install but tries to launch the generated WITs app ID.
4. Result with the *old* `app/config.xml`: expected WITs app `VDRSuiteTV.VDRSuiteWITs` **with the same package `VDRSuiteTV` as the normal app**. This is not an isolated installation. Never run `wits --start` from `app/`.

See [WITs hostAppHelper](https://github.com/Samsung/Wits/blob/master/lib/hostAppHelper.js),
[WITs start](https://github.com/Samsung/Wits/blob/master/command/start.js),
[WITs watch](https://github.com/Samsung/Wits/blob/master/command/watch.js),
[WITs installer](https://github.com/Samsung/Wits/blob/master/lib/appLaunchHelper.js),
[TVWebApp](https://github.com/Samsung/webIDE-common-tizentv/blob/master/lib/projectHelper.js)
and [Tizen identity specification](https://github.com/Samsung/tizen-docs/blob/master/docs/application/web/reference/config-xml.md).

## Isolated IDs (must be checked BEFORE any installation)

| Role | Package ID | Application ID |
|---|---|---|
| Existing production (leave untouched) | `VDRSuiteTV` | `VDRSuiteTV.VDRSuite` |
| Generated local dev source | `VDRSuitDev` | `VDRSuitDev.VDRSuite` |
| WITs host generated from dev source | `VDRSuitDev` | `VDRSuitDev.VDRSuiteWITs` |

`VDRSuitDev` is deliberately **ten alphanumeric characters** and differs from the production package. The WITs app name is `VDRSuiteWITs` (the suffix after the dot); `WITs Start` uninstalls **that** name before installing the DEV WGT. On a TV whose state is not yet fully known, inspect the installed apps **read-only** before manually approving even that isolated bootstrap.

This is *not* a data-preserving update of the production app. It is a different app with its **own** KeyManager context. After a deliberate one-time installation, the developer may need to pair the development app **once** and explicitly authorize its separate device/grants. Existing production credentials cannot and must not be copied between apps.

## Windows 11 / VS Code — offline steps only

Follow [Windows Git pull workflow](windows-update-workflow.md) first, only if the checkout needs updating.
In VS Code PowerShell, repository root:

```powershell
npm.cmd run build:tv
npm.cmd run check
npm.cmd run tv:dev:identity
npm.cmd run tv:dev:prepare
```

`tv:dev:identity` **only displays** identities; `tv:dev:prepare` creates/updates a **Git-ignored** `.tizen-wits-dev/` folder from **allowlisted** `index.html`, `styles.css`, `tv-runtime.js`, `assets/` and a regenerated `config.xml` with the isolated package. It does not copy local `device-local.js`, WITs machine config, signatures, certificates, `app/Debug`, or Tizen build artefacts. It does not contact the TV or execute WITs.

**WITs init is separate and offline (once):**

```powershell
Set-Location .tizen-wits-dev
wits.cmd --init
Set-Location ..
npm.cmd run tv:watch:check
```

Enter only the current LOCAL Samsung/PC addresses and an existing LOCAL cert profile in the prompts. `wits --init` must reference the current `.tizen-wits-dev` directory as `baseAppPath`, not `app/`. The new `.tizen-wits-dev/.witsconfig.json` stays local and is checked before Watch.

**No WITs Start has been approved here.** `tv:watch:check` is source/offline-only. Stop at this point and inspect its output, the generated DEV `config.xml` and the current read-only `sdb shell 0 applist` result. Confirm the locally installed WITs implementation uses the reviewed semantics; SDK/global npm updates can change them. The signer's author/distributor certificate profile must be the one intentionally selected for the development package. Neither the certificate files nor their fingerprints need to enter Git.

The WITs `--start` path is **always an explicit manual installation gate**, never a fallback. Its command builds a WGT, invokes `vd_appuninstall VDRSuiteWITs` and `vd_appinstall VDRSuiteWITs .../WITs.wgt`; this cannot be labelled harmless until the actual package manifest/signature and the installed-package state are reviewed. To inspect a signed WGT before a TV installation, examine the *archive's actual* `config.xml` and signing files, not only the source `config.xml`. No blind install command is provided by this document.

## Only AFTER the separately approved DEV bootstrap

The user first confirms the **dev app** has been installed under the expected dev package and app identity, and has an independent authorized device login if backend tests need it.

For later edits **use the step-by-step procedure at the top of this document**, rather than blindly starting a second Watch. The normal commands after a changed checkout are:

```powershell
npm.cmd run build:tv
npm.cmd run check
npm.cmd run tv:dev:prepare
```

**Only if no Watch is already running:**

```powershell
npm.cmd run tv:watch
```

`tv:watch` runs `wits --watch` **only** with working directory `.tizen-wits-dev`. It refuses a mismatched `baseAppPath`, changed manifests, stale runtime, unapproved extra files and absent local init. No installation/uninstallation is implemented. **An already running DEV-Watch must not be launched a second time.** Keep its terminal open; for further changed sources repeat `tv:dev:prepare` so that the existing watcher can detect staged changes. Do not run `wits --start` or VS Code `Run Project` as a routine update.

## Optionaler Diagnosetest bei unklarer Watch-Synchronisation (kein Routineupdate)

**Nur nach Prüfung des Watchs, nicht automatisch nach jedem Update.** Der `--smoke`-Befehl ersetzt weder `npm.cmd run tv:watch` noch die Sichtprüfung des eigentlichen neuen Features.

## Harmless one-shot visual reload (only AFTER DEV setup)

Keep `npm.cmd run tv:watch` running in one VS Code terminal. In a second VS Code terminal, in the repository root, explicitly trigger:

```powershell
node scripts/tv-wits-isolated.mjs --smoke
```

This changes **only** the isolated `.tizen-wits-dev/index.html` branding text to `VDR-Suite · DEV-RELOAD-TEST`; it never touches `app/index.html` or a credential. WITs Watch should push the changed DEV file and reload the DEV application. Observe the new text on the real TV, check the *same DEV device* login, close/relaunch the DEV app, and check login again. Separately inspect the unchanged production app login. The smoke command itself only changes a local staged file: source/CI cannot establish actual TV behavior.

After observing the TV and stopping Watch, return the local staging directory to the exact app sources:

```powershell
npm.cmd run tv:dev:prepare
npm.cmd run tv:watch:check
```

No device installation occurs in either command. The one-shot marker intentionally makes the stage differ from app sources; further Watch invocations are blocked until it is restored.

## Hardware acceptance (remains OPEN)

- **Before** any initial DEV install: read-only inventory of apps, actual signed WGT `config.xml` package/app ID, intended certificate profile, and explicit approval. Production package `VDRSuiteTV` must remain installed and not be targeted by installer/uninstaller.
- **After** the one-time DEV install: verify dev and production appear separately; verify the unchanged production build/KeyManager status. If the dev app needs a login, its explicit *independent* one-time pairing is a separate manual action.
- **Before/after** a harmless UI text-only live reload within the DEV app, check `Einstellungen → Anmeldung prüfen` for **the same dev device**; repeat after closing/relaunching the dev app, and verify the normal app's login was not affected.
- Only after observed hardware success: mark dev-app KeyManager persistence across WITs Watch as PASS. A pass does **not** prove data preservation for production-package reinstall, update or store releases (S7.2 remains OPEN).
- A failure to find a KeyManager credential differs from a 401/403; record the exact non-secret message. **Do not** silently re-pair, delete a server device or export secrets.

If the TV has two menu entries pointing to one app ID, that is not evidence of two installed packages. Device app inventory is authoritative for this distinction. The new development app is expected to have its **own** ID and name.

**Rollback:** Stop Watch. No production source, package, credentials or TV installation have been changed by the offline preparation. To stop using the dev install, simply stop launching it; uninstalling is also an explicit separate hardware decision.
