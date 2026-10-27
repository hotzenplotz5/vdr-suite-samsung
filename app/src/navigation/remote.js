// Normalize Samsung Tizen remote events exactly once for the client.
const KEY_CODES = Object.freeze({
  37:"LEFT",38:"UP",39:"RIGHT",40:"DOWN",13:"OK",
  8:"BACK",27:"BACK",10009:"BACK",
  48:"DIGIT_0",49:"DIGIT_1",50:"DIGIT_2",51:"DIGIT_3",52:"DIGIT_4",
  53:"DIGIT_5",54:"DIGIT_6",55:"DIGIT_7",56:"DIGIT_8",57:"DIGIT_9",
  415:"PLAY",19:"PAUSE",10252:"PLAY_PAUSE",413:"STOP",
  412:"REWIND",417:"FAST_FORWARD",10232:"TRACK_PREVIOUS",10233:"TRACK_NEXT",
  403:"RED",404:"GREEN",405:"YELLOW",406:"BLUE",
  427:"CHANNEL_UP",428:"CHANNEL_DOWN",10190:"PREVIOUS_CHANNEL",
  457:"INFO",18:"SETTINGS",10135:"TOOLS",10200:"TELETEXT"
});
const NAMED_KEYS = Object.freeze({
  ArrowLeft:"LEFT",ArrowUp:"UP",ArrowRight:"RIGHT",ArrowDown:"DOWN",
  Enter:"OK",Escape:"BACK",Backspace:"BACK",BrowserBack:"BACK",
  MediaPlay:"PLAY",MediaPause:"PAUSE",MediaPlayPause:"PLAY_PAUSE",MediaStop:"STOP",
  MediaRewind:"REWIND",MediaFastForward:"FAST_FORWARD",
  MediaTrackPrevious:"TRACK_PREVIOUS",MediaTrackNext:"TRACK_NEXT",
  ColorF0Red:"RED",ColorF1Green:"GREEN",ColorF2Yellow:"YELLOW",ColorF3Blue:"BLUE",
  ChannelUp:"CHANNEL_UP",ChannelDown:"CHANNEL_DOWN",PreviousChannel:"PREVIOUS_CHANNEL",
  Info:"INFO",Menu:"SETTINGS",Tools:"TOOLS",Teletext:"TELETEXT"
});
export function normalizeRemoteKey(event) {
  if (!event) return null;
  if (typeof event.key === "string") {
    if (/^[0-9]$/.test(event.key)) return "DIGIT_" + event.key;
    if (NAMED_KEYS[event.key]) return NAMED_KEYS[event.key];
  }
  return KEY_CODES[event.keyCode || event.which] || null;
}
export function playbackRemoteAction(key) {
  if (key === "STOP" || key === "BACK") return "stop";
  if (key === "PLAY") return "play";
  if (key === "PAUSE") return "pause";
  if (key === "PLAY_PAUSE" || key === "OK") return "toggle";
  if (key === "BLUE") return "audio";
  if (key === "REWIND") return "rewind";
  if (key === "FAST_FORWARD") return "fastforward";
  return null;
}
