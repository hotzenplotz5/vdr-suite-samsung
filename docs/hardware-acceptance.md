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

## Sichtbare App-Version und WITs-Fehlstart – offener TV-Test (25.10.2026)

- [ ] **Buildkennung auf echtem Samsung sichtbar:** Neues, aus dem gebündelten Inhalt deterministisch berechnetes Label `Samsung v0.1.0 · S4.1 · b<12 hex>` ist auf allen Ansichten unten rechts und zusätzlich unter **Einstellungen → Installierte App-Version** lesbar. Eine Quellcodeprüfung/CI allein ist **kein** TV-Installationsnachweis.
- [ ] Nach erfolgreicher *datenbewahrender* Aktualisierung vergleichen: genau dieselbe Kennung am TV und im gebauten `app/tv-runtime.js`. Der zuvor fest eingebrannte Footer `S3.3` darf nicht mehr erscheinen.
- **Hardware-Befund vom 25.10.:** WITs `--watch` nach `wits -i` erreicht den Samsung per SDB (TV-IP bestätigt), bricht aber mit `Failed to launchApp. Please check the application is already installed on the Target.` ab. Kein Live Reload und **kein Nachweis**, dass der neue Samsung-Fix/Versionsbanner installiert wurde. WITs dokumentiert `--watch` als Live-Reload einer **zuvor mit WITs gestarteten** App; `wits -s` könnte installieren und Geräte-Credentials gefährden und bleibt ohne gesonderte Freigabe ausgeschlossen.
- [ ] Geräteseitig ausschließlich **lesend** App-/Package-ID mit `config.xml` (`VDRSuiteTV.VDRSuite`) abgleichen; erst danach datenschonenden Aktualisierungspfad bewusst bestimmen. Keinen pauschalen Neuinstallationsversuch, keinen KeyManager-Export.
- **Fallback im Altstand:** Solange der TV weiterhin `S3.3` anzeigt, ist das *nicht* der neue Versionsbanner. Bereits laufende App nicht als aktualisierte Version ausgeben.

## S3.2 – Geräte-Pairing und KeyManager (Implementierung, TV-Gate offen)

- [ ] S2-Design/Intro und S3.1-API-Discovery weiterhin nutzbar.
- [ ] Tizen-KeyManager Preflight auf echtem TV erfolgreich (keine Browser-Fallback-Speicherung).
- [ ] Echte Bootstrap-POST-Antwort zeigt nur `userCode` öffentlich; Token nicht teilen.
- [ ] Admin bestätigt im Server-Frontend per eigener Session; TV liest `approved` über Token-GET.
- [ ] Einmaliges Credential-POST nur nach KeyManager-Preflight; Readback exakt erfolgreich.
- [ ] GET `/api/v1` mit Device-Schema ergibt authentifizierten Actor ohne automatische Grants.
- [ ] App-Neustart findet gespeichertes Credential wieder; Login erneut prüfen.
- **Neuer ungeklärter REAL-TV-Befund vom 25.10.2026:** Der Betreiber berichtet, dass eine vorher erfolgreich gekoppelte Samsung-App auch **ohne erneutes Installieren** die Verbindung verliert. Ein Screenshot zeigte getrennt davon einen Acht-Sekunden-Timeout beim Aufnahmenabruf. Dieser Timeout beweist *keinen* verlorenen KeyManager-Eintrag. **Nicht bestanden und nicht als Ursache aufgeklärt.**
- **Diagnose-Fix im Quellkandidaten:** Device-Credential anhand der exakten eigenen Alias direkt mit `tizen.keymanager.getData` lesen; nur echtes `NotFoundError` als fehlenden Eintrag behandeln. Sonstige KeyManager-Ausfälle dürfen keine neue Kopplung vortäuschen. Die Samsung-Einstellungen zeigen die nicht geheime Device-ID und unterscheiden fehlendes Credential, nicht lesbaren KeyManager und fehlgeschlagene Netzwerk-Authentifizierung. Auch dies ist **noch kein Hardware-PASS**.
- [ ] Auf **demselben installierten TV-App-Paket ohne VS-Code Run Project/WITs Start**: `Einstellungen → Anmeldung prüfen`, App ganz normal beenden/neustarten, erneut `Anmeldung prüfen`, Device-ID gegen die tatsächlich aktive Admin-Device-ID abgleichen, Server/VDR offline/online und normalen TV-Standby separat prüfen. Nur eine gültige gespeicherte Kopplung weiterverwenden. Keinesfalls wiederholt neu koppeln; keine Secrets in Fotos/Logs.
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

## S4.1 – Hardware-Abnahme A–D und widerrufenes Device (2026-10-25)

**TV:** Samsung GU43TU6979UXZG, Tizen 5.5. **Tatsächlich installiert:** `Samsung v0.1.0 · S4.1 · b8ca122aafa22` (`f19aab0c2dcf292b8a4f601c3033282073139fcc`). Die folgenden Resultate sind **Nutzerbeobachtungen auf realer Hardware**, keine CI-Behauptungen.

- **A1–A6 PASS (6/6):** App, Intro, Media-Home, Versionskennung Footer/Einstellungen, kein sichtbarer Startfehler.
- **B1–B9 PASS (9/9):** D-Pad, OK/Back, Fokuswiederherstellung, Home/Einstellungen.
- **C1–C5 PASS (5/5):** gespeicherter Server, Public-v1-Prüfung, keine TLS-Fehler bzw. irreführende anonyme Login-Aussage.
- **D1/D2/D6/D7/D9/D10 PASS (6):** Einstellungs-/Prüfbedienung sowie App- und TV-Neustart möglich.
- **D3/D4/D5 FAIL (3), D8/D11/D12 OFFEN (3):** Nutzer hat zuvor die Device-Kopplung im Backend widerrufen. Samsung zeigt weiterhin einen vermeintlich gekoppelten lokalen Zustand, obwohl erfolgreiche Authentifizierung nicht bestätigt ist. Kein Token, Credential oder Device-ID-Secret dokumentiert. Exakte HTTP-Antwort auf Hardware noch nicht erhoben; ohne sie darf ein Server-401 nicht als hardwarebewiesen gelten.

**Quellanalyse:** `app/src/main.js` leitete aus `vault.read().credential` das pauschale „bereits gekoppelt“ ab. Das lokale Credential kann nach einem serverseitigen Widerruf weiter vorhanden sein. Public v1 `GET /api/v1` mit Device-Authorization ist die richtige separate Authentifizierungsprobe und liefert für ungültige/widerrufene Credentials HTTP 401; ein erfolgreiches anonymes Discovery-GET ist hierfür kein Beweis.

**S4.1-D Fix-Kandidat (Source/CI ≠ TV-Installation):** gespeichertes Credential konsequent als *lokal vorhanden, online ungeprüft* anzeigen. Bei nachgewiesenem HTTP 401 explizite Serverablehnung mit Geräte-ID (nicht Secret) anzeigen; eine lokale Bereinigung ist ausschließlich nach zweimaliger aktiver Bestätigung möglich. Bei 403, Offline, Timeout oder KeyManager-Fehler niemals automatisch löschen; keine automatische Neukopplung, keine Geräte-/Grant-Änderung auf dem Server. Der TV muss nach späterem bewusstem Update den Fix und die zwei Prüfungen (401, kontrollierter Reset) erneut hardwaretesten, bevor D3–D5 neu bewertet werden. D8/D11/D12 bleiben offen; E–H sind weiterhin nicht abgenommen.


## S4.1 – Erster erfolgreicher Aufnahmeabruf auf Samsung (Nutzer-Rückmeldung 2026-10-25)

**Beobachtung am echten Samsung-TV:** Nach dem erfolgreichen Windows-Quellupdate (`npm.cmd run check`: 77/77 PASS; erwarteter gebündelter Quell-Build `b659eaf54fff5`) und anschließenden Tizen-Installationsschritten meldet der Nutzer: **„Melde erfolg, konnte eben die Aufnahmen laden“**.

**Hardwareevidenz:** `Aufnahmen laden` funktioniert für den Nutzer auf der Samsung-App; erste positive Abnahme der echten Aufnahmeliste (S4.1-Basisabruf). Das ist ein deutlich stärkerer Nachweis als ein Source-/CI-Test. Das Design nutzt authentifizierte Public-v1-Aufnahmeabfragen. Die Rückmeldung spricht für eine funktionierende Device-Authentifizierung und einen wirksamen `recordings.view`-Grant zum Abrufzeitpunkt. **Nicht separat bestätigt:** exakte am TV sichtbare Buildkennung, aktuelle Device-ID, Anmeldung-prüfen-Ergebnis, Umfang/Anzahl der Aufnahmen, Titel-/Metadata-Felder, mehr als 100 Einträge/Paginierung, Fernbedienungsnavigation und längere Laufzeit.

**Abnahmegrenzen:**
- **S4.1 Basis-Aufnahmeabruf: PASS (Nutzerbeobachtung, echter TV).**
- **TEST D:** Vorherige D3–D5 FAIL nach widerrufenem Credential gelten als historischer Befund. Die erfolgreiche Aufnahmeabfrage deutet auf inzwischen gültige Device-Authentifizierung hin, ersetzt aber nicht die Einzeltests D8/D11/D12 über App- und TV-Neustart.
- **TEST E:** Für den aktuellen Build keine neue E1–E10-Einzelabnahme gemeldet.
- **TEST F:** Nur Basisabruf positiv; alle weiteren F-Einzelchecks bleiben OPEN, insbesondere Berechtigungsfehler, Navigation, 100er-Pagination, HTTP-/Timeout-Fälle.
- **Playback nicht geprüft:** S4.1 zeigt ausschließlich Aufnahmemetadaten, keine Wiedergabe/AVPlay-Akzeptanz.

**Historischer Prüfauftrag (inzwischen teilweise bestanden):** Der nachfolgende Hardware-PASS bestätigt D-Pad-Aufnahmenavigation sowie 100er-Folgeseite und Rückwärtsblättern. Ausstehend sind nur die getrennten Einzelfehler-/Metadaten-/Wiedergabe-Gates. Keine unnötige Neuinstallation, Neu-Kopplung oder Widerruf.


## S4.1 – Aufnahme-Paginierung und D-Pad/Zurück auf realem Samsung (Hardware-PASS 2026-10-25)

**Nutzer-Rückmeldungen:** „aufnahmen werden hundert gelistet und dann seite 2 weitere 100 usw“; anschließend „bei den aufnahmen geht die navigation! zurück zur vorherigen seite auch“.

