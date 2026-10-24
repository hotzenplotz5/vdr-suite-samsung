import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html = readFileSync("app/index.html", "utf8");
const runtime = readFileSync("app/tv-runtime.js", "utf8");

test("Packaged entry uses a classic offline script instead of modules", () => {
  assert.match(html, /<script src="tv-runtime\.js"><\/script>/);
  assert.doesNotMatch(html, /<script[^>]+type="module"/);
  assert.doesNotMatch(runtime, /^\s*(?:import|export)\s/m);
  assert.match(runtime, /source: "\.\/assets\/branding\/startvideo\.mp4"/);
});

test("Classic TV runtime updates capabilities and starts original video", () => {
  const probes = {
    "tizen-status": { textContent: "wird geprüft" },
    "avplay-status": { textContent: "wird geprüft" },
    "remote-status": { textContent: "wird geprüft" },
    "key-status": { textContent: "keine" },
    "message": { textContent: "" },
    "view-title": { textContent: "" },
    "view-description": { textContent: "" }
  };
  const cover = { hidden: true };
  const video = {
    preload: null, playsInline: false, muted: null, defaultMuted: null, src: "",
    addEventListener() {}, removeAttribute() {}, load() {}, pause() {},
    play() { return Promise.resolve(); }
  };
  probes["startup-cover"] = cover;
  probes["startup-video"] = video;
  const buttons = ["home", "live", "recordings", "settings"].map(view => ({
    classList: { toggle() {} }, tabIndex: -1, focus() {}, addEventListener() {},
    getAttribute(name) { return name === "data-view" ? view : ""; },
    textContent: view
  }));
  const document = {
    readyState: "complete",
    getElementById(id) { assert.ok(probes[id], id); return probes[id]; },
    querySelectorAll(selector) { assert.equal(selector, ".menu-item"); return buttons; },
    addEventListener() {}
  };
  const window = {
    tizen: { tvinputdevice: { registerKey() {} } },
    webapis: { avplay: {} },
    setTimeout() { return 1; }, clearTimeout() {}
  };
  runInNewContext(runtime, { document, window });
  assert.equal(probes["tizen-status"].textContent, "vorhanden");
  assert.equal(probes["avplay-status"].textContent, "vorhanden");
  assert.equal(probes["remote-status"].textContent, "vorhanden");
  assert.equal(video.src, "./assets/branding/startvideo.mp4");
  assert.equal(cover.hidden, false);
});
