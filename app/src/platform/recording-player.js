// Samsung AVPlay adapter: exactly one native playback owner. Tizen 5.5.
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
      onState("unsupported"); return false;
    }
    stop();
    var token = generation;
    try {
      api.open(mediaUrl);
      if (typeof api.setDisplayRect === "function")
        api.setDisplayRect(0,0,1920,1080);
      if (typeof api.setListener === "function")
        api.setListener({
          onbufferingstart:function () {if (token === generation) onState("buffering");},
          onbufferingcomplete:function () {if (token === generation) onState("ready");},
          onstreamcompleted:function () {if (token === generation) onState("finished");},
          onerror:function () {if (token === generation) onState("error");}
        });
      api.prepareAsync(function () {
        if (token !== generation) return;
        try {
          api.play();
          active = true;
          onState("playing");
        } catch (_) {onState("error");}
      },function () {if (token === generation) onState("error");});
      onState("preparing");
      return true;
    } catch (_) {
      stop();
      onState("error");
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
