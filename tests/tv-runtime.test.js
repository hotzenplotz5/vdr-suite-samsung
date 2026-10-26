import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { createSamsungRecordingPlayer, describeSamsungAudio, samsungTvSoundStatus } from "../app/src/platform/recording-player.js";

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
    for (const key of ["data-target-view", "data-route", "data-preview-route", "data-server-test", "data-pair-action", "data-live-action", "data-live-epg-action", "data-epg-scroll", "data-recordings-action"]) {
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
  const liveList = {
    hidden:true, children:[], _text:"",
    set textContent(value) { this._text=value; if (value==="") this.children=[]; },
    get textContent() { return this._text; },
    appendChild(child) { this.children.push(child); }
  };
  const liveBackendName = {textContent:""};
  const liveEpgStatus = {textContent:""};
  const liveEpgList = {
    hidden:true,children:[],_text:"",
    set textContent(value){this._text=value;if(value==="")this.children=[];},
    get textContent(){return this._text;},
    appendChild(node){this.children.push(node);}
  };
  const epgScrollActions={hidden:true};
  const epgDetailNodes = {
    "live-epg-detail":{hidden:true,scrollTop:0},
    "live-epg-detail-time":{textContent:""},
    "live-epg-detail-title":{textContent:""},
    "live-epg-detail-subtitle":{textContent:"",hidden:true},
    "live-epg-detail-description":{textContent:""},
    "live-epg-artwork-status":{textContent:""},
    "live-epg-detail-poster":{
      hidden:true,src:"",onload:null,onerror:null,
      removeAttribute(name){if(name==="src")this.src="";}
    }
  };
  const recordingList = {
    hidden:true, children:[], scrollTop:0, _text:"",
    set textContent(value) {this._text=value;if(value==="") this.children=[];},
    get textContent() {return this._text;},
    appendChild(child) {this.children.push(child);}
  };
  const recordingBackendName = {textContent:""};
  const recordingDetailInfo = {textContent:""};
  const recordingPoster = {
    hidden:true,src:"",alt:"Poster",
    removeAttribute(name){if(name==="src")this.src="";}
  };
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
  const versionFooter = {textContent:""};
  const versionSettings = {textContent:""};
  const pairResult = {textContent:"", attributes:{},
    setAttribute(name,value){this.attributes[name]=value;},
    getAttribute(name){return this.attributes[name] ?? null;}};
  const pairCode = {textContent:""};
  const playerSurface = {hidden:true};
  const remoteHint = {textContent:""};
  const audioHint = {textContent:""};
  const lifecycleHint = {textContent:""};
  const nativeAvplayObject = {hidden:false};
  const recordingHtml5Video = {
    hidden:true,paused:true,src:"",error:null,
    play(){this.paused=false;return Promise.resolve();},
    pause(){this.paused=true;},
    load(){},
    removeAttribute(name){if(name==="src")this.src="";}
  };
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
      if (id === "app-build-version") return versionFooter;
      if (id === "settings-app-build-version") return versionSettings;
      if (id === "pairing-result") return pairResult;
      if (id === "pairing-user-code") return pairCode;
      if (id === "live-channel-list") return liveList;
      if (id === "live-backend-name") return liveBackendName;
      if (id === "live-epg-status") return liveEpgStatus;
      if (id === "live-epg-list") return liveEpgList;
      if (id === "live-epg-scroll-actions") return epgScrollActions;
      if (epgDetailNodes[id]) return epgDetailNodes[id];
      if (id === "recording-list") return recordingList;
      if (id === "recording-player-surface") return playerSurface;
      if (id === "recording-remote-hint") return remoteHint;
      if (id === "recording-audio-hint") return audioHint;
      if (id === "recording-lifecycle-hint") return lifecycleHint;
      if (id === "recording-html5-video") return recordingHtml5Video;
      if (id === "recording-avplay-object") return nativeAvplayObject;
      if (id === "recording-backend-name") return recordingBackendName;
      if (id === "recording-detail-info") return recordingDetailInfo;
      if (id === "recording-detail-poster") return recordingPoster;
      if (!textNodes[id]) throw Error("Missing test node " + id);
      return textNodes[id];
    },
    createElement(tag) {
      const attrs={};
      const node={
        tagName:tag.toUpperCase(),children:[],textContent:"",tabIndex:-1,isFocused:false,
        classList:{toggle(name,enabled){if(name==="is-focused")node.isFocused=enabled;}},
        appendChild(child){this.children.push(child);},
        setAttribute(name,value){attrs[name]=value;},
        getAttribute(name){return attrs[name] === undefined ? null : attrs[name];},
        focus(){},scrollIntoView(){},
        addEventListener(name,fn){if(name==="click")this.click=fn;}
      };
      return node;
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
    tizen: { tvinputdevice: { registerKey(name) {
      if (options.blockMediaKeys && /^(Media|Color)/.test(name)) throw Error("SecurityError");
    } }, application: { getCurrentApplication() { return { exit() { exits.count++; } }; } } },
    webapis: { avplay: {} }, setTimeout() { return 1; }, clearTimeout() {}
  };
  if (options.keymanager) window.tizen.keymanager = options.keymanager;
  if (options.localBase !== undefined) window.VDR_SUITE_SERVER_BASE = options.localBase;
  if (options.localStorage !== undefined) window.localStorage = options.localStorage;
  if (options.XMLHttpRequest !== undefined) window.XMLHttpRequest = options.XMLHttpRequest;
  if (options.artworkApi) {
    window.URL=options.artworkApi;
    window.Blob=function(data,opts){this.data=data;this.type=opts.type;};
  }
  runInNewContext(runtime, { document, window, URL });
  return { nodes, panels, textNodes, video, listeners, overlay, exits, stateNodes, serverStatus, serverInput, pairResult, pairCode, liveList, liveBackendName, liveEpgStatus, liveEpgList, epgDetailNodes, epgScrollActions, recordingList, recordingBackendName, recordingDetailInfo, recordingPoster, playerSurface, remoteHint, audioHint, lifecycleHint, versionFooter, versionSettings };
}

test("Installed Samsung runtime shows actual deterministic build identity immediately", () => {
  const version = runtime.match(/const VDR_SUITE_BUILD_IDENTITY = Object\.freeze\((\{[^;]+\})\);/);
  assert(version, "Bundled version identity must be present");
  const info = JSON.parse(version[1]);
  const pkg = JSON.parse(readFileSync("package.json","utf8"));
  const manifest = readFileSync("app/config.xml","utf8");
  assert.equal(info.version, pkg.version);
  assert.match(manifest, new RegExp('version="' + info.version.replace(/\./g,"\\.") + '"'));
  assert.match(info.label, /^Samsung v\d+\.\d+\.\d+ · S6\.4 · b[0-9a-f]{12}$/);
  assert(!runtime.includes("VDR-Suite Samsung · S3.3"));
  const sim = simulate();
  assert.equal(sim.versionFooter.textContent, info.label);
  assert.equal(sim.versionSettings.textContent, info.label);
  assert.equal(sim.serverStatus.textContent, "");
});

