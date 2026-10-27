// S6.20: read saved epgsearch SearchTimers via Device Public-v1 only.
// Native timers, TimerAssignments and SearchTimers are three distinct resources.
export function createSearchTimerCatalog(environment) {
  var env=environment||{},pending=null,serial=0;
  function cancel() {
    serial++;
    if(pending && typeof pending.abort==="function")
      try {pending.abort();} catch (_) {}
    pending=null;
  }
  function backend(id) {
    return typeof id==="string" && /^[A-Za-z0-9._-]{1,128}$/.test(id);
  }
  function ruleId(id) {
    return typeof id==="string" && /^st_[0-9a-f]{32}$/.test(id);
  }
  function credential(c) {
    return c && typeof c.base==="string" &&
      /^https:\/\/[^\s/?#]+(?:\/[^?#]*)?$/.test(c.base) &&
      backend(c.credentialId) &&
      typeof c.credentialSecret==="string" &&
      /^[A-Za-z0-9._~-]{16,512}$/.test(c.credentialSecret);
  }
  function validItem(x,scope) {
    return x && ruleId(x.searchTimerId) && x.backendId===scope &&
      typeof x.name==="string" && x.name.length>0 && x.name.length<=1024 &&
      typeof x.query==="string" && x.query.length>0 && x.query.length<=1024 &&
      (x.state==="active" || x.state==="inactive" || x.state==="unknown");
  }
  function validList(x,scope) {
    if (!x || !Array.isArray(x.items) || x.items.length>30 ||
        !x.page || x.page.limit!==30 ||
        typeof x.page.hasMore!=="boolean" ||
        !x.meta || x.meta.partial!==false) return false;
    if(x.page.hasMore &&
        (x.items.length!==30 || typeof x.page.nextCursor!=="string" ||
         !/^st1_[0-9a-f]{2,2044}$/.test(x.page.nextCursor))) return false;
    if(!x.page.hasMore && x.page.nextCursor!==null)return false;
    var last="";
    return x.items.every(function(item){
      if(!validItem(item,scope) ||
          (last && item.searchTimerId<=last))return false;
      last=item.searchTimerId;return true;
    });
  }
  function validEvent(x) {
    return x && typeof x.title==="string" && x.title.length>0 &&
      x.title.length<=1024 &&
      typeof x.subtitle==="string" && x.subtitle.length<=2048 &&
      typeof x.channelId==="string" && x.channelId.length<=256 &&
      typeof x.startTime==="string" && x.startTime.length<=64 &&
      typeof x.endTime==="string" && x.endTime.length<=64;
  }
  function request(c,path,validate,done) {
    if(!credential(c) || typeof env.XMLHttpRequest!=="function") {
      done({ok:false,kind:"credential"});return;
    }
    cancel();
    var ticket=serial,xhr=new env.XMLHttpRequest(),finished=false;
    pending=xhr;
    function finish(value) {
      if(finished || ticket!==serial)return;
      finished=true;pending=null;done(value);
    }
    var url=c.base.replace(/\/$/,"")+path;
    try {
      xhr.open("GET",url,true);
      xhr.timeout=10000;
      xhr.withCredentials=false;
      xhr.setRequestHeader("Accept","application/json");
      xhr.setRequestHeader("Cache-Control","no-store");
      xhr.setRequestHeader("Authorization",
        "VDR-Suite-Device "+c.credentialId+"."+c.credentialSecret);
      xhr.onload=function() {
        if(xhr.responseURL && xhr.responseURL!==url) {
          finish({ok:false,kind:"response"});return;
        }
        if(xhr.status!==200) {
          finish({ok:false,kind:"http",status:xhr.status});return;
        }
        var json=null;
        try {json=JSON.parse(xhr.responseText);} catch (_) {}
        if(!validate(json)) {
          finish({ok:false,kind:"response"});return;
        }
        finish({ok:true,value:json});
      };
      xhr.onerror=function(){finish({ok:false,kind:"network"});};
      xhr.ontimeout=function(){finish({ok:false,kind:"timeout"});};
      xhr.send(null);
    }catch(_){finish({ok:false,kind:"network"});}
  }
  function list(c,scope,cursor,done) {
    if(!backend(scope) ||
       (cursor!==null && cursor!==undefined &&
       (typeof cursor!=="string" || !/^st1_[0-9a-f]{2,2044}$/.test(cursor)))) {
      done({ok:false,kind:"request"});return;
    }
    var path="/api/v1/search-timers?backend="+encodeURIComponent(scope)+"&limit=30";
    if(cursor)path+="&cursor="+encodeURIComponent(cursor);
    request(c,path,function(json){return validList(json,scope);},done);
  }
  function detail(c,scope,id,done) {
    if(!backend(scope) || !ruleId(id)) {
      done({ok:false,kind:"request"});return;
    }
    request(c,"/api/v1/search-timers/"+id+"?backend="+encodeURIComponent(scope),
      function(value){
        return validItem(value,scope) && value.searchTimerId===id &&
          value.meta && value.meta.partial===false;
      },done);
  }
  function preview(c,scope,id,done) {
    if(!backend(scope) || !ruleId(id)) {
      done({ok:false,kind:"request"});return;
    }
    request(c,"/api/v1/search-timers/"+id+
      "/preview?backend="+encodeURIComponent(scope)+"&limit=30",
      function(value) {
        return value && value.searchTimerId===id &&
          value.backendId===scope && Number.isInteger(value.totalCount) &&
          value.totalCount>=0 && Array.isArray(value.items) &&
          value.items.length<=30 && value.items.length<=value.totalCount &&
          value.items.every(validEvent) &&
          value.meta && value.meta.partial===false &&
          value.meta.epgInput==="ready";
      },done);
  }
  return {list:list,detail:detail,preview:preview,cancel:cancel};
}
export function searchTimerCatalogError(result,preview) {
  if(!result)return "Suchtimer konnten nicht gelesen werden.";
  if(result.kind==="http") {
    if(result.status===401)return "Geräteanmeldung abgewiesen (HTTP 401).";
    if(result.status===403)return preview ?
      "Treffervorschau nicht freigegeben: searchtimers.view UND epg.view erforderlich (HTTP 403)." :
      "Suchtimer nicht freigegeben: searchtimers.view für das Backend erforderlich (HTTP 403).";
    if(result.status===404)return "Suchtimer nicht mehr vorhanden oder API-v1-Endpunkt fehlt (HTTP 404). Neu laden.";
    if(result.status===503)return preview ?
      "EPG-Treffercache oder epgsearch nicht bereit (HTTP 503), keine leere Vorschau." :
      "epgsearch-Provider nicht erreichbar (HTTP 503), keine leere Liste.";
    if(result.status===400)return "API-v1-Suchtimerabfrage abgewiesen (HTTP 400).";
    return "Suchtimer-API HTTP "+result.status+".";
  }
  if(result.kind==="network")return "Suchtimer-Netzwerkzugriff/TLS/CORS fehlgeschlagen.";
  if(result.kind==="timeout")return "Zeitüberschreitung bei epgsearch.";
  if(result.kind==="response")return "Suchtimerantwort entspricht nicht dem Public-v1-Vertrag.";
  return "Ungültige Anfrage oder keine gültige Geräteanmeldung.";
}
