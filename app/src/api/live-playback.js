// S6.18: Device-owned, explicitly requested Public-v1 Live-TV session.
// No Browser/private media endpoint, query token or untrusted provider URL.
function safeId(value,prefix) {
  return typeof value==="string" &&
    new RegExp("^"+prefix+"_[0-9a-f]{32}$").test(value);
}
function validCredential(c) {
  return c && typeof c.base==="string" &&
    /^https:\/\/[^\s/?#]+(?:\/[^?#]*)?$/.test(c.base) &&
    /^[A-Za-z0-9._-]{1,128}$/.test(c.credentialId) &&
    /^[A-Za-z0-9._~-]{16,512}$/.test(c.credentialSecret);
}
function safeBackend(value) {
  return typeof value==="string" && /^[A-Za-z0-9._-]{1,128}$/.test(value);
}
function safeChannel(value) {
  return typeof value==="string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
}
export function createLivePlaybackClient(environment) {
  var env=environment || {};
  function send(credential,path,payload,success,done) {
    if (!validCredential(credential) || typeof env.XMLHttpRequest!=="function") {
      done({ok:false,kind:"unavailable"});return;
    }
    var url=credential.base.replace(/\/$/,"")+path;
    var xhr=new env.XMLHttpRequest();
    var finished=false;
    function finish(result) {
      if (finished) return;
      finished=true;
      done(result);
    }
    try {
      xhr.open("POST",url,true);
      xhr.timeout=15000;
      xhr.withCredentials=true; // HttpOnly cookie, not JavaScript-visible
      xhr.setRequestHeader("Accept","application/json");
      xhr.setRequestHeader("Content-Type","application/json");
      xhr.setRequestHeader("Cache-Control","no-store");
      xhr.setRequestHeader("Authorization","VDR-Suite-Device "+
        credential.credentialId+"."+credential.credentialSecret);
      xhr.onload=function() {
        if (xhr.responseURL && xhr.responseURL!==url) {
          finish({ok:false,kind:"response"});return;
        }
        if (xhr.status!==success && !(success===200 && xhr.status===204)) {
          finish({ok:false,kind:"http",status:xhr.status});return;
        }
        var value=null;
        try {value=JSON.parse(xhr.responseText);} catch (_) {}
        if (success===201 && !value) {
          finish({ok:false,kind:"response"});return;
        }
        finish({ok:true,value:value});
      };
      xhr.onerror=function(){finish({ok:false,kind:"network"});};
      xhr.ontimeout=function(){finish({ok:false,kind:"timeout"});};
      xhr.send(JSON.stringify(payload));
    } catch (_) {finish({ok:false,kind:"network"});}
  }
  function stop(credential,backendId,sessionId,done) {
    if (!safeBackend(backendId) || !safeId(sessionId,"ms")) {
      done({ok:false,kind:"bad_request"});return;
    }
    send(credential,"/api/v1/live-playback-sessions/"+sessionId+"/stop",
      {operation:"stop",resourceKind:"live-channel",backendId:backendId,
        sessionId:sessionId},200,done);
  }
  function begin(credential,backendId,channelId,capabilities,done) {
    if (!safeBackend(backendId) || !safeChannel(channelId) ||
        !capabilities || typeof capabilities!=="object" ||
        !Array.isArray(capabilities.protocols) ||
        capabilities.protocols.length!==1 ||
        capabilities.protocols[0]!=="progressive") {
      done({ok:false,kind:"bad_request"});return;
    }
    // One deliberate Device CREATE. No replacesSessionId, URL bearer or retry.
    send(credential,"/api/v1/live-playback-sessions",
      {resourceKind:"live-channel",backendId:backendId,channelId:channelId,
        capabilities:capabilities},201,function(result){
      if (!result.ok) {done(result);return;}
      var session=result.value && result.value.mediaSession;
      if (!session || !safeId(session.id,"ms") ||
          session.resourceKind!=="live-channel" ||
          session.backendId!==backendId || session.channelId!==channelId ||
          session.state!=="ready" || typeof session.mediaPath!=="string") {
        // If a valid own-session identity exists, relinquish the server lease.
        if (session && safeId(session.id,"ms") &&
            session.backendId===backendId && session.channelId===channelId) {
          stop(credential,backendId,session.id,function(){
            done({ok:false,kind:"response"});
          });
        } else done({ok:false,kind:"response"});
        return;
      }
      var base=credential.base.replace(/\/$/,"");
      var origin=base.match(/^https:\/\/[^/]+/);
      var prefix=origin ? base.slice(origin[0].length) : "";
      var expected=prefix+"/api/v1/media/sessions/"+session.id+
        "/live/stream.mp4";
      if (!origin || session.mediaPath!==expected ||
          session.presentationProfileId!=="live-progressive-fmp4") {
        stop(credential,backendId,session.id,function(){
          done({ok:false,kind:"response"});
        });
        return;
      }
      done({ok:true,sessionId:session.id,mediaUrl:origin[0]+expected,
        profile:session.presentationProfileId});
    });
  }
  return {begin:begin,stop:stop};
}
export function livePlaybackError(result) {
  if (!result) return "Unbekannter Live-TV-Fehler.";
  if (result.kind==="http") {
    if (result.status===401) return "Geräteanmeldung abgewiesen.";
    if (result.status===403) return "Live-TV nicht freigegeben: media.live.play für Gerät und Backend erforderlich.";
    if (result.status===400) return "Public-v1-Live-Vertrag/Client-Fähigkeiten vom Server abgewiesen.";
    if (result.status===409 || result.status===422 || result.status===503)
      return "Live-Provider/Transcoder/Tuner nicht verfügbar (HTTP "+result.status+").";
    return "Live-MediaSession HTTP "+result.status+".";
  }
  if (result.kind==="response") return "Live-MediaSession/Medienpfad widerspricht dem öffentlichen Vertrag.";
  if (result.kind==="timeout") return "Live-MediaSession hat nicht rechtzeitig geantwortet; Server-Lease prüfen.";
  if (result.kind==="network") return "Live-API auf dem TV durch Netzwerk/TLS/CORS blockiert.";
  return "Live-TV-Anfrage ungültig oder Geräteanmeldung nicht lesbar.";
}
