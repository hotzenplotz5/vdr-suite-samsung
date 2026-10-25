# S1.1 – Windows-Laptop und Samsung-TV vorbereiten

## Ausgangslage

- Windows-Laptop mit Git, Node.js 20+ und künftig Tizen-Werkzeugen.
- Samsung GU43TU6979U, Modellgeneration 2020 / erwarteter Tizen 5.5.
- Entferntes VDR-Suite-Backend per IPv6/SSH **nur vom Laptop bestätigt**.
- Routertyp am TV-Standort noch unbekannt; keine Fritz!Box voraussetzen.

## A. Lokales Netz prüfen

1. Windows: `Win + R` -> `cmd` -> `ipconfig`. Die IPv4-Adresse des aktiven Adapters notieren.
2. Samsung: Einstellungen -> Allgemein -> Netzwerk -> Netzwerkstatus / IP-Einstellungen (Beschriftung firmwareabhängig). TV-IPv4-Adresse notieren.
3. Prüfen, ob beide im gleichen erreichbaren lokalen Netz sitzen. AP-/Gastnetz-Isolation kann SDB blockieren.
4. Nie öffentliche IPv6-/SSH-/Medien-Ports für den Entwicklermodus öffnen.
5. Notizen und Ergebnis **ohne echte IP-Adressen** in `docs/hardware-acceptance.md` dokumentieren.

## B. Tizen-Werkzeuge

Offizieller Einstieg:
- https://developer.samsung.com/smarttv/develop/tools/tizen-studio.html
- https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode/create-web-applications.html
- https://developer.samsung.com/smarttv/develop/getting-started/quick-start-guide.html

Tizen Studio oder VS Code + Tizen Extension mit Samsung TV Extension installieren. TV-Profil und Tizen 5.5 als Mindestplattform wählen. Für das Packaging muss `app/config.xml` durch die installierte SDK-Version validiert werden.

## C. Samsung Developer Mode und Zertifikat

1. Samsung und Laptop lokal verbinden.
2. Apps-Bereich am Samsung aufrufen, Entwicklerdialog typischerweise per `12345` öffnen (UI kann firmwareabhängig sein).
3. Developer Mode einschalten und **die lokale Laptop-IP** eintragen (nicht die TV-IP).
4. TV neu starten.
5. In Tizen Device Manager bzw. SDB das TV als Entwicklerziel verbinden.
6. Ein gültiges **Samsung Author Certificate + Distributor Certificate** für die Entwicklungsinstallation über die Samsung Certificate Extension erzeugen. Private Schlüssel und Passwörter ausschließlich lokal aufbewahren, nicht committen.

> **WICHTIG: Wiederkehrende Git-/CRLF-/Tizen-Fehler vermeiden.** Für bereits eingerichtete Windows-/VS-Code-/Samsung-Checkouts gilt zwingend [Windows-Update-Workflow](windows-update-workflow.md). Die `app/tv-runtime.js` ist eine versionierte, generierte Datei; lokale `.vscode/`, `app/.tizen-rds/`, `app/Debug/` und `app/tizen_web_project.yaml` bleiben erhalten. Keine pauschalen Git-Sauberkeitsprüfungen, keine rekursiven Lösch-/Hard-Reset-Befehle. Am 25.10.2026 funktionierte der dokumentierte gezielte Sicherungs-/Restore-/Pull-/Build-Pfad mit **77 PASS / 0 FAIL**. **Build Project** zum Paketieren; **Run Project** nicht als datenbewahrendes Update verwenden.

## D. Quellprojekt öffnen, testen, bauen

```powershell
git clone https://github.com/hotzenplotz5/vdr-suite-samsung.git
cd vdr-suite-samsung
npm test
```

In Tizen Studio die Web-App unter `app/` öffnen/importieren. App-Konfiguration und Launcher-Icon in der SDK-Oberfläche prüfen. Mit dem Samsung-TV-Profil ein **signiertes WGT** erstellen und erst dann auf dem via Device Manager verbundenen TV installieren. Der tatsächlich funktionierende Build-/Signierpfad wird während S1.2 reproduzierbar ergänzt.

