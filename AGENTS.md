# Repository-Regeln für vdr-suite-samsung

## Scope

- Nur `hotzenplotz5/vdr-suite-samsung` verändern. Keine impliziten Commits, Deployments oder PRs in `vdr-suite`, `vdr-suite-vidaa` oder Addon-Repositories.
- Samsung ist ein **eigenständiger** Client. Kein Fork des VDR-Suite-Webfrontends.
- `main` bleibt integrationsfähig; konkrete Slices separat, sofern später mehrere Entwickler parallel arbeiten.
- Jeder Slice mit Tests, Dokumentation, Hardware-Status und klarer Abbruch-/Rollback-Option.

## Contract first

- Öffentlicher, versionierter VDR-Suite-API-v1-Vertrag ist verbindlich; nie Browser-private `/api/...`-Routen, RESTful-Plugin-Rohdaten, SVDRP, native VDR-Dateipfade oder ungeschützte Media-URLs ersatzweise verwenden.
- Pairing, Device-Grant, Session, Recording-ID, Media-Policy und Resume gehören dem Server.
- Niemals Credentials, Pairing-Tokens, Media-Cookies, Hosts/IP-Adressen oder Zertifikate/Schlüssel committen oder loggen.
- Runtime-/Hardware-Erkenntnisse von ungetesteten SDK-Annahmen trennen.

## Tizen/TV

- Minimalziel Samsung TV 2020 / Tizen 5.5 / Chromium M69. Keine unverträglichen modernen JS-/CSS-Features ohne Fallback.
- Ein einheitlicher Eingabe- und Fokus-Owner; keine zweite Keydown-Instanz in View-Modulen.
- Eine einheitliche Playback-Steuerung; Samsung AVPlay ausschließlich hinter einem Plattformadapter.
- App-Start muss offline möglich sein; HTTP-Fehler dürfen den Startbildschirm nicht blockieren.
- In S1 ausschließlich das lokale, nichtblockierende VIDAA-Branding-Startvideo; **keine Inhalte/MediaSessions** und keine echten Backend-Aufrufe ohne S3-Gate.

## Entwicklung

- `npm test` ohne npm-Pakete, CI unabhängig von Servern und Samsung-TV.
- Samsung-Zertifikatserstellung, Geräteinstallation, Netzwerkverbindung und Wiedergabe sind **manuelle Gates**.
- README, ROADMAP und Abnahmeprotokoll aktualisieren, ohne ungeprüfte Hardware-Akzeptanz zu behaupten.
- Kein Secret und kein absoluter privater Benutzerpfad in Doku/Test-Fixtures.

