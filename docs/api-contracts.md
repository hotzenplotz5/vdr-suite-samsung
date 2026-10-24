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

