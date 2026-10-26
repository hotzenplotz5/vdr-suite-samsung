// Public API v1: bounded, device-authenticated backend and channel reads.
// Never store or log credentials. A Server grant is the only authority.
export function createChannelCatalog(environment) {
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
  function validPage(value) {
    return value && typeof value === "object" && Array.isArray(value.items) &&
      value.page && typeof value.page === "object" &&
      typeof value.page.hasMore === "boolean" &&
      (value.page.nextCursor === null ||
        (typeof value.page.nextCursor === "string" &&
         value.page.nextCursor.length > 0 && value.page.nextCursor.length <= 4096)) &&
      (!value.page.hasMore || typeof value.page.nextCursor === "string") &&
      value.meta && typeof value.meta.partial === "boolean";
  }
  function fetchPage(credential, path, validate, callback) {
    if (!validCredential(credential) || typeof env.XMLHttpRequest !== "function") {
      callback({ok:false,kind:"invalid_credential"}); return;
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
      callback(value);
    }
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
        if (!validPage(value) || !validate(value)) {
          finish({ok:false,kind:"bad_response"}); return;
        }
        finish({ok:true,value:value});
      };
      xhr.onerror = function () { finish({ok:false,kind:"network"}); };
      xhr.ontimeout = function () { finish({ok:false,kind:"timeout"}); };
      xhr.send(null);
    } catch (_) { finish({ok:false,kind:"network"}); }
  }
  function listBackends(credential, callback) {
    fetchPage(credential, "/api/v1/backends?limit=30&sort=backendId&order=asc",
      function (value) {
        return value.items.length <= 30 && value.items.every(function (item) {
          return item && validBackendId(item.backendId) &&
            typeof item.name === "string" &&
            typeof item.enabled === "boolean" && typeof item.online === "boolean";
        });
      }, callback);
  }
  function listChannels(credential, backendId, cursor, callback) {
    if (!validBackendId(backendId) ||
        (cursor !== null && cursor !== undefined &&
         (typeof cursor !== "string" || !cursor || cursor.length > 4096))) {
      callback({ok:false,kind:"bad_request"}); return;
    }
    var path = "/api/v1/channels?backendId=" + encodeURIComponent(backendId) +
      "&limit=20&sort=backendId,channelNumber,channelId&order=asc";
    if (cursor) path += "&cursor=" + encodeURIComponent(cursor);
    fetchPage(credential, path, function (value) {
      return value.items.length <= 20 &&
        value.meta && Array.isArray(value.meta.sources) &&
        value.items.every(function (item) {
          return item && item.backendId === backendId &&
            typeof item.channelId === "string" && item.channelId.length > 0 &&
            item.channelId.length <= 256 &&
            Number.isInteger(item.channelNumber) && item.channelNumber >= 0 &&
            typeof item.name === "string" &&
            typeof item.provider === "string" && typeof item.groupName === "string" &&
            typeof item.radio === "boolean" && typeof item.encrypted === "boolean" &&
            typeof item.enabled === "boolean";
        });
    }, callback);
  }
  return {listBackends:listBackends, listChannels:listChannels, cancel:cancel};
}

export function channelCatalogError(result) {
  if (!result) return "Unbekannter Fehler beim Senderabruf.";
  if (result.kind === "invalid_credential") return "Keine gültige sichere Geräteanmeldung vorhanden.";
  if (result.kind === "bad_request") return "Ungültige Backend- oder Seitenanforderung.";
  if (result.kind === "timeout") return "Zeitüberschreitung beim Senderabruf.";
  if (result.kind === "network") return "Server auf diesem TV nicht erreichbar (Netzwerk/TLS/CORS).";
  if (result.kind === "bad_response") return "Antwort entspricht nicht dem Public-API-v1-Vertrag.";
  if (result.kind === "http") {
    if (result.status === 400) return "Dieser Server unterstützt die numerische VDR-Senderreihenfolge noch nicht (HTTP 400). Installierten API-v1-Stand prüfen; kein stiller Rückfall auf falsche Sortierung.";
    if (result.status === 401) return "Geräteanmeldung abgewiesen: Credential ungültig, abgelaufen oder widerrufen. Administrator kontaktieren.";
    if (result.status === 403) return "Senderzugriff verweigert. Der Administrator muss channels.view für dieses Backend freigeben.";
    if (result.status === 409) return "Senderliste hat sich geändert. Bitte mit „Sender laden“ neu beginnen.";
    if (result.status === 503) return "Backend oder Berechtigungsdienst derzeit nicht verfügbar.";
    return "Serverfehler beim Senderabruf (HTTP " + result.status + ").";
  }
  return "Sender konnten nicht geladen werden.";
}
