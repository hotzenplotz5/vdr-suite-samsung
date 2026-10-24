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

## D. Quellprojekt öffnen, testen, bauen

```powershell
git clone https://github.com/hotzenplotz5/vdr-suite-samsung.git
cd vdr-suite-samsung
npm test
```

In Tizen Studio die Web-App unter `app/` öffnen/importieren. App-Konfiguration und Launcher-Icon in der SDK-Oberfläche prüfen. Mit dem Samsung-TV-Profil ein **signiertes WGT** erstellen und erst dann auf dem via Device Manager verbundenen TV installieren. Der tatsächlich funktionierende Build-/Signierpfad wird während S1.2 reproduzierbar ergänzt.

**Noch nicht als erfolgreich behaupten:** Tizen-Import, WGT-Build, Installation und TV-Start sind bislang offen.

## E. Abnahmedaten

[docs/hardware-acceptance.md](hardware-acceptance.md) pflegen: Gerät/Firmware, SDK-Version, Zertifikat vorhanden (ja/nein, niemals Schlüssel), SDB verbunden, Paketname, Installation, Display/Remote und reproduzierbare Restart-Ergebnisse.

## Trennung vom VDR-Server

Kein Backend-Test in S1; die lokale SSH-Funktion des Laptops ist kein Beleg für den HTTPS-Pfad des Fernsehers. S3 prüft Direct-/Remote-Zugriff und Credential-/Media-Sicherheit eigenständig.