test("S2.1 runtime boots original intro, capability probes and D-pad navigation", () => {
  const sim = simulate();
  assert.equal(sim.textNodes["tizen-status"].textContent, "vorhanden");
  assert.equal(sim.textNodes["avplay-status"].textContent, "vorhanden");
  assert.match(sim.textNodes["remote-status"].textContent,/PLAY\/PAUSE\/STOP\/BLAU registriert/);
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
  for (const route of ["search", "timers"]) {
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
  assert.match(html, /data-live-action="load"/);
  assert.match(html, /data-recordings-action="load"/);
  assert.doesNotMatch(html, /data-preview-route="recordings"/);
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

function savedDeviceManager() {
  const stored = JSON.stringify({
    version:1,base:"https://example.test/vdr-suite",deviceId:"tv1",actorId:"actor1",
    credentialId:"device-credential",credentialSecret:"secret_1234567890123456789"
  });
  return {
    getDataAliasList() { return [{name:"vdr-suite-samsung-device-v1"}]; },
    getData({name}) { if(name!=="vdr-suite-samsung-device-v1") throw Error("not found"); return stored; },
    saveData() { throw Error("pairing must not be repeated"); },
    removeData() { throw Error("device must not be removed"); }
  };
}
function liveTransport() {
  const calls=[];
  function XHR() {this.headers={};calls.push(this);}
  XHR.prototype.open=function(method,url){this.method=method;this.url=url;};
  XHR.prototype.setRequestHeader=function(name,value){this.headers[name]=value;};
  XHR.prototype.send=function(body){this.body=body;};
  XHR.prototype.abort=function(){this.aborted=true;};
  XHR.prototype.getResponseHeader=function(name){
    return name==="Content-Type" ? (this.mime || null) : null;
  };
  function reply(i,status,value) {
    calls[i].status=status;calls[i].responseURL=calls[i].url;
    calls[i].responseText=JSON.stringify(value);
    calls[i].onload();
  }
  return {calls,reply,XHR};
}
const backendPage={items:[{backendId:"home",name:"Wohnzimmer",enabled:true,online:true}],
  page:{limit:30,hasMore:false,nextCursor:null},meta:{partial:false}};
function channelPage(cursor=null) {
  return {items:[{backendId:"home",channelId:"S19.2E-1-1019-10301",
    channelNumber:1,name:"Das Erste",provider:"ARD",groupName:"öffentlich-rechtlich",
    radio:false,encrypted:false,enabled:true}],
    page:{limit:20,hasMore:!!cursor,nextCursor:cursor},
    meta:{partial:false,sources:[{backendId:"home",state:"ok"}]}};
}
test("S3.2 temporarily unreadable KeyManager is not reported as lost pairing",()=>{
  const manager = savedDeviceManager();
  manager.getData = function() {
    throw Object.assign(new Error("vault temporarily busy"),{name:"UnknownError"});
  };
  const sim = simulate({keymanager:manager});
  sim.video.finish();
  assert.match(sim.pairResult.textContent,/nicht lesbar/i);
  assert.doesNotMatch(sim.pairResult.textContent,/Kein gespeichertes Device-Credential/i);
});

test("S3.1 anonymous server discovery never claims the Device is logged out",()=>{
  const transport = liveTransport();
  const sim = simulate({keymanager:savedDeviceManager(),XMLHttpRequest:transport.XHR,
    localBase:"https://example.test/vdr-suite"});
  sim.video.finish();
  sim.nodes["nav-settings"].click();
  sim.nodes["settings-test"].click();
  assert.equal(transport.calls.length,1);
  transport.reply(0,200,{
    apiVersion:"v1",supportedApiMajors:["v1"],
    links:{capabilities:"/api/v1/capabilities"},compatibilityPolicy:{},
    authentication:{authenticated:false}
  });
  assert.equal(transport.calls.length,2);
  transport.reply(1,200,{
    apiVersion:"v1",capabilities:["channels.read"],
    compatibility:{},links:{root:"/api/v1"}
  });
  assert.match(sim.serverStatus.textContent,/Geräteanmeldung hier nicht geprüft/i);
  assert.doesNotMatch(sim.serverStatus.textContent,/noch nicht angemeldet/i);
  assert.match(sim.pairResult.textContent,/Device-ID: tv1/i);
});

test("S3.3 restart reads KeyManager, explicit Live click verifies and displays real channels",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();
  assert.match(sim.pairResult.textContent,/gespeichert/);
  assert.match(sim.pairResult.textContent,/Device-ID: tv1/);
  assert.equal(h.calls.length,0); // never contact server during app boot
  sim.nodes["nav-live"].click();
  assert.equal(h.calls.length,0); // no implicit request on tab activation
  sim.nodes["detail-live-preview"].click();
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].method,"GET");
  assert.equal(h.calls[0].headers.Authorization,
    "VDR-Suite-Device device-credential.secret_1234567890123456789");
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  assert.match(h.calls[1].url,/\/api\/v1\/backends\?/);
  h.reply(1,200,backendPage);
  assert.match(h.calls[2].url,/\/api\/v1\/channels\?backendId=home/);
  h.reply(2,200,channelPage("ch2_more"));
  assert.equal(sim.liveList.children.length,1);
  assert.equal(sim.liveList.children[0].children[0].textContent,"1 · Das Erste");
  assert.match(sim.liveBackendName.textContent,/Wohnzimmer/);
  assert.equal(sim.stateNodes["detail-state-live"].dataState,"ready");
  sim.nodes["detail-live-more"].click();
  assert.match(h.calls[3].url,/cursor=ch2_more/);
  h.reply(3,200,channelPage());
  assert.equal(sim.liveList.children.length,2);
  assert.equal(sim.pairResult.getAttribute("data-pair-state"),"authenticated");
  sim.nodes["nav-settings"].click();
  assert.match(sim.pairResult.textContent,/Gerät authentifiziert/);
  assert.match(sim.pairResult.textContent,/Device-ID: tv1/);
  assert.ok(h.calls.every(req=>req.method==="GET")); // no repeated pairing
});
test("S3.3 missing channels.view returns an error without granting permissions",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();
  sim.nodes["nav-live"].click();
  sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  h.reply(2,403,{code:"forbidden"});
  assert.equal(sim.stateNodes["detail-state-live"].dataState,"error");
  assert.match(sim.stateNodes["detail-state-description-live"].textContent,/channels.view/);
  assert.equal(sim.liveList.children.length,0);
  assert.ok(h.calls.every(req=>req.method==="GET"));
});
test("S3.3 rejects changed server base, without leaking or reissuing secret",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR,
    localBase:"https://another.test/vdr-suite"});
  sim.video.finish();
  sim.nodes["nav-live"].click();
  sim.nodes["detail-live-preview"].click();
  assert.match(sim.stateNodes["detail-state-description-live"].textContent,/anderen Server/);
  assert.equal(h.calls.length,0);
});

