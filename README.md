# VDR-Suite Samsung

Eigenständiger Samsung-Smart-TV-Client für **VDR-Suite**. Zielplattform: Samsung Tizen TV; erstes Testgerät: **Samsung GU43TU6979U (2020 / Tizen-Generation 5.5)**.

> **Status:** Phase S0 (Repository-/Architektur-Grundlage) vorbereitet; Phase S1 (echte TV-Hardware) **noch nicht abgenommen**. Weder Paketinstallation noch Wiedergabe oder API-Zugriff sind auf diesem Fernseher verifiziert.

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

## Phase-S1-Prototyp (noch nicht auf TV getestet)

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

Die beiden Originaldateien `app/assets/branding/vdr-suite-icon-v4.png` und `app/assets/branding/startvideo.mp4` wurden aus dem eigenständigen VIDAA-Projekt übernommen und bleiben unverändert. Die kurze Startanimation läuft lokal, kann mit OK/Zurück/Stop übersprungen werden und blockiert den TV-Start nicht, falls der Decoder sie ablehnt. Ob sie auf Tizen 5.5 tatsächlich mit Bild/Ton läuft, ist noch nicht getestet.

Verbindliches späteres UI-Ziel: das vom Nutzer bereitgestellte dunkle Media-Home-Design mit oberer Navigation, großer Live-TV-Hero-Karte und horizontalen Inhaltsschienen. Der kleine S1-Diagnosebildschirm ist ausdrücklich **noch nicht** dieses finale Design.

## Erster TV-Test und Tizen-5.5-Boot-Korrektur

Der erste signierte `.wgt`-Build wurde am echten Samsung installiert und zeigte den statischen S1-Bildschirm samt Logo. **Startvideo nicht sichtbar, alle drei Capability-Anzeigen blieben bei `wird geprüft`.** Das weist auf einen fehlenden JS-Boot hin, ist ohne Gerätekonsole noch keine endgültig bewiesene Ursache.

Die paketierte App nutzt nun `app/tv-runtime.js` als klassisches Script ohne Modulimporte. Die Module unter `app/src/` bleiben die Entwicklungsquellen. Nach JS-Änderungen `npm run build:tv` ausführen und das generierte Script mitcommitten; `npm run check` verweigert veraltete Bundles. Das Tizen-VS-Code-Build-Tool führt npm nicht selbst aus.

**Erneute Hardware-Abnahme offen:** Fähigkeitsanzeigen sollten auf „vorhanden“/„nicht erkannt“ wechseln; Fernbedienung, Startvideo-Bild/Ton und Videodecoder gesondert testen.

## Git for Windows: `Stale app/tv-runtime.js`

Die erste TV-Runtime-Generatorversion verglich die Zeilenenden bytegenau. Bei Git for Windows können ausgecheckte Textdateien `CRLF` enthalten, während der Generator `LF` erwartet. Der Generator normalisiert jetzt Eingabe und Vergleich auf `LF`. Ein isolierter Test simuliert `CRLF` für sämtliche Quell-/Build-Dateien und prüft zusätzlich, dass tatsächlich veraltete Bundles weiterhin abgewiesen werden. Kein globales Ändern von Git-/Windows-Einstellungen nötig.

## TV-Runtime-Syntaxkorrektur

Beim erneuten lokalen `npm run check` meldete Node.js einen Syntaxfehler in der ersten Kommentarzeile der generierten TV-Runtime. Die Glob-Schreibweise in einem Blockkommentar enthielt unabsichtlich einen Kommentarabschluss. Sowohl Generator als auch generiertes Script verwenden jetzt einen Kommentar ohne Glob-Syntax; der neue Regressionstest überprüft die Runtime zusätzlich mit `node --check`. Erneuter Check unter Windows und TV-Retest stehen noch aus.
