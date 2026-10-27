// S8.2: deliberately confirmed one-shot EPG TimerIntent through Public API v1.
// No native timer specs, private routes, automatic POST retries or scheduling claims.
export function createEpgTimerIntents(environment) {
  var env=environment||{},read=null,serial=0,postPending=false;
  function cancel() {
    serial++;
    if(read && typeof read.abort==="function")try{read.abort();}catch(_){}
    read=null;
    // Never abort/retry an in-flight CREATE on navigation: its outcome may be unknown.
  }
  function safeBackend(v){return typeof v==="string" && /^[A-Za-z0-9._-]{1,128}$/.test(v);}
  function safeChannel(v){return typeof v==="string" && /^[A-Za-z0-9._-]{1,256}$/.test(v);}
  function safeEvent(v){return typeof v==="string" && /^[A-Za-z0-9._:-]{1,160}$/.test(v);}
  function credOk(c){return c && typeof c.base==="string" &&
    /^https:\/\/[^\s/?#]+(?:\/[^?#]*)?$/.test(c.base) &&
    safeBackend(c.credentialId) &&
    typeof c.credentialSecret==="string" &&
    /^[A-Za-z0-9._~-]{16,512}$/.test(c.credentialSecret);}
  function strongTag(v){return typeof v==="string" &&
    /^"[\x21\x23-\x7e]{1,220}"$/.test(v);}
  function request(c,method,path,body,headers,done) {
    if(!credOk(c)||typeof env.XMLHttpRequest!=="function"){
      done({ok:false,kind:"request"});return null;
    }
    var xhr=new env.XMLHttpRequest(),url=c.base.replace(/\/$/,"")+path;
    try{
      xhr.open(method,url,true);xhr.timeout=12000;xhr.withCredentials=false;
      xhr.setRequestHeader("Authorization","VDR-Suite-Device "+
        c.credentialId+"."+c.credentialSecret);
      xhr.setRequestHeader("Accept","application/json");
      xhr.setRequestHeader("Cache-Control","no-store");
      Object.keys(headers||{}).forEach(function(k){xhr.setRequestHeader(k,headers[k]);});
      xhr.onload=function(){
        if(xhr.responseURL && xhr.responseURL!==url){
          done({ok:false,kind:"redirect"});return;
        }
        var data=null;
        if(xhr.responseText)try{data=JSON.parse(xhr.responseText);}catch(_){}
        done({ok:xhr.status===200||xhr.status===202,
          status:xhr.status,data:data,
          etag:typeof xhr.getResponseHeader==="function" ?
            xhr.getResponseHeader("ETag"):null});
      };
      xhr.onerror=function(){done({ok:false,kind:"network"});};
      xhr.ontimeout=function(){done({ok:false,kind:"timeout"});};
      xhr.send(body);
      return xhr;
    }catch(_){done({ok:false,kind:"network"});return null;}
  }
  function freshEvent(c,bid,cid,eid,done){
    if(!safeBackend(bid)||!safeChannel(cid)||!safeEvent(eid)){
      done({ok:false,kind:"request"});return;
    }
    cancel();
    var token=serial;
    read=request(c,"GET","/api/v1/epg/event?backendId="+encodeURIComponent(bid)+
      "&channelId="+encodeURIComponent(cid)+"&eventId="+encodeURIComponent(eid),
      null,{},function(r){
        if(token!==serial)return;
        read=null;
        if(!r.ok||r.status!==200){done(r.ok?{ok:false,kind:"response"}:r);return;}
        var v=r.data;
        if(!strongTag(r.etag)||!v||v.backendId!==bid||
           v.channelId!==cid||v.eventId!==eid||
           typeof v.title!=="string"||!v.title||
           typeof v.startTime!=="string"||!/^[0-9]{10,12}$/.test(v.startTime)||
           typeof v.endTime!=="string"||!/^[0-9]{10,12}$/.test(v.endTime)||
           Number(v.endTime)<=Math.floor(Date.now()/1000)){
          done({ok:false,kind:"stale"});return;
        }
        done({ok:true,value:v,etag:r.etag});
      });
  }
  function idempotencyKey(){
    if(!env.crypto||typeof env.crypto.getRandomValues!=="function")return null;
    var bytes=new Uint8Array(16);
    try{env.crypto.getRandomValues(bytes);}catch(_){return null;}
    return "samsung-epg-"+Array.prototype.map.call(bytes,function(x){
      return ("0"+x.toString(16)).slice(-2);
    }).join("");
  }
  function create(c,bid,cid,eid,etag,done){
    if(postPending||!safeBackend(bid)||!safeChannel(cid)||
       !safeEvent(eid)||!strongTag(etag)||!credOk(c)){
      done({ok:false,kind:"request"});return;
    }
    var key=idempotencyKey();
    if(!key){done({ok:false,kind:"crypto"});return;}
    postPending=true;
    request(c,"POST","/api/v1/epg/timer-intents",
      JSON.stringify({backendId:bid,channelId:cid,eventId:eid}),
      {"Content-Type":"application/json","If-Match":etag,"Idempotency-Key":key},
      function(r){
        postPending=false;
        if(!r.ok||r.status!==202){done(r.ok?{ok:false,kind:"response"}:r);return;}
        var v=r.data;
        if(!v||typeof v.operationId!=="string"||
           !/^op_[A-Za-z0-9._:-]{1,160}$/.test(v.operationId)||
           v.backendId!==bid||typeof v.state!=="string"){
          done({ok:false,kind:"response"});return;
        }
        done({ok:true,value:v});
      });
  }
  function operation(c,operationId,done){
    if(typeof operationId!=="string"||
       !/^op_[A-Za-z0-9._:-]{1,160}$/.test(operationId)){
      done({ok:false,kind:"request"});return;
    }
    cancel();var token=serial;
    read=request(c,"GET","/api/v1/operations/"+encodeURIComponent(operationId),
      null,{},function(r){
        if(token!==serial)return;
        read=null;
        if(!r.ok||r.status!==200){done(r.ok?{ok:false,kind:"response"}:r);return;}
        if(!r.data||r.data.operationId!==operationId||
           typeof r.data.state!=="string"){
          done({ok:false,kind:"response"});return;
        }
        done({ok:true,value:r.data});
      });
  }
  return {freshEvent:freshEvent,create:create,operation:operation,cancel:cancel};
}
export function epgTimerIntentError(r){
  if(!r)return "Timer-Anfrage nicht verfügbar.";
  if(r.kind==="stale")return "Sendung ist vorbei, wurde geändert oder liefert keinen gültigen ETag. EPG neu laden.";
  if(r.kind==="crypto")return "Sichere Zufallsquelle fehlt – keine Timerbuchung durchgeführt.";
  if(r.kind==="timeout"||r.kind==="network")return
    "Netzwerkantwort unklar. Keinen weiteren Timer anlegen; zuerst Timerstatus am Server prüfen.";
  if(r.kind==="http"){
    if(r.status===401)return "Geräteanmeldung abgewiesen (401).";
    if(r.status===403)return "timers.create fehlt oder Backend ist schreibgeschützt (403).";
    if(r.status===409||r.status===412)return "EPG/Backend wurde verändert. Bitte neu auswählen (409/412).";
    if(r.status===503)return "Backend/Agent derzeit nicht bereit (503).";
    return "Timer-API HTTP "+r.status+".";
  }
  return "Timer-API-Vertrag nicht erfüllt; keine Erfolgsmeldung.";
}
