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
  assert.doesNotMatch(describeMediaAccessProbe(result),/Decoderfehler\./);
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
 assert.match(main,/stopRecordingPlayback\("failure"\);\s+recordingStatus\("error","AVPlay-Wiedergabe fehlgeschlagen"/);
});
