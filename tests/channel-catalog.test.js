import test from "node:test";
import assert from "node:assert/strict";
import { createChannelCatalog, channelCatalogError } from "../app/src/api/channel-catalog.js";

const credential = {
  base:"https://example.invalid/vdr-suite", actorId:"actor-one", deviceId:"device-one",
  credentialId:"cred-one", credentialSecret:"a_very_long_test_secret_123"
};
function transport() {
  const calls=[];
  function XHR() { this.headers={}; calls.push(this); }
  XHR.prototype.open=function(method,url) { this.method=method;this.url=url; };
  XHR.prototype.setRequestHeader=function(key,val) { this.headers[key]=val; };
  XHR.prototype.send=function(body) { this.body=body; };
  XHR.prototype.abort=function() { this.aborted=true; };
  function reply(index,status,data) {
    const req=calls[index];
    req.status=status;req.responseURL=req.url;
    req.responseText=JSON.stringify(data);
    req.onload();
  }
  return {calls,reply,env:{XMLHttpRequest:XHR}};
}
function envelope(items,nextCursor=null,partial=false,sources=[]) {
  return {items,page:{limit:20,nextCursor,hasMore:!!nextCursor},
    meta:{partial,sources},links:{self:"/api/v1/channels",next:null}};
}
const channel={backendId:"home",channelId:"S19.2E-1-1019-10301",
  channelNumber:7,name:"Das Erste",provider:"ARD",groupName:"TV",
  radio:false,encrypted:false,enabled:true};

test("S3.3 backend discovery uses device header and bounded public v1, never POST",()=>{
  const h=transport();let result;
  createChannelCatalog(h.env).listBackends(credential,r=>result=r);
  const req=h.calls[0];
  assert.equal(req.method,"GET");
  assert.equal(req.url,credential.base+"/api/v1/backends?limit=30&sort=backendId&order=asc");
  assert.equal(req.headers.Authorization,"VDR-Suite-Device cred-one.a_very_long_test_secret_123");
  assert.equal(req.headers["Cache-Control"],"no-store");
  assert.equal(req.withCredentials,false);
  assert.equal(req.body,null);
  h.reply(0,200,envelope([{backendId:"home",name:"Living room",enabled:true,online:true}]));
  assert.equal(result.ok,true);
  assert.equal(result.value.items[0].backendId,"home");
});

test("S3.3 channel pages use explicit backend, opaque cursor and limit=20",()=>{
  const h=transport(),c=createChannelCatalog(h.env);let result;
  c.listChannels(credential,"home",null,r=>result=r);
  assert.equal(h.calls[0].url,credential.base+
    "/api/v1/channels?backendId=home&limit=20&sort=backendId,channelNumber,channelId&order=asc");
  h.reply(0,200,envelope([channel],"ch2_next"));
  assert.equal(result.ok,true);
  assert.equal(result.value.page.nextCursor,"ch2_next");
  c.listChannels(credential,"home","ch2_next",r=>result=r);
  assert.match(h.calls[1].url,/cursor=ch1_next$/);
  h.reply(1,200,envelope([]));
  assert.equal(result.ok,true);
  assert.equal(result.value.page.hasMore,false);
});

test("S3.3 no request for invalid backend, insecure server, malformed channel or scope",()=>{
  const h=transport(),client=createChannelCatalog(h.env);let result;
  client.listChannels(credential,"../secret",null,r=>result=r);
  assert.equal(result.kind,"bad_request");
  client.listBackends({...credential,base:"http://insecure.invalid"},r=>result=r);
  assert.equal(result.kind,"invalid_credential");
  assert.equal(h.calls.length,0);
  client.listChannels(credential,"home",null,r=>result=r);
  h.reply(0,200,envelope([{...channel,backendId:"another"}]));
  assert.equal(result.kind,"bad_response");
  client.listChannels(credential,"home",null,r=>result=r);
  h.reply(1,200,envelope([{...channel,channelNumber:"7"}]));
  assert.equal(result.kind,"bad_response");
});

test("S3.3 denied grant, revoked credential, cursor expiry and network are explicit",()=>{
  const h=transport(),client=createChannelCatalog(h.env);let result;
  client.listChannels(credential,"home",null,r=>result=r);
  h.reply(0,403,{code:"forbidden"});
  assert.match(channelCatalogError(result),/channels.view/);
  client.listChannels(credential,"home",null,r=>result=r);
  h.reply(1,401,{code:"unauthorized"});
  assert.match(channelCatalogError(result),/widerrufen/);
  client.listChannels(credential,"home","ch2_old",r=>result=r);
  h.reply(2,409,{code:"cursor_expired"});
  assert.match(channelCatalogError(result),/neu beginnen/);
  client.listChannels(credential,"home",null,r=>result=r);
  h.calls[3].onerror();
  assert.match(channelCatalogError(result),/Netzwerk\/TLS\/CORS/);
});

test("S3.4 older server rejects new native channel order without silent ID-sort fallback",()=>{
  const h=new Harness(); const client=createChannelCatalog(h.env);
  let result;
  client.listChannels(credential,"home",null,r=>result=r);
  assert.match(h.calls[0].url,/sort=backendId,channelNumber,channelId/);
  h.reply(0,400,{code:"invalid_request"});
  assert.equal(result.ok,false);
  assert.match(channelCatalogError(result),/channels.conf-Sortierung/);
  assert.equal(h.calls.length,1);
});

test("S3.3 cancelled or late responses cannot overwrite a newer request",()=>{
  const h=transport(),client=createChannelCatalog(h.env);let count=0;
  client.listBackends(credential,()=>count++);
  client.listChannels(credential,"home",null,()=>count++);
  assert.equal(h.calls[0].aborted,true);
  h.reply(0,200,envelope([]));
  assert.equal(count,0);
  client.cancel();
  h.reply(1,200,envelope([channel]));
  assert.equal(count,0);
});

test("S3.3 partial channel failures are not silently replaced by fake empty data",()=>{
  const h=transport(),client=createChannelCatalog(h.env);let result;
  client.listChannels(credential,"home",null,r=>result=r);
  h.reply(0,200,envelope([],null,true,[{backendId:"home",state:"unavailable",code:"backend_unavailable"}]));
  assert.equal(result.ok,true);
  assert.equal(result.value.meta.partial,true);
});
