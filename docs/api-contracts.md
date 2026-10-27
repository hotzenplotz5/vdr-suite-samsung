# Public-v1-Verträge für Samsung (Planungs- und Auditstand)

**Wichtig:** Dies ist eine Client-Integrationskarte, kein neu erfundenes Backend-API und keine Bestätigung der installierten yaVDR-Runtime. Vor jedem produktiven Slice aktuellen Upstream-HEAD, OpenAPI, Berechtigungen und Live-Server-SHA prüfen.

## Verbindliche API-Quellen

- https://github.com/hotzenplotz5/vdr-suite/blob/main/api/README.md
- https://github.com/hotzenplotz5/vdr-suite/blob/main/api/openapi.json (partielle Beschreibung)
- https://github.com/hotzenplotz5/vdr-suite/blob/main/api/device-pairing.md
- https://github.com/hotzenplotz5/vdr-suite/blob/main/api/recording-browse-epg.md
- https://github.com/hotzenplotz5/vdr-suite/blob/main/api/device-recording-playback.md

## Planung nach Phasen

| Phase | Beispiel / API-Grenze | Bedingung |
| --- | --- | --- |
| S3 | `GET /api/v1`, `GET /api/v1/capabilities` | Discovery; keine automatische Autorisierung |
| S3 | `POST /api/v1/device-pairings` | anonymer Pairing-Bootstrap, kurzlebiger Token |
| S3 | `GET /api/v1/device-pairings/{id}` | nur mit `X-VDR-Suite-Pairing-Token` im TV-Polling-Modus |
| S3 | `POST /api/v1/device-pairings/{id}/credential` | genau eine Credential-Ausgabe nach Admin-Freigabe |
| S3/S4 | `GET /api/v1/backends` | Device-Auth + tatsächlich vergebene Grants |
| S4 | `GET /api/v1/recordings?backendId=...&view=folders&limit=30&offset=0` | Folder-Offset-Pagination, keine Pfadrekonstruktion |
| S4 | `GET /api/v1/genres?backendId=...` | Genre-Metadaten, erfordert `recordings.view` |
| S5 | `POST /api/v1/recording-playback-sessions` | Device-owned Session; `media.recording.play@backend` |
| S5 | `GET /api/v1/recording-playback-sessions/{id}` / `.../stop` | nur eigene aktive Session; sauberes Teardown |
| S6 | öffentliche Channels-, EPG- und Timer-Verträge | separat prüfen |

## Security-Fakten aus dem serverseitigen Vertrag

- Device-Anmeldung verwendet `Authorization: VDR-Suite-Device <credentialId>.<credentialSecret>`, **nicht** Bearer.
- Erfolgreiches Pairing erteilt **keine** automatischen Backend-/Content-Grants.
- Eine Device-Credential wird einmalig ausgegeben; bei Verlust keine freie Wiederholung.
- Ein Recording-Metadata-GET stellt keine abspielbare URL bereit.
- Aufnahmen sind Suite-IDs (`rec_...`), Ordner opaque IDs (`fld1_...`), keine lokalen Dateipfade.
- MediaSession-`mediaPath` / -Cookie und AVPlay-Kompatibilität sind ein separates Hardware-/Security-Gate.
- Die Web-Frontend-API `/api/...` ist keine Alternative zu fehlenden `/api/v1/...`-Routen.

## Prüfpflicht S3–S5

1. **Deployment:** installierter Server-Build/Origin/HTTPS ermitteln.
2. **Contract:** exakt genutzte HTTP-Methoden, Felder und Fehler lesen.
3. **Security:** Positive und negative Device-Grant-Szenarien.
4. **TV:** echte Netzwerk-/SSL-/Cookie-/Player-Semantik prüfen.
5. **Akzeptanz:** erst danach als Laufzeit-bewiesen dokumentieren.


## S3.1 – Public-v1 Discovery (Upstream main geprüft 2026-10-25)