test("S4.1 on the packaged TV runtime reads 100 actual recording rows and remote-focuses next page",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();
  sim.nodes["nav-recordings"].click();
  assert.equal(h.calls.length,0,"opening recordings must never auto-fetch");
  sim.nodes["detail-recordings-all"].click();
  assert.equal(h.calls.length,1);
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  assert.match(h.calls[1].url,/\/api\/v1\/backends\?/);
  h.reply(1,200,backendPage);
  assert.match(h.calls[2].url,/\/api\/v1\/recordings\?backendId=home&limit=100/);
  const items=Array.from({length:100},(_,i)=>({
    backendId:"home",recordingId:"rec_"+String(i+1).padStart(32,"0"),
    title:"Aufnahme "+String(i+1),recordedAt:"2026-10-25T08:00:00Z",
    durationSeconds:1800,durationKnown:true,description:"Echter Katalogeintrag",sizeMb:100
  }));
  h.reply(2,200,{items,page:{limit:100,hasMore:true,nextCursor:"rc1_6161"},
    meta:{partial:false}});
  // The previous fixture deliberately supplied the items array.
  assert.equal(sim.recordingList.children.length,100);
  assert.equal(sim.recordingList.children[0].children[0].textContent,"Aufnahme 1");
  assert.equal(sim.recordingList.children[99].children[0].textContent,"Aufnahme 100");
  const key=(keyCode)=>sim.listeners.keydown({keyCode,preventDefault(){}});
  sim.nodes["nav-recordings"].click();
  key(40); // first action row
  key(40); // first recording row, part of same keydown owner
  assert.equal(sim.recordingList.children[0].isFocused,true);
  key(40);
  assert.equal(sim.recordingList.children[1].isFocused,true);
  sim.nodes["detail-recordings-next"].click();
  assert.match(h.calls[3].url,/cursor=rc1_6161/);
  const later={...items[0],recordingId:"rec_00000000000000000000000000000101",title:"Aufnahme 101"};
  h.reply(3,200,{items:[later],page:{limit:100,hasMore:false,nextCursor:null},
    meta:{partial:false}});
  assert.equal(sim.recordingList.children.length,1,"old 100 DOM nodes are replaced");
  assert.equal(sim.recordingList.children[0].children[0].textContent,"Aufnahme 101");
  assert.equal(sim.recordingList.children[0].isFocused,true);
  assert.equal(sim.pairResult.getAttribute("data-pair-state"),"authenticated");
  sim.nodes["nav-settings"].click();
  assert.match(sim.pairResult.textContent,/Gerät authentifiziert/);
  assert.ok(h.calls.every(x=>x.method==="GET"));
});

