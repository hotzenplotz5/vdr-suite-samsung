# Samsung Windows-Update-Workflow (verifiziert am 25.10.2026)

> **Verbindlich für künftige Samsung-Slices.** Erst diese Anleitung lesen, bevor auf dem Windows-Entwicklungsrechner ein Git-Pull, ein Tizen-Build oder eine TV-Installation empfohlen wird. Quelle der Regeln: realer fehlgeschlagener und danach erfolgreicher Update-Lauf am 25.10.2026; S4.1 `b659eaf54fff5`, `npm.cmd run check` **77 PASS, 0 FAIL**. Das ist eine **lokale Source-/Build-Bestätigung**, noch kein Nachweis für Installation oder Device-Auth auf TV.

## Das Problem, das wir nicht wiederholen dürfen

Die Windows-/VS-Code-/Tizen-Umgebung erzeugt bzw. verändert regelmäßig lokale Dateien:

- `app/tv-runtime.js` — **von Git verwaltetes, generiertes** Runtime-Bundle. Git for Windows kann LF/CRLF-Zeilenenden verändern; `git pull` kann deswegen selbst dann abbrechen, wenn nur diese Datei als geändert erscheint.
- `.vscode/`, `app/.tizen-rds/`, `app/Debug/`, `app/tizen_web_project.yaml` — gerätespezifische bzw. lokal erzeugte Tizen-/Editor-Dateien. Sie dürfen **nicht** gelöscht oder überschrieben werden. Ihre Existenz ist **kein** Grund, die Installation abzubrechen.

**Nicht erneut verwenden:** pauschales `git status --porcelain` als Abbruchbedingung, `git stash` als vermeintlich zuverlässige Bereinigung der Runtime, `git stash pop` nach dem Update, `git clean`, `git reset --hard`, Löschen der Tizen-/VS-Code-Verzeichnisse oder ein allgemeines `git restore .`. Kein erzwungenes Überschreiben, falls weitere bearbeitete Quelldateien vorhanden sind.

**Reihenfolge:** Erst vorhandene generierte Runtime sichern und **nur diese** bei Bedarf gezielt auf HEAD zurücksetzen; dann `git pull --ff-only`; **erst danach** `npm.cmd run build:tv` und `npm.cmd run check`. Vor Pull nicht bereits die Runtime neu generieren.

## Wiederholbarer PowerShell-Block (im Repository-Hauptordner)

Der Block verwendet keinen privaten Benutzerpfad; er muss im bestehenden Samsung-Git-Repository in PowerShell laufen. Es werden **keine** unversionierten Dateien verändert oder gelöscht. Bei unerwarteten Änderungen bricht er ohne einen allgemeinen Reset ab.

