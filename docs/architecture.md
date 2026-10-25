# Architektur – Samsung TV Client

## Quelle der Wahrheit

- VDR-Suite: autorisierte Backend-, Channels-, EPG-, Recordings-, Timer- und MediaSession-Domäne.
- VDR-Suite Public API v1: einzige unabhängige Client-Schnittstelle.
- Samsung-App: UI, Remote-Eingabe, lokaler Fokus, Samsung-Geräteintegration und AVPlay.
- VIDAA-App: getrennte Client-Implementierung, lediglich konzeptionelle Referenz.

## Aufteilung

```text
app/
  index.html              statische Runtime-Shell
  styles.css              TV-optimierte Darstellung
  src/main.js             ein Composition Root und Keydown-Owner
  src/navigation/         normierte Eingaben und Focus-Modell
  src/platform/           TV-Erkennung, Samsung-Key-Registrierung
  src/api/                Public-v1 Discovery (S3.1), später Pairing und Device-API
  src/player/             später AVPlay Adapter (S5)
  src/views/              später View-Komponenten und Routen (S2)
```

Leere spätere Modulverzeichnisse werden erst mit einem konkreten Slice angelegt: Git speichert keine leeren Ordner.

## Daten-/Kontrollfluss (später)

```text
Samsung Remote -> RemoteInput -> Focus/Router -> View
                                     |
                                     v
                              PublicV1Client -- HTTPS --> VDR-Suite
                                     |
                            PlaybackController
                                     |
                               SamsungAVPlay
```

**Ein Playback-Owner**, serverseitig ausgehandelte Medienprofile, kein Transport interner Providerpfade. Fähigkeiten des TVs sind Fakten, niemals Berechtigungen. Authentifizierung/Autorisierung gesondert behandeln.

## Netzwerkgrenzen

Entwicklungsgerät und TV sollen für SDB/Testinstallation einander lokal erreichen können. Dass der Windows-Laptop den VDR-Suite-Host per SSH/IPv6 erreicht, bedeutet nicht, dass der Samsung-TV dessen HTTPS-API oder die MediaSession erreichen kann. Das wird erst in S3 ausdrücklich geprüft; keine ungesicherten Ports als Abkürzung.

## Plattform-Kompatibilität

2020 Samsung TV: Tizen-Generation 5.5, Chromium-M69-Webengine laut Samsung-Tabelle. Deshalb zunächst Vanilla JavaScript, keine Bundler-/Frameworkpflicht, keine zwingenden modernen CSS-Funktionen. Für echte Wiedergabe später die Samsung AVPlay-API, nicht ein unverifiziertes generisches HTML5-Video-Fallback.

## Design-Referenzen

VDR-Suite-Web-Frontend ist Referenz für Inhalte, Ordnung und Farbkonzept. TV-Interaktion und Layout sind dennoch Samsung-spezifisch; keine HTML-Frontend-Kopie und keine Bildschirm-Pixel des nativen VDR-OSD.

## Security

S1 hat keinen Netzwerkzugriff; S3 führt ausschließlich HTTPS und serverseitige Device-Auth ein. Die App speichert nie Adminpasswörter. Pairing-Credentials dürfen nicht in URLs, Logs, Fixtures, Screenshots oder Git enthalten sein.

Referenzen:
- https://github.com/hotzenplotz5/vdr-suite/tree/main/api
- https://developer.samsung.com/smarttv/develop/guides/fundamentals/configuring-tv-applications.html
- https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html

