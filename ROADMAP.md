# VDR-Suite Samsung – client-lokale Roadmap

Stand: 2026-10-25. **Sx** sind ausschließlich Samsung-Projektphasen. Keine VDR-Suite- oder VIDAA-Phase wird umnummeriert.

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
- **S1.2 App-Paket:** `config.xml`/Icon validiert; signiertes `.wgt` gebaut und auf echtem Tizen 5.5 installiert. Original-VIDAA-Logo und lokales Startvideo erfolgreich angezeigt (**Nutzer bestätigt**); Ton der Animation nicht gesondert verifiziert. **Hardwaretest bestanden.**
- **S1.3 Eingabe und Fokus:** D-Pad, OK und sichtbarer Fokus über alle vier S1-Menüpunkte am TV bestätigt. **Noch offen:** Zurück/Exit, Play/Pause/Stop und Farbtasten sowie Wiederholbarkeit.
- **S1.4 Fähigkeitstest und Restart:** Tizen API, Samsung AVPlay und TV-Tasten API am Gerät als 'vorhanden' erkannt. Bildschirmdarstellung bestätigt. **Noch offen:** Back/Exit/Neustart, Auflösungstests und tatsächliche AVPlay-Medienwiedergabe. Details: [Hardware-Abnahme](docs/hardware-acceptance.md).

**Gate:** echter TV startet die signierte App; Navigation und Exit funktionieren reproduzierbar. Bis dahin S1 = **unverified**.

## Phase S2 – TV-Oberfläche

- **S2.1 VISUELLES HARDWARE-PASS (Nutzerbestätigung 2026-10-25):** Dark-Premium-Media-Home im Samsung-Client mit oberer Navigation, großer Hero-Karte, seitlichen Karten, Aktionsleiste, horizontaler Mediathek-Reihe und sechs routbaren Offline-Ansichten. Alle Daten erkennbar als Designvorschau; kein echter Sender/EPG/Account behauptet. Back-Stack zunächst Home->Unteransicht->Home; weitere Lade-/Fehlerzustände und verschachtelte Routen folgen in S2.2/S2.3. Dark-Premium-Oberfläche auf dem echten Samsung vom Nutzer mit 'gefällt mir! und pass!' bestätigt; umfassende Fernbedienungs-Abnahme ist S2.2.
- **S2.2 HARDWARE-PASS (2026-10-25, Nutzer bestätigt):** Fokusgraph für Navigation, Hero, Aktionsleiste, Content-Rail und Detailansichten; D-Pad/OK/Zurück, Fokus-Rückkehr und Routenverlauf. Getestet vom Nutzer auf dem echten Samsung-TV und mit „pass, hab schon getestet“ bestätigt. **Reiterwechsel bleibt bewusst ohne Ansichtswechsel; erst OK aktiviert eine Ansicht**, um bei der späteren API-Anbindung unnötiges Nachladen zu vermeiden. Automatisierte Samsung-Client-Checks grün (Commit `785b4b9`).
- **S2.3 NUTZER-PASS, TV-DETAILS NOCH NICHT EINZELN BELEGT (2026-10-25):** Visuell einheitliche Premium-Detailseiten für Live-TV, Aufnahmen, Suche und Timer. Offline-/Loading-/Empty-/Error-Anzeigen über ein reines, deterministisches Präsentationsmodell; am TV per ausdrücklich markierter lokaler Demo-Taste umschaltbar. Keine Netzwerkaufrufe, keine echten Inhalte oder AVPlay-Streams. Gewohnte OK-auf-Reiter-Navigation und S2.2-Fokusgraph bleiben erhalten. Erweiterte Tests und TV-Retest erforderlich.

**Gate:** Bedienung per D-Pad am TV; noch ausschließlich kontrollierte Fixtures.

## Phase S3 – API-v1-Anbindung und Identität

