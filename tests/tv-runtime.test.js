import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";

const html = readFileSync("app/index.html", "utf8");
const runtime = readFileSync("app/tv-runtime.js", "utf8");

test("Samsung S2.1 loads a classic offline runtime and renders premium home", () => {
  assert.match(html, /<script src="tv-runtime\.js"><\/script>/);
  assert.doesNotMatch(html, /type="module"/);
  assert.match(html, /Fernsehen neu erleben/);
  assert.match(html, /DESIGNVORSCHAU · KEINE LIVE-DATEN/);
  for (const route of ["home","live","recordings","search","timers","settings"]) {
    assert.match(html, new RegExp('data-panel="' + route + '"'));
  }
  assert.doesNotMatch(runtime, /^\s*(?:import|export)\s/m);
  assert.match(runtime, /source: "\.\/assets\/branding\/startvideo\.mp4"/);
});

function simulate() {
  const nodes = {};
  const focusIds = [...html.matchAll(/<button[^>]*data-focus-id="([^"]+)"[^>]*>/g)];
  const buttons = focusIds.map(match => {
    const attrs = { "data-focus-id": match[1] };
    for (const key of ["data-target-view", "data-route"]) {
      const parsed = match[0].match(new RegExp(key + '="([^"]+)"'));
      if (parsed) attrs[key] = parsed[1];
    }
    const node = {
      isFocused: false, tabIndex: -1,
      classList: { toggle(name, enabled) {
        if (name === "is-focused") node.isFocused = enabled;
      }},
      getAttribute(name) { return attrs[name] || null; },
      setAttribute(name,value) { attrs[name] = value; },
      removeAttribute(name) { delete attrs[name]; },
      focus() {}, addEventListener(name, fn) { if (name === "click") node.click = fn; }
    };
    nodes[match[1]] = node;
    return node;
  });
  const panels = [...html.matchAll(/data-panel="([^"]+)"/g)].map(match => ({
    route: match[1], hidden: true, getAttribute() { return this.route; }
  }));
  const textNodes = Object.fromEntries([
    "message", "key-status", "tizen-status", "avplay-status", "remote-status"
  ].map(key => [key,{ textContent: "wird geprüft" }]));
  const overlay = { hidden: true };
  const video = {
    addEventListener(name, fn) { if (name === "ended") this.finish = fn; },
    pause() {}, load() {}, removeAttribute() {},
    play() { return Promise.resolve(); }
  };
  const listeners = {};
  const document = {
    readyState: "complete",
    getElementById(id) {
      if (id === "startup-cover") return overlay;
      if (id === "startup-video") return video;
      if (!textNodes[id]) throw Error("Missing test node " + id);
      return textNodes[id];
    },
    querySelectorAll(selector) {
      if (selector === ".tv-focusable") return buttons;
      if (selector === ".menu-item") return buttons.filter(node => node.getAttribute("data-route"));
      if (selector === "[data-panel]") return panels;
      throw Error("Unexpected selector " + selector);
    },
    addEventListener(name, fn) { listeners[name] = fn; }
  };
  const exits = { count: 0 };
  const window = {
    tizen: { tvinputdevice: { registerKey() {} }, application: { getCurrentApplication() { return { exit() { exits.count++; } }; } } },
    webapis: { avplay: {} }, setTimeout() { return 1; }, clearTimeout() {}
  };
  runInNewContext(runtime, { document, window });
  return { nodes, panels, textNodes, video, listeners, overlay, exits };
}

