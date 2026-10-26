import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createSamsungRecordingPlayer} from "../app/src/platform/recording-player.js";
import {probeMediaHttpHeaders,describeMediaAccessProbe} from "../app/src/api/media-access-probe.js";

const url="https://example.invalid/vdr-suite/api/v1/media/sessions/ms_0123456789abcdef0123456789abcdef/recording/stream.mp4";
function mock(){
  const calls=[];
  function XHR(){calls.push(this);this.headers={};this.readyState=0;this.status=0;}
  XHR.prototype.open=function(method,url){this.method=method;this.url=url;};
  XHR.prototype.setRequestHeader=function(key,value){this.headers[key]=value;};
  XHR.prototype.send=function(){this.sent=true;};
  XHR.prototype.abort=function(){this.aborted=true;};
  return {calls,env:{XMLHttpRequest:XHR}};
}
test("S5.3: required WebAPI library is explicitly included before client runtime",()=>{
  const html=readFileSync(new URL("../app/index.html",import.meta.url),"utf8");
  assert.match(html,/\$WEBAPIS\/webapis\/webapis\.js/);
  assert.ok(html.indexOf("$WEBAPIS/webapis/webapis.js")<html.indexOf('src="tv-runtime.js"'));
});

test("S5.3: AVPlay WebAPI prepareAsync callback preserves only a safe error name",()=>{
  const obj={open(){},setDisplayRect(){},setListener(){},
    prepareAsync(ok,failed){this.failed=failed;},play(){},stop(){},close(){}};
  const events=[],player=createSamsungRecordingPlayer({webapis:{avplay:obj}});
  assert.equal(player.start("https://example.invalid/m.mp4",(state,info)=>events.push({state,info})),true);
  obj.failed({name:"InvalidAccessError",message:"very secret cookie and media URL"});
  const event=events.find(x=>x.state==="error");
  assert.deepEqual(event.info,{stage:"prepare",code:"InvalidAccessError"});
  assert.doesNotMatch(JSON.stringify(event),/secret|cookie|media URL/);
});

test("S5.3: protected session media GET sends a 1-byte Range and cancels at headers",()=>{
  const h=mock();let result;
  probeMediaHttpHeaders(h.env,url,v=>result=v);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].method,"GET");
  assert.equal(h.calls[0].withCredentials,true);
  assert.equal(h.calls[0].headers.Range,"bytes=0-0");
  assert.equal(h.calls[0].headers.Authorization,undefined);
  h.calls[0].status=206;h.calls[0].readyState=2;h.calls[0].onreadystatechange();
  assert.deepEqual(result,{kind:"reachable",status:206});
  assert.equal(h.calls[0].aborted,true);
  assert.match(describeMediaAccessProbe(result),/AVPlay-Zugriff/);
});

test("S5.3: media 401 indicates cookie/gateway denial; unknown CORS not decoder failure",()=>{
  const h=mock();let result;
  probeMediaHttpHeaders(h.env,url,v=>result=v);
  h.calls[0].status=401;h.calls[0].readyState=2;h.calls[0].onreadystatechange();
  assert.deepEqual(result,{kind:"denied",status:401});
  assert.match(describeMediaAccessProbe(result),/Cookie-/);
  const q=mock();probeMediaHttpHeaders(q.env,url,v=>result=v);q.calls[0].onerror();
  assert.equal(result.kind,"network_or_cors");
  assert.match(describeMediaAccessProbe(result),/kein Beweis für einen AVPlay-Decoderfehler/);
});

test("S5.3: never probe arbitrary origin, URL token, local file or leaked session path",()=>{
  for(const invalid of ["http://example.invalid/private","https://example.invalid/video.ts",
    url+"?token=leak","file:///srv/vdr/movie.ts"]){
    const h=mock();let result;
    probeMediaHttpHeaders(h.env,invalid,v=>result=v);
    assert.deepEqual(result,{kind:"not_supported"});
    assert.equal(h.calls.length,0);
  }
});

