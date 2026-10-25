import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHtml5RecordingPlayer} from "../app/src/platform/html5-recording-player.js";
const url="https://example.invalid/vdr-suite/api/v1/media/sessions/ms_0123456789abcdef0123456789abcdef/recording/stream.mp4";
function fakeVideo(){
  const actions=[];
  const video={paused:true,error:null,src:"",actions,
    play(){actions.push("play");this.paused=false;return Promise.resolve();},
    pause(){actions.push("pause");this.paused=true;},
    load(){actions.push("load");},
    removeAttribute(key){actions.push("remove "+key);if(key==="src")this.src="";}
  };
  return video;
}

test("S5.3: HTML5 MP4 path plays via browser without Device secret or native AVPlay",()=>{
  const v=fakeVideo(),player=createHtml5RecordingPlayer(v),states=[];
  assert.equal(player.available(),true);
  assert.equal(player.start(url,(s)=>states.push(s)),true);
  assert.ok(states.includes("preparing"));
  assert.equal(v.src,url);
  v.oncanplay();
  assert.ok(v.actions.includes("play"));
  v.onplaying();
  assert.ok(states.includes("playing"));
  assert.equal(player.pauseOrResume(),"paused");
  assert.equal(player.pauseOrResume(),"playing");
  player.stop();
  assert.equal(v.src,"");
});

test("S5.3: HTML5 cannot be used for native TS/HLS or URL tokens",()=>{
  const v=fakeVideo(),player=createHtml5RecordingPlayer(v);
  const denied=[url.replace(".mp4",".ts"),
    url.replace("/recording/stream.mp4","/hls/master.m3u8"),
    url+"?token=bad","file:///media.ts","http://example.invalid/a.mp4"];
  for(const path of denied) {
    const events=[];
    assert.equal(player.start(path,(s)=>events.push(s)),false);
    assert.deepEqual(events,["unsupported"]);
    assert.equal(v.src,"");
  }
});

test("S5.3: HTML5 playback failures retain only sanitized media error code",()=>{
  const v=fakeVideo(),player=createHtml5RecordingPlayer(v),events=[];
  player.start(url,(state,detail)=>events.push({state,detail}));
  v.error={code:3,message:"Sensitive cookie and URL"};
  v.onerror();
  assert.deepEqual(events.at(-1),{state:"error",detail:{stage:"html5",code:"3"}});
  assert.doesNotMatch(JSON.stringify(events),/Sensitive|cookie and URL/);
});

test("S5.3: there is one selected playback mode, both stopped on cleanup",()=>{
  const s=readFileSync(new URL("../app/src/main.js",import.meta.url),"utf8");
  const html=readFileSync(new URL("../app/index.html",import.meta.url),"utf8");
  assert.match(s,/recordingPlayerMode = mode/);
  assert.match(s,/recordingHtml5Player\.stop\(\)/);
  assert.match(s,/recordingAvplayObject\.hidden = mode === "html5"/);
  assert.match(s,/recordingHtml5Video\.hidden = mode !== "html5"/);
  assert.match(s,/startSelectedRecording\(action\)/);
  assert.match(s,/mode === "html5" \? recordingHtml5Player : recordingPlayer/);
  assert.match(html,/data-recordings-action="html5"/);
  assert.match(html,/id="recording-html5-video"/);
});