test("S2.1 runtime boots original intro, capability probes and D-pad navigation", () => {
  const sim = simulate();
  assert.equal(sim.textNodes["tizen-status"].textContent, "vorhanden");
  assert.equal(sim.textNodes["avplay-status"].textContent, "vorhanden");
  assert.equal(sim.textNodes["remote-status"].textContent, "vorhanden");
  assert.equal(sim.video.src, "./assets/branding/startvideo.mp4");
  assert.equal(sim.overlay.hidden, false);
  // Finish splash and exercise remote on HOME, other views and back.
  sim.video.finish();
  function key(keyCode) {
    sim.listeners.keydown({ keyCode, preventDefault() {} });
  }
  key(40); // down: home nav -> stage
  key(39); // right: hero
  assert.equal(sim.nodes["stage-hero"].isFocused, true);
  key(13); // OK -> live view
  assert.equal(sim.panels.find(p => p.route === "live").hidden, false);
  assert.equal(sim.nodes["nav-live"].isFocused, true);
  key(10009); // BACK -> home with exact previous card focused
  assert.equal(sim.panels.find(p => p.route === "home").hidden, false);
  assert.equal(sim.nodes["stage-hero"].isFocused, true);
});


test("S2.2 D-Pad remembers the selected tile and Back restores Home focus", () => {
  const sim = simulate();
  sim.video.finish();
  const key = keyCode => sim.listeners.keydown({ keyCode, preventDefault() {} });
  key(40); // from Home menu to first stage card
  key(39); // hero card
  key(40); // middle action button
  key(40); // middle rail card
  key(39); // search rail card
  assert.equal(sim.nodes["rail-search"].isFocused, true);
  key(38); // previous action row
  assert.equal(sim.nodes["action-recordings"].isFocused, true);
  key(40); // return to remembered rail card, not default column
  assert.equal(sim.nodes["rail-search"].isFocused, true);
  key(13); // open search
  assert.equal(sim.panels.find(p => p.route === "search").hidden, false);
  assert.equal(sim.nodes["nav-search"].isFocused, true);
  assert.equal(sim.nodes["rail-search"].isFocused, false); // never focus a hidden tile
  sim.listeners.focusin({ target: sim.nodes["rail-live"] }); // hidden panel can't hijack focus
  assert.equal(sim.nodes["nav-search"].isFocused, true);
  key(10009); // return to the exact Home card
  assert.equal(sim.panels.find(p => p.route === "home").hidden, false);
  assert.equal(sim.nodes["rail-search"].isFocused, true);
  key(10009); // Back from Home calls Tizen application exit
  assert.equal(sim.exits.count, 1);
});

test("S2.2 Back traverses detail history without losing the original Home tile", () => {
  const sim = simulate();
  sim.video.finish();
  const key = keyCode => sim.listeners.keydown({ keyCode, preventDefault() {} });
  key(40); // stage-favorites
  key(39); // stage-hero
  key(13); // live
  assert.equal(sim.panels.find(p => p.route === "live").hidden, false);
  key(39); // nav-recordings
  key(13); // recordings from live
  assert.equal(sim.panels.find(p => p.route === "recordings").hidden, false);
  key(10009);
  assert.equal(sim.panels.find(p => p.route === "live").hidden, false);
  assert.equal(sim.nodes["nav-recordings"].isFocused, true);
  key(10009);
  assert.equal(sim.panels.find(p => p.route === "home").hidden, false);
  assert.equal(sim.nodes["stage-hero"].isFocused, true);
});

test("S2.2 explicit Home clears history and restores origin from detail Home button", () => {
  const sim = simulate();
  sim.video.finish();
  const key = keyCode => sim.listeners.keydown({ keyCode, preventDefault() {} });
  key(40); // stage-favorites
  key(13); // live
  key(40); // focus detail-live-home
  assert.equal(sim.nodes["detail-live-home"].isFocused, true);
  key(13); // explicit back to Home
  assert.equal(sim.panels.find(p => p.route === "home").hidden, false);
  assert.equal(sim.nodes["stage-favorites"].isFocused, true);
  key(10009);
  assert.equal(sim.exits.count, 1); // no stale detail history
});

test("Generated TV runtime header is safe JavaScript", () => {
  const header = runtime.split("\n").slice(0, 4).join("\n");
  assert.match(header, /^\/\* Generated by npm run build:tv from app\/src files/);
  const checked = spawnSync(process.execPath, ["--check", "app/tv-runtime.js"], { encoding: "utf8" });
  assert.equal(checked.status, 0, checked.stderr);
});
