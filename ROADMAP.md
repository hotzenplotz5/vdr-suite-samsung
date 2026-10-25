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
- **S3.3 IMPLEMENTIERT, HARDWARE-GATE OFFEN (2026-10-25):** Persistierte KeyManager-Identität wird auf ausdrückliche TV-Aktion frisch gelesen und mit GET /api/v1 authentifiziert. Danach begrenzte Public-v1-Reads GET /api/v1/backends (erste 30 Backends, Backendwechsel) und GET /api/v1/channels (20 Sender/Seite, Cursor). Sendernamen, Nummern und Metadaten werden ohne HTML-Injektion als echte Daten angezeigt. 401/403/409/503 sowie TLS-, Timeout- und Vertragsfehler erscheinen ohne automatische Berechtigungsvergabe oder erneutes Pairing. Device-Grants/Revocation-UI, EPG, Live-Playback und MediaSessions bleiben offen.

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

**S3.3 Hardware-Gate:** Aktualisiertes signiertes Samsung-Paket installieren, mit OK zu Live-TV wechseln und dort einmal Sender laden drücken. Keine erneute Kopplung durchführen. Anzeige realer Sender und Berechtigungsfehler auf dem echten Tizen 5.5 separat protokollieren. Das per GitHub bestätigte Pairing ist noch kein Nachweis der KeyManager-Persistenz über App-Relaunch.

**Slice-Dateien:** app/src/api/channel-catalog.js, app/src/main.js, app/index.html, app/styles.css, scripts/build-tv-runtime.mjs, app/tv-runtime.js, Tests und Dokumentation.
**Schnittstellen:** ausschliesslich lesende öffentliche GET /api/v1, GET /api/v1/backends und GET /api/v1/channels.
**Risiken:** TV-KeyManager nach Test-Update eventuell gelöscht; Server-Deployment-Stand unbekannt; 30-Backend-Vorschauseite begrenzt.
**Nichtziele:** automatische Pairing-Wiederholung, Admin-Grants, Aufnahmen, EPG, Wiedergabe, AVPlay.
**Rollback:** Samsung-Client auf vorherigen main-Stand zurücksetzen; keine Serveränderung. Tizen-Test-Installationen können lokale App-Daten löschen.