```powershell
& {
    $ErrorActionPreference = "Stop"

    $repo = (git rev-parse --show-toplevel)
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repo)) {
        throw "Bitte PowerShell im Samsung-Git-Repository oeffnen."
    }

    Set-Location $repo

    $branch = (git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $branch -ne "main") {
        throw "Abbruch: Erwarteter Branch main nicht aktiv."
    }

    # Unversionierte VS-Code-/Tizen-Dateien bewusst NICHT als Fehler bewerten.
    $changed = @(git diff --name-only HEAD)
    if ($LASTEXITCODE -ne 0) { throw "Git-Diff fehlgeschlagen." }

    $other = @($changed | Where-Object { $_ -ne "app/tv-runtime.js" })
    if ($other.Count -gt 0) {
        $other | Out-Host
        throw "Abbruch: Weitere bearbeitete Quelldateien; nichts zuruecksetzen."
    }

    $staged = @(git diff --cached --name-only)
    if ($LASTEXITCODE -ne 0 -or $staged.Count -gt 0) {
        throw "Abbruch: Vorgemerkte Git-Aenderungen vorhanden."
    }

    # Nur die bekannte GENERIERTE Runtime: extern sichern, Hash pruefen,
    # dann ausschliesslich diese Datei auf den lokalen HEAD zuruecksetzen.
    if ($changed -contains "app/tv-runtime.js") {
        $source = Join-Path $repo "app/tv-runtime.js"
        $backup = Join-Path $env:TEMP (
            "samsung-runtime-backup-" +
            (Get-Date -Format "yyyyMMdd-HHmmss-fff") + ".js"
        )

        Copy-Item -LiteralPath $source -Destination $backup -ErrorAction Stop
        $before = (Get-FileHash $source -Algorithm SHA256).Hash
        $after = (Get-FileHash $backup -Algorithm SHA256).Hash
        if ($before -ne $after) { throw "Runtime-Sicherung fehlgeschlagen." }
        Write-Host "Gesichert: $backup"

        git restore --source=HEAD --worktree -- app/tv-runtime.js
        if ($LASTEXITCODE -ne 0) { throw "Gezieltes Restore fehlgeschlagen." }
    }

    $remaining = @(git status --porcelain --untracked-files=no)
    if ($LASTEXITCODE -ne 0 -or $remaining.Count -gt 0) {
        $remaining | Out-Host
        throw "Weitere versionierte Aenderungen vorhanden; Abbruch."
    }

    git pull --ff-only origin main
    if ($LASTEXITCODE -ne 0) { throw "Git-Pull fehlgeschlagen." }

    npm.cmd run build:tv
    if ($LASTEXITCODE -ne 0) { throw "TV-Build fehlgeschlagen." }

    npm.cmd run check
    if ($LASTEXITCODE -ne 0) { throw "Samsung-Tests fehlgeschlagen." }

    Write-Host "Samsung-Quellstand aktualisiert; Build und Tests erfolgreich." -ForegroundColor Green
    Write-Host "Jetzt signiertes Tizen Build Project, NICHT Run Project."
}
```

**Wichtig:** `git restore --source=HEAD --worktree -- app/tv-runtime.js` darf **nur** nach erfolgreicher externer Sicherung und nur bei dieser ausdrücklich als generiert geprüften Datei erfolgen. Bei zusätzlichen Änderungen nicht improvisieren, sondern Ursachen untersuchen. Der externe Backup-Pfad wird lediglich lokal ausgegeben und niemals committed. Eine eventuelle ältere Stash-Sicherung bleibt unberührt. Bei unverändertem Git-Stand reicht `npm.cmd run build:tv` gefolgt von `npm.cmd run check`; **kein unnötiger Pull vor jedem Tizen-Build**.

## Tizen-Build und Installation sind separate Schritte

1. Nach erfolgreichem Build in VS Code/Tizen Extension **Build Project**, damit mit dem vorhandenen gültigen Samsung-Zertifikatsprofil ein `app/Debug/app.wgt` gebaut/signiert wird. Erst danach die neue Build-Kennung und WGT-Inhalt überprüfen.
2. **Nicht** `Run Project`, `WITs Start`, `sdb uninstall` oder eine andere verdeckte Neuinstallation einsetzen: Dabei können Web-Storage und Tizen-KeyManager-Daten verlorengehen.
3. Eine Installation/Update per SDB/`vd_appinstall` ist ein eigenes **manuelles Gate** und nicht automatisch als datenbewahrend nachgewiesen. Alternativ `npm.cmd run tv:watch` nur nach **separat erfolgreich eingerichteter WITs-Erstverbindung**; kein Installations-Fallback.
4. Auf dem TV anschließend angezeigte **Build-Kennung** und `Einstellungen → Anmeldung prüfen` dokumentieren. Netzwerk erreichbar ≠ gültige Device-Anmeldung. Bei widerrufenem Credential HTTP-401-Fehler getrennt von einem lokal noch gespeicherten Credential bewerten.

**Nachweis dieses konkreten Vorfalls:** Zunächst wiederholt `git pull` wegen `app/tv-runtime.js` (CRLF/LF/Änderungsstatus) abgebrochen. Nach Hash-geprüfter externer Sicherung, ausschließlich gezieltem `git restore`, `git pull --ff-only`, Runtime-Neugenerierung und `npm.cmd run check` waren **77/77 Tests grün** und der erwartete S4.1-Build `b659eaf54fff5` vorhanden. Die lokale Samsung-Tizen-/VS-Code-Umgebung blieb dabei erhalten.

Siehe auch [Entwicklungssetup](development-setup.md) und [Hardware-Abnahme](hardware-acceptance.md).
