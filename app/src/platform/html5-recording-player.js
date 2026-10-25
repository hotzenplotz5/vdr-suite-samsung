// Opt-in HTML5 progressive-MP4 alternative to native Samsung AVPlay.
// Uses the browser's normal Secure/HttpOnly cookie handling; does not read
// cookies, construct credential URLs or request extra server permissions.
export function createHtml5RecordingPlayer(video) {
  var generation=0,active=false;
  function available() {return !!(video && typeof video.play==="function" &&
    typeof video.pause==="function" && typeof video.load==="function");}
  function stop() {
    generation+=1;
    active=false;
    if (!video) return;
    try {video.pause();} catch (_) {}
    video.onplaying=null;video.oncanplay=null;video.onwaiting=null;
    video.onerror=null;video.onended=null;
    try {video.removeAttribute("src");video.load();} catch (_) {}
  }
  function start(mediaUrl,onState) {
    if(!available()||typeof mediaUrl!=="string"||
       !/^https:\/\/[^\s?#]+\/[^?#]*\/api\/v1\/media\/sessions\/ms_[0-9a-f]{32}\/recording\/stream\.mp4$/.test(mediaUrl)){
      onState("unsupported",{stage:"html5"});return false;
    }
    stop();
    var token=generation;
    video.onplaying=function () {if(token===generation){active=true;onState("playing");}};
    video.onwaiting=function () {if(token===generation)onState("buffering");};
    video.onerror=function () {
      if(token!==generation)return;
      var code=video.error && video.error.code;
      onState("error",{stage:"html5",code:typeof code==="number"&&
        code>=1&&code<=4?String(code):"unbekannt"});
    };
    video.onended=function () {if(token===generation)onState("finished");};
    video.oncanplay=function () {
      if(token!==generation)return;
      video.oncanplay=null;
      try {
        var attempt=video.play();
        if(attempt&&typeof attempt.catch==="function")attempt.catch(function (){
          if(token===generation)onState("error",{stage:"html5",code:"play_rejected"});
        });
      } catch (_) {if(token===generation)onState("error",{stage:"html5",code:"play_rejected"});}
    };
    try {video.src=mediaUrl;video.load();onState("preparing");return true;}
    catch (_) {stop();onState("error",{stage:"html5"});return false;}
  }
  function pauseOrResume() {
    if(!active||!video)return "unavailable";
    try{
      if(!video.paused){video.pause();return "paused";}
      var attempt=video.play();
      if(attempt&&typeof attempt.catch==="function")attempt.catch(function(){});
      return "playing";
    }catch(_){return "error";}
  }
  return {available:available,start:start,stop:stop,pauseOrResume:pauseOrResume};
}
