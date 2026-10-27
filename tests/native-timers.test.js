import test from "node:test";
import assert from "node:assert/strict";
import {createNativeTimerCatalog,nativeTimerCatalogError} from "../app/src/api/native-timers.js";
const credential={base:"https://example.test/vdr-suite",credentialId:"device-credential",
  credentialSecret:"secret_1234567890123456789"};
const backend="default";
function mock() {
 const calls=[];
 function XHR(){this.headers={};calls.push(this);}
 XHR.prototype.open=function(method,url){this.method=method;this.url=url;};
 XHR.prototype.setRequestHeader=function(name,value){this.headers[name]=value;};
 XHR.prototype.send=function(body){this.body=body;};
 XHR.prototype.abort=function(){this.aborted=true;};
 function reply(i,status,body,redirect) {
   const xhr=calls[i];xhr.responseURL=redirect||xhr.url;xhr.status=status;
   xhr.responseText=JSON.stringify(body);xhr.onload();
 }
 return {calls,reply,XMLHttpRequest:XHR};
}
const item={timerId:"42",channelId:"S19.2E-1-100",channelName:"Das Erste",
  title:"Nachrichten",day:"20261017",weekdays:"-------",startTime:"2000",
  endTime:"2015",enabled:true,recording:false,pending:false};
function page(offset=0,items=[item],more=false) {
 return {backendId:backend,items,page:{limit:30,offset,
   hasMore:more,nextOffset:more?offset+items.length:null},meta:{partial:false}};
}
test("S6.19 exact Public-v1 native-timers read uses Device and backend scope",()=>{
 const t=mock(),api=createNativeTimerCatalog(t);let response;
 api.list(credential,backend,0,x=>response=x);
 assert.equal(t.calls.length,1);
 assert.equal(t.calls[0].method,"GET");
 assert.equal(t.calls[0].url,
   credential.base+"/api/v1/native-timers?backendId=default&offset=0&limit=30");
 assert.equal(t.calls[0].headers.Accept,"application/json");
 assert.match(t.calls[0].headers.Authorization,/^VDR-Suite-Device /);
 assert.equal(t.calls[0].withCredentials,false);
 assert.equal(t.calls[0].body,null,"never sends a Timer mutation body");
 t.reply(0,200,page());
 assert.equal(response.ok,true);
 assert.deepEqual(response.value.items[0],item);
});
test("S6.19 reject stale, malformed or foreign Timer pages",()=>{
 const t=mock(),api=createNativeTimerCatalog(t),results=[];
 for(const payload of [
  {...page(),backendId:"foreign"},
  {...page(),page:{...page().page,nextOffset:1,hasMore:false}},
  {...page(),items:[{...item,enabled:"yes"}]},
  {...page(),meta:{partial:true}},
  {...page(30),items:[item]},
 ]) {
  const index=t.calls.length;
  api.list(credential,backend,0,x=>results.push(x));
  t.reply(index,200,payload);
 }
 assert.deepEqual(results.map(x=>x.kind),Array(5).fill("bad_response"));
 assert.match(nativeTimerCatalogError({kind:"http",status:403}),/timers\.view/);
 assert.match(nativeTimerCatalogError({kind:"http",status:503}),/nicht als leere Timerliste/);
});
test("S6.19 forbid invalid target, abort abandoned timer reads and don't retry",()=>{
 const t=mock(),api=createNativeTimerCatalog(t),results=[];
 api.list(credential,"../../admin",0,x=>results.push(x));
 api.list(credential,backend,-1,x=>results.push(x));
 assert.equal(t.calls.length,0);
 assert.deepEqual(results.map(x=>x.kind),["invalid_request","invalid_request"]);
 api.list(credential,backend,0,x=>results.push(x));
 api.cancel();assert.equal(t.calls[0].aborted,true);
 t.reply(0,200,page());
 assert.equal(results.length,2,"stale results ignored");
 api.list(credential,backend,30,x=>results.push(x));
 t.reply(1,403,{error:{code:"forbidden"}});
 assert.equal(results[2].status,403);
 assert.equal(t.calls.length,2);
});
test("S6.19 preserve real native timer page boundaries, no assignment fallback",()=>{
 const t=mock(),api=createNativeTimerCatalog(t);let response;
 api.list(credential,backend,0,x=>response=x);
 t.reply(0,200,page(0,[item],true));
 assert.equal(response.ok,true);
 assert.equal(response.value.page.nextOffset,1);
 api.list(credential,backend,1,x=>response=x);
 t.reply(1,200,page(1,[{...item,timerId:"43"}]));
 assert.equal(response.ok,true);
 assert.equal(t.calls.length,2);
 assert.ok(t.calls.every(x=>!x.url.includes("timer-assignments")));
});
