# VDR-Suite Samsung

Eigenständiger Samsung-Smart-TV-Client für **VDR-Suite**. Zielplattform: Samsung Tizen TV; erstes Testgerät: **Samsung GU43TU6979U (2020 / Tizen-Generation 5.5)**.

> **Stand 27.10.2026 – erster Audio-Hardware-PASS:** Auf dem realen Samsung Tizen 5.5 ist die isolierte DEV-App gekoppelt, der neue S6.17-Button **„HLS-TS + AAC-Ton testen“** sichtbar und der Nutzer bestätigt **tatsächlich hörbaren Ton** bei der getesteten Aufnahme. Das ist kein pauschaler PASS für sämtliche Medien, Standard-AVPlay/Seek/Stop oder den produktiven Updateweg. Frühere S1-Abschnitte dokumentieren den historischen Erststand.

## Projektgrenzen

- **Nur dieses Repository** wird für den Samsung-Client verändert; kein Code im VDR-Suite-, Addon- oder VIDAA-Repository.
- Samsung-eigene Oberfläche mit Fernbedienungsfokus und später AVPlay.
- VDR-Suite bleibt Eigentümerin von Daten, Berechtigungen, Pairing, MediaSessions und Playback-Semantik.
- Der Client konsumiert ausschließlich geprüfte **öffentliche API-v1-Verträge**; keine Browser-privaten Endpunkte oder direkten VDR-Dateipfade.
- VIDAA dient als Architektur- und UX-Referenz, ist aber keine Laufzeitabhängigkeit.

## Einstieg

1. [ROADMAP.md](ROADMAP.md) – Phasen, Slices, Gates.
2. [docs/architecture.md](docs/architecture.md) – Systemgrenzen und Modulaufteilung.
3. [docs/api-contracts.md](docs/api-contracts.md) – geprüfte öffentliche Schnittstellen.
4. [docs/development-setup.md](docs/development-setup.md) – Windows/Tizen/TV-Verbindung.
5. [docs/hardware-acceptance.md](docs/hardware-acceptance.md) – Abnahme am realen Samsung.
6. **[docs/windows-update-workflow.md](docs/windows-update-workflow.md)** – Windows-/Git-Pull-/Build-Reihenfolge und Schutz lokaler Entwicklerdateien.
7. **[docs/wits-isolated-development.md](docs/wits-isolated-development.md)** – **verbindlicher DEV-TV-Live-Updateweg: genau ein `npm.cmd run tv:watch`**, keine Neuinstallation.

## Verbindlicher Windows-/Tizen-Updateweg (25.10.2026)

Der tatsächliche Samsung-S4.1-Update-Lauf ist unter [Windows-Update-Workflow](docs/windows-update-workflow.md) festgehalten. **77/77 Quelltests PASS** nach gezielter Sicherung der generierten `app/tv-runtime.js`, ausschließlich deren Wiederherstellung, `git pull --ff-only`, `npm.cmd run build:tv` und `npm.cmd run check`. Die unversionierten VS-Code-/Tizen-Dateien blieben unverändert. Beim nächsten Build nicht wieder pauschal wegen eines `git status --porcelain` abbrechen oder ungefragt Stash/Clean/Hard-Reset verwenden. **Das ist kein TV-Installations-PASS.**

## Phase-S1-Prototyp (auf echtem TV gestartet)

Die im Verzeichnis `app/` enthaltene statische TV-Web-App zeigt einen Startbildschirm, vier Bereiche, sichtbaren Fokus und harmlose Gerätefähigkeits-Indikatoren. Sie nutzt **keine Netzwerkressourcen und keine VDR-Medienressourcen**. Das lokal paketierte VIDAA-Startvideo ist eine nichtblockierende Branding-Animation, keine Recording-MediaSession. Das Original-VIDAA-Logo liegt unter `app/assets/branding/`.

Zum lokalen Entwickeln genügt ein statischer HTTP-Server, der `app/` ausliefert; für die **Installation** auf dem TV sind Tizen-Tooling und ein eigenes gültiges Samsung-Zertifikat erforderlich.

```bash
npm test
```

Die Tests benötigen Node.js 20 oder neuer, aber keine zusätzlichen npm-Abhängigkeiten.