test("S4.1 revoked server Device is not described as paired; explicit double local reset only",()=>{
  const h=liveTransport();
  const stored=JSON.stringify({version:1,base:"https://example.test/vdr-suite",deviceId:"tv1",
    actorId:"actor1",credentialId:"device-credential",credentialSecret:"secret_1234567890123456789"});
  let present=true,removals=0;
  const manager={
    getData({name}) {if(name!=="vdr-suite-samsung-device-v1" || !present)
      throw Object.assign(Error("not found"),{name:"NotFoundError"});return stored;},
    saveData() {throw Error("no automatic pairing");},
    removeData({name}) {assert.equal(name,"vdr-suite-samsung-device-v1");removals++;present=false;}
  };
  const sim=simulate({keymanager:manager,XMLHttpRequest:h.XHR});
  sim.video.finish();sim.nodes["nav-settings"].click();
  assert.match(sim.pairResult.textContent,/Server-Anmeldung noch nicht geprüft/i);
  assert.equal(sim.pairResult.getAttribute("data-pair-state"),"local");
  sim.nodes["settings-pair-clear"].click();
  assert.equal(removals,0);
  sim.nodes["settings-pair-verify"].click();
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].headers.Authorization,
    "VDR-Suite-Device device-credential.secret_1234567890123456789");
  h.reply(0,401,{code:"device_credential_revoked"});
  assert.match(sim.pairResult.textContent,/ABGEWIESEN.*HTTP 401/i);
  assert.match(sim.pairResult.textContent,/Device-ID: tv1/i);
  sim.nodes["settings-pair-clear"].click();
  assert.equal(removals,0);
  assert.match(sim.pairResult.textContent,/NOCH EINMAL/i);
  sim.nodes["settings-pair-clear"].click();
  assert.equal(removals,1);
  assert.equal(present,false);
  assert.match(sim.pairResult.textContent,/lokal entfernt/i);
  assert.equal(h.calls.length,1);
});
test("S4.1 HTTP 403 and network errors never allow local reset",()=>{
 for(const status of [0,403]){
  const h=liveTransport(),manager=savedDeviceManager();
  const sim=simulate({keymanager:manager,XMLHttpRequest:h.XHR});
  sim.video.finish();sim.nodes["nav-settings"].click();
  sim.nodes["settings-pair-verify"].click();
  if(status===0){h.calls[0].onerror();}else h.reply(0,status,{code:"forbidden"});
  assert.doesNotMatch(sim.pairResult.textContent,/ABGEWIESEN.*HTTP 401/i);
  sim.nodes["settings-pair-clear"].click();
  assert.match(sim.pairResult.textContent,/nur nach.*HTTP-401/i);
  assert.ok(manager.getData({name:"vdr-suite-samsung-device-v1"}));
 }
});
test("S4.2 real VDR folders open and BACK returns to parent, with legacy flat list retained",()=>{
  const h=liveTransport(),sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();
  sim.nodes["nav-recordings"].click();
  sim.nodes["detail-recordings-load"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  assert.match(h.calls[2].url,/view=folders&limit=100&offset=0$/);
  const folder={kind:"folder",folderId:"fld1_0123456789abcdef0123456789abcdef",
    name:"Filme",recordingCount:1};
  const rec={kind:"recording",backendId:"home",
    recordingId:"rec_00000000000000000000000000000001",title:"Ein Film",
    description:"Beschreibung",recordedAt:"2026-10-25T08:00:00Z",
    durationSeconds:3600,durationKnown:true,sizeMb:200};
  function page(items,offset=0,totalCount=items.length) {
    return {items,page:{limit:100,offset,totalCount,
      hasMore:offset+items.length<totalCount},meta:{partial:false}};
  }
  h.reply(2,200,page([folder,rec]));
  assert.equal(sim.recordingList.children.length,2);
  assert.match(sim.recordingList.children[0].children[0].textContent,/Ordner: Filme/);
  sim.recordingList.children[0].click();
  assert.match(h.calls[3].url,/view=folders&limit=100&offset=0&folderId=fld1_/);
  h.reply(3,200,page([rec]));
  assert.equal(sim.recordingList.children.length,1);
  const key=(keyCode)=>sim.listeners.keydown({keyCode,preventDefault(){}});
  key(10009);
  assert.match(h.calls[4].url,/view=folders&limit=100&offset=0$/);
  h.reply(4,200,page([folder,rec]));
  assert.equal(sim.recordingList.children.length,2);
  sim.nodes["detail-recordings-all"].click();
  h.reply(5,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(6,200,backendPage);
  assert.match(h.calls[7].url,/limit=100&sort=recordingId&order=asc$/);
  h.reply(7,200,{items:[rec],page:{limit:100,nextCursor:null,hasMore:false},
    meta:{partial:false}});
  assert.equal(sim.recordingList.children.length,1);
  assert.equal(sim.recordingList.children[0].children[0].textContent,"Ein Film");
});

test("S6.3 real channel rows enter the single D-pad focus graph; OK shows metadata only",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();
  sim.nodes["nav-live"].click();
  sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const first=channelPage().items[0];
  const second={...first,channelId:"second-channel",channelNumber:17,name:"ZDF"};
  const third={...first,channelId:"third-channel",channelNumber:230,name:"WDR"};
  h.reply(2,200,{...channelPage(),items:[first,second,third]});
  assert.equal(sim.liveList.children.length,3);
  assert.equal(sim.liveList.children[0].getAttribute("role"),"button");
  assert.equal(sim.liveList.children[0].getAttribute("data-focus-id"),"channel-row-0");
  assert.equal(sim.liveList.children[1].getAttribute("aria-label"),"17 · ZDF");
  const key=keyCode=>sim.listeners.keydown({keyCode,preventDefault(){}});
  key(40);
  assert.equal(sim.liveList.children[0].isFocused,true,"DOWN from Sender laden reaches first row");
  key(40);
  assert.equal(sim.liveList.children[1].isFocused,true,"DOWN reaches next sender");
  key(13);
  assert.match(sim.stateNodes["detail-state-title-live"].textContent,/17 · ZDF/);
  assert.match(sim.stateNodes["detail-state-description-live"].textContent,/media.live.play/);
  assert.equal(h.calls.length,3,"OK on sender performs no hidden playback or HTTP request");
  key(38);
  assert.equal(sim.liveList.children[0].isFocused,true);
  key(38);
  assert.equal(sim.nodes["detail-live-preview"].isFocused,true,"UP leaves channel list");
  sim.liveList.children[2].click();
  assert.equal(sim.liveList.children[2].isFocused,true,"Mouse/OK shares the focus owner");
  key(10009);
  assert.equal(sim.panels.find(p=>p.route==="home").hidden,false);
});
test("S6.3 more channels focuses first appended sender; reload removes stale focus nodes",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();
  sim.nodes["nav-live"].click();
  sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  h.reply(2,200,channelPage("ch2_second"));
  const old=sim.liveList.children[0];
  sim.nodes["detail-live-more"].click();
  assert.match(h.calls[3].url,/cursor=ch2_second/);
  const next={...channelPage().items[0],channelNumber:2,name:"ZDF",channelId:"zdf"};
  h.reply(3,200,{...channelPage(),items:[next]});
  assert.equal(sim.liveList.children.length,2);
  assert.equal(sim.liveList.children[1].isFocused,true,
    "new page focuses first appended sender");
  const key=keyCode=>sim.listeners.keydown({keyCode,preventDefault(){}});
  key(38);
  assert.equal(old.isFocused,true,"UP returns to previous page's last row");
  sim.nodes["detail-live-preview"].click();
  h.reply(4,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(5,200,backendPage);
  h.reply(6,200,channelPage());
  assert.equal(sim.liveList.children.length,1,"refresh discards previous list");
  assert.equal(sim.liveList.children[0].getAttribute("data-focus-id"),"channel-row-0");
  key(40);
  assert.equal(sim.liveList.children[0].isFocused,true);
  assert.ok(h.calls.every(req=>req.method==="GET"));
});

test("S6.4 live channel EPG is explicitly requested and never starts playback",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();
  sim.nodes["nav-live"].click();
  sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const selected=channelPage().items[0];
  h.reply(2,200,channelPage());
  sim.liveList.children[0].click();
  assert.equal(h.calls.length,3,"OK on channel selects metadata only");
  sim.nodes["detail-live-epg-now"].click();
  assert.match(h.calls[3].url,/\/api\/v1\/epg\/now-next\?/);
  assert.match(h.calls[3].url,/backendId=home&channelId=/);
  assert.equal(h.calls[3].method,"GET");
  const from=new URL(h.calls[3].url).searchParams.get("fromTime");
  h.reply(3,200,{backendId:"home",channelId:selected.channelId,
    items:[{channelId:selected.channelId,title:"Heute",subtitle:"Kurz",
      startTime:from,endTime:String(Number(from)+3600),durationSeconds:3600}],
    page:{limit:2,hasMore:false},meta:{partial:false}});
  assert.equal(sim.liveEpgList.children.length,1);
  assert.match(sim.liveEpgList.children[0].textContent,/Jetzt.*Heute/);
  sim.nodes["detail-live-epg-window"].click();
  assert.match(h.calls[4].url,/\/api\/v1\/epg\/window\?/);
  const query=new URL(h.calls[4].url).searchParams;
  assert.equal(query.get("limit"),"24");
  assert.equal(Number(query.get("untilTime"))-Number(query.get("fromTime")),86400);
  h.reply(4,403,{code:"forbidden"});
  assert.match(sim.liveEpgStatus.textContent,/epg.view/);
  assert.equal(h.calls.every(req=>req.method==="GET"),true);
});

test("S6.4 selected VDR recording reads metadata/artwork only with Device header",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();sim.nodes["nav-recordings"].click();
  sim.nodes["detail-recordings-load"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const rec={kind:"recording",backendId:"home",
    recordingId:"rec_00000000000000000000000000000001",title:"Ein Film",
    description:"Beschreibung",recordedAt:"2026-10-25T08:00:00Z",
    durationSeconds:3600,durationKnown:true,sizeMb:200};
  h.reply(2,200,{items:[rec],page:{limit:100,offset:0,totalCount:1,hasMore:false},
    meta:{partial:false}});
  sim.recordingList.children[0].click();
  assert.equal(h.calls[3].method,"GET");
  assert.match(h.calls[3].url,/\/api\/v1\/recordings\/rec_0{31}1\?backendId=home$/);
  assert.match(h.calls[3].headers.Authorization,/^VDR-Suite-Device /);
  h.reply(3,200,{...rec,metadata:{state:"available",
    source:"restfulapi-scraper-bridge",contentKind:"movie",genreText:"Drama",
    overview:"Ein echter Film"}});
  assert.match(sim.recordingDetailInfo.textContent,/Drama/);
  assert.match(sim.recordingDetailInfo.textContent,/Ein Film/);
  assert.match(sim.recordingDetailInfo.textContent,/Laufzeit: 60 Min/);
  assert.match(sim.recordingDetailInfo.textContent,/Inhalt: Ein echter Film/);
  assert.match(h.calls[4].url,/\/artwork\?backendId=home$/);
  h.reply(4,200,{backendId:"home",recordingId:rec.recordingId,items:[]});
  assert.match(sim.recordingDetailInfo.textContent,/Kein Artwork/);
  assert.equal(h.calls.every(req=>req.method==="GET"),true);
  sim.nodes["nav-live"].click();
  assert.equal(sim.recordingPoster.hidden,true);
});

