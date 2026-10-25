# Samsung Windows-Update-Workflow (verifiziert am 25.10.2026)

> **Verbindlich für künftige Samsung-Slices.** Vor Windows-/VS-Code-Git-Updates zuerst diesen Ablauf lesen. **Realer zweiter Fehlerfall vom 25.10.2026 abschließend gelöst:** `05d8af6 → 1bafaaa` per `git pull --ff-only origin main` als Fast-Forward, erst nachdem ausschließlich die getrackte generierte `app/tv-runtime.js` mit `git restore --source=HEAD --worktree -- app/tv-runtime.js` auf HEAD zurückgestellt worden war. Dazwischen **kein** `npm run build:tv`. Die davor ausgeführten **77/77 grünen Tests waren S4.1 am alten HEAD** und kein Nachweis des S5.1-Updates. Kein TV-Deployment- oder Wiedergabe-PASS dadurch.

## Das Problem, das wir nicht wiederholen dürfen

Die Windows-/VS-Code-/Tizen-Umgebung erzeugt bzw. verändert regelmäßig lokale Dateien:

- `app/tv-runtime.js` — **von Git verwaltetes, generiertes** Runtime-Bundle. Beim tatsächlichen reproduzierten Blocker zeigte `git status --short --untracked-files=no` nur ` M app/tv-runtime.js`, `git ls-files --eol` aber ausdrücklich **`i/lf w/lf attr/`**. **Dieser konkrete Fehler war also kein CRLF-Problem, sondern eine inhaltlich gegenüber dem Index abweichende generierte Datei.** Ein vor dem Pull erneut ausgeführtes `npm.cmd run build:tv` stellte die Änderung erneut her. `.gitattributes` mit `app/tv-runtime.js text eol=lf` hilft zusätzlich bei tatsächlichen Zeilenendenproblemen, behebt aber keine inhaltlichen Runtime-Unterschiede.
- `.vscode/`, `app/.tizen-rds/`, `app/Debug/`, `app/tizen_web_project.yaml` — gerätespezifische bzw. lokal erzeugte Tizen-/Editor-Dateien. Sie dürfen **nicht** gelöscht oder überschrieben werden. Ihre Existenz ist **kein** Grund, die Installation abzubrechen.

**Nicht erneut verwenden:** pauschales `git status --porcelain` als Abbruchbedingung, `git stash` als vermeintlich zuverlässige Bereinigung der Runtime, `git stash pop` nach dem Update, `git clean`, `git reset --hard`, Löschen der Tizen-/VS-Code-Verzeichnisse oder ein allgemeines `git restore .`. Kein erzwungenes Überschreiben, falls weitere bearbeitete Quelldateien vorhanden sind.

**Reihenfolge:** Erst vorhandene generierte Runtime sichern und **nur diese** bei Bedarf gezielt auf HEAD zurücksetzen; dann `git pull --ff-only`; **erst danach** `npm.cmd run build:tv` und `npm.cmd run check`. Vor Pull nicht bereits die Runtime neu generieren.

## Einmalige Reparatur einer alten Windows-Arbeitskopie (PowerShell)

**Nicht mit einem riesigen Sammelskript wiederholen.** Prüfe zunächst mit `git status --short --untracked-files=no`, dass **keine weiteren veränderten oder vorgemerkten Quelldateien** existieren. Falls doch, hier stoppen und diese Änderungen getrennt untersuchen.

Nur falls `app/tv-runtime.js` die einzige veränderte getrackte Datei ist und nichts vorgemerkt ist, im bestehenden Repo ausführen:

```powershell
# Nur die generierte Runtime extern sichern; keine lokalen TV-SDK-Dateien anfassen.
Copy-Item app/tv-runtime.js (Join-Path $env:TEMP ("samsung-runtime-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".js"))

# Der auf dem echten VS-Code-Rechner ERFOLGREICHE Schritt:
git restore --source=HEAD --worktree -- app/tv-runtime.js

# Nur fortfahren, wenn KEINE getrackte Aenderung mehr erscheint.
git status --short --untracked-files=no

# ZUERST pullen. Dazwischen weder Tizen-Build noch npm run build:tv.
git pull --ff-only origin main

# Erst NACH erfolgreichem Fast-Forward die neue Runtime erzeugen/pruefen.
npm.cmd run build:tv
npm.cmd run check
```