## Upstream-Referenzen

- [VDR-Suite – Public API v1](https://github.com/hotzenplotz5/vdr-suite/tree/main/api)
- [VDR-Suite VIDAA (separates Projekt)](https://github.com/hotzenplotz5/vdr-suite-vidaa)
- [Samsung – TV-Web-App erstellen](https://developer.samsung.com/smarttv/develop/getting-started/creating-tv-applications.html)
- [Samsung – Tizen-Web-App-Konfiguration](https://developer.samsung.com/smarttv/develop/guides/fundamentals/configuring-tv-applications.html)

Keine Geräte-IP-Adressen, Zugangsdaten, Zertifikatsschlüssel oder Media-Tokens ins Repository committen.

## Branding und TV-Design

Die beiden Originaldateien `app/assets/branding/vdr-suite-icon-v4.png` und `app/assets/branding/startvideo.mp4` wurden aus dem eigenständigen VIDAA-Projekt übernommen und bleiben unverändert. Die kurze Startanimation läuft lokal, kann mit OK/Zurück/Stop übersprungen werden und blockiert den TV-Start nicht, falls der Decoder sie ablehnt. Startvideo funktioniert nach Nutzerbestätigung mit Bild auf Tizen 5.5; Ton wurde noch nicht getrennt nachgewiesen.

Verbindliches späteres UI-Ziel: das vom Nutzer bereitgestellte dunkle Media-Home-Design mit oberer Navigation, großer Live-TV-Hero-Karte und horizontalen Inhaltsschienen. Der kleine S1-Diagnosebildschirm ist ausdrücklich **noch nicht** dieses finale Design.

## Erster TV-Test und Tizen-5.5-Boot-Korrektur

Der erste signierte `.wgt`-Build wurde am echten Samsung installiert und zeigte den statischen S1-Bildschirm samt Logo. **Startvideo nicht sichtbar, alle drei Capability-Anzeigen blieben bei `wird geprüft`.** Das weist auf einen fehlenden JS-Boot hin, ist ohne Gerätekonsole noch keine endgültig bewiesene Ursache.

Die paketierte App nutzt nun `app/tv-runtime.js` als klassisches Script ohne Modulimporte. Die Module unter `app/src/` bleiben die Entwicklungsquellen. Nach JS-Änderungen `npm run build:tv` ausführen und das generierte Script mitcommitten; `npm run check` verweigert veraltete Bundles. Das Tizen-VS-Code-Build-Tool führt npm nicht selbst aus.

**Erneuter Hardwaretest erfolgreich (2026-10-25):** Alle drei Fähigkeitsanzeigen stehen auf „vorhanden“; originales Startvideo funktioniert laut Nutzer, Fokus und OK auf allen vier Menüpunkten sichtbar. Back/Exit/Restart, Video-Ton und tatsächliche AVPlay-Playback-Funktion bleiben ungeprüft.

## Git for Windows: `Stale app/tv-runtime.js`

Die erste TV-Runtime-Generatorversion verglich die Zeilenenden bytegenau. Bei Git for Windows können ausgecheckte Textdateien `CRLF` enthalten, während der Generator `LF` erwartet. Der Generator normalisiert jetzt Eingabe und Vergleich auf `LF`. Ein isolierter Test simuliert `CRLF` für sämtliche Quell-/Build-Dateien und prüft zusätzlich, dass tatsächlich veraltete Bundles weiterhin abgewiesen werden. Kein globales Ändern von Git-/Windows-Einstellungen nötig.

## TV-Runtime-Syntaxkorrektur

Beim erneuten lokalen `npm run check` meldete Node.js einen Syntaxfehler in der ersten Kommentarzeile der generierten TV-Runtime. Die Glob-Schreibweise in einem Blockkommentar enthielt unabsichtlich einen Kommentarabschluss. Sowohl Generator als auch generiertes Script verwenden jetzt einen Kommentar ohne Glob-Syntax; der neue Regressionstest überprüft die Runtime zusätzlich mit `node --check`. Windows-Check mit 15 erfolgreichen Tests und anschließender TV-Retest waren erfolgreich; Audio des Startvideos und spätere Medienfunktionen sind nicht dadurch abgenommen.

## Phase S2.1 – Dark-Premium-Media-Home (Quelle in Samsung-App)

Das vom Nutzer vorgegebene TV-Dark-Premium-Design wird als echte HTML/CSS/JavaScript-Oberfläche umgesetzt, **nicht** als Screenshot oder generiertes Bild. UI-Bausteine: Top-Navigation, zentraler Hero, flankierende Karten, Status/Aktionsleiste und horizontale Inhaltsreihe. Das Original-VIDAA-Logo und die funktionierende Intro-MP4 bleiben erhalten. Routen: Home, Live-TV, Aufnahmen, Suche, Timer und Einstellungen; die lokale S1-Hardwarediagnose liegt unter Einstellungen.

Alle Kacheln sind **Offline-Designvorschau**; es gibt absichtlich keine fiktiven echten Sender, EPG-Daten, Timer, Benutzer oder MediaSessions. D-Pad/OK/Zurück durch eine einzige Keydown-Instanz. Samsung Tizen 5.5: kein flex-gap und keine modernen JS-/CSS-Features ohne Legacy-Fallback. Keine anderen Repositories geändert.

Historischer S2-Build: `npm.cmd run build:tv`, dann `npm.cmd run check`. **Für weitere TV-Updates ausschließlich Build Project zur Paketierung verwenden; Run Project kann bestehende TV-Daten löschen.** Siehe [verbindlichen Windows-Update-Workflow](docs/windows-update-workflow.md). Die ursprüngliche S2-Hardware-Abnahme wurde separat durchgeführt.

## Phase S2.2 – Fernbedienung, Fokus und Zurück (2026-10-25)

S2.2 ergänzt einen stabilen Fokusgraphen für Header, Hero, Aktionen, Rail und Offline-Unteransichten. Reihen merken ihre zuletzt ausgewählte Kachel; D-Pad umbricht an den Rändern nicht. Beim Zurückspringen aus einer Unteransicht wird der vorherige Fokus wiederhergestellt. Mehrere Unteransichten bilden einen begrenzten Verlauf; eine explizite Home-Aktion leert den Verlauf. Ein einziger Keydown-Owner behandelt die Samsung-Fernbedienung. ScrollIntoView sichert den Fokus bei kleinen Bildschirmen oder später längeren Reihen. Die gesamte Oberfläche bleibt offline startfähig; keine echten Inhalte, API-Aufrufe oder AVPlay-Inhalte.

Nur JS/CSS/Offline-Navigation geändert; Original-Intro und Branding unverändert. Automatisierte GitHub-Checks erfolgreich. **S2.2 auf realem Samsung-TV vom Nutzer als PASS bestätigt (2026-10-25).** Links/Rechts ändert nur die Reiterauswahl; OK öffnet die Ansicht. Nächster Slice: S2.3 (Detailansichten, leere/Lade-/Fehlerzustände, Premium-Feinschliff).

## Phase S2.3 – Detailseiten und leere/Lade-/Fehlerzustände (2026-10-25)

Vier Bereiche (Live-TV, Aufnahmen, Suche, Timer) erhalten einheitliche, gerätefreundliche Dark-Premium-Detailansichten mit lokaler Statuskarte. Ein minimales Präsentationsmodell `app/src/views/view-state.js` liefert ausschließlich `offline`, `loading`, `empty` und `error`. Auf jeder dieser Seiten zeigt die Taste **„Zustände ansehen“** nacheinander die Ansichten; alle Testzustände sind ausdrücklich als Demo/Simulation gekennzeichnet. Es werden keine Daten abgerufen, keine tatsächlichen Sendungen/Aufnahmen vorgespiegelt und keine Medien gestartet. Der vorhandene S2.2-Fokusgraph bleibt der einzige D-Pad-Owner; Reiterwechsel allein lädt weiterhin keine Seite.

HTML/CSS verwenden nur mit Tizen 5.5 kompatible Grundlagen. Startvideo, Logo und Hardwarediagnose unter Einstellungen bleiben bestehen. Nach S3-API-Einführung ersetzt echte Anwendungslogik die lokalen Statusvorschauen; bis dahin gehört die Demonstration nicht zur Live-Nutzung.

Automatisierte Unit-/Runtime-/Zeilenenden-Checks hinzugefügt; echte TV-Abnahme der neuen S2.3-Oberfläche bleibt noch offen.

## Phase S3.1 – HTTPS und Public API v1 (2026-10-25)

Unter **Einstellungen → VDR-Suite-Server** kann die vollständige HTTPS-Basisadresse (ggf. einschließlich Reverse-Proxy-Pfad, aber ohne `/api/v1`) per TV eingegeben werden. Nur diese Adresse wird auf dem TV in `localStorage` gespeichert; niemals Credentials oder Pairing-Tokens.

Erst **„Verbindung prüfen“** startet zwei anonyme GETs auf `/api/v1` und `/api/v1/capabilities`. Der Client prüft API v1, unterscheidet Netzwerk-/TLS-CORS-/Timeout-, HTTP-, Redirect-, JSON- und Versionsfehler und folgert **keine** Permissions daraus. Reiterfokus allein löst weiterhin keine Anfrage aus.

Das Tizen-Manifest enthält `internet` und eine dynamische `access`-Policy, weil der Nutzer den Zielserver selbst festlegt. Der Programmcode akzeptiert ausschließlich HTTPS ohne eingebettete Zugangsdaten, Query oder Fragment. TLS-Validierung darf niemals deaktiviert werden. CORS und TV-Erreichbarkeit müssen am echten Samsung geprüft werden; eine vom Windows-Laptop funktionierende Verbindung genügt nicht.

**Status: S3.1-Quellcode/Test, TV- und Server-Gate OFFEN.** Pairing folgt separat in S3.2.

## S3.2 – Samsung-Gerätekopplung

Nach erfolgreicher manueller S3.1-Prüfung unter **Einstellungen** die Schaltfläche **Kopplung starten** verwenden. Das prüft zuerst den Tizen-KeyManager (Readback-Test), danach fordert die App mit `POST /api/v1/device-pairings` einen echten, kurzlebigen `userCode` und ein intern gehaltenes `pairingToken` an. Den sichtbaren Code auf einem getrennten, als Administrator angemeldeten Gerät in VDR-Suite freigeben. Anschließend am TV **Status prüfen**, nach `approved` **Gerät aktivieren** und zuletzt **Anmeldung prüfen**. Die App prüft `GET /api/v1` mit `Authorization: VDR-Suite-Device …`; ein erfolgreicher Login bedeutet noch keinen Backend-Grant.

**Sicherheit:** Der Pairing-Token lebt nur im Arbeitsspeicher; die einmalige Device-Credential wird erst nach einem erfolgreichen Tizen-KeyManager-Preflight abgeholt und ausschließlich in den KeyManager gespeichert. Speicherung und Readback müssen erfolgreich sein, sonst wird das Credential nicht als verbunden angezeigt. Es gibt keinen unsicheren `localStorage`-Fallback für Credentials; dort liegt nur die HTTPS-Serverbasis. Wenn die Speicherung fehlschlägt, die TV-App **nicht schließen** und „Speichern wiederholen“ drücken. Nach unsicherem Ergebnis der einmaligen Credential-Ausgabe niemals dasselbe POST erneut senden. Credential-Revocation und Grants liegen bei VDR-Suite und folgen als S3.3-UI. Keine QR-Freigabe-URL erfunden, kein Browser-Passwort auf dem TV.

Samsung dokumentiert die seit Tizen 2.4 vorhandene KeyManager-API für TV unter https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/keymanager-api.html . Für Tizen 5.5 wird die veraltete `keymanager`-Privilege **nicht** ins Manifest eingetragen (API-Doku: seit Tizen 3.0 nicht deklarieren). Ob die API auf dem konkreten TV funktioniert, muss die Hardware-Abnahme zeigen.

**Dateien:** `app/src/api/device-pairing.js`, `app/src/platform/device-vault.js`, `app/src/main.js`, `app/index.html`, `app/styles.css`, generierte Classic-Runtime und Tests. **Rollback:** vorherigen Samsung-Commit zurückholen und Paket neu installieren; bereits am Server ausgestellte Geräteidentitäten werden dadurch nicht widerrufen, das muss ein Administrator separat tun.

## Entwicklungs-Testinstallationen: Serveradresse am Laptop hinterlegen

Samsung dokumentiert: Bei einem Tizen-Studio-Test-Build kann die vorherige Test-App vor der Installation deinstalliert werden. Dabei gehen lokale Web-Storage-Daten verloren. Ein reguläres App-Update ohne Deinstallation behält die Daten dagegen. Quelle: https://developer.samsung.com/smarttv/develop/faq/data-and-file-handling.html

Einmalig auf dem Windows-Entwicklungsrechner im Samsung-Repository:

```powershell
npm.cmd run configure:tv -- https://server.example/vdr-suite
```

Die Kommandozeile erzeugt `app/device-local.js`. Sie enthält **nur** die überprüfte HTTPS-Serverbasis, niemals ein Credential oder Passwort. Die Datei wird **nicht eingecheckt** (`.gitignore`), bleibt aber auf dem Entwicklungsrechner liegen und wird beim nächsten Samsung-Paket-Build zusammen mit den übrigen `app/`-Ressourcen gebündelt. Die HTML-Datei lädt die optionale Konfiguration vor der klassischen Runtime; die App startet auch dann offline, wenn die lokale Konfigurationsdatei fehlt. Lokale Konfiguration entfernen: `npm.cmd run configure:tv -- --clear`.

Nach `npm.cmd run build:tv` und `npm.cmd run check` das Samsung-WGT mit der Tizen Extension erstellen/installieren. Die HTTPS-Adresse ist nun bei einer Neuinstallation bereits im Feld ausgefüllt, ohne sie am TV zu tippen. Eine am TV gespeicherte gültige Adresse hat Vorrang. Beim Verlassen des Eingabefeldes wird sie zusätzlich gespeichert.

**Kopplung starten** prüft die öffentliche API v1 bei Bedarf selbst; der bisherige separate Tastendruck auf **Verbindung prüfen** entfällt. Erst nach erfolgreicher Discovery folgt der sichere KeyManager-Preflight und dann der Pairing-POST. **Keine** automatische Serveranfrage beim App-Start oder bloßen Reiterwechsel.

**Wichtig für S3.2:** Bei einem Uninstall können auch TV-KeyManager-Daten verloren gehen. Bereits auf dem Server ausgestellte Device-Credentials und Grants verschwinden dadurch nicht. Der produktive, datenbewahrende Update-Pfad muss vor regelmäßigem Live-Pairing gesondert abgenommen werden.

## S3.3 – Echte Sender mit bereits gekoppeltem Samsung (2026-10-25)

Die Samsung-Kopplung wurde vom Nutzer am TV bestätigt; der Server hat channels.view für das Backend erhalten. Ob das Credential einen App-Neustart übersteht und Sender auf dem TV erscheinen, ist weiterhin ein separates Hardware-Gate.

Live-TV per OK öffnen, dann Sender laden per OK drücken. Der TV liest das vorhandene Credential ausschließlich aus dem Tizen-KeyManager, authentifiziert GET /api/v1 und liest danach GET /api/v1/backends und GET /api/v1/channels (20 Sender je Seite). Mehr Sender lädt explizit die nächste Seite. Backend wechseln schaltet zwischen den zuerst zurückgegebenen Backends um; vorerst maximal 30. Kein automatischer Netzwerkzugriff beim Start oder Reiterfokus.

Fehlende oder widerrufene Geräteidentitäten und fehlende channels.view-Grants werden angezeigt; kein automatisches Re-Pairing und keine Rechteerweiterung. Live-TV-Wiedergabe, EPG, Aufnahmen und MediaSessions gehören nicht zu diesem Slice. Nur echte Serverfelder werden als Senderdaten angezeigt.

Quellenänderungen erfordern npm run build:tv und danach npm run check. Tests laufen ohne npm-Pakete. Das signierte WGT und ein realer TV-Test sind separate Gates. Rollback: vorheriger Samsung-main-Stand ohne Server-Eingriff.



## Produktive Samsung-App aktualisieren (S7.2 — Source/CI, Hardware offen)

**Wichtig:** `Run Project` ist kein datenbewahrendes Update: Eine Tizen-Studio-Testinstallation kann vorher deinstallieren und damit KeyManager-Daten löschen. Der neue **rein lokale** WGT-Preflight liest ein fertig signiertes Paket und vergleicht die Original-App-/Paketkennung, aktuelle Quellen, höhere Version und das Autor-Zertifikat mit einem **nachweislich bereits installierten alten WGT**. Kein TV-Zugriff, keine automatische Installation, keine Credential-Migration. Ohne alte Paket-/Signaturidentität oder belegte datenbewahrende Installationsmethode ist eine TV-Aktualisierung nicht freigegeben. Vollständiger Ablauf: [S7.2 Produktions-Update](docs/production-update-s7-2.md). Hardware-PASS bleibt offen.

## WITs-Updates nur als isolierte DEV-App (S7.1 — S6.17 auf realem TV sichtbar, Ton PASS)

**Kritische Korrektur 2026-10-25:** WITs hängt `WITs` an die Tizen-Application-ID an, **ändert aber nicht zuverlässig die Paket-ID**. `wits --start` im normalen `app/`-Projekt könnte daher `VDRSuiteTV` (bestehende Geräteanmeldung!) treffen. **Dort niemals WITs Start ausführen.** Das bisherige `tv:watch` wurde auf eine vollständig getrennte lokale Entwicklungskopie `.tizen-wits-dev/` umgestellt.

Normal: `VDRSuiteTV.VDRSuite` / Paket `VDRSuiteTV`. Isolierter WITs-Host: `VDRSuitDev.VDRSuiteWITs` / Paket `VDRSuitDev`. Erstmaliges `wits --init`/`--start` sind **keine Routineupdates**; Start kann DEV-Daten/Kopplung verlieren. **Für die bereits installierte DEV-App** nach nötigem Build und erfolgreichem `npm.cmd run check` einmal `npm.cmd run tv:dev:prepare` ausführen. **Nur wenn noch kein Watch läuft** im Repo-Hauptverzeichnis `npm.cmd run tv:watch` starten; bei bereits laufendem Watch **keinen zweiten starten** (Port 4050, `EADDRINUSE`). Live-Sync und Funktion auf dem TV bestätigen; `--smoke` ist nur optional und keine Voraussetzung. **S6.17: neuer Knopf am TV sichtbar, Ton hörbar bestätigt.** Alle Details: [docs/wits-isolated-development.md](docs/wits-isolated-development.md).

**Einschränkung:** Die DEV-App hat eigene Tizen-KeyManager-Daten. Die reale Persistenz der DEV-Kopplung über Watch/Restart ist noch **nicht nachgewiesen**; Datenbewahrung für produktive Updates bleibt separat offen. Keine automatische Neu-Kopplung, Credential-Exports oder Grants.

## S6.23 – Allgemeine Suche wie im Webfrontend: Aufnahmen und EPG (27.10.2026)

Der Bereich **Suche** arbeitet jetzt mit dem **gemeinsamen GlobalSearchService/SQLite-Index des Webfrontends**. Ein Suchfeld über die Samsung-Tizen-Bildschirmtastatur, explizites `Suchen`, Backendwahl und zwei unabhängige Ergebnisgruppen **Aufnahmen** und **EPG** mit Trefferzahl und eigener `Mehr`-Pagination. OK auf Treffer lädt autorisierte Aufnahme- bzw. EPG-Details; keine Wiedergabe oder Timer-Mutation ohne eigene Aktion. Die Device-Endpunkte `GET /api/v1/search/recordings` und `GET /api/v1/search/epg` verlangen `recordings.view` bzw. `epg.view` pro Backend; beide liefern nur die öffentliche, beschränkte Projektion des Webindex. Kein Abholen und Filtern kompletter Kataloge im Samsung-Client. Der Web-Frontend-Matcher bleibt maßgeblich, inklusive Suche in EPG-Untertiteln und manuellen Aufnahmetiteln. Personen-/Poster-/Match-Reason-Daten liefert die Device-API noch nicht, daher sind sie nicht Teil des Samsung-Slice. **Echter TV-Hardwaretest und WITs-Dateiübertragung separat offen.** [Roadmap](ROADMAP.md) · [API-Vertrag](docs/api-contracts.md) · [Hardware-Abnahme](docs/hardware-acceptance.md).

## S6.20 – epgsearch-Suchtimer und Treffer auf dem Samsung (27.10.2026)

Im **Timer-Tab**, getrennt von den nativen VDR-Timern, gibt es jetzt **„Suchtimer (epgsearch)“**. `Suchtimer laden` ruft nur echte Public-v1-SearchTimer-Regeln (`GET /api/v1/search-timers?backend=...&limit=30`) ab; `Weitere Suchtimer` paginiert, `Backend wechseln` hält die Daten sauber getrennt. OK auf einer Regel liest ihren aktuellen Zustand über `GET /api/v1/search-timers/{id}`, und **`EPG-Treffer anzeigen`** ruft separat bis zu 30 EPG-Texttreffer und die Gesamtzahl über `/preview` ab. `searchtimers.view` ist für Liste/Details notwendig, `epg.view` **zusätzlich** für die Treffervorschau; `timers.view` der nativen Timer ist separat. **S6.20 ist ausschließlich lesend, keine Suchregel wird angelegt, geändert oder aktiviert.** Source/CI 218/218, Hardware-Test und echte WITs-Übertragung noch offen. Die späteren S6.21/S6.22-Slices sind in der [Roadmap](ROADMAP.md) eingeplant.

## S6.19 – Echte VDR-Timer lesen (27.10.2026)

Im Samsung-DEV-Tab **Timer** lässt sich die echte native VDR-Timerliste über die öffentliche API v1 laden. **`Timer laden`** ruft `GET /api/v1/native-timers?backendId=...&offset=0&limit=30` auf, **`Weitere Timer`** paginiert und **`Backend wechseln`** wechselt zwischen autorisierten Backends. D-Pad/OK zeigen Titel, VDR-Uhrzeit und Aufnahmezustand. Benötigt `timers.view` für das gewünschte Backend – unabhängig von `epg.view` und `media.live.play`. Alles **rein lesend**, kein Timer wird erstellt, gelöscht oder geändert. Samsung-Hardwareprüfung noch offen. Siehe [Roadmap](ROADMAP.md), [API-Vertrag](docs/api-contracts.md) und [Hardware-Abnahme](docs/hardware-acceptance.md). DEV-Übertragung nach Build/Staging **nur** mit dem dokumentierten einmaligen WITs-Watch und sichtbarem TV-Push; kein `wits --start`, kein Pairing-Reset.

## S6.18 – Erster Live-TV-Praxistest über API v1 (27.10.2026)

Neue manuelle Schaltfläche **`Live-TV testen`** nach Auswahl eines echten Senders mit OK. Die gekoppelte DEV-App erstellt eine autorisierte `live-channel`-Session über `POST /api/v1/live-playback-sessions` mit gesondertem `media.live.play`-Grant und prüft den geschützten `live/stream.mp4`-Pfad mit HTML5-MP4. STOP/ZURÜCK und Ansichtswechsel lösen Server-Session-STOP aus; kein automatisches Zappen und keine ungeschützten Media-URLs. **Source/CI PASS, realer Samsung-Live-Test noch offen**; kein AVPlay-Cookie im veröffentlichten Live-Device-Vertrag. Siehe [API-Vertragskarte](docs/api-contracts.md), [Hardware-Abnahme](docs/hardware-acceptance.md) und [DEV-Updateweg](docs/wits-isolated-development.md).

## Phase S4.1 – echte Aufnahmen im Samsung-Client (Source-Kandidat, 2026-10-25)

Der Menüpunkt **Aufnahmen** verwendet jetzt nach **OK → Aufnahmen laden** die vorhandene, sicher im Tizen-KeyManager gespeicherte Geräteanmeldung für `GET /api/v1/backends` und `GET /api/v1/recordings`. `recordings.view@backend` muss der Administrator ausdrücklich für dieses Gerät gewähren; der für Live-TV vorhandene Grant `channels.view` genügt **nicht**.

Die Mediathek ist **nicht auf 20 oder 100 Aufnahmen insgesamt begrenzt**. Es werden bis zu 100 öffentliche `rec_...`-Einträge pro Serveranfrage geladen; „Weitere Aufnahmen“ und „Vorherige Seite“ erreichen beliebig viele Folgeseiten. Im DOM verbleibt immer nur eine Seite. Aufnahmezeilen sind mit D-Pad/OK fokussierbar und zeigen echte Metadaten. Keine Wiedergabe, Streaming-URL, künstliche Demoaufnahme, Autoload oder private Serverroute.

**Status:** Code/Tests zunächst source-only; die TV-Installation und der reale Grant-/Mehrseiten-Test müssen separat bestätigt werden. Nach einer VS-Code-`Run Project`-Neuinstallation kann das lokale Device-Credential verlorengehen; dadurch entsteht auf dem Server **kein** automatisch wiederverwendbares Device. Bestehende Geräte nicht blind löschen oder erneut koppeln. Die VDR-`channels.conf`-Senderreihenfolge bleibt unabhängig davon eine offene API-v1-Serverfrage.

**Lokaler Samsung-Workflow:** Für DEV-Watch nach explizitem separatem Bootstrap **nur** `npm.cmd run build:tv`, `npm.cmd run check`, `npm.cmd run tv:dev:prepare`, `npm.cmd run tv:watch` verwenden. `Build Project → Run Project` kann die Device-Anmeldung löschen; [sicheren Watch-Pfad oben](#entwicklungs-updates-ohne-erneutes-geräte-pairing--samsung-wits-watch-2026-10-25) beachten.


## S8.1 – Samsung Media Home (27.10.2026)

Das neue Premium-Home nutzt vorhandene Navigationspunkte, eine dezente Verbindungsmeldung am Logo und zeigt echte Inhalte statt doppelter Funktionskacheln. Hero, Weitersehen mit serverseitigem Continue-Watching, Aus deiner Mediathek, Jetzt im TV und der kompakte native Aufnahmeplaner lesen vorhandene öffentliche API v1. Aufnahme- und EPG-Bilder werden nur als Device-autorisierte Binärdaten geladen; bei fehlendem Artwork bleibt das dunkelblaue Fallback. Metadaten und Fortschritte werden nicht erfunden.

Bei sichtbarem Home-Eintritt werden Device, Backend und getrennte Lesedomänen automatisch abgefragt. Fehlende einzelne Grants blockieren nicht die ganze Seite. Die Katalogliste ist nach Recording-ID sortiert, nicht nach Aufnahmedatum. Home startet keine Wiedergabe. Source-/CI- und TV-Abnahme bleiben getrennt: der neue Stand ist auf dem Samsung erst nach tatsächlichem WITs-Push sichtbar. Siehe ROADMAP.md, docs/api-contracts.md, docs/hardware-acceptance.md und docs/wits-isolated-development.md. PR #33 bleibt Draft; Produktiv-App unverändert.


## S8.3 – Streamdev Direkt-Live-TV (Samsung DEV, Hardware OPEN)

Erster TV-Versuch ohne Browser-Cookie-Umweg: Auf **Live-TV** die lokal erreichbare Streamdev-Serveradresse des VDR eingeben, z. B. `http://192.168.178.20:3000`, mit „Streamdev speichern“ sichern, danach „Sender laden“, Sender per OK auswählen und „Live-TV direkt starten“. Der Stream läuft als roher VDR MPEG-TS `/TS/<VDR-channelId>` in Samsung **AVPlay**, ohne VDR-OSD im Videobild. Back/STOP beendet den AVPlay-Stream und gibt den Decoder wieder frei. TV-Bild/Ton/Haltbarkeit und die Erreichbarkeit des Plugins müssen auf realer Hardware geprüft werden.

Die eingegebene LAN-Adresse liegt nur im lokalen TV-Speicher, nicht im Repository. Damit ist **kein** VDR-Suite-Public-v1-MediaSession-POST verbunden. Der Legacy-HTML5-Test bleibt getrennt. Ein Streamdev-HTTP-Port darf nur im eigenen Heimnetz erreichbar sein, nicht im Internet freigegeben werden. Es werden weder Backend-Einstellungen noch Tizen-Installation oder Kopplung geändert.