**Historisch erledigt:** Projekt ist erfolgreich auf Samsung GU43TU6979U (Tizen 5.5) installiert worden. Für weitere Slices ist wiederholtes `Run Project` **kein** sicheres Update-Verfahren, weil die Test-App dabei deinstalliert werden und ihr KeyManager-Credential verlieren kann. Stattdessen den [WITs-Watch-Entwicklungsweg](../README.md#entwicklungs-updates-ohne-erneutes-geräte-pairing--samsung-wits-watch-2026-10-25) einrichten und zunächst per Hardware nachweisen.

## E. Abnahmedaten

[docs/hardware-acceptance.md](hardware-acceptance.md) pflegen: Gerät/Firmware, SDK-Version, Zertifikat vorhanden (ja/nein, niemals Schlüssel), SDB verbunden, Paketname, Installation, Display/Remote und reproduzierbare Restart-Ergebnisse.

## Trennung vom VDR-Server

Kein Backend-Test in S1; die lokale SSH-Funktion des Laptops ist kein Beleg für den HTTPS-Pfad des Fernsehers. S3 prüft Direct-/Remote-Zugriff und Credential-/Media-Sicherheit eigenständig.


## Entwicklungs-Updates ohne erneutes Geräte-Pairing – Samsung WITs Watch (2026-10-25)

**Ursache:** Die Samsung-VS-Code-Funktion `Run Project` kann die bisherige Test-App deinstallieren und erneut installieren. Samsung dokumentiert, dass bei einer Deinstallation App-Daten verloren gehen können. Der sichere `tizen.keymanager`-Eintrag gehört zur App-Identität; weder `device-local.js` noch die auf dem Server weiterhin bestehende Device-Zeile stellen das bereits verlorene Geheimnis wieder her. Wir kopieren oder exportieren das Credential daher **nicht** in Web-Storage, Dateien, WITs-Konfiguration, URLs oder den Entwicklungsrechner.

**Für wiederholte Slices auf dem 2020er Samsung / Tizen 5.5:** Samsung unterstützt [WITs Live Reload](https://github.com/Samsung/Wits) ausdrücklich für Tizen 5.5. Ein bestehendes und einmal eingerichtetes WITs-Projekt wird über `wits --watch` aktualisiert, **ohne** die App neu zu installieren. Auf dieser Basis liefert das Repository einen fail-closed Watch-Befehl. Änderungen an `config.xml`, Paket-ID, Zertifikaten oder Store-/Release-Installationen bleiben ein anderes, **nicht** als KeyManager-datenbewahrend akzeptiertes Gate.

**Einmalige Einrichtung (auf dem Windows-Rechner im VS-Code-PowerShell-Terminal):**

```powershell
npm.cmd install -g @tizentv/wits
Set-Location app
wits.cmd -i
Set-Location ..
```

WITs fragt dabei unter anderem nach dem **lokalen** TV/PC und dem vorhandenen Zertifikatsprofil. Dabei erstellte `app/.witsconfig.json` ist Git-ignoriert und enthält **keine Device-Credentials**. `-i` konfiguriert nur den Entwicklerrechner. Ob die installierte App schon WITs-fähig vorbereitet ist, muss auf dem konkreten TV festgestellt werden. **Nur wenn für eine erstmalige WITs-Verbindung erforderlich, kann `wits -s` eine einmalige Neuinstallation bedeuten** – dabei können bereits vorhandene KeyManager-Credentials verloren gehen; niemals als ungefährliche Update-Aktion ausgeben. Der Nutzer entscheidet bewusst, ob ein solcher einmaliger Bootstrap in dieser Situation akzeptabel ist. Bereits verlorene Credentials erfordern anschließend eine neue, bewusst genehmigte Pairing-Identität mit eigenen Grants.

**Ab dann nach Änderungen (PowerShell im Repository-Hauptordner):**

```powershell
npm.cmd run build:tv
npm.cmd run check
npm.cmd run tv:watch
```

`tv:watch` prüft zuerst `app/.witsconfig.json`, `app/.witsignore`, die unveränderte Paketidentität `VDRSuiteTV.VDRSuite`, das erzeugte Bundle und alle Quelltests. Es startet **ausschließlich `wits --watch` im App-Projektverzeichnis**. Fehlt WITs oder ist kein Watch-Bootstrap auf dem TV vorhanden, gibt es einen Fehler **ohne Run-Project-/Installations-Fallback**. Nach späteren Änderungen an `app/src/...` immer zunächst `npm.cmd run build:tv` ausführen (erst `app/tv-runtime.js` ist das an den TV übertragene Script); WITs synchronisiert die geänderte gebündelte Runtime. Beenden mit `Strg+C` im Terminal.

**Sicherheits- und Abnahme-Gate:** Vor dem Watch auf dem TV `Einstellungen → Anmeldung prüfen`; nach dem Live Reload dieselbe Aktion erneut, dann `Live-TV → Sender laden` und `Aufnahmen → Aufnahmen laden` mit den bestehenden Grants. Ein erfolgreicher Quelltest belegt **noch nicht**, dass WITs Watch auf dem konkreten TV das KeyManager-Credential bewahrt; diesen Hardwaretest getrennt durchführen. Niemals `Run Project`, `Wits Start`, `tizen install` oder `sdb uninstall` als vermeintlich gleichwertigen, datenbewahrenden Ersatz anbieten. Kein blindes Löschen alter Geräte und keine automatische Grant-Übernahme.

**Dokumentierte Herstellerreferenzen:** [Samsung VS Code Extension / WITs](https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode-extension.html) · [Samsung WITs](https://github.com/Samsung/Wits) · [Samsung Installationsverhalten](https://developer.samsung.com/smarttv/develop/faq/application-installation.html).

