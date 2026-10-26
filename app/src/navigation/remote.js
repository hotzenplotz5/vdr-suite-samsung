// Samsung key events normalized once, before views consume them.
const KEY_CODES = Object.freeze({
  37: "LEFT", 38: "UP", 39: "RIGHT", 40: "DOWN",
  13: "OK", 8: "BACK", 27: "BACK", 10009: "BACK",
  415: "PLAY", 19: "PAUSE", 10252: "PLAY_PAUSE", 413: "STOP",
  403: "RED", 404: "GREEN", 405: "YELLOW", 406: "BLUE"
});

const NAMED_KEYS = Object.freeze({
  ArrowLeft: "LEFT", ArrowUp: "UP", ArrowRight: "RIGHT", ArrowDown: "DOWN",
  Enter: "OK", Escape: "BACK", Backspace: "BACK", BrowserBack: "BACK",
  MediaPlay: "PLAY", MediaPause: "PAUSE", MediaPlayPause: "PLAY_PAUSE", MediaStop: "STOP",
  ColorF0Red: "RED", ColorF1Green: "GREEN",
  ColorF2Yellow: "YELLOW", ColorF3Blue: "BLUE"
});

export function normalizeRemoteKey(event) {
  if (!event) return null;
  if (typeof event.key === "string" && NAMED_KEYS[event.key]) {
    return NAMED_KEYS[event.key];
  }
  return KEY_CODES[event.keyCode || event.which] || null;
}

// Route input only while a recording player owns the remote. Never move menu focus.
export function playbackRemoteAction(key) {
  if (key === "STOP" || key === "BACK") return "stop";
  if (key === "PLAY" || key === "PAUSE" || key === "PLAY_PAUSE" || key === "OK")
    return "toggle";
  return null;
}
