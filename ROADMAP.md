# VDR-Suite Samsung – client-lokale Roadmap

Stand: 2026-10-24. **Sx** sind ausschließlich Samsung-Projektphasen. Keine VDR-Suite- oder VIDAA-Phase wird umnummeriert.

## Regeln für jeden Slice

1. Der Slice nennt explizit betroffene Dateien, Schnittstellen, Risiken und Nichtziele.
2. Tests müssen reproduzierbar und negativ ausgelegt sein. Desktop-Simulation ist kein Hardware-Nachweis.
3. Eine Plattformfunktion wird erst als **accepted** bezeichnet, wenn sie auf dem realen Samsung GU43TU6979U nachgewiesen ist.
4. Kein neuer oder privater VDR-Suite-API-Endpunkt ohne separate geprüfte Upstream-Entscheidung.
5. Kein Live-Server-Deployment, keine Zugangsdaten und kein anderer Repository-Write durch einen Samsung-Slice.

## Phase S0 – Grundlagen (Dokumentation und Quellgerüst)

- **S0.1 Repository:** eigener `main`, README, Git-Regeln, CI. **Quellgerüst angelegt; CI noch zu prüfen.**
- **S0.2 Architektur:** Plattformadapter, Domänen-/API-Grenze, Navigation und Playback-Owner. **Dokumentiert.**
- **S0.3 Arbeitsweise und Prüfkatalog:** Windows-Setup, Remote-Netzwerk, echte Hardware-Abnahme. **Dokumentiert.**

**Gate:** alle Startdateien vorhanden und Tests grün. Das ist ausdrücklich noch keine TV-Abnahme.

## Phase S1 – echte Samsung-Runtime (nächster Arbeitsblock)

- **S1.1 Toolchain und Verbindung:** Windows + Samsung TV Extension/Tizen-Tooling, lokales IP-Netz, TV Developer Mode, Zertifikatsprofil. Ergebnis: TV per Device Manager/SDB sichtbar.
- **S1.2 App-Paket:** `config.xml`/Icon validieren, signiertes `.wgt` erzeugen und installieren. Original-VIDAA-Logo und lokales Startvideo sind quellsseitig eingebunden. Erster .wgt-Build und statischer App-Start am echten Tizen 5.5 bestätigt; JavaScript-Boot nicht sichtbar (Capabilities weiterhin 'wird geprüft'), Startvideo nicht gezeigt. Klassischer Offline-JS-Einstieg vorbereitet, Hardware-Retest OFFEN.
- **S1.3 Eingabe und Fokus:** D-Pad, OK, Back, Play/Pause/Stop und Farbtasten soweit vom Gerät geliefert, jeweils per Bildschirmstatus prüfen. Ergebnis: kein Mauszeiger, kein Fokusverlust.
- **S1.4 Fähigkeitstest und Restart:** Tizen-API und AVPlay-Verfügbarkeit erkennen, 1080p/4K-Darstellung prüfen, Start/Beenden/Neustart belegen. Ergebnis: [Hardware-Abnahme](docs/hardware-acceptance.md) ausgefüllt.

**Gate:** echter TV startet die signierte App; Navigation und Exit funktionieren reproduzierbar. Bis dahin S1 = **unverified**.

## Phase S2 – TV-Oberfläche

- **S2.1** Verbindliche visuelle Referenz: vom Nutzer bereitgestellter Dark-Premium-Media-Home-Screenshot (obere Navigation, große Live-TV-Hero-Karte, Aktionsleiste, horizontale Reihen); keine fiktiven Sender/EPG-Daten als echte Inhalte ausgeben. Routen, Zustände (loading/ready/empty/error), nachvollziehbarer Back-Stack.
- **S2.2** Samsung-tauglicher Fokusgraph, klare Remote-Events, Raster und Content-Rails.
- **S2.3** Web-Frontend-Parität als Produktreferenz, ohne Browser-Private-API oder massenhaftes Laden.

**Gate:** Bedienung per D-Pad am TV; noch ausschließlich kontrollierte Fixtures.

## Phase S3 – API-v1-Anbindung und Identität

- **S3.1** HTTPS-Origin, Capability Discovery, Fehlertypisierung und netzwerkseitige Erreichbarkeit des TVs.
- **S3.2** Device-Pairing: Bootstrap -> Admin-Freigabe -> einmalige Credential-Ausgabe -> Device-Auth.
- **S3.3** sichere TV-Credential-Persistenz, Widerruf und getrennte Backend-Grants.

**Gate:** Testgerät authentifiziert sich mit `VDR-Suite-Device`-Scheme; fehlende Grants werden ausdrücklich verweigert. Remote-SSH des Laptops zählt nicht als Netzwerkpfad des TVs.

## Phase S4 – Aufnahmen/Library

- **S4.1** Backend- und Recording-Collection, begrenzte Seiten statt Katalog-Vollabruf.
- **S4.2** VDR-Ordneransicht (`view=folders`), sichere Back-Navigation und echte Identitäten.
- **S4.3** Genres, Artwork nur über freigegebene APIs, Details/Continue Watching.

**Gate:** echte Ordner auf großem Katalog mit begrenzter DOM-Größe und unverfälschten Recording-IDs.

## Phase S5 – Samsung-Wiedergabe

- **S5.1** AVPlay-Adapter: Lebenszyklus, Status/Fehler, ein Playback-Owner.
- **S5.2** authorized Device Recording MediaSession mit von Suite gewähltem Profil.
- **S5.3** Audio/Untertitel, Seek/Resume, Session-Cleanup, Abbruch/Widerruf.

**Gate:** Bild und Ton, Fehlerpfade und STOP/BACK am realen Gerät; keine URL-/Cookie-/Codec-Annahmen ohne Hardware-Nachweis. Priorität Pass-through -> Remux -> Transcode nur nach serverseitiger Policy.

## Phase S6 – VDR-TV-Funktionen

- **S6.1** Channels/Live-TV, inklusive Hardware-Player-Prüfung.
- **S6.2** EPG und Timer per öffentlichen Verträgen.
- **S6.3** Suche, Teletext, HbbTV, Legacy-OSD nur nach eigenständiger Machbarkeits- und API-Prüfung.

## Phase S7 – Verteilung/Wartung

Signierung, Reproduzierbarkeit, Versionierung, Update-/Rollback-Pfad, Modell-Kompatibilitätsmatrix; Store-Einreichung erst nach getrenntem Entscheid.

## Nächster konkreter Schritt

**S1.1:** Lokale IPv4-Adressen von Windows-Laptop und Samsung feststellen, gleichen erreichbaren Netzwerkbereich prüfen, Tizen-Toolchain installieren, Samsung-Developer-Mode aktivieren. Anleitung: [docs/development-setup.md](docs/development-setup.md).

