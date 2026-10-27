import test from "node:test";
import assert from "node:assert/strict";
import {createPublicGlobalSearch,publicGlobalSearchError} from "../app/src/api/global-search.js";
const cred={base:"https://example.test/vdr-suite",credentialId:"dev-credential",
  credentialSecret:"secret_1234567890123456789"};
const rid="rec_0123456789abcdef0123456789abcdef";
const recording={kind:"recording",backendId:"default",recordingId:rid,title:"Der Hobbit",
  edited:false};
const event={kind:"epg",backendId:"default",title:"Young Sheldon",
  subtitle:"Hobbit in der Schule",channelId:"S19.2E-1-1019",eventId:"123456",
  startTime:"1793131200",endTime:"1793134800"};
function page(items,offset=0,total=items.length) {
 return {items,page:{offset,limit:30,totalCount:total,hasMore:offset+items.length<total}};
}
function transport() {
 const calls=[];
 function XHR(){this.headers={};calls.push(this);}
 XHR.prototype.open=function(method,url){this.method=method;this.url=url;};
 XHR.prototype.setRequestHeader=function(k,v){this.headers[k]=v;};
 XHR.prototype.send=function(body){this.body=body;};
 XHR.prototype.abort=function(){this.aborted=true;};
 function reply(i,status,value,url) {
  const c=calls[i];c.status=status;c.responseText=JSON.stringify(value);
  c.responseURL=url||c.url;c.onload();
 }
 return {calls,XMLHttpRequest:XHR,reply};
}
test("S6.22 matching Web search terms use distinct backend-scoped public Device GETs",()=>{
 const t=transport(),api=createPublicGlobalSearch(t),results={};
 api.request(cred,"default","Hobbit","recordings",0,x=>results.recordings=x);
 api.request(cred,"default","Hobbit","epg",0,x=>results.epg=x);
 assert.equal(t.calls.length,2);
 assert.equal(t.calls[0].url,cred.base+
  "/api/v1/search/recordings?backendId=default&query=Hobbit&limit=30&offset=0");
 assert.equal(t.calls[1].url,cred.base+
  "/api/v1/search/epg?backendId=default&query=Hobbit&limit=30&offset=0");
 assert.ok(t.calls.every(c=>c.method==="GET" && c.withCredentials===false &&
   c.body===null && /^VDR-Suite-Device /.test(c.headers.Authorization)));
 t.reply(0,200,page([recording]));
 t.reply(1,200,page([event]));
 assert.equal(results.recordings.ok,true);
 assert.equal(results.epg.ok,true);
 assert.equal(results.epg.value.items[0].subtitle,"Hobbit in der Schule");
});
test("S6.22 per-kind pagination 30, independent errors and edit flag",()=>{
 const t=transport(),api=createPublicGlobalSearch(t);
 let result;
 api.request(cred,"default","HOBBIT","recordings",30,x=>result=x);
 t.reply(0,200,page([{...recording,edited:true}],30,31));
 assert.equal(result.ok,true);
 assert.equal(result.value.items[0].edited,true);
 api.request(cred,"default","HOBBIT","epg",0,x=>result=x);
 t.reply(1,403,{code:"forbidden"});
 assert.equal(result.status,403);
 assert.match(publicGlobalSearchError(result,"epg"),/epg.view/);
 assert.match(publicGlobalSearchError({kind:"http",status:403},"recordings"),
  /recordings.view/);
});
test("S6.22 invalid queries, scope and bad response never turn into zero matches",()=>{
 const t=transport(),api=createPublicGlobalSearch(t),invalid=[];
 for(const [scope,term,kind,offset] of [
  ["default","a","epg",0],["../bad","Hobbit","epg",0],
  ["default","Hobbit","unsafe",0],["default","Hobbit","recordings",-1],
  ["default","Hobbit\nxxx","epg",0]
 ])api.request(cred,scope,term,kind,offset,x=>invalid.push(x));
 assert.equal(t.calls.length,0);
 assert.equal(invalid.length,5);
 const cases=[
  page([{...recording,backendId:"other"}]),
  page([{...recording,recordingId:"../../../"}]),
  {...page([recording]),page:{offset:0,limit:30,totalCount:0,hasMore:false}},
  {...page([recording]),page:{offset:0,limit:30,totalCount:1,hasMore:true}},
 ];
 for(let i=0;i<cases.length;i++){
  let result=null;
  api.request(cred,"default","Hobbit","recordings",0,x=>result=x);
  t.reply(i,200,cases[i]);
  assert.equal(result.kind,"response");
 }
 assert.match(publicGlobalSearchError({kind:"http",status:503},"epg"),/nicht als 0 Treffer/);
});
test("S6.22 cancel invalidates both kinds and each new page aborts old same-kind GET",()=>{
 const t=transport(),api=createPublicGlobalSearch(t),out=[];
 api.request(cred,"default","Hobbit","epg",0,x=>out.push(x));
 api.request(cred,"default","Hobbit","recordings",0,x=>out.push(x));
 api.request(cred,"default","Hobbit","epg",30,x=>out.push(x));
 assert.equal(t.calls[0].aborted,true);
 api.cancel();
 assert.equal(t.calls[1].aborted,true);
 assert.equal(t.calls[2].aborted,true);
 for(let i=0;i<3;i++)t.reply(i,200,page([event]));
 assert.equal(out.length,0);
});