- Anonym: `GET /api/v1` und `GET /api/v1/capabilities`, jeweils unter der aktuellen tatsächlichen HTTPS-Deployment-Basisadresse.
- Root erfordert `apiVersion: "v1"`, `supportedApiMajors` mit `v1`, `compatibilityPolicy`, `authentication`, `links.capabilities`.
- Fähigkeiten erfordern `apiVersion: "v1"`, Array `capabilities`, `compatibility`, `links.root`.
- Ein gemeldetes `available` und der Authentifizierungsstatus sind **kein Content-Grant**.
- Keine Browser-Private-API, keine dynamischen Serverlinks als Requestziele und keine Anmeldung in S3.1.
- Tizen braucht `internet` und `access`; tatsächlich funktionierende TV-Netzwerkverbindung und CORS/TLS bleiben ein Hardware-Gate.

## S3.2 – aktueller Samsung-Client (Quelle/TV-Gate)

- Anonym `POST /api/v1/device-pairings` mit geschlossenem JSON `{displayName,clientKind:"samsung",appVersion}`, erwartet 201.
- Nur TV-Token `X-VDR-Suite-Pairing-Token` für `GET /api/v1/device-pairings/{id}`, erwartet 200 mit `status`.
- Administrator entscheidet getrennt nach authentifiziertem Admin-GET und `If-Match`; der TV hat keine Admin-Autorität.
- Bei `approved`, ausschließlich nach KeyManager-Preflight und bewusster TV-Aktion: `POST .../{id}/credential` **ohne Body**; 201 einmalig. Keine blinden Wiederholungen.
- Credential ausschließlich Tizen-KeyManager, dann `GET /api/v1` mit `Authorization: VDR-Suite-Device <credentialId>.<credentialSecret>`.
- Benutzer-/Admin-Passwörter, Browser-Cookies, Browser-private APIs, automatische Grants und Mediensessions bleiben ausgeschlossen.
- TV-Hardwareprüfung und Device-Grants noch ausstehend.


## S4.1 – echte Aufnahmeliste über öffentliche API v1 (Source, Hardware offen 2026-10-25)

Nach ausdrücklich ausgelöster „Aufnahmen laden“-Aktion verwendet Samsung die bereits aktivierte und bei jedem neuen Ladevorgang frisch aus Tizen-KeyManager gelesene Device-Credential. Zuerst werden über `GET /api/v1` die Anmeldedaten geprüft und anschließend `GET /api/v1/backends?limit=30&sort=backendId&order=asc` zur Backendauswahl verwendet. Eine dort sichtbare Backend-Identität **beweist noch keine `recordings.view`-Freigabe**, da positive Grants auch aus `channels.view` stammen können. Deshalb erzwingt der tatsächliche `GET /api/v1/recordings` weiterhin serverseitig `recordings.view@backendId`; HTTP 403 wird sichtbar und nicht umgangen.

```http
GET /api/v1/recordings?backendId=default&limit=100&sort=recordingId&order=asc
Authorization: VDR-Suite-Device <credentialId>.<credentialSecret>
```

Antwort: `items` aus sicheren öffentlichen `rec_...`-Identitäten, Titel, Zeit, Dauer und Größe; `page.hasMore` / `page.nextCursor` zur Fortsetzung. Ein nächster Aufruf ergänzt `cursor=<opaque rc1_...>` und bleibt **am selben freigegebenen Backend**. Bis zu **100 Elemente pro GET, keine künstliche Gesamtgrenze**; der Fernseher hält nur eine Seite mit höchstens 100 DOM-Aufnahmezeilen gleichzeitig. „Weitere Aufnahmen“, „Vorherige Seite“ und Backendwechsel sind explizite Fernbedienungsaktionen. Kein Katalog-Vollabruf, keine clientseitig konstruierten nativen Pfade, keine `GET /api/vdr/...`-Fallbacks.

HTTP 401 (Credential), 403 (fehlendes `recordings.view`), 409 (veralteter/falscher Cursor), 503 (Backend/Katalog) sowie Netz-/TLS- und Schemafehler erscheinen ausdrücklich. Bei navigationsbedingtem Abbruch darf eine alte Antwort keine andere Ansicht überschreiben. Recording-Metadaten enthalten **keine** Wiedergabe-URL. `media.recording.play` ist ein anderer, gesonderter Grant; S4.1 startet weder Session noch Player. Ordnernavigation, Detail-Metadata, Artwork, Genres, Wiedergabe und P1-Resume folgen in S4.2/S4.3/S5 und benötigen eigene Tests.

