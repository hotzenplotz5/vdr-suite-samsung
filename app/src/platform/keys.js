const OPTIONAL_KEYS = [
  "MediaPlay", "MediaPause", "MediaPlayPause", "MediaStop",
  "ColorF0Red", "ColorF1Green", "ColorF2Yellow", "ColorF3Blue"
];

// Directions, Enter and Back are normally delivered without explicit registration.
export function registerOptionalKeys(globals) {
  const api = globals && globals.tizen && globals.tizen.tvinputdevice;
  if (!api) return { supported: false, registered: [] };
  const registered = [];
  if (typeof api.registerKey === "function") {
    for (let i = 0; i < OPTIONAL_KEYS.length; i += 1) {
      try {
        api.registerKey(OPTIONAL_KEYS[i]);
        registered.push(OPTIONAL_KEYS[i]);
      } catch (_) {
        // Some remote keys are not available on every Samsung TV.
      }
    }
  }
  return { supported: true, registered: registered };
}
