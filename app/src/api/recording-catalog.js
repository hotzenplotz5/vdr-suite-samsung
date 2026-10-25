// S4.1: read-only Public API v1 recordings; no media URLs or private routes.
// One bounded keyset page (up to 100), never a full-catalog download.
export function createRecordingCatalog(environment) {
  var env = environment || {};
  var pending = null;
  var serial = 0;
  function cancel() {
    serial += 1;
    if (pending && typeof pending.abort === "function") {
      try { pending.abort(); } catch (_) {}
    }
    pending = null;
  }
  function validBackendId(id) {
    return typeof id === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(id);
  }
  function validCredential(credential) {
    return credential && typeof credential.base === "string" &&
      /^https:\/\/[^\s/?#]+(?:\/[^?#]*)?$/.test(credential.base) &&
      validBackendId(credential.credentialId) &&
      typeof credential.credentialSecret === "string" &&
      /^[A-Za-z0-9._~-]{16,512}$/.test(credential.credentialSecret);
  }
  function validCursor(cursor) {
    return typeof cursor === "string" &&
      /^[A-Za-z0-9._~-]{1,4096}$/.test(cursor);
  }
  function validRow(item, backendId) {
    return item && item.backendId === backendId &&
      typeof item.recordingId === "string" &&
      /^rec_[0-9a-f]{32}$/.test(item.recordingId) &&
      typeof item.title === "string" && item.title.length <= 4096 &&
      typeof item.description === "string" && item.description.length <= 65536 &&
      typeof item.recordedAt === "string" && item.recordedAt.length <= 64 &&
      Number.isInteger(item.durationSeconds) && item.durationSeconds >= 0 &&
      typeof item.durationKnown === "boolean" &&
      Number.isFinite(item.sizeMb) && item.sizeMb >= 0 &&
      (item.edited === undefined || typeof item.edited === "boolean");
  }
  function validPage(value, backendId, cursor) {
    if (!value || typeof value !== "object" || !Array.isArray(value.items) ||
        value.items.length > 100 || !value.page || typeof value.page !== "object" ||
        value.page.limit !== 100 || typeof value.page.hasMore !== "boolean" ||
        !value.meta || value.meta.partial !== false ||
        !value.items.every(function (item) { return validRow(item, backendId); }))
      return false;
    var next = value.page.nextCursor;
    if (value.page.hasMore) {
      if (!validCursor(next) || next === cursor || value.items.length !== 100) return false;
    } else if (next !== null) return false;
    var previousId = "";
    return value.items.every(function (item) {
      if (previousId && item.recordingId <= previousId) return false;
      previousId = item.recordingId;
      return true;
    });
  }
  function listRecordings(credential, backendId, cursor, done) {
    if (!validBackendId(backendId) ||
        (cursor !== null && cursor !== undefined && !validCursor(cursor))) {
      done({ok:false,kind:"bad_request"}); return;
    }
    if (!validCredential(credential) || typeof env.XMLHttpRequest !== "function") {
      done({ok:false,kind:"invalid_credential"}); return;
    }
    cancel();
    var ticket = serial;
    var xhr = new env.XMLHttpRequest();
    pending = xhr;
    var finished = false;
    function finish(value) {
      if (finished || ticket !== serial) return;
      finished = true;
      pending = null;
      done(value);
    }
    var path = "/api/v1/recordings?backendId=" + encodeURIComponent(backendId) +
      "&limit=100&sort=recordingId&order=asc";
    if (cursor) path += "&cursor=" + encodeURIComponent(cursor);
    var url = credential.base.replace(/\/$/, "") + path;
    try {
      xhr.open("GET", url, true);
      xhr.timeout = 8000;
      xhr.withCredentials = false;
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Cache-Control", "no-store");
      xhr.setRequestHeader("Authorization", "VDR-Suite-Device " +
        credential.credentialId + "." + credential.credentialSecret);
      xhr.onload = function () {
        if (xhr.responseURL && xhr.responseURL !== url) {
          finish({ok:false,kind:"bad_response"}); return;
        }
        if (xhr.status !== 200) {
          finish({ok:false,kind:"http",status:xhr.status}); return;
        }
        var value;
        try { value = JSON.parse(xhr.responseText); }
        catch (_) { finish({ok:false,kind:"bad_response"}); return; }
        if (!validPage(value, backendId, cursor)) {
          finish({ok:false,kind:"bad_response"}); return;
        }
        finish({ok:true,value:value});
      };
      xhr.onerror = function () { finish({ok:false,kind:"network"}); };
      xhr.ontimeout = function () { finish({ok:false,kind:"timeout"}); };
      xhr.send(null);
    } catch (_) { finish({ok:false,kind:"network"}); }
  }
  return {listRecordings:listRecordings,cancel:cancel};
}

export function recordingCatalogError(result) {
  if (!result) return "Unbekannter Fehler beim Abrufen der Aufnahmen.";
  if (result.kind === "invalid_credential")
    return "Keine gültige sichere Geräteanmeldung vorhanden. Unter Einstellungen prüfen.";
  if (result.kind === "bad_request")
    return "Ungültiges Backend oder ungültige Aufnahmenseite.";
  if (result.kind === "network")
    return "Server auf diesem TV nicht erreichbar (Netzwerk/TLS/CORS).";
  if (result.kind === "timeout") return "Zeitüberschreitung beim Laden der Aufnahmen.";
  if (result.kind === "bad_response")
    return "Aufnahmeantwort entspricht nicht dem Public-API-v1-Vertrag.";
  if (result.kind === "http") {
    if (result.status === 401)
      return "Geräteanmeldung abgewiesen. Bitte unter Einstellungen prüfen.";
    if (result.status === 403)
      return "Aufnahmezugriff verweigert. Im Webfrontend recordings.view für dieses Gerät und Backend freigeben.";
    if (result.status === 409)
      return "Aufnahmeliste wurde geändert. Bitte mit „Aufnahmen laden“ neu beginnen.";
    if (result.status === 503)
      return "Backend oder Aufnahmekatalog derzeit nicht verfügbar.";
    return "Serverfehler beim Abrufen der Aufnahmen (HTTP " + result.status + ").";
  }
  return "Aufnahmen konnten nicht geladen werden.";
}
