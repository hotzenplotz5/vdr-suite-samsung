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

function simulate(options = {}) {
  const nodes = {};
  const focusIds = [...html.matchAll(/<(?:button|input)\b[^>]*data-focus-id="([^"]+)"[^>]*>/g)];
  const buttons = focusIds.map(match => {
    const attrs = { "data-focus-id": match[1] };
    for (const key of ["data-target-view", "data-route", "data-preview-route", "data-server-test", "data-pair-action"]) {
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
      tagName: match[0].startsWith("<input") ? "INPUT" : "BUTTON",
      value: "", disabled: false,
      focus() {}, addEventListener(name, fn) { if (name === "click") node.click = fn; if (name === "blur") node.blur = fn; if (name === "change") node.change = fn; }
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
  const stateNodes = {};
  for (const route of ["live", "recordings", "search", "timers"]) {
    const card = { dataState: null, setAttribute(name, value) {
      if (name === "data-state") this.dataState = value;
    } };
    stateNodes["detail-state-" + route] = card;
    for (const suffix of ["badge", "title", "description"]) {
      stateNodes["detail-state-" + suffix + "-" + route] = { textContent: "" };
    }
    stateNodes["detail-state-skeleton-" + route] = { hidden: true };
  }
  const serverStatus = {textContent:"", setAttribute(name,value) { if(name==="data-connection-state") this.state=value; }};
  const pairResult = {textContent:""};
  const pairCode = {textContent:""};
  const serverInput = nodes["settings-base-input"];
  const serverTestButton = nodes["settings-test"];
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
      if (stateNodes[id]) return stateNodes[id];
      if (id === "suite-base-input") return serverInput;
      if (id === "settings-test-button") return serverTestButton;
      if (id === "suite-connection-result") return serverStatus;
      if (id === "home-server-state") return textNodes["message"];
      if (id === "topbar-server-status") return textNodes["message"];
      if (id === "pairing-result") return pairResult;
      if (id === "pairing-user-code") return pairCode;
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
  if (options.localBase !== undefined) window.VDR_SUITE_SERVER_BASE = options.localBase;
  if (options.localStorage !== undefined) window.localStorage = options.localStorage;
  if (options.XMLHttpRequest !== undefined) window.XMLHttpRequest = options.XMLHttpRequest;
  runInNewContext(runtime, { document, window, URL });
  return { nodes, panels, textNodes, video, listeners, overlay, exits, stateNodes, serverStatus, serverInput, pairResult, pairCode };
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


test("S2.3 tab selection does not navigate until OK", () => {
  const sim = simulate();
  sim.video.finish();
  const key = code => sim.listeners.keydown({ keyCode: code, preventDefault() {} });
  key(39); // focus Live-TV header only
  assert.equal(sim.nodes["nav-live"].isFocused, true);
  assert.equal(sim.panels.find(p => p.route === "home").hidden, false);
  key(13); // actually open Live-TV
  assert.equal(sim.panels.find(p => p.route === "live").hidden, false);
});

test("S2.3 all media detail routes cycle purely local preview states", () => {
  for (const route of ["live", "recordings", "search", "timers"]) {
    const sim = simulate();
    sim.video.finish();
    const key = code => sim.listeners.keydown({ keyCode: code, preventDefault() {} });
    sim.nodes["nav-" + route].click();
    assert.equal(sim.panels.find(p => p.route === route).hidden, false);
    assert.equal(sim.stateNodes["detail-state-" + route].dataState, "offline");
    assert.equal(sim.stateNodes["detail-state-title-" + route].textContent, "Noch keine Serververbindung");
    key(40); // down to detail Home button
    key(39); // right to local state preview
    assert.equal(sim.nodes["detail-" + route + "-preview"].isFocused, true);
    for (const [mode, skeleton] of [["loading",false],["empty",true],["error",true],["offline",true]]) {
      key(13);
      assert.equal(sim.stateNodes["detail-state-" + route].dataState, mode);
      assert.equal(sim.stateNodes["detail-state-skeleton-" + route].hidden, skeleton);
    }
    key(10009); // Back restores Home; detail previews are not a subroute
    assert.equal(sim.panels.find(p => p.route === "home").hidden, false);
  }
});

test("S2.3 no backend requests, external images or media playback in view code", () => {
  const views = readFileSync("app/src/views/view-state.js", "utf8");
  const app = readFileSync("app/src/main.js", "utf8");
  assert.doesNotMatch(views + app, /fetch\(|XMLHttpRequest|http:\/\//);
  assert.match(html, /Statusvorschau – keine echten Serverdaten/);
  assert.match(html, /data-preview-route="live"/);
  assert.match(html, /data-preview-route="recordings"/);
  assert.match(html, /data-preview-route="search"/);
  assert.match(html, /data-preview-route="timers"/);
});


test("S3.1 network discovery is never triggered by tab focus alone", () => {
  const sim = simulate();
  sim.video.finish();
  assert.match(html, /id="suite-base-input"/);
  assert.match(html, /data-server-test="true"/);
  assert.equal(sim.serverStatus.textContent, "");
  const press = keyCode => sim.listeners.keydown({keyCode,preventDefault(){}});
  press(39); // top menu select only
  assert.equal(sim.panels.find(p=>p.route==="home").hidden,false);
  press(13); // Live view, no network
  assert.equal(sim.panels.find(p=>p.route==="live").hidden,false);
  assert.equal(sim.serverStatus.textContent,"");
});

test("S3.1 settings offers a TV-focusable HTTPS input and explicit probe", () => {
  const sim = simulate();
  sim.video.finish();
  const press = keyCode => sim.listeners.keydown({keyCode,preventDefault(){}});
  sim.nodes["nav-settings"].click();
  press(40); // first settings control: Back Home
  assert.equal(sim.nodes["detail-settings-home"].isFocused,true);
  press(39); // address input
  assert.equal(sim.nodes["settings-base-input"].isFocused,true);
  press(39); // explicit test button
  assert.equal(sim.nodes["settings-test"].isFocused,true);
  press(13); // no address: fail closed before XHR
  assert.match(sim.serverStatus.textContent,/HTTPS/i);
  assert.equal(sim.serverStatus.state,"error");
  press(10009); // restore Settings origin
  assert.equal(sim.panels.find(p=>p.route==="home").hidden,false);
});
test("S3.2 pairing is reachable by D-pad but refuses unverified server/unsafe vault", () => {
  const sim = simulate();
  sim.video.finish();
  sim.nodes["nav-settings"].click();
  const key = keyCode => sim.listeners.keydown({ keyCode, preventDefault() {} });
  key(40); // settings controls
  key(40); // pairing controls
  assert.equal(sim.nodes["settings-pair-start"].isFocused,true);
  key(13);
  assert.match(sim.pairResult.textContent,/HTTPS-Serveradresse|Verbindung prüfen/i);
  // A server address alone must not bypass the S3.1 compatibility gate.
  sim.serverInput.value="https://example.invalid/vdr-suite";
  key(13);
  assert.match(sim.pairResult.textContent,/Serverprüfung fehlgeschlagen/i);
  key(10009);
  assert.equal(sim.panels.find(p=>p.route==="home").hidden,false);
});

test("Developer-local HTTPS origin restores the input after Test Build deletes localStorage", () => {
  const sim = simulate({localBase:"https://example.test/vdr-suite"});
  assert.equal(sim.serverInput.value,"https://example.test/vdr-suite");
  assert.equal(sim.serverStatus.textContent,""); // boot never probes
  assert.equal(sim.nodes["nav-home"].isFocused,true);
});

test("Saved TV origin takes precedence and valid edits persist on change or blur", () => {
  const values = {"vdr-suite.samsung.serverBase":"https://saved.test/vdr-suite"};
  const store = {
    getItem(key) { return values[key] || null; },
    setItem(key,value) { values[key]=value; }
  };
  const sim = simulate({localBase:"https://fallback.test/vdr-suite",localStorage:store});
  assert.equal(sim.serverInput.value,"https://saved.test/vdr-suite");
  sim.serverInput.value="https://edited.test/vdr-suite/";
  sim.serverInput.change();
  assert.equal(values["vdr-suite.samsung.serverBase"],"https://edited.test/vdr-suite");
  sim.serverInput.value="http://insecure.test";
  sim.serverInput.blur();
  assert.equal(values["vdr-suite.samsung.serverBase"],"https://edited.test/vdr-suite");
});

test("Kopplung starten automatically checks public API on a restored address, never at boot", () => {
  const calls=[];
  function XHR() { calls.push(this);this.headers={}; }
  XHR.prototype.open=function(method,url){this.method=method;this.url=url;};
  XHR.prototype.setRequestHeader=function(key,val){this.headers[key]=val;};
  XHR.prototype.send=function(){};
  XHR.prototype.abort=function(){};
  const sim=simulate({localBase:"https://example.test/vdr-suite",XMLHttpRequest:XHR});
  assert.equal(calls.length,0);
  sim.video.finish();
  sim.nodes["nav-settings"].click();
  const key=(keyCode)=>sim.listeners.keydown({keyCode,preventDefault(){}});
  key(40);key(40);
  assert.equal(sim.nodes["settings-pair-start"].isFocused,true);
  key(13);
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,"GET");
  assert.equal(calls[0].url,"https://example.test/vdr-suite/api/v1");
  assert.equal(calls[0].headers.Authorization,undefined);
  const root={apiVersion:"v1",supportedApiMajors:["v1"],links:{capabilities:"/api/v1/capabilities"},compatibilityPolicy:{},authentication:{authenticated:false}};
  calls[0].responseURL=calls[0].url;calls[0].status=200;calls[0].responseText=JSON.stringify(root);calls[0].onload();
  assert.equal(calls.length,2);
  assert.equal(calls[1].url,"https://example.test/vdr-suite/api/v1/capabilities");
  const caps={apiVersion:"v1",capabilities:[{id:"one"}],compatibility:{},links:{root:"/api/v1"}};
  calls[1].responseURL=calls[1].url;calls[1].status=200;calls[1].responseText=JSON.stringify(caps);calls[1].onload();
  assert.match(sim.serverStatus.textContent,/1 Fähigkeiten/);
  assert.match(sim.pairResult.textContent,/KeyManager nicht schreib-/i);
  assert.equal(calls.length,2); // no pairing POST without secure vault
});

test("Generated TV runtime header is safe JavaScript", () => {
  const header = runtime.split("\n").slice(0, 4).join("\n");
  assert.match(header, /^\/\* Generated by npm run build:tv from app\/src files/);
  const checked = spawnSync(process.execPath, ["--check", "app/tv-runtime.js"], { encoding: "utf8" });
  assert.equal(checked.status, 0, checked.stderr);
});
