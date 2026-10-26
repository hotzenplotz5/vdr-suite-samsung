// Public API v1 metadata reads for the Samsung Device client.
// All calls use an explicit Device credential and backend-scoped grants.
// Never follow response-provided image URLs, redirects or native paths.
export function createPublicMediaMetadata(environment) {
  var env=environment || {};
  var pending=null, generation=0;
  function cancel() {
    generation++;
    if (pending && typeof pending.abort==="function") {
      try {pending.abort();} catch (_) {}
    }
    pending=null;
  }
  function backend(id) {return typeof id==="string" && /^[A-Za-z0-9._-]{1,128}$/.test(id);}
  function channel(id) {return typeof id==="string" && /^[A-Za-z0-9._-]{1,256}$/.test(id);}
  function recording(id) {return typeof id==="string" && /^rec_[0-9a-f]{32}$/.test(id);}
  function artworkId(id) {return typeof id==="string" && /^[0-9a-f]{32}$/.test(id);}
  function epoch(value) {return Number.isInteger(value) && value>=1000000000 && value<=999999999999;}
  function credentials(cred) {
    return cred && typeof cred.base==="string" &&
      /^https:\/\/[^\s/?#]+(?:\/[^?#]*)?$/.test(cred.base) &&
      typeof cred.credentialId==="string" &&
      /^[A-Za-z0-9._-]{1,128}$/.test(cred.credentialId) &&
      typeof cred.credentialSecret==="string" &&
      /^[A-Za-z0-9._~-]{16,512}$/.test(cred.credentialSecret);
  }
  function request(cred,path,binary,validate,done) {
    if (!credentials(cred) || typeof env.XMLHttpRequest!=="function") {
      done({ok:false,kind:"unavailable"});return;
    }
    cancel();
    var token=generation;
    var xhr=new env.XMLHttpRequest(),ended=false;
    pending=xhr;
    var url=cred.base.replace(/\/$/,"")+path;
    function finish(result) {
      if (ended || token!==generation) return;
      ended=true;pending=null;done(result);
    }
    try {
      xhr.open("GET",url,true);
      xhr.timeout=8000;
      xhr.withCredentials=false;
      if (binary) xhr.responseType="arraybuffer";
      xhr.setRequestHeader("Accept",binary?"image/jpeg, image/png, image/webp":"application/json");
      xhr.setRequestHeader("Cache-Control","no-store");
      xhr.setRequestHeader("Authorization","VDR-Suite-Device "+
        cred.credentialId+"."+cred.credentialSecret);
      xhr.onload=function() {
        if (xhr.responseURL && xhr.responseURL!==url) {
          finish({ok:false,kind:"response"});return;
        }
        if (xhr.status!==200) {
          finish({ok:false,kind:"http",status:xhr.status});return;
        }
        var data;
        if (binary) {
          var mime=typeof xhr.getResponseHeader==="function" ?
            (xhr.getResponseHeader("Content-Type")||"").split(";")[0].trim().toLowerCase() : "";
          var bytes=xhr.response;
          if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(mime) ||
              !bytes || typeof bytes.byteLength!=="number" ||
              bytes.byteLength<1 || bytes.byteLength>2*1024*1024) {
            finish({ok:false,kind:"response"});return;
          }
          data={bytes:bytes,contentType:mime};
        } else {
          try {data=JSON.parse(xhr.responseText);}
          catch (_) {finish({ok:false,kind:"response"});return;}
        }
        if (!validate(data)) {
          finish({ok:false,kind:"response"});return;
        }
        finish({ok:true,value:data});
      };
      xhr.onerror=function(){finish({ok:false,kind:"network"});};
      xhr.ontimeout=function(){finish({ok:false,kind:"timeout"});};
      xhr.send(null);
    } catch (_) {finish({ok:false,kind:"network"});}
  }
  function validEvent(item,ch) {
    if (!item || item.channelId!==ch || typeof item.title!=="string" ||
        item.title.length>4096 || (item.subtitle!==undefined &&
        (typeof item.subtitle!=="string" || item.subtitle.length>4096)) ||
        typeof item.startTime!=="string" || !/^\d{10,12}$/.test(item.startTime) ||
        typeof item.endTime!=="string" || !/^\d{10,12}$/.test(item.endTime) ||
        Number(item.endTime)<=Number(item.startTime) ||
        !Number.isInteger(item.durationSeconds) || item.durationSeconds<0) return false;
    return item.eventId===undefined ||
      (typeof item.eventId==="string" && /^[A-Za-z0-9._:-]{1,160}$/.test(item.eventId));
  }
  function nowNext(cred,bid,cid,from,done) {
    if (!backend(bid) || !channel(cid) || !epoch(from)) {
      done({ok:false,kind:"bad_request"});return;
    }
    var path="/api/v1/epg/now-next?backendId="+encodeURIComponent(bid)+
      "&channelId="+encodeURIComponent(cid)+"&fromTime="+from+"&limit=2";
    request(cred,path,false,function(data) {
      return data && data.backendId===bid && data.channelId===cid &&
        Array.isArray(data.items) && data.items.length<=2 &&
        data.items.every(function(e){return validEvent(e,cid);}) &&
        data.page && data.page.limit===2 && data.page.hasMore===false &&
        data.meta && data.meta.partial===false;
    },done);
  }
  function epgWindow(cred,bid,cid,from,until,cursor,done) {
    if (!backend(bid) || !channel(cid) || !epoch(from) || !epoch(until) ||
        until<=from || until-from>172800 ||
        (cursor!==null && cursor!==undefined &&
         (typeof cursor!=="string" || !/^[A-Za-z0-9._~-]{1,4096}$/.test(cursor)))) {
      done({ok:false,kind:"bad_request"});return;
    }
    var path="/api/v1/epg/window?backendId="+encodeURIComponent(bid)+
      "&channelId="+encodeURIComponent(cid)+"&fromTime="+from+
      "&untilTime="+until+"&limit=24";
    if(cursor)path+="&cursor="+encodeURIComponent(cursor);
    request(cred,path,false,function(data) {
      if (!data || data.backendId!==bid || data.channelId!==cid ||
          !Array.isArray(data.items) || data.items.length>24 ||
          !data.items.every(function(e){return validEvent(e,cid);}) ||
          !data.page || data.page.limit!==24 ||
          typeof data.page.hasMore!=="boolean" || !data.meta ||
          data.meta.partial!==false) return false;
      var next=data.page.nextCursor;
      return data.page.hasMore ?
        (typeof next==="string" && /^[A-Za-z0-9._~-]{1,4096}$/.test(next) &&
         next!==cursor) : next===null;
    },done);
  }
  // Native EPG event detail is a separate read: no guessed cache keys,
  // no timer mutation and no request without a proven source eventId.
  function eventDetail(cred,bid,cid,eid,done) {
    if (!backend(bid) || !channel(cid) ||
        typeof eid!=="string" || !/^[A-Za-z0-9._:-]{1,160}$/.test(eid)) {
      done({ok:false,kind:"bad_request"});return;
    }
    var path="/api/v1/epg/event?backendId="+encodeURIComponent(bid)+
      "&channelId="+encodeURIComponent(cid)+"&eventId="+encodeURIComponent(eid);
    request(cred,path,false,function(data) {
      return data && data.backendId===bid && data.channelId===cid &&
        data.eventId===eid && typeof data.title==="string" &&
        data.title.length>0 && data.title.length<=512 &&
        typeof data.subtitle==="string" && data.subtitle.length<=512 &&
        typeof data.description==="string" && data.description.length<=1536 &&
        typeof data.startTime==="string" && /^\d{10,12}$/.test(data.startTime) &&
        typeof data.endTime==="string" && /^\d{10,12}$/.test(data.endTime) &&
        Number(data.endTime)>Number(data.startTime) &&
        Number.isInteger(data.durationSeconds) && data.durationSeconds>=0;
    },done);
  }
  function recordingDetail(cred,bid,rid,done) {
    if (!backend(bid) || !recording(rid)) {
      done({ok:false,kind:"bad_request"});return;
    }
    request(cred,"/api/v1/recordings/"+rid+"?backendId="+encodeURIComponent(bid),
      false,function(data) {
        if (!data || data.backendId!==bid || data.recordingId!==rid ||
            typeof data.title!=="string" || data.title.length>4096 ||
            typeof data.description!=="string" || data.description.length>65536 ||
            typeof data.recordedAt!=="string" || data.recordedAt.length>64 ||
            !Number.isInteger(data.durationSeconds) || data.durationSeconds<0 ||
            typeof data.durationKnown!=="boolean" ||
            typeof data.sizeMb!=="number" || !isFinite(data.sizeMb) || data.sizeMb<0) return false;
        var meta=data.metadata;
        if (!meta || ["absent","partial","available"].indexOf(meta.state)<0 ||
            ["none","restfulapi-scraper-bridge","manual"].indexOf(meta.source)<0 ||
            ["unknown","movie","series","series-episode"].indexOf(meta.contentKind)<0) return false;
        var fields=["subtitle","seriesTitle","episodeTitle","genreText","overview","releaseDate","epgTitle","tagline"];
        return fields.every(function(field){return meta[field]===undefined ||
          (typeof meta[field]==="string" && meta[field].length<=16384);}) &&
          ["seasonNumber","episodeNumber"].every(function(field){return meta[field]===undefined ||
            (Number.isInteger(meta[field]) && meta[field]>=0 && meta[field]<=99999);});
      },done);
  }
  function artworkList(cred,bid,rid,done) {
    if (!backend(bid) || !recording(rid)) {
      done({ok:false,kind:"bad_request"});return;
    }
    request(cred,"/api/v1/recordings/"+rid+"/artwork?backendId="+encodeURIComponent(bid),
      false,function(data){
        return data && data.backendId===bid && data.recordingId===rid &&
          Array.isArray(data.items) && data.items.length<=32 &&
          data.items.every(function(item){
            return item && artworkId(item.artworkId) &&
              ["poster","fanart","banner","still"].indexOf(item.kind)>=0 &&
              (item.width===undefined ||
               (Number.isInteger(item.width)&&item.width>0&&item.width<=16384)) &&
              (item.height===undefined ||
               (Number.isInteger(item.height)&&item.height>0&&item.height<=16384));
          });
      },done);
  }
  function artworkBytes(cred,bid,rid,aid,done) {
    if (!backend(bid) || !recording(rid) || !artworkId(aid)) {
      done({ok:false,kind:"bad_request"});return;
    }
    request(cred,"/api/v1/recordings/"+rid+"/artwork/"+aid+
      "?backendId="+encodeURIComponent(bid),true,function(data){
        return !!(data && data.bytes && data.contentType);
      },done);
  }
  return {cancel:cancel,nowNext:nowNext,epgWindow:epgWindow,eventDetail:eventDetail,
    recordingDetail:recordingDetail,artworkList:artworkList,artworkBytes:artworkBytes};
}

export function mediaMetadataError(result) {
  if (!result) return "Metadaten nicht verfügbar.";
  if (result.kind==="http") {
    if (result.status===400) return "Anfrage nicht kompatibel mit dem Serververtrag (HTTP 400).";
    if (result.status===401) return "Geräteanmeldung abgewiesen.";
    if (result.status===403) return "Berechtigung fehlt: epg.view bzw. recordings.view.";
    if (result.status===404) return "EPG-Eintrag, Aufnahme oder Funktion auf diesem Server nicht vorhanden.";
    if (result.status===409) return "EPG-Zeitfenster hat sich geändert; bitte neu laden.";
    if (result.status===503) return "Backend oder Metadaten-Cache derzeit nicht verfügbar.";
    return "Public-v1-Metadaten HTTP "+result.status+".";
  }
  if (result.kind==="timeout") return "Metadaten-Zeitüberschreitung.";
  if (result.kind==="network") return "Metadaten: Netzwerk/TLS/CORS-Fehler.";
  if (result.kind==="response") return "Antwort verletzt den Public-v1-Metadatenvertrag.";
  return "Metadatenanfrage nicht möglich.";
}