test("S6.4 late recording detail response cannot revive an earlier selection",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();sim.nodes["nav-recordings"].click();
  sim.nodes["detail-recordings-load"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const first={kind:"recording",backendId:"home",recordingId:"rec_00000000000000000000000000000001",
    title:"Erster Film",description:"1",recordedAt:"2026-10-25T08:00:00Z",
    durationSeconds:60,durationKnown:true,sizeMb:1};
  const second={...first,recordingId:"rec_00000000000000000000000000000002",title:"Zweiter Film"};
  h.reply(2,200,{items:[first,second],
    page:{limit:100,offset:0,totalCount:2,hasMore:false},meta:{partial:false}});
  sim.recordingList.children[0].click();
  assert.equal(h.calls.length,4);
  sim.recordingList.children[1].click();
  assert.equal(h.calls[3].aborted,true);
  assert.equal(h.calls.length,5);
  h.reply(3,200,{...first,metadata:{state:"available",source:"none",contentKind:"movie"}});
  assert.doesNotMatch(sim.recordingDetailInfo.textContent,/Erster Film/);
  h.reply(4,404,{code:"not_found"});
  assert.match(sim.recordingDetailInfo.textContent,/nicht vorhanden/);
});

test("S6.4 24h programme has full-height two-pane layout and D-pad rows",()=>{
  const live=html.slice(html.indexOf('data-panel="live"'),html.indexOf('data-panel="recordings"'));
  const css=readFileSync("app/styles.css","utf8");
  assert.match(live,/class="live-workspace"/);
  assert.ok(live.indexOf('class="live-catalog"')<live.indexOf('class="live-epg-panel'));
  assert.match(css,/\.live-workspace\s*\{[^}]*grid-template-columns:45% minmax\(0,1fr\)/);
  assert.match(css,/#detail-state-live\.live-epg-panel \.live-epg-events\s*\{[^}]*max-height:none/);
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish(); sim.nodes["nav-live"].click();
  sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const channel=channelPage().items[0];
  h.reply(2,200,channelPage());
  sim.liveList.children[0].click();
  sim.nodes["detail-live-epg-now"].click();
  const from=new URL(h.calls[3].url).searchParams.get("fromTime");
  h.reply(3,200,{backendId:"home",channelId:channel.channelId,
    items:[{channelId:channel.channelId,title:"Jetzt läuft",startTime:from,
      endTime:String(Number(from)+3600),durationSeconds:3600},
      {channelId:channel.channelId,title:"Danach läuft",
      startTime:String(Number(from)+3600),endTime:String(Number(from)+7200),
      durationSeconds:3600}],
    page:{limit:2,hasMore:false},meta:{partial:false}});
  assert.equal(sim.liveEpgList.children.length,2);
  const key=keyCode=>sim.listeners.keydown({keyCode,preventDefault(){}});
  key(40); // Move from the EPG action into the first sender without selecting it again.
  key(39); // Cross from left sender column to first right-side EPG row.
  assert.equal(sim.liveEpgList.children[0].isFocused,true,"RIGHT from channel focuses EPG");
  key(40);
  assert.equal(sim.liveEpgList.children[1].isFocused,true,"DOWN moves within EPG");
  assert.equal(h.calls.length,4,"navigating programmes is read-only, no playback");
});

test("S6.4 recording metadata normalizes VDR epoch dates and pipe genres",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();sim.nodes["nav-recordings"].click();
  sim.nodes["detail-recordings-load"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const rec={kind:"recording",backendId:"home",
    recordingId:"rec_00000000000000000000000000000001",title:"Ein Western",
    description:"Beschreibung",recordedAt:"1790837880",
    durationSeconds:6900,durationKnown:true,sizeMb:201};
  h.reply(2,200,{items:[rec],page:{limit:100,offset:0,totalCount:1,hasMore:false},
    meta:{partial:false}});
  sim.recordingList.children[0].click();
  h.reply(3,200,{...rec,metadata:{state:"available",source:"restfulapi-scraper-bridge",
    contentKind:"movie",genreText:"[Western|Drama]",overview:"Eine Geschichte"}});
  assert.match(sim.recordingDetailInfo.textContent,/Genre: Western · Drama/);
  assert.match(sim.recordingDetailInfo.textContent,/Aufgenommen: \d{2}\.\d{2}\.\d{4}/);
  assert.doesNotMatch(sim.recordingDetailInfo.textContent,/1790837880|\[Western\|Drama\]/);
});


test("S6.6 EPG row OK opens a readable detail, never silently ignores key",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();
  sim.nodes["nav-live"].click();
  sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const channel=channelPage().items[0];
  h.reply(2,200,channelPage());
  sim.liveList.children[0].click();
  sim.nodes["detail-live-epg-now"].click();
  const from=new URL(h.calls[3].url).searchParams.get("fromTime");
  const first={channelId:channel.channelId,eventId:"81234",
    title:"Die Rosenheim-Cops",subtitle:"Frostiger Tod",startTime:from,
    endTime:String(Number(from)+3600),durationSeconds:3600};
  const second={channelId:channel.channelId,title:"heute",
    startTime:String(Number(from)+3600),endTime:String(Number(from)+4200),
    durationSeconds:600};
  h.reply(3,200,{backendId:"home",channelId:channel.channelId,
    items:[first,second],page:{limit:2,hasMore:false},meta:{partial:false}});
  const detail=sim.epgDetailNodes;
  assert.equal(detail["live-epg-detail"].hidden,false);
  assert.match(detail["live-epg-detail-title"].textContent,/Rosenheim-Cops/);
  assert.equal(h.calls.length,4,"preview uses existing metadata, not network");
  const key=k=>sim.listeners.keydown({keyCode:k,preventDefault(){}});
  key(40);key(39);key(13);
  assert.match(h.calls[4].url,/\/api\/v1\/epg\/event\?/);
  assert.equal(h.calls[4].method,"GET");
  h.reply(4,200,{backendId:"home",channelId:channel.channelId,
    eventId:"81234",title:"Die Rosenheim-Cops",subtitle:"Frostiger Tod",
    description:"Ausführlicher Inhalt",startTime:first.startTime,
    endTime:first.endTime,durationSeconds:3600});
  assert.equal(detail["live-epg-detail-description"].textContent,"Ausführlicher Inhalt");
  key(40);key(13);
  assert.equal(h.calls.length,7,"detail response starts image GET before next EPG window");
  assert.match(h.calls[6].url,/\/api\/v1\/epg\/window\?/);
  const params=new URL(h.calls[6].url).searchParams;
  assert.equal(params.get("fromTime"),second.startTime);
  assert.equal(params.get("untilTime"),second.endTime);
  assert.match(detail["live-epg-detail-title"].textContent,/heute/);
  h.reply(6,200,{backendId:"home",channelId:channel.channelId,
    items:[{...second,eventId:"13739"}],
    page:{limit:24,hasMore:false,nextCursor:null},meta:{partial:false}});
  assert.equal(h.calls.length,8,"verified ID triggers native detail GET");
  assert.match(h.calls[7].url,/\/api\/v1\/epg\/event\?/);
  assert.equal(new URL(h.calls[7].url).searchParams.get("eventId"),"13739");
  h.reply(7,200,{backendId:"home",channelId:channel.channelId,
    eventId:"13739",title:"heute",subtitle:"",
    description:"Nachrichten und Wetter",startTime:second.startTime,
    endTime:second.endTime,durationSeconds:600});
  assert.match(detail["live-epg-detail-description"].textContent,/Nachrichten und Wetter/);
  sim.nodes["nav-recordings"].click();
  assert.equal(detail["live-epg-detail"].hidden,true);
});

