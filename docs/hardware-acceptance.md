# Hardware-Abnahme – Samsung GU43TU6979U

> **Stand 2026-10-25: Erster TV-Start bestätigt.** Statische Oberfläche sichtbar; JavaScript-Boot und Startvideo beim ersten Test nicht nachgewiesen. Hardware-Retest nach Fix offen.

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
| S1.1-c | gültiges Samsung-Signierprofil lokal | BESTÄTIGT | Certificate Manager meldet Profil angelegt und aktiviert; Signierung noch nicht getestet |
| S1.2-a | `app/config.xml` mit realem SDK validiert | BESTÄTIGT | Tizen Extension meldet 'Project built successfully' |
| S1.2-b | `.wgt` erfolgreich signiert und installiert | BESTÄTIGT | `app/Debug/app.wgt`; Run Project zeigt App auf realem TV |
| S1.2-c | Launcher/Startbildschirm ohne Browserchrome | TEILWEISE | Statische S1-Seite auf TV sichtbar; JS-Boot nicht nachgewiesen |
| S1.3-a | D-Pad/OK, sichtbarer Fokus | OFFEN | |
| S1.3-b | Back/Exit sauber | OFFEN | |
| S1.3-c | Play/Pause/Stop/Farbtasten, soweit verfügbar | OFFEN | |
| S1.4-a | Tizen-API- und AVPlay-Verfügbarkeit sichtbar | OFFEN | |
| S1.4-b | Bildschirmdarstellung und Relaunch geprüft | OFFEN | |

## Spätere Media-Gates (nur Vormerkung)

- TV kann den VDR-Server **direkt** per HTTPS erreichen: OFFEN.
- Mit Device-Grants gekapselte MediaSession startet: OFFEN.
- AVPlay akzeptiert gelieferten Transport/ggf. Cookies: OFFEN.
- Bild/Ton/Untertitel/Seek am Gerät: OFFEN.

Bei Fehlschlag: beobachtete Symptome, erwarteter Ist-/Sollstand, App-Git-SHA, TV-Firmware und SDK festhalten – niemals Credentials, Pairing-Token, IP-Adressen oder private URLs.


## VIDAA-Branding-Probe (S1.2, quellsseitig)

- Originaldateien `app/assets/branding/vdr-suite-icon-v4.png` und `app/assets/branding/startvideo.mp4` nachgewiesen.
- Startvideo-Overlay implementiert: Timeout, Decode-Fehler, Autoplay-Ablehnung und Fernbedienungs-Skip behandeln; Boot der App bleibt unabhängig.
- **Erster TV-Test:** Logo und statische Oberfläche sichtbar; Video nicht gestartet, Capability-Texte blieben bei 'wird geprüft'. Klassischer gebündelter JS-Einstieg vorbereitet; Wirkung am TV, Video und Fernbedienung weiter OFFEN.
