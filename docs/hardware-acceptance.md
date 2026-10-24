# Hardware-Abnahme – Samsung GU43TU6979U

> **Stand 2026-10-24: Nicht getestet.** Quellcode, CI und Emulator sind kein Ersatz für echte Hardware.

## Geräteprofil

| Merkmal | Stand |
| --- | --- |
| Hersteller/Modell | Samsung GU43TU6979U (laut Typenschild) |
| Generation | 2020 |
| Erwartetes Tizen | 5.5 (Jahres-Tabelle; auf TV noch zu bestätigen) |
| Firmware | unbekannt |
| Windows-Host | vorhanden; SDK noch nicht nachgewiesen |
| Netz | Routertyp und lokale IP-Konfiguration noch offen |
| Remote VDR | vom Laptop per IPv6/SSH erreichbar, **nicht vom TV nachgewiesen** |

## Phase S1 Testmatrix

| ID | Erwartung | Status | Nachweis (ohne Secrets/IP) |
| --- | --- | --- | --- |
| S1.1-a | Laptop-TV-LAN Verbindung bestätigt | OFFEN | |
| S1.1-b | Developer Mode ON, Device Manager/SDB sieht TV | OFFEN | |
| S1.1-c | gültiges Samsung-Signierprofil lokal | OFFEN | |
| S1.2-a | `app/config.xml` mit realem SDK validiert | OFFEN | |
| S1.2-b | `.wgt` erfolgreich signiert und installiert | OFFEN | |
| S1.2-c | Launcher/Startbildschirm ohne Browserchrome | OFFEN | |
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

