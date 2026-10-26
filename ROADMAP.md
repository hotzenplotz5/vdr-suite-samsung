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

**Realer Samsung GU43TU6979UXZG, Nutzerbefund:** Rot/Grün/Gelb/Blau, PLAY/PAUSE/STOP, OK, D-Pad und Return reagieren am Gerät. Ziffern, TTX/MIX, PreCH, CH+/CH−, Settings, Info, Rewind und FastForward sind noch nicht nutzbar.

**GitHub-Implementierung:** `app/src/platform/keys.js` registriert weitere Gerätetasten nur soweit vom Tizen-TV unterstützt; Fehler einer einzelnen Taste blockieren keine andere. `app/src/navigation/remote.js` kennt nun Samsungs dokumentierte Keycodes. CH+/CH− navigiert ausschließlich innerhalb der geladenen Senderliste, Ziffern fokussieren Treffer in der bereits geladenen Senderseite, Menu öffnet die VDR-Suite-Einstellungen. INFO/PreCH/Tools/Teletext werden erkannt, ohne ungesicherte Zusatzfunktionen aufzurufen. Rewind/FastForward werden im Player erkannt, aber **Seek bleibt deaktiviert**, bis AVPlay/MediaSession sicher funktioniert. Keine Änderung an API, Grants oder Datenbank.

**Hardware-Gates:** Registrierung und DOM-Empfang der neuen Tasten auf dem echten Tizen 5.5 **OPEN**. Nicht alle physisch vorhandenen Tasten müssen von Tizen an Web-Apps weitergegeben werden. Funktionen, die nur diagnostisch erkannt werden, sind nicht als fertig zu bewerten. Keine automatische oder erneute Installation, keine neuen Pairings, kein Merge nach `main`; PR #33 bleibt Draft.