Der Serververtrag ist [Recording browse](https://github.com/hotzenplotz5/vdr-suite/blob/main/api/recording-browse-epg.md); die einzige serverseitige API-v1-Hardware-Matrix liegt [hier](https://github.com/hotzenplotz5/vdr-suite/blob/main/docs/development/public-v1-final-hardware-acceptance.md). Die S4.1-Samsung-Hardwareprobe (insbesondere eigener `recordings.view`-Grant und Fernbedienungsfokus auf mehr als einer Seite) ist noch **NOT_VERIFIED**.


## S6.3 – Numeric Channel collection und Grenzen des Live-Playback (26.10.2026)

Der Samsung-Client fordert die opt-in-Variante `GET /api/v1/channels?backendId=...&limit=20&sort=backendId,channelNumber,channelId&order=asc` an. Die öffentliche ID ist weiterhin `(backendId,channelId)`; `channelNumber` ist die änderbare numerische VDR-Position. `page.nextCursor` wird opak belassen. Fehler: unsupported sort = 400 sichtbar, fremder Grant = 403, ungültiges Device = 401, geänderter Scope = 409. Die Quellimplementierung in VDR-Suite-main ist kein Nachweis des tatsächlich installierten Daemons.

Zur zukünftigen echten Live-TV-Wiedergabe ist ausschließlich der getrennte Public-v1-Device-Vertrag `POST /api/v1/live-playback-sessions` mit `resourceKind=live-channel` und `media.live.play@backend` erlaubt. Die aktuelle Samsung-S6.3-Senderzeile führt deshalb keine automatische Wiedergabe und keinen schreibenden MediaSession-POST aus: Live-/fMP4-Medienzugang sowie STOP/Tunerfreigabe müssen erst anhand des installiert geprüften Vertrags und eines späteren Hardwaretests implementiert werden. Keine Browser-private MediaSession.


## S6.4 – EPG-Fenster, Aufnahme-Metadaten und geschütztes Artwork (2026-10-26)

**Nur nach expliziter Auswahl, rein lesend:** `GET /api/v1/epg/now-next?backendId=...&channelId=...&fromTime=<Unix-seconds>&limit=2` verlangt `epg.view@backend`; Zeitangaben in Antworten sind Sekunden-Strings und keine JavaScript-Millisekunden. Optional folgt `GET /api/v1/epg/window?backendId=...&channelId=...&fromTime=...&untilTime=...&limit=24` mit dem tatsächlich vom Server zurückgegebenen opaken `ew1_`-Cursor bei identischem Backend/Sender/Zeitfenster. Ein nicht installiertes EPG-Window gibt eine sichtbare Fehlerdiagnose, nie einen Wechsel zu Browser-privaten Routen.

**Aufnahme:** Ein zuvor aus freigegebener Collection ausgewähltes `rec_` erhält ausschließlich `GET /api/v1/recordings/{recordingId}?backendId=...` mit `recordings.view@backend`, danach eine bounded `GET .../artwork`-Liste. Die Antwort `metadata.state/source/contentKind` wird mit bekannten Feldern und gekürzten Texten angezeigt. Bei vorhandenem Poster erfolgt Bildabruf über einen **eigenen Device-authentifizierten** `XMLHttpRequest` als ArrayBuffer vom aus den geprüften IDs konstruierten Public-v1-Pfad; sichere MIME-Allowlist JPG/PNG/WebP, Größenlimit, Blob-URL mit Widerruf bei Neuabruf/Tabwechsel. Auf keinen Fall die vom Backend übermittelte artwork-URL oder ein direktes, headerloses `img.src` verwenden.

**Abnahmestand:** EPG Now/Next, E1 Window, M1 Detail und M2 Artwork sind Quellverträge im Suite-main; ob der zurzeit **installierte** yaVDR-Commit alle Erweiterungen enthält, wurde nicht bestätigt. 401/403/404/400/503 und Netzwerk-/Cachefehler zeigen eine eindeutige nichtdestruktive Rückmeldung. Kein Playback- oder Timer-Grant darf die fehlende EPG-/Recording-Berechtigung ersetzen. Keine zusätzlichen Backend-Arbeiten oder App-Installation in diesem Slice.


## S6.18 – Public-v1 Device Live-TV Session als bewusster Hardwaretest (27.10.2026)

**Upstream explizit gelesen:** `hotzenplotz5/vdr-suite` `api/device-live-tv-playback.md`, `api/rest/src/LiveMediaSessionRequestParser.cpp` und `api/rest/src/LiveMediaSessionController.cpp` (`main`). Nur der vorhandene Public-v1-Vertrag, **keine Browser-private `/api/media/sessions`-Route**. `channels.view` für den Senderkatalog erlaubt noch kein Playback. Für den ausdrücklich angeforderten Live-POST braucht die gekoppelte DEV-Device-Identität das zusätzliche, backendgebundene `media.live.play`. `epg.view` ist wiederum separat.

- CREATE: `POST /api/v1/live-playback-sessions`, Device-Authorization, HTTPS, `withCredentials` für HttpOnly-Cookie, `{resourceKind:"live-channel",backendId,channelId,capabilities:{protocols:["progressive"],containers:["fmp4","mp4"],videoCodecs:["h264"],audioCodecs:["aac"],supportsByteRanges:true,maxVideoWidth:1920,maxVideoHeight:1080,maxAudioChannels:2}}`.
- CREATE-Antwort: 201 mit eigener `mediaSession.id`, exakt passenden Backend-/Channel-IDs, `state:"ready"`, `presentationProfileId:"live-progressive-fmp4"`, einzig akzeptierter geschützter Pfad `/api/v1/media/sessions/{ms_id}/live/stream.mp4` unter demselben HTTPS-Serverpräfix.
- STOP: `POST /api/v1/live-playback-sessions/{ms_id}/stop`, `{resourceKind:"live-channel",backendId,sessionId,operation:"stop"}`, dasselbe Device/Grant/Owner-Gate. Bei erfolgreicher CREATE-Antwort nach Nutzerabbruch wird genau diese Session sofort beendet. Kein `replacesSessionId`, kein Cross-Device-Replace, keine URL-Tokens, kein implizites Re-Pairing.
- **Grenze des realen Hardwaretests:** Live-v1 dokumentiert bisher **keine** `nativeMediaAccess`-Projektion für Samsung AVPlay. Der Client testet daher zuerst die real vorhandene HTML5-MP4/HttpOnly-Cookie-Strecke; ob Tizen-`file://` den Secure/SameSite-Cookie auf Medien-GETs mitsendet, muss der Samsung zeigen. Ein 401 beim geschützten Media-GET ist **kein** Beweis, dass H.264/AAC defekt ist. Kein Browser-Privat- oder freier VDR/Streamdev-Pfad als Ersatz. Der Recording-S6.17-AVPlay/AAC-Hardware-PASS ist ein anderer Vertrag.


### S6.18-Abnahmefehler: Native-Medienauthentifizierung bei Live (27.10.2026)

**Nachgewiesen:** Realer Samsung meldet beim HTML5-Live-Test einen aus dem Media-GET-Header-Probe stammenden **HTTP 401**. Das ist **kein** Dekodernachweis. Der Live-Controller in `hotzenplotz5/vdr-suite` erstellt seine Session mit `Set-Cookie` und `live-progressive-fmp4`, zeigt aber im JSON **kein** `nativeMediaAccess`-Feld. Die Recording-Device-Antwort ermöglicht dagegen bei explizitem `nativeMediaAccess:true` die Ausgabe des **bereits erteilten, kurzlebigen Session-Cookies** zur Weitergabe an native Player. Genau diese Recording-Technik hat auf dem echten Samsung mit AVPlay/HLS-TS/AAC **hörbaren Ton geliefert**.

**Konkrete Vertragslücke für Live:** Der Backend-Device-Live-CREATE benötigt einen analog begrenzten ausdrücklichen Native-Access-Opt-in mit derselben MediaSession-Owner-/Grant-/Cookie-Policy (keine Device-Langzeit-Credentials im Stream, keine Tokens als URL-Query). Der Client darf AVPlay erst nach verifiziertem opt-in-Cookie nutzen; danach Live-Profil/Transcoding für Tizen 5.5 wirklich testen. Einzelne Ursache des 401 (Cookie nicht akzeptiert vs. Proxy-/Cookie-Pfad) ohne Gateway-/TV-Befunde **ungeklärt**. Kein stilles Wiederversuchen des bekannten HTML5-Fehlers; Backend-Repo nicht automatisch geändert.


## S6.19 – Erstes echtes lesendes Timer-UI gegen native VDR-Timer (27.10.2026)

Quellbelege in `hotzenplotz5/vdr-suite` `main`: `api/rest/src/PublicApiRuntime.cpp::tryHandleNativeTimerReadGet`, `api/rest/include/PublicApiRuntime.h::PublicNativeTimerItem`, `api/rest/tests/test_public_epg_now_next.cpp` sowie `SecurityHttpGate.h`. **Keine Spekulation über installierten Serverstand**.

`GET /api/v1/native-timers?backendId={backend}&offset={0..100000}&limit=30`; Serverantwort `{backendId,items:[{timerId,channelId,channelName,title,day,weekdays,startTime,endTime,enabled,recording,pending}],page:{limit:30,offset,hasMore,nextOffset},meta:{partial:false}}`. `timers.view@backend` ist unabhängig von `channels.view`, `epg.view` und `media.live.play`. `day` und `weekdays` sind native VDR-Planungsselektoren, `startTime`/`endTime` native HHMM; keine EPG-Event-ID, TimerAssignment-Revision oder Mutationserlaubnis ableitbar. Bei ungültiger/fehlender Providerantwort 503, nicht automatisch `items:[]`; Rechte-/Backendfehler getrennt ausweisen.

Samsung S6.19 verwendet nur Device-authentifizierte HTTPS-GETs (inkl. erstem Device-Proof und Backend-Discovery) und niemals `/api/vdr/timers`, `/api/vdr/timers/live`, `/api/v1/timer-assignments` als native Liste oder einen Timer-Mutationsendpunkt. Der neue UI-Schritt ist **getrennt** von S6.18-Live-Playback; dessen **HTML5-Medienabruf HTTP 401** erfordert später einen eigenen Backend-Native-Access-/AVPlay-Vertrag. Hier keine Änderung am Server.


## S6.20 – epgsearch-SearchTimers getrennt von nativen Aufnahmetimern (27.10.2026)

**Quellvertrag gelesen:** `hotzenplotz5/vdr-suite` `main`, `api/search-timers.md` sowie `api/rest/src/PublicApiRuntime.cpp` (Collection `publicSearchTimerCollectionResponse`, Detail- und Preview-GET). VDR-SearchTimers haben die servereigene stabile opake `st_[0-9a-f]{32}`-Identität und sind **keine** NativeTimer-`timerId` und **keine** `timerAssignmentId`. Die öffentliche API v1 verwendet ausschließlich verifiziertes Device-HTTPS mit `Authorization: VDR-Suite-Device …`, niemals Browser-Cookies oder RESTfulAPI-Provider-Rohdaten.

- Liste: `GET /api/v1/search-timers?backend=<scope>&limit=30[&cursor=<st1_...>]` verlangt `searchtimers.view@scope`, liefert `items[{searchTimerId,backendId,name,query,state}]`, `page{limit,nextCursor,hasMore}`, `meta{partial:false}`. Cursor ist opak, strikt backendgebunden. Bei 503 keine falsche `items:[]`.
- Detail: `GET /api/v1/search-timers/{id}?backend=<scope>` verlangt `searchtimers.view@scope`, liefert Regelname, Query und Aktivzustand plus `meta.partial=false`, keine native ID/Optionspayload/Revision. 404 bei retirierter/fehlender ID.
- Vorschau: `GET /api/v1/search-timers/{id}/preview?backend=<scope>&limit=30` verlangt **`searchtimers.view` UND `epg.view`** für genau dieses Backend. Antwort `{backendId,searchTimerId,totalCount,items:[{title,subtitle,channelId,startTime,endTime}],meta:{partial:false,epgInput:"ready"}}`. Treffer beziehen sich auf EPG-Texte, **nicht** auf sämtliche epgsearch-Einschränkungen oder garantiert programmierte Aufnahmen.
- UI & State: Nur benutzerausgelöste List-/Detail-/Preview-GETs. Sichere Seitengrenzen, nur `textContent` für Fremdtexte, Cancel/Generationsprüfung bei Navigation und Backendwechsel, Fehlermeldungen für 401/403/404/503. Getrennte Berechtigungen `timers.view` (native Timer), `searchtimers.view` (gespeicherte epgsearch-Regeln) und `epg.view` (Vorschau).

**Noch nicht Teil des S6.20-Codes:** Neue Regel per `draft-preview` und `searchtimers.create` zunächst inaktiv anlegen; `UPDATE/ACTIVATE/DEACTIVATE/DELETE` erfordern separaten Backend-nativen Generation/CAS-Vertrag. Kein Schreibrecht wird aus einer Lesefreigabe abgeleitet. Source/CI ist kein installierter Backend-/Samsung-Hardware-PASS.


## S6.23 – Globale Aufnahmen-/EPG-Suche, gemeinsamer Web-Suchindex (27.10.2026)

Backend-Quellen `hotzenplotz5/vdr-suite` `main` geprüft: `api/public-v1-generic-search.md`, `docs/development/public-v1-search-parity.md` und `PublicApiRuntime.cpp::tryHandleBrowseReadGet`. Das Samsung-Frontend verwendet **nicht** die Browser-Route `/api/search`, sondern die vom selben `GlobalSearchService` gespeisten verifizierten **Device Public-v1 GETs**.

- Aufnahme: `GET /api/v1/search/recordings?backendId=<id>&query=<encoded>&limit=30&offset=<n>` mit `recordings.view@backendId`. Antwort `items:[{kind:"recording",backendId,recordingId:"rec_<32hex>",title,edited}]`.
- EPG: `GET /api/v1/search/epg?backendId=<id>&query=<encoded>&limit=30&offset=<n>` mit `epg.view@backendId`. Antwort `items:[{kind:"epg",backendId,channelId,eventId,title,subtitle,startTime,endTime}]`.
- Beide: `page:{offset,limit,totalCount,hasMore}`, maximal 30 Ergebnisse, Offset bis 1.000.000, Suchbegriff mindestens 2/maximal 240 UTF-8-Bytes (URL/Query-Limits des Servers beachten). Nur Device-Authorization/HTTPS und jeweils ein explizites Backend; `cache: no-store`. Unterschiedliche Berechtigungsfehler erscheinen unabhängig. Aufnahmen-Details über `GET /api/v1/recordings/{rec_id}?backendId=...`; EPG-Details über `GET /api/v1/epg/event?backendId=...&channelId=...&eventId=...`. Ein Treffer allein berechtigt weder Wiedergabe noch Timer-Mutation.
- Gleiche Match-Normalisierung, gleiche Web-Index-Daten und Ranking/Reihenfolge; keine auf TV neu implementierte Matching-Engine und keine Suchfilterung kompletter Recording-Listen. Das Server-EPG-Fenster reicht ca. 6h zurück / 14 Tage voraus. Gültiger Nulltreffer ist 200+0; nicht verfügbarer Index/Backend ist Fehler (oft 503), niemals Nulltreffer.
- Aktuelle **Public-v1-Projektion hat keine vollständige Personen-/Artwork-/Match-Reason-Projektion** des Webfrontends: bewusst nicht erfinden oder geheime Provider-URLs von Browser-Endpunkten verwenden. Erweiterung dieses UI-Paritätsumfangs würde erst eine ausdrücklich dokumentierte Public-v1-Erweiterung erfordern.

Samsung-Hardware-Gate OPEN: WITs-Übertragung wirklich bestätigen und gegen Webresultate desselben Backends testen. Bestehende `app/AGENTS.md` beachten.
