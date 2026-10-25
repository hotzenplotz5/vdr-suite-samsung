# S7.2 – Produktions-App aktualisieren, ohne die Kopplung zu verlieren

**Status 2026-10-25: Offline-/Source-Kandidat, kein Hardware-PASS.**
Ziel: bestehendes Paket `VDRSuiteTV`, App-ID `VDRSuiteTV.VDRSuite`, KeyManager-Alias
`vdr-suite-samsung-device-v1` beim regulären Update erhalten. Keine zweite
Pairing-Architektur, kein Credential-Export, keine automatische Neu-Kopplung.

## Ursache und Grenze des derzeitigen Test-Workflows

Samsung unterscheidet:
- **Reguläres App-Update:** Anwendungsdaten/Web Storage bleiben erhalten.
- **Tizen-Studio-Testbuild/Run Project:** kann vor dem neuen Build **deinstallieren**.
  Bei Deinstallation verschwinden App-Daten. Deshalb ist *Run Project kein Update*.

Herstellerquelle:
https://developer.samsung.com/smarttv/develop/faq/data-and-file-handling.html

Bei einem regulären Update muss auch das **originale Autor-Zertifikat** erhalten
bleiben. Ein neu erstelltes Zertifikat ist kein Ersatz, wenn die ursprüngliche
Autorenidentität verloren ist:
https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html

**Wichtige Einschränkung:** Diese Aussagen sind kein hardwarebestätigter Nachweis,
dass die manuelle SDK-/SDB-Entwicklerinstallation auf Tizen 5.5 ein Update *ohne*
Uninstall durchführen kann. Auch wenn eine Installationsfunktion „install“ heißt,
ist ihr tatsächliches Verhalten zu prüfen. Dieses Repository stellt deshalb
bewusst **keinen** automatischen „sicheren Installations“-Befehl bereit.

## Implementiert: Offline-Prüfung des fertigen signierten WGT

Neues Werkzeug: `scripts/tv-update-preflight.mjs`. Nur Node.js >=20, keine
Zusatzpakete, kein Netzwerk, keine Samsung-TV-Aktion.

Die Prüfung liest ZIP-/WGT-Dateien *ohne sie zu extrahieren* und kontrolliert:
1. Die tatsächliche **signierte** Kandidaten-WGT hat weiterhin `VDRSuiteTV` /
   `VDRSuiteTV.VDRSuite`; nicht etwa `VDRSuitDev` oder einen WITs-Host.
2. Die im Paket enthaltene Tizen-Version ist **höher** als die Version des
   zuletzt tatsächlich installierten, bereits bekannten Basis-WGT.
3. Der SHA-256-Fingerabdruck des öffentlichen Autor-Zertifikats aus
   `author-signature.xml` ist in Basis und Kandidat **identisch**.
4. `author-signature.xml` und `signature1.xml` sind enthalten.
5. `config.xml`, `index.html`, `styles.css` und `tv-runtime.js` im Kandidaten-WGT
   stimmen mit dem aktuellen, geprüften Quellstand überein.
6. Offensichtliche lokale Signatur-/Entwicklungsgeheimnisse und unsichere ZIP-
   Einträge werden abgewiesen; zusätzlich werden **ZIP-CRC32 und Header-Konsistenz**
   der tatsächlich gelesenen WGT-Einträge geprüft.

**CRC32 schützt hier nur gegen einfache Beschädigung oder widersprüchliche
ZIP-Metadaten; es ist keine kryptographische Signatur.** Dies ist eine
Identitäts-/Plausibilitätsprüfung, **keine kryptographische XMLDSig-Validierung.** Gültige Zertifikatskette, Samsung-Signaturprüfung und
tatsächliche Update-Datenpersistenz sind separate Gates.

### Der sichere Ablauf im bestehenden Windows-/VS-Code-Projekt

Zunächst wie üblich **nur lokal**:

1. Vorhandene Signaturidentität aus einem *archivierten signierten WGT*
   bestimmen, das **nachweislich** der bereits auf dem TV installierten Version
   entspricht. Eine zufällig gefundene oder später überschriebene Debug-WGT ist
   **kein** solcher Nachweis.
