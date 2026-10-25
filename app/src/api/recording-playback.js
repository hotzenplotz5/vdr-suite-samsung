// S5.1 experimental Device-owned Recording playback. No Browser/private API.
function validId(value,prefix) {
  return typeof value === "string" &&
    new RegExp("^"+prefix+"_[0-9a-f]{32}$").test(value);
}
function validBase(base) {
  return typeof base === "string" &&
    /^https:\/\/[^\s/?#]+(?:\/[^?#]*)?$/.test(base);
}
export function createRecordingPlaybackClient(environment) {
  var env = environment || {};
  var pending = null;
  var generation = 0;
  function cancel() {
    generation += 1;
    if (pending && typeof pending.abort === "function") {
      try { pending.abort(); } catch (_) {}
    }
    pending = null;
  }
  function credentialsOk(credential) {
    return credential && validBase(credential.base) &&
      /^[A-Za-z0-9._-]{1,128}$/.test(credential.credentialId) &&
      /^[A-Za-z0-9._~-]{16,512}$/.test(credential.credentialSecret);
  }
  function request(credential,path,method,payload,done) {
    if (!credentialsOk(credential) || typeof env.XMLHttpRequest !== "function") {
      done({ok:false,kind:"unavailable"}); return;
    }
    cancel();
    var ticket = generation;
    var xhr = new env.XMLHttpRequest();
    pending = xhr;
    var finished = false;
    var url = credential.base.replace(/\/$/,"") + path;
    function finish(result) {
      if (finished || ticket !== generation) return;
      finished = true;
      pending = null;
      done(result);
    }
    try {
      xhr.open(method,url,true);
      xhr.timeout = 15000;
      // Device media cookies are HttpOnly, never JS-readable; the TV's network
      // stack must accept Set-Cookie. AVPlay cookie sharing is a hardware gate.
      xhr.withCredentials = true;
      xhr.setRequestHeader("Accept","application/json");
      xhr.setRequestHeader("Content-Type","application/json");
      xhr.setRequestHeader("Cache-Control","no-store");
      xhr.setRequestHeader("Authorization","VDR-Suite-Device " +
        credential.credentialId + "." + credential.credentialSecret);
      xhr.onload = function () {
        if (xhr.responseURL && xhr.responseURL !== url) {
          finish({ok:false,kind:"response"}); return;
        }
        if (xhr.status !== (method === "POST" && path.endsWith("/stop") ? 200 : 201) &&
            !(path.endsWith("/stop") && xhr.status === 204)) {
          finish({ok:false,kind:"http",status:xhr.status}); return;
        }
        var body;
        try {body = JSON.parse(xhr.responseText);} catch (_) {body = null;}
        finish({ok:true,value:body});
      };
      xhr.onerror = function () {finish({ok:false,kind:"network"});};
      xhr.ontimeout = function () {finish({ok:false,kind:"timeout"});};
      xhr.send(JSON.stringify(payload));
    } catch (_) {finish({ok:false,kind:"network"});}
  }
  function begin(credential,backendId,recordingId,capabilities,done) {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(backendId) ||
        !validId(recordingId,"rec") ||
        !capabilities || typeof capabilities !== "object") {
      done({ok:false,kind:"bad_request"}); return;
    }
    request(credential,"/api/v1/recording-playback-sessions","POST",
      {backendId:backendId,recordingId:recordingId,capabilities:capabilities},
      function (result) {
        if (!result.ok) {done(result); return;}
        var session=result.value && result.value.mediaSession;
        if (!session || !validId(session.id,"ms") ||
            session.backendId !== backendId || session.recordingId !== recordingId ||
            typeof session.mediaPath !== "string") {
          done({ok:false,kind:"response"}); return;
        }
        // Do not trust redirect URLs, native paths or a different server.
        var path = session.mediaPath;
        var base = credential.base.replace(/\/$/,"");
        var origin = base.match(/^https:\/\/[^\/]+/);
        if (!origin || !path.startsWith("/") || path.includes("?") ||
            path.includes("#") || path.includes("..") || path.includes("\\") ||
            !path.includes("/api/v1/media/sessions/"+session.id+"/") ||
            !/\/(?:hls\/master\.m3u8|recording\/stream\.(?:ts|mp4))$/.test(path)) {
          done({ok:false,kind:"response"}); return;
        }
        var prefix = base.slice(origin[0].length);
        if (!path.startsWith(prefix+"/api/v1/media/sessions/"+session.id+"/")) {
          done({ok:false,kind:"response"}); return;
        }
        done({ok:true,sessionId:session.id,mediaUrl:origin[0]+path,
          profile:session.presentationProfileId || ""});
      });
  }
  function stop(credential,backendId,sessionId,done) {
    if (!validId(sessionId,"ms") || !/^[A-Za-z0-9._-]{1,128}$/.test(backendId)) {
      done({ok:false,kind:"bad_request"}); return;
    }
    request(credential,"/api/v1/recording-playback-sessions/"+sessionId+"/stop",
      "POST",{operation:"stop",backendId:backendId,sessionId:sessionId},done);
  }
  return {begin:begin,stop:stop,cancel:cancel};
}
export function recordingPlaybackError(result) {
  if (!result) return "Unbekannter Wiedergabefehler.";
  if (result.kind === "http") {
    if (result.status === 401) return "Geräteanmeldung abgewiesen.";
    if (result.status === 403) return "Wiedergabe nicht freigegeben: media.recording.play für dieses Gerät/Backend erteilen.";
    if (result.status === 409 || result.status === 422)
      return "Aufnahmeprofil, Index oder Decoder-Konfiguration nicht verfügbar.";
    return "MediaSession-HTTP-Fehler " + result.status + ".";
  }
  if (result.kind === "timeout") return "MediaSession-Anfrage: Zeitüberschreitung.";
  if (result.kind === "network") return "TV-Netzwerk/TLS/CORS hat die MediaSession-Anfrage abgewiesen.";
  if (result.kind === "response") return "Serverantwort/Medienpfad widerspricht dem Sicherheitsvertrag.";
  if (result.kind === "unavailable") return "Gespeicherte Geräteanmeldung oder Netzwerk nicht verfügbar.";
  return "Ungültige Wiedergabeanfrage.";
}
