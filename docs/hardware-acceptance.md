# Hardware-Abnahme – Samsung GU43TU6979U

> **Stand 2026-10-25: TV-Retest erfolgreich.** Signierte App startet auf Tizen 5.5; Nutzer bestätigt originales Startvideo. JavaScript-Probes und D-Pad/OK laufen auf Hardware. Back/Exit, Medienwiedergabe und Audio der Startanimation bleiben separat offen.

## Geräteprofil

| Merkmal | Stand |
| --- | --- |
| Hersteller/Modell | Samsung GU43TU6979U (laut Typenschild) |
| Generation | 2020 |
| Bestätigtes Tizen | 5.5 (Device Manager zeigt tv-5.5) |
| Firmware | unbekannt |
| Windows-Host | Tizen TV 10.0 SDK/Device Manager installiert; TV verbunden |
| Netz | lokaler Ping erfolgreich; SDB/Device Manager nach vollständigem TV-Neustart verbunden (keine IP in Repo) |
| Remote VDR | vom Laptop per IPv6/SSH erreichbar, **nicht vom TV nachgewiesen** |

## Phase S1 Testmatrix

| ID | Erwartung | Status | Nachweis (ohne Secrets/IP) |
| --- | --- | --- | --- |
| S1.1-a | Laptop-TV-LAN Verbindung bestätigt | BESTÄTIGT | lokaler Ping 4/4, danach Device Manager |
| S1.1-b | Developer Mode ON, Device Manager/SDB sieht TV | BESTÄTIGT | TV-Anzeige DEVELOP MODE, Device Manager tv-5.5 |
| S1.1-c | gültiges Samsung-Signierprofil lokal | BESTÄTIGT | Zertifikatsprofil aktiviert; mit Build und Installation auf echtem TV praktisch erprobt |
| S1.2-a | `app/config.xml` mit realem SDK validiert | BESTÄTIGT | Tizen Extension meldet 'Project built successfully' |
| S1.2-b | `.wgt` erfolgreich signiert und installiert | BESTÄTIGT | `app/Debug/app.wgt`; Run Project zeigt App auf realem TV |
| S1.2-c | Launcher/Startbildschirm ohne Browserchrome | BESTÄTIGT | S1-Startbildschirm am TV ohne Browserchrome; nach Fix funktionsfähige JS-Probes |
| S1.3-a | D-Pad/OK, sichtbarer Fokus | BESTÄTIGT | Vier Screenshots: Fokus auf Startseite, Live-TV, Aufnahmen, Einstellungen; 'Letzte Taste: OK' |
| S1.3-b | Back/Exit sauber | OFFEN | |
| S1.3-c | Play/Pause/Stop/Farbtasten, soweit verfügbar | OFFEN | |
| S1.4-a | Tizen-API- und AVPlay-Verfügbarkeit sichtbar | BESTÄTIGT | TV zeigt Tizen API, Samsung AVPlay und TV-Tasten API jeweils 'vorhanden' (keine Codec-Akzeptanz) |
| S1.4-b | Bildschirmdarstellung und Relaunch geprüft | TEILWEISE | Sichtbare Bildschirmdarstellung bestätigt; eigenständiger Exit und Relaunch noch offen |

## Spätere Media-Gates (nur Vormerkung)

- TV kann den VDR-Server **direkt** per HTTPS erreichen: OFFEN.
- Mit Device-Grants gekapselte MediaSession startet: OFFEN.
- AVPlay akzeptiert gelieferten Transport/ggf. Cookies: OFFEN.
- Bild/Ton/Untertitel/Seek am Gerät: OFFEN.

Bei Fehlschlag: beobachtete Symptome, erwarteter Ist-/Sollstand, App-Git-SHA, TV-Firmware und SDK festhalten – niemals Credentials, Pairing-Token, IP-Adressen oder private URLs.


## VIDAA-Branding-Probe (S1.2, quellsseitig)

- Originaldateien `app/assets/branding/vdr-suite-icon-v4.png` und `app/assets/branding/startvideo.mp4` nachgewiesen.
- Startvideo-Overlay implementiert: Timeout, Decode-Fehler, Autoplay-Ablehnung und Fernbedienungs-Skip behandeln; Boot der App bleibt unabhängig.
- **Historie:** Erster TV-Test zeigte nur statische Oberfläche (Capabilities blieben bei 'wird geprüft'), Startvideo fehlte. Klassischer gebündelter JS-Einstieg und Generator-Korrekturen wurden eingespielt.
- **Retest 2026-10-25 – BESTÄTIGT:** Nutzer meldet 'Startvideo geht'; Logo und vier Menüs sichtbar. Tizen API / Samsung AVPlay / TV-Tasten API zeigen 'vorhanden', D-Pad-Fokus und OK funktionieren.
- **OFFEN:** Ton des Startvideos nicht separat bestätigt, Skip/Timeout/Autoplay-Fehlerpfade auf Hardware nicht durchgespielt; AVPlay-Inhaltswiedergabe nicht getestet.

## Phase S2.1 – Dark-Premium-UI (2026-10-25)

- Implementiert: neue HTML/CSS-Oberfläche mit Header, Hero, Aktionsleiste, Media-Rail und sechs Offline-Routen; die S1-Hardwarediagnose unter Einstellungen bleibt zugänglich.
- Quelle: vom Nutzer freigegebener Screenshot als **visuelle Referenz**, nicht als gerendertes App-Bild.
- Keine Live-Daten, kein API-Zugriff, keine echte Wiedergabe. Demo ausdrücklich sichtbar markiert.
- **Hardware-Abnahme OFFEN:** nach Pull/Build/Run 16:9-Darstellung, Fokus, OK, Back, Video-Intro und Fehllayout bei 1080p am realen TV prüfen.
