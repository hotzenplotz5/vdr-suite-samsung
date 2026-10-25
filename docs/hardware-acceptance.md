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


## Phase S2.3 – Detailansichten (Nutzer-PASS; Umfang der TV-Einzeltests offen)

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

## S3.1 – bestätigte Verbindung (2026-10-25)

**TV-BESTÄTIGT:** Samsung-Gerät zeigt mit HTTPS-Serverbasis inklusive Proxy-Prefix `/vdr-suite`: `Public API v1 erreichbar. 31 Fähigkeiten gemeldet`. Screenshot vom Nutzer bestätigt. Ohne Prefix erschien vorher HTTP 502. Diese Bestätigung beweist Discovery, nicht Admin-Login, Kopplung, Grants oder Streaming. Keine private Serveradresse in Repository-Dateien.

## S3.2 – Geräte-Pairing und KeyManager (Implementierung, TV-Gate offen)

- [ ] S2-Design/Intro und S3.1-API-Discovery weiterhin nutzbar.
- [ ] Tizen-KeyManager Preflight auf echtem TV erfolgreich (keine Browser-Fallback-Speicherung).
- [ ] Echte Bootstrap-POST-Antwort zeigt nur `userCode` öffentlich; Token nicht teilen.
- [ ] Admin bestätigt im Server-Frontend per eigener Session; TV liest `approved` über Token-GET.
- [ ] Einmaliges Credential-POST nur nach KeyManager-Preflight; Readback exakt erfolgreich.
- [ ] GET `/api/v1` mit Device-Schema ergibt authentifizierten Actor ohne automatische Grants.
- [ ] App-Neustart findet gespeichertes Credential wieder; Login erneut prüfen.
- [ ] Negative Gates: fehlender KeyManager, abgelehnter/abgelaufener Code, HTTP 401/409/410/503, Netzwerkfehler.
- [ ] Server-Grants werden nicht als durch Pairing erteilt angezeigt.

Keine Fotos oder Logs mit dem Kopplungscode (nur kurzlebig), Pairing-Token oder Credential-Secret veröffentlichen. Keine Protokolle im Quellbaum; niemals Credentials kopieren. Release-Status: S3.2 weiterhin **unverified auf Hardware**.

## S3.2 – Entwicklungs-Testinstallation und gespeicherte Serveradresse

- Die nach einem Tizen-Run-Project-Test-Update verlorene Serveradresse erklärt sich aus dem von Samsung dokumentierten Uninstall vor dem Test-Build. Das gelöschte Web-Storage kann die App nicht rückwirkend rekonstruieren.
- Neue Git-ignorierte Entwicklerdatei `app/device-local.js` kann mit `npm.cmd run configure:tv -- <HTTPS-Basisadresse>` auf dem **Laptop** erzeugt werden. Sie wird für neue `.wgt`-Testpakete mit in das App-Verzeichnis gelegt und beim Start **ohne Netzwerkzugriff** als Serverbasis in das Feld übernommen.
- Eine auf dem TV gespeicherte gültige Basis hat Vorrang. Änderungen im Eingabefeld werden bei `blur` bzw. `change` lokal gespeichert.
- `Kopplung starten` führt fehlende Public-v1-Discovery selbst durch. Ungültige/unerreichbare Server stoppen vor KeyManager- und Pairing-POST.
- **Hardware-Retest offen:** tatsächliches Mitsignieren/-packen der lokalen Datei im Tizen-VS-Code-Build; Darstellung, KeyManager und authentifiziertes Pairing auf dem realen Samsung noch nicht abgenommen.

## S3.2 – Kopplung am TV real bestätigt, Update-Persistenz offen (2026-10-25)

