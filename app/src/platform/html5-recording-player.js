// Opt-in HTML5 progressive-MP4 diagnostic. AVPlay remains the default player.
// Never expose the HttpOnly media cookie, URLs or native exception messages.
export function html5PlaybackDiagnosis(detail) {
  var code = detail && detail.code;
  var explanations = {
    "1":"Medienabruf abgebrochen",
    "2":"Netzwerkfehler beim Medienabruf",
    "3":"Decoder konnte den MP4-Stream nicht verarbeiten",
    "4":"MP4-Container oder Codec wird nicht unterstützt",
    "play_rejected":"Browser hat den Videostart abgelehnt",
    "startup_timeout":"Schwarzes Bild: weder Videostart noch rechtzeitige Wiedergabebereitschaft",
    "stall_timeout":"Videopufferung ohne Fortschritt abgebrochen",
    "load_failed":"HTML5 konnte die Videoquelle nicht laden"
  };
  return "HTML5 MP4 · " + (explanations[code] || "Unbekannter Wiedergabefehler") +
    " · kein automatischer AVPlay-Fallback.";
}

export function createHtml5RecordingPlayer(video, environment) {
  var generation=0,active=false,phase="idle",watchdog=null,notifyFailure=null;
  var env=environment || {};
  var setTimer=typeof env.setTimeout==="function" ?
    function(fn,ms){return env.setTimeout(fn,ms);} : null;
  var clearTimer=typeof env.clearTimeout==="function" ?
    function(id){env.clearTimeout(id);} : null;
  function available() {return !!(video && typeof video.play==="function" &&
    typeof video.pause==="function" && typeof video.load==="function");}
  function cancelWatchdog() {
    if (watchdog !== null && clearTimer) clearTimer(watchdog);
    watchdog=null;
  }
  function armWatchdog(token,ms,code,onState) {
    cancelWatchdog();
    if (!setTimer || !clearTimer) return;
    watchdog=setTimer(function(){
      if (token!==generation || phase==="stopped" || phase==="finished" ||
          phase==="failed") return;
      watchdog=null;
      phase="failed";
      active=false;
      onState("error",{stage:"html5",code:code});
    },ms);
  }
  function stop() {
    generation+=1;
    active=false;
    phase="stopped";
    cancelWatchdog();
    notifyFailure=null;
    if (!video) return;
    try {video.pause();} catch (_) {}
    video.onplaying=null;video.oncanplay=null;video.onwaiting=null;
    video.onstalled=null;video.onerror=null;video.onended=null;
    try {video.removeAttribute("src");video.load();} catch (_) {}
  }
  function start(mediaUrl,onState) {
    if (!available() || typeof mediaUrl!=="string" ||
        !/^https:\/\/[^\s?#]+\/[^?#]*\/api\/v1\/media\/sessions\/ms_[0-9a-f]{32}\/recording\/stream\.mp4$/.test(mediaUrl)) {
      onState("unsupported",{stage:"html5"});return false;
    }
    stop();
    var token=generation;
    phase="preparing";
    function fail(code) {
      if (token!==generation || phase==="failed" || phase==="finished" ||
          phase==="stopped") return;
      phase="failed";
      active=false;
      cancelWatchdog();
      onState("error",{stage:"html5",code:code});
    }
    notifyFailure=fail;
    video.onplaying=function () {
      if (token!==generation || phase==="failed" || phase==="finished") return;
      phase="playing";
      active=true;
      cancelWatchdog();
      onState("playing");
    };
    function buffering() {
      if (token!==generation || phase==="failed" || phase==="finished" ||
          phase==="stopped") return;
      if (phase==="preparing" || phase==="paused") return; // startup or intentional pause
      phase="buffering";
      onState("buffering");
      armWatchdog(token,20000,"stall_timeout",onState);
    }
    video.onwaiting=buffering;
    video.onstalled=buffering;
    video.onerror=function () {
      var code=video.error && video.error.code;
      fail(typeof code==="number" && code>=1 && code<=4 &&
        Math.floor(code)===code ? String(code) : "load_failed");
    };
    video.onended=function () {
      if (token!==generation || phase==="failed" || phase==="finished") return;
      phase="finished";
      active=false;
      cancelWatchdog();
      onState("finished");
    };
    video.oncanplay=function () {
      if (token!==generation || phase==="failed" || phase==="finished") return;
      video.oncanplay=null;
      try {
        var attempt=video.play();
        if (attempt && typeof attempt.catch==="function")
          attempt.catch(function () {fail("play_rejected");});
      } catch (_) {fail("play_rejected");}
    };
    try {
      video.src=mediaUrl;
      video.load();
      if (phase==="failed") return true; // synchronous media error keeps precedence
      onState("preparing");
      // Catches the real-device black-screen case where neither canplay nor
      // error is emitted; does not assert that the codec is the root cause.
      if (phase==="preparing") armWatchdog(token,12000,"startup_timeout",onState);
      return true;
    } catch (_) {stop();onState("error",{stage:"html5",code:"load_failed"});return false;}
  }
  function pauseOrResume() {
    if (!active || !video || phase==="failed" || phase==="finished") return "unavailable";
    try {
      if (!video.paused) {
        video.pause();
        phase="paused";
        cancelWatchdog();
        return "paused";
      }
      var token=generation;
      var attempt=video.play();
      phase="buffering";
      if (notifyFailure) {
        var failure=notifyFailure;
        armWatchdog(token,20000,"stall_timeout",function(state,detail){
          if (state==="error") failure(detail.code);
        });
        if (attempt && typeof attempt.catch==="function")
          attempt.catch(function(){if (token===generation)failure("play_rejected");});
      }
      // This is a play request, not proof of frames: onplaying confirms it.
      return "playing";
    } catch (_) {return "error";}
  }
  return {available:available,start:start,stop:stop,pauseOrResume:pauseOrResume};
}