**Hardwarebestätigung:** Aufnahmeliste lädt echte Daten, die erste Seite enthält 100 Aufnahmen, die zweite Seite enthält weitere 100. D-Pad-Navigation innerhalb der Aufnahmeansicht funktioniert. Navigation **zur vorherigen Seite** wurde ebenfalls ausdrücklich erfolgreich getestet. Damit sind auf Samsung S4.1 sowohl der grundlegende Aufnahmeabruf, die Vorwärts-Paginierung als auch das Rückwärtsblättern und die Fernbedienungsnavigation als **PASS (Nutzerbeobachtung am realen TV)** zu werten. Die Antwort belegt mindestens 200 abrufbare Aufnahmeeinträge; kein Schluss auf eine vollständige Gesamtzahl oder eine bestimmte Anzahl weiterer Seiten.

**Weiterhin nicht als PASS belegt:** tatsächliches Abspielen/AVPlay, vollständige Prüfung der Metadatenfelder, gezielte HTTP-401/403/409/503-Fehlerpfade, Neustart-Persistenz im einzelnen Abnahmeschritt. Die Senderliste lädt zwar erfolgreich, ist jedoch derzeit weder in `channels.conf`-Reihenfolge noch per D-Pad anwählbar (eigene offene Bugs). Aufnahme-PASS nicht auf Sendernavigation oder Wiedergabe übertragen.

**Keine zusätzliche Installation erforderlich.** Der Nachweis gilt für den bereits laufenden Samsung-Build; dieser Doku-Commit verändert weder Runtime noch Backend.


## S4.2/S5.1 – VDR-Verzeichnisse und erster Samsung-Aufnahme-Playback-Test (SOURCE, HARDWARE OPEN)

**Benutzerentscheidung 25.10.2026:** Aufnahmen ab sofort **nach tatsächlichen VDR-Verzeichnissen** browsen; Genre-Verzeichnisse ausdrücklich erst später. Nach positivem S4.1-Hardwaretest (100+100 Aufnahmen, D-Pad und Vorherige Seite bestätigt) soll **eine echte Aufnahme am Samsung abgespielt** werden.

### S4.2 VDR-Ordner-Test
- [ ] In der neuen Samsung-Buildkennung `S5.1` kontrollieren, dass **VDR-Verzeichnisse laden** echte VDR-Ordner über `GET /api/v1/recordings?view=folders` zeigt; keine Genres aus Metadaten.
- [ ] Mit OK einen Ordner öffnen, ggf. Unterordner öffnen, `Ordner hoch` und Fernbedienung-Zurück zur jeweils echten Elternansicht; nach 100 Einträgen folgeseitig per `offset` blättern.
- [ ] Prüfen, dass Einzelaufnahmen als Recording-Blätter und nicht als erfundene Zusatzordner erscheinen; Quelle bleibt opake `fld1_`-/`rec_`-Identität statt native Dateipfade.
- [ ] `Alle Aufnahmen` öffnet weiterhin den zuvor hardwarebestätigten flachen `rc1_`-Katalog mit 100er-Vorwärts-/Rückwärtsseiten. Änderungen im Ordner dürfen Aufnahmen weder verschieben noch umbenennen.

### S5.1/S5.2 Aufnahme-Wiedergabe auf Tizen 5.5
- [ ] Im VDR-Suite-Webfrontend für die **aktuelle Samsung Device-ID** und den Zielbackend ausdrücklich `media.recording.play@backend` erteilen; `recordings.view` allein reicht nicht. **Nicht** neu koppeln oder ein bestehendes gültiges Credential widerrufen.
- [ ] Eine **abgeschlossene, bekannte H.264/AAC-Aufnahme** auswählen (keine laufende Aufnahme, keine exotischen Codecs für die erste Probe). Nach OK auf der Aufnahme wird die Schaltfläche `Wiedergabe testen` fokussiert; zweites OK erstellt explizit die Device-owned MediaSession.
- [ ] **Erwartet:** Session-POST erhält `201`, wird über `mediaSession.mediaPath` auf denselben HTTPS-VDR-Suite-Host beschränkt und Samsung `webapis.avplay` führt `open → prepareAsync → play` aus. Bild und Ton müssen **tatsächlich** beobachtet werden; ein erfolgreicher POST ist ausdrücklich noch kein Playback-PASS.
- [ ] PLAY/PAUSE, STOP und BACK prüfen; STOP/BACK müssen AVPlay schließen und `POST .../stop` versuchen. Kein ungefragter erneuter POST beim Navigieren, kein Codec- oder Medien-Token in der Anzeige oder in Logs.
- [ ] Fehlschläge getrennt notieren: `403` → `media.recording.play` fehlt; `409/422` → Profil/Index nicht bereit; `401` → Device-Anmeldung; Netzwerk/CORS/cookie → Media-/Proxyzugriff; AVPlay-Fehler → Tizen Decoder/Format oder Cookie-Übernahme. **Samsung AVPlay hat ggf. einen von Web-XHR getrennten Cookie-Store; HttpOnly-Sitzungscookies dürfen nicht durch Export in JS oder URL umgangen werden.** Der Code ist nur ein erster Hardware-Experimentpfad.
- [ ] Die auf dem TV sichtbare Buildkennung, Statusausgaben, Beobachtung von Bild/Ton, Pausen-/STOP-/BACK-Verhalten festhalten. Keine privaten URLs/Token/Identitäten protokollieren.

**Sicherheit/Release-Gate:** CI-Grün bedeutet ausschließlich Source-/Simulator-PASS. Der aktuell laufende TV bleibt unverändert, bis der Nutzer bewusst das signierte WGT paketiert. Das in [Windows-Update-Workflow](windows-update-workflow.md) festgehaltene selektive Runtime-Sicherungsverfahren gilt; **kein `Run Project`, `git clean` oder automatischer Device-Reset**. Bei notwendigem Server-Upgrade ausschließlich die getrennten, abgesicherten Backend-Deployment-Gates verwenden.

## S5.1 – Regression beim Entwicklungsupdate: Kopplung nach Update nicht mehr vorhanden (25.10.2026)

**Hardwarebeobachtung / FAIL, keine Quelltest-Vermutung:** Unmittelbar nach dem Samsung-TV-App-Update meldet der Nutzer ausdrücklich: „nach einem Update ist direkt die Kopplung wieder weg“. Zuvor waren reale Sender-/Aufnahmeabrufe einschließlich 100er-Paginierung auf dem Gerät erfolgreich. Das vorherige erfolgreiche Git-Fast-Forward `05d8af6 → 1bafaaa` aktualisierte **nur den Windows-Quellstand**; Paketbau und TV-Installation sind separate Schritte.

**Eingegrenzter Stand:** `app/config.xml` besitzt in `05d8af6` und S5.1 unverändert das Paket `VDRSuiteTV` und die App-ID `VDRSuiteTV.VDRSuite`. Der KeyManager-Alias `vdr-suite-samsung-device-v1` und das Abfrageverhalten sind ebenfalls gleich. **Weder fehlendes Credential im KeyManager noch HTTP 401 noch das benutzte Installationskommando wurden bisher durch ein exaktes Gerätestatus-/Installationsprotokoll bestätigt**. Ein unerwarteter Abmeldestatus beweist daher nicht für sich allein die endgültige Löschung.

