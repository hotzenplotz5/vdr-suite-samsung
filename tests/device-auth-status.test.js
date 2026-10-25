import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {devicePairingStatus} from "../app/src/views/device-auth-status.js";

const credential={
  deviceId:"dev_public_123",credentialId:"cred_private_opaque",
  credentialSecret:"never-display-this-secret",base:"https://example.invalid/vdr-suite"
};
const verified={credentialId:credential.credentialId,base:credential.base};

test("S7.3: a successful authenticated recording/live request must appear as connected",()=>{
  const status=devicePairingStatus({ok:true,credential},verified,null);
  assert.equal(status.state,"authenticated");
  assert.match(status.text,/Gerät authentifiziert/);
  assert.match(status.text,/dev_public_123/);
  assert.doesNotMatch(status.text,/never-display-this-secret|cred_private_opaque/);
});

test("S7.3: local KeyManager data is not falsely claimed to be server authenticated",()=>{
  const status=devicePairingStatus({ok:true,credential},null,null);
  assert.equal(status.state,"local");
  assert.match(status.text,/noch nicht geprüft/);
  assert.doesNotMatch(status.text,/kein.*gekoppelt/i);
});

test("S7.3: a lost or temporarily unavailable KeyManager does not silently re-pair",()=>{
  assert.equal(devicePairingStatus({ok:false,kind:"storage"},verified,null).state,"unknown");
  const conflict=devicePairingStatus({ok:true,credential:null},verified,null);
  assert.equal(conflict.state,"conflict");
  assert.match(conflict.text,/war in dieser Sitzung erfolgreich/);
  const missing=devicePairingStatus({ok:true,credential:null},null,null);
  assert.equal(missing.state,"missing");
  for(const outcome of [conflict,missing]) assert.match(outcome.text,/Nicht.*koppeln/i);
});

test("S7.3: rejected credential and changed identity cannot reuse prior auth",()=>{
  const rejected=devicePairingStatus({ok:true,credential},verified,credential.credentialId);
  assert.equal(rejected.state,"rejected");
  assert.match(rejected.text,/HTTP 401/);
  const switched=devicePairingStatus({ok:true,credential:{...credential,credentialId:"other"}},verified,null);
  assert.equal(switched.state,"local");
  const otherServer=devicePairingStatus({ok:true,credential:{...credential,base:"https://other.invalid"}},verified,null);
  assert.equal(otherServer.state,"local");
});

test("S7.3: settings are refreshed and both content flows propagate their verified credentials",()=>{
  const main=readFileSync(new URL("../app/src/main.js",import.meta.url),"utf8");
  assert.match(main,/function storedStatus\(\)/);
  assert.match(main,/devicePairingStatus\(saved,lastVerifiedDevice,rejectedCredentialId\)/);
  assert.match(main,/markDeviceAuthenticated\(liveCredential\)/);
  assert.match(main,/markDeviceAuthenticated\(recordingCredential\)/);
  assert.match(main,/markDeviceAuthenticated\(checkingCredential\)/);
  assert.match(main,/rowMemory\.settings\[1\] = "detail-settings-home";\s+storedStatus\(\)/);
  assert.match(main,/lastVerifiedDevice = null;\s+pairedCredential = null/);
});
