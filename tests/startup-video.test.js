import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createStartupVideo } from "../app/src/platform/startup-video.js";

function harness(play) {
  const callbacks = {};
  const timers = [];
  const video = {
    muted: null, defaultMuted: null,
    addEventListener(name, fn) { callbacks[name] = fn; },
    play: play || (() => Promise.resolve()),
    pause() { this.paused = true; },
    load() {},
    removeAttribute(name) { if (name === "src") delete this.src; }
  };
  const overlay = { hidden: false };
  const environment = {
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; },
    clearTimeout() {}
  };
  const controller = createStartupVideo({
    overlay, video, environment, source: "./assets/branding/startvideo.mp4"
  });
  return { controller, callbacks, overlay, video, timers };
}

test("Original branding assets are present and referenced only as local resources", () => {
  const html = readFileSync("app/index.html", "utf8");
  assert.ok(existsSync("app/assets/branding/startvideo.mp4"));
  assert.ok(existsSync("app/assets/branding/vdr-suite-icon-v4.png"));
  assert.match(html, /src="assets\/branding\/vdr-suite-icon-v4\.png"/);
  assert.match(html, /id="startup-cover"/);
  assert.match(html, /16000/); // independent failsafe if main script fails
});

test("Startup animation ends and clears the cover without any API", () => {
  const h = harness();
  assert.equal(h.controller.start(), true);
  assert.equal(h.controller.active(), true);
  assert.equal(h.video.muted, false);
  assert.equal(h.timers[0].delay, 14000);
  h.callbacks.ended();
  assert.equal(h.controller.active(), false);
  assert.equal(h.overlay.hidden, true);
  assert.equal(h.video.paused, true);
  assert.equal(h.controller.start(), false);
});

test("Startup animation can be skipped, fails closed on decode error and timeout", () => {
  for (const how of ["skip", "error", "timeout"]) {
    const h = harness();
    h.controller.start();
    if (how === "skip") h.controller.skip();
    if (how === "error") h.callbacks.error();
    if (how === "timeout") h.timers[0].fn();
    assert.equal(h.controller.completed(), true);
    assert.equal(h.overlay.hidden, true);
  }
});

test("Autoplay denial retries muted and non-policy errors reveal the app", async () => {
  const denied = harness(function () {
    return this.muted ? Promise.resolve() : Promise.reject({ name: "NotAllowedError" });
  });
  denied.controller.start();
  await Promise.resolve();
  assert.equal(denied.video.muted, true);
  assert.equal(denied.controller.active(), true);
  const failed = harness(() => Promise.reject({ name: "NotSupportedError" }));
  failed.controller.start();
  await Promise.resolve();
  assert.equal(failed.overlay.hidden, true);
});
