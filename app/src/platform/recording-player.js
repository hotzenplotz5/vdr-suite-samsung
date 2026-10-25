// Samsung AVPlay adapter: exactly one native playback owner. Tizen 5.5.
function safeAvplayCode(value) {
  if (typeof value === "number" && isFinite(value) &&
      Math.floor(value) === value && value >= 0 && value <= 999999)
    return String(value);
  if (typeof value === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(value))
    return value;
  return "unbekannt";
}
export function samsungPlaybackDiagnosis(detail,transport) {
  var stages = {
    open:"AVPlay.open",prepare:"AVPlay.prepareAsync",play:"AVPlay.play",
    stream:"AVPlay-Stream",unsupported:"AVPlay-Vorprüfung"
  };
  var stage=detail && stages[detail.stage] || "AVPlay";
  var code=detail && detail.code && /^[A-Za-z0-9_-]{1,32}$/.test(detail.code)
    ? " · Fehlercode " + detail.code : "";
  var format = transport === "HLS" ? "HLS" :
    transport === "TS" ? "MPEG-TS" : transport === "MP4" ? "MP4" : "Medienformat unklar";
  return stage + code + " · " + format +
    ". Möglich: TV-Decoder/Container oder geschützter Medienzugang (HttpOnly-Cookie im AVPlay-Netzwerkstack).";
}

export function createSamsungRecordingPlayer(environment) {
  var api = environment && environment.webapis && environment.webapis.avplay;
  var generation = 0;
  var active = false;
  function available() {
    return !!(api && typeof api.open === "function" &&
      typeof api.prepareAsync === "function" && typeof api.play === "function");
  }
  function stop() {
    generation += 1;
    active = false;
    if (!api) return;
    try { if (typeof api.stop === "function") api.stop(); } catch (_) {}
    try { if (typeof api.close === "function") api.close(); } catch (_) {}
  }
  function start(mediaUrl,onState) {
    if (!available() || typeof mediaUrl !== "string" ||
        !/^https:\/\/[^\s?#]+$/.test(mediaUrl)) {
      onState("unsupported",{stage:"unsupported"}); return false;
    }
    stop();
    var token = generation;
    try {
      api.open(mediaUrl);
      if (typeof api.setDisplayRect === "function")
        api.setDisplayRect(0,0,1920,1080);
      // Fill the TV display area but preserve film aspect ratio.
      // Older Tizen devices may omit/reject this optional API; playback must
      // not fail merely because letterboxing is unsupported.
      if (typeof api.setDisplayMethod === "function") {
        try {api.setDisplayMethod("PLAYER_DISPLAY_MODE_LETTER_BOX");}
        catch (_) { /* optional display mode, setDisplayRect remains active */ }
      }
      if (typeof api.setListener === "function")
        api.setListener({
          onbufferingstart:function () {if (token === generation) onState("buffering");},
          onbufferingcomplete:function () {if (token === generation) onState("ready");},
          onstreamcompleted:function () {if (token === generation) onState("finished");},
          onerror:function (type) {if (token === generation) onState("error",{stage:"stream",code:safeAvplayCode(type)});}
        });
      api.prepareAsync(function () {
        if (token !== generation) return;
        try {
          api.play();
          active = true;
          onState("playing");
        } catch (_) {onState("error",{stage:"play"});}
      },function (error) {
        if (token !== generation) return;
        // Samsung Product WebAPI ErrorCallback receives a WebAPIError.
        // Surface ONLY an allowlisted error name/code; NEVER log message,
        // response URL, cookie, internal path or native exception object.
        var reason = error && safeAvplayCode(error.name) !== "unbekannt"
          ? safeAvplayCode(error.name) : error && safeAvplayCode(error.code);
        onState("error",{
          stage:"prepare",code:reason === "unbekannt" ? undefined : reason
        });
      });
      onState("preparing");
      return true;
    } catch (_) {
      stop();
      onState("error",{stage:"open"});
      return false;
    }
  }
  function pauseOrResume() {
    if (!active || !api) return "unavailable";
    try {
      var state = typeof api.getState === "function" ? api.getState() : "";
      if (state === "PLAYING" && typeof api.pause === "function") {
        api.pause(); return "paused";
      }
      if (state === "PAUSED") {api.play();return "playing";}
    } catch (_) {return "error";}
    return "unavailable";
  }
  return {available:available,start:start,stop:stop,pauseOrResume:pauseOrResume};
}
// Advertise only the narrow H.264/AAC path observed via a TV decoder probe.
// This is not proof that all VDR recordings are decodable.
export function conservativeSamsungCapabilities(environment) {
  var video = environment && environment.document &&
    typeof environment.document.createElement === "function" &&
    environment.document.createElement("video");
  if (!video || typeof video.canPlayType !== "function") return null;
  try {
    var h264 = video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
    if (h264 !== "probably" && h264 !== "maybe") return null;
  } catch (_) {return null;}
  return {protocols:["hls","progressive"],containers:["mpeg-ts","mp4","fmp4"],
    videoCodecs:["h264"],audioCodecs:["aac"],supportsByteRanges:true,
    maxVideoWidth:1920,maxVideoHeight:1080,maxAudioChannels:2};
}
