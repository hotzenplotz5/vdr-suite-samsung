import test from "node:test";
import assert from "node:assert/strict";
import { createPairingClient, pairingError, deviceVerificationError } from "../app/src/api/device-pairing.js";
import { createDeviceVault } from "../app/src/platform/device-vault.js";

const base="https://example.invalid/vdr-suite";
function fakeHttp() {
  const calls=[];
  function XHR() {this.headers={};calls.push(this);}
  XHR.prototype.open=function(method,url,async){this.method=method;this.url=url;this.async=async;};
  XHR.prototype.setRequestHeader=function(name,value){this.headers[name]=value;};
  XHR.prototype.send=function(body){this.body=body;};
  XHR.prototype.abort=function(){this.aborted=true;};
  function reply(index,status,body) {
    const x=calls[index];x.status=status;x.responseURL=x.url;
    x.responseText=JSON.stringify(body);x.onload();
  }
  return {calls,environment:{XMLHttpRequest:XHR},reply};
}
function issuedRequest() {
 return {
  pairingRequestId:"dp_test",userCode:"ABCD-1234",pairingToken:"secret-token",
  status:"pending",expiresAt:"2026-10-25T08:00:00Z",pollIntervalSeconds:3
 };
}
test("S3.2 create is anonymous, POST JSON, and never persists pairing token",()=>{
 const h=fakeHttp();const client=createPairingClient(h.environment);let got;
 client.create(base,x=>got=x);
 assert.equal(h.calls[0].method,"POST");
 assert.equal(h.calls[0].url,base+"/api/v1/device-pairings");
 assert.equal(h.calls[0].headers.Authorization,undefined);
 assert.equal(h.calls[0].headers["Content-Type"],"application/json");
 assert.equal(JSON.parse(h.calls[0].body).clientKind,"samsung");
 assert.equal(h.calls[0].withCredentials,false);
 h.reply(0,201,issuedRequest());
 assert.equal(got.pairing.code,"ABCD-1234");
 assert.equal(got.pairing.token,"secret-token");
});
test("S3.2 polling uses token header only, and approval is not a credential",()=>{
 const h=fakeHttp();const client=createPairingClient(h.environment);let got;
 const p={id:"dp_test",token:"secret-token"};
 client.poll(base,p,x=>got=x);
 assert.equal(h.calls[0].method,"GET");
 assert.equal(h.calls[0].headers["X-VDR-Suite-Pairing-Token"],"secret-token");
 assert.equal(h.calls[0].headers.Authorization,undefined);
 assert.equal(h.calls[0].body,null);
 h.reply(0,200,{pairingRequestId:"dp_test",status:"approved"});
 assert.equal(got.status,"approved");
 assert.equal(h.calls.length,1);
});
test("S3.2 one-time credential POST never has a body or idempotency header",()=>{
 const h=fakeHttp();const client=createPairingClient(h.environment);let got;
 client.issue(base,{id:"dp_test",token:"secret-token"},x=>got=x);
 assert.equal(h.calls[0].method,"POST");
 assert.equal(h.calls[0].body,null);
 assert.equal(h.calls[0].headers["Idempotency-Key"],undefined);
 h.reply(0,201,{actorId:"actor_1",deviceId:"device_1",credentialId:"credential_1",credentialSecret:"SECRET_12345678901234567890"});
 assert.equal(got.credential.credentialId,"credential_1");
 assert.equal(got.credential.base,base);
});
test("S3.2 credential verification uses Device authorization, not Bearer",()=>{
 const h=fakeHttp();const client=createPairingClient(h.environment);let got;
 client.verify({base,credentialId:"c1",credentialSecret:"very-secret"},x=>got=x);
 assert.equal(h.calls[0].headers.Authorization,"VDR-Suite-Device c1.very-secret");
 h.reply(0,200,{apiVersion:"v1",authentication:{authenticated:true}});
 assert.equal(got.ok,true);
});
test("S3.2 rejects malformed server results and classifies terminal errors",()=>{
 const h=fakeHttp();const client=createPairingClient(h.environment);let got;
 client.create(base,x=>got=x);h.reply(0,201,{status:"pending"});
 assert.equal(got.kind,"bad_response");
 client.poll(base,{id:"wrong/..",token:"x"},x=>got=x);
 assert.equal(got.kind,"bad_response");
 client.poll(base,{id:"dp_test",token:"x"},x=>got=x);
 h.reply(1,410,{code:"pairing_expired"});
 assert.equal(got.status,410);
 assert.match(pairingError("http",410),/abgelaufen/i);
});
function fakeVault() {
 const data={};
 const mgr={
   getDataAliasList(){return Object.keys(data).map(name=>({name}));},
   getData({name}) {if(!(name in data))throw Object.assign(new Error("missing alias"),{name:"NotFoundError"});return data[name];},
   saveData(name,value,password,ok,fail) {data[name]=value;ok();},
   removeData({name}) {delete data[name];}
 };
 return {data,mgr,vault:createDeviceVault({tizen:{keymanager:mgr}})};
}
test("S3.2 keymanager preflight and exact readback, without localStorage",()=>{
 const v=fakeVault();let pre;v.vault.preflight(x=>pre=x);
 assert.equal(pre.ok,true);
 assert.equal(Object.keys(v.data).length,0);
 const secret={base,actorId:"a",deviceId:"d",credentialId:"c",credentialSecret:"secret"};
 let stored;v.vault.store(secret,x=>stored=x);
 assert.equal(stored.ok,true);
 assert.equal(v.vault.read().credential.credentialSecret,"secret");
 assert.equal(v.vault.read().credential.base,base);
 let again;v.vault.preflight(x=>again=x);
 assert.equal(again.credential.credentialId,"c");
});
test("S3.2 exact KeyManager read survives incomplete enumeration, storage errors cannot erase state",()=>{
 const v=fakeVault();
 const secret={base,actorId:"a",deviceId:"d",credentialId:"c",credentialSecret:"secret"};
 let saved;v.vault.store(secret,x=>saved=x);
 assert.equal(saved.ok,true);
 v.mgr.getDataAliasList=()=>[];
 assert.equal(v.vault.read().credential.credentialId,"c");
 const original=v.mgr.getData;
 v.mgr.getData=()=>{throw Object.assign(new Error("temporarily locked"),{name:"UnknownError"});};
 const unavailable=v.vault.read();
 assert.equal(unavailable.ok,false);
 assert.equal(unavailable.kind,"storage");
 let checked;v.vault.preflight(x=>checked=x);
 assert.equal(checked.ok,false);
 v.mgr.getData=original;
 assert.equal(v.vault.read().credential.credentialId,"c");
 assert.equal(Object.keys(v.data).length,1);
});
test("S3.2 missing/failing keymanager fails closed before credential issuance",()=>{
 const absent=createDeviceVault({});
 assert.equal(absent.read().ok,false);
 let failed;absent.preflight(x=>failed=x);assert.equal(failed.ok,false);
 const v=fakeVault();
 v.mgr.saveData=(name,value,password,ok,fail)=>fail({name:"UnknownError"});
 v.vault.preflight(x=>failed=x);
 assert.equal(failed.ok,false);
});