Der Samsung Tizen 5.5 hat die echte VDR-Suite-Public-v1-API per HTTPS erreicht, die Administratorfreigabe erhalten und ein einmaliges Device-Credential aktiviert. Nach einer erneuten VS-Code-/Tizen-`Run Project`-Testinstallation meldete das TV **„Kein gespeichertes Device-Credential“**; die alte serverseitige Device-Identität blieb aktiv. Erneutes Pairing/Aktivieren erzeugte ein **zweites** Samsung-Device im Admin-Inventar. Die neue Identität erhielt **nicht** automatisch die Berechtigung des alten Devices. Der Administrator musste `channels.view@default` explizit neu erteilen. Nach der neuen Kopplung konnte der TV authentifiziert echte Sender lesen. Erhalt nach einem weiteren TV-Neustart oder einem **datenbewahrenden** Update ist weiterhin offen.

## S3.3 – Erste echte Senderseite HARDWARE-PASS, Folgegates offen (2026-10-25)

- [x] S3.3-Paket mit VS Code/Tizen Extension per **Build Project / Run Project** auf Samsung Tizen 5.5 installiert; „Live-TV – Echte Sender“ sichtbar.
- [x] Gespeichertes Credential fehlt nach Testinstallation: sichere Fehlermeldung statt privatem Fallback; kein automatischer Pairing-POST.
- [x] Neue Kopplung vom Nutzer genehmigt und Gerät aktiviert; der Client authentifiziert sich für den anschließenden Channel-Read über Public v1.
- [x] **Negativer Grant-Test:** `GET /api/v1/backends` resultiert für das neue noch nicht berechtigte Device in „Keine Backends freigegeben“; kein heimlicher Serverzugriff.
- [x] **Positiver Grant-Test:** Der Administrator gibt `channels.view@default` **für die neue** Geräteidentität frei; anschließend `20 echte Sender geladen` inklusive Das Erste HD, SWR RP HD und weiteren echten Nummern/Namen. Source- und TV-Bestätigung vorhanden.
- [ ] **Sender-Reihenfolge nach VDR `channels.conf`:** Aktuell sortiert der Public-v1-Vertrag nach `backendId,channelId` und zeigt deshalb auf der ersten Seite z. B. 1, 17 und 230; benötigte neue, über alle Cursorseiten stabile `channelNumber`-Sortierung zuerst **serverseitig** definieren und implementieren. Kein clientseitiges Sortieren nur der sichtbaren 20 Zeilen.
- [ ] **Mehr Sender**/Cursor-Seite 2 und 409 bei Scope-/Snapshot-Wechsel; mehrere Backends/Backendwechsel nur falls tatsächlich vorhanden.
- [ ] Device-Speicher **nach regulärem App-Neustart**, nach datenbewahrendem App-Update; kein erneutes Pairing pro Release.
- [ ] HTTP 401 (widerrufenes Credential), explizit verweigertes Backend/403, Timeout, 503 und Navigation/Zurück in der aktualisierten Ansicht unter echten Bedingungen.
- [ ] Browsergeräte-Refresh tatsächlich ≤10 Sekunden bei sichtbarem Tab; Stop bei unsichtbarem Tab und richtige Device-Auswahl bei doppelten Namen. UI für ausdrücklichen Widerruf/Retire alter Devices offen.
- [ ] Echte Live-TV-MediaSession, AVPlay-Bild/Ton/Stop/Back; Recording/EPG und Backend-Mutationen sind **nicht** Teil des bestandenen S3.3-Tests.

