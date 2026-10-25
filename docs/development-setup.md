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


## WITs Watch — nur über isoliertes Entwicklungsprojekt (S7.1)

**Korrigierter, verbindlicher Ablauf:** [WITs isoliert entwickeln](wits-isolated-development.md). Die vorher hier dokumentierte WITs-Initialisierung **innerhalb `app/` ist gesperrt**, weil die WITs-Host-App zwar die Application-ID ändert, aber dieselbe Paketkennung wie die normale VDR-Suite übernehmen kann. Ein `wits --start` von `app/` könnte die normale App und ihre KeyManager-Daten gefährden. Kein Hardware-PASS.

Offline in VS Code/PowerShell: `npm.cmd run build:tv`, `npm.cmd run check`, `npm.cmd run tv:dev:identity`, `npm.cmd run tv:dev:prepare`. WITs `--init` **nur** in `.tizen-wits-dev/`, anschließend `npm.cmd run tv:watch:check`; die einmalige Installation bleibt ein separates manuelles Gate. Danach `tv:watch` nur für das isolierte Dev-Paket. Keine neue Kopplung oder Credential-Migration automatisch.