test("S6.7 missing or ambiguous native EPG IDs never cause guessed detail requests",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();sim.nodes["nav-live"].click();sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const channel=channelPage().items[0];h.reply(2,200,channelPage());
  sim.liveList.children[0].click();sim.nodes["detail-live-epg-now"].click();
  const from=new URL(h.calls[3].url).searchParams.get("fromTime");
  const entry={channelId:channel.channelId,title:"Tagesschau",
    startTime:from,endTime:String(Number(from)+900),durationSeconds:900};
  h.reply(3,200,{backendId:"home",channelId:channel.channelId,
    items:[entry],page:{limit:2,hasMore:false},meta:{partial:false}});
  const key=k=>sim.listeners.keydown({keyCode:k,preventDefault(){}});
  key(40);key(39);key(13);
  assert.match(h.calls[4].url,/\/api\/v1\/epg\/window\?/);
  h.reply(4,200,{backendId:"home",channelId:channel.channelId,
    items:[entry],page:{limit:24,hasMore:false,nextCursor:null},
    meta:{partial:false}});
  assert.equal(h.calls.length,5);
  assert.match(sim.epgDetailNodes["live-epg-detail-description"].textContent,
    /keine eindeutig belegte native Event-ID/);
  key(13);
  h.reply(5,200,{backendId:"home",channelId:channel.channelId,
    items:[{...entry,eventId:"81234"},{...entry,eventId:"81235"}],
    page:{limit:24,hasMore:false,nextCursor:null},meta:{partial:false}});
  assert.equal(h.calls.length,6,"duplicate matching rows are ambiguous");
  key(13);
  h.reply(6,200,{backendId:"home",channelId:channel.channelId,
    items:[{...entry,eventId:"81234"}],
    page:{limit:24,hasMore:true,nextCursor:"ew1_more"},meta:{partial:false}});
  assert.equal(h.calls.length,7,"not all rows received; do not assume uniqueness");
  key(13);
  assert.equal(h.calls.length,8);
  sim.nodes["nav-recordings"].click();
  const aborted=h.calls[7];
  assert.equal(aborted.aborted,true,"leaving page cancels pending window request");
  h.reply(7,200,{backendId:"home",channelId:channel.channelId,
    items:[{...entry,eventId:"81234"}],
    page:{limit:24,hasMore:false,nextCursor:null},meta:{partial:false}});
  assert.equal(h.calls.length,8,"stale callback must not start detail after navigation");
});

test("S6.8 authorized EPG preferred poster is shown and freed when leaving Live-TV",()=>{
  const h=liveTransport(),urls=[],revoked=[];
  const api={
    createObjectURL(blob) {
      assert.equal(blob.type,"image/jpeg");
      const url="blob:epg-"+(urls.length+1);urls.push(url);return url;
    },
    revokeObjectURL(url){revoked.push(url);}
  };
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR,artworkApi:api});
  sim.video.finish();sim.nodes["nav-live"].click();sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const channel=channelPage().items[0];h.reply(2,200,channelPage());
  sim.liveList.children[0].click();sim.nodes["detail-live-epg-now"].click();
  const from=new URL(h.calls[3].url).searchParams.get("fromTime");
  const evt={channelId:channel.channelId,eventId:"13739",title:"Tagesschau",
    subtitle:"Nachrichten",startTime:from,endTime:String(Number(from)+900),durationSeconds:900};
  h.reply(3,200,{backendId:"home",channelId:channel.channelId,
    items:[evt],page:{limit:2,hasMore:false},meta:{partial:false}});
  const key=k=>sim.listeners.keydown({keyCode:k,preventDefault(){}});
  key(40);key(39);key(13);
  assert.match(h.calls[4].url,/\/api\/v1\/epg\/event\?/);
  h.reply(4,200,{backendId:"home",channelId:channel.channelId,
    eventId:"13739",title:"Tagesschau",subtitle:"Nachrichten",
    description:"Nachrichten",startTime:evt.startTime,
    endTime:evt.endTime,durationSeconds:900});
  assert.match(h.calls[5].url,/\/api\/v1\/epg\/preferred-artwork\?/);
  assert.equal(h.calls[5].responseType,"arraybuffer");
  assert.match(h.calls[5].headers.Authorization,/^VDR-Suite-Device /);
  h.calls[5].status=200;h.calls[5].response=new Uint8Array([1,2,3]).buffer;
  h.calls[5].mime="image/jpeg";h.calls[5].responseURL=h.calls[5].url;h.calls[5].onload();
  const img=sim.epgDetailNodes["live-epg-detail-poster"];
  assert.equal(img.hidden,false);assert.equal(img.src,"blob:epg-1");
  sim.nodes["nav-recordings"].click();
  assert.equal(img.hidden,true);assert.equal(img.src,"");
  assert.deepEqual(revoked,["blob:epg-1"]);
});