**Quelle der gemeinsamen API-Verträge und einziges serverseitiges Abnahme-Inventar:** [VDR-Suite API-v1-Hardwarematrix](https://github.com/hotzenplotz5/vdr-suite/blob/main/docs/development/public-v1-final-hardware-acceptance.md). Servergrants, Pairing, REST-Fehler und Channel-Paging nicht als zweite Samsung-API erfinden; Samsung-spezifisch sind Tizen-KeyManager, App-Update-Verhalten, D-Pad und AVPlay.

Bei Fehlern nur den angezeigten Wortlaut (ohne private Adresse/Token) teilen. Bestehende Geräte und Berechtigungen nicht auf Verdacht löschen; keine vorher bestandenen Server-Hardwaretests wiederholen.

### Achtung: Update kann Device-Identität löschen (Tizen 5.5)

Vor einem neuen Run Project oder Installieren den aktuellen TV-App-Stand nur beenden und neu starten, dann unter Einstellungen einmal Anmeldung prüfen wählen. Damit wird zuerst die Persistenz der bereits erfolgten Kopplung geprüft, ohne die App zu ersetzen.

Samsung dokumentiert, dass beim Installieren einer neuen App-Version die bisherige App automatisch deinstalliert wird und bei Uninstall Anwendungsdaten verloren gehen können:
https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode/connecting-to-tv-device.html
https://developer.samsung.com/smarttv/develop/faq/application-installation.html

Deshalb für diesen Nachweis nicht unbedacht Run Project erneut verwenden. WITs Watch ermöglicht auf unterstützten Samsung-TV-Modellen Live-Reload ohne erneute Installation, verlangt jedoch ein eigenes geprüftes Setup und ist hier NICHT als sicherer Erhalt des bestehenden KeyManager-Zustands bestätigt. Kein Secret exportieren und keine automatisch wiederholte Kopplung als Workaround.


## S4.1 – Echte Aufnahme-Metadaten (noch kein TV-Test, 2026-10-25)

**Stand: IMPLEMENTIERT IM SAMSUNG-SOURCE-BRANCH; REAL-SAMSUNG = NOT_VERIFIED.** Das bestehende S3.3-Channel-Hardware-PASS ist **kein** Nachweis für die separate Aufnahmen-Berechtigung. Keine neue Test-Device-Identität auf Verdacht anlegen.

- [ ] Nach Daten-/Credential-schonender TV-Installation unter Einstellungen **Anmeldung prüfen**. Ein VS-Code-`Run Project`-Update kann lokale KeyManager-Daten löschen: Verlust ausdrücklich als Update-Risiko dokumentieren und nicht mit stiller Neu-Kopplung kaschieren.
- [ ] Unter **Aufnahmen** per OK auf **Aufnahmen laden**: ohne `recordings.view@default` eine klare, sichere Berechtigungsfehlermeldung; eine bereits existierende `channels.view@default`-Freigabe ist dafür unzureichend.
- [ ] Administrator erteilt danach dem **aktuell aktiven Samsung-Device** explizit `recordings.view@default`; erneuter manueller Aufruf zeigt echte Aufnahmen mit Server-Titel, Zeit, Dauer/Größe und **Suite-`rec_...`-ID intern** statt erfundener Demos.
- [ ] D-Pad-Pfeile/OK fokussieren Aufnahmezeilen, scrollen sichtbar und bleiben nach Backend-/Seitenwechsel bedienbar. Eine Auswahl zeigt derzeit Metadatenhinweis; **weder Session noch Playback**.
- [ ] Bei mehr als 100 Aufnahmen navigieren **Weitere Aufnahmen** und **Vorherige Seite** über echten `rc1_`-Cursor; maximal 100 DOM-Zeilen, aber **keine Gesamtgrenze**. Bei höchstens 100 Aufnahmen keinen künstlichen Testkatalog erzeugen; Cursormehrseite dann gezielt später prüfen.
- [ ] Browser-/HTTP-Fehler 401, 403, 409, 503, Netzwerk/TLS/CORS sowie eine verspätete Antwort nach Zurück zur Startseite oder Live-TV: keine heimlich angezeigten Fremddaten und keine private API als Fallback.
- [ ] Nach erneutem Öffnen kein ungefragter Backend-/Recording-Fetch durch bloßes Menü-Fokussieren; OK löst den Lesevorgang aus; kein Medien-Cookie oder secret in UI/Logs.

**Upstream Hardware-Matrix:** [API-v1 kumulative REAL-VDR-/Client-Gates](https://github.com/hotzenplotz5/vdr-suite/blob/main/docs/development/public-v1-final-hardware-acceptance.md). S4.1 zeigt nur Metadaten; S4.2 Ordnernavigation, S5 AVPlay/MediaSession und S5.3 P1-Resume folgen. Bereits akzeptierte Backend-Recording-READ-/WRITE-Proben werden nicht allein wegen dieses Samsung-Clients erneut ausgeführt.


## S7.1 – Datenbewahrendes Samsung-Entwicklungsupdate per WITs Watch (offen)

**Source/Offline-Teststand:** Der neue Befehl `npm.cmd run tv:watch` verwendet ausschließlich `wits --watch`; vor dem Start werden die lokale WITs-Konfiguration, der Ausschluss von Zertifikatsdateien/Debug-Artefakten, die unveränderte Paketidentität, der synchronisierte `tv-runtime.js`-Build und Offline-Tests geprüft. Der Befehl enthält **keinen** Installations-/Deinstallationsfallback. WITs Watch ist laut Samsung für 2020 / Tizen 5.5 unterstützt. **Hardware-PASS noch nicht erteilt.**

**Real-TV-Test ohne Secrets oder Verlust eines weiteren Device-Accounts:**

- [ ] Einmalige WITs-Einrichtung auf dem Windows-Entwicklungsrechner mit der vorhandenen Samsung-Zertifikatkette. Der allererste WITs Start **kann** eine neue App-Installation bedeuten und ist **kein** sicherer Update-Test. Mit existierender Kopplung nicht ungefragt starten.
- [ ] Vor erstem Watch: vorhandene App mit demselben `VDRSuiteTV.VDRSuite`-Paket auf dem TV öffnen. Falls das KeyManager-Credential nach früherem `Run Project` bereits verloren ist, ist eine einmalige bewusste Neu-Kopplung nach Abschluss des Bootstrap erforderlich; keine automatische Migration alter Device-Rechte.
- [ ] Unter Einstellungen `Anmeldung prüfen` -> Erfolg; Backend/Grants der **aktiven** Device-Identität vor Watch überprüfen; keine secret-Werte oder private URLs protokollieren.
- [ ] Nur `npm.cmd run build:tv`, `npm.cmd run check`, `npm.cmd run tv:watch`; am vorhandenen App-Paket **eine harmlose Text-/UI-Änderung** synchronisieren. Vorhandene App muss neu laden ohne Deinstallation oder unerwartete Paket-ID-/Signaturänderung.
- [ ] Nach Watch: `Anmeldung prüfen` weiter erfolgreich; `Sender laden` zeigt weiterhin freigegebene echte Sender, `Aufnahmen laden` bei gesondertem `recordings.view` dieselbe berechtigte Mediathek. **Kein** neuer Server-Device-Eintrag, **kein** erneutes Pairing und **keine** erneute Grant-Vergabe nötig.
- [ ] Normales App-Beenden/Relaunch wiederholt obige Login-Prüfung; Watch-Abbruch/Missing Config führt **nicht** zu `Run Project`-/Install-Fallback.
- [ ] WITs Watch kann `config.xml`, Store-/Release-Updates und nicht vorbereitete bestehende Pakete **nicht** als harmloses Update garantieren. Einmalige produktive Paket-/Signaturaktualisierung erhält erst mit eigener TV-Testmatrix den Status PASS.

**Abgrenzung:** Die tatsächlich bereits verlorenen Tizen-KeyManager-Bytes lassen sich nicht aus dem Server-Device-Eintrag rekonstruieren. Nie Credential in JS-Konfiguration, PC-Dateien, Web-Storage, Logs oder ungeschützte Remote-Kanäle übertragen. Die API-v1-Gerätekopplung und per-Device-Grants bleiben serverseitig autorisiert und werden durch diesen Entwicklungspfad nicht verändert.
