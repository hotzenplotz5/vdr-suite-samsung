// Optional Tizen remote keys need tv.inputdevice in the installed host manifest.
const OPTIONAL_KEYS = [
  "MediaPlay", "MediaPause", "MediaPlayPause", "MediaStop",
  "MediaRewind", "MediaFastForward", "MediaTrackPrevious", "MediaTrackNext",
  "ColorF0Red", "ColorF1Green", "ColorF2Yellow", "ColorF3Blue",
  "ChannelUp", "ChannelDown", "PreviousChannel",
  "Info", "Menu", "Tools", "Teletext",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"
];
// D-pad, Enter and Back are mandatory and must not be registered.
export function registerOptionalKeys(globals) {
  const api = globals && globals.tizen && globals.tizen.tvinputdevice;
  if (!api || typeof api.registerKey !== "function")
    return { supported: false, registered: [], unavailable: [], failed: [] };
  const registered = [], unavailable = [], failed = [];
  let available = null;
  if (typeof api.getSupportedKeys === "function") {
    try {
      const keys = api.getSupportedKeys();
      if (Array.isArray(keys)) available = new Set(keys.filter(k => k && typeof k.name === "string").map(k => k.name));
    } catch (_) { /* Discovery is optional; try individual registrations. */ }
  }
  for (const name of OPTIONAL_KEYS) {
    if (available && !available.has(name)) { unavailable.push(name); continue; }
    try { api.registerKey(name); registered.push(name); }
    catch (_) { failed.push(name); }
  }
  return { supported: true, registered, unavailable, failed };
}
