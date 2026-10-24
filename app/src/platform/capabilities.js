// Capability presence is not proof of codec support or VDR-Suite authorization.
export function getPlatformCapabilities(globals) {
  const env = globals || {};
  const tizen = env.tizen || null;
  const webapis = env.webapis || null;
  return {
    tizen: Boolean(tizen),
    avplay: Boolean(webapis && webapis.avplay),
    tvInputDevice: Boolean(tizen && tizen.tvinputdevice)
  };
}
