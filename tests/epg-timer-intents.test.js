import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createEpgTimerIntents} from "../app/src/api/epg-timer-intents.js";

const cred={base:"https://example.test/vdr-suite",credentialId:"dev-1",
  credentialSecret:"0123456789abcdef0123456789abcdef"};
function harness(){
  const calls=[];
  class XHR {
    constructor(){this.headers={};}
    open(method,url){this.method=method;this.url=url;this.responseURL=url;}
    setRequestHeader(k,v){this.headers[k]=v;}
    send(body){this.body=body;calls.push(this);}
    getResponseHeader(name){return name==="ETag"?this.etag:null;}
    abort(){this.aborted=true;}
    reply(status,data,etag){
      this.status=status;this.responseText=JSON.stringify(data);
      this.etag=etag;if(this.onload)this.onload();
    }
  }
  const environment={XMLHttpRequest:XHR,crypto:{
    getRandomValues(bytes){bytes.fill(7);return bytes;}
  }};
  return {calls,client:createEpgTimerIntents(environment)};
}
function event(){
  const start=Math.floor(Date.now()/1000)+3600;
  return {backendId:"home",channelId:"S19.2E-1-100",eventId:"123",
    title:"Zukünftige Sendung",startTime:String(start),endTime:String(start+1200)};
}
test("S8.2 fresh EPG selection reads scoped event + strong ETag before any POST",()=>{
  const h=harness();let result;
  h.client.freshEvent(cred,"home","S19.2E-1-100","123",r=>{result=r;});
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].method,"GET");
  assert.match(h.calls[0].url,/\/api\/v1\/epg\/event\?backendId=home&channelId=S19\.2E-1-100&eventId=123$/);
  assert.match(h.calls[0].headers.Authorization,/^VDR-Suite-Device /);
  h.calls[0].reply(200,event(),'"opaque-fresh-epg"');
  assert.equal(result.ok,true);
  assert.equal(result.etag,'"opaque-fresh-epg"');
  assert.equal(h.calls.filter(c=>c.method==="POST").length,0);
});
test("S8.2 explicitly submitted EPG TimerIntent carries exact ETag and one idempotency key",()=>{
  const h=harness();let result;
  h.client.create(cred,"home","S19.2E-1-100","123",'"opaque-fresh-epg"',
    r=>{result=r;});
  assert.equal(h.calls.length,1);
  const post=h.calls[0];
  assert.equal(post.method,"POST");
  assert.match(post.url,/\/api\/v1\/epg\/timer-intents$/);
  assert.deepEqual(JSON.parse(post.body),{
    backendId:"home",channelId:"S19.2E-1-100",eventId:"123"
  });
  assert.equal(post.headers["If-Match"],'"opaque-fresh-epg"');
  assert.match(post.headers["Idempotency-Key"],/^samsung-epg-[0-9a-f]{32}$/);
  post.reply(202,{operationId:"op_0123456789abcdef",backendId:"home",state:"queued"});
  assert.equal(result.ok,true);
  assert.equal(result.value.state,"queued");
  assert.equal(h.calls.length,1,"no automatic retry or Operation polling");
  let second;
  h.client.create(cred,"home","S19.2E-1-100","123",'"opaque-fresh-epg"',
    r=>{second=r;});
  assert.equal(second.kind,"already");
  assert.equal(h.calls.length,1,"one CREATE per event and app runtime");
});
test("S8.2 Operation read requires manual trigger; outcome_unknown remains unresolved",()=>{
  const h=harness();let value;
  h.client.operation(cred,"op_0123456789abcdef",r=>{value=r;});
  assert.equal(h.calls.length,1);
  assert.match(h.calls[0].url,/\/api\/v1\/operations\/op_0123456789abcdef$/);
  h.calls[0].reply(200,{operationId:"op_0123456789abcdef",state:"outcome_unknown",backendId:"home"});
  assert.equal(value.value.state,"outcome_unknown");
  assert.equal(h.calls.length,1);
});
test("S8.2 missing strong ETag, expired EPG and 403 fail without any mutation",()=>{
  const h=harness();let result;
  h.client.freshEvent(cred,"home","S19.2E-1-100","123",r=>{result=r;});
  h.calls[0].reply(200,event(),null);
  assert.equal(result.kind,"stale");
  h.client.create(cred,"home","S19.2E-1-100","123","weak-etag",
    r=>{result=r;});
  assert.equal(result.kind,"request");
  assert.equal(h.calls.length,1);
  h.client.freshEvent(cred,"home","S19.2E-1-100","123",r=>{result=r;});
  h.calls[1].reply(403,{code:"forbidden"});
  assert.equal(result.status,403);
  assert.equal(h.calls.length,2);
});
test("S8.2 Live and Search expose distinct focusable confirmation and status controls",()=>{
  const html=readFileSync("app/index.html","utf8");
  const main=readFileSync("app/src/main.js","utf8");
  for(const id of ["live-epg-record","live-epg-operation",
      "search-epg-record","search-epg-operation"]){
    assert.match(html,new RegExp('data-focus-id="'+id+'"'));
    assert.match(main,new RegExp('"'+id+'"'));
  }
  assert.match(main,/epgTimerClient\.freshEvent\(/);
  assert.match(main,/epgTimerClient\.create\(/);
  assert.match(main,/epgTimerClient\.operation\(/);
});