**Wenn der Status nach `restore` weiter `M app/tv-runtime.js` zeigt: NICHT erneut pullen oder restore/stash wiederholen.** Stattdessen die Ausgabe von `git ls-files --eol -- app/tv-runtime.js`, `git diff --numstat -- app/tv-runtime.js` und `git config --show-origin --get core.autocrlf` prüfen. Der echte Grund könnte dann über die Zeilenenden hinausgehen (etwa ein Editor, Git-Filter oder ein staged Change). Ein Git-Pull darf solche lokalen Änderungen weiterhin nicht überschreiben.

**Nach dem erfolgreichen Pull gilt `.gitattributes` zusätzlich für LF-Checkouts.** Das verhindert nicht, dass `npm run build:tv` eine getrackte Datei bei wirklich geänderten Quellen erneut modifiziert. Daher **bei jedem späteren blockierten Pull zuerst `git status --short --untracked-files=no` und `git ls-files --eol -- app/tv-runtime.js` prüfen**. Wenn ausschließlich die generierte Runtime verändert ist und nichts staged ist, ihren Inhalt sichern, nur diese Datei auf HEAD zurückstellen, sauberen Status bestätigen und **ohne Zwischen-Build sofort pullen**. Bei anderen Änderungen stoppen; niemals pauschal zurücksetzen. Beim reinen TV-Paketbau eines bereits aktuellen Checkouts nur `npm.cmd run build:tv`, `npm.cmd run check` und `Tizen > Build Project` benutzen – **kein unnötiges `git pull`**. Der gesamte Ablauf erfolgt **im VS-Code-Terminal**, VS Code muss nicht geschlossen werden.

## Tizen-Build und Installation sind separate Schritte

1. Nach erfolgreichem Build in VS Code/Tizen Extension **Build Project**, damit mit dem vorhandenen gültigen Samsung-Zertifikatsprofil ein `app/Debug/app.wgt` gebaut/signiert wird. Erst danach die neue Build-Kennung und WGT-Inhalt überprüfen.
2. **Nicht** `Run Project`, `WITs Start`, `sdb uninstall` oder eine andere verdeckte Neuinstallation einsetzen: Dabei können Web-Storage und Tizen-KeyManager-Daten verlorengehen.
3. Eine Installation/Update per SDB/`vd_appinstall` ist ein eigenes **manuelles Gate** und nicht automatisch als datenbewahrend nachgewiesen. Alternativ `npm.cmd run tv:watch` nur nach **separat erfolgreich eingerichteter WITs-Erstverbindung**; kein Installations-Fallback.
4. Auf dem TV anschließend angezeigte **Build-Kennung** und `Einstellungen → Anmeldung prüfen` dokumentieren. Netzwerk erreichbar ≠ gültige Device-Anmeldung. Bei widerrufenem Credential HTTP-401-Fehler getrennt von einem lokal noch gespeicherten Credential bewerten.

**Nachweis dieses zweiten konkreten Vorfalls am 25.10.2026:** `git pull` von `05d8af6` nach `1bafaaa` scheiterte mehrfach an `app/tv-runtime.js`. Dabei war `i/lf w/lf` belegt und die Ursache **nicht CRLF**. `npm.cmd run build:tv` und 77/77 grüne Tests liefen jeweils noch auf dem alten S4.1-Stand, und ein vorzeitiger Build machte die Runtime erneut schmutzig. **Erst gezieltes `git restore --source=HEAD --worktree -- app/tv-runtime.js`, direkt anschließend `git pull --ff-only origin main`** führte nachweislich zu `Fast-forward` mit den S5.1-Dateien. Diesen Weg vor der Wiederholung langer Reparaturskripte priorisieren; die bereits gesicherten Runtime-Backups, lokale Tizen-Artefakte, Zertifikate und TV-Anmeldung bleiben unberührt. Eine neue TV-IP im Tizen-Gerätemanager ist ein unabhängiger Anschluss-Schritt, kein Grund für Git-Reset oder Neu-Pairing.

Siehe auch [Entwicklungssetup](development-setup.md) und [Hardware-Abnahme](hardware-acceptance.md).
