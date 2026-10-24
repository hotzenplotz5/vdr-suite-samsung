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

Die im Verzeichnis `app/` enthaltene statische TV-Web-App zeigt einen Startbildschirm, vier Bereiche, sichtbaren Fokus und harmlose Gerätefähigkeits-Indikatoren. Sie nutzt **noch keine Netzwerk- oder Medienressourcen**.

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
