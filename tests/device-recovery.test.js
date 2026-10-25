import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {restoreVerifiedSessionCredential} from "../app/src/platform/device-recovery.js";
import {devicePairingStatus} from "../app/src/views/device-auth-status.js";

const credential={
  actorId:"actor_existing",deviceId:"dev_existing",credentialId:"cred_existing",
  credentialSecret:"a-test-fixture-not-a-real-secret",
  base:"https://example.invalid/vdr-suite"
};
const proof={base:credential.base,credentialId:credential.credentialId};
const empty={ok:true,credential:null};

test("S3.2 explicit recovery rechecks server authorization, re-stores exactly one existing credential",()=>{
  const operations=[];let got;
  restoreVerifiedSessionCredential(empty,credential,proof,
    (value,done)=>{operations.push("GET device verify");assert.equal(value,credential);done({ok:true});},
    (value,done)=>{operations.push("KeyManager store/readback");assert.equal(value,credential);
      done({ok:true,credential:value});},
    value=>got=value);
  assert.deepEqual(operations,["GET device verify","KeyManager store/readback"]);
  assert.equal(got.ok,true);
  assert.equal(got.credential.deviceId,"dev_existing");
});

test("S3.2 no recovery from a new process, changed identity or unknown KeyManager state",()=>{
  for(const [saved,cached,last] of [
    [empty,null,null],[empty,credential,null],[empty,null,proof],
    [empty,{...credential,credentialId:"wrong"},proof],
    [empty,{...credential,base:"https://wrong.invalid"},proof],
    [{ok:false,kind:"storage"},credential,proof],
    [{ok:true,credential},credential,proof]]) {
    let called=0,result;
    restoreVerifiedSessionCredential(saved,cached,last,()=>called++,
      ()=>called++,v=>result=v);
    assert.equal(called,0);
    assert.equal(result.kind,"not_eligible");
  }
});

test("S3.2 revoked credential, network failure and KeyManager writes fail closed",()=>{
  for(const error of [{kind:"http",status:401},{kind:"timeout"},{kind:"network"}]){
    let result,writes=0;
    restoreVerifiedSessionCredential(empty,credential,proof,
      (_,done)=>done({ok:false,...error}),
      ()=>{writes++;},r=>result=r);
    assert.equal(result.kind,"verification");
    assert.equal(result.verification.kind,error.kind);
    assert.equal(writes,0);
  }
  let failed;
  restoreVerifiedSessionCredential(empty,credential,proof,
    (_,done)=>done({ok:true}),
    (_,done)=>done({ok:false,kind:"storage"}),
    r=>failed=r);
  assert.equal(failed.kind,"storage");
  restoreVerifiedSessionCredential(empty,credential,proof,
    (_,done)=>done({ok:true}),
    (_,done)=>done({ok:true,credential:{...credential,credentialSecret:"wrong"}}),
    r=>failed=r);
  assert.equal(failed.kind,"storage");
});

test("S3.2 existing UI pairing status remains conflict rather than falsely missing",()=>{
  const old=devicePairingStatus(empty,proof,null);
  assert.equal(old.state,"conflict");
  assert.match(old.text,/war in dieser Sitzung erfolgreich/);
  assert.equal(devicePairingStatus(empty,null,null).state,"missing");
});

test("S3.2 Verify action alone can recover; Pair Start blocks duplicate server device",()=>{
  const code=readFileSync(new URL("../app/src/main.js",import.meta.url),"utf8");
  assert.match(code,/function pairVerify\(\)[\s\S]+?restoreVerifiedSessionCredential\(saved,pairedCredential,lastVerifiedDevice,/);
  assert.match(code,/function pairStart\(\)[\s\S]+?Keine neue Kopplung gestartet/);
  assert.match(code,/Keine neue Kopplung, kein neues Server-Gerät/);
  assert.match(code,/requestedBase !== pairedCredential\.base/);
  assert.match(code,/Adresse prüfen;[\\s\\S]*keine lokale Wiederherstellung/);
  const helper=readFileSync(new URL("../app/src/platform/device-recovery.js",import.meta.url),"utf8");
  assert.doesNotMatch(helper,/localStorage|fetch\(|POST|issue\(|create\(|removeData|console\.log/);
});