2. Für einen *neuen Release* die **Versionsnummer in `app/config.xml` und
   `package.json` gemeinsam erhöhen**, sonst ist es kein sauberer Upgrade-
   Kandidat. IDs unverändert lassen. Dafür gibt es jetzt ein explizites,
   offline arbeitendes Werkzeug mit Vorschau, beispielsweise:

   ```powershell
   node scripts/tv-release-version.mjs --next 0.1.1 --dry-run
   node scripts/tv-release-version.mjs --next 0.1.1 --apply
   ```

   **Nur als Beispiel für den aktuell dokumentierten Ausgangsstand 0.1.0.**
   Für spätere Releases entsprechend die nächste Version verwenden. `--apply`
   ändert ausschließlich die beiden versionierten Quelldateien, ohne
   automatische Neu-Generierung, Signierung, Installation oder Git-Bereinigung.
   Anschließend wie im nächsten Schritt die Runtime generieren und testen.
3. `npm.cmd run build:tv` und `npm.cmd run check`, danach **Build Project**
   (nicht **Run Project**) mit dem bisherigen Autor-Zertifikat.
4. Lokale Paketprüfung im VS-Code-Terminal:

```powershell
node scripts/tv-update-preflight.mjs --inspect "app\Debug\app.wgt"
node scripts/tv-update-preflight.mjs --candidate "app\Debug\app.wgt" --baseline "C:\Pfad\zum\tatsaechlich-installierten-alten.wgt"
```

Alternativ kann das Werkzeug einen **maschinenlesbaren, nicht geheimen**
Nachweis als JSON auf stdout ausgeben:

```powershell
node scripts/tv-update-preflight.mjs --candidate "app\Debug\app.wgt" --baseline "C:\Pfad\zum\tatsaechlich-installierten-alten.wgt" --json
```

Dieser Nachweis enthält WGT-SHA-256, Paket-/App-ID, die beiden Versionen und
den SHA-256-Fingerabdruck des öffentlichen Autor-Zertifikats. Er gibt
**ausdrücklich** `approval_to_install: false`, 
`baseline_confirmed_installed_on_tv: false` und
`data_preserving_tv_update_method_confirmed: false` aus. Das Tool kann
nicht überprüfen, welches signierte WGT tatsächlich auf dem Gerät installiert
ist, und erzeugt **keine** technische Installationsfreigabe.

Die Pfade sind **Beispiele**, keine automatisch erkannten Dateien. Die
Kandidatenprüfung kann bei fehlendem Basis-WGT nicht PASS melden. Sie gibt
keine privaten Zertifikatsschlüssel aus, nur den Fingerabdruck des öffentlichen
Autor-Zertifikats.

**Wichtige Abbruchbedingungen:** Basis-WGT fehlt oder ist nicht eindeutig dem
installierten Paket zugeordnet; Autor-Fingerprint weicht ab; Versionsnummer
unverändert; Paket-/App-ID falsch; Kandidat enthält veraltete Quellen;
WGT-Signatur tatsächlich nicht gültig; Installationspfad deinstalliert vorher.
In all diesen Fällen **TV unverändert lassen**. Kein Workaround durch
Neu-Pairing, neue Zertifikate, WITs Start oder Neuinstallation.

### Hardware-Gate – erst separat, bewusst und mit belegter Update-Methode

Vor einem regulären Release-Update muss **zuerst belegt** werden, dass die
konkret verwendete Installations-/Verteilungsmethode auf dem Tizen-5.5-TV
tatsächlich ein datenbewahrendes *Update* ist. Das ist für bisherige Tizen-
Studio-„Run Project“-Installationen **ausdrücklich nicht belegt**.

Nur nach gesonderter Freigabe und einem tatsächlich geeigneten Updatepfad:
- Vorher mit **demselben** produktiven Paket `Einstellungen → Anmeldung prüfen`,
  Device-ID (nicht Geheimnis) und angezeigte Buildkennung dokumentieren.
- Reguläres Update **ohne ausdrücklich oder implizit ausgeführte
  Deinstallation** durchführen; danach dieselbe App-ID, neue Buildkennung
  und **dieselbe Device-ID** in `Anmeldung prüfen` beobachten.
- App schließen und erneut starten, den KeyManager-Zustand erneut prüfen,
  reale Sender/Aufnahmen mit denselben Grants prüfen.
- `401`/`403`, fehlender Key, nicht lesbarer KeyManager und Netzwerkfehler
  getrennt erfassen. Niemals stillschweigend re-pairen oder Device widerrufen.