**Herstellerbeleg für das Risiko:** Die Samsung-[FAQ zur Datenpersistenz](https://developer.samsung.com/smarttv/develop/faq/data-and-file-handling.html) unterscheidet zwischen regulären Updates (App-Daten bleiben erhalten) und **Tizen-Studio-Testupdates mit Uninstall vor Install**, bei denen App-Daten gelöscht werden. Der Tizen KeyManager speichert die Device-Credentials im App-Kontext; eine Neuinstallation kann sie nicht garantiert erhalten. Das Gerät hat zusätzlich eine geänderte IP-Adresse erhalten; eine IP-Änderung allein sollte aber kein lokales Device-Credential entfernen.

**Sofort-Gate – keine weiteren Updates/Resets:** Am TV unter **Einstellungen → Anmeldung prüfen** die genaue Meldung erfassen und nach Speicher nicht lesbar, Credential nicht gefunden, anderer Server oder HTTP 401/403 unterscheiden. Keine unbegründete neue Kopplung, kein Widerruf vorhandener Devices, kein `Run Project` oder sonstige Neuinstallation. Eine einmalig bestätigte tatsächliche Credential-Löschung benötigt eine **bewusste** neue Device-Autorisierung mit gesonderten Grants; kein unsicheres Secret-Backup/Tokenexport.

**Erforderliche dauerhafte Lösung:** Für wiederholte Code-/Bundle-Änderungen WITs nach einer gegebenenfalls einmaligen, explizit als datenlöschungsgefährdend behandelten Initialinstallation einrichten und ab dann **nur `wits --watch`** verwenden. Repository enthält bereits `npm.cmd run tv:watch:check`/`tv:watch` mit Installationsverbot; **Hardware-PASS für die Persistenz nach Watch ist weiterhin OFFEN**. Vor/nach einem harmlosen Live-Reload Device-Anmeldung und echte Aufnahmen erneut prüfen; kein automatischer Bootstrap-Fallback.


## S7.1 Nachanalyse WITs-Paketidentität (2026-10-25; HARDWARE OPEN)

**Quellcode-Befund:** WITs erzeugt aus der Produktions-App `VDRSuiteTV.VDRSuite` eine Host-App-ID `VDRSuiteTV.VDRSuiteWITs`, ohne in `hostAppHelper.setDefaultConfigData` die Tizen-Paketkennung `VDRSuiteTV` zu ändern. Der von WITs genutzte Paketbauer verändert sie in `buildWidget` ebenfalls nicht. Die bislang empfohlene Verwendung der produktiven `app/`-Quelle für WITs ist deshalb **gesperrt**. Die Fehlermeldung `Failed to launchApp` mit WITs Watch ist mit einer fehlenden WITs-Host-App vereinbar und rechtfertigt keine Installation der Produktionskennung.

**Neuer Kandidat:** lokales, getrenntes Paket `VDRSuitDev` und WITs-Host `VDRSuitDev.VDRSuiteWITs`. Ein separater DEV-Device-Account kann ausdrücklich einmalig notwendig werden, dessen KeyManager-Persistenz nach Live-Reload und Neustart muss am TV geprüft werden. Keine Produktions-App wurde durch diesen Quell-Slice deinstalliert, und keine neue Dev-App wurde vom Assistenten installiert. Historische Hardware-PASS für Aufnahme-Paginierung bleiben gültig; S4.2/S5.1 sowie Update-Persistenz bleiben **OPEN**. [Vollständige S7.1-Gates](wits-isolated-development.md).


## S7.2 – Produktions-WGT-Preflight gegen das wirklich installierte Paket (2026-10-25)

**Quell-/GitHub-Stand:** `scripts/tv-update-preflight.mjs` liest fertige WGT-Pakete ausschließlich offline, vergleicht Paket-/App-ID, Version, eingebettete Quellen und SHA-256-Fingerabdruck des öffentlichen Author-X509-Zertifikats mit einem als installiert nachgewiesenen Basis-WGT. Negative Tests (DEV-Kollision, anderer Autor, Downgrade, veraltete Runtime, fehlende Signatur, fehlerhaftes ZIP) ergänzen diesen Slice. Keine TV-Installation/Deinstallation und keine KeyManager-/Backend-Änderungen.

**Weiter offen – kein Hardware-PASS:**

- [ ] Signiertes altes Basis-WGT **eindeutig** der installierten produktiven App zuordnen. `sdb applist` beweist nur die App-ID, nicht die Identität des ursprünglich signierten WGT.
- [ ] Bisheriges Author-Signaturzertifikat nachweisen; die lokale WITs-`profiles.xml` wurde nicht gefunden, sagt aber nichts Sicheres über das Zertifikat des existierenden Tizen-Studio-Produktions-Builds.
- [ ] Neues Paket mit **höherer** Tizen-Version und **gleichem** Autor-Zertifikat signieren und Preflight gegen Basispaket bestehen.
- [ ] Für Samsung Tizen 5.5 **konkret datenbewahrende** Produktions-Installations-/Verteilmethode belegen. Tizen-Studio-`Run Project` ist kein solcher Beleg (Testinstallation kann vorher deinstallieren).
- [ ] Vorher dieselbe aktive Device-ID und KeyManager-Anmeldung, nach Update und Neustart unveränderte Device-ID, gültige Authentifizierung und gleiche Grants beobachten.

**STOP bei unbekanntem Basis-WGT, verlorener Author-Identität, abweichender Paketkennung, drohendem Uninstall oder fehlender Hardware-Freigabe.** Source-PASS bedeutet nicht TV-PASS. Siehe [S7.2](production-update-s7-2.md).

## S7.3 – Settings zeigt fälschlich „nicht gekoppelt“, obwohl Live-TV und Aufnahmen funktionieren

**Hardwarebefund vom Nutzer (25.10.2026):** Nach der neuen Samsung-Testinstallation zeigt die Einstellungsseite keine gespeicherte Kopplung an, obwohl reale Sender und Aufnahmen des freigegebenen Backends erfolgreich angezeigt werden. Die beiden Katalogladewege führen zuvor jeweils eine echte öffentliche API-v1-Device-Authentifizierung durch; ein Erfolg ist daher ein Beleg für eine gültige Device-Anmeldung im Zeitpunkt des Abrufs. Das widersprüchliche Einstellungslabel ist **kein Grund für neue Kopplung oder Löschung bestehender Grants**.

**Quellursache und Fix:** Beim App-Start wird der KeyManager-Status einmal ins Settings-Label kopiert; der vorherige Ablauf aktualisierte ihn nicht nach erfolgreich verifiziertem Abruf von Sendern oder Aufnahmen. S7.3 synchronisiert die erfolgreiche Authentifizierung mit dem Einstellungsstatus, liest beim Wechsel in die Einstellungen erneut aus dem KeyManager und kennzeichnet `gespeichert`, `authentifiziert`, `KeyManager nicht lesbar`, `widersprüchlicher flüchtiger Read`, `wirklich kein Eintrag` und `HTTP 401` getrennt. Keine Secrets, automatisches Pairing oder serverseitige Änderungen.

- [ ] Nach **neuer, ausdrücklich freigegebener** Samsung-Installation die aktuelle Buildkennung notieren.
- [ ] Sender laden und Aufnahmen laden (ohne Pairing), dann Einstellungen öffnen: *authentifiziert*, einschließlich derselben **nicht geheimen Device-ID**; nicht fälschlich *nicht gekoppelt*.
- [ ] TV-App neu starten: gespeicherte Anmeldung darf als *lokal vorhanden, serverseitig ungeprüft* erscheinen, bis einmal eine Verifikation erfolgt; danach wieder *authentifiziert*.
- [ ] Vorübergehend nicht lesbarer KeyManager darf nie „nicht gekoppelt“ oder automatische Neu-Pairing-Aufforderung auslösen.
- [ ] Temporäre Netzwerk-/Backendfehler ≠ verlorenes Credential, HTTP 401 ≠ lokaler Datenverlust.
- [ ] Den gemeldeten Aufnahme-Wiedergabe-Screenshot **separat** nach der Statuskorrektur analysieren; AVPlay/Bild/Ton sind dadurch nicht bestätigt.

**Quell-/CI-Status:** Teststand nach Merge nachtragen; kein Hardware-PASS ohne erneute TV-Beobachtung. **Rollback:** vorherigen Quellstand wiederherstellen, aber keinen ungeprüften TV-Downgrade ausführen. Aktuelle funktionierende Device-Anmeldung nicht überschreiben.

## S5.2-R – Samsung-Aufnahmenwiedergabe: AVPlay vs. Session-Stop (Foto 25.10.2026)

**Beobachtung auf echter Hardware:** In Aufnahmen → Action / Default VDR / Seite 1 ist eine echte Aufnahmeliste sichtbar. Nach „Wiedergabe testen“ zeigte der Fernseher „**Session-Stop nicht bestätigt**“ und „**MediaSession-Anfrage: Zeitüberschreitung · Server-Idle-Timeout greift.**“ Weder Bild/Ton noch eine erfolgreiche AVPlay-Vorbereitung sind durch das Foto nachgewiesen.

**Codeanalyse:** Ein Stop-Callback in `stopRecordingPlayback()` überschrieb auch nach einem vorausgehenden AVPlay-`onerror` oder `prepareAsync`-Fehler die eigentlich wichtige erste Fehleranzeige. Screenshot-Timeout gehört daher zum **Aufräumen**, nicht zwingend zur primären Wiedergabeursache. Die vorhandene Client-MediaSession und die beim Stop verwendete Server-API sprechen für einen vorher erhaltenen positiven CREATE-Antwortpfad; die echte TV-Medienwiedergabe ist noch offen.

**Quellfix S5.2-R (Source, keine Hardware-Freigabe):**
- AVPlay-Aufrufphase wird bei Fehler sicher unterschieden: `open`, `prepareAsync`, `play`, `stream`, Vorprüfung; kurze erlaubte AVPlay-Fehlercodes statt ungefilterter nativer Exceptiontexte oder Media-URLs.
- Spätes Stop-Timeout überschreibt **niemals** die ursprüngliche AVPlay-Fehlerursache. Ein ausdrücklich gedrücktes STOP meldet eine separate unbestätigte Serverbereinigung korrekt.
- Während die vorherige MediaSession auf STOP-Antwort wartet, wird keine zweite CREATE ausgelöst, die das erste STOP-HTTP-XHR abbrechen würde.
- Beim Verzeichnis-/Seitenwechsel wird die vorherige Aufnahmeselektion verworfen.
- Ein erfolgreicher Aufruf von `webapis.avplay.play()` wird als **Play ausgelöst** bezeichnet; sichtbares Bild/Ton bleibt Hardware-Gate.

**Noch nicht belegt:** Der Device-CREATE erhält einen geschützten `HttpOnly`-`vdr_suite_media`-Cookie. Dass Samsung AVPlay denselben Cookie nach XHR/Set-Cookie tatsächlich an die geschützten HLS-/MPEG-TS-Endpunkte sendet, ist nicht nachgewiesen. Die Samsung AVPlay-API kennt `setStreamingProperty("COOKIE",...)`, aber ein HttpOnly-Cookie darf nicht für JavaScript lesbar gemacht, in eine URL verlagert oder als Device-Credential in den Player eingeschleust werden. Wenn die neue AVPlay-Diagnose auf Medienzugang deutet, muss diese Grenze **serverseitig/auf dem TV mit zulässiger Authentifizierung** belegt bzw. sicher gelöst werden, nicht durch einen Secret-Fallback.

**Nächster TV-Hardware-Gate erst nach bewusster Updateinstallation:** Einen abgeschlossenen H.264/AAC-Film wählen; genaue AVPlay-Phase, Profil HLS/TS/MP4 und evtl. Fehlercode abschreiben. Bestehende Grants `media.recording.play@backend` prüfen; keine neue Kopplung. STOP-/BACK-Nachricht darf primären AVPlay-Fehler nicht überschreiben. Kein Hardware-PASS vor sichtbarem Bild/Ton.

**S5.2-Fullscreen-Quellfix (25.10.2026; echter TV-Retest offen):** Foto zeigte ein kleines AVPlay-Wiedergabefenster *innerhalb* der scrollbaren Aufnahmeliste. Nach Samsungs offizieller AVPlay-Anleitung soll das `application/avplayer`-Objekt an den Dokumentkörper angehängt werden; `setDisplayRect` verwendet ein virtuelles 1920×1080-Koordinatensystem. Die Quellimplementierung verschiebt das vorhandene Objekt aus `.recording-catalog` in `document.body`, schaltet für Video die ansonsten deckende App-Oberfläche und Hintergrundfarbe transparent/unsichtbar und gibt STOP/Fehlern den normalen Screen zurück. `PLAYER_DISPLAY_MODE_LETTER_BOX` ist optional/fail-open; ein nicht vorhandenes SetDisplayMethod blockiert nicht das Abspielen. Keine neue Berechtigung, kein Stream-Link und kein neues Pairing.

**Gezielter Hardwaretest:** Erst bei bewusst genehmigtem neuen TV-Build öffnen: Vor Start muss die Aufnahmeliste normal sichtbar sein; bei erfolgreichem AVPlay-Bild muss Video **den gesamten TV-Bereich** einnehmen, Seitenverhältnis mit Letterbox. STOP/BACK zeigt wieder die Aufnahmeliste. Falls kein Bild kommt: die neue `AVPlay.open / prepareAsync / play / stream`-Fehlerphase und den kurzen Fehlercode notieren. Fullscreen-Fix kann `HttpOnly`-Cookie-Probleme im separaten nativen AVPlay-Netzwerkstack nicht beheben. **Hardware-PASS nur mit sichtbarem Bild und Ton.**

**S3.2-R User-Fehlerbeobachtung (25.10.2026):** Nach wiederholtem Produktions-`Run Project` bzw. erneuter „Anmeldung prüfen“-Aktion wird „Kein gespeichertes Device-Credential gefunden“ angezeigt. Nur eine unmittelbar vorher erfolgreich authentifizierte Sender-/Aufnahmeabfrage in **derselben App-Sitzung** kann einen Sitzungs-Widerspruch belegen. Der Button „Anmeldung prüfen“ prüft nun in diesem Fall die vorhandene Geräteidentität *erneut* und versucht ausschließlich bei erfolgreicher GET-Authentifizierung eine erneute KeyManager-Speicherung derselben Identität. Der bestehende Alias und die bestehende Device-ID werden nicht ersetzt. **Offline-Tests sind kein Beleg für echten KeyManager-Erfolg.** Fehlt der Key nach deinstallierender Tizen-Studio-Testinstallation vollständig, ist eine einmalige neue Kopplung erforderlich; alte Server-Devices nicht blind widerrufen. Vor erneutem `Run Project` stoppt der Arbeitsablauf; den isolierten WITs-DEV-Watch nur nach separatem Bootstrap-/Hardware-Gate einsetzen. 

**Rollback:** Ausschließlich auf Quelle/Commit-Ebene. TV-Downgrade/Run Project kann Kopplung verlieren; keine automatische Geräteinstallation.

### S5.3 – Samsung 2020 Tizen 5.5: Medienwiedergabe-Vertragsdiagnose (Source, Hardware offen)

Der reale GU43TU6979UXZG öffnet jetzt den bildschirmfüllenden Player, aber AVPlay.prepareAsync für MP4/TS scheitert. Samsung-Dokumentation bestätigt AVPlay-WebAPI-Bibliothek, 2020er Container-/Codec-Unterstützung, HLS-Grenzen und die Streaming-Eigenschaft COOKIE. Im Public-v1-Backend wird die separate Medienroute mit Secure/HttpOnly/SameSite=Strict MediaSession-Cookie geschützt; eine automatische Übergabe zwischen Web-XHR und dem nativen AVPlay-Netzwerkstack ist nicht nachgewiesen.

Der Client bindet die Samsung WebAPI explizit ein, zeigt nur erlaubte AVPlay-ErrorCodes/Names und prüft nach einem Wiedergabefehler die geschützte Medienroute ausschließlich über einen Header-only GET/Range-Request, **vor** dem Session-Stop. Zusätzlich existiert eine bewusst vom Nutzer wählbare alternative **HTML5-MP4-Probe** für vom Server gewählte progressive MP4-MediaSessions. Kein Credentials-/Token-in-URL, keine zweite Kopplung oder Installation, keine unbelegte Browser-/AVPlay-Cookieannahme. Vollständige Quelle-/Sicherheits-/TV-Gates: [Samsung-Playback-Kompatibilität](samsung-playback-compatibility.md).

**Hardware-PASS erst nach einem wirklich abspielbaren Bild/Ton, STOP/Cleanup und identischer bestehender Geräte-Kopplung.** Source-only- und CI-Abnahme genügt nicht.


## S6.0 – TV-Fernbedienung / AVPlay (26.10.2026; SOURCE, HARDWARE-GATE OFFEN)

**Ausgangslage am echten Samsung GU43TU6979UXZG:** Echte VDR-Aufnahme über native Device-MediaSession zeigt AVPlay-Bild, aber kein Audio bei mindestens zwei abgeschlossenen Aufnahmen; HTML5 MP4 bleibt schwarz. OK, PLAY/PAUSE und STOP reagierten während AVPlay nicht, BACK kehrte mit „Wiedergabe beendet“ zurück. TV-Lautstärke/Lautsprecher funktionieren. Das ist ausdrücklich kein Audio- oder Remote-PASS.

**S6.0-Quelländerung:** Samsung `MediaPlayPause` (10252) zusätzlich registriert und normalisiert; ein zentraler Capture-Keydown-Owner ordnet OK/PLAY/PAUSE/PLAY_PAUSE während Recording-Wiedergabe dem vorhandenen AVPlay-`pauseOrResume` zu, STOP/BACK dem bisherigen MediaSession-Cleanup. Unbekannte numerische Tasten und Player-Returncodes werden ausschließlich im sichtbaren Recording-Overlay angezeigt; keine URLs, Credentials oder Medien-Cookies. Taste-Wiederholung wird nicht als weitere Aktion verarbeitet.

| S6.0-Realgate | Stand | Beobachtung erforderlich |
| --- | --- | --- |
| DEV-Identität und `Anmeldung prüfen` erhalten | OFFEN | Kein erneutes Pairing; Produktiv-App unberührt |
| PLAY/PAUSE kombiniert (10252) | OFFEN | Overlay-Taste und `playing/paused` + sichtbarer Bildstillstand/Fortsetzen |
| OK toggelt bei Playback, Menü-OK bleibt normal | OFFEN | Player und D-Pad-Menü getrennt testen |
| Getrennte PLAY-/PAUSE-Tasten (falls vorhanden) | OFFEN | Gemeldeter Tastencode und Playback-Effekt |
| STOP und BACK | OFFEN | STOP tatsächlich empfangen, AVPlay verlassen, Session-Cleanup und Rückkehr |
| Unbekannte Taste | OFFEN | Nur begrenzter Zahlencode oder sicherer Fallback im Overlay |
| AVPlay-Ton | FAIL – S6.1 | Zwei Video-Aufnahmen ohne Audio; kein Backend-Transcode auf Verdacht |

**Hardware-Testgrenze:** Nach CI und bewusst ausgeführtem isoliertem DEV-Watch-Update am bereits installierten separaten Paket; kein `Run Project`, kein `wits --start`, keine Änderung am Originalpaket oder installierten Backend.


## S6.1 – Samsung AVPlay Audio-Track-Triage (26.10.2026; SOURCE, HARDWARE OFFEN)

**Ausgangslage auf echter Tizen-5.5-Hardware:** Zwei abgeschlossene VDR-Aufnahmen haben über AVPlay Bild, aber keinen Ton. TV-Lautstärke funktioniert. Mehrere HTML5-MP4-Versuche blieben schwarz. Das bleibt Audio FAIL bis zu einem bestätigten neuen TV-Test.

**Source-Grenze:** getState() muss PLAYING melden. Dann höchstens 32 native AUDIO-Tracks über getTotalTrackInfo() und die Auswahl über getCurrentStreamInfo() auslesen; aus extra_info ausschließlich sanitisierten Audio-Codec (bekannte Allowlist), Sprache aus 2–3 Buchstaben, 1–16 Kanäle und bounded numerische Indexwerte übernehmen. Niemals rohe extra_info, URLs, Tokens oder Medien-Cookies anzeigen. Wenn mehrere Tracks gemeldet werden, ein nachgewiesener AAC-Stereo-Track existiert und die aktuelle Auswahl nicht bereits AAC-Stereo ist, darf setSelectTrack("AUDIO", index) auf dessen tatsächlich gelieferten Index zugreifen. Eine erfolgreiche API-Auswahl ist noch kein hörbarer Ton. Ungültige Zustände oder API-Ausnahmen blockieren die Videowiedergabe nicht.

**Einziger Hardware-Gate:** Die bereits installierte, separat gekoppelte VDR-Suite DEV über den bekannten WITs-Watch-Prozess aktualisieren (ohne wits --start, Run Project, Uninstall oder Re-Pairing). Auf einer vorhandenen abgeschlossenen Aufnahme die neue Zeile `Audio · ...` ablesen, hörbaren Ton beurteilen, PAUSE/OK/STOP/BACK aus S6.0 mit prüfen. Bei fehlendem Ton den angezeigten Spur-/Codec-/Auswahlstatus notieren; erst danach Backend-Medienprofil untersuchen. Auf dem TV nichts als PASS markieren, bevor es tatsächlich beobachtet wurde.

**PASS:** Bild und hörbarer Filmton sowie sauberer Rücksprung. Allein erkannte oder ausgewählte Tonspur genügt nicht.


## S6.2 – Player-Lifecycle, HTML5-Schwarzbild und Session-Cleanup (26.10.2026; SOURCE/CI PASS, TV OFFEN)

**Vorheriger TV-Befund:** Native AVPlay-Aufnahme liefert Bild, bei zwei getesteten Aufnahmen keinen Ton. Mehrere HTML5-MP4-Starts blieben schwarz; nach ZURÜCK erschien pauschal „Wiedergabe beendet“, obwohl keine Wiedergabe bestätigt war. Das sind keine S6.2-Hardware-PASS-Ergebnisse.

**Quelländerung:** Genau ein Player-/Keydown-Owner. Native AVPlay-Callbacks unterscheiden Vorbereitung, PLAY-Aufruf, Buffering, Buffering-Ende, reguläres Ende und tatsächlichen Playerfehler. Eine dritte, sichtbare Diagnosezeile zeigt dies bei fullscreen AVPlay/HTML5. HTML5 behandelt erst `onplaying` als Wiedergabe-Ereignis. Ein 12-Sekunden-Watchdog meldet den Schwarzbild-Start ohne `onplaying`, ein 20-Sekunden-Watchdog meldet stockende Wiedergabe; beide werden bei STOP/Ende/Fehler/Neustart deaktiviert. Native HTML5-MediaError-Codes 1–4 und `play()`-Ablehnung werden in festen Texten ohne Credentials/URLs angezeigt. Das opt-in-HTML5 ist keine automatische Ausweichwiedergabe.

**Stop-Grenze:** Lokaler Player-Stop und authentifizierter MediaSession-STOP bleiben getrennt. Nach STOP vor bestätigtem CREATE wird ausschließlich „Wiedergabeversuch abgebrochen“ gemeldet; ein ungewisses POST-Ergebnis wird nicht automatisch wiederholt. Bei Playerfehler wird die bestehende geschützte GET-Range-Headerdiagnose vor Session-STOP verwendet. Späte STOP-Timeouts dürfen den primären Playbackfehler nicht überschreiben. Die S6.2-Quelltests ersetzen keine tatsächliche Session-Stop-Abnahme.

**TV-Gate:** Zusammen mit S6.0-Tasten und S6.1-Audio am bestehenden, separat gekoppelten Samsung DEV testen, sobald Zugriff wieder möglich ist: erkannte Taste, Bild/Ton, Playerstatus bei Pufferung, geordnetes STOP/BACK, MediaSession-Cleanup, HTML5-MP4-Abbruchanzeige (falls bewusst gewählt), Geräteschlüssel unverändert. Bis dahin **REAL-TV OPEN**.

**Unberührt:** Productive Samsung-App, yaVDR-Backend, Device-Grants, bestehendes Pairing und installierte Pakete. Kein WITs-Start, keine neue Installation oder temporäre Credentials.


## S6.3 – Sendernavigation und echte numerische Channel-Pagination (26.10.2026; SOURCE, TV OFFEN)

**Übernommen statt neu entwickelt:** Samsung-PR #12 enthielt den hardwaregemeldeten Fehler „Sender geladen, aber nicht mit D-Pad erreichbar“ und bereits getestete Fokus- und Paginationslösungen; Samsung-PR #3 enthielt die Public-v1-Anfrage nach numerischer VDR-`channelNumber`-Sortierung. Beide Änderungen wurden im bestehenden Phase-S6-Branch integriert, ohne den Installationsstand oder ein vorhandenes Gerät zu verändern.

**Clientfunktion:** Der einzige D-Pad-/Fokus-Owner nimmt dynamisch geladene `channel-row-*`-Elemente auf. UP/DOWN navigiert, OK zeigt nur die echten Kanalmetadaten, BACK kehrt wie bisher zurück. „Mehr Sender“ lädt exakt eine begrenzte, vom Server bestimmte Folgeseite und fokussiert deren ersten Eintrag. Backendwechsel/Neuabruf entfernen veraltete Fokus-IDs, verhindern Cross-Backend-Cursor-Verwendung und unterdrücken alte Async-Rückmeldungen. Erreichbare TV-Sender im Frontend sind noch **kein** Beleg für funktionierendes Live-Tuning.

**Public-v1-Vertrag:** `GET /api/v1/channels?backendId=...&limit=20&sort=backendId,channelNumber,channelId&order=asc`; die gesamte VDR-Snapshot-Sortierung erfolgt serverseitig vor dem Paginieren, `ch2_` ist ein opaker Cursor und wird unverändert übergeben. Weder ein Client-Sort der ersten 20 IDs noch ein stiller Rückfall auf `ch1_` ist zulässig. Alter Server ohne Unterstützung liefert sichtbares HTTP 400. Fremder Scope, 401, 403 und 409 bleiben explizit behandelt.

**Noch nicht implementiertes Live-Streaming:** Backend `api/device-live-tv-playback.md` dokumentiert Device `POST /api/v1/live-playback-sessions`, `media.live.play@backend` und einen abgesicherten live-progressive-fMP4-Pfad. Ob der installierte yaVDR-Build diese Funktion und einen auf Samsung Tizen 5.5 tatsächlich nutzbaren AVPlay-Medienzugang besitzt, ist nicht belegt. Deshalb löst die Senderauswahl **keinen** unkontrollierten POST bzw. Tuner-Lease aus. Keine privaten Browser-Routen, kein Streamdev-Ersatz, kein neuer Backend-Build. Das Live-Playback bleibt ein eigener offener Runtime-/Hardware-Gate.

**TV-Gate offen:** Exakten installierten Backend-Build mit neuem Channel-Sort-Vertrag bestätigen, danach auf der bereits gekoppelten DEV-App Sender 1–20 sowie zweite Seite mit `channels.conf` vergleichen, D-Pad/OK/Mehr/BACK und den Geräteerhalt prüfen. Ein API-v1-200 auf älterem Sort-Modus oder allein ein grün getesteter Quellbranch genügt nicht.


## S6.4 – Authentifizierte EPG-Zeitfenster, Aufnahme-Metadaten, Artwork (26.10.2026; SOURCE, TV OFFEN)

**Quelländerungen:** Ein zusätzlicher bounded Public-v1-Device-Metadatenadapter mit unabhängigen Live-/Recording-Instanzen. Ein Sender-OK bleibt lokal; nur bewusstes „Jetzt / Nächste“ oder „Programm 24h“ löst erlaubtes `GET /api/v1/epg/*` aus. Die 24h-Anzeige nutzt maximal 24 Ereignisse pro Seite und übergibt den opaken E1-Cursor unverändert. EPG benötigt `epg.view` und eine konkrete Sender-ID, selbst wenn `channels.view` schon erteilt ist. Ohne passende Grants bleiben 403 und ohne aktiven E1-Handler 404 sichtbare, getrennte Ergebnisse.

**Aufnahme-Details:** Nach Auswahl einer tatsächlich geladenen Public-`rec_`-Identität fragt der Client ausschließlich `GET /api/v1/recordings/{id}?backendId=...`, `.../artwork` und optional das einzelne Poster-Binärbild per Device Authorization Header ab. Externe Art-URLs, native Pfade und Provider-Credentials werden weder verwendet noch protokolliert. JSON-Antworten sind streng bounded, Fotoantworten auf erlaubte Bildtypen und max. 2 MiB begrenzt. Object URLs werden nach Wechsel/Verlassen widerrufen. Keine automatische Scraper-Anforderung oder zusätzliche Berechtigung.

**Noch nicht als Real-TV bestätigt:** EPG Now/Next und 24h-Ansicht, Event-Zeitformat auf Tizen 5.5, manuelle Aufnahme-Metadaten, Binary-Poster-Rendering und Rechteabweisung. Beim späteren gemeinsamen Hardwaretest zunächst installierten Daemon-Stand, `epg.view`, `recordings.view`, KeyManager-Identität und bestehende AVPlay-Wiedergabe prüfen. Ein Quell-/CI-PASS ist nicht gleich einem Hardware-PASS. Produktive App, yaVDR-Installation und die vorhandene DEV-Kopplung bleiben unangetastet.


## S6.4 visible EPG and Recording metadata (2026-10-26)

Samsung Tizen 5.5 real-TV observation after installing VDR-Suite main
`c7cb87f7d95f4a7a32733f61c40d320081619e48`: numeric VDR channel order
1 Das Erste HD, 2 ZDF HD, 3 arte HD, 4 NDR FS HH HD is correct (**S6.3 PASS**).
The user selected a sender with OK and pressed „Jetzt / Nächste“;
the EPG status was below the entire sender list and invisible on screen.
The screenshot does not establish whether the authorized EPG GET succeeded or failed.

This source change places EPG status, HTTP/grant errors and bounded now-next/24h
entries directly into the visible live card. Recording detail title, genre,
season/episode, description, date, duration and securely fetched poster now
occupy the visible recording hero instead of sitting after the list.
All metadata remains read-only through protected Public-v1 Device GETs.

**S6.4 real-TV verification still OPEN**: device epg.view, actual programme data,
recording detail/artwork quality, plus distinct AVPlay sound and image gates.
No production TV reinstall or pairing was performed by this commit.


## S6.4 Samsung hardware follow-up: 26 October 2026

Actual Samsung photos show **real EPG GET success**, with genuine ZDF
24-hour programme entries; the tiny upper-right status-card design made
them unreadable, so **EPG usability is FAIL even though data arrives**.
A separate Samsung photo shows a genuine recording, title/overview,
115-minute duration and server-authenticated poster: **recording metadata
and poster hardware PASS**, with raw pipe-separated genre and raw Unix
recording timestamps noted as formatting defects.

Follow-up replaces the ornamental live hero/status layout with full-height
sender-list (left) / EPG (right) columns, 17–19px programme text, and
D-pad-focusable scrolling programme rows using the same focus owner.
Also normalizes recorded dates and pipe-delimited genres without changing
Device authorization, API request paths, or playback code. **New layout
hardware recheck OPEN until the TV receives this build.**


## S6.5 – TV beobachtet, Quellfix zur späteren Abnahme (2026-10-26)

**HARDWARE FAIL (beobachtet):** Samsung-AVPlay zeigt die Videoaufnahme,
meldet Tonspuren, spielt aber keinen hörbaren Ton. OK pausiert teilweise,
beim erneuten OK friert die Wiedergabe ein. Der Besitzer ist derzeit nicht
am Fernseher; keine neue Hardwareprüfung möglich.

**SOURCE-Korrektur:** Separate PLAY/PAUSE/STOP-Befehle,
idempotente PLAY- und PAUSE-Zustände; OK/MediaPlayPause toggeln.
Bei angefordertem Resume wird kein tatsächliches Abspielen behauptet.
Tonspurdiagnose: nur erkannte sichere Indices, Single-AAC-Fallback und
explizite BLAU-Taste für die vorhandenen bekannten Audioformate.
Die Authentifizierung, Device-MediaSession und Fullscreen-Engine werden
nicht verändert. **Re-Test des Tons und Resume auf Tizen 5.5 bleibt OPEN.**


## S6.5 – Real-TV-Re-Test nach CI-grünem Commit 9ebf6b9 (26.10.2026)

**Evidenz:** Direktes Nutzerfeedback am Samsung GU43TU6979UXZG (Tizen 5.5) nach der S6.5-Testaufforderung. Die exakt angezeigte TV-Buildkennung wurde mit dieser Meldung noch nicht übermittelt; deshalb ist die Zuordnung zum erwarteten Paket weiterhin als gesondertes Gate zu bestätigen. Die neue Rückmeldung überschreibt frühere grüne CI- und Quelltests nicht, widerlegt aber einen Hardware-PASS für die betroffenen Funktionen.

| Bereich | Tatsächliche TV-Beobachtung | Gate |
|---|---|---|
| AVPlay-Ton | Über mehrere getestete Wiedergaben weiterhin kein hörbarer Ton | FAIL |
| Formatkompatibilität | Manche Aufnahmen zeigen Video, andere ausschließlich Schwarzbild | FAIL; Datei-/Container-/Codec-/Session-Matrix offen |
| PLAY / PAUSE / STOP | Benutzer meldet keine wirksame Funktion der Tasten | FAIL; Key-Event-Eingang vs. Playerwirkung getrennt prüfen |
| OK | Bild wird angehalten und bleibt trotz nachfolgender Tasten eingefroren | FAIL; kein nachgewiesener Resume-/Bildfortschritt |
| BACK | Verlässt die Wiedergabe | PASS für sichtbares Zurück, Session-STOP-Cleanup separat offen |
| EPG | Jetzt/Nächste sowie 24h sind mit der Fernbedienung erreichbar; Metadaten werden nicht sichtbar | FAIL; angekündigtes Foto und Status-/Antwortdiagnose auswerten |
| Poster | Zunächst Platzhalter; Poster erscheint laut Nutzer erst beim Betätigen der Wiedergabetaste; zuvor anders | UX-Regression; genaue Auswahl-/Ladeabfolge prüfen |
| Aufnahmedatum | Wirkt korrekt formatiert | Vorläufig positiv; noch nicht isoliert bestätigt |
| Layout | Informationsanordnung wird als unbrauchbar/unattraktiv bewertet; Farben und Schrift sind ausdrücklich **nicht** das Problem | UX-Hardwareabnahme FAIL |

**Quellenprüfung:** Der Client ruft in `app/src/main.js` die Aufnahme-Detail-/Artwork-Kette aktuell erst nach aktiver Aufnahmeauswahl ab; die Poster-Anzeige erfolgt asynchron nach Detail-, Artwork-Listen- und Byte-GET. Im AVPlay-Adapter bedeutet erfolgreiches `play()` und der Status `PLAYING` nicht automatisch weiterlaufende Videoframes oder hörbaren Ton. Das erklärt die Nachweisgrenze, belegt aber ohne weitere Hardwarediagnose **nicht** die konkrete Ursache der Fehler.

**Nächste Gates – keine neue Architektur:**

1. Auf echter DEV-App sichtbare Buildkennung, real empfangene Fernbedienungs-KeyCodes, AVPlay-`getState()`, `oncurrentplaytime`/`getCurrentTime()`, Pause/Resume-Befehl und tatsächlichen Bildfortschritt korrelieren. Keine Medien-Tastenwirkung allein aufgrund eines JS-Calls behaupten. STOP/BACK einschließlich Server-MediaSession-Cleanup getrennt abnehmen.
2. Stumme und schwarz bleibende Aufnahmen exemplarisch nach geschütztem Session-Profil, Container, Video-/Audio-Codec und Tonspur/Index/Kanälen unterscheiden; Audiowiedergabe nur nach echtem Hörtest PASS. Keine ungeschützten URLs, vermuteten Cookie-Workarounds oder Backend-Transcodes auf Verdacht.
3. EPG-Foto prüfen und entscheiden, ob ein sichtbares Status-/Berechtigungs-/Antwortproblem oder ein Darstellung-/Fokusproblem vorliegt. Vorher nicht erneut den API-Vertrag oder das Layout blind umstellen.
4. Poster unmittelbar und stabil zur ausgewählten Aufnahme sichtbar machen, ohne bei schneller D-Pad-Navigation unkontrolliert GETs auszulösen; Race- und Wechseltests ergänzen.
5. Informationsarchitektur des existierenden VDR-Suite-Webfrontends als Layout-Referenz heranziehen, auf TV-D-Pad/Fokus adaptieren. Schrift/Farbpalette beibehalten. Funktionale Gates priorisieren, bevor das UI als fertig gilt.

**Status/Schutz:** S6.5 **HARDWARE FAIL**. PR #33 bleibt Draft, **kein Merge nach main**. Nur bestehender Branch `work/s6-tv-api-v1`, keine Produktivinstallation, kein neues DEV-Bootstrap, kein Neu-Pairing, kein ungefragtes Backend-Update.


## S6.6 – EPG-Foto und OK-Korrektur (26.10.2026)

**Real-Samsung-Foto des Benutzers (Samsung GU43TU6979UXZG, Tizen 5.5):**
Die DEV-Oberfläche zeigt unten rechts **Samsung v0.1.1 · S6.4** (die vom lokalen Windows-Build abweichende GitHub-`0.1.0` ist bekannt und nicht automatisch eine Regression). Der ausgewählte Sender ist **2 · ZDF HD**. Der Bildschirm bestätigt ausdrücklich **„EPG Jetzt/Nächste · 2 Einträge“** und zeigt die echten Sendungen **16:10–17:00 Die Rosenheim-Cops · Frostiger Tod** sowie **17:00–17:10 heute**. D-Pad-Fokus liegt sichtbar auf der zweiten Zeile. Der Benutzer bestätigt: **„Druck auf OK passiert nichts“**.

**Korrigierte Bewertung:** Die EPG-Nutzdaten sind sichtbar und der Now/Next-Abruf funktioniert auf echter Hardware; das vorherige pauschale „keine Metadaten“ lässt sich für diese zwei EPG-Events nicht aufrechterhalten. Nicht belegt sind ausführliche Beschreibungen, eventuelle native Event-IDs, weitere 24h-Einträge und eine sinnvolle interaktive Detailansicht. Das Layout nutzt den großen rechten Bildschirmbereich schlecht, insbesondere die nur zwei kleinen Event-Zeilen.

**Belegbare Ursache des OK-Fehlers:** `app/src/main.js` erzeugte EPG-Zeilen mit Fokus-IDs und Click-Handlern, aber `activate()` enthielt keinen Zweig für EPG-Einträge. OK wurde daher normalisiert und navigiert, führte auf einem EPG-Eintrag aber keinerlei Detailaktion aus. Dies ist ein konkreter Quellcodefehler, nicht die Vermutung eines kaputten Samsung-D-Pad oder fehlenden EPG-Grants.

**S6.6 Source-Fix auf dem bestehenden Branch:** Dynamische EPG-Zeilen besitzen `data-epg-index`, der zentrale Focus/OK-Owner aktiviert die jeweils zugehörige Sendung. Unter der (weiterhin scrollbaren) Event-Liste gibt es eine große Detailansicht mit Titel, Zeit und Untertitel, die vor dem ersten OK aus dem bereits vorhandenen Now/Next-Ergebnis befüllt wird. Ein ausdrückliches OK lädt ausschließlich bei nachgewiesener gültiger `eventId` den vorhandenen Device-autorisierten `GET /api/v1/epg/event`; der Client validiert Backend/Kanal/ID und das begrenzte Detailobjekt. Ohne vom Server gelieferte native Event-ID wird keine künstliche ID erzeugt, sondern ein erklärender Status gezeigt. Stale Callbacks und Ansichtwechsel entwerten die Detailantwort. Die UI-Palette/Schrift bleibt erhalten, nur die Informationsverteilung wird verbessert. Tests umfassen den echten OK-Keypfad, fehlende Event-ID und Backend-Validierung; die generierte Tizen-5.5-Runtime wurde synchronisiert. CI des Produkt-Commits `1046532a516a2ca74db4683a752791e9cd2bbdad`: erfolgreich (GitHub Actions #40350565600).

**Gates:** EPG-Datenabruf Jetzt/Nächste **HARDWARE PASS (Foto)**, EPG-Reihe per D-Pad **HARDWARE PASS (Foto)**, Detail-OK/ausführliche Beschreibung **SOURCE/CI PASS, HARDWARE OPEN**, 24h-Detailansicht **HARDWARE OPEN**. AVPlay-Ton, Schwarzbild und PLAY/PAUSE/STOP bleiben ausdrücklich **HARDWARE FAIL** und werden durch den EPG-Fix nicht berührt. Kein Merge nach `main`, produktives Samsung-Paket `VDRSuiteTV` und bestehende Geräteanmeldung bleiben unberührt.


## S6.7 – Event-ID-Abgleich Webfrontend / Samsung (26.10.2026)

**Gegenprobe des Nutzers:** Foto Samsung DEV `v0.1.1 · S6.4` auf Das Erste HD mit echter Now/Next-Sendung `Tagesschau`, 17:00–17:15, und auf OK ausgelöstem Text „Dieser EPG-Eintrag enthält keine bestätigte Event-ID“. Direkt daneben Foto des VDR-Suite-Webfrontends mit **derselben** Sendung, 17:00–17:15, inklusive dort sichtbarer Event-ID. Die Web-App besitzt zusätzlich private/browserseitige EPG-Darstellung und stellt deshalb keinen Beweis dafür dar, dass diese ID auch über Public-v1 Now/Next transportiert wurde.

**Quellnachweis Backend, Stand `main` 26.10.2026:** `PublicApiRuntime.cpp` serialisiert `/api/v1/epg/now-next` ohne `eventId`, obwohl `PublicEpgNowNextItem` ein optionales Feld dafür besitzt; `DaemonRuntimeInitialization.cpp` kopiert bei der Now/Next-Abbildung ausschließlich Kanal/Titel/Untertitel/Start/Ende/Dauer. Die existierende `/api/v1/epg/window`-Abbildung sendet optional `eventId` **nur nach** `hasSourceEventIdForBackend` im autorisierten EPG-Cache. Eine Browser-seitig sichtbare Event-ID beweist nicht notwendigerweise native Source-ID-Provenienz. Der vom Samsung zuvor gezeigte Text suggerierte daher eine fehlende native ID, obwohl eigentlich zunächst nur der Now/Next-Wire-Contract kein ID-Feld enthält.

**S6.7 DEV-Source-Korrektur ohne Backend-Deployment:** Nur nach explizitem OK auf eine Sendung ohne Event-ID wird mit dem vorhandenen separaten Device-Client `GET /api/v1/epg/window` für deren konkrete Start-/Endzeit und exakt dasselbe Backend/Kanal angefordert. Die Antwort muss vollständig sein (`hasMore=false`) und **genau einen** Eintrag mit gleichem Kanal, Titel, Untertitel, Start/Ende und Dauer enthalten, der eine vom Server nachgewiesene Event-ID trägt. Nur dann folgt das Device-autorisierte `GET /api/v1/epg/event`. Bei Null-/Mehrfachtreffer, Pagination, fehlender Source-ID oder Fehler erscheint ein erklärender Hinweis; keine ID aus Titel/Zeit erfinden, keine private Browser-Route, kein Rückgriff auf andere Backend-Scope, keine Timer-Mutation. Abbruch/Ansichtwechsel entwertet die Antwort; die geladene Detailzeit muss zur ausgewählten Sendung passen. Erlaubte native Event-ID-Zeichen und die 160-Zeichen-Grenze entsprechen dem Public-v1 Event-Parser, einschließlich `:` (unverändert im streng validierten Query-String, nicht als `%3A`).

**Bestätigt:** Samsung-Quelltests/Bundle-Check einschließlich fehlender/mehrdeutiger IDs, abgebrochener Antworten, erlaubter colon-ID und authentifiziertem EPG-Einzeldetail; GitHub Actions **#40353944975** erfolgreich für Produkt-Commit `0002ca174df879d7488ef516ec9c93833d28b698`. **Hardware OPEN** – ausführliche Beschreibung auf dem realen Samsung noch nicht nachgewiesen. Server bleibt unverändert, kein Re-Pairing, kein WITs-Start/Install-Fallback, kein Merge nach `main`. Das bei der lokalen DEV-App angezeigte `0.1.1` ist getrennt vom unveränderten GitHub-Quellmanifest `0.1.0` zu behandeln; lokales Update muss Version und Device-Daten ausdrücklich bewahren.


## S6.8 – EPG-Poster über bestehende Public-v1-Device-Bildrouten (26.10.2026)

**Neue Samsung-Hardwarebeobachtung (Foto):** Auf `arte HD` wird am 26.10.2026 nach EPG Jetzt/Nächste → „Parasiten packen aus“ → OK tatsächlich die vollständige Beschreibung mit Sendungszeit, Titel und Untertitel in der rechten Detailspalte angezeigt. Dies bestätigt den S6.7-Detail-GET auf der realen DEV-Hardware als funktionierend (keine Aussage über andere Formate/Sender). **Weiterhin kein Poster in der alten Clientfassung**, obwohl die vorhandene Suite Public-v1-API schon zwei Geräte-geschützte EPG-Image-Routen hat.

**Befund Quellprüfung:** `GET /api/v1/epg/event` liefert lediglich Titel/Untertitel/Beschreibung/Zeit/Dauer und keine Bildbytes bzw. angereicherte TVScraper-Besetzung. `GET /api/v1/epg/preferred-artwork?backendId=...&channelId=...&eventId=...` wird serverseitig auf bestehenden bevorzugten TVScraper- bzw. validierten Serien-Fallback abgebildet; `GET /api/v1/epg/artwork` liefert vorhandenes direktes EPG-Artwork. Beide verlangen `epg.view` für das exakt gewählte Backend. Das Webfrontend nutzt darüber hinaus `/api/epg/cache/metadata` (Browser-only) mit Feldern wie Besetzung, Genres, Staffel/Folge/Bewertung. **Ein gleichwertiges strukturiertes Public-v1-Device-Metadaten-Read-API ist noch nicht belegt; keine Browser-Routen im Device verwenden.**

**Samsung SOURCE-Korrektur:** Nach bestätigter Event-Detailabfrage lädt ein eigener authentifizierter, begrenzter Public-v1-Binärclient das bevorzugte Bild; nur bei 404 wird direktes EPG-Artwork angefordert. Akzeptiert werden ausschließlich `image/jpeg`, `image/png`, `image/webp` bis 2 MiB, ohne Redirect, Session-URL, Providerlink oder lokale Pfad-Übernahme. Rendering erfolgt per `Blob`/Object-URL; altes Bild und laufende Bildanforderungen werden bei neuem Event, Kanal-/Seitenwechsel sowie Fehler aufgeräumt. Fehlendes Bild ist kein EPG-Metadatenfehler. Responsive Bild/Text-Verteilung nimmt nur bei vorhandenem Bild Platz ein. Buildruntime ist synchronisiert; Tests prüfen Device-Header, Bildformat/-größe, Redirect-Abweisung, 404-Fallback und stale/URL-Cleanup.

**CI:** Commit `ddbb6575495517203f2dcfb15f9f03e7b65001fb` PASS – GitHub Actions #40357442619. **HARDWARE OPEN:** Auslieferung via bereits laufendem isoliertem WITs-Watch an `VDRSuitDev`, auf der echten Sendung tatsächlich verfügbares Poster, Image-Decode und Navigation/Back sowie Login-Persistenz erneut prüfen. **Richer TVScraper metadata: nicht in diesem Slice**; zunächst Backend-Wire-Contract/Grant/Bounded-Response auf Public-v1-Seite separat spezifizieren und source-testen. Keine Änderung am vorhandenen yaVDR-Server, keine neue Installation, keine Änderung am Produktiv-Paket `VDRSuiteTV`, kein Merge von Samsung-PR #33.


## S6.8 – TV-Foto: ZDF HD Poster und EPG-Text sichtbar (26.10.2026)

**Echte Samsung-DEV-Hardware, Anwenderfoto:** Die laufende lokale Fassung zeigt am unteren Bildrand `Samsung v0.1.1 · S6.4` und rechts oben `Connected`. Unter `Live-TV → ZDF HD → Jetzt/Nächste` wurde die Sendung **SOKO Potsdam – Running Dinner (18:05–19:00)** markiert. Rechts werden ein tatsächlich decodiertes EPG-Sendungsbild, Titel, Untertitel, das Textfragment **„Krimiserie, Deutschland 2026“**, eine ausführliche Inhaltsbeschreibung und Darstellernamen angezeigt. Dies ist ein **Hardware-PASS für den S6.8-Bildabruf und die Darstellung eines vorhandenen Bilds**, sowie ein erneuter **Hardware-PASS für den S6.7-Einzeldetail-/Beschreibungspfad auf diesem konkreten Event**. Vorherige Abnahme `HARDWARE OPEN` für das Einzelfoto nun entsprechend aktualisiert; keine Behauptung, dass alle Sender/Sendungen Bildmaterial haben, Bild-Cleanup nach Navigation oder Anmeldung nach Neustart schon abgenommen sind.

**Unterscheidung der Metadaten:** Auf dem TV sichtbare Darsteller/Genre-/Land-/Jahresangaben können aus dem **nativen Beschreibungstext** stammen. Das Foto beweist **nicht**, dass die Samsung-App bereits die strukturierten Browser-/TVScraper-Zusatzfelder aus `/api/epg/cache/metadata` ausliest. Diese S6.9-API-/UI-Parität bleibt **OFFEN**. Keine privaten Browser-Routen mit Device-Token verwenden.

**Sichtbarer UX-Mangel:** Das Bild bleibt im schmalen Detailbereich klein, die lange Beschreibung und Darstellerliste laufen unter den Bildschirmrand, während die Zweispalten-Bildschirmaufteilung nicht die Hierarchie des vorhandenen VDR-Suite-Webfrontends abbildet. Nächste TV-Layout-Aufgabe: Poster/Text in einem großzügigen Detailbereich anordnen, D-Pad-Fokus und Scrollbarkeit für lange Event-Texte nachweisen, Listen- und Detailanzeige klar trennen. Farben und Schriftfamilie ausdrücklich **nicht** neu erfinden. Keine UI-Verschönerung als Ersatz für blockierenden AVPlay-Ton, Schwarzbild, PLAY/PAUSE/STOP und OK-Freeze deklarieren.

**Status:** PR #33 bleibt Draft, kein Merge nach `main`, keine produktive App-Installation, kein neues Pairing. DEV läuft weiterhin über das isolierte `VDRSuitDev`-WITs-Projekt. `S6.8` Poster **HARDWARE PASS (eine ZDF-Sendung)**, universelle Artwork-Verfügbarkeit/Fehlerfälle/Back-Cleanup **OPEN**, S6.9 strukturierte Metadaten **OPEN**, Player **HARDWARE FAIL**.


## S6.10 – Player-Evidenz und TV-EPG-Scroll (Quellabnahme, 26.10.2026)

**Quelle des nächsten Retests:** Bisherige echte Hardwarebilder zeigen für `SOKO Potsdam – Running Dinner` ein geladenes Artwork, Titel, Untertitel und langen Text mit Darstellerliste, welcher am TV unten nicht mehr lesbar ist; Aufnahme-Playback weiter Ton=FAIL, teilweise Schwarzbild=FAIL, Tastensteuerung=FAIL. S6.10 verändert nur den Client/DEV-Code, nicht den installierten Samsung oder Server.

**Source/CI PASS:** Native AVPlay oncurrentplaytime-Millisekunden werden bei tatsächlich laufender AVPlay-Sitzung als begrenzte Fortschrittsdiagnose angezeigt und durch `generation`/Stop entwertet. Nach PLAY/PAUSE/OK wird ein rein lesender `getState`/`getCurrentTime`-Snapshot neben der Key-Aktion angezeigt, wenn verfügbar. Ein AVPlay-Zeitdelta ist ausdrücklich **nicht gleichbedeutend** mit bewegtem Bild oder hörbarem Ton. Die native AVPlay-Quelle, MediaSession und Audio-Berechtigung sind unverändert; ohne Real-TV-Beobachtung kein Player-Fix/Hardware-PASS.

**Source/CI PASS:** Im Live-EPG werden lange Sendungsdetails in der vorhandenen Scrollfläche per `Text ▲/▼`-Buttons im bestehenden Fokusowner lesbar, mit Reset bei Auswahlwechsel und versteckten Controls bei Wechsel zur anderen Seite. Poster/Text haben mehr Raum. Bestehende Farbpalette, Font und Device-Credentials unverändert. **Hardware OPEN:** Auf realem 2020er Tizen 5.5 fokussieren/scrollen, lange Beschreibung und Poster prüfen; auf kleinen TV-Höhen/Overflow und D-Pad-Fokus achten. Weniger Listenhöhe darf die 24h-EPG-Paginierung nicht blockieren.

**S6.11 Metadatenstatus:** native Beschreibung/Poster HARDWARE PASS für einzelne Sendungen; strukturierte Genre/Personen/TVScraper-Daten PARITY OPEN und serverseitiger Public-v1-Wire-Contract notwendig. Keine Browser-privaten Routen und keine erfundenen Meta-Felder.

**Merge-Sperre:** PR #33 bleibt Draft, nicht nach `main` mergen. Kein automatischer DEV-Bootstrap und kein Update der produktiven Samsung-App.


## S6.12 – Echte Samsung-Fernbedienung, fehlende tv.inputdevice-Berechtigung (26.10.2026)

**Hardwarefoto:** Klassische Samsung-Fernbedienung mit separat vorhandenen Farbtasten A/B/C/D (D=Blau), eigenständigem PLAY/PAUSE/STOP und RETURN. Auch die zuvor fotografierte AVRPlay-Overlayzeile `Fernbedienung · Taste RIGHT · keine Wiedergabeaktion` belegt, dass mindestens ein Standard-D-Pad-KeyEvent in der aktiven AVPlay-Anzeige an den Client gelangt; sie belegt NICHT, dass die Zusatzkeys geliefert wurden. Audioanzeige meldet eine einzige MPEG-Spur mit Index 1 und `keine sichere automatische Wahl`; Audio bleibt am Hardwaretest stumm, AVPlay-Resume/Freeze bleibt FAIL. Eine einzelne MPEG-Spur kann auch bei erfolgreichem BLAU-Tastenevent nicht zu einer anderen vorhandenen Spur gewechselt werden.

**Gesicherte Quellursache für unerklärte Zusatzkey-Verfügbarkeit:** Die App registrierte bereits `MediaPlay`, `MediaPause`, `MediaPlayPause`, `MediaStop` und `ColorF3Blue` per `tizen.tvinputdevice.registerKey()` und normalisierte die offiziellen Codes (415, 19, 10252, 413, 406). Die bisherige `app/config.xml` deklarierte jedoch nicht das Samsung/Tizen-Public-Privilege `http://tizen.org/privilege/tv.inputdevice`, das diese API benötigt. Die Registrierung schluckte alle Fehler und behauptete nur `tvinputdevice vorhanden`. Quelle: Samsung TVInputDevice-Referenz, https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/tvinputdevice-api.html.

**DEV-Source-Fix (S6.12):** Explizites Privilege in `app/config.xml`. Der Client zeigt künftig sicher und ohne Credential/URL den jeweiligen Registrierungsstatus von PLAY/PAUSE/STOP/BLAU sowie den numerischen Keycode empfangener Media-/Farbtasten im bestehenden Playback-HUD. Für den EPG führt DOWN vom letzten rechts fokussierten EPG-Eintrag direkt zum bereits vorhandenen `Text ▼`-Steuerelement, mit UP zurück; so muss der Nutzer nicht erst alle Senderzeilen durchlaufen. Keine weiteren Player-/Audio-/MediaSession-Änderungen. Sicherheits- und Focus-Tests/Runtime synchronisiert; GitHub Actions **#40364791097** für Commit `d43f0e47271b46397f563a9b142e455d5bad1b03` **PASS**.

**Wichtige Auslieferungsgrenze:** `tv:watch` überträgt DEV-Webdateien, installiert aber KEIN Paket und kann eine Manifest-Berechtigung der **bereits installierten** WITs-Host-App nicht rückwirkend gewähren. Bevor die neue Berechtigung auf echtem TV wirksam wird, muss eine zukünftige ausschließlich DEV-bezogene signierte App-/Host-Aktualisierung gesondert geprüft und genehmigt werden; sie kann DEV-KeyManager-Daten verlieren. `wits --start` deinstalliert und installiert den WITs-Host und ist deshalb **nicht** automatisch freigegeben. Produktives Paket `VDRSuiteTV` unverändert; DEV-Paket `VDRSuitDev` getrennt; kein neuer Pairingversuch. Zusatztasten, Audio, OK-Resume und EPG-Scroll auf der installierten Version bleiben **HARDWARE OPEN/FAIL** bis zur tatsächlichen Abnahme.


## S6.13 – Kein AVPlay-Ton: MPEG-Audio vs. Decoderprofil (26.10.2026)

**Offene reale Hardware-Blockade:** Auf dem Samsung GU43TU6979UXZG (Tizen 5.5) läuft bei manchen Aufnahmen das Bild/AVPlay-Zeitdelta, aber es gibt unverändert keinen hörbaren Ton. Der Player zeigt genau eine Spur `Index 1 · MPEG`, zuvor `keine sichere automatische Wahl`. Das ist **kein** Nachweis einer tatsächlich dekodierten Tonspur: `getTotalTrackInfo()` meldet Demux-/Metadaten, nicht akustischen Output. Fehlender `onerror`-Callback bedeutet deshalb nicht „Audio funktioniert“. Die installierte `tv.inputdevice`-Berechtigung und Media-Key-Erkennung sind ein **separates** Thema.

**Geprüfte offizielle Samsung-Dokumentation:** Die 2020-TV-Video-Spezifikationen führen für die Audio-Codecs `MPEG(MP3)`, AAC, AC-3 usw. auf, aber keine ausdrückliche MP2-Unterstützung. Das native AVPlay-FOURCC `mpeg` (sofern so gemeldet) identifiziert MP2 und MP3 nicht zuverlässig. Ein VDR-/DVB-Transportstream mit MP2 ist daher eine **plausible, aber unbestätigte** Erklärung; erst `ffprobe` auf dem tatsächlich gestreamten Audio-/Aufnahmesegment bzw. einer repräsentativen Quelle sowie ein AAC-Gegenversuch erlauben die Zuordnung. Referenz: https://developer.samsung.com/smarttv/develop/specifications/media-specifications/2020-tv-video-specifications.html. `AVPlay.enableAudioStream()` ist laut Samsung erst seit Tizen 6.5 verfügbar und somit **kein** Fix für Tizen 5.5. Referenz: https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html.

**S6.13 DEV-Änderungen:** Der Client bewahrt ein bounded, allowlisted AVPlay-FOURCC (nicht nur den normalisierten Codec-Namen) und die Sample-Rate; bei MPEG weist die UI ausdrücklich darauf hin, dass MP2/MP3 nicht unterschieden wurden. Die Tizen-`tvaudiocontrol`-API wird – soweit verfügbar – nur mit `isMute()`, `getVolume()` und `getOutputMode()` abgefragt; weder Lautstärke noch Mute noch Audio-Routing werden verändert. Nicht erlaubte oder fehlgeschlagene Abfragen werden als `nicht lesbar` ausgewiesen, nicht als impliziter PASS. Keine MediaSession-, URL-, Cookie-, EPG-, Paketsignatur- oder Transcodeänderung. Tests decken nicht-erfundene Codec-Aussagen, den Verzicht auf spekulative Track-Auswahl und vollständig read-only TV-Ausgabechecks ab. GitHub Actions #40366232457 für Runtime-Commit `328df8acaf691f35fcdbcad32a972d423b549329`: PASS.

**Nächste reale Prüfungen:** (1) Funktioniert anderer TV-/App-Ton bei internen TV-Lautsprechern mit nicht-stummgeschaltetem TV? Falls ein externer Audioempfänger angeschlossen ist, digitales Ausgabeformat PCM zum Vergleich. (2) Den Audio-Codec einer betroffenen VDR-Aufnahme mit `ffprobe` read-only feststellen (`mp2`, `mp3`, `aac`, `ac3` usw.) und gegen ein nachweislich AAC-Stereo-Video testen. (3) Wenn nur MP2 stumm bleibt, einen **gesonderten** audio-only Transcode zu AAC Stereo bei unverändertem Video auf einer zeitlich/Session-begrenzten Testroute evaluieren; keine unautorisierten Server-, Aufnahme- oder Produktivänderungen. (4) Sind auch AAC-Stereo-Titel stumm, zuerst AVPlay-Audio-Routing / Mute / Tizen-WebAudio-Gegenprobe und aktuelle Track-Auswahl untersuchen.

**Abnahme:** AUDIO bleibt HARDWARE FAIL, die S6.13-Diagnose SOURCE/CI PASS und HARDWARE OPEN. PR #33 bleibt Draft, kein Merge. Die JS-Diagnose kann auf die existierende isolierte DEV-Watch-Stage übertragen werden; die bereits installierte DEV-WITs-Host-Manifest-Berechtigung wird dadurch nicht neu installiert oder rückwirkend geändert. Kein Pairing-/Produktiv-App-Eingriff.


## S6.13 – Neuer realer AVPlay-Fotobefund: Vollbild/Untertitel, MPEG-Audio, fehlende Zusatztasten (26.10.2026)

**Anwenderfoto echter Samsung GU43TU6979UXZG:** Der native Player zeigt tatsächlich ein bildschirmfüllendes dunkles Filmszenenbild mit gerenderten **deutschen Untertiteln** („… und ließen sich so von der Stadt zu Hilfs-Bahnpolizisten ernennen.“). Bildfläche und Textdekodierung sind damit für **diese konkrete Aufnahme** beobachtet; das Foto allein belegt weder fortlaufende Frames noch hörbaren Ton, Audio-Funktion, PLAY/PAUSE/STOP oder erfolgreiche Bildausgabe für andere Medienprofile. **Status: einzelnes AVPlay-Videobild mit Untertiteln REAL-HARDWARE-PASS, AVPlay-Audio-/Controller-Gates weiterhin OPEN/FAIL gemäß bisherigen Hörtests.**

**Abgelesene Overlay-Diagnose:** `AVPlay-Zeit 0:01 · Fortschritt 0 s · Bild/Ton separat prüfen`; Audio: `1 Spur(en)`, `Index 1`, `MPEG [MPEG]`, `2ch`, `48000Hz`, `MP2/MP3 nicht bestimmt`, `keine sichere automatische Wahl`. TV-Audio-Control: `Stumm: nein`, `Lautstärke: 12`, `Ausgabe: PCM`. Fernbedienungszeile: `Zusatz-Tasten nicht registriert: MediaPlay, MediaPause, MediaStop, ColorF3Blue`; das bestehende HUD nennt `OK/PLAY-PAUSE` und `STOP/ZURÜCK` als Aktionen, **beweist aber keine erfolgreiche Taste**. Das initiale Zeitdelta von 0 s bei Position 0:01 ist zu früh, um auf Stillstand zu schließen.

**Einordnung:** Eine einzelne als MPEG etikettierte 48-kHz-Stereospur kann nicht durch Wechsel auf einen anderen vorhandenen Track geheilt werden. Der Samsung-2020-Codec-Vertrag erwähnt MPEG(MP3) neben AAC/AC-3, nicht explizit MP2; die AVPlay-Meldung unterscheidet MP2 und MP3 nicht. Ursache Audio deshalb **unbewiesen**, bis die tatsächlich abgespielte Aufnahme oder das vom Server gelieferte Segment read-only mit `ffprobe` geprüft und mit einer bekannten AAC-Stereo-Aufnahme verglichen wurde. `Stumm: nein` und `Ausgabe: PCM` beweisen allein keinen akustischen Output.

**Zusatzkey-Ursache separat halten:** Das Quelle-Manifest enthält inzwischen `http://tizen.org/privilege/tv.inputdevice` (S6.12), aber `tv:watch` aktualisiert nur Webdateien. Die bereits installierte WITs-DEV-Host-App erhält dadurch **keine** neue Manifest-Berechtigung. Die fehlenden Registrierungen sind somit mit der noch alten Host-Berechtigung vereinbar, aber per Foto nicht bis zu einem API-Fehlercode eindeutig bewiesen. Kein automatischer WITs-Start, Reinstall, Uninstall, Neu-Pairing oder irgendein Eingriff in `VDRSuiteTV`; ein gesonderter signierter DEV-Host-Update-Plan braucht vorab Inventar/KeyManager-Risiko-Freigabe.

**Nächstes Hardware-Differential:** (1) Hört der Nutzer bei dieser Szene irgendeinen Ton? (2) Schreitet die AVPlay-Zeit nach einigen Sekunden tatsächlich voran und bewegen sich Bilder? (3) Welchen Codec meldet `ffprobe` für den verwendeten TS-Segment-Audiostream? Erst anhand dessen über eine separate, sessiongebundene **Audio-only**-AAC-Option nachdenken, Video unangetastet; ein hypothetischer MP2-Fix ist kein zulässiger Blind-Patch.
