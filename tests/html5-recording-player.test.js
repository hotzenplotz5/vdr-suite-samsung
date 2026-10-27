import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHtml5RecordingPlayer,html5PlaybackDiagnosis} from "../app/src/platform/html5-recording-player.js";
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
  assert.equal(player.pauseOrResume(),"resume_requested");
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

function fakeClock() {
  let next=1;
  const tasks=new Map();
  return {
    setTimeout(fn,ms){const id=next++;tasks.set(id,{fn,ms});return id;},
    clearTimeout(id){tasks.delete(id);},
    flush(ms){const work=[...tasks].filter(([,t])=>t.ms===ms);
      for(const [id,task] of work){if(tasks.has(id)){tasks.delete(id);task.fn();}}
    },
    get count(){return tasks.size;}
  };
}

test("S6.2: HTML5 black screen with no events reports startup timeout, not false playback success",()=>{
  const video=fakeVideo(),clock=fakeClock(),player=createHtml5RecordingPlayer(video,clock),events=[];
  player.start(url,(state,detail)=>events.push({state,detail}));
  assert.deepEqual(events.map(x=>x.state),["preparing"]);
  assert.equal(clock.count,1);
  clock.flush(12000);
  assert.deepEqual(events.at(-1),{state:"error",detail:{stage:"html5",code:"startup_timeout"}});
  assert.match(html5PlaybackDiagnosis(events.at(-1).detail),/Schwarzes Bild/);
  assert.equal(player.pauseOrResume(),"unavailable");
  video.oncanplay();
  assert.ok(!video.actions.includes("play"),"stale oncanplay must not revive failed media");
  player.stop();
  assert.equal(clock.count,0);
});

test("S6.2: buffering after real onplaying terminates only if no progress for 20 seconds",()=>{
  const video=fakeVideo(),clock=fakeClock(),player=createHtml5RecordingPlayer(video,clock),events=[];
  player.start(url,(state,detail)=>events.push({state,detail}));
  video.oncanplay();video.onplaying();
  assert.equal(clock.count,0,"playing cancels startup watchdog");
  video.onwaiting();
  assert.equal(events.at(-1).state,"buffering");
  clock.flush(20000);
  assert.equal(events.at(-1).detail.code,"stall_timeout");
  assert.match(html5PlaybackDiagnosis(events.at(-1).detail),/Videopufferung/);
  video.onplaying();
  assert.equal(events.at(-1).state,"error","terminal failure cannot become playing");
});

test("S6.2: stop and next start invalidate all old startup deadlines and media callbacks",()=>{
  const v=fakeVideo(),clock=fakeClock(),player=createHtml5RecordingPlayer(v,clock),events=[];
  player.start(url,(s)=>events.push(s));
  const oldCanPlay=v.oncanplay;
  player.stop();
  assert.equal(clock.count,0);
  clock.flush(12000);oldCanPlay();
  assert.deepEqual(events,["preparing"]);
  player.start(url,(s)=>events.push(s));
  v.oncanplay();v.onplaying();
  clock.flush(12000);
  assert.deepEqual(events,["preparing","preparing","playing"]);
  v.onended();
  assert.equal(clock.count,0);
  assert.equal(player.pauseOrResume(),"unavailable");
});

test("S6.2: video media error, play rejection and explicit format errors are sanitized",async()=>{
  const v=fakeVideo(),clock=fakeClock(),events=[],player=createHtml5RecordingPlayer(v,clock);
  player.start(url,(s,d)=>events.push({s,d}));
  v.error={code:4,message:"private account and media URL"};
  v.onerror();v.onerror();
  assert.equal(events.filter(e=>e.s==="error").length,1);
  assert.match(html5PlaybackDiagnosis(events.at(-1).d),/Codec/);
  assert.doesNotMatch(JSON.stringify(events),/private account|media URL/);
  const w=fakeVideo();
  w.play=()=>Promise.reject(Error("do not disclose private media URL"));
  const ev=[],q=createHtml5RecordingPlayer(w,clock);
  q.start(url,(s,d)=>ev.push({s,d}));
  w.oncanplay();
  await Promise.resolve();await Promise.resolve();
  assert.equal(ev.at(-1).d.code,"play_rejected");
  assert.doesNotMatch(JSON.stringify(ev),/private media URL/);
  q.stop();
});

test("S6.2: pause clears buffering timer; resumed playing has a bounded recovery deadline",()=>{
  const v=fakeVideo(),clock=fakeClock(),events=[];
  const player=createHtml5RecordingPlayer(v,clock);
  player.start(url,(s,d)=>events.push({s,d}));
  v.oncanplay();v.onplaying();
  v.onwaiting();assert.equal(clock.count,1);
  assert.equal(player.pauseOrResume(),"paused");
  assert.equal(clock.count,0);
  assert.equal(player.pauseOrResume(),"resume_requested");
  assert.equal(clock.count,1);
  v.onplaying();
  assert.equal(clock.count,0);
  clock.flush(20000);
  assert.equal(events.filter(e=>e.s==="error").length,0);
});

test("S6.2: intentionally paused HTML5 video ignores incidental waiting/stalled events",()=>{
  const v=fakeVideo(),clock=fakeClock(),events=[],p=createHtml5RecordingPlayer(v,clock);
  p.start(url,(state,detail)=>events.push({state,detail}));
  v.oncanplay();v.onplaying();
  assert.equal(p.pauseOrResume(),"paused");
  assert.equal(clock.count,0);
  v.onwaiting();v.onstalled();
  assert.equal(clock.count,0);
  assert.equal(events.filter(x=>x.state==="buffering").length,0);
});

test("S6.2: synchronous HTML5 load error never gets reclassified as preparing",()=>{
  const v=fakeVideo(),clock=fakeClock(),events=[];
  v.load=function(){if(this.onerror)this.onerror();};
  v.error={code:4,message:"private media URL"};
  const p=createHtml5RecordingPlayer(v,clock);
  assert.equal(p.start(url,(state,detail)=>events.push({state,detail})),true);
  assert.deepEqual(events,[{state:"error",detail:{stage:"html5",code:"4"}}]);
  assert.equal(clock.count,0);
  assert.doesNotMatch(JSON.stringify(events),/private media URL/);
});

test("S6.5: HTML5 transport controls do not toggle the wrong way",()=>{
  const v=fakeVideo(),player=createHtml5RecordingPlayer(v),states=[];
  player.start(url,(state)=>states.push(state));v.oncanplay();v.onplaying();
  assert.equal(player.pauseOrResume("play"),"already_playing");
  assert.equal(player.pauseOrResume("pause"),"paused");
  assert.equal(player.pauseOrResume("pause"),"already_paused");
  assert.equal(player.pauseOrResume("play"),"resume_requested");
  v.onplaying();
  assert.equal(player.pauseOrResume("toggle"),"paused");
  player.stop();
  assert.equal(player.pauseOrResume("play"),"unavailable");
});
