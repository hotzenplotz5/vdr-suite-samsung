import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRemoteKey } from "../app/src/navigation/remote.js";
import { nextMenuIndex } from "../app/src/navigation/focus.js";
import { getPlatformCapabilities } from "../app/src/platform/capabilities.js";
import { registerOptionalKeys } from "../app/src/platform/keys.js";

test("Remote D-Pad, OK and Samsung Back are normalized", () => {
  assert.equal(normalizeRemoteKey({ keyCode: 37 }), "LEFT");
  assert.equal(normalizeRemoteKey({ keyCode: 40 }), "DOWN");
  assert.equal(normalizeRemoteKey({ key: "Enter" }), "OK");
  assert.equal(normalizeRemoteKey({ keyCode: 10009 }), "BACK");
  assert.equal(normalizeRemoteKey({ keyCode: 404 }), "GREEN");
  assert.equal(normalizeRemoteKey({ key: "Unknown", keyCode: 999 }), null);
});
test("Focus never escapes the four-item vertical menu", () => {
  assert.equal(nextMenuIndex(0, "UP", 4), 0);
  assert.equal(nextMenuIndex(0, "DOWN", 4), 1);
  assert.equal(nextMenuIndex(3, "DOWN", 4), 3);
  assert.equal(nextMenuIndex(6, "LEFT", 4), 2);
  assert.equal(nextMenuIndex(0, "DOWN", 0), 0);
});
test("Capability detection is fail-safe and does not imply codec support", () => {
  assert.deepEqual(getPlatformCapabilities({}), {tizen:false, avplay:false, tvInputDevice:false});
  assert.deepEqual(getPlatformCapabilities({tizen:{tvinputdevice:{}},webapis:{avplay:{}}}),
    {tizen:true,avplay:true,tvInputDevice:true});
});
test("Optional Samsung keys tolerate unsupported individual keys", () => {
  const got = [];
  const result = registerOptionalKeys({tizen:{tvinputdevice:{registerKey(key) {
    if (key === "ColorF0Red") throw Error("not available");
    got.push(key);
  }}}});
  assert.equal(result.supported, true);
  assert.equal(result.registered.length, 6);
  assert.deepEqual(got, result.registered);
  assert.deepEqual(registerOptionalKeys({}), { supported: false, registered: [] });
});
