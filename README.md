# VDR-Suite Samsung

Eigenständiger Samsung-Smart-TV-Client für **VDR-Suite**. Zielplattform: Samsung Tizen TV; erstes Testgerät: **Samsung GU43TU6979U (2020 / Tizen-Generation 5.5)**.

> **Status 2026-10-25:** S1-Hardwaretest teilweise erfolgreich: signiertes `.wgt` installiert; Startvideo und Logo am Samsung Tizen 5.5 sichtbar; Tizen/AVPlay/Tasten-API erkannt; D-Pad/OK-Menünavigation bestätigt. Back/Exit/Restart und Medien-/API-Zugriff noch offen.

## Projektgrenzen

- **Nur dieses Repository** wird für den Samsung-Client verändert; kein Code im VDR-Suite-, Addon- oder VIDAA-Repository.
- Samsung-eigene Oberfläche mit Fernbedienungsfokus und später AVPlay.
- VDR-Suite bleibt Eigentümerin von Daten, Berechtigungen, Pairing, MediaSessions und Playback-Semantik.
- Der Client konsumiert ausschließlich geprüfte **öffentliche API-v1-Verträge**; keine Browser-privaten Endpunkte oder direkten VDR-Dateipfade.
- VIDAA dient als Architektur- und UX-Referenz, ist aber keine Laufzeitabhängigkeit.

## Einstieg

1. [ROADMAP.md](ROADMAP.md) – Phasen, Slices, Gates.
2. [docs/architecture.md](docs/architecture.md) – Systemgrenzen und Modulaufteilung.
3. [docs/api-contracts.md](docs/api-contracts.md) – geprüfte öffentliche Schnittstellen.
4. [docs/development-setup.md](docs/development-setup.md) – Windows/Tizen/TV-Verbindung.
5. [docs/hardware-acceptance.md](docs/hardware-acceptance.md) – Abnahme am realen Samsung.

## Phase-S1-Prototyp (auf echtem TV gestartet)

Die im Verzeichnis `app/` enthaltene statische TV-Web-App zeigt einen Startbildschirm, vier Bereiche, sichtbaren Fokus und harmlose Gerätefähigkeits-Indikatoren. Sie nutzt **keine Netzwerkressourcen und keine VDR-Medienressourcen**. Das lokal paketierte VIDAA-Startvideo ist eine nichtblockierende Branding-Animation, keine Recording-MediaSession. Das Original-VIDAA-Logo liegt unter `app/assets/branding/`.

Zum lokalen Entwickeln genügt ein statischer HTTP-Server, der `app/` ausliefert; für die **Installation** auf dem TV sind Tizen-Tooling und ein eigenes gültiges Samsung-Zertifikat erforderlich.

```bash
npm test
```

Die Tests benötigen Node.js 20 oder neuer, aber keine zusätzlichen npm-Abhängigkeiten.

## Upstream-Referenzen

