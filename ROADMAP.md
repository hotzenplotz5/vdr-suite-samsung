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

## Phase S4 – Aufnahmen/Library

- **S4.1 QUELLCODE IMPLEMENTIERT, TV-HARDWARE-GATE OFFEN (2026-10-25):** Samsung Aufnahmen-Ansicht liest nach bewusster OK-Aktion über die vorhandene Device-Anmeldung `GET /api/v1/backends` und `GET /api/v1/recordings?backendId=...&limit=100&sort=recordingId&order=asc`. Maximal **100 Datensätze pro Serveranfrage, keine Begrenzung der gesamten Aufnahmemediathek**: über echte `rc1_`-Keyset-Cursor sind weitere Seiten erreichbar; aktuelle Seite ersetzt ältere DOM-Zeilen. D-Pad-fokussierbare Aufnahmezeilen, Vorherige Seite, Weitere Aufnahmen und Backendwechsel, sichere Textdarstellung, keine Browser-private Route. Unberechtigter Zugriff (fehlendes `recordings.view@backend`) zeigt explizit Fehler. Kein automatischer Abruf beim Fokus, keine MediaSession/Wiedergabe, kein lokales Speichern von Geheimnissen. Quelltests/CI und echter Samsung-TV-S4.1-Test getrennt dokumentieren.
- **S4.2 QUELLCODE-KANDIDAT (TV-GATE OFFEN):** VDR-Aufnahmeverzeichnisse als Standardansicht über die bereits vorhandene öffentliche API `GET /api/v1/recordings?view=folders&limit=100&offset=...&folderId=...` mit opaken `fld1_`-IDs; D-Pad/OK zum Öffnen echter Unterordner, „Ordner hoch“/BACK und Seitenwechsel ohne fiktive Genre- oder Dateisystempfade. „Alle Aufnahmen“ erhält bewusst den bereits hardwarebestätigten flachen `rc1_`-100er-Katalog. Keine neue Server-DB oder Importlogik, keine Genre-Verzeichnisse.
- **S4.3 AUFGESCHOBEN (Benutzerentscheidung 25.10.2026):** Genre-Verzeichnisse/Genre-Facetten später; bis dahin ausschließlich die reale VDR-Ordnerhierarchie. Artwork/Details erst über bestehende freigegebene API-Verträge.

**Gate:** echte Ordner auf großem Katalog mit begrenzter DOM-Größe und unverfälschten Recording-IDs.

## Phase S5 – Samsung-Wiedergabe

- **S5.1 QUELLCODE-KANDIDAT (REAL-TV BILD/TON OFFEN):** Samsung-AVPlay-Adapter mit `open → prepareAsync → play`, sichtbarem Fehlschlag, STOP/BACK-Teardown und PLAY/PAUSE; genau ein Playback-Owner. Gerät muss echtes H.264/AAC-Decoderprofil melden, kein blind angenommenes All-Codec-Format.
- **S5.2 ERSTER INTEGRATIONSVERSUCH VORBEREITET (SERVER-/TV-GATE OFFEN):** Nur nach Nutzeraktion „Wiedergabe testen“ Device-POST `/api/v1/recording-playback-sessions` mit `media.recording.play@backend`, gültiger `rec_`-ID und verifizierter `ms_`-/same-origin-`mediaPath`; anschließend Samsung AVPlay. STOP/BACK fordert Device-Session-Teardown an. **HttpOnly-Mediencookie im separaten AVPlay-Netzwerkstack, HTTPS/CORS, Container/Codec, Bild/Ton müssen auf dem echten TV getestet werden.** Bei Abweisung kein ungeschützter Direktlink und keine automatische Neu-Kopplung.
- **S5.3** Audio/Untertitel, Seek/Resume, Session-Cleanup, Abbruch/Widerruf.

**Gate:** Bild und Ton, Fehlerpfade und STOP/BACK am realen Gerät; keine URL-/Cookie-/Codec-Annahmen ohne Hardware-Nachweis. Priorität Pass-through -> Remux -> Transcode nur nach serverseitiger Policy.

## Phase S6 – VDR-TV-Funktionen

- **S6.1** Channels/Live-TV, inklusive Hardware-Player-Prüfung.
- **S6.2** EPG und Timer per öffentlichen Verträgen.
- **S6.3** Suche, Teletext, HbbTV, Legacy-OSD nur nach eigenständiger Machbarkeits- und API-Prüfung.

## Phase S7 – Verteilung/Wartung