- **S3.1 QUELLCODE + TV-GATE PASS (2026-10-25):** Konfigurierbare HTTPS-Basisadresse unter Einstellungen, ausschließlich durch OK ausgelöste anonyme API-v1-Discovery (`GET /api/v1`, `/api/v1/capabilities`), v1-Vertragsprüfung und abgestufte Fehlertypisierung. Keine automatischen Anfragen beim Reiterwechsel. Die Adresse (keine Credentials) bleibt lokal auf dem TV. Manifest-Privilege für dynamische HTTPS-Ziele. TV-Nutzerfoto bestätigt HTTPS-Discovery unter dem korrekten nginx-Prefix mit 31 Public-v1-Fähigkeiten; kein Device-Login oder Content-Grant.
- **S3.2 KOPPLUNG AM TV BESTÄTIGT, PERSISTENZ-GATE OFFEN (2026-10-25):** Manuell ausgelöster anonymer Pairing-Bootstrap, TV-Code, token-only Statusprüfung, Admin-Freigabe, einmalig ausgelöste Credential-Ausgabe, sichere persistente Speicherung im Tizen-KeyManager mit Readback und expliziter Device-Auth-Prüfung. Kein automatisches Polling und kein QR bis zu einer vom Server gelieferten sicheren Freigabe-URL. Kein unsicherer Storage-Fallback; bei unbekanntem POST-Ergebnis keine Wiederholung. Tests quellsseitig, echter Samsung-KeyManager/Pairing-Server noch nicht abgenommen.
- **S3.3 ERSTE ECHTE SENDERSEITE HARDWARE-PASS (2026-10-25):** Aktuell aktivierte KeyManager-Device-Identität authentifiziert öffentliche GET /api/v1, /backends und /channels. Der Nutzer bestätigte auf dem echten Samsung zuerst „Keine Backends freigegeben“ **ohne** channels.view und nach der ausdrücklich für die neue Identität erteilten Berechtigung **20 echte Sender geladen** (Das Erste HD, SWR RP HD usw.). Source-/CI-Tests ergänzen die reale Bestätigung. **Noch offen:** Mehr Sender/Cursor, Backendwechsel, Revoke-/Fehlerpfade, App-Neustart/Update ohne Verlust des Keys, EPG, AVPlay und MediaSessions. Für die vom Nutzer verlangte VDR-`channels.conf`-Reihenfolge braucht die API eine serverseitige, cursorstabile `channelNumber`-Sortierung; aktuelles `backendId,channelId` liefert die falsche Reihenfolge. Keine 20er-Seite isoliert umsortieren. Details und kumulative Belege unter [Hardware-Abnahme](docs/hardware-acceptance.md) bzw. [Public-v1-Hardwarematrix](https://github.com/hotzenplotz5/vdr-suite/blob/main/docs/development/public-v1-final-hardware-acceptance.md).

**Zusätzlicher S3.2-Retestslice (25.10.2026, Quelle aktualisiert, Hardware offen):** Erneuter Verbindungsverlust vom Betreiber **ohne Neuinstallation** gemeldet. Der sichere KeyManager wird im Source-Client jetzt über die explizite Alias-GET statt über vorheriges Alias-Listing abgefragt. Ein echtes fehlendes Credential, ein nicht lesbarer KeyManager und ein HTTP-/Netzwerkproblem erscheinen unterscheidbar. Die Device-ID wird im TV-Einstellungsbereich angezeigt (kein Secret), damit nur wirklich verwaiste Servergeräte widerrufen werden. **Ein fehlgeschlagener Aufnahmen-HTTP-Request ist kein Beleg für Verlust der Kopplung.** Keine neue Berechtigungs-/Persistenzarchitektur, keine automatische neue Kopplung. Wiederholbarer TV-Neustart-/Offline-Test bleibt Pflicht.

**Gate:** Erstseiten-Device-Authentifizierung, Grant-Isolation und echte Sender auf dem realen Tizen 5.5 **BESTÄTIGT**. Persistenz über Update, Paginierung/Numeric-Order, alle negativen Fehlerklassen und Wiedergabe **separat offen**.

**S3.2/S7.3 – Statusanzeige nach echten Sender-/Aufnahmeabrufen (Source-Fix, Hardware offen; 25.10.2026):** Auf einem Samsung mit funktionierenden authentifizierten Sender- und Aufnahmelisten zeigte die Einstellungsseite fälschlich „kein Device-Credential“/„nicht gekoppelt“. Das UI las den KeyManager-Status beim Boot einmal, aktualisierte ihn aber nach erfolgreichen Device-Verifikationen in Live-TV/Aufnahmen nicht. Neue gemeinsame reine Präsentationsfunktion unterscheidet lokale Speicherung, serverseitig bestätigte Authentifizierung, vorübergehende KeyManager-Probleme, fehlende Identität und explizite 401-Ablehnung; Settings aktualisiert beim Eintritt, erfolgreiche Sender-/Aufnahmeverifikation synchronisiert den Status. Kein Server-/Grant-/Pairing-Eingriff; Source/CI ≠ TV-PASS. Neuen Runtime-Buildfingerprint am TV erst nach ausdrücklich genehmigter Installation prüfen. Aufnahmenwiedergabe-Screenshot separat nach diesem UI-Fix untersuchen. 

**S3.2-R – Wiederherstellung nur innerhalb einer bereits authentifizierten Sitzung (SOURCE/CI, HARDWARE OFFEN):** Der Button „Anmeldung prüfen“ berücksichtigte bisher bei `vault.read(): {ok:true,credential:null}` nicht das aus Sendern/Aufnahmen bekannte `lastVerifiedDevice`, sondern behauptete unmittelbar „Kein gespeichertes Credential gefunden“. Jetzt wird dieser Widerspruch explizit erkannt. Ist **dieselbe** Device-Identität samt Secret noch im Arbeitsspeicher derselben App-Sitzung, darf erst nach **bewusstem** „Anmeldung prüfen“, neuer erfolgreicher Device-GET-Prüfung und KeyManager-Speicherung **mit Readback** die ursprüngliche Anmeldung lokal repariert werden. `Kopplung starten` legt bei bereits authentifizierter Sitzung kein zweites Server-Gerät an. Netz-/401-/KeyManager-Fehler blockieren; kein Secret wird exportiert, kein HTTP-POST für neue Kopplung. **Nach einem Uninstall/Neustart mit tatsächlich gelöschtem KeyManager ist kein Secret mehr vorhanden und keine Wiederherstellung möglich.** Keine riskante Neuinstallation nur zum Test dieses Fixes. Weitere Entwicklung über isoliertes WITs-DEV, nicht via `Run Project` am laufenden Paket.

## Phase S4 – Aufnahmen/Library

- **S4.1 QUELLCODE IMPLEMENTIERT, TV-HARDWARE-GATE OFFEN (2026-10-25):** Samsung Aufnahmen-Ansicht liest nach bewusster OK-Aktion über die vorhandene Device-Anmeldung `GET /api/v1/backends` und `GET /api/v1/recordings?backendId=...&limit=100&sort=recordingId&order=asc`. Maximal **100 Datensätze pro Serveranfrage, keine Begrenzung der gesamten Aufnahmemediathek**: über echte `rc1_`-Keyset-Cursor sind weitere Seiten erreichbar; aktuelle Seite ersetzt ältere DOM-Zeilen. D-Pad-fokussierbare Aufnahmezeilen, Vorherige Seite, Weitere Aufnahmen und Backendwechsel, sichere Textdarstellung, keine Browser-private Route. Unberechtigter Zugriff (fehlendes `recordings.view@backend`) zeigt explizit Fehler. Kein automatischer Abruf beim Fokus, keine MediaSession/Wiedergabe, kein lokales Speichern von Geheimnissen. Quelltests/CI und echter Samsung-TV-S4.1-Test getrennt dokumentieren.
- **S4.2 QUELLCODE-KANDIDAT (TV-GATE OFFEN):** VDR-Aufnahmeverzeichnisse als Standardansicht über die bereits vorhandene öffentliche API `GET /api/v1/recordings?view=folders&limit=100&offset=...&folderId=...` mit opaken `fld1_`-IDs; D-Pad/OK zum Öffnen echter Unterordner, „Ordner hoch“/BACK und Seitenwechsel ohne fiktive Genre- oder Dateisystempfade. „Alle Aufnahmen“ erhält bewusst den bereits hardwarebestätigten flachen `rc1_`-100er-Katalog. Keine neue Server-DB oder Importlogik, keine Genre-Verzeichnisse.
- **S4.3 AUFGESCHOBEN (Benutzerentscheidung 25.10.2026):** Genre-Verzeichnisse/Genre-Facetten später; bis dahin ausschließlich die reale VDR-Ordnerhierarchie. Artwork/Details erst über bestehende freigegebene API-Verträge.

**Gate:** echte Ordner auf großem Katalog mit begrenzter DOM-Größe und unverfälschten Recording-IDs.

## Phase S5 – Samsung-Wiedergabe

- **S5.1 QUELLCODE-KANDIDAT (REAL-TV BILD/TON OFFEN):** Samsung-AVPlay-Adapter mit `open → prepareAsync → play`, sichtbarem Fehlschlag, STOP/BACK-Teardown und PLAY/PAUSE; genau ein Playback-Owner. Gerät muss echtes H.264/AAC-Decoderprofil melden, kein blind angenommenes All-Codec-Format.
- **S5.2 ERSTER INTEGRATIONSVERSUCH + FEHLERDIAGNOSE S5.2-R (SERVER-/TV-GATE OFFEN):** Nur nach Nutzeraktion „Wiedergabe testen“ Device-POST `/api/v1/recording-playback-sessions` mit `media.recording.play@backend`, gültiger `rec_`-ID und verifizierter `ms_`-/same-origin-`mediaPath`; anschließend Samsung AVPlay. STOP/BACK fordert Device-Session-Teardown an. **HttpOnly-Mediencookie im separaten AVPlay-Netzwerkstack, HTTPS/CORS, Container/Codec, Bild/Ton müssen auf dem echten TV getestet werden.** Bei Abweisung kein ungeschützter Direktlink und keine automatische Neu-Kopplung.
- **S5.3** Audio/Untertitel, Seek/Resume, Session-Cleanup, Abbruch/Widerruf.

**S5.2-R Quelle 25.10.2026:** Echte Samsung-Aufnahmenliste bestätigt; Foto bei Wiedergabetest meldet nachträglich "Session-Stop nicht bestätigt", Timeout. Bisher überschreibt der späte Cleanup-Callback einen früheren AVPlay-Fehler. Neue Fehlerdiagnose zeigt AVPlay-Phase (open/prepare/play/stream) und HLS/TS/MP4 ohne Secret, lässt echten AVPlay-Fehler durch späteren STOP-Timeout unangetastet und verhindert parallele CREATE während STOP-XHR. **HLS-Cookie-Übergabe zwischen XHR und AVPlay weiterhin unbelegt; keine Cookie-/Token-Umgehung.** Quellfix, kein Bild/Ton-Hardware-PASS.

**Gate:** Bild und Ton, Fehlerpfade und STOP/BACK am realen Gerät; keine URL-/Cookie-/Codec-Annahmen ohne Hardware-Nachweis. Priorität Pass-through -> Remux -> Transcode nur nach serverseitiger Policy.

**S5.2-FULLSCREEN QUELLKANDIDAT (Samsung-Fotos 25.10.2026, TV-RETEST OFFEN):** Das native Samsung-`application/avplayer`-Objekt wird beim Boot als unmittelbares `document.body`-Kind registriert statt in der scrollbaren Aufnahmeseite zu verbleiben. Beim Wiedergabestart wird die Weboberfläche über eine CSS-Klasse transparent/unsichtbar, das Video-Overlay bildschirmfüllend (1920×1080 AVPlay-DisplayRect mit optionaler Letterbox); beim STOP/Fehler/Ende wird der vorherige Zustand wiederhergestellt. Tests decken DOM-Lebenszyklus und Displaymodus ab. **Das löst das Layout, beweist aber ausdrücklich keinen erfolgreichen Medienabruf, Cookie-Transport, Decoder oder Bild/Ton.** Siehe Hardware-Abnahme.

## Phase S6 – TV-Funktionen und Public API v1 (ab 26.10.2026)

**Integrationsregel:** Ein gemeinsamer S6-Entwicklungsbranch und ein Draft-PR; Slices als einzelne Commits, keine Folgebranches. Nur Samsung-Code; bestehende Public-v1-Verträge verwenden. Hardwarebelege in `docs/hardware-acceptance.md`, API-v1-Serverbelege ausschließlich in der bestehenden zentralen VDR-Suite-Matrix. Kein Backend-Deployment, TV-Uninstall, neues Pairing oder automatischer Grant.

- **S6.0 – Fernbedienung (SOURCE-KANDIDAT, REAL-TV OFFEN):** `MediaPlayPause` (Samsung 10252) im zentralen Tastenowner registrieren/normalisieren; OK nur bei aktivem Player als Pause/Fortsetzen verwenden; STOP/BACK stoppt. Die tatsächliche Eingabe und `playing/paused/unavailable/error` werden im Fullscreen ohne Secrets sichtbar. Kein zweiter Key-Handler. Unit- und Runtime-Regressionen sowie reale Tizen-5.5-Tastenprobe.
- **S6.1 – AVPlay-Audio (SOURCE-KANDIDAT, REAL-TV OFFEN):** Ausschließlich in PLAYING AVPlay-Tonspuren und aktuell gewählte Spur auslesen, sichere Codec-/Kanalzahl-/Sprachdaten im DEV-Overlay anzeigen. Nur wenn mehrere Spuren existieren und die aktuelle nicht AAC-Stereo-kompatibel ist, genau einen von AVPlay gelieferten AAC-Stereo-Index mit setSelectTrack(AUDIO, index) auswählen. Abfrage-/Spurwahlfehler bleiben diagnostisch; keinerlei Backend-Codec-/Grants-/MediaSession-Änderungen. Hardware-Gate: tatsächlich hörbarer Ton bei sichtbarem Bild, STOP/BACK.
- **S6.2 – Playback-Lifecycle (SOURCE/CI PASS, REAL-TV OFFEN):** AVPlay-Vorbereitung, Play-Aufruf, Pufferung, Pufferende, Ende und Fehler werden in einer zusätzlichen Fullscreen-Zustandszeile unterschieden; Pause/Fortsetzen verbleibt im vorhandenen zentralen Remote-Owner. HTML5-MP4 (nur bewusste Probe) gilt erst nach `onplaying` als angelaufen. Ein 12-Sekunden-Start-Watchdog erkennt den schwarzen Bildschirm ohne Events, ein 20-Sekunden-Watchdog erkennt Stillstand der Pufferung. MediaError 1–4 sowie abgelehnte `play()`-Promises werden ohne URLs/Secrets verständlich diagnostiziert. Alle Timer und verspäteten Callbacks werden bei STOP, Ende oder Fehler entkräftet. STOP noch vor bestätigter Session heißt Abbruch, nicht erfolgreiche Wiedergabe; ein später Stop-Timeout überschreibt niemals den primären Playerfehler. Keine automatische AVPlay/HTML5-Umschaltung. Hardware weiterhin offen.
- **S6.3 – Sender/Live-TV (SOURCE-KANDIDAT / HARDWARE OFFEN):** Die echte VDR-`channels.conf`-Reihenfolge wird vom Server über `sort=backendId,channelNumber,channelId&order=asc` **vor** jeder 20er-Seite hergestellt; opake `ch2_`-Cursor bleiben unverändert. HTTP 400 auf älteren installierten Servern führt zu sichtbarem Fehler **ohne** stillen Rückfall. Die bereits in PR #12 erarbeitete Fokusnavigation wird in die einzige D-Pad-Steuerung integriert: Senderzeile auswählen, `Mehr Sender` auf neu geladene Seite fokussieren, leere/veraltete Elemente beim Reload entfernen; `OK` zeigt nur echte Kanalmetadaten ohne ungewollten Streamstart. Der dokumentierte separate Public-v1-`POST /live-playback-sessions` benötigt `media.live.play@backend`, passenden installierten Daemon und bestätigten nativen Medien-/Decoderpfad: bis dahin **keine** behauptete Live-TV-Wiedergabe oder Tunerbelegung. Offene ältere PRs #3/#12 nach Integration schließen statt weitere Arbeitsbranches zu eröffnen.
- **S6.4 – EPG/Aufnahme-Details (SOURCE-KANDIDAT, REAL-TV OFFEN):** Nach ausdrücklich gewähltem Sender: authentifiziertes `GET /api/v1/epg/now-next` mit `epg.view@backend` und optional `GET /api/v1/epg/window` für 24h (`limit=24`, serverseitig opaker `ew1_`-Cursor). Nach ausdrücklich gewählter Aufnahme: backendgebundenes `GET /api/v1/recordings/{recId}` und vorhandene Artwork-Referenzen über die öffentlichen `GET /artwork`-Routen. Posterbytes ausschließlich per autorisiertem XHR mit Device-Header; niemals nackte Provider-URLs oder ungeschützte `<img src=/api>`-Anfragen. Alle Antworten bounded, ursprüngliche Identität/Scopes kontrolliert, späte Callback-Ergebnisse verworfen, Poster-Object-URLs wieder freigegeben. Kein Scraper, neue Metadatenbank, Timer, fremder Backend-Zugriff oder automatisch startender Stream. Wenn E1/M1/M2 im installierten Daemon fehlen: sichtbarer 404/Fehler, kein privater API-Fallback. TV-Hardware-Abnahme bleibt offen.
- **S6.5 – Suche:** EPG-/Recording-Suche mit Grenzen, Filtern und Pagination.
- **S6.6 – Timer-Leseansichten:** Timer, Assignments, Operations und Revisionen zunächst read-only.
- **S6.7 – Continue Watching:** Device-Progress/CAS, Resume nur bei tatsächlich unterstütztem HLS-Profil, Track-/Untertitelanzeige.
- **S6.8 – sichere Timer-Tests:** ausschließlich ausdrücklich genehmigte Testobjekte und Mutationen; keine echte Aufnahme oder geplanten Timer verändern.
- **S6.9 – zentrale API-v1-Abnahme:** nur neue echte TV-/Device-Gaps (401/403, Cursor-/ETag-/409, Backend-Isolation, Neustart und Device-Erhalt), historisch akzeptierte Tests nicht wiederholen.

**S6.0 Abnahme:** Kombinierte Play/Pause-Taste sowie getrennte Play/Pause (sofern Fernbedienung vorhanden), OK, STOP und BACK am echten Samsung prüfen; mindestens ein Pause/Fortsetzen und STOP ohne sekundären Sessionfehler. Der bereits dokumentierte stumme AVPlay-Stream bleibt bis S6.1 ausdrücklich FAIL.

## Phase S7 – Verteilung/Wartung

- **S7.1 ISOLIERTER WITs-SOURCE-KANDIDAT, TV-HARDWARE OFFEN (25.10.2026):** Paketkollision im vorigen WITs-Konzept identifiziert: ein WITs-Host aus `app/` behält `VDRSuiteTV` als Package-ID. Neuer, offline erzeugter und Git-ignorierter Entwicklungsstand `.tizen-wits-dev/` mit eigenem Paket `VDRSuitDev` und WITs-App-ID `VDRSuitDev.VDRSuiteWITs`. `tv:watch` arbeitet ausschließlich dort; `tv:dev:prepare`, `tv:dev:identity`, Source-/CI-Gates verhindern versehentliche Nutzung der Produktionskennung. **DEV-Erstinstallation nur nach eigener Freigabe**, WITs Watch nie automatischer Install-Fallback. Ein unabhängiges DEV-KeyManager-Credential kann eine bewusste einmalige Kopplung benötigen; die Produktiv-App wird nicht verändert. [Detaillierter Gate](docs/wits-isolated-development.md).
- **S7.2 SOURCE-/CI-KOMPLETT, HARDWARE OFFEN (25.10.2026):** Offline-Preflight für ein **fertig signiertes Produktions-WGT** implementiert. Prüft Original-Paket/App-ID `VDRSuiteTV`/`VDRSuiteTV.VDRSuite`, höheren Paketversionsstand, gleiches Autor-Zertifikat wie ein nachweislich installiertes altes WGT, Paketquellen und vorhandene Signaturdateien; bricht sonst ab. Keinerlei TV-Zugriff oder Installation. Samsung unterscheidet datenbewahrendes Release-Update von potentiell deinstallierendem Tizen-Studio-Testbuild. **Datenbewahrender TV-Installationspfad, gültige Original-Signatur und KeyManager-Persistenz auf Tizen 5.5 weiterhin NICHT nachgewiesen.** [S7.2-Ablauf](docs/production-update-s7-2.md). Mit `--json` werden nicht-geheime Hashes/Versionen erzeugt und Hardware-/Installationsfreigabe ausdrücklich **false** gesetzt. Für neue Releases steht zusätzlich ein **explizites, zunächst nur prüfendes** Versionswerkzeug `scripts/tv-release-version.mjs --next X.Y.Z --dry-run|--apply` bereit; schreibt nur `package.json` und `app/config.xml`, niemals aufs TV. **Herstellerbefund:** Der dokumentierte Store-/Seller-Office-Release-Updatepfad ist nicht gleich Tizen Studio Testinstallation; für die lokal developer-installierte App ist ein Daten erhaltender Wechsel zum Store noch nicht nachgewiesen. Keine weitere Source-Architektur nötig, um ein bei Uninstall bereits gelöschtes KeyManager-Credential wiederzugewinnen. WITs-DEV-Watch ist weiterhin kein Produktionsupdate.
- Weiterhin: Signierung, Reproduzierbarkeit, Versionierung, Rollback, Modell-Kompatibilitätsmatrix; Store-Einreichung nur nach gesondertem Entscheid.

## Nächster konkreter Schritt – S6 (Stand 26.10.2026)

**S6.0–S6.2 wurden als Source-/CI-Slices vorbereitet.** Der Nutzer kann momentan nicht an den TV; deshalb bleiben die tatsächlichen Hardware-Gates für Fernbedienung, hörbaren AVPlay-Ton und Player-Lifecycle offen. Kein weiterer WITs-Start, kein DEV-Uninstall, kein Pairing und kein Eingriff in das installierte Backend.

**Wenn wieder TV-Zugriff besteht:** Die bereits isoliert installierte und gekoppelte DEV-App kontrolliert mit dem vorhandenen WITs-Watch-Pfad aktualisieren; Tasten, Audiozeile und Lifecycle-/Schwarzbilddiagnose gemeinsam abnehmen. Eine HTML5-MP4-Probe ist freiwillig. Der S7.2-Produktionsupdate-Nachweis bleibt davon völlig unabhängig und weiterhin offen.

**Nächster Source-Slice ohne TV:** S6.5 – EPG-/Aufnahmesuche mit Public-v1-Device-Grants und begrenzter Pagination. S6.0–S6.4 sind bisher ausdrücklich nur Quellcode/CI; gemeinsamer DEV-TV-Hardwaretest, installierte API-Versionen und geschützte Artworkbytes sind separat zu bestätigen.

**Historischer S4.1-Stand:** Echte Sender-/Aufnahmelisten und Aufnahmepaginierung wurden bereits am 25.10.2026 getestet. Ältere S4.1-Prozeduren im folgenden Abschnitt sind Referenzmaterial, keine Aufforderung zu einer Neuinstallation oder erneuter Kopplung.

**Betroffene S4.1-Dateien:** `app/src/api/recording-catalog.js`, `app/src/main.js`, `app/index.html`, `app/styles.css`, `scripts/build-tv-runtime.mjs`, `app/tv-runtime.js`, Tests, `docs/api-contracts.md` und Abnahme/Roadmap.
**Schnittstellen:** Ausschließlich öffentliche lesende `GET /api/v1` (Device-Verifikation), `GET /api/v1/backends` und `GET /api/v1/recordings` (100 pro Seite).
**Risiken:** Eine Neuinstallation via VS Code `Run Project` hat zuvor den Tizen-KeyManager-Eintrag gelöscht; bestehende Servergeräte und Grants bleiben trotzdem bestehen. Kein erneutes Pairing auf Verdacht; zunächst `Einstellungen → Anmeldung prüfen`.
**Nichtziele:** Neue Device-Identität, automatische Berechtigungsvergabe, Vollkatalog-Abruf, Recording-Aktionen/MOVE/DELETE, Ordneransicht, EPG, AVPlay und P1 Resume.
**Rollback:** Samsung-Client auf den vorigen `main`-Stand zurücksetzen; keine Server-DB-/Dateiänderung. TV-Installationen können lokale App-Daten löschen.

### Achtung: Paketinstallation kann Device-Identität löschen (Tizen 5.5)

Vor einem neuen Run Project oder Installieren den aktuellen TV-App-Stand nur beenden und neu starten, dann unter Einstellungen einmal Anmeldung prüfen wählen. Damit wird zuerst die Persistenz der bereits erfolgten Kopplung geprüft, ohne die App zu ersetzen.

Samsung dokumentiert, dass beim Installieren einer neuen App-Version die bisherige App automatisch deinstalliert wird und bei Uninstall Anwendungsdaten verloren gehen können:
https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode/connecting-to-tv-device.html
https://developer.samsung.com/smarttv/develop/faq/application-installation.html

**Korrigierter Quellpfad:** `npm.cmd run tv:watch` nutzt **ausschließlich das isolierte DEV-Paket** (`VDRSuitDev`) nach getrenntem Bootstrap, mit Fail-Closed-Preflight (kein produktives Paket-Update). Das konkrete TV-/KeyManager-Persistenz-Gate bleibt offen. `Run Project` / `Wits Start` nicht als sicheren Updatebefehl verwenden; kein Secret exportieren und keine automatische Kopplung als Workaround.

## Slice: Sichtbare Samsung-App-Version / installationssicherer Nachweis (25.10.2026)

Der Nutzer meldete einen WITs-`--watch`-Abbruch trotz erfolgreicher SDB-Verbindung. Die Ursache ist noch nicht abschließend auf dem TV nachgewiesen. Die bestehende VS-Code-Installation muss nicht mit der von WITs erwarteten initialisierten App identisch sein; `wits -i` legt nur die Konfiguration an. **Weder `wits -s` noch `Run Project` ist als Credential-sicherer Fix freigegeben.**

Frontend-Slice: Den fest verdrahteten veralteten Footer `S3.3` durch `Samsung v<Manifest-/Paketversion> · S4.1 · b<12-stellige SHA-256-Quellkennung>` ersetzen. Das Label wird beim Offline-Boot aus der gebauten Runtime direkt auf **allen Seiten** und unter **Einstellungen** angezeigt; kein Server-/Credential-Zugriff, kein Git-Zugriff auf dem Fernseher. Der Build erzeugt deterministische Fingerprints aus produktiven JS-/HTML-/CSS-/Manifest-Inhalten und verhindert veraltete Pakete über bestehende Build-Checks. **Source/CI ist nicht reale Installation**. TV-Gate: sichtbare Kennung und erhaltene KeyManager-Anmeldung nach einem ausdrücklich freigegebenen, nachweislich datenbewahrenden Update.


### S5.3 – Samsung 2020 Tizen 5.5: Medienwiedergabe-Vertragsdiagnose (Source, Hardware offen)

Der reale GU43TU6979UXZG öffnet jetzt den bildschirmfüllenden Player, aber AVPlay.prepareAsync für MP4/TS scheitert. Samsung-Dokumentation bestätigt AVPlay-WebAPI-Bibliothek, 2020er Container-/Codec-Unterstützung, HLS-Grenzen und die Streaming-Eigenschaft COOKIE. Im Public-v1-Backend wird die separate Medienroute mit Secure/HttpOnly/SameSite=Strict MediaSession-Cookie geschützt; eine automatische Übergabe zwischen Web-XHR und dem nativen AVPlay-Netzwerkstack ist nicht nachgewiesen.

Der Client bindet die Samsung WebAPI explizit ein, zeigt nur erlaubte AVPlay-ErrorCodes/Names und prüft nach einem Wiedergabefehler die geschützte Medienroute ausschließlich über einen Header-only GET/Range-Request, **vor** dem Session-Stop. Zusätzlich existiert eine bewusst vom Nutzer wählbare alternative **HTML5-MP4-Probe** für vom Server gewählte progressive MP4-MediaSessions. Kein Credentials-/Token-in-URL, keine zweite Kopplung oder Installation, keine unbelegte Browser-/AVPlay-Cookieannahme. Vollständige Quelle-/Sicherheits-/TV-Gates: [Samsung-Playback-Kompatibilität](docs/samsung-playback-compatibility.md).

**Hardware-PASS erst nach einem wirklich abspielbaren Bild/Ton, STOP/Cleanup und identischer bestehender Geräte-Kopplung.** Source-only- und CI-Abnahme genügt nicht.


### S5.4 – Generischer nativer Device-Medienzugang (QUELLKANDIDAT)

Der bereits existierende Public-v1-Device-MediaSession-Vertrag wird (im
separaten VDR-Suite-Backend) für alle nativen TV-/Kodi-Clients um eine
ausdrückliche, sessionbezogene HTTP-Cookie-Übergabe erweitert. Samsung AVPlay
setzt nur diese vorhandene MediaSession-Berechtigung über die offizielle
`COOKIE`-Streaming-Property im IDLE-Zustand. Kein neues Pairing, keine
Cookie-Auslesung via document.cookie, keine Passwörter in Medien-URLs, kein
neuer Service/DB. Bestehender Browser-/HTML5-Pfad bleibt `HttpOnly`.
Backend- und Samsung-Hardware-Abnahme offen.


## S6.5 Re-Test: echte Samsung-Hardware – blockierende Ergebnisse (26.10.2026)

**S6.5 ist nicht hardware-abgenommen.** Nach grünem Quell-/CI-Test meldet der Besitzer des Samsung GU43TU6979UXZG: weiterhin keinen Ton, Schwarzbild bei einem Teil der Aufnahmeformate, wirkungslose PLAY/PAUSE/STOP-Tasten, dauerhaft eingefrorenes Bild nach OK; BACK funktioniert. Die navigierbaren EPG-Modi Jetzt/Nächste und 24h liefern derzeit keine sichtbar nutzbaren Programminformationen (Foto angekündigt). Aufnahme-Poster erscheinen nach Nutzerbeobachtung verspätet erst bei der Wiedergabeaktion, während das Datum offenbar korrekt dargestellt wird. Die Informationsarchitektur des Layouts wurde abgelehnt; Farben und Schriftarten sind ausdrücklich nicht betroffen. **Die exakte installierte Buildkennung muss im nächsten Hardware-Gate bestätigt werden.**

**Reihenfolge auf dem bestehenden Branch `work/s6-tv-api-v1`:**

- **Blocker A – Player:** Empfangene KeyCodes von AVPlay-State und fortschreitenden Bild-/Zeit-Ereignissen getrennt prüfen; native Audio-Tracks/Codec/Kanäle und geschütztes MediaSession-Format je funktionierender bzw. schwarzer Aufnahme vergleichen. Erst danach gerichtete Korrektur mit Tests; keine riskanten Media-Cookie- oder Transcode-Abkürzungen.
- **Blocker B – EPG/Poster:** Nach Hardwarefoto Sichtbarkeit/Status/Response prüfen, Poster-Regression und asynchronen Auswahlwechsel gezielt korrigieren; echte Metadaten am TV abnehmen.
- **Blocker C – TV-Informationsarchitektur:** Das bestehende VDR-Suite-Webfrontend als Referenz für Anordnung, Hierarchie und Medienbibliothek verwenden, ohne dessen Browser-Interna/API zu kopieren und ohne komplette Neuentwicklung. TV-Fokus und D-Pad bleiben einheitlich. Bestehende Farben/Schrift nicht grundlos ersetzen.

**Merge-Gate:** PR #33 verbleibt als Draft. Weder Source-Tests noch CI allein dürfen die Hardwarefehler auf PASS setzen. Kein Merge nach `main`, keine zusätzliche Branch-Erstellung, keine automatische Neuinstallation/Pairing, produktive App `VDRSuiteTV` bleibt unangetastet. Vollständige Beobachtungen und Einzelgates: `docs/hardware-acceptance.md`.


## S6.8/S6.9 – EPG artwork and structured metadata parity (26.10.2026)

- **S6.7 RE-TEST Hardware-PASS (one real arte HD event):** „Parasiten packen aus“ displays title, subtitle, time and full description after OK; Public-v1 event-ID recovery from the scope-bound EPG window worked on the TV. Does not establish Scraper or artwork parity.
- **S6.8 SOURCE/CI PASS, HARDWARE OPEN:** EPG preferred artwork and direct 404 fallback on the paired Samsung DEV through existing backend-scoped `/api/v1/epg/preferred-artwork` / `/api/v1/epg/artwork` with Device `epg.view`, bounded MIME/bytes, Blob URLs and strict cleanup; tests/CI PASS for `ddbb6575495517203f2dcfb15f9f03e7b65001fb`. Actual picture availability/rendering on the TV unproven; do not assume every EPG event has a cached image. No backend deployment.
- **S6.9 PLANNED, NOT IMPLEMENTED:** Compare Web's existing richer `/api/epg/cache/metadata` TVScraper output with the current Public-v1 Event Detail minimal contract. Define an additive, explicit Device-authenticated read-only projection for known structured fields (e.g., genre, series/episode, people) with bounded, scope-checked responses, no Browser API reuse, no provider fetch or independent metadata database. Only after backend source/CI and installed runtime availability may the Samsung TV display these fields. Keep client responsive with sparse or unavailable metadata.
- **Other hardware blockers remain FAIL:** audible AVPlay sound, video formats/black screen, PLAY/PAUSE/STOP and freeze after OK. Do not merge Draft PR #33 to `main` based on isolated EPG-source success. Separate `VDRSuitDev` WITs-DEV only; productive `VDRSuiteTV` and independent credentials are not touched.


### S6.8 Hardware review – 26.10.2026: one real EPG image PASS

- **Observed on real Samsung DEV v0.1.1:** ZDF HD → SOKO Potsdam / „Running Dinner“, Now/Next 18:05–19:00; image decoded and displayed beside native EPG title, subtitle, long synopsis and cast text. The text includes genre/country/year but does **not** demonstrate structured TVScraper data parity. Scope S6.8 image **HARDWARE PASS for this event only**. Other channels, 404 fallback, photo lifecycle on BACK and KeyManager persistence still OPEN.
- **TV UX follow-up OPEN:** Image/text space is too tight; long synopsis/cast cut off at visible bottom. Rework focusable scroll and the arrangement of list vs detail referencing the existing Suite Web information hierarchy (not a palette/font redesign). Do not claim Samsung playback is functional because EPG poster works.
- **S6.9 remains OPEN:** Separate device-safe Public-v1 structured metadata contract and client, if needed; no Browser-only endpoint shortcut. **Priority player blockers still HARDWARE FAIL:** no audio, black video on some formats, controls and OK freeze. PR #33 Draft, no merge, no production package operation.


## S6.10/S6.11 – Samsung-Re-Test: Player-Timeline, lesbarer EPG und Metadaten-Vertrag (26.10.2026)

**S6.10 – Implementiert im bestehenden Branch, Source/CI PASS, Hardware OPEN.** Kein neuer Branch, keine Neuinstallation. Realer Samsung-Befund vor dem Slice: EPG-Bilder und Beschreibung sichtbar, aber der lange Sendungstext ist unter dem Bildschirmrand abgeschnitten; die Wiedergabe ist weiterhin ohne Ton, teils schwarz und nach OK eingefroren.

1. **Playback-Befund statt erfundenem Fix:** Auf dem einzigen AVPlay-Plattformadapter werden `oncurrentplaytime`-Millisekunden auf Sekunden/Deltas reduziert; der bereits bestehende Overlay-Owner zeigt nach Tastendrücken `getState()`, `getCurrentTime()`, beobachtetes Zeitdelta und erkannte Remote-Aktion. Callback-Werte sind begrenzt und nach Stop/Generation ungültig. AVPlay `PLAYING` oder zunehmende Zeit ist **kein** Nachweis decodierter Frames bzw. hörbaren Tons. Unbekannte Codes, HTTP-Header, Cookies, Medien-URL, Host und Native-Exceptions bleiben aus Diagnosen fern. Die STOP-/Back-Session-Cleanup-Policy bleibt unverändert.
2. **EPG-Lesbarkeit:** Im bestehenden TV-Layout bekommt die rechte Detailspalte mehr Breite, das EPG-Listenfenster nimmt bei sichtbarer Detailansicht weniger Höhe ein, und Poster/Titel/Beschreibung bleiben mit unverändertem Branding angeordnet. Die vorhandene Scrollfläche erhält die fokussierbaren `Text ▲` / `Text ▼`-Aktionen im **einzigen** D-Pad-/OK-Owner. Bei Eventwechsel wird zum Textanfang zurückgesetzt; beim Verlassen der Live-Seite verschwinden die Aktionen.
3. **TV-Parität ohne Browser-API-Leck:** UI zeigt mit `GET /api/v1/epg/event` zunächst die native Beschreibung und das über Public v1 geschützte EPG-Bild. Dass „Krimiserie, Deutschland 2026“ oder Darsteller als **Text** erscheinen, ist keine belegte strukturierte Scraper-API-Parität. Quelle von Web-Zusatzinfos ist derzeit `/api/epg/cache/metadata` (private Browser-Route); sie darf im Samsung-Device nicht aufgerufen werden.
4. **Informationsarchitektur:** Orientierung an Webfrontends klarer Reihenfolge „Sender und Programmauswahl → Sendezeit/Titel/Poster → Beschreibung“ statt rein dekorativer TV-Karten; nicht das Browser-Frontend kopieren, Farben und Schrift nicht neu erfinden. Live-Ansicht ist **erster** Layout-Slice, Aufnahmen, Suche und Timer benötigen gesonderte funktionsfähige UI-Gates.

**S6.11 – Öffentliches strukturiertes EPG-Metadaten-Gate: geplant, NICHT umgesetzt.** Zuerst auf `vdr-suite` serverseitig einen existierenden Public-v1-API-Endpunkt nachweisen oder einen **additiven read-only** Endpunkt für die bereits gespeicherten TVScraper-Infos entwerfen. Erforderlich: Device-Auth + exaktes `epg.view`/Backend-Scope, nachgewiesene native Event-ID und Zeitbindung, kein unbekannter Providerlink, keine Änderung/Mutation/Provider-Abfrage beim GET, begrenzte Objektgrößen und optionale Felder für z.B. Genre, Serie, Staffel/Folge und bekannte Mitwirkende. Einheitliche Herkunft/Cachezustände `available/partial/absent`, kein Wildcard-Fallback und keine fremden Backend-Daten. Erst nach Backend-Quelltests und tatsächlich installiertem Server darf Samsung die Felder rendern. Die laufende Samsung-DEV-App bleibt bis dahin bei vorhandenem beschreibenden EPG-Text.

**Hardware-Retestmatrix (vor Merge):** Für mindestens eine Aufnahme mit Bild und eine mit Schwarzbild je Transport `HLS/TS/MP4` nur wo real verfügbar: zuerst PLAY prüfen, 2–3 Sekunden AVPlay-Zeitänderung beobachten, PAUSE, PLAY/OK-Fortsetzen, STOP und Back, Ton hörbar ja/nein, Audio-Spur nach BLAU. Keine Medien-URL oder Gerätesecrets übertragen. Zeitdelta ohne Videoframes bleibt Fehler. Dazu EPG mit langem Text auf dem Samsung: Fokus erreicht Text-Buttons, Scroll 230 px pro OK, Zurück räumt Inhalt auf, keine Credential-Verluste. **Bestehende Player-Hardware-FAIL bleiben bestehen.**

**Rollout/Rollback:** PR #33 Draft auf `work/s6-tv-api-v1`, produktive `VDRSuiteTV` bleibt unverändert. Neue DEV-Runtime ausschließlich `VDRSuitDev.VDRSuiteWITs` über vorhandenen isolierten Watch (`npm.cmd run tv:dev:prepare`, danach laufender `tv:watch`); kein `wits --start`, keine neue Installation, keine Berechtigungsänderung. Bei Regression Watch stoppen und zu bekanntem älteren DEV-Quellstand zurückkehren; kein destruktives Git-Clean/Reset.


## S6.14 – Native AVPlay-OK-Latenz statt blindem Audiocodec-Fix

- **REAL-TV FAIL 26.10.2026:** Der Nutzer hört trotz `1 MPEG [MPEG] 2ch 48000Hz`, `Stumm nein`, `Lautstärke 12`, `PCM` unverändert **keinen Ton**. OK wird als Keycode 13 angenommen, der Player meldet `resume_requested` bei `PLAYING`, aber der sichtbare AVPlay-Takt liegt weiterhin bei 1 s / Delta 0. Pause/Fortsetzen reagiert subjektiv erst nach etwa einer Minute. Ein Filmframe und Untertitel sind sichtbar; zeitkontinuierliche Videowiedergabe bleibt nicht bewiesen.
- **SOURCE/CI PASS, HARDWARE OPEN:** Instrumentierte `Native-API ...ms`-Befehlsdauer, getrennte `Snapshot ...ms`-Dauer und eine 10-Sekunden-read-only-Nachprüfung der AVPlay-Zeit. An denselben Recording-Session-/Fernbedienungsgenerationsstand gebunden; STOP/Ansichtwechsel/neuere Tasten entwerten die Probe. Build `9c7b97f712c6ee9ec74eeb3cf892b7ae1010071c`, GitHub Actions #40373865588 PASS. Kein pauschales `setBufferingParam`, keine Neucodierung des Videostreams, keine Anmeldung/Manifest-Installation.
- **Danach priorisieren:** (a) Ist schon der synchrone API-Aufruf langsam, Samsung-Tizen-Befehlspfad fokussieren. (b) Ist er schnell, aber die AVPlay-Uhr bleibt stehen, Medienpuffer/HTTP-Streaming-/Zeitstempelpfad mit echten Metadaten prüfen. (c) MPEG-Audio ist ohne `ffprobe` nicht eindeutig MP2/MP3; ein Vergleich mit echter AAC-Stereo-Aufnahme ist ein separates Hardware-Gate. `Disconnected` im Foto erfordert eine eigene Serverstatusprüfung, beweist noch keinen Credential-Verlust. `tv.inputdevice`-Privilege im Quellmanifest ist kein Upgrade der installierten DEV-WITs-Host-Berechtigung.
- **Merge/TV-Sicherheit:** Bestehender Draft PR #33, `VDRSuitDev`-DEV-Watch statt irgendeiner Neuinstallation, produktive `VDRSuiteTV` und KeyManager-Daten unangetastet. Kein Hardware-PASS für Ton, flüssiges Video und Playerkontrollen.


## S6.15 – Erweiterte Samsung-Tasten (26.10.2026)

**Realer Samsung GU43TU6979UXZG, ursprünglicher Nutzerbefund vor S6.15:** Rot/Grün/Gelb/Blau, PLAY/PAUSE/STOP, OK, D-Pad und Return reagierten; Ziffern, TTX/MIX, PreCH, CH+/CH−, Settings, Info, Rewind und FastForward noch nicht. **Nach S6.15 ausdrücklich korrigiert:** Die neu erweiterten Tasten einschließlich INFO funktionieren laut Nutzer; **SETTINGS bleibt die Ausnahme**. Kein nachgewiesener TV-Test der S6.16-IME-Korrektur, da DEV-Dateitransfer noch nicht bestätigt ist.

**GitHub-Implementierung:** `app/src/platform/keys.js` registriert weitere Gerätetasten nur soweit vom Tizen-TV unterstützt; Fehler einer einzelnen Taste blockieren keine andere. `app/src/navigation/remote.js` kennt nun Samsungs dokumentierte Keycodes. CH+/CH− navigiert ausschließlich innerhalb der geladenen Senderliste, Ziffern fokussieren Treffer in der bereits geladenen Senderseite, Menu öffnet die VDR-Suite-Einstellungen. INFO/PreCH/Tools/Teletext werden erkannt, ohne ungesicherte Zusatzfunktionen aufzurufen. Rewind/FastForward werden im Player erkannt, aber **Seek bleibt deaktiviert**, bis AVPlay/MediaSession sicher funktioniert. Keine Änderung an API, Grants oder Datenbank.

**Hardware-Gates:** Registrierung und DOM-Empfang der neuen Tasten auf dem echten Tizen 5.5 **OPEN**. Nicht alle physisch vorhandenen Tasten müssen von Tizen an Web-Apps weitergegeben werden. Funktionen, die nur diagnostisch erkannt werden, sind nicht als fertig zu bewerten. Keine automatische oder erneute Installation, keine neuen Pairings, kein Merge nach `main`; PR #33 bleibt Draft.


## S6.16 – Samsung-IME beim Bearbeiten der Serveradresse (26.10.2026)

**Real-TV-Bug:** Im Feld Einstellungen → HTTPS-Serveradresse ließ sich die Rücklösch-Taste nicht mehr zum Löschen verwenden; Pfeiltasten führten stattdessen aus der Bildschirmtastatur heraus zur App-Navigation. Die Ursache ist der globale Capture-Keydown-Owner, der bislang nur bei `editingServerAddress && event.target === serverInput` die Tizen-IME schützte. Native IME-Keyevents müssen aber nicht am Input-Element ankommen. Bereits das Fokussieren eines Input-Felds öffnet bei Samsung TV die IME.

**Fix:** Beim Fokus auf das Serveradressfeld aktiviert die App einen eigenen Editiermodus; währenddessen werden sämtliche Keydown-Ereignisse an die Tizen-IME durchgereicht, ohne `preventDefault` oder Menü-Navigation. IME Done/Cancel (65376/65385) bzw. Return (10009) schließen zuerst den Editor und setzen den Fokus auf „Verbindung prüfen“, ohne die Ansicht zu verlassen. Browser-Eingabe/Backspace bleibt browser-eigen. Regressionstests prüfen sogar Ereignisse mit `event.target !== input`. Kein neuer Pairing- oder Installationspfad; PROD und DEV-KeyManager unverändert. Hardwareabnahme nach reinem WITs-Watch offen.


## S6.17 – HLS-TS/AAC-Stereo als ausdrücklicher Samsung-Tonvergleich (27.10.2026)

**Real-TV-Ausgangslage:** Samsung GU43TU6979UXZG meldete bei einer VDR-Aufnahme eine einzige AVPlay-Spur `MPEG`, 2ch/48 kHz; TV nicht stumm, Ausgabe PCM, dennoch kein hörbarer Ton. Die AVPlay-Zeit blieb teilweise stehen; das ist möglicherweise zusätzlich ein Stream-/Pufferproblem. `MPEG` als FOURCC trennt MPEG Layer II und III nicht. Samsung 2020 nennt MPEG (MP3) als unterstützten Codec, damit ist MP2 nicht belegt. Quellen: https://developer.samsung.com/smarttv/develop/specifications/media-specifications/2020-tv-video-specifications.html und https://developer.samsung.com/smarttv/develop/faq/multimedia.html.

**S6.17 Source/CI-Experiment:** Zweiter expliziter Aufnahme-Button `HLS-TS + AAC-Ton testen`; sendet für die bestehende autorisierte Public-v1-Recording-MediaSession **nur** `protocols:["hls"]`, `containers:["mpeg-ts"]`, `videoCodecs:["h264"]`, `audioCodecs:["aac"]`, `maxAudioChannels:2`. Der bereits implementierte typisierte MediaPresentationSelector des VDR-Suite-Servers kann eine inkompatible MPEG-Audiospur serverseitig nach AAC Stereo transkodieren, bei geeignetem Video ohne dessen Transkodierung. Die App überprüft danach `presentationProfileId==="hls-ts"` und den vorhandenen HLS-Medienpfad, verwendet weiterhin den ausdrücklich angeforderten kurzlebigen nativen Session-Cookie und stoppt die eigene Sitzung bei Vertragsabweichung. Kein automatischer Fallback, kein unsicherer Stream, keine zweite Session parallel, kein backendseitiger Codeeingriff. Das bestehende AVPlay-/HTML5-Verhalten bleibt unverändert. AVPlay-Spur `MPEG` trotz Testanforderung wird sichtbar als Widerspruch ausgegeben.

**S6.17 REAL-TV HARDWARE-PASS – 27.10.2026 (Nutzer bestätigt):** Nach dem DEV-Update ist der neue Button **`HLS-TS + AAC-Ton testen` auf dem Samsung sichtbar**, und der Nutzer meldet ausdrücklich **„ICH HABE TON!“**. Damit ist für die tatsächlich getestete Aufnahme **hörbare Audioausgabe über den separaten HLS-TS/AAC-Testweg nachgewiesen** – anders als beim zuvor stummen Standardweg. Der vorhandene Client lässt den Testweg nur bei vom Server bestätigtem `hls-ts`-Profil und HLS-Masterpfad zu; die exakte AVPlay-Audio-Spuranzeige und serverseitige Transkodierungsentscheidung wurden vom Nutzer noch nicht separat mitgeteilt. **Noch OPEN:** kontinuierlicher Video-/Zeitfortschritt, PLAY/PAUSE/Resume, STOP und Session-Cleanup am TV, weitere Aufnahmen/Quellcodecs, Persistenz der Kopplung nach Neustart sowie Entscheidung über den produktiven Standard-Wiedergabepfad. Ein einzelner erfolgreicher Tonversuch ist **kein Universal-PASS für alle Aufnahmen**. PR #33 bleibt DRAFT, PROD unangetastet.


## S6.18 – Realer Live-TV-Praxistest der öffentlichen Device-API-v1 (27.10.2026)

**Status: Source/CI PASS, SAMSUNG-HARDWARE OPEN.** Nach dem bei einer Aufnahme **hörbar erfolgreichen** S6.17-AAC-Test folgt bewusst zuerst **Live-TV über API v1**, bevor weitere Recording-Feinarbeiten priorisiert werden.

**Verbindlicher Serververtrag (vdr-suite-main, `api/device-live-tv-playback.md`, `LiveMediaSessionRequestParser`/`LiveMediaSessionController` gelesen):** `POST /api/v1/live-playback-sessions` mit `resourceKind:"live-channel"`, `backendId`, exakter realer `channelId`, typisierten `capabilities` und verifiziertem Device-Credential; zwingend `media.live.play@backendId` (getrennt von `channels.view`, `epg.view`, `media.recording.play`). Rückgabe 201 mit Session-ID, `presentationProfileId:"live-progressive-fmp4"` und ausschließlich geschütztem `/api/v1/media/sessions/{ms_id}/live/stream.mp4`. STOP über `POST /api/v1/live-playback-sessions/{ms_id}/stop`, `{operation:"stop",resourceKind:"live-channel",backendId,sessionId}`.

**Client-Slice:** Neuer Button `Live-TV testen` nach ausdrücklich per OK ausgewähltem Sender. Einziger neuer API-mutierender Request ist die vom Benutzer ausgelöste eigene Session-CREATE; kein Zappen durch bloße Fokusnavigation, keine automatische zweite Sitzung, kein `replacesSessionId`, kein Browser-Privatpfad und keine Provider-URL. HTML5-MP4 verwendet ausschließlich den vom Server gesetzten HttpOnly-Cookie; eingeschränkte Client-Capabilities: `progressive`, `fmp4/mp4`, `h264`, `aac`, zwei Audiokanäle. Bei URL-/Profilabweichung STOP der identifizierten eigenen Session, ebenso bei PLAY-Fehlern, STOP/ZURÜCK, Navigation oder regulärem Ende. Spät ankommende CREATE-Antwort nach Benutzerabbruch wird gesondert gestoppt. SameSite-/Tizen-`file://`-Cookie-Lieferung und HTML5-fMP4-Dekodierung sind **noch nicht hardwarebelegt**. Anders als Recording S6.17 enthält der veröffentlichte Device-Live-Vertrag **keinen AVPlay-Native-Cookie**: kein erfundener `nativeMediaAccess`-Feldwert und kein ungeschützter AVPlay-Fallback.

**Realer Test (OPEN):** Bei schon gekoppelter DEV-App sicherstellen, dass der Admin **`media.live.play` für das richtige Backend** vergeben hat. Nach sichtbar bestätigtem WITs-Update: Live-TV → Sender laden → einen Sender mit OK markieren → `Live-TV testen`. Beobachten: POST HTTP 201 oder 401/403/503, MediaSession-Pfad/Typ (ohne Cookie/Token zu protokollieren), tatsächliche Bildbewegung/Ton, Medien-Cookie-/Netzwerkdiagnose bei Abbruch, STOP und Receiverfreigabe. Bei 403 kein Pairing-Reset, nur gezielten Backend-Grant prüfen. Bei HTML5-/Cookie-Grenze erst den Backend-Vertrag für nativen Device-Medienzugang sauber erweitern und getrennt abnehmen; kein stilles Umgehen mit Provider-URLs. PROD und bestehende DEV-Kopplung unverändert, PR #33 DRAFT.


### S6.18 REAL-TV-FAIL – 27.10.2026: HTML5-Live-Media-GET HTTP 401

**Realer Nutzerbefund:** Beim Samsung-Live-TV-Test wird die Diagnose **`HTTP 401 · Cookie/SameSite/Proxy-Pfad prüfen`** angezeigt. Der HTML5-Pfad ist damit **kein Live-TV-PASS**, auch wenn die lokale S6.18-CI/202 Tests bestanden hat. Der auf S6.17-Aufnahmen bewährte Weg ist **AVPlay + opt-in `nativeMediaAccess:true` + Session-Cookie + HLS-TS/AAC**. Der Live-Device-Vertrag dokumentiert momentan nur `Set-Cookie` (HttpOnly) und `live-progressive-fmp4`; anders als bei Recording fehlt eine native Cookie-Projektion. **Mit HTTP 401 ist zunächst der geschützte Medienabruf abgewiesen, nicht das Video-/Ton-Decoding.** Weder kaputtes SameSite noch falscher nginx-Pfad noch ein fehlendes Device-Grant sind damit einzeln bewiesen.

**Nächste tatsächliche Entwicklung statt erneuter HTML5-Tests:** Im separaten Backend-Repo `vdr-suite` den Public-v1-Live-Device-CREATE vertraglich um **ausdrücklich angeforderten nativen Session-Medienzugang** erweitern (bestehende Live-Actor-/Grant-/Owner-Gates unverändert, nur kurzlebigen gleichen Session-Bearer projizieren; wie bei Recording, keine URL-Token oder Provider-URL). Live-Medienprofil/Tizen-Kompatibilität separat prüfen, bei Bedarf AVPlay-taugliches HLS-TS/AAC für Live implementieren. Dann Samsung-Client auf vorhandenen AVPlay-Adapter mit dem zurückgegebenen kurzlebigen Session-Cookie umstellen, STOP/Tunerfreigabe erhalten und am echten TV Bild/Ton testen. **Backend wurde hier nicht geändert, daher weiterhin OPEN.** Keine neue Kopplung, PROD/DEV-Installation unangetastet.


## S6.19 – Native VDR-Timer auf Samsung lesen (27.10.2026)

**Source-Kandidat, lokaler/CI-Lauf und Real-TV-Abnahme separat:** Nach dem S6.18-HTML5-Live-401 wird Live-Playback zugunsten des bereits geplanten Timer-Lesebereichs zurückgestellt. **Kein Eingriff in das Backend-Repository `vdr-suite`.** Die Native-Live-Medienauthentifizierung bleibt als gesonderte Backendarbeit im S6.18-Abschnitt dokumentiert.

**Öffentlicher, geprüfter Quellvertrag:** `GET /api/v1/native-timers?backendId=default&offset=0&limit=30`, gebunden an verifiziertes Device und exaktes `timers.view@backendId`. Die Serverantwort liefert echte native VDR-Timer `{backendId,items:[{timerId,channelId,channelName,title,day,weekdays,startTime,endTime,enabled,recording,pending}],page:{limit,offset,hasMore,nextOffset},meta:{partial:false}}`. `startTime/endTime` sind native **HHMM-Strings**, keine UTC-Epochen. `GET /api/v1/timer-assignments` wäre eine andere, unvollständige Sicht nur auf Suite-eigene Timer; nicht als Ersatz verwenden. Keine Browser-Routen `/api/vdr/timers`.

**Implementiert:** Echter Tab `Timer` mit `Timer laden`, `Weitere Timer`, `Backend wechseln` und D-Pad-fokussierbaren Timern. Authentifiziert einmal via bestehende Device-Kopplung, liest die Public-v1-Backends und dann je genau einen Backend-Snapshot (30 Timer je Seite, max. 300 in der aktuellen Anzeige), prüft Backend, Offset, Seitengrenzen und Antwortformat. Ein OK auf einen Timer zeigt Titel, Datum bzw. Wiederholungsselektor, Uhrzeiten, Kanal sowie `AKTIV/DEAKTIVIERT/ANSTEHEND/AUFNAHME LÄUFT`, **ohne Mutation**. Navigationswechsel verwirft abhängige Antworten; bei 401/403/503/Malformed werden alte Zeilen entfernt, nicht als leerer erfolgreicher Snapshot dargestellt. Kein Timer-POST/DELETE/PATCH, keine EPG-Timer-Anlage, keine Änderungen an echten VDR-Timern oder Grants.

**Hardware-Gate OPEN:** Nach branchrichtigem, dokumentiertem Git-Update sowie tatsächlich bestätigtem WITs-Datei-Push den neuen Button `Timer laden` prüfen. `timers.view` exakt für das gekoppelte Gerät und Backend vergeben (falls noch nicht vorhanden). Echte Timer-Titel, Kanal, HHMM-Zeit, Aktiv-/Aufnahmezustand, Pagination, 403-Entzug und Rücknavigation einzeln testen. Existierende Timer nur **lesen**; ohne explizite separate Nutzerfreigabe kein Write-Slice. PR #33 bleibt DRAFT, PROD und DEV-Kopplung unangetastet.


## S6.20 – Gespeicherte epgsearch-Suchtimer und EPG-Treffervorschau (27.10.2026)

**SOURCE/CI PASS (218/218), Samsung-Hardware OPEN.** Aufbauend auf S6.19 (echte native VDR-Timer) hat die Samsung-DEV-App im **Timer-Tab** einen separaten Abschnitt **„Suchtimer (epgsearch)“**. Hier werden gespeicherte *VDR-SearchTimer*-Regeln dargestellt – **nicht** native Aufnahme-Timer, nicht Suite-TimerAssignments und nicht ein generisches Recording-Suchformular. Die spätere allgemeine „Suche“ ist davon unabhängig.

**Verifizierter Public-v1-Vertrag (`vdr-suite` `main`, `api/search-timers.md` und `api/rest/src/PublicApiRuntime.cpp`):**
- `GET /api/v1/search-timers?backend=<backendId>&limit=30[&cursor=<st1_...>]` mit eigenem `searchtimers.view@backend`-Grant, Keyset-Cursor und servereigener `st_<32hex>`-Identität. Liefert `name`, `query`, `state` (`active`/`inactive`/`unknown`) und bis 30 Elemente pro Seite. **Bei Providerfehler 503, nicht `[]`.**
- `GET /api/v1/search-timers/{searchTimerId}?backend=<backendId>` für die aktuellen Metadaten (nur `searchtimers.view`).
- `GET /api/v1/search-timers/{searchTimerId}/preview?backend=<backendId>&limit=30` für bis 30 echte EPG-Texttreffer inklusive `totalCount`; benötigt **zusätzlich `epg.view@backend`** und einen bereiten EPG-Cache. Treffer sind **keine vollständige epgsearch-Aufnahmeprognose** (Blacklist, Duplicate Policy und Recording-Optionen werden nicht vollständig bewertet).

**Implementiert:** „Suchtimer laden“, „Weitere Suchtimer“, „Backend wechseln“ und „EPG-Treffer anzeigen“; ein D-Pad/OK-Fokus pro Suchtimer, Name/Abfrage/Aktivstatus, separater Detail-GET, separate EPG-Vorschau mit Titel, Sendezeit, Senderreferenz und Gesamtzahl. Bestehende Device-Identität bleibt erhalten. Sämtliche neuen Suchtimer-Anfragen sind **GET und lesen nur einen ausdrücklich ausgewählten Backend-Scope**. Explizite Auswahl/Preview statt Hintergrundabfrage oder unbeabsichtigter Aktivierung; ungültige/abgelaufene IDs, fremde Backends, abgewiesene Grants und ungültige Seiten/Antworten werden als Fehler dargestellt. Beim Verlassen des Timer-Tabs werden laufende Anfragen abgebrochen und alte Ergebnisse verworfen. Tests und CI für die Quelldateien und das gebaute Tizen-5.5-Classic-Bundle sind erfolgreich.

**REAL-TV Hardware noch offen:** Erfolgreichen S6.20-WITs-Datei-Push **am Samsung** beweisen, neuen Abschnitt und Fokus prüfen; `searchtimers.view` am gewünschten Backend freigeben, reale gespeicherte epgsearch-Regeln mit VDR vergleichen. Für „EPG-Treffer anzeigen“ zusätzlich `epg.view`; bei 403 keinen Pairing-Reset und keine künstlich leere Vorschau. Bei 503 Backend-/EPG-Cache-Stand prüfen. Den nativen Timer-Tab von S6.19 separat weiter testen. PROD-App, Git-Branch und bestehende DEV-Kopplung schützen; PR #33 bleibt DRAFT.

**Nächste zusammenhängende Suchtimer-Slices (noch OPEN):** S6.21 neue Regel auf dem TV eingeben und per `GET /api/v1/search-timers/draft-preview` zunächst echte EPG-Texttreffer vorschauen; danach bewusster, eigenständig bestätigter `searchtimers.create`-Vorgang zunächst **inaktiv**, mit Operationstatus statt voreiligem „angelegt“. S6.22 native epgsearch-CAS für Aktivieren/Deaktivieren, geschützte Änderungen und Löschen nach gesonderter Hardwareabnahme des Backendvertrags; kein Browser-API-Fallback und keine Mutation an bestehenden Timern durch Offline-Tests.


## S6.23 – Allgemeine Suche wie im Webfrontend: EPG + Aufnahmen (27.10.2026)

**Samsung-SOURCE/CI und realer TV-Hardwarestand getrennt führen.** Das eigenständige `Suche`-Menü wird von der früheren Designvorschau auf eine echte **gemeinsame Suche in Aufnahmen und EPG** umgestellt, angelehnt an `vdr-suite` `web/frontend/modules/global-search.js`. Es gibt eine TV-IME-Sucheingabe mit expliziter Suchen-Aktion, Backendwahl, zwei Ergebnisgruppen mit unabhängigem Ladestatus/Trefferzähler, je bis 30 Ergebnisse pro Seite und getrennten `Mehr Aufnahmen` / `Mehr EPG-Treffer`-Aktionen. D-Pad/OK zeigt über die bereits vorhandenen Public-v1-Metadatenrouten Aufnahme- bzw. Sendungsdetails an, ohne automatisch Aufnahme/Playback/Timer auszulösen. BACK/Navigation und neue Suchbegriffe verwerfen ausstehende Antworten. Die Samsung-Tizen-5.5-Tastatur besitzt ihre Tasten während der Texteingabe (S6.16 IME-Konzept).

**Web-Architekturparität statt eigener TV-Suchengine:** `vdr-suite` `api/public-v1-generic-search.md`, `docs/development/public-v1-search-parity.md`, `api/rest/src/PublicApiRuntime.cpp` und Web `web/frontend/modules/global-search.js` gelesen. Die beiden **bereits bereitgestellten öffentlichen** Endpunkte `GET /api/v1/search/recordings?backendId=...&query=...&limit=30&offset=...` und `GET /api/v1/search/epg?backendId=...&query=...&limit=30&offset=...` benutzen dieselbe serverseitige `GlobalSearchService`/SQLite-Suche wie das Webfrontend; **keine Vollkatalog-Downloads oder lokale Stringfilter**. Unterschiedliche Device-Grants: `recordings.view` bzw. `epg.view`, jeweils exakt backendgebunden. Server-Index ist mindestens 2 und höchstens 240 UTF-8-Bytes Suchtext, Offset bis 1000000, 30 Treffer je Request. Die 6h-zurück/14-Tage-EPG-Suchspanne ist die des Webindex, keine eigene Samsung-EPG-Crawl-Funktion. Öffentliche Treffer enthalten nur zulässige Projektionen (`rec_` IDs für Aufnahmen, kanalgebundene Event-IDs für EPG) statt privater VDR-Dateipfade/Provider-URLs. Fehlende Rechte und 503 werden getrennt pro Kategorie angezeigt, nicht als Erfolg mit 0 Treffern.

**Grenzen gegenüber dem heutigen Webfrontend:** Web kann zusätzlich Personen-Treffergründe, Bilder und umfangreiche Karten zeigen; die bestehende Public-v1-Device-Projektion liefert diese Informationen nicht. Deshalb sind weder Personen-Suchgruppen noch ungeprüfte Provider-Bild-URLs oder Match-Reasons erfunden. Gemeinsame Suchbegriffe/Titel-/Untertitelmatch und gruppierte Treffer sind der Paritätsumfang dieses Slice. Es gibt keinen lokalen Eingriff in `vdr-suite` oder Browser-API-Umgehung.

**Hardware-Gate OPEN:** Auf dem gepaarten Samsung ist der neue Suchbildschirm erst nach dokumentiertem Build + `tv:dev:prepare` **und echtem WITs-Datei-Push/TV-Reload** nachgewiesen. Mit `Hobbit` und `hobbit` Aufnahmen und EPG getrennt testen; kontrolliere Trefferzahlen, Sendezeiten, OK-Details, unabhängige Paginierung, Backendwechsel, Rücksprung, 403 bei jeweils fehlendem Grant, 503 bei nicht bereitem Index und TV-IME. Keinerlei neue Device-Paarung, keine schreibenden API-Aufrufe, PROD unangetastet. PR #33 DRAFT.


## Phase S8 – Samsung Media Home (27.10.2026)

### S8.1 – Reale Home-Inhalte und Metadaten

Status: Source-Integration in PR #33 (DRAFT), CI und echte Samsung-Hardware separat. Das Web-Media-Home aus VDR-Suite / ADR-0058 dient als Referenz, nicht als Codebasis.

- Hauptnavigation bleibt Home, Live-TV, Aufnahmen, Suche, Timer und Einstellungen. Kleine Verbindungsanzeige beim Logo, keine doppelte Home-Navigation und keine große Verbindungskachel.
- Hero, Weitersehen, Aus deiner Mediathek, Jetzt im TV (bis zu drei erste TV-Sender) sowie kompakter Aufnahmeplaner konsumieren bestehende öffentliche Device-API-v1-Lesedomänen. Beim sichtbaren Home-Eintritt und Rückkehr wird automatisch neu geladen; beim Verlassen, Verstecken und Reload werden alte Requests abgebrochen.
- Weitersehen benutzt allein serverseitige Positionen und Dauer; bei unbekannter Dauer keinen Prozentbalken erfinden. Aufnahmetitel, Overview, Genre, Staffel/Episode und Laufzeit werden nur aus echten Detailantworten übernommen. Binäre Poster/Fanart und bevorzugtes EPG-Artwork nutzen die autorisierten öffentlichen GETs, niemals fremde Bild-URLs. Ohne Bild bleibt das dunkelblaue Fallback.
- Die erste Aufnahmeseite wird nach Recording-ID sortiert. Deshalb heißt die Reihe bewusst Aus deiner Mediathek, nicht Zuletzt aufgenommen. TV-Events müssen gegenwärtig laufen, native Timer müssen real existieren.
- Alle Bereichsdaten gehören zu einem geprüften Device und einem Backend pro Home-Ladezyklus. Berechtigungsfehler bleiben unabhängig. Ein D-Pad-Owner; OK wählt Inhalte bzw. öffnet vorhandene Fachansichten, kein Hintergrund-Autoplay oder Home-MediaSession.
- Relevante Quellen: app/src/main.js, app/src/api/home-continue.js, app/styles.css, app/index.html, scripts/build-tv-runtime.mjs, app/tv-runtime.js. Tests in tests/tv-runtime.test.js.
- Grenzen/Risiken: begrenzte erste Sender- und Aufnahme-Seite, mehrere authentifizierte Artwork-Leseaufrufe, Bilder- und Fokusabnahme auf Chromium M69; kein neuer Server-API-Vertrag, kein eigenes Metadaten-Repository.

Hardware OPEN: Angekoppeltes DEV-Gerät GU43TU6979UXZG muss tatsächlichen WITs-Datei-Push, neue S8.1-Buildkennung, reale Inhalte/Bilder, 403-Isolation, D-Pad/OK/BACK sowie KeyManager-Persistenz bestätigen. Grün in CI oder Staging allein ist kein Hardware-PASS. PR #33 bleibt Draft, main unangetastet.

S8.2 (breiteres Browse/Backendwahl) und S8.3 (explizite Home-Medienaktionen) bleiben zukünftige, noch nicht begonnene Slices.


## S8.1 Samsung-Feldtest und S8.2 UX-/EPG-Timer-Nachbesserung (27.10.2026)

**S8.1 TV-Übertragung BELEGT:** Foto vom gekoppelten Samsung GU43TU6979UXZG zeigt neue S8.1-Oberfläche und Buildkennung, echte Aufnahmen (u. a. T2 Trainspotting 2017) samt Artwork sowie aktuelle echte EPG-Sendungen. Dies ist ein echter WITs-/Home-Sicht-PASS, kein kompletter Samsung-Bedienungs-PASS.

**Nutzerkritik (Hardware OPEN):** Die 97px-Mediathek-Karten wirken gegenüber dem Referenzmockup mager; in der Aufnahmensuche ist die Trefferzahl sichtbar, aber keine nutzbare Ergebnisliste; EPG hat keinen Aufnahmetimer-Knopf. Der bestehende HTML5-Live-Test scheitert mit HTTP 401.

**S8.2 Source-Slice im bisherigen Draft-PR #33:**
- Home zeigt größere artworkfähige Medienkarten statt schmaler Textkacheln; leere Listen beanspruchen keinen großen Platz.
- Globale Suche macht die Ergebnisse durch kompakteres Layout oberhalb der TV-Faltkante sichtbar. Nach ersten echten Aufnahmetreffern springt der Fokus vom Suchknopf zur ersten Aufnahme. Meldet der Index Treffer, aber keine Items, wird dies als Serverantwort-Widerspruch angezeigt.
- Live-EPG und EPG-Suchergebnisse erhalten je einen D-Pad-fähigen Aufnahmeknopf. Ein aktueller Event-GET mit starkem ETag liest die echte Sendung frisch; die erste Aktion zeigt eine ausdrückliche Bestätigung, die zweite sendet genau einen autorisierten POST /api/v1/epg/timer-intents. Ein HTTP 202 ist **kein Erfolg der nativen Aufnahme**: separate bewusst ausgelöste Operation-Abfrage, keine automatische Wiederholung bei unklaren Fehlern.
- Kein neues Pairing, kein Prod-Deployment, kein Main-Merge, keine native Timer-Direktaktion. Real-TV-Bedienung, Timer-/Agent-Rückmeldung und berechtigte Backend-Installation bleiben jeweils separat abzunehmen.

**Live-TV-Blocker bleibt offen:** Der aktuelle öffentliche Device-Live-Vertrag liefert ausschließlich progressive fMP4 unter browsergebundenem Secure/HttpOnly/SameSite-Media-Cookie. Der reale Samsung-HTML5-Test endet mit HTTP 401. Ein reparierter AVPlay-Pfad erfordert zunächst vom VDR-Suite-Backend ausdrücklich vertraglich freigegebenen Device-Native-Medienzugang; danach Samsung AVPlay-Integration mit eigener Session/STOP. Weder ungeschützte URLs noch Cookie-Auslesetricks sind Ersatz dafür.


## S8.3 – erster direkter Live-TV-Pfad mit VDR Streamdev und Samsung AVPlay (27.10.2026)

**Status: DEV-Quellimplementation; Hardware-/Bild-/Ton-Abnahme OFFEN.** Der Besitzer priorisiert funktionierendes Live-TV und hat die direkte Streamdev-Wiedergabe ausdrücklich beauftragt. Der bestehende geschützte API-v1-/HTML5-Test bleibt als isolierter Legacy-Test unberührt; für neue echte Live-TV-Versuche ist der separate Knopf „Live-TV direkt starten“ vorgesehen.

- VDR-Suite Device API v1 liefert weiterhin die echte Backend-/Senderliste mit bereits belegter VDR-Kanal-ID. Der Samsung-Client bietet einmalige, explizite lokale Streamdev-Serveradresse (Beispiel HTTP auf Port 3000) und übergibt ausschliesslich den gewählten VDR-Kanal als /TS/{channelId} an den nativen AVPlay-Adapter; kein Autoplay und keine private API-Sitzung.
- Streamdev liefert rohen MPEG-Transportstream **ohne eingebranntes VDR-OSD**. Kein Transcoding, keine neuen VDR-Suite-Backend-Änderungen, keine Credentials/Cookies/MediaSession-Signierung für den Videopfad. Netzwerkport im lokalen Heimnetz betreiben, nicht öffentlich weiterleiten. Streamdev-Zugriff und echte Kanal-ID gehören zum tatsächlich angesprochenen VDR.
- AVPlay bereitet asynchron vor; STOP/BACK/navigieren stoppt und schließt den Stream. Verspätete prepare/stream/error-Callbacks sind generation-gefenced; EOF wird sichtbar als Fehlerzustand gemeldet, keine Endlosschleife/automatische Neuverbindung. Kein Live-Pause/Timeshift im ersten Slice.
- Die native Videoebene erhält transparenten Browserhintergrund. Ein D-Pad-Owner bleibt bestehen; Samsung-IME darf beim Tippen der LAN-Adresse Eingaben übernehmen. Lokal gespeicherter Serverhost ist keine Device-Credential.
- Die Live-TV-Aktion ist absichtlich nur **DEV und opt-in** und ändert weder Produktion noch bestehende VDR-Suite-Backend-Route/Autorisierung. Kein Merge in main ohne echten Decoder-/Ton-/STOP-Test auf GU43TU6979UXZG. Das geplante Public-v1-Native-Live-Media-Profil kann später als Alternative geprüft werden.

**Realtest-Gate:** Streamdev-Plugin und Port 3000 auf dem tatsächlichen VDR prüfen, vom TV erreichbar, mindestens einen freien/unverschlüsselten Sender in TV-Liste auswählen, „Live-TV direkt starten“, echtes Bild und Ton, mindestens 2–3 Minuten unterbrechungsfrei, STOP und Start eines zweiten Senders prüfen. Sonst Fehler inkl. AVPlay-Stufe dokumentieren, nicht CI als Hardware-PASS umdeuten. Keine TV-Installation/Pairing-Mutation per Quelländerung.
