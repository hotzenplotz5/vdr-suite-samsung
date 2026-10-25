import test from "node:test";
import assert from "node:assert/strict";
import {createRecordingCatalog, recordingCatalogError} from "../app/src/api/recording-catalog.js";

const credential = {
  base:"https://example.invalid/vdr-suite", deviceId:"device-a",
  credentialId:"cred-one", credentialSecret:"a_very_long_test_secret_123"
};
const row = {
  backendId:"default", recordingId:"rec_00000000000000000000000000000001",
  title:"Brisant", recordedAt:"2026-10-24T19:00:00Z",
  durationSeconds:3600, durationKnown:true, description:"TV-Aufnahme",
  sizeMb:512, edited:false
};
function envelope(items, nextCursor=null) {
  return {items, page:{limit:100,nextCursor,hasMore:nextCursor!==null},
    meta:{partial:false}, links:{self:"/api/v1/recordings",next:null}};
}
function http() {
  const calls=[];
  function XHR() {this.headers={};calls.push(this);}
  XHR.prototype.open=function(method,url) {this.method=method;this.url=url;};
  XHR.prototype.setRequestHeader=function(key,value) {this.headers[key]=value;};
  XHR.prototype.send=function(value) {this.body=value;};
  XHR.prototype.abort=function() {this.aborted=true;};
  function reply(index,status,data) {
    const request=calls[index];
    request.status=status;
    request.responseURL=request.url;
    request.responseText=JSON.stringify(data);
    request.onload();
  }
  return {calls,reply,env:{XMLHttpRequest:XHR}};
}

test("S4.1 lists real recording metadata with secure Device GET and server limit=100",()=>{
  const h=http(),client=createRecordingCatalog(h.env);
  let result=null;
  client.listRecordings(credential,"default",null,r=>{result=r;});
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].method,"GET");
  assert.equal(h.calls[0].url,credential.base+
    "/api/v1/recordings?backendId=default&limit=100&sort=recordingId&order=asc");
  assert.equal(h.calls[0].headers.Authorization,
    "VDR-Suite-Device cred-one.a_very_long_test_secret_123");
  assert.equal(h.calls[0].headers["Cache-Control"],"no-store");
  assert.equal(h.calls[0].withCredentials,false);
  assert.equal(h.calls[0].body,null);
  h.reply(0,200,envelope([row]));
  assert.equal(result.ok,true);
  assert.equal(result.value.items[0].recordingId,row.recordingId);
  assert.deepEqual(Object.keys(h.calls[0].headers).sort(),
    ["Accept","Authorization","Cache-Control"]);
});

test("S4.1 100-recording page followed by opaque cursor; no total catalog cap",()=>{
  const h=http(),client=createRecordingCatalog(h.env);
  const pages=Array.from({length:100},(_,index)=>({
    ...row, recordingId:"rec_"+String(index+1).padStart(32,"0")
  }));
  let result;
  client.listRecordings(credential,"default",null,r=>{result=r;});
  h.reply(0,200,envelope(pages,"rc1_666f6f"));
  assert.equal(result.ok,true);
  assert.equal(result.value.page.hasMore,true);
  client.listRecordings(credential,"default","rc1_666f6f",r=>{result=r;});
  assert.match(h.calls[1].url,/&cursor=rc1_666f6f$/);
  h.reply(1,200,envelope([{...row,recordingId:"rec_00000000000000000000000000000101"}]));
  assert.equal(result.ok,true);
  assert.equal(result.value.page.hasMore,false);
});