**Hardware-PASS bleibt bis zu diesen Beobachtungen offen.**
Wird beim Test die Kopplung verloren, **STOP**; bei Uninstall ist das alte
Credential nicht rekonstruierbar. Keine Credentials am PC sichern.

## Bewusste Trennung von S7.1

S7.1 (`VDRSuitDev`) bleibt eine isolierte Entwicklervariante für Live Reload.
Ein dortiges DEV-Pairing ist **nicht** das produktive Device. Das nun
implementierte S7.2-Preflight akzeptiert **nur** `VDRSuiteTV` und installiert
ausdrücklich nichts.

## Verteilung: dokumentierter Samsung-Pfad statt Tizen-Testinstall

Der für **regelmäßige veröffentlichte** Updates dokumentierte Weg ist
**Samsung TV Seller Office → Upload App → Request New Release** für die
ausgewählten Modellgruppen. Samsung führt Prüfungen und Zertifizierung durch.
Eine bereits registrierte Anwendung benötigt beim Update dasselbe
Autor-Zertifikat. Die bestehenden Produkt-IDs bleiben unverändert.

Offizielle Quellen:
- https://developer.samsung.com/tv-seller-office/guides/applications/distributing-application.html
- https://developer.samsung.com/tv-seller-office/faq/application-update.html
- https://developer.samsung.com/smarttv/develop/faq/data-and-file-handling.html

**Für diese konkrete, bislang nur per Tizen-Entwicklerwerkzeugen installierte
App ist ein Übergang auf den Store-Pfad nicht als datenbewahrend
nachgewiesen.** Insbesondere ersetzt ein Seller-Office-Release nicht
automatisch die lokale, developer-signierte Installation mitsamt bestehendem
KeyManager-Eintrag. Eine neue Autor-Signatur macht aus der bestehenden
Produktivinstallation keine sichere Aktualisierung.

Für die laufende **Entwicklung** ist dagegen das isolierte S7.1-DEV-Paket
(`VDRSuitDev`) vorgesehen, das nach **einem eigens genehmigten initialen
Bootstrap** ohne erneute Paketinstallation per WITs Watch Codeänderungen
nachladen kann. Das bestehende Produktivpaket bleibt bis zur verifizierten
Update-/Distributionsentscheidung unangetastet.

**Klare technische Schlussfolgerung:** Eine universelle, beweisbar
datenbewahrende lokale Samsung-Tizen-5.5-Updatefunktion für das bereits
developer-installierte Paket können wir aus dem verfügbaren SDK-Verhalten
nicht behaupten oder durch npm automatisieren. Wer `Run Project` als
Update benutzt, muss mit Datenverlust rechnen. Das ist eine
Plattform-/Vertriebsgrenze, keine ausstehende Korrektur des Tizen-KeyManagers.

## Rollback

Repository/Quelle: zum vorigen signierten, bekannten Quellstand zurückwechseln.
**Nicht** als vermeintlich sicheren TV-Rollback das alte WGT installieren:
eine Downgrade-/Testinstallationsoperation kann erneut deinstallieren und
Credentials entfernen. TV erst nach eigenem Verfahren und Hardware-Gate ändern.

## Herstellerabgleich: Warum wir Testinstallation und Store-Update trennen

Die Samsung-FAQ zu App-Daten sagt ausdrücklich: **App-Daten bleiben bei
regulären Updates erhalten, werden bei Uninstall entfernt.** Für
Tizen-Studio-**Testbuild-Updates** beschreibt Samsung hingegen ein Uninstall
vor dem neuen Installieren und damit gelöschten lokalen Speicher:
https://developer.samsung.com/smarttv/develop/faq/data-and-file-handling.html

Die Samsung-Dokumentation zum VS-Code-Device-Workflow formuliert zusätzlich,
dass bei Installation einer neuen Version die vorherige Version automatisch
uninstalliert wird:
https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode/connecting-to-tv-device.html

Diese unterschiedlichen Aussagen darf man **nicht** in einen sicheren
SDB-/VS-Code-Updatebefehl umdeuten. Die sichere, durch den Hersteller
beschriebene veröffentlichte Aktualisierung ist der Store-/Seller-Office-
Release-Pfad; **für unser bisheriges lokal per Developer-Tools installiertes
Paket ist der Erhalt der KeyManager-Kopplung dadurch nicht nachgewiesen.**
Eine Shop-Veröffentlichung oder ein TV-Update wird von diesem Repository
nicht automatisch ausgelöst.
