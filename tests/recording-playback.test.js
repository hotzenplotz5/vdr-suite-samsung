import test from "node:test";
import assert from "node:assert/strict";
import {createRecordingPlaybackClient, recordingPlaybackError} from "../app/src/api/recording-playback.js";
import {createSamsungRecordingPlayer,conservativeSamsungCapabilities} from "../app/src/platform/recording-player.js";

const cred={base:"https://example.invalid/vdr-suite",
  credentialId:"cred-one",credentialSecret:"abcdef0123456789wxyz"};
const recordingId="rec_0123456789abcdef0123456789abcdef";
const sessionId="ms_0123456789abcdef0123456789abcdef";
function mockHttp() {
  const calls=[];
  function XHR(){this.headers={};calls.push(this);}
  XHR.prototype.open=function(method,url){this.method=method;this.url=url;};
  XHR.prototype.setRequestHeader=function(k,v){this.headers[k]=v;};
  XHR.prototype.send=function(body){this.body=body;};
  XHR.prototype.abort=function(){this.aborted=true;};
  function reply(i,status,body){
    const xhr=calls[i];xhr.status=status; xhr.responseURL=xhr.url;
    xhr.responseText=JSON.stringify(body);xhr.onload();
  }
  return {calls,reply,env:{XMLHttpRequest:XHR}};
}
test("S5.1 owner MediaSession uses explicit protected Device POST; AVPlay receives only a scoped path",()=>{
  const h=mockHttp(),api=createRecordingPlaybackClient(h.env);let response;
  api.begin(cred,"default",recordingId,{
    protocols:["hls"],containers:["mpeg-ts"],
    videoCodecs:["h264"],audioCodecs:["aac"]
  },r=>response=r);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].method,"POST");
  assert.equal(h.calls[0].url,cred.base+"/api/v1/recording-playback-sessions");
  assert.equal(h.calls[0].withCredentials,true);
  assert.match(h.calls[0].headers.Authorization,/^VDR-Suite-Device /);
  assert.equal(JSON.parse(h.calls[0].body).recordingId,recordingId);
  h.reply(0,201,{mediaSession:{id:sessionId,backendId:"default",
    recordingId,mediaPath:"/vdr-suite/api/v1/media/sessions/"+sessionId+"/hls/master.m3u8",
    presentationProfileId:"hls"}});
  assert.equal(response.ok,true);
  assert.equal(response.mediaUrl,"https://example.invalid/vdr-suite/api/v1/media/sessions/"+sessionId+"/hls/master.m3u8");
  api.stop(cred,"default",sessionId,r=>response=r);
  assert.equal(h.calls[1].method,"POST");
  assert.equal(JSON.parse(h.calls[1].body).operation,"stop");
  h.reply(1,200,{state:"stopped"});
  assert.equal(response.ok,true);
});
test("S5.1 playback rejects foreign origins, path traversal, invalid ids and denied grants",()=>{
  const h=mockHttp(),api=createRecordingPlaybackClient(h.env);let response;
  api.begin(cred,"default","/srv/vdr/private",{},r=>response=r);
  assert.equal(response.kind,"bad_request");
  assert.equal(h.calls.length,0);
  api.begin(cred,"default",recordingId,{},r=>response=r);
  h.reply(0,201,{mediaSession:{id:sessionId,backendId:"default",recordingId,
    mediaPath:"https://evil.example/stream.mp4"}});
  assert.equal(response.kind,"response");
  api.begin(cred,"default",recordingId,{},r=>response=r);
  h.reply(1,201,{mediaSession:{id:sessionId,backendId:"default",recordingId,
    mediaPath:"/vdr-suite/api/v1/media/sessions/"+sessionId+"/../stream.mp4"}});
  assert.equal(response.kind,"response");
  api.begin(cred,"default",recordingId,{},r=>response=r);
  h.reply(2,403,{error:{code:"forbidden"}});
  assert.match(recordingPlaybackError(response),/media.recording.play/);
});
test("S5.1 player has one owner and guards delayed async callbacks",()=>{
  const calls=[];let prepared;
  const api={
    open(url){calls.push(["open",url]);},
    setDisplayRect(){calls.push(["rect"]);},
    setListener(listener){this.listener=listener;},
    prepareAsync(onSuccess){prepared=onSuccess;calls.push(["prepare"]);},
    play(){calls.push(["play"]);},stop(){calls.push(["stop"]);},
    close(){calls.push(["close"]);},
    getState(){return "PLAYING";},pause(){calls.push(["pause"]);}
  };
  const states=[],player=createSamsungRecordingPlayer({webapis:{avplay:api}});
  assert.equal(player.available(),true);
  assert.equal(player.start("https://example.invalid/stream.ts",s=>states.push(s)),true);
  assert.match(states.join(","),/preparing/);
  player.stop();
  prepared();
  assert.equal(calls.filter(c=>c[0]==="play").length,0,"late prepare must not play");
  assert.equal(player.start("http://not-secure",s=>states.push(s)),false);
});
test("S5.1 decoder proof only advertises narrow verified browser formats",()=>{
  assert.equal(conservativeSamsungCapabilities({}),null);
  assert.equal(conservativeSamsungCapabilities({document:{
    createElement(){return {canPlayType(){return "";}};}
  }}),null);
  const c=conservativeSamsungCapabilities({document:{
    createElement(){return {canPlayType(){return "maybe";}};}
  }});
  assert.deepEqual(c.videoCodecs,["h264"]);
  assert.deepEqual(c.audioCodecs,["aac"]);
});