- [VDR-Suite – Public API v1](https://github.com/hotzenplotz5/vdr-suite/tree/main/api)
- [VDR-Suite VIDAA (separates Projekt)](https://github.com/hotzenplotz5/vdr-suite-vidaa)
- [Samsung – TV-Web-App erstellen](https://developer.samsung.com/smarttv/develop/getting-started/creating-tv-applications.html)
- [Samsung – Tizen-Web-App-Konfiguration](https://developer.samsung.com/smarttv/develop/guides/fundamentals/configuring-tv-applications.html)

Keine Geräte-IP-Adressen, Zugangsdaten, Zertifikatsschlüssel oder Media-Tokens ins Repository committen.

## Branding und TV-Design

Die beiden Originaldateien `app/assets/branding/vdr-suite-icon-v4.png` und `app/assets/branding/startvideo.mp4` wurden aus dem eigenständigen VIDAA-Projekt übernommen und bleiben unverändert. Die kurze Startanimation läuft lokal, kann mit OK/Zurück/Stop übersprungen werden und blockiert den TV-Start nicht, falls der Decoder sie ablehnt. Startvideo funktioniert nach Nutzerbestätigung mit Bild auf Tizen 5.5; Ton wurde noch nicht getrennt nachgewiesen.

Verbindliches späteres UI-Ziel: das vom Nutzer bereitgestellte dunkle Media-Home-Design mit oberer Navigation, großer Live-TV-Hero-Karte und horizontalen Inhaltsschienen. Der kleine S1-Diagnosebildschirm ist ausdrücklich **noch nicht** dieses finale Design.

## Erster TV-Test und Tizen-5.5-Boot-Korrektur

Der erste signierte `.wgt`-Build wurde am echten Samsung installiert und zeigte den statischen S1-Bildschirm samt Logo. **Startvideo nicht sichtbar, alle drei Capability-Anzeigen blieben bei `wird geprüft`.** Das weist auf einen fehlenden JS-Boot hin, ist ohne Gerätekonsole noch keine endgültig bewiesene Ursache.

Die paketierte App nutzt nun `app/tv-runtime.js` als klassisches Script ohne Modulimporte. Die Module unter `app/src/` bleiben die Entwicklungsquellen. Nach JS-Änderungen `npm run build:tv` ausführen und das generierte Script mitcommitten; `npm run check` verweigert veraltete Bundles. Das Tizen-VS-Code-Build-Tool führt npm nicht selbst aus.

**Erneuter Hardwaretest erfolgreich (2026-10-25):** Alle drei Fähigkeitsanzeigen stehen auf „vorhanden“; originales Startvideo funktioniert laut Nutzer, Fokus und OK auf allen vier Menüpunkten sichtbar. Back/Exit/Restart, Video-Ton und tatsächliche AVPlay-Playback-Funktion bleiben ungeprüft.

## Git for Windows: `Stale app/tv-runtime.js`

Die erste TV-Runtime-Generatorversion verglich die Zeilenenden bytegenau. Bei Git for Windows können ausgecheckte Textdateien `CRLF` enthalten, während der Generator `LF` erwartet. Der Generator normalisiert jetzt Eingabe und Vergleich auf `LF`. Ein isolierter Test simuliert `CRLF` für sämtliche Quell-/Build-Dateien und prüft zusätzlich, dass tatsächlich veraltete Bundles weiterhin abgewiesen werden. Kein globales Ändern von Git-/Windows-Einstellungen nötig.

## TV-Runtime-Syntaxkorrektur

Beim erneuten lokalen `npm run check` meldete Node.js einen Syntaxfehler in der ersten Kommentarzeile der generierten TV-Runtime. Die Glob-Schreibweise in einem Blockkommentar enthielt unabsichtlich einen Kommentarabschluss. Sowohl Generator als auch generiertes Script verwenden jetzt einen Kommentar ohne Glob-Syntax; der neue Regressionstest überprüft die Runtime zusätzlich mit `node --check`. Windows-Check mit 15 erfolgreichen Tests und anschließender TV-Retest waren erfolgreich; Audio des Startvideos und spätere Medienfunktionen sind nicht dadurch abgenommen.

## Phase S2.1 – Dark-Premium-Media-Home (Quelle in Samsung-App)

Das vom Nutzer vorgegebene TV-Dark-Premium-Design wird als echte HTML/CSS/JavaScript-Oberfläche umgesetzt, **nicht** als Screenshot oder generiertes Bild. UI-Bausteine: Top-Navigation, zentraler Hero, flankierende Karten, Status/Aktionsleiste und horizontale Inhaltsreihe. Das Original-VIDAA-Logo und die funktionierende Intro-MP4 bleiben erhalten. Routen: Home, Live-TV, Aufnahmen, Suche, Timer und Einstellungen; die lokale S1-Hardwarediagnose liegt unter Einstellungen.

Alle Kacheln sind **Offline-Designvorschau**; es gibt absichtlich keine fiktiven echten Sender, EPG-Daten, Timer, Benutzer oder MediaSessions. D-Pad/OK/Zurück durch eine einzige Keydown-Instanz. Samsung Tizen 5.5: kein flex-gap und keine modernen JS-/CSS-Features ohne Legacy-Fallback. Keine anderen Repositories geändert.

Build: `npm.cmd run build:tv`, dann `npm.cmd run check`; danach in der Tizen Extension erneut Build Project / Run Project. Hardware-Abnahme der neuen S2-Ansicht bleibt bis zum echten TV-Test offen.

## Phase S2.2 – Fernbedienung, Fokus und Zurück (2026-10-25)

S2.2 ergänzt einen stabilen Fokusgraphen für Header, Hero, Aktionen, Rail und Offline-Unteransichten. Reihen merken ihre zuletzt ausgewählte Kachel; D-Pad umbricht an den Rändern nicht. Beim Zurückspringen aus einer Unteransicht wird der vorherige Fokus wiederhergestellt. Mehrere Unteransichten bilden einen begrenzten Verlauf; eine explizite Home-Aktion leert den Verlauf. Ein einziger Keydown-Owner behandelt die Samsung-Fernbedienung. ScrollIntoView sichert den Fokus bei kleinen Bildschirmen oder später längeren Reihen. Die gesamte Oberfläche bleibt offline startfähig; keine echten Inhalte, API-Aufrufe oder AVPlay-Inhalte.

Nur JS/CSS/Offline-Navigation geändert; Original-Intro und Branding unverändert. Automatisierte GitHub-Checks erfolgreich. **S2.2 auf realem Samsung-TV vom Nutzer als PASS bestätigt (2026-10-25).** Links/Rechts ändert nur die Reiterauswahl; OK öffnet die Ansicht. Nächster Slice: S2.3 (Detailansichten, leere/Lade-/Fehlerzustände, Premium-Feinschliff).

## Phase S2.3 – Detailseiten und leere/Lade-/Fehlerzustände (2026-10-25)

Vier Bereiche (Live-TV, Aufnahmen, Suche, Timer) erhalten einheitliche, gerätefreundliche Dark-Premium-Detailansichten mit lokaler Statuskarte. Ein minimales Präsentationsmodell `app/src/views/view-state.js` liefert ausschließlich `offline`, `loading`, `empty` und `error`. Auf jeder dieser Seiten zeigt die Taste **„Zustände ansehen“** nacheinander die Ansichten; alle Testzustände sind ausdrücklich als Demo/Simulation gekennzeichnet. Es werden keine Daten abgerufen, keine tatsächlichen Sendungen/Aufnahmen vorgespiegelt und keine Medien gestartet. Der vorhandene S2.2-Fokusgraph bleibt der einzige D-Pad-Owner; Reiterwechsel allein lädt weiterhin keine Seite.

HTML/CSS verwenden nur mit Tizen 5.5 kompatible Grundlagen. Startvideo, Logo und Hardwarediagnose unter Einstellungen bleiben bestehen. Nach S3-API-Einführung ersetzt echte Anwendungslogik die lokalen Statusvorschauen; bis dahin gehört die Demonstration nicht zur Live-Nutzung.

Automatisierte Unit-/Runtime-/Zeilenenden-Checks hinzugefügt; echte TV-Abnahme der neuen S2.3-Oberfläche bleibt noch offen.

## Phase S3.1 – HTTPS und Public API v1 (2026-10-25)

Unter **Einstellungen → VDR-Suite-Server** kann die vollständige HTTPS-Basisadresse (ggf. einschließlich Reverse-Proxy-Pfad, aber ohne `/api/v1`) per TV eingegeben werden. Nur diese Adresse wird auf dem TV in `localStorage` gespeichert; niemals Credentials oder Pairing-Tokens.

Erst **„Verbindung prüfen“** startet zwei anonyme GETs auf `/api/v1` und `/api/v1/capabilities`. Der Client prüft API v1, unterscheidet Netzwerk-/TLS-CORS-/Timeout-, HTTP-, Redirect-, JSON- und Versionsfehler und folgert **keine** Permissions daraus. Reiterfokus allein löst weiterhin keine Anfrage aus.

Das Tizen-Manifest enthält `internet` und eine dynamische `access`-Policy, weil der Nutzer den Zielserver selbst festlegt. Der Programmcode akzeptiert ausschließlich HTTPS ohne eingebettete Zugangsdaten, Query oder Fragment. TLS-Validierung darf niemals deaktiviert werden. CORS und TV-Erreichbarkeit müssen am echten Samsung geprüft werden; eine vom Windows-Laptop funktionierende Verbindung genügt nicht.

**Status: S3.1-Quellcode/Test, TV- und Server-Gate OFFEN.** Pairing folgt separat in S3.2.