test("S4.1 rejects wrong grants, invalid cursor/recording IDs and untrusted responses",()=>{
  const h=http(),client=createRecordingCatalog(h.env); let result;
  client.listRecordings(credential,"../bad",null,r=>{result=r;});
  assert.equal(result.kind,"bad_request");
  client.listRecordings(credential,"default","",r=>{result=r;});
  assert.equal(result.kind,"bad_request");
  client.listRecordings({...credential,base:"http://not-secure.invalid"},"default",null,r=>{result=r;});
  assert.equal(result.kind,"invalid_credential");
  assert.equal(h.calls.length,0);
  client.listRecordings(credential,"default",null,r=>{result=r;});
  h.reply(0,200,envelope([{...row,recordingId:"/native/private/path"}]));
  assert.equal(result.kind,"bad_response");
  client.listRecordings(credential,"default",null,r=>{result=r;});
  h.reply(1,200,envelope([{...row,backendId:"other"}]));
  assert.equal(result.kind,"bad_response");
  client.listRecordings(credential,"default",null,r=>{result=r;});
  h.reply(2,200,envelope([{...row,description:"okay",durationSeconds:"3600"}]));
  assert.equal(result.kind,"bad_response");
  client.listRecordings(credential,"default",null,r=>{result=r;});
  h.reply(3,200,envelope([row,row]));
  assert.equal(result.kind,"bad_response");
  client.listRecordings(credential,"default",null,r=>{result=r;});
  h.reply(4,200,envelope([row],"rc1_more"));
  assert.equal(result.kind,"bad_response"); // full 100 rows required for hasMore
});

test("S4.1 fail-closed HTTP auth/grants/network and paging expiry",()=>{
  const h=http(),client=createRecordingCatalog(h.env);let result;
  client.listRecordings(credential,"default",null,r=>{result=r;});
  h.reply(0,403,{code:"forbidden"});
  assert.match(recordingCatalogError(result),/recordings.view/);
  client.listRecordings(credential,"default",null,r=>{result=r;});
  h.reply(1,401,{code:"unauthorized"});
  assert.match(recordingCatalogError(result),/Geräteanmeldung/);
  client.listRecordings(credential,"default","rc1_old",r=>{result=r;});
  h.reply(2,409,{code:"cursor_expired"});
  assert.match(recordingCatalogError(result),/neu beginnen/);
  client.listRecordings(credential,"default",null,r=>{result=r;});
  h.calls[3].onerror();
  assert.match(recordingCatalogError(result),/Netzwerk\/TLS\/CORS/);
  client.listRecordings(credential,"default",null,r=>{result=r;});
  h.calls[4].ontimeout();
  assert.match(recordingCatalogError(result),/Zeitüberschreitung/);
  client.listRecordings(credential,"default",null,r=>{result=r;});
  h.calls[5].status=200;
  h.calls[5].responseURL="https://example.invalid/redirect";
  h.calls[5].responseText=JSON.stringify(envelope([row]));
  h.calls[5].onload();
  assert.equal(result.kind,"bad_response");
});

test("S4.1 cancel invalidates old requests; no stale callback after tab switch",()=>{
  const h=http(),client=createRecordingCatalog(h.env);let count=0;
  client.listRecordings(credential,"default",null,()=>count++);
  client.listRecordings(credential,"default","rc1_page",()=>count++);
  assert.equal(h.calls[0].aborted,true);
  h.reply(0,200,envelope([row]));
  assert.equal(count,0);
  client.cancel();
  assert.equal(h.calls[1].aborted,true);
  h.reply(1,200,envelope([row]));
  assert.equal(count,0);
});

test("S4.1 source UI exposes explicit recording action and a bounded focusable list",async()=>{
  const fs=await import("node:fs/promises");
  const main=await fs.readFile(new URL("../app/src/main.js",import.meta.url),"utf8");
  const html=await fs.readFile(new URL("../app/index.html",import.meta.url),"utf8");
  assert.match(main,/function loadRecordings\(action\)/);
  assert.match(main,/recordingCatalog\.listRecordings/);
  assert.match(main,/recordingFocusIds\.forEach/);
  assert.match(main,/recordingCurrentPageItems = rows\.slice\(\)/);
  assert.match(main,/row\.setAttribute\("data-focus-id"/);
  assert.match(main,/row\.className = "recording-row tv-focusable"/);
  assert.match(main,/recordingList\.textContent = ""/);
  assert.match(main,/row\.appendChild\(title\)/);
  assert.doesNotMatch(main,/innerHTML\s*=/);
  assert.match(html,/data-recordings-action="load"/);
  assert.match(html,/data-recordings-action="next"/);
  assert.match(html,/data-recordings-action="previous"/);
  assert.match(html,/recording-list/);
});
