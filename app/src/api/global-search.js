// S6.21: common TV search backed by the SAME server-side GlobalSearchService
// as the Web frontend. This is an authorized Public-v1 projection, not a
// client-side substring scan of recordings or 14 days of EPG.
export function createPublicGlobalSearch(environment) {
  var env=environment||{},serial=0;
  var inflight={epg:null,recordings:null};
  function cancel() {
    serial++;
    ["epg","recordings"].forEach(function(kind){
      var old=inflight[kind];inflight[kind]=null;
      if(old && typeof old.abort==="function")try{old.abort();}catch(_){}
    });
  }
  function backend(value) {
    return typeof value==="string" && /^[A-Za-z0-9._-]{1,128}$/.test(value);
  }
  function credential(value) {
    return value && typeof value.base==="string" &&
      /^https:\/\/[^\s/?#]+(?:\/[^?#]*)?$/.test(value.base) &&
      backend(value.credentialId) &&
      typeof value.credentialSecret==="string" &&
      /^[A-Za-z0-9._~-]{16,512}$/.test(value.credentialSecret);
  }
  function searchText(value) {
    if(typeof value!=="string")return null;
    var text=value.trim();
    if(text.length<2 || /[\x00-\x1f\x7f]/.test(text))return null;
    // Backend checks encoded request length and decoded UTF-8 byte limits.
    try {
      if(typeof TextEncoder==="function") {
        if(new TextEncoder().encode(text).length>240)return null;
      } else if(unescape(encodeURIComponent(text)).length>240)return null;
      if(encodeURIComponent(text).length>360)return null;
    } catch(_){return null;}
    return text;
  }
  function validRow(item,scope,kind) {
    if(!item || item.kind!==kind || item.backendId!==scope ||
        typeof item.title!=="string" || !item.title ||
        item.title.length>4096)return false;
    if(kind==="recording")return /^rec_[0-9a-f]{32}$/.test(item.recordingId) &&
      typeof item.edited==="boolean";
    return typeof item.channelId==="string" && item.channelId.length>0 &&
      item.channelId.length<=256 &&
      typeof item.eventId==="string" && item.eventId.length>0 &&
      item.eventId.length<=160 &&
      typeof item.subtitle==="string" && item.subtitle.length<=2048 &&
      typeof item.startTime==="string" && item.startTime.length<=64 &&
      typeof item.endTime==="string" && item.endTime.length<=64;
  }
  function validPage(value,scope,kind,offset) {
    var page=value && value.page;
    if(!page || !Array.isArray(value.items) || value.items.length>30 ||
        page.limit!==30 || page.offset!==offset ||
        !Number.isInteger(page.totalCount) ||
        page.totalCount<offset+value.items.length ||
        typeof page.hasMore!=="boolean" ||
        page.hasMore!==(offset+value.items.length<page.totalCount))return false;
    return value.items.every(function(item){return validRow(item,scope,kind);});
  }
  function request(value,scope,term,kind,offset,done) {
    var normalized=searchText(term);
    if(!credential(value) || !backend(scope) || !normalized ||
        ["epg","recordings"].indexOf(kind)<0 ||
        !Number.isInteger(offset) || offset<0 || offset>1000000 ||
        typeof env.XMLHttpRequest!=="function") {
      done({ok:false,kind:"request"});return;
    }
    var old=inflight[kind];
    if(old && typeof old.abort==="function")try{old.abort();}catch(_){}
    var xhr=new env.XMLHttpRequest(),token=serial;
    inflight[kind]=xhr;
    var path="/api/v1/search/"+kind+"?backendId="+scope+
      "&query="+encodeURIComponent(normalized)+"&limit=30&offset="+offset;
    var url=value.base.replace(/\/$/,"")+path,finished=false;
    function finish(result) {
      if(finished || token!==serial || inflight[kind]!==xhr)return;
      finished=true;inflight[kind]=null;done(result);
    }
    try {
      xhr.open("GET",url,true);
      xhr.timeout=12000;
      xhr.withCredentials=false;
      xhr.setRequestHeader("Accept","application/json");
      xhr.setRequestHeader("Cache-Control","no-store");
      xhr.setRequestHeader("Authorization","VDR-Suite-Device "+
        value.credentialId+"."+value.credentialSecret);
      xhr.onload=function(){
        if(xhr.responseURL && xhr.responseURL!==url) {
          finish({ok:false,kind:"response"});return;
        }
        if(xhr.status!==200) {
          finish({ok:false,kind:"http",status:xhr.status});return;
        }
        var json=null;
        try{json=JSON.parse(xhr.responseText);}catch(_){}
        if(!validPage(json,scope,kind,offset)) {
          finish({ok:false,kind:"response"});return;
        }
        finish({ok:true,value:json});
      };
      xhr.onerror=function(){finish({ok:false,kind:"network"});};
      xhr.ontimeout=function(){finish({ok:false,kind:"timeout"});};
      xhr.send(null);
    }catch(_){finish({ok:false,kind:"network"});}
  }
  return {request:request,cancel:cancel,normalizeQuery:searchText};
}
export function publicGlobalSearchError(result,kind) {
  var scope=kind==="epg"?"EPG":"Aufnahmen";
  if(!result)return scope+"-Suche fehlgeschlagen.";
  if(result.kind==="http"){
    if(result.status===401)return "Geräteanmeldung abgewiesen (HTTP 401).";
    if(result.status===403)return kind==="epg" ?
      "EPG-Suche benötigt epg.view für dieses Backend (HTTP 403)." :
      "Aufnahmesuche benötigt recordings.view für dieses Backend (HTTP 403).";
    if(result.status===503)return scope+
      "-Suchindex/Backend nicht verfügbar (HTTP 503), nicht als 0 Treffer behandeln.";
    if(result.status===404)return "Öffentlicher Suchendpunkt fehlt auf diesem Backend (HTTP 404).";
    if(result.status===400)return "Suchbegriff oder Parameter abgewiesen (HTTP 400).";
    return scope+"-Suche HTTP "+result.status+".";
  }
  if(result.kind==="timeout")return scope+"-Suche hat zu lange gedauert.";
  if(result.kind==="network")return scope+"-Suche durch Netzwerk/TLS/CORS blockiert.";
  if(result.kind==="response")return "Suchantwort entspricht nicht dem Public-v1-Vertrag.";
  return "Mindestens zwei Zeichen eingeben und bestehende Anmeldung prüfen.";
}
