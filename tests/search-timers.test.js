import test from "node:test";
import assert from "node:assert/strict";
import {createSearchTimerCatalog,searchTimerCatalogError} from "../app/src/api/search-timers.js";

const credential={base:"https://example.test/vdr-suite",
  credentialId:"dev-credential",
  credentialSecret:"secret_1234567890123456789"};
const id1="st_0123456789abcdef0123456789abcdef";
const id2="st_1123456789abcdef0123456789abcdef";
const rule=(id=id1)=>({searchTimerId:id,backendId:"default",name:"Krimis",
  query:"Tatort",state:"active"});
const page=(items=[rule()],nextCursor=null)=>({
  items,page:{limit:30,nextCursor,hasMore:nextCursor!==null},
  meta:{partial:false},links:{self:"/api/v1/search-timers",next:null}});
function mock() {
 const calls=[];
 function XHR(){this.headers={};calls.push(this);}
 XHR.prototype.open=function(method,url){this.method=method;this.url=url;};
 XHR.prototype.setRequestHeader=function(k,v){this.headers[k]=v;};
 XHR.prototype.send=function(body){this.body=body;};
 XHR.prototype.abort=function(){this.aborted=true;};
 function reply(i,status,payload,redirect) {
  let x=calls[i];x.status=status;x.responseURL=redirect||x.url;
  x.responseText=JSON.stringify(payload);x.onload();
 }
 return {calls,reply,XMLHttpRequest:XHR};
}
test("S6.20 saved SearchTimers read is exact public-v1 Device GET",()=>{
 const x=mock(),api=createSearchTimerCatalog(x);let result;
 api.list(credential,"default",null,v=>result=v);
 assert.equal(x.calls[0].method,"GET");
 assert.equal(x.calls[0].url,
   credential.base+"/api/v1/search-timers?backend=default&limit=30");
 assert.match(x.calls[0].headers.Authorization,/^VDR-Suite-Device /);
 assert.equal(x.calls[0].withCredentials,false);
 assert.equal(x.calls[0].body,null);
 x.reply(0,200,page());
 assert.equal(result.ok,true);
 assert.equal(result.value.items[0].query,"Tatort");
});
test("S6.20 separate saved rule detail GET and EPG preview",()=>{
 const x=mock(),api=createSearchTimerCatalog(x);let response;
 api.detail(credential,"default",id1,v=>response=v);
 assert.equal(x.calls[0].url,
   credential.base+"/api/v1/search-timers/"+id1+"?backend=default");
 x.reply(0,200,{...rule(),meta:{partial:false}});
 assert.equal(response.ok,true);
 api.preview(credential,"default",id1,v=>response=v);
 assert.equal(x.calls[1].url,
   credential.base+"/api/v1/search-timers/"+id1+
     "/preview?backend=default&limit=30");
 x.reply(1,200,{backendId:"default",searchTimerId:id1,totalCount:7,
   items:[{title:"Tatort",subtitle:"Ein Fall",channelId:"ch:1",
     startTime:"1793131200",endTime:"1793134800"}],
   meta:{partial:false,epgInput:"ready"}});
 assert.equal(response.ok,true);
 assert.equal(response.value.totalCount,7);
 assert.ok(x.calls.every(c=>c.method==="GET"));
});
test("S6.20 strict backend, identity and cursor fencing",()=>{
 const x=mock(),api=createSearchTimerCatalog(x),results=[];
 api.list(credential,"../foo",null,v=>results.push(v));
 api.detail(credential,"default","42",v=>results.push(v));
 api.preview(credential,"default","../../x",v=>results.push(v));
 api.list(credential,"default","nope",v=>results.push(v));
 assert.equal(x.calls.length,0);
 assert.deepEqual(results.map(r=>r.kind),Array(4).fill("request"));
 const invalid=[
   page([{...rule(),backendId:"foreign"}]),
   page([{...rule(),searchTimerId:"st_unsafe"}]),
   page([rule(id2),rule(id1)]),
   {...page(),meta:{partial:true}},
   {...page(),page:{limit:30,hasMore:true,nextCursor:null}}
 ];
 for(const candidate of invalid) {
   const index=x.calls.length;
   api.list(credential,"default",null,r=>results.push(r));
   x.reply(index,200,candidate);
 }
 assert.deepEqual(results.slice(4).map(r=>r.kind),Array(5).fill("response"));
});
test("S6.20 stale request cancelled and 403 EPG preview remains failure",()=>{
 const x=mock(),api=createSearchTimerCatalog(x),results=[];
 api.list(credential,"default",null,r=>results.push(r));
 api.cancel();assert.equal(x.calls[0].aborted,true);
 x.reply(0,200,page());
 assert.equal(results.length,0);
 api.preview(credential,"default",id1,r=>results.push(r));
 x.reply(1,403,{code:"forbidden"});
 assert.equal(results[0].status,403);
 assert.match(searchTimerCatalogError(results[0],true),/epg.view/);
 assert.match(searchTimerCatalogError({kind:"http",status:503},false),
   /keine leere Liste/);
});
test("S6.20 preview rejects fake zero, wrong ID and response redirect",()=>{
 const x=mock(),api=createSearchTimerCatalog(x),result=[];
 api.preview(credential,"default",id1,r=>result.push(r));
 x.reply(0,200,{backendId:"default",searchTimerId:id1,totalCount:0,
   items:[{title:"Tatort",subtitle:"",channelId:"ch",
     startTime:"1",endTime:"2"}],meta:{partial:false,epgInput:"ready"}});
 assert.equal(result[0].kind,"response");
 api.detail(credential,"default",id1,r=>result.push(r));
 x.reply(1,200,{...rule(id2),meta:{partial:false}});
 assert.equal(result[1].kind,"response");
 api.list(credential,"default",null,r=>result.push(r));
 x.reply(2,200,page(),"https://other.test/");
 assert.equal(result[2].kind,"response");
});