test("S6.8 EPG 404 preferred falls back to direct and stale images cannot appear",()=>{
  const h=liveTransport(),urls=[];
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR,
    artworkApi:{createObjectURL(){urls.push("blob:stale");return "blob:stale";},
      revokeObjectURL(){}}});
  sim.video.finish();sim.nodes["nav-live"].click();sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const channel=channelPage().items[0];h.reply(2,200,channelPage());
  sim.liveList.children[0].click();sim.nodes["detail-live-epg-now"].click();
  const from=new URL(h.calls[3].url).searchParams.get("fromTime");
  const evt={channelId:channel.channelId,eventId:"9",title:"Film",subtitle:"",
    startTime:from,endTime:String(Number(from)+900),durationSeconds:900};
  h.reply(3,200,{backendId:"home",channelId:channel.channelId,
    items:[evt],page:{limit:2,hasMore:false},meta:{partial:false}});
  const key=k=>sim.listeners.keydown({keyCode:k,preventDefault(){}});
  key(40);key(39);key(13);
  h.reply(4,200,{backendId:"home",channelId:channel.channelId,
    eventId:"9",title:"Film",subtitle:"",description:"Beschreibung",
    startTime:evt.startTime,endTime:evt.endTime,durationSeconds:900});
  h.reply(5,404,{code:"not_found"});
  assert.match(h.calls[6].url,/\/api\/v1\/epg\/artwork\?/);
  h.reply(6,404,{code:"not_found"});
  assert.match(sim.epgDetailNodes["live-epg-artwork-status"].textContent,/Kein Sendungsbild/);
  assert.equal(urls.length,0);
  key(13); // fetch again, then navigate away before its preferred response.
  h.reply(7,200,{backendId:"home",channelId:channel.channelId,
    eventId:"9",title:"Film",subtitle:"",description:"Beschreibung",
    startTime:evt.startTime,endTime:evt.endTime,durationSeconds:900});
  sim.nodes["nav-recordings"].click();
  assert.equal(h.calls[8].aborted,true);
  h.calls[8].status=200;h.calls[8].response=new Uint8Array([1]).buffer;
  h.calls[8].mime="image/jpeg";h.calls[8].responseURL=h.calls[8].url;h.calls[8].onload();
  assert.equal(urls.length,0,"stale response never creates poster URL");
  assert.equal(sim.epgDetailNodes["live-epg-detail-poster"].hidden,true);
});

test("S6.10 native AVPlay clock diagnosis is bounded and invalidated on stop",()=>{
  const evidence=[],mock={
    state:"IDLE",time:0,listener:null,
    open(){this.state="IDLE";},
    setListener(handler){this.listener=handler;},
    prepareAsync(success){this.state="READY";success();},
    play(){this.state="PLAYING";},
    pause(){this.state="PAUSED";},
    stop(){this.state="IDLE";},
    close(){this.state="NONE";},
    getState(){return this.state;},
    getCurrentTime(){return this.time;},
    getTotalTrackInfo(){return [];},
    getCurrentStreamInfo(){return [];}
  };
  const player=createSamsungRecordingPlayer({webapis:{avplay:mock}});
  assert.equal(player.start("https://tv.example.test/stream.ts",
    (state,detail)=>evidence.push({state,detail})),true);
  mock.listener.oncurrentplaytime(1000);
  mock.listener.oncurrentplaytime(1500);
  mock.listener.oncurrentplaytime(2100);
  mock.listener.oncurrentplaytime(3900);
  mock.time=3900;
  assert.equal(player.inspectPlayback().state,"PLAYING");
  assert.equal(player.inspectPlayback().seconds,3);
  assert.equal(player.inspectPlayback().deltaSeconds,2);
  assert.ok(evidence.some(x=>x.state==="progress"&&x.detail.advanced));
  assert.equal(player.pauseOrResume("pause"),"paused");
  assert.equal(player.inspectPlayback().state,"PAUSED");
  assert.equal(player.pauseOrResume("play"),"resume_requested");
  assert.equal(player.inspectPlayback().state,"PLAYING");
  const previous=evidence.length,callback=mock.listener.oncurrentplaytime;
  callback(-10);callback(Infinity);callback("secret");
  assert.equal(evidence.length,previous,"bad callback data is dropped");
  player.stop();callback(9999000);
  assert.equal(player.inspectPlayback().state,"unavailable");
  assert.equal(player.inspectPlayback().deltaSeconds,0);
  assert.equal(evidence.length,previous,"stale callbacks cannot update UI");
  assert.doesNotMatch(JSON.stringify(evidence),/https:|Cookie|secret/);
});

test("S6.10 EPG long synopsis can be scrolled with focusable D-pad actions",()=>{
  assert.match(html,/data-focus-id="live-epg-scroll-down"/);
  assert.match(html,/data-epg-scroll="1"/);
  assert.match(html,/data-epg-scroll="-1"/);
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();sim.nodes["nav-live"].click();sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const channel=channelPage().items[0];h.reply(2,200,channelPage());
  sim.liveList.children[0].click();sim.nodes["detail-live-epg-now"].click();
  const from=new URL(h.calls[3].url).searchParams.get("fromTime");
  h.reply(3,200,{backendId:"home",channelId:channel.channelId,
    items:[{channelId:channel.channelId,title:"SOKO Potsdam",subtitle:"Running Dinner",
      startTime:from,endTime:String(Number(from)+3000),durationSeconds:3000}],
    page:{limit:2,hasMore:false},meta:{partial:false}});
  assert.equal(sim.epgScrollActions.hidden,false);
  sim.nodes["live-epg-scroll-down"].click();
  assert.equal(sim.epgDetailNodes["live-epg-detail"].scrollTop,230);
  sim.nodes["live-epg-scroll-down"].click();
  assert.equal(sim.epgDetailNodes["live-epg-detail"].scrollTop,460);
  sim.nodes["live-epg-scroll-up"].click();
  assert.equal(sim.epgDetailNodes["live-epg-detail"].scrollTop,230);
  sim.nodes["nav-recordings"].click();
  assert.equal(sim.epgScrollActions.hidden,true);
  assert.equal(sim.epgDetailNodes["live-epg-detail"].hidden,true);
});

test("S6.12 registered remote keys require explicit TV privilege",()=>{
  const config=readFileSync("app/config.xml","utf8");
  assert.match(config,/<tizen:privilege name="http:\/\/tizen.org\/privilege\/tv.inputdevice"\/>/);
  const registered=simulate();
  assert.match(registered.textNodes["remote-status"].textContent,
    /PLAY\/PAUSE\/STOP\/BLAU registriert/);
  const blocked=simulate({blockMediaKeys:true});
  assert.match(blocked.textNodes["remote-status"].textContent,
    /nicht registriert: MediaPlay, MediaPause, MediaStop, ColorF3Blue/);
  assert.equal(blocked.panels.find(p=>p.route==="home").hidden,false);
});

