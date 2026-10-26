import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRecordingPlaybackClient} from "../app/src/api/recording-playback.js";
import {createSamsungRecordingPlayer} from "../app/src/platform/recording-player.js";

const id="ms_0123456789abcdef0123456789abcdef";
const rec="rec_0123456789abcdef0123456789abcdef";
const bearer="vdr_suite_media=mg_0123456789abcdef0123456789abcdef.AbCdEfGhIjKlMnOp";
const device={base:"https://example.invalid/vdr-suite",credentialId:"device1",
  credentialSecret:"abcdefghijklmnopqrstuvwxyz123"};
function scenario(native,cookie=bearer) {
 const calls=[];
 function XHR(){this.headers={};calls.push(this);}
 XHR.prototype.open=function(method,url){this.method=method;this.url=url;};
 XHR.prototype.setRequestHeader=function(k,v){this.headers[k]=v;};
 XHR.prototype.send=function(body){this.body=JSON.parse(body);};
 XHR.prototype.abort=function(){};
 const client=createRecordingPlaybackClient({XMLHttpRequest:XHR});let result;
 client.begin(device,"default",rec,{protocols:["hls"],containers:["mpeg-ts"]},
   v=>result=v,native);
 const xhr=calls[0];
 xhr.responseURL=xhr.url;xhr.status=201;
 xhr.responseText=JSON.stringify({mediaSession:{id,backendId:"default",recordingId:rec,
   mediaPath:"/vdr-suite/api/v1/media/sessions/"+id+"/hls/master.m3u8"},
   nativeMediaAccess:{transport:"http-cookie",cookie}});
 xhr.onload();
 if (calls.length===2) {
   const stopped=calls[1];
   assert.match(stopped.url,/\/recording-playback-sessions\/ms_[0-9a-f]{32}\/stop$/);
   assert.equal(stopped.body.operation,"stop");
   stopped.responseURL=stopped.url;stopped.status=200;
   stopped.responseText=JSON.stringify({state:"stopped"});stopped.onload();
 }
 return {xhr,result};
}
test("S5.4 universal Device media transport requires explicit native opt-in",()=>{
 const v=scenario(true);
 assert.equal(v.xhr.body.nativeMediaAccess,true);
 assert.equal(v.result.ok,true);
 assert.equal(v.result.nativeCookie,bearer);
 assert.equal(v.result.mediaUrl.indexOf(bearer),-1);
 const web=scenario(false);
 assert.equal(web.xhr.body.nativeMediaAccess,false);
 assert.equal(web.result.nativeCookie,null);
});
test("S5.4 cannot pass unsafe or missing native bearer to the TV player",()=>{
 for(const cookie of ["x=secret","vdr_suite_media=unsafe;X=x",
   "vdr_suite_media=mg_0123456789abcdef0123456789abcdef.z\nHost:evil",
   "vdr_suite_media=mg_0123456789abcdef0123456789abcdef.z"]) {
   const {result}=scenario(true,cookie);
   assert.equal(result.kind,"response");
 }
});
test("S5.4 AVPlay sets COOKIE in IDLE after open, before prepare, and never logs secret",()=>{
 const calls=[],api={
  open(){calls.push("open");},
  setStreamingProperty(k,v){calls.push("cookie");assert.equal(k,"COOKIE");assert.equal(v,bearer);},
  setDisplayRect(){calls.push("rect");},setListener(){},
  prepareAsync(){calls.push("prepare");},play(){},stop(){},close(){}
 };
 const player=createSamsungRecordingPlayer({webapis:{avplay:api}});
 assert.equal(player.start("https://example.invalid/stream.ts",()=>{},bearer),true);
 assert.ok(calls.indexOf("open")<calls.indexOf("cookie"));
 assert.ok(calls.indexOf("cookie")<calls.indexOf("prepare"));
 assert.doesNotMatch(JSON.stringify(calls),/mg_012345/);
});
test("S5.4 missing native cookie API fails closed before preparation",()=>{
 let prepared=0;const api={open(){},prepareAsync(){prepared++;},
   play(){},stop(){},close(){}};
 const errors=[],player=createSamsungRecordingPlayer({webapis:{avplay:api}});
 assert.equal(player.start("https://example.invalid/video.mp4",(state)=>errors.push(state),bearer),false);
 assert.ok(errors.includes("error"));assert.equal(prepared,0);
});
test("S5.4 AVPlay mode opts in, HTML5 browser path uses existing HttpOnly cookie",()=>{
 const main=readFileSync(new URL("../app/src/main.js",import.meta.url),"utf8");
 assert.match(main,/\},mode === "avplay"\);/);
 assert.match(main,/mode === "avplay" \? result\.nativeCookie : null/);
 assert.match(main,/Nativer Medienzugang fehlt/);
 const api=readFileSync(new URL("../app/src/api/recording-playback.js",import.meta.url),"utf8");
 assert.doesNotMatch(api,/localStorage\.setItem|console\.log|X-Plex-Token/);
});
