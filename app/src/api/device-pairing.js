// Anonymous Public-v1 pairing / Device authorization. Never log token or credential.
export function pairingError(kind, status) {
  if (kind === "network") return "TV kann den Server nicht erreichen (TLS, DNS oder CORS).";
  if (kind === "timeout") return "Zeitüberschreitung. Den Status erneut prüfen; keine blinden POST-Wiederholungen.";
  if (kind === "bad_response") return "Unerwartete Antwort des Public-v1-Servers.";
  if (kind === "cancelled") return "Vorgang abgebrochen.";
  if (kind === "http") {
    if (status === 401) return "Kopplungstoken ungültig oder Geräteanmeldung abgewiesen.";
    if (status === 404) return "Kopplung nicht mehr vorhanden. Neu beginnen.";
    if (status === 409) return "Kopplung bereits verbraucht oder nicht freigegeben. Nicht erneut ausstellen.";
    if (status === 410) return "Kopplung abgelaufen. Neu beginnen.";
    if (status === 503) return "Serverdienst vorübergehend nicht verfügbar.";
    return "Server antwortet mit HTTP " + status + ".";
  }
  return "Kopplungsanfrage fehlgeschlagen.";
}

// Device verification is distinct from short-lived bootstrap pairing errors.
export function deviceVerificationError(result) {
  if (result && result.kind === "http" && result.status === 401)
    return "HTTP 401: Device-Credential serverseitig abgewiesen (ungültig, abgelaufen oder widerrufen).";
  if (result && result.kind === "http" && result.status === 403)
    return "HTTP 403: Gerätezugriff verweigert. Berechtigungen prüfen.";
  return pairingError(result && result.kind, result && result.status);
}

export function createPairingClient(environment) {
  var env = environment || {};
  var request = null;
  var generation = 0;
  function cancel() {
    generation += 1;
    if (request && typeof request.abort === "function") {
      try { request.abort(); } catch (_) {}
    }
    request = null;
  }
  function validId(id) {
    return typeof id === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(id);
  }
  function call(base, method, path, headers, body, callback) {
    if (!/^https:\/\//.test(base || "") || typeof env.XMLHttpRequest !== "function") {
      callback({ok:false,kind:"bad_response"}); return;
    }
    var round = ++generation;
    var xhr = new env.XMLHttpRequest();
    request = xhr;
    var finished = false;
    function done(value) {
      if (finished || round !== generation) return;
      finished = true; request = null; callback(value);
    }
    try {
      xhr.open(method, base + path, true);
      xhr.timeout = 8000;
      xhr.withCredentials = false;
      xhr.setRequestHeader("Accept","application/json");
      xhr.setRequestHeader("Cache-Control","no-store");
      if (body !== null) xhr.setRequestHeader("Content-Type","application/json");
      Object.keys(headers || {}).forEach(function (key) {
        xhr.setRequestHeader(key, headers[key]);
      });
      xhr.onload = function () {
        if (xhr.responseURL && xhr.responseURL !== base + path) {
          done({ok:false,kind:"bad_response"}); return;
        }
        var expected = method === "POST" ? 201 : 200;
        if (xhr.status !== expected) {
          done({ok:false,kind:"http",status:xhr.status}); return;
        }
        var data;
        try { data = JSON.parse(xhr.responseText); } catch (_) {
          done({ok:false,kind:"bad_response"}); return;
        }
        done({ok:true,value:data});
      };
      xhr.onerror = function () { done({ok:false,kind:"network"}); };
      xhr.ontimeout = function () { done({ok:false,kind:"timeout"}); };
      xhr.send(body === null ? null : JSON.stringify(body));
    } catch (_) { done({ok:false,kind:"network"}); }
  }
  function create(base, callback) {
    call(base,"POST","/api/v1/device-pairings",{},{
      displayName:"Samsung TV · VDR-Suite",
      clientKind:"samsung",
      appVersion:"0.1.0"
    },function (result) {
      if (!result.ok) { callback(result); return; }
      var p = result.value;
      if (!p || !validId(p.pairingRequestId) ||
          typeof p.userCode !== "string" || p.userCode.length < 4 || p.userCode.length > 64 ||
          typeof p.pairingToken !== "string" || !p.pairingToken ||
          p.status !== "pending" || typeof p.expiresAt !== "string" ||
          !Number.isInteger(p.pollIntervalSeconds) ||
          p.pollIntervalSeconds < 1 || p.pollIntervalSeconds > 120) {
        callback({ok:false,kind:"bad_response"}); return;
      }
      callback({ok:true,pairing:{
        id:p.pairingRequestId,token:p.pairingToken,
        code:p.userCode,expiresAt:p.expiresAt,interval:p.pollIntervalSeconds
      }});
    });
  }
  function poll(base, pairing, callback) {
    if (!pairing || !validId(pairing.id) || !pairing.token) {
      callback({ok:false,kind:"bad_response"}); return;
    }
    call(base,"GET","/api/v1/device-pairings/"+encodeURIComponent(pairing.id),
      {"X-VDR-Suite-Pairing-Token":pairing.token},null,function (result) {
      if (!result.ok) { callback(result); return; }
      var data = result.value;
      if (!data || !validId(data.pairingRequestId) ||
          data.pairingRequestId !== pairing.id ||
          ["pending","approved","rejected"].indexOf(data.status) < 0) {
        callback({ok:false,kind:"bad_response"}); return;
      }
      callback({ok:true,status:data.status});
    });
  }
  function issue(base, pairing, callback) {
    if (!pairing || !validId(pairing.id) || !pairing.token) {
      callback({ok:false,kind:"bad_response"}); return;
    }
    call(base,"POST","/api/v1/device-pairings/"+encodeURIComponent(pairing.id)+"/credential",
      {"X-VDR-Suite-Pairing-Token":pairing.token},null,function (result) {
      if (!result.ok) { callback(result); return; }
      var d=result.value;
      if (!d || !validId(d.actorId) || !validId(d.deviceId) ||
          !validId(d.credentialId) || typeof d.credentialSecret !== "string" ||
          !/^[A-Za-z0-9._~-]{16,512}$/.test(d.credentialSecret)) {
        callback({ok:false,kind:"bad_response"}); return;
      }
      callback({ok:true,credential:{
        actorId:d.actorId,deviceId:d.deviceId,
        credentialId:d.credentialId,credentialSecret:d.credentialSecret,
        base:base
      }});
    });
  }
  function verify(credential, callback) {
    if (!credential || !validId(credential.credentialId) ||
        typeof credential.credentialSecret !== "string") {
      callback({ok:false,kind:"bad_response"});return;
    }
    call(credential.base,"GET","/api/v1",{
      Authorization:"VDR-Suite-Device "+credential.credentialId+"."+credential.credentialSecret
    },null,function (result) {
      if (!result.ok) { callback(result); return; }
      var v=result.value;
      if (!v || v.apiVersion !== "v1" || !v.authentication ||
          v.authentication.authenticated !== true) {
        callback({ok:false,kind:"bad_response"}); return;
      }
      callback({ok:true});
    });
  }
  return {create:create,poll:poll,issue:issue,verify:verify,cancel:cancel};
}