test("S6.12 EPG DOWN from last programme focuses its scroll action immediately",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();sim.nodes["nav-live"].click();sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const selected=channelPage().items[0];
  h.reply(2,200,channelPage());
  sim.liveList.children[0].click();sim.nodes["detail-live-epg-now"].click();
  const from=new URL(h.calls[3].url).searchParams.get("fromTime");
  h.reply(3,200,{backendId:"home",channelId:selected.channelId,
    items:[{channelId:selected.channelId,title:"Jetzt",subtitle:"",
      startTime:from,endTime:String(Number(from)+900),durationSeconds:900},
      {channelId:selected.channelId,title:"Danach",subtitle:"",
      startTime:String(Number(from)+900),endTime:String(Number(from)+1800),
      durationSeconds:900}],
    page:{limit:2,hasMore:false},meta:{partial:false}});
  const key=k=>sim.listeners.keydown({keyCode:k,preventDefault(){}});
  key(40);key(39);key(40);
  assert.equal(sim.liveEpgList.children[1].isFocused,true);
  key(40);
  assert.equal(sim.nodes["live-epg-scroll-down"].isFocused,true);
  key(13);
  assert.equal(sim.epgDetailNodes["live-epg-detail"].scrollTop,230);
  key(38);
  assert.equal(sim.liveEpgList.children[1].isFocused,true);
  assert.equal(h.calls.length,4,"scroll navigation never fetches metadata");
});

test("S6.13 MPEG audio is not silently classified as MP3 or decoded sound",()=>{
  const events=[],api={
    state:"IDLE",listener:null,selected:0,
    open(){this.state="IDLE";},
    setListener(listener){this.listener=listener;},
    prepareAsync(ok){this.state="READY";ok();},
    play(){this.state="PLAYING";},
    getState(){return this.state;},
    getTotalTrackInfo(){return [{type:"AUDIO",index:1,
      extra_info:JSON.stringify({fourCC:"mpeg",channels:"2",sample_rate:"48000"})}];},
    getCurrentStreamInfo(){return [{type:"AUDIO",index:1,
      extra_info:JSON.stringify({fourCC:"mpeg",channels:"2",sample_rate:"48000"})}];},
    setSelectTrack(){this.selected++;},
    stop(){this.state="IDLE";},close(){this.state="NONE";}
  };
  const player=createSamsungRecordingPlayer({webapis:{avplay:api}});
  assert.equal(player.start("https://example.test/media.ts",(state,detail)=>{
    events.push({state,detail});
  }),true);
  const info=events.find(item=>item.state==="audio").detail;
  assert.equal(info.status,"no_safe_switch");
  assert.equal(info.currentIndex,1);
  assert.equal(info.tracks[0].fourCC,"MPEG");
  assert.equal(info.tracks[0].sampleRate,48000);
  assert.match(describeSamsungAudio(info),/MPEG \[MPEG\].*48000Hz.*MP2\/MP3 nicht bestimmt/);
  assert.equal(api.selected,0,"no speculative auto audio-track switching");
  player.stop();
});

test("S6.13 TV sound routing diagnostics are read-only and fail closed",()=>{
  let writes=0;
  const good={tizen:{tvaudiocontrol:{
    isMute(){return false;},getVolume(){return 30;},getOutputMode(){return "PCM";},
    setMute(){writes++;},setVolume(){writes++;},playSound(){writes++;}
  }}};
  assert.match(samsungTvSoundStatus(good),/Stumm: nein · Lautstärke: 30 · Ausgabe: PCM/);
  assert.equal(writes,0);
  assert.equal(samsungTvSoundStatus({}),"TV-Tonstatus nicht verfügbar");
  const bad={tizen:{tvaudiocontrol:{
    isMute(){throw Error("credential secret");},
    getVolume(){return -100;},getOutputMode(){return "untrusted-server-path";}
  }}};
  assert.equal(samsungTvSoundStatus(bad),"TV-Tonstatus nicht lesbar");
  assert.doesNotMatch(samsungTvSoundStatus(bad),/secret|untrusted/);
});

test("S6.14 native control latency and delayed AVPlay clock probe are read-only and fenced",()=>{
  const source=readFileSync("app/src/main.js","utf8");
  assert.match(source,/var beforeCall=Date\.now\(\)/);
  assert.match(source,/var afterCall=Date\.now\(\)/);
  assert.match(source,/Native-API .*?callMs.*?Snapshot .*?snapshotMs/s);
  assert.match(source,/recordingPlayer\.inspectPlayback\(\)/);
  assert.match(source,/window\.setTimeout\(function \(\) \{/);
  assert.match(source,/recordingControlSequence!==controlTicket/);
  assert.match(source,/recordingPlaybackSession!==controllingSession/);
  assert.match(source,/recordingControlSequence\+\+/);
  assert.match(source,/Uhr unverändert/);
  assert.doesNotMatch(source,/setBufferingParam\(/,
    "observability-only slice must not silently tune the native media buffer");
  assert.doesNotMatch(source,/resume_requested.*setSelectTrack/s,
    "do not switch audio based on remote resume requests");
});


test("S6.15 remote digits, channel keys and Menu operate on the loaded TV UI without requests",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();
  sim.nodes["nav-live"].click();
  sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  const first=channelPage().items[0];
  const second={...first,channelId:"second-channel",channelNumber:17,name:"ZDF"};
  const third={...first,channelId:"third-channel",channelNumber:230,name:"WDR"};
  h.reply(2,200,{...channelPage(),items:[first,second,third]});
  assert.equal(sim.liveList.children.length,3);
  const key=keyCode=>sim.listeners.keydown({keyCode,preventDefault(){}});
  key(428); // CH- enters loaded channel list.
  assert.equal(sim.liveList.children[0].isFocused,true);
  key(428); // Next loaded channel.
  assert.equal(sim.liveList.children[1].isFocused,true);
  key(427); // CH+ back.
  assert.equal(sim.liveList.children[0].isFocused,true);
  key(49);key(55); // Channel 17 (only current loaded page).
  assert.equal(sim.liveList.children[1].isFocused,true);
  assert.equal(h.calls.length,3,"remote browsing must not fetch, tune or mutate");
  key(18); // Samsung Menu -> VDR-Suite settings, not TV installation.
  assert.equal(sim.panels.find(p=>p.route==="settings").hidden,false);
  key(10009);
  assert.equal(sim.panels.find(p=>p.route==="live").hidden,false);
});


test("S6.15 INFO on a real loaded channel requests existing authenticated now-next EPG",()=>{
  const h=liveTransport();
  const sim=simulate({keymanager:savedDeviceManager(),XMLHttpRequest:h.XHR});
  sim.video.finish();
  sim.nodes["nav-live"].click();
  sim.nodes["detail-live-preview"].click();
  h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
  h.reply(1,200,backendPage);
  h.reply(2,200,channelPage());
  sim.liveList.children[0].click();
  assert.equal(h.calls.length,3);
  // Re-focus stays on the channel row after selecting it.
  sim.listeners.keydown({keyCode:457,preventDefault(){}});
  assert.equal(h.calls.length,4,"INFO must initiate the existing explicit EPG query");
  assert.match(h.calls[3].url,/\/api\/v1\/epg\/now-next\?/);
  assert.equal(h.calls[3].method,"GET");
  assert.match(sim.liveEpgStatus.textContent,/wird geladen/);
  assert.equal(h.calls.filter(req=>req.method!=="GET").length,0);
});
