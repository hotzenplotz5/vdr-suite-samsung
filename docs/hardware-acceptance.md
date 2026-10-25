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
| S1.3-b | Back/Exit sauber | TEILWEISE | BACK von Einstellungen zurück auf Startseite vom Nutzer bestätigt; Exit und Relaunch noch offen |
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
- **Visuelle Abnahme PASS (Nutzerbestätigung):** Nutzer bestätigt Dark-Premium-Design auf Samsung mit 'gefällt mir! und pass!'. Volle Navigation und Fokus-Rückkehr auf dem neuen Screen sind Gegenstand des S2.2-Hardware-Gates.

## Phase S2.2 – Fernbedienung und Fokus (2026-10-25)

- **Gesamt-Abnahme: PASS laut Nutzer**, nach Installation und Test auf dem realen Samsung-TV („pass, hab schon getestet“).
- Implementiert und automatisiert geprüft: Fokusgraph für Menü, Hero, Aktionsleiste, horizontale Rail; Fokus-Rückkehr nach Back, Verlauf zwischen Detailansichten, Vermeidung versteckter Fokuselemente. GitHub-Actions-Checks zum Implementierungscommit `785b4b9` erfolgreich.
- **Bewusste Bedienungsentscheidung:** Links/Rechts markiert den Reiter ohne sofortigen Seitenwechsel; OK öffnet ihn. So sind bei künftiger API-Anbindung keine unnötigen Seitenladungen durch bloßes Blättern nötig.
- **Separat weiterhin offen:** Exit-/Relaunch-Detailprotokoll aus S1, Medienfunktionen und API-/Netzwerk-Gates. Die allgemeine S2.2-PASS-Meldung ist kein gesonderter Messnachweis für jeden Einzelpunkt.


## Phase S2.3 – Detailansichten (Nutzer-PASS 2026-10-25)

- [ ] S2.1-Startbildschirm und lokales MP4-Intro unverändert, kein schwarzer Bildschirm
- [ ] Reiter mit Pfeilen nur fokussieren, mit OK öffnen (kein ungewolltes Nachladen)
- [ ] Live-TV/Aufnahmen/Suche/Timer: in allen vier Ansichten Statuskarte und visuelle Grafik vorhanden
- [ ] „Zustände ansehen“ erreicht der D-Pad-Fokus; OK zeigt nacheinander Laden, Leer, Fehler, Offline
- [ ] Testzustände deutlich als Demo erkennbar; kein echter Serververkehr, keine fiktiven Inhalte
- [ ] Zurück führt zur zuvor fokussierten Reiter-/Home-Kachel
- [ ] Einstellungen zeigen weiter Tizen-/AVPlay-/Fernbedienungsdiagnose
- [ ] Keine abgeschnittenen Fokusrahmen auf dem echten Samsung-Bildschirm

**Abnahmehinweis:** Nutzer meldete nach dem S2.3-Update „pass dann wohl s.3 ;)“. S2.3 wird als vom Nutzer angenommen dokumentiert; separate Messnachweise jedes einzelnen Status-Zyklus liegen nicht vor.

## Phase S3.1 – Public API v1 (TV-Abnahme offen)

- [ ] Neue App startet unverändert offline, ohne automatischen Netzwerkzugriff
- [ ] Serveradresse im TV unter Einstellungen eingegeben; ausschließlich HTTPS
- [ ] „Verbindung prüfen“ führt nur auf OK zu den zwei anonymen öffentlichen API-v1-GETs
- [ ] Antwort v1 und Fähigkeitsanzahl bestätigt – daraus werden keine Rechte abgeleitet
- [ ] Ungültige URL, Timeout, HTTP, inkompatible Antwort und TLS/CORS/Netzwerkfehler verständlich
- [ ] Rücknavigation, Fokus und Startvideo aus S2 unverändert

Der Samsung-TV selbst muss TLS, Proxy-Pfad und CORS erfolgreich nutzen können. Tizen-Manifest mit dynamischer Netzwerkfreigabe nur für diese geprüfte HTTPS-Discovery; vor Distribution gesondert auditieren. Keine Umgehung von Zertifikatsprüfungen, kein Klartext-HTTP. **TV-PASS noch offen.**
