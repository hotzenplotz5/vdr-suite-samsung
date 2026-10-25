// Recover only a credential already authenticated in the CURRENT app session.
// Never recreate a server device, silently re-pair, or export secrets.
// Called ONLY by the user's explicit "Anmeldung prüfen" action.
export function restoreVerifiedSessionCredential(saved, cached, proof, verify, store, done) {
  if (!saved || !saved.ok || saved.credential || !cached || !proof ||
      typeof cached.base !== "string" ||
      typeof cached.actorId !== "string" ||
      typeof cached.deviceId !== "string" ||
      typeof cached.credentialId !== "string" ||
      typeof cached.credentialSecret !== "string" || !cached.credentialSecret ||
      cached.base !== proof.base || cached.credentialId !== proof.credentialId) {
    done({ok:false,kind:"not_eligible"});
    return;
  }
  // The previous success is scoped to this credential, but may be stale
  // (revoked on the server). A fresh read-only Device verification is essential.
  verify(cached,function (result) {
    if (!result || !result.ok) {
      done({ok:false,kind:"verification",verification:result});
      return;
    }
    // vault.store checks the KeyManager again, refuses occupied/unknown slots,
    // and requires an exact secure readback before reporting success.
    store(cached,function (written) {
      if (!written || !written.ok || !written.credential ||
          written.credential.credentialId !== cached.credentialId ||
          written.credential.base !== cached.base ||
          written.credential.credentialSecret !== cached.credentialSecret) {
        done({ok:false,kind:"storage"});
        return;
      }
      done({ok:true,credential:written.credential});
    });
  });
}
