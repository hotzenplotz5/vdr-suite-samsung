import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSuiteBase, classifyDiscoveryError, createDiscoveryClient } from "../app/src/api/public-discovery.js";

class FakeXHR {
  constructor() { FakeXHR.instances.push(this); this.headers={}; }
  open(method,url,async) {this.method=method;this.url=url;this.async=async;}
  setRequestHeader(key,value) {this.headers[key]=value;}
  send() {this.sent=true;}
  abort() {this.aborted=true;}
  respond(status,body,redirect) {
    this.status=status;
    this.responseText=typeof body==="string" ? body : JSON.stringify(body);
    this.responseURL=redirect || this.url;
    this.onload();
  }
}
FakeXHR.instances=[];

const root={apiVersion:"v1",supportedApiMajors:["v1"],compatibilityPolicy:{},authentication:{authenticated:false},links:{capabilities:"/api/v1/capabilities"}};
const caps={apiVersion:"v1",capabilities:[{id:"example"}],compatibility:{},links:{root:"/api/v1"}};

test("S3.1 strictly validates HTTPS server base and reverse proxy prefixes",()=>{
  assert.equal(normalizeSuiteBase(" https://example.test/vdr-suite/ "),"https://example.test/vdr-suite");
  assert.equal(normalizeSuiteBase("https://example.test/"),"https://example.test");
  assert.equal(normalizeSuiteBase("https://[2001:db8::1]:443/vdr"),"https://[2001:db8::1]/vdr");
  for (const input of ["","example.test","http://example.test","https://user:pass@example.test","https://example.test/?x=1","https://example.test/#x","https://example.test/api/v1","https://example.test/a//b","https://example.test/%2fetc","javascript:alert(1)"]) {
    assert.equal(normalizeSuiteBase(input),null,input);
  }
  assert.equal(normalizeSuiteBase("https://example.test/"+ "a".repeat(1100)),null);
});

test("S3.1 calls only the two canonical anonymous discovery routes",()=>{
  FakeXHR.instances.length=0;
  let result=null;
  const client=createDiscoveryClient({XMLHttpRequest:FakeXHR});
  client.probe("https://example.test/proxy",v=>result=v);
  assert.equal(FakeXHR.instances.length,1);
  const a=FakeXHR.instances[0];
  assert.equal(a.method,"GET");
  assert.equal(a.url,"https://example.test/proxy/api/v1");
  assert.equal(a.withCredentials,false);
  assert.equal(a.headers.Accept,"application/json");
  a.respond(200,root);
  assert.equal(FakeXHR.instances.length,2);
  const b=FakeXHR.instances[1];
  assert.equal(b.url,"https://example.test/proxy/api/v1/capabilities");
  b.respond(200,caps);
  assert.deepEqual(result,{ok:true,base:"https://example.test/proxy",capabilityCount:1,authenticated:false});
});

test("S3.1 rejects invalid or incompatible responses without continuing",()=>{
  FakeXHR.instances.length=0;
  let result;
  const client=createDiscoveryClient({XMLHttpRequest:FakeXHR});
  client.probe("http://insecure.test",r=>result=r);
  assert.equal(result.kind,"invalid_origin");
  assert.equal(FakeXHR.instances.length,0);
  client.probe("https://example.test",r=>result=r);
  FakeXHR.instances.at(-1).respond(200,{apiVersion:"v2",supportedApiMajors:["v2"]});
  assert.equal(result.kind,"incompatible");
  assert.equal(FakeXHR.instances.length,1);
  client.probe("https://example.test",r=>result=r);
  FakeXHR.instances.at(-1).respond(200,root);
  FakeXHR.instances.at(-1).respond(200,{apiVersion:"v1",capabilities:"invalid"});
  assert.equal(result.kind,"invalid_contract");
});

test("S3.1 categorizes HTTP, redirect, invalid JSON, network and TLS errors",()=>{
  for (const [type,action,expected] of [
    ["http",x=>x.respond(503,{}),"http"],
    ["redirect",x=>x.respond(200,root,"https://other.test/api/v1"),"redirect"],
    ["invalidJson",x=>x.respond(200,"not-json"),"invalid_json"],
    ["network",x=>x.onerror(),"network"],
    ["timeout",x=>x.ontimeout(),"timeout"]
  ]) {
    FakeXHR.instances.length=0; let result=null;
    createDiscoveryClient({XMLHttpRequest:FakeXHR}).probe("https://example.test",r=>result=r);
    action(FakeXHR.instances[0]);
    assert.equal(result.kind,expected,type);
  }
  assert.match(classifyDiscoveryError("network"),/TLS/);
  assert.match(classifyDiscoveryError("http",403),/403/);
});

test("S3.1 fails closed without TV network API and supports cancellation",()=>{
  let result;
  createDiscoveryClient({}).probe("https://example.test",r=>result=r);
  assert.equal(result.kind,"unsupported");
  FakeXHR.instances.length=0;
  const client=createDiscoveryClient({XMLHttpRequest:FakeXHR});
  result=null;
  client.probe("https://example.test",r=>result=r);
  const x=FakeXHR.instances[0];
  client.cancel();
  assert.equal(x.aborted,true);
  x.respond(200,root);
  assert.equal(result,null);
});
