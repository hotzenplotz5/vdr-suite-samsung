import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createSamsungRecordingPlayer} from "../app/src/platform/recording-player.js";

const main=readFileSync(new URL("../app/src/main.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../app/styles.css",import.meta.url),"utf8");
const html=readFileSync(new URL("../app/index.html",import.meta.url),"utf8");

test("S5.2: AVPlay object is moved outside the scrollable Recording page",()=>{
  assert.match(main,/document\.body\.appendChild\(recordingPlayerSurface\)/);
  assert.match(main,/recordingPlayerSurface\.hidden = false;\s+document\.documentElement\.classList\.add\("recording-avplay-active"\)/);
  assert.match(main,/recordingPlayerSurface\.hidden = true;\s+document\.documentElement\.classList\.remove\("recording-avplay-active"\)/);
  assert.match(html,/<object\s+id="recording-avplay-object"\s+type="application\/avplayer"/);
  assert.equal((html.match(/id="recording-player-surface"/g)||[]).length,1);
});

test("S5.2: Samsung native video plane is uncovered, viewport cannot be clipped",()=>{
  assert.match(css,/html\.recording-avplay-active body \{ background: transparent !important; \}/);
  assert.match(css,/html\.recording-avplay-active \.app \{ visibility: hidden; background: transparent !important; \}/);
  assert.match(css,/\.recording-player-surface \{ position: fixed; z-index: 10000; top: 0; left: 0;/);
  assert.match(css,/width: 100vw; height: 100vh;/);
  assert.match(css,/\.recording-player-surface object \{ position: absolute; display: block;/);
  assert.doesNotMatch(css,/\.recording-player-surface \{[^}]*background:\s*#[a-f0-9]+/i);
});

test("S5.2: AVPlay video plane uses complete 1920x1080 display rectangle with letterbox",()=>{
  const calls=[];
  let prepared;
  const api={
    open(){calls.push(["open"]);},
    setDisplayRect(...dims){calls.push(["rect",...dims]);},
    setDisplayMethod(mode){calls.push(["method",mode]);},
    setListener(){},
    prepareAsync(done){prepared=done;},
    play(){calls.push(["play"]);},stop(){},close(){}
  };
  const player=createSamsungRecordingPlayer({webapis:{avplay:api}});
  assert.equal(player.start("https://example.invalid/stream.m3u8",()=>{}),true);
  assert.deepEqual(calls.filter(x=>x[0]==="rect"),[["rect",0,0,1920,1080]]);
  assert.deepEqual(calls.filter(x=>x[0]==="method"),[["method","PLAYER_DISPLAY_MODE_LETTER_BOX"]]);
  prepared();
  assert.equal(calls.filter(x=>x[0]==="play").length,1);
});

test("S5.2: unsupported optional display mode does not block playback",()=>{
  let prepared;
  const api={
    open(){},setDisplayRect(){},setDisplayMethod(){throw Error("Tizen mode unsupported");},
    prepareAsync(done){prepared=done;},play(){},stop(){},close(){}
  };
  const states=[],player=createSamsungRecordingPlayer({webapis:{avplay:api}});
  assert.equal(player.start("https://example.invalid/stream.mp4",s=>states.push(s)),true);
  prepared();
  assert.ok(states.includes("playing"));
});

test("S6.0: one capture-phase keydown owner routes playback keys and shows a bounded diagnostic",()=>{
  assert.match(main,/document\.addEventListener\("keydown", function \(event\) \{/);
  assert.match(main,/var action = playbackRemoteAction\(key\)/);
  assert.match(main,/if \(event\.repeat && action\) return/);
  assert.match(main,/recordingRemoteHint\.textContent = "Fernbedienung · Taste " \+ key/);
  assert.match(main,/\}, true\);/);
  assert.match(html,/id="recording-remote-hint"[^>]*class="recording-player-hint"/);
});
