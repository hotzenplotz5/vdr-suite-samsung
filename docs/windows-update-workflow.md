# Samsung Windows-Update-Workflow (verifiziert am 25.10.2026)

> **Verbindlich für künftige Samsung-Slices.** Erst diese Anleitung lesen, bevor auf dem Windows-Entwicklungsrechner ein Git-Pull, ein Tizen-Build oder eine TV-Installation empfohlen wird. Quelle der Regeln: realer fehlgeschlagener und danach erfolgreicher Update-Lauf am 25.10.2026; S4.1 `b659eaf54fff5`, `npm.cmd run check` **77 PASS, 0 FAIL**. Das ist eine **lokale Source-/Build-Bestätigung**, noch kein Nachweis für Installation oder Device-Auth auf TV.

## Das Problem, das wir nicht wiederholen dürfen

Die Windows-/VS-Code-/Tizen-Umgebung erzeugt bzw. verändert regelmäßig lokale Dateien:

- `app/tv-runtime.js` — **von Git verwaltetes, generiertes** Runtime-Bundle. Git for Windows konnte bei `core.autocrlf=true` CRLF auschecken, während `npm run build:tv` LF schreibt. **Die neue `.gitattributes`-Regel `app/tv-runtime.js text eol=lf` verhindert künftig diesen Zeilenendenkonflikt unabhängig von globalen Git-Einstellungen.** Die alte Windows-Arbeitskopie braucht einmalig einen gezielten Restore.
- `.vscode/`, `app/.tizen-rds/`, `app/Debug/`, `app/tizen_web_project.yaml` — gerätespezifische bzw. lokal erzeugte Tizen-/Editor-Dateien. Sie dürfen **nicht** gelöscht oder überschrieben werden. Ihre Existenz ist **kein** Grund, die Installation abzubrechen.

**Nicht erneut verwenden:** pauschales `git status --porcelain` als Abbruchbedingung, `git stash` als vermeintlich zuverlässige Bereinigung der Runtime, `git stash pop` nach dem Update, `git clean`, `git reset --hard`, Löschen der Tizen-/VS-Code-Verzeichnisse oder ein allgemeines `git restore .`. Kein erzwungenes Überschreiben, falls weitere bearbeitete Quelldateien vorhanden sind.

**Reihenfolge:** Erst vorhandene generierte Runtime sichern und **nur diese** bei Bedarf gezielt auf HEAD zurücksetzen; dann `git pull --ff-only`; **erst danach** `npm.cmd run build:tv` und `npm.cmd run check`. Vor Pull nicht bereits die Runtime neu generieren.

## Einmalige Reparatur einer alten Windows-Arbeitskopie (PowerShell)

**Nicht mit einem riesigen Sammelskript wiederholen.** Prüfe zunächst mit `git status --short --untracked-files=no`, dass **keine weiteren veränderten oder vorgemerkten Quelldateien** existieren. Falls doch, hier stoppen und diese Änderungen getrennt untersuchen.

Nur falls `app/tv-runtime.js` die einzige veränderte getrackte Datei ist und nichts vorgemerkt ist, im bestehenden Repo ausführen:

```powershell
# Nur die generierte Runtime extern sichern; keine lokalen TV-SDK-Dateien anfassen.
Copy-Item app/tv-runtime.js (Join-Path $env:TEMP ("samsung-runtime-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".js"))

# Einmalig LF statt Windows-CRLF beim Zurueckschreiben erzwingen.
git -c core.autocrlf=false -c core.eol=lf restore --source=HEAD --worktree -- app/tv-runtime.js

# Hier muss fuer getrackte Dateien KEINE Aenderung mehr stehen.
git -c core.autocrlf=false status --short --untracked-files=no

# Nur nach sauberem Status:
git -c core.autocrlf=false pull --ff-only origin main
npm.cmd run build:tv
npm.cmd run check
```

**Wenn der Status nach `restore` weiter `M app/tv-runtime.js` zeigt: NICHT erneut pullen oder restore/stash wiederholen.** Stattdessen die Ausgabe von `git ls-files --eol -- app/tv-runtime.js`, `git diff --numstat -- app/tv-runtime.js` und `git config --show-origin --get core.autocrlf` prüfen. Der echte Grund könnte dann über die Zeilenenden hinausgehen (etwa ein Editor, Git-Filter oder ein staged Change). Ein Git-Pull darf solche lokalen Änderungen weiterhin nicht überschreiben.

**Nach dem einmaligen erfolgreichen Pull gilt `.gitattributes` verbindlich:** Git checkt `app/tv-runtime.js` mit LF aus; `npm run build:tv` generiert LF. Die besondere Restore-/Pull-Reparatur ist bei späteren sauberen Checkouts **nicht mehr erforderlich**. Beim reinen TV-Paketbau in einem bereits aktuellen Checkout nur `npm.cmd run build:tv`, `npm.cmd run check`, danach `Tizen > Build Project` ausführen. Kein unnötiges `git pull`.

## Tizen-Build und Installation sind separate Schritte

1. Nach erfolgreichem Build in VS Code/Tizen Extension **Build Project**, damit mit dem vorhandenen gültigen Samsung-Zertifikatsprofil ein `app/Debug/app.wgt` gebaut/signiert wird. Erst danach die neue Build-Kennung und WGT-Inhalt überprüfen.
2. **Nicht** `Run Project`, `WITs Start`, `sdb uninstall` oder eine andere verdeckte Neuinstallation einsetzen: Dabei können Web-Storage und Tizen-KeyManager-Daten verlorengehen.
3. Eine Installation/Update per SDB/`vd_appinstall` ist ein eigenes **manuelles Gate** und nicht automatisch als datenbewahrend nachgewiesen. Alternativ `npm.cmd run tv:watch` nur nach **separat erfolgreich eingerichteter WITs-Erstverbindung**; kein Installations-Fallback.
4. Auf dem TV anschließend angezeigte **Build-Kennung** und `Einstellungen → Anmeldung prüfen` dokumentieren. Netzwerk erreichbar ≠ gültige Device-Anmeldung. Bei widerrufenem Credential HTTP-401-Fehler getrennt von einem lokal noch gespeicherten Credential bewerten.

**Nachweis dieses konkreten Vorfalls:** Zunächst wiederholt `git pull` wegen `app/tv-runtime.js` (CRLF/LF/Änderungsstatus) abgebrochen. Nach Hash-geprüfter externer Sicherung, ausschließlich gezieltem `git restore`, `git pull --ff-only`, Runtime-Neugenerierung und `npm.cmd run check` waren **77/77 Tests grün** und der erwartete S4.1-Build `b659eaf54fff5` vorhanden. Die lokale Samsung-Tizen-/VS-Code-Umgebung blieb dabei erhalten.

Siehe auch [Entwicklungssetup](development-setup.md) und [Hardware-Abnahme](hardware-acceptance.md).
