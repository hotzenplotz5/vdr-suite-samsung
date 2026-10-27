// S6.19: read-only Public v1 snapshot of real native VDR timers.
// Separate from Suite TimerAssignments and epgsearch SearchTimers.
export function createNativeTimerCatalog(environment) {
  var env=environment || {};
  var pending=null,serial=0;
  function cancel() {
    serial++;
    if (pending && typeof pending.abort==="function")
      try {pending.abort();} catch (_) {}
    pending=null;
  }
  function safeBackend(value) {
    return typeof value==="string" && /^[A-Za-z0-9._-]{1,128}$/.test(value);
  }
  function validCredential(c) {
    return c && typeof c.base==="string" &&
      /^https:\/\/[^\s/?#]+(?:\/[^?#]*)?$/.test(c.base) &&
      safeBackend(c.credentialId) &&
      typeof c.credentialSecret==="string" &&
      /^[A-Za-z0-9._~-]{16,512}$/.test(c.credentialSecret);
  }
  function validItem(item) {
    return item && typeof item==="object" &&
      typeof item.timerId==="string" && item.timerId.length>0 &&
      item.timerId.length<=512 &&
      typeof item.channelId==="string" && item.channelId.length<=512 &&
      typeof item.channelName==="string" && item.channelName.length<=512 &&
      typeof item.title==="string" && item.title.length<=2048 &&
      typeof item.day==="string" && item.day.length<=32 &&
      typeof item.weekdays==="string" && item.weekdays.length<=32 &&
      typeof item.startTime==="string" && item.startTime.length<=16 &&
      typeof item.endTime==="string" && item.endTime.length<=16 &&
      typeof item.enabled==="boolean" && typeof item.recording==="boolean" &&
      typeof item.pending==="boolean";
  }
  function validPage(value,backendId,offset) {
    var page=value && value.page;
    return value && value.backendId===backendId &&
      Array.isArray(value.items) && value.items.length<=30 &&
      value.items.every(validItem) &&
      page && page.limit===30 && page.offset===offset &&
      typeof page.hasMore==="boolean" &&
      (page.hasMore ?
        Number.isInteger(page.nextOffset) &&
          page.nextOffset===offset+value.items.length &&
          page.nextOffset>offset && page.nextOffset<=100000 :
        page.nextOffset===null) &&
      value.meta && value.meta.partial===false;
  }
  function list(credential,backendId,offset,done) {
    if (!validCredential(credential) || !safeBackend(backendId) ||
        !Number.isInteger(offset) || offset<0 || offset>100000 ||
        typeof env.XMLHttpRequest!=="function") {
      done({ok:false,kind:"invalid_request"});return;
    }
    cancel();
    var generation=serial;
    var path="/api/v1/native-timers?backendId="+encodeURIComponent(backendId)+
      "&offset="+offset+"&limit=30";
    var url=credential.base.replace(/\/$/,"")+path;
    var xhr=new env.XMLHttpRequest();
    pending=xhr;
    var finished=false;
    function finish(result) {
      if(finished || generation!==serial)return;
      finished=true;pending=null;done(result);
    }
    try {
      xhr.open("GET",url,true);
      xhr.timeout=8000;
      xhr.withCredentials=false;
      xhr.setRequestHeader("Accept","application/json");
      xhr.setRequestHeader("Cache-Control","no-store");
      xhr.setRequestHeader("Authorization","VDR-Suite-Device "+
        credential.credentialId+"."+credential.credentialSecret);
      xhr.onload=function() {
        if(xhr.responseURL && xhr.responseURL!==url) {
          finish({ok:false,kind:"bad_response"});return;
        }
        if(xhr.status!==200) {
          finish({ok:false,kind:"http",status:xhr.status});return;
        }
        var response;
        try {response=JSON.parse(xhr.responseText);} catch (_) {
          finish({ok:false,kind:"bad_response"});return;
        }
        if(!validPage(response,backendId,offset)) {
          finish({ok:false,kind:"bad_response"});return;
        }
        finish({ok:true,value:response});
      };
      xhr.onerror=function(){finish({ok:false,kind:"network"});};
      xhr.ontimeout=function(){finish({ok:false,kind:"timeout"});};
      xhr.send(null);
    } catch (_) {finish({ok:false,kind:"network"});}
  }
  return {list:list,cancel:cancel};
}
export function nativeTimerCatalogError(result) {
  if (!result) return "Unbekannter Timerfehler.";
  if(result.kind==="http") {
    if(result.status===401)return "Geräteanmeldung für Timer abgewiesen (HTTP 401).";
    if(result.status===403)return "Timerzugriff verweigert: timers.view für dieses Backend freigeben (HTTP 403).";
    if(result.status===404)return "Dieser API-v1-Server hat noch keinen Native-Timer-Leseendpunkt (HTTP 404).";
    if(result.status===503)return "VDR-Timer-Snapshot nicht erreichbar (HTTP 503). Nicht als leere Timerliste anzeigen.";
    return "Timer-API HTTP "+result.status+".";
  }
  if(result.kind==="bad_response")return "Timer-Antwort weicht vom Public-v1-Vertrag ab.";
  if(result.kind==="timeout")return "Zeitüberschreitung beim Lesen der Timer.";
  if(result.kind==="network")return "Timer-API durch Netzwerk/TLS/CORS nicht erreichbar.";
  return "Timer-Zugriff nicht vorbereitet; bestehende Geräteanmeldung prüfen.";
}
