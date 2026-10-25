# S5.3 – Samsung Tizen 5.5: Recording-Wiedergabe und geschützter Medienzugriff

**Stand:** Quell- und CI-Diagnose, **kein** bestätigtes Bild/Ton auf dem
Samsung GU43TU6979UXZG (2020). Keine automatische Installation, kein Neu-Pairing.

## Samsung-Herstellerbefunde

- [Playback Using AVPlay](https://developer.samsung.com/smarttv/develop/guides/multimedia/media-playback/using-avplay.html):
  **`$WEBAPIS/webapis/webapis.js` in index.html laden**, genau ein
  `application/avplayer`-Objekt an `document.body` anbinden, `open`,
  Listener, `setDisplayRect`, `prepareAsync`, dann `play`. Das Objekt muss
  1920×1080-Tizen-Koordinaten für die native Ausgabe verwenden.
- [AVPlay API](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html):
  `prepareAsync` kann mit `WebAPIError` fehlschlagen. Die App zeigt künftig
  nur erlaubte Fehlernamen/-nummern an, nie Error-Messages, URLs oder Secrets.
  Bei `setStreamingProperty` sind `COOKIE` und `USER_AGENT` dokumentiert;
  eine allgemeine frei setzbare `Authorization`-Header-Funktion ist im
  dokumentierten TV-AVPlay-Vertrag **nicht belegt**.
- [General Specifications / HLS](https://developer.samsung.com/smarttv/develop/specifications/general-specifications.html):
  Tizen 5.5 unterstützt HLS-TS und HLS-fMP4, aber **nicht** alle modernen
  Low-Latency- und Zusatz-Tags (z. B. `EXT-X-PART` erst Tizen 6.0,
  `EXT-X-PLAYLIST-TYPE` laut Tabelle nicht unterstützt).
- [2020 TV Video Specifications](https://developer.samsung.com/smarttv/develop/specifications/media-specifications/2020-tv-video-specifications.html):
  MPEG-TS/MP4 und je nach konkretem Modellprofil MPEG-2/H.264/HEVC,
  AAC/AC3/EAC3 sind dokumentiert. DTS wird auf 2020-TVs nicht unterstützt.
  Ein reines `canPlayType(video/mp4; h264,aac)` beweist die tatsächliche
  Aufnahme-/Container-Kompatibilität nicht.
- [Multimedia Streaming FAQ](https://developer.samsung.com/smarttv/develop/faq/multimedia-streaming.html):
  HLS-Cookies können relevant sein. Automatische Cookie-Übernahme zwischen
  Web-XHR und Samsungs eigenem nativen AVPlay-Netzwerkstack ist nicht bewiesen.

## Abgleich mit dem VDR-Suite-Backend

Das bestehende Public-v1-Device-CREATE
`POST /api/v1/recording-playback-sessions` benötigt Device-Credential +
`media.recording.play`-Grant. Die Antwort liefert ein `mediaPath` und
setzt **`vdr_suite_media` mit `Secure; HttpOnly; SameSite=Strict`**.
Der Gateway kontrolliert die Medien-GETs erneut. Das Credential ist weder
als Query-Parameter noch im JSON lesbar. Siehe im Backend-Repo:

- `docs/development/public-v1-device-recording-playback.md`
- `core/http/include/MediaAccessCredentialHttp.h`
- `core/http/src/MediaGatewayHttpServer.cpp`
- `docs/development/phase-65-media-capability-negotiation-contract.md`

**Architekturgrenze:** Auf Samsung ist `setStreamingProperty("COOKIE", value)`
dokumentiert, aber das `HttpOnly`-Cookie ist für JS bewusst unlesbar.
Der Client darf die Device-Geheimnisse nicht als Query-Token, andere
Klartext-URL oder `document.cookie`-Workaround einsetzen. Wenn der native
AVPlay-Netzwerkstack das geschützte Cookie nicht automatisch sendet, ist
das nicht allein durch den bestehenden Clientcode reparierbar. Eine
alternative, kurzlebige, explizit gerätegebundene native Medienübergabe
erfordert einen **separat geprüften Backend-/Security-Contract**. Nicht
einfach bestehende Medienrouten öffentlich machen.

## Implementierter, ungefährlicher Diagnosetest

Im Fehlerfall `AVPlay.prepareAsync` führt der TV-Client **vor dem
MediaSession-Stop** einen streng auf dieselbe Session beschränkten
`GET` mit `Range: bytes=0-0` und `withCredentials=true` durch. Das ist
absichtlich kein `HEAD`: `MediaGatewayHttpServer` lässt nur `GET` zu.

Der Request wird unmittelbar beim Empfang der HTTP-Header abgebrochen:
**kein Download der Aufnahme, kein Lesen des Antwortkörpers, kein Export
von Mediencookies/Device-Credentials**.

- **200/206:** Browser-Medienpfad erreichbar. Das beweist _nicht_, dass
  AVPlay dieselben Cookies nutzt oder den Codec verarbeiten kann.
- **401/403:** Browser-Medienpfad nicht autorisiert; SameSite-/Cookie-
  Speicherung, Proxy-Pfad und Gateway-Device-Grant getrennt prüfen.
- **404/416:** Session, Bereitstellung, Gateway oder Byte-Range überprüfen.
- **XHR-Fehler:** TLS/CORS/Netzwerk; nicht vorschnell als Codec-Fehler ausgeben.

Falls der Fehler trotz Browser-200/206 bei `AVPlay.prepareAsync` liegt,
brauchen wir realen Netzwerk-/Backend-Nachweis, ob native AVPlay-GETs
`vdr_suite_media` überhaupt senden. Die Client-Anzeige allein liefert
diesen Beweis nicht.

## Zweiter, ausdrücklich gewählter Wiedergabeweg: HTML5 MP4

Die Aufnahmeliste bietet zusätzlich **`HTML5 MP4 testen`**. Das ist kein
automatischer Fallback und kein zweiter Player, der parallel zu AVPlay läuft.
Nur der benutzerseitig ausgewählte Player erhält die MediaSession.

Für den HTML5-Test meldet die App **nur**
`protocols: ["progressive"]` und `containers: ["mp4","fmp4"]` sowie die
tatsächlich konservativ geprüften H.264/AAC-Fähigkeiten. Liefert das Backend
keinen progressiven `/recording/stream.mp4`-Pfad, wird die Sitzung beendet
und ohne Wiedergabe abgebrochen. Keine HLS-/MPEG-TS-Zusage durch den Browser.

Der HTML5-`video`-Pfad nutzt den normalen Browser-Cookiekontext statt des
nativen AVPlay-Netzwerkstacks; `HttpOnly` wird weder ausgelesen noch in
einen Link umgewandelt. **Ob** der Tizen-Packaged-App-Ursprung (`file://`)
ein serverseitiges `SameSite=Strict`-Cookie für die MediaSession mitsendet,
ist Hardware-/Netzwerk-Gate, kein Quellbeweis.

Für einen aussagekräftigen Test mit derselben Aufnahme:
1. Native **Wiedergabe testen** wählen und die AVPlay-Fehlerklasse,
   Range-Headerdiagnose sowie Profil HLS/TS/MP4 ablesen.
2. Nach STOP/Cleanup **HTML5 MP4 testen** wählen. Nur wenn der Server
   tatsächlich MP4 bereitstellt, wird das Videotag gestartet.
3. Bei Erfolg Bild/Ton, PLAY/PAUSE, STOP/BACK prüfen. Bei Misserfolg
   den kurzen MediaError-Code und den Browser-Medienzugriff vergleichen.
4. Niemals wegen eines 401 eine andere Medien-URL, einen Cookiewert
   oder ein Device-Secret manuell einsetzen.

## Zusätzliche präzise Ursache: SameSite=Strict und ein lokaler App-Ursprung

Die paketierte TV-App wird aus ihrem lokalen Tizen-App-Kontext geladen,
während das Backend unter `https://…` liegt. Laut
[MDN Set-Cookie / SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
wird ein Cookie mit `SameSite=Strict` **nicht für Cross-Site-Requests**
mitgesendet; `withCredentials=true` erzwingt keine Ausnahme von dieser
Cookie-Richtlinie. Der Gateway setzt für die Device-MediaSession bewusst
`Secure; HttpOnly; SameSite=Strict`, weshalb **beide** Wege gefährdet sein
können:

- **HTML5 <video>:** Nutzt den Webengine-Cookiekontext. Falls das Tizen
  App-Origin aus Sicht des Browsers gegenüber HTTPS cross-site ist, muss
  die GET-Anfrage trotz zuvor erfolgreichem Device-CREATE an der
  Cookie-Prüfung scheitern. Welches Origin/Site die reale TV-Engine für
  das Paket tatsächlich verwendet, ist noch zu messen.
- **AVPlay:** Verwendet einen nativen, separat dokumentierten
  Streaming-Stack. Selbst wenn die Webengine ein Cookie besitzt, ist
  dessen Weitergabe an AVPlay keinesfalls belegt.
  `setStreamingProperty("COOKIE",…)` ist zwar dokumentiert; wegen
  `HttpOnly` darf JavaScript den geheimen Cookie-Wert nicht auslesen.

Dies ist eine **konkrete, aus dem Sicherheitsvertrag abgeleitete
Fehlerhypothese, kein gemessener 401-Befund**. Ein HTTP-401/403 beim
neuen Header-Test bestätigt eine Medienzugriffsblockade *in der Webengine*;
ein HTTP-200/206 schließt eine Blockade *in AVPlay* nicht aus.
`SameSite=None`, Token-in-URL, Header-/Cookie-Exporte oder offene
Medienrouten dürfen nicht ohne eigene Backend-/Security-Entscheidung
eingeführt werden.

## HLS-Profil gegen Tizen-5.5-Spezifikation

Die [Samsung General Specifications](https://developer.samsung.com/smarttv/develop/specifications/general-specifications.html)
führen für Tizen 5.5 unter anderem `#EXT-X-INDEPENDENT-SEGMENTS`
als nicht unterstützt. Das VDR-Suite-Backend setzt
für *transkodierte* HLS-Ausgaben in
`core/media/src/FfmpegHlsCommandBuilder.cpp` derzeit die FFmpeg-Flags
`delete_segments+independent_segments+temp_file`.
Bei *kopiertem* HLS wird hingegen
`delete_segments+split_by_time+temp_file` benutzt.

Dieser mögliche Playlist-Vertragskonflikt ist für HLS konkret zu
prüfen, aber **nicht** als Ursache der bereits beobachteten Fehler
belegt; insbesondere erklärt ein HLS-Tag keinen `prepareAsync`-Fehler
bei `recording/stream.mp4`. Nicht auf Verdacht die bereits
eingesetzten FFmpeg-Profile global ändern.

## Abnahme auf dem echten Samsung

1. **Keine Neuinstallation allein wegen eines CI-Fixes.** Die vorhandene
   Kopplung darf nicht durch `Run Project` wieder gelöscht werden.
2. Bei **separat freigegebenem** TV-Build mit bestehender Anmeldung eine
   abgeschlossene Aufnahme wählen (erst H.264/AAC-MP4 oder HLS-TS mit
   nachweislich unterstütztem Profil).
3. Exakte native Fehlerphase/-klasse und den **Browser-Medienzugriffsstatus**
   abschreiben; keine Cookies/URLs kopieren.
4. Bei 401/403: Session-Cookie/CORS/Proxy-Schutzpfad untersuchen.
   Bei Browser-200/206 plus AVPlay-Fehler: nativen AVPlay-GET, MediaSession-
   Profile/Format und Decoder prüfen.
5. **PASS erst bei wirklichem Vollbild plus Bild/Ton und sauberem STOP.**

Eine Quelltest-Suite oder grüner GitHub-PR beweist keinen Hardware-PASS.