test("S4.1 revoked Device verification is distinct from pairing-token errors",()=>{
 const h=fakeHttp(); const client=createPairingClient(h.environment); let got;
 client.verify({base,credentialId:"c1",credentialSecret:"secret"},x=>got=x);
 h.reply(0,401,{code:"device_credential_revoked"});
 assert.equal(got.ok,false);
 assert.equal(got.kind,"http");
 assert.equal(got.status,401);
 assert.match(deviceVerificationError(got),/Device-Credential.*widerrufen/i);
 assert.doesNotMatch(deviceVerificationError({kind:"timeout"}),/widerrufen/i);
});
test("S4.1 local removal is scoped to the matching credential and verifies absence",()=>{
 const v=fakeVault(), secret={base,actorId:"a",deviceId:"d",credentialId:"c1",credentialSecret:"secret"};
 v.vault.store(secret,()=>{});
 assert.equal(v.vault.removeLocal("wrong").kind,"mismatch");
 assert.ok(v.vault.read().credential);
 assert.equal(v.vault.removeLocal("c1").ok,true);
 assert.equal(v.vault.read().credential,null);
 assert.deepEqual(Object.keys(v.data),[]);
});
test("S4.1 KeyManager removal errors never masquerade as success",()=>{
 const v=fakeVault(), secret={base,actorId:"a",deviceId:"d",credentialId:"c1",credentialSecret:"secret"};
 v.vault.store(secret,()=>{});
 v.mgr.removeData=()=>{throw Error("storage temporarily locked");};
 assert.equal(v.vault.removeLocal("c1").kind,"storage");
 assert.equal(v.vault.read().credential.credentialId,"c1");
});
