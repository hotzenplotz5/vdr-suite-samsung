import test from "node:test";
import assert from "node:assert/strict";
import {createLivePlaybackClient,livePlaybackError} from "../app/src/api/live-playback.js";
import {createHtml5RecordingPlayer} from "../app/src/platform/html5-recording-player.js";

const credential={base:"https://example.test/vdr-suite",credentialId:"dev-credential",
  credentialSecret:"secret_1234567890123456789"};
const sessionId="ms_0123456789abcdef0123456789abcdef";
const channelId="S19.2E-1-1019-10301";
const capabilities={protocols:["progressive"],containers:["fmp4","mp4"],
  videoCodecs:["h264"],audioCodecs:["aac"],supportsByteRanges:true,
  maxVideoWidth:1920,maxVideoHeight:1080,maxAudioChannels:2};
function transport() {
  const calls=[];
  function XHR(){this.headers={};calls.push(this);}
  XHR.prototype.open=function(method,url){this.method=method;this.url=url;};
  XHR.prototype.setRequestHeader=function(k,v){this.headers[k]=v;};
  XHR.prototype.send=function(v){this.body=v;};
  XHR.prototype.abort=function(){this.aborted=true;};
  function reply(i,status,value,override) {
    const x=calls[i];x.status=status;x.responseURL=override||x.url;
    x.responseText=value===null ? "" : JSON.stringify(value);x.onload();
  }
  return {calls,reply,XMLHttpRequest:XHR};
}
function liveResponse(mediaPath="/vdr-suite/api/v1/media/sessions/"+sessionId+"/live/stream.mp4",
  profile="live-progressive-fmp4"){
  return {mediaSession:{id:sessionId,resourceKind:"live-channel",state:"ready",
    backendId:"home",channelId,presentationProfileId:profile,mediaPath}};
}
test("S6.18 explicit Live-v1 CREATE sends verified Device and typed progressive capabilities",()=>{
  const t=transport(),api=createLivePlaybackClient(t);let result;
  api.begin(credential,"home",channelId,capabilities,v=>result=v);
  assert.equal(t.calls.length,1);
  assert.equal(t.calls[0].method,"POST");
  assert.equal(t.calls[0].url,credential.base+"/api/v1/live-playback-sessions");
  assert.equal(t.calls[0].withCredentials,true);
  assert.match(t.calls[0].headers.Authorization,/^VDR-Suite-Device /);
  const body=JSON.parse(t.calls[0].body);
  assert.deepEqual(body,{resourceKind:"live-channel",backendId:"home",channelId,
    capabilities});
  assert.equal(Object.hasOwn(body,"replacesSessionId"),false);
  assert.equal(Object.hasOwn(body,"nativeMediaAccess"),false,
    "Live-v1 does not advertise a native AVPlay cookie");
  t.reply(0,201,liveResponse());
  assert.equal(result.ok,true);
  assert.equal(result.mediaUrl,"https://example.test"+liveResponse().mediaSession.mediaPath);
  assert.equal(result.profile,"live-progressive-fmp4");
  api.stop(credential,"home",result.sessionId,()=>{});
  assert.equal(t.calls[1].method,"POST");
  assert.match(t.calls[1].url,/\/live-playback-sessions\/ms_[a-f0-9]{32}\/stop$/);
  assert.deepEqual(JSON.parse(t.calls[1].body),{operation:"stop",
    resourceKind:"live-channel",backendId:"home",sessionId});
});
test("S6.18 reject unauthorized or malformed live target without network mutations",()=>{
  const t=transport(),api=createLivePlaybackClient(t),results=[];
  api.begin(credential,"home","/etc/shadow",capabilities,x=>results.push(x));
  api.begin(credential,"home",channelId,{protocols:["hls"]},x=>results.push(x));
  api.begin({...credential,base:"http://wrong.test/vdr-suite"},
    "home",channelId,capabilities,x=>results.push(x));
  assert.equal(t.calls.length,0);
  assert.deepEqual(results.map(x=>x.kind),["bad_request","bad_request","unavailable"]);
});
test("S6.18 refuse forged origin, wrong profile or session identity and STOP an own created lease",()=>{
  const t=transport(),api=createLivePlaybackClient(t);
  const problems=[];
  api.begin(credential,"home",channelId,capabilities,v=>problems.push(v));
  t.reply(0,201,liveResponse("https://hostile.test/live.mp4"));
  assert.equal(t.calls.length,2,"malformed own session is STOPped");
  t.reply(1,200,{mediaSession:{id:sessionId,state:"ended"}});
  assert.equal(problems[0].kind,"response");
  api.begin(credential,"home",channelId,capabilities,v=>problems.push(v));
  t.reply(2,201,liveResponse(undefined,"hls-ts"));
  assert.equal(t.calls.length,4);
  t.reply(3,200,{});
  assert.equal(problems[1].kind,"response");
  api.begin(credential,"home",channelId,capabilities,v=>problems.push(v));
  t.reply(4,201,{mediaSession:{...liveResponse().mediaSession,channelId:"other"}});
  assert.equal(t.calls.length,5,"foreign channel never accepted");
  assert.equal(problems[2].kind,"response");
  assert.match(livePlaybackError({kind:"http",status:403}),/media.live.play/);
});
test("S6.18 Live HTML5 accepts only scoped live/stream.mp4, not recording or outside URL",()=>{
  const video={paused:true,src:"",play(){this.paused=false;return Promise.resolve();},
    pause(){this.paused=true;},load(){},removeAttribute(){}};
  const player=createHtml5RecordingPlayer(video,
    {setTimeout(){return 1;},clearTimeout(){}},"live-channel");
  assert.equal(player.available(),true);
  const states=[];
  assert.equal(player.start("https://example.test/vdr-suite/api/v1/media/sessions/"+
    sessionId+"/live/stream.mp4",s=>states.push(s)),true);
  assert.ok(states.includes("preparing"));
  player.stop();
  assert.equal(player.start("https://example.test/vdr-suite/api/v1/media/sessions/"+
    sessionId+"/recording/stream.mp4",s=>states.push(s)),false);
  assert.equal(player.start("https://example.test/api/media/sessions/"+
    sessionId+"/live/stream.mp4",s=>states.push(s)),false);
});
