// Presentation only: credentials stay in the Tizen KeyManager.
// A locally stored credential, verified device auth and an unavailable store
// are distinct states. No server calls, localStorage or automatic re-pairing.
export function devicePairingStatus(saved, lastVerified, rejectedCredentialId) {
  if (!saved || !saved.ok) {
    return {state:"unknown",text:"Sichere Geräteablage momentan nicht lesbar. " +
      "Anmeldung unbekannt; nicht erneut koppeln."};
  }
  var cred = saved.credential;
  if (!cred) {
    // A short-lived KeyManager read result must not contradict a successful
    // authenticated catalog request in the same running application.
    if (lastVerified && lastVerified.credentialId) {
      return {state:"conflict",text:"Geräteanmeldung war in dieser Sitzung erfolgreich. " +
        "Der KeyManager liefert gerade keinen Eintrag; bitte „Anmeldung prüfen“. Nicht neu koppeln."};
    }
    return {state:"missing",text:"Kein gespeichertes Device-Credential gefunden. " +
      "Nicht automatisch neu koppeln."};
  }
  if (rejectedCredentialId && rejectedCredentialId === cred.credentialId) {
    return {state:"rejected",text:"Geräteanmeldung vom Server mit HTTP 401 abgewiesen " +
      "(Device-ID: " + cred.deviceId + "). Credential lokal noch vorhanden."};
  }
  if (lastVerified && lastVerified.credentialId === cred.credentialId &&
      lastVerified.base === cred.base) {
    return {state:"authenticated",text:"Gerät authentifiziert (Device-ID: " +
      cred.deviceId + "). Sender und Aufnahmen können mit den vorhandenen Grants genutzt werden."};
  }
  return {state:"local",text:"Device-Credential lokal gespeichert (Device-ID: " +
    cred.deviceId + "). Server-Anmeldung noch nicht geprüft; „Anmeldung prüfen“ wählen."};
}