test("S5.3: probe happens before MediaSession STOP and cannot overwrite a different session",()=>{
 const main=readFileSync(new URL("../app/src/main.js",import.meta.url),"utf8");
 assert.match(main,/probeMediaHttpHeaders\(window,result\.mediaUrl,function \(probe\) \{/);
 assert.match(main,/if \(recordingPlaybackSession !== failedSession \|\| !failedSession\) return;/);
 assert.match(main,/stopRecordingPlayback\("failure"\);\s+recordingStatus\("error",mode === "html5"/);
});

test("S6.1: multi-track audio selects only a known AAC stereo track while PLAYING",()=>{
  let prepared,selected=-1;const switches=[];
  const tracks=[
    {type:"AUDIO",index:2,extra_info:'{"fourCC":"AC3","channels":"6","language":"deu"}'},
    {type:"AUDIO",index:5,extra_info:'{"fourCC":"AACL","channels":"2","language":"eng"}'}
  ];
  const api={open(){},close(){},stop(){},play(){},
    prepareAsync(ok){prepared=ok;},getState(){return "PLAYING";},
    getTotalTrackInfo(){return tracks;},
    getCurrentStreamInfo(){return selected<0?[]:[tracks.find(t=>t.index===selected)];},
    setSelectTrack(type,index){switches.push([type,index]);selected=index;}
  };
  const events=[],p=createSamsungRecordingPlayer({webapis:{avplay:api}});
  assert.equal(p.start(url,(state,detail)=>events.push({state,detail})),true);
  assert.equal(switches.length,0,"No audio selection during IDLE/READY");
  prepared();
  assert.deepEqual(switches,[["AUDIO",5]]);
  const sound=events.filter(x=>x.state==="audio")[0].detail;
  assert.equal(sound.status,"selected_confirmed");
  assert.equal(sound.total,2);
  assert.equal(sound.currentIndex,5);
  assert.equal(sound.tracks[1].codec,"AAC");
  assert.equal(sound.tracks[1].channels,2);
  assert.equal(sound.tracks[1].language,"eng");
});

test("S6.1: preserve a selected AAC track; no automatic switch on single-track recording",()=>{
  for(const single of [false,true]){
    let prepared,calls=0;const a={type:"AUDIO",index:3,extra_info:'{"fourCC":"AACL","channels":"2"}'};
    const api={open(){},close(){},stop(){},play(){},getState(){return "PLAYING";},
      prepareAsync(fn){prepared=fn;},
      getTotalTrackInfo(){return single?[a]:[a,{type:"AUDIO",index:4,extra_info:'{"fourCC":"AC3","channels":"6"}'}];},
      getCurrentStreamInfo(){return single?[]:[a];},
      setSelectTrack(){calls++;}
    };
    let report;const p=createSamsungRecordingPlayer({webapis:{avplay:api}});
    p.start(url,(state,detail)=>{if(state==="audio")report=detail;});
    prepared();assert.equal(calls,0);
    assert.equal(report.status,single?"no_safe_switch":"active_compatible");
  }
});

test("S6.1: unsafe metadata and unsupported interfaces never leak details or break video",()=>{
  let prepared,switches=0;const secret="SECRET-CREDENTIAL-123";
  const tracks=[
    {type:"VIDEO",index:1,extra_info:JSON.stringify({url:"https://private.invalid"})},
    {type:"AUDIO",index:7,extra_info:JSON.stringify({fourCC:secret,language:secret,channels:0,url:"https://private.invalid"})},
    {type:"AUDIO",index:8,extra_info:'{"fourCC":"AACL","channels":"8"}'},
    {type:"AUDIO",index:-1,extra_info:"bad data"}
  ];
  const api={open(){},close(){},stop(){},play(){},getState(){return "PLAYING";},
    prepareAsync(fn){prepared=fn;},getTotalTrackInfo(){return tracks;},
    getCurrentStreamInfo(){return [];},setSelectTrack(){switches++;}};
  const reports=[],p=createSamsungRecordingPlayer({webapis:{avplay:api}});
  p.start(url,(state,detail)=>{if(state==="audio")reports.push(detail);});
  prepared();assert.equal(switches,0);
  assert.equal(reports[0].status,"no_safe_switch");
  assert.equal(reports[0].total,2);
  assert.doesNotMatch(JSON.stringify(reports),/SECRET|private\.invalid|VIDEO/);
  const limited={open(){},stop(){},close(){},play(){},getState(){return "PLAYING";},
    prepareAsync(fn){prepared=fn;},getTotalTrackInfo(){throw Error(secret);}};
  const events=[],q=createSamsungRecordingPlayer({webapis:{avplay:limited}});
  q.start(url,(state,detail)=>events.push({state,detail}));prepared();
  assert.ok(events.some(x=>x.state==="playing"));
  assert.equal(events.find(x=>x.state==="audio").detail.status,"unavailable");
  assert.equal(events.filter(x=>x.state==="error").length,0);
  assert.doesNotMatch(JSON.stringify(events),/SECRET/);
});

test("S6.1: state gate and denied audio selection do not turn video into failure",()=>{
  let ready,prepared;const track=i=>({type:"AUDIO",index:i,extra_info:'{"fourCC":"AACL","channels":"2"}'});
  const api={open(){},close(){},stop(){},play(){},getState(){return "READY";},
    prepareAsync(fn){ready=fn;},getTotalTrackInfo(){throw Error("not playing");}};
  const events=[],p=createSamsungRecordingPlayer({webapis:{avplay:api}});
  p.start(url,(state,detail)=>events.push({state,detail}));ready();
  assert.equal(events.find(x=>x.state==="audio").detail.status,"not_playing");
  const obj={open(){},close(){},stop(){},play(){},getState(){return "PLAYING";},
    prepareAsync(fn){prepared=fn;},getTotalTrackInfo(){return [track(1),track(2)];},
    getCurrentStreamInfo(){return [];},setSelectTrack(){throw Error("authorization secret");}};
  const feedback=[],q=createSamsungRecordingPlayer({webapis:{avplay:obj}});
  q.start(url,(state,detail)=>feedback.push({state,detail}));prepared();
  assert.equal(feedback.find(x=>x.state==="audio").detail.status,"selection_failed");
  assert.ok(feedback.some(x=>x.state==="playing"));
  assert.doesNotMatch(JSON.stringify(feedback),/authorization secret/);
});
