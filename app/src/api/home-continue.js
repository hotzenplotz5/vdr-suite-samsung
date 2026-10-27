// S8.1 Home content: true actor-scoped Continue Watching, never inferred from
// a recording list or from localStorage. Read-only Device Public API v1.
export function createHomeContinueWatching(environment) {
  var env=environment||{},pending=null,serial=0;
  function cancel(){
    serial++;
    if(pending && typeof pending.abort==="function")
      try{pending.abort();}catch(_){}
    pending=null;
  }
  function validCredential(c){
    return c && typeof c.base==="string" &&
      /^https:\/\/[^\s/?#]+(?:\/[^?#]*)?$/.test(c.base) &&
      /^[A-Za-z0-9._-]{1,128}$/.test(c.credentialId) &&
      /^[A-Za-z0-9._~-]{16,512}$/.test(c.credentialSecret);
  }
  function load(credential,backendId,done){
    if(!validCredential(credential) ||
       typeof backendId!=="string" ||
       !/^[A-Za-z0-9._-]{1,128}$/.test(backendId) ||
       typeof env.XMLHttpRequest!=="function"){
      done({ok:false,kind:"request"});return;
    }
    cancel();
    var ticket=serial,finished=false,xhr=new env.XMLHttpRequest();
    pending=xhr;
    var url=credential.base.replace(/\/$/,"")+
      "/api/v1/recording-playback-sessions/continue-watching?backendId="+
      encodeURIComponent(backendId);
    function finish(result){
      if(finished || ticket!==serial)return;
      finished=true;pending=null;done(result);
    }
    try{
      xhr.open("GET",url,true);xhr.timeout=10000;
      xhr.withCredentials=false;
      xhr.setRequestHeader("Accept","application/json");
      xhr.setRequestHeader("Cache-Control","no-store");
      xhr.setRequestHeader("Authorization","VDR-Suite-Device "+
        credential.credentialId+"."+credential.credentialSecret);
      xhr.onload=function(){
        if(xhr.responseURL && xhr.responseURL!==url){
          finish({ok:false,kind:"response"});return;
        }
        if(xhr.status!==200){
          finish({ok:false,kind:"http",status:xhr.status});return;
        }
        var data=null;try{data=JSON.parse(xhr.responseText);}catch(_){}
        if(!data || data.backendId!==backendId || data.limit!==50 ||
           !Array.isArray(data.items) || data.items.length>50 ||
           !data.items.every(function(item){
             return item && /^rec_[0-9a-f]{32}$/.test(item.recordingId) &&
               Number.isInteger(item.positionSeconds) &&
               item.positionSeconds>0 &&
               (item.durationSeconds===null ||
                 (Number.isInteger(item.durationSeconds) &&
                  item.durationSeconds>item.positionSeconds)) &&
               typeof item.resumeSupport==="string" &&
               item.resumeSupport.length>0 && item.resumeSupport.length<=64;
           })){
          finish({ok:false,kind:"response"});return;
        }
        finish({ok:true,value:data});
      };
      xhr.onerror=function(){finish({ok:false,kind:"network"});};
      xhr.ontimeout=function(){finish({ok:false,kind:"timeout"});};
      xhr.send(null);
    }catch(_){finish({ok:false,kind:"network"});}
  }
  return {load:load,cancel:cancel};
}
export function homeContinueError(result){
  if(result && result.kind==="http"){
    if(result.status===401)return "Geräteanmeldung abgewiesen.";
    if(result.status===403)return "Weitersehen benötigt media.recording.play.";
    if(result.status===404)return "Weitersehen auf diesem API-v1-Server noch nicht verfügbar.";
    if(result.status===503)return "Wiedergabeverlauf derzeit nicht verfügbar.";
    return "Weitersehen HTTP "+result.status+".";
  }
  return "Weitersehen derzeit nicht abrufbar.";
}
