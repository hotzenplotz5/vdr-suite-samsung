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

// Restrict AVPlay extra_info to a small non-secret audio diagnostics schema.
function samsungAudioTracks(raw) {
  var tracks = [];
  if (!Array.isArray(raw)) return tracks;
  for (var i=0;i<raw.length && i<32;i++) {
    var item=raw[i];
    if (!item || item.type !== "AUDIO" || typeof item.index !== "number" ||
        !isFinite(item.index) || item.index<0 || item.index>65535 ||
        Math.floor(item.index)!==item.index) continue;
    if (tracks.some(function(t){return t.index===item.index;})) continue;
    var info={};
    if (typeof item.extra_info==="string" && item.extra_info.length<=2048) {
      try {
        var parsed=JSON.parse(item.extra_info);
        if (parsed && typeof parsed==="object" && !Array.isArray(parsed)) info=parsed;
      } catch (_) { /* never copy raw metadata into UI */ }
    }
    var cc=typeof info.fourCC==="string" ? info.fourCC.toUpperCase() : "";
    var codec=["AAC","AACL","MP4A","AAC-LC"].indexOf(cc)>=0 ? "AAC" :
      ["AC3","AC-3"].indexOf(cc)>=0 ? "AC3" :
      ["EAC3","EC3","E-AC3"].indexOf(cc)>=0 ? "EAC3" :
      ["MPEG","MP2","MP3"].indexOf(cc)>=0 ? "MPEG" : "unbekannt";
    var channels=Number(info.channels);
    if (!isFinite(channels) || Math.floor(channels)!==channels ||
        channels<1 || channels>16) channels=null;
    var language=typeof info.language==="string" ? info.language :
      typeof info.track_lang==="string" ? info.track_lang : "";
    language=/^[A-Za-z]{2,3}$/.test(language) ? language.toLowerCase() : "";
    tracks.push({index:item.index,codec:codec,channels:channels,language:language});
  }
  return tracks;
}
function samsungAudioRead(api,method) {
  if (typeof api[method]!=="function") return {ok:false,tracks:[]};
  try {return {ok:true,tracks:samsungAudioTracks(api[method]())};}
  catch (_) {return {ok:false,tracks:[]};}
}
function inspectSamsungAudio(api) {
  var state="";
  try {if (typeof api.getState==="function") state=api.getState();}
  catch (_) {}
  if (state!=="PLAYING")
    return {status:"not_playing",total:0,currentIndex:null,tracks:[]};
  var all=samsungAudioRead(api,"getTotalTrackInfo");
  if (!all.ok)
    return {status:"unavailable",total:0,currentIndex:null,tracks:[]};
  var current=samsungAudioRead(api,"getCurrentStreamInfo");
  var selected=current.tracks.length ? current.tracks[0] : null;
  var result={status:"observed",total:all.tracks.length,
    currentIndex:selected ? selected.index : null,tracks:all.tracks};
  if (!all.tracks.length) {result.status="no_audio";return result;}
  var compatible=null;
  for (var i=0;i<all.tracks.length;i++)
    if (all.tracks[i].codec==="AAC" && all.tracks[i].channels!==null &&
        all.tracks[i].channels<=2) {compatible=all.tracks[i];break;}
  if (selected && selected.codec==="AAC" && selected.channels!==null &&
      selected.channels<=2) {result.status="active_compatible";return result;}
  // Samsung permits AUDIO track switching only in PLAYING. Avoid switching
  // single-track streams, guessing codecs or selecting unknown track IDs.
  if (all.tracks.length<2 || !compatible ||
      typeof api.setSelectTrack!=="function") {
    result.status="no_safe_switch";return result;
  }
  try {api.setSelectTrack("AUDIO",compatible.index);}
  catch (_) {result.status="selection_failed";return result;}
  var after=samsungAudioRead(api,"getCurrentStreamInfo");
  result.currentIndex=after.tracks.length ? after.tracks[0].index : null;
  result.status=result.currentIndex===compatible.index ?
    "selected_confirmed" : "selection_requested";
  return result;
}
export function describeSamsungAudio(detail) {
  if (!detail || typeof detail!=="object") return "Audio · keine Diagnose";
  if (detail.status==="not_playing") return "Audio · AVPlay noch nicht PLAYING";
  if (detail.status==="unavailable") return "Audio · Spurdaten nicht verfügbar";
  if (detail.status==="no_audio") return "Audio · AVPlay meldet keine Audiospur";
  var tracks=Array.isArray(detail.tracks) ? detail.tracks : [];
  var current=tracks.filter(function(t){return t.index===detail.currentIndex;})[0];
  var count=typeof detail.total==="number" && detail.total>=0 ? detail.total : 0;
  var label="Audio · "+count+" Spur(en)" +
    (detail.currentIndex===null ? " · keine gewählt" : " · Index "+detail.currentIndex);
  if (current) label+=" · "+current.codec +
    (current.channels===null ? "" : " "+current.channels+"ch") +
    (current.language ? " "+current.language : "");
  var labels={active_compatible:"bereits aktiv",
    selected_confirmed:"AAC-Spur bestätigt",selection_requested:"AAC-Spur angefordert",
    selection_failed:"Spurauswahl fehlgeschlagen",
    no_safe_switch:"keine sichere automatische Wahl",observed:"nur Diagnose"};
  return label+" · "+(labels[detail.status]||"Status unbekannt");
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
  function start(mediaUrl,onState,nativeCookie) {
    if (!available() || typeof mediaUrl !== "string" ||
        !/^https:\/\/[^\s?#]+$/.test(mediaUrl)) {
      onState("unsupported",{stage:"unsupported"}); return false;
    }
    stop();
    var token = generation;
    try {
      api.open(mediaUrl);
      // Samsung AVPlay documents COOKIE for native HTTP requests in IDLE.
      // This is the Device MediaSession's scoped credential, not the Device
      // login and never a query string. Reject unsafe header syntax.
      if (nativeCookie != null) {
        if (!/^vdr_suite_media=mg_[0-9a-f]{32}\.[A-Za-z0-9._~-]{8,256}$/.test(nativeCookie) ||
            typeof api.setStreamingProperty !== "function")
          throw Error("Native cookie delivery unsupported");
        api.setStreamingProperty("COOKIE",nativeCookie);
      }
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
          onbufferingcomplete:function () {
            if (token === generation) onState("ready");
          },
          onstreamcompleted:function () {if (token === generation) onState("finished");},
          onerror:function (type) {if (token === generation) onState("error",{stage:"stream",code:safeAvplayCode(type)});}
        });
      api.prepareAsync(function () {
        if (token !== generation) return;
        try {
          api.play();
          active = true;
          onState("playing");
          // Only PLAYING permits an AUDIO track selection on Tizen 5.5.
          if (token===generation) onState("audio",inspectSamsungAudio(api));
        } catch (_) {onState("error",{stage:"play"});}
      },function (error) {
        if (token !== generation) return;
        // Samsung Product WebAPI ErrorCallback receives a WebAPIError.
        // Surface ONLY an allowlisted error name/code; NEVER log message,
        // response URL, cookie, internal path or native exception object.
        var allowed=["NotSupportedError","InvalidValuesError","InvalidAccessError",
          "InvalidStateError","UnknownError","TypeMismatchError"];
        var reason = error && allowed.indexOf(error.name) >= 0 ? error.name :
          error && typeof error.code === "number" ? safeAvplayCode(error.code) : null;
        onState("error",reason && reason !== "unbekannt"
          ? {stage:"prepare",code:reason} : {stage:"prepare"});
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