- **S7.1 ISOLIERTER WITs-SOURCE-KANDIDAT, TV-HARDWARE OFFEN (25.10.2026):** Paketkollision im vorigen WITs-Konzept identifiziert: ein WITs-Host aus `app/` behält `VDRSuiteTV` als Package-ID. Neuer, offline erzeugter und Git-ignorierter Entwicklungsstand `.tizen-wits-dev/` mit eigenem Paket `VDRSuitDev` und WITs-App-ID `VDRSuitDev.VDRSuiteWITs`. `tv:watch` arbeitet ausschließlich dort; `tv:dev:prepare`, `tv:dev:identity`, Source-/CI-Gates verhindern versehentliche Nutzung der Produktionskennung. **DEV-Erstinstallation nur nach eigener Freigabe**, WITs Watch nie automatischer Install-Fallback. Ein unabhängiges DEV-KeyManager-Credential kann eine bewusste einmalige Kopplung benötigen; die Produktiv-App wird nicht verändert. [Detaillierter Gate](docs/wits-isolated-development.md).
- **S7.2 SOURCE-/CI-KOMPLETT, HARDWARE OFFEN (25.10.2026):** Offline-Preflight für ein **fertig signiertes Produktions-WGT** implementiert. Prüft Original-Paket/App-ID `VDRSuiteTV`/`VDRSuiteTV.VDRSuite`, höheren Paketversionsstand, gleiches Autor-Zertifikat wie ein nachweislich installiertes altes WGT, Paketquellen und vorhandene Signaturdateien; bricht sonst ab. Keinerlei TV-Zugriff oder Installation. Samsung unterscheidet datenbewahrendes Release-Update von potentiell deinstallierendem Tizen-Studio-Testbuild. **Datenbewahrender TV-Installationspfad, gültige Original-Signatur und KeyManager-Persistenz auf Tizen 5.5 weiterhin NICHT nachgewiesen.** [S7.2-Ablauf](docs/production-update-s7-2.md). Mit `--json` werden nicht-geheime Hashes/Versionen erzeugt und Hardware-/Installationsfreigabe ausdrücklich **false** gesetzt. Für neue Releases steht zusätzlich ein **explizites, zunächst nur prüfendes** Versionswerkzeug `scripts/tv-release-version.mjs --next X.Y.Z --dry-run|--apply` bereit; schreibt nur `package.json` und `app/config.xml`, niemals aufs TV. **Herstellerbefund:** Der dokumentierte Store-/Seller-Office-Release-Updatepfad ist nicht gleich Tizen Studio Testinstallation; für die lokal developer-installierte App ist ein Daten erhaltender Wechsel zum Store noch nicht nachgewiesen. Keine weitere Source-Architektur nötig, um ein bei Uninstall bereits gelöschtes KeyManager-Credential wiederzugewinnen. WITs-DEV-Watch ist weiterhin kein Produktionsupdate.
- Weiterhin: Signierung, Reproduzierbarkeit, Versionierung, Rollback, Modell-Kompatibilitätsmatrix; Store-Einreichung nur nach gesondertem Entscheid.

## Nächster konkreter Schritt

**Jetzt S7.2 fertig prüfen, nicht wieder WITs-Initialisierung anfordern.** Nach Umsetzung der S7.2-Offline-Prüfung ist der nächste reale Gate eine **nachweislich datenbewahrende Produktions-Update-Methode** samt bisherigem Original-Autor-Zertifikat und archiviertem, bereits installiertem Basis-WGT. Kein `Run Project`, `wits --start`, blindes `sdb install`, Neu-Pairing oder TV-Install ohne gesonderte Freigabe. Produktion bleibt unangetastet; S7.1 DEV bleibt optional.

**S4.1 Hardware-Gate (noch offen):** Aktuellen Samsung-S4.1-Client auf der realen Tizen-5.5-Hardware testen: bei bereits gespeichertem Device-Credential in die Aufnahmen wechseln und ausdrücklich **„Aufnahmen laden“** wählen. **Wichtig:** Zusätzlich zu `channels.view` muss der Administrator `recordings.view@default` für die **aktuelle** Geräteidentität freigeben. Die Senderberechtigung verleiht keinen Aufnahmezugriff. Nach erfolgreichem Laden echte Aufnahmezeilen, D-Pad-Fokus, nächste/vorherige Seite, Backendwahl und fehlende Grants prüfen. Server ist unverändert; keine automatische neue Pairing- oder Device-Grants-Operation.

**Priorität danach:** S4.2 – VDR-Ordnerstruktur und Navigation über `view=folders`. Dann S5 AVPlay-/MediaSession-Wiedergabe und S5.3 P1 Resume/Continue Watching. Die gewünschte `channels.conf`-Senderreihenfolge bleibt als **separater Server-API-v1-Numeric-Sort-Vertrag** offen und darf nicht per lokaler 20er-Page-Sortierung kaschiert werden.

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

