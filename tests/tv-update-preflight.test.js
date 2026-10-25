import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {inspectWgt, verifyUpdate, zipEntries, manifestDetails, crc32, releaseEvidence} from "../scripts/tv-update-preflight.mjs";

const source={};
for(const file of ["config.xml","index.html","styles.css","tv-runtime.js"])
  source[file]=readFileSync(new URL("../app/"+file,import.meta.url),"utf8");

const signing=(seed)=>'<Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Certificate>'+
  Buffer.alloc(128,seed).toString("base64")+'</ds:X509Certificate></Signature>';

function zip(files) {
  let offset=0;
  const local=[],central=[];
  for(const [name,value] of Object.entries(files)) {
    const filename=Buffer.from(name),data=Buffer.from(value),check=crc32(data);
    const a=Buffer.alloc(30),b=Buffer.alloc(46);
    a.writeUInt32LE(0x04034b50,0);
    a.writeUInt16LE(filename.length,26);
    a.writeUInt32LE(check,14);
    a.writeUInt32LE(data.length,18);
    a.writeUInt32LE(data.length,22);
    b.writeUInt32LE(0x02014b50,0);
    b.writeUInt16LE(20,4);
    b.writeUInt16LE(20,6);
    b.writeUInt32LE(check,16);
    b.writeUInt32LE(data.length,20);
    b.writeUInt32LE(data.length,24);
    b.writeUInt16LE(filename.length,28);
    b.writeUInt32LE(offset,42);
    local.push(a,filename,data);
    central.push(b,filename);
    offset+=a.length+filename.length+data.length;
  }
  const directory=Buffer.concat(central), end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);
  end.writeUInt16LE(Object.keys(files).length,8);
  end.writeUInt16LE(Object.keys(files).length,10);
  end.writeUInt32LE(directory.length,12);
  end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}

function fixture({version=null,signer=1,ids=null,missing=null,overrides={}}={}) {
  const original=manifestDetails(source["config.xml"]);
  let xml=source["config.xml"].replace('version="'+original.version+'"',
    'version="'+(version??original.version)+'"');
  if(ids) xml=xml.replace('package="VDRSuiteTV"','package="'+ids+'"');
  const entries={
    "config.xml":xml,
    "index.html":source["index.html"],
    "styles.css":source["styles.css"],
    "tv-runtime.js":source["tv-runtime.js"],
    "author-signature.xml":signing(signer),
    "signature1.xml":"<Signature/>",
    ...overrides
  };
  if(missing) delete entries[missing];
  return zip(entries);
}

test("S7.2 preflight accepts only a newer production WGT with identical author and source",()=>{
  const baseline=fixture({version:"0.0.0"});
  const candidate=fixture();
  assert.deepEqual(verifyUpdate(candidate,baseline,source),[]);
  const inspected=inspectWgt(candidate);
  assert.equal(inspected.identity.id,"VDRSuiteTV.VDRSuite");
  assert.equal(inspected.identity.packageId,"VDRSuiteTV");
  assert.match(inspected.fingerprint,/^[a-f0-9]{64}$/);
});

test("S7.2 blocks DEV or renamed package inside signed WGT",()=>{
  assert.throws(()=>inspectWgt(fixture({ids:"VDRSuitDev"})),/not the original production/);
  assert.match(verifyUpdate(fixture({ids:"OtherAppId"}),fixture({version:"0.0.0"}),source).join(" "),
    /Candidate/);
});

test("S7.2 blocks author change, not just changed package/application IDs",()=>{
  assert.match(verifyUpdate(fixture({signer:2}),fixture({version:"0.0.0",signer:1}),source).join(" "),
    /Author certificate differs/);
});

test("S7.2 rejects a same-version or downgraded reinstall even if author matches",()=>{
  assert.match(verifyUpdate(fixture(),fixture(),source).join(" "),/must be newer/);
  assert.match(verifyUpdate(fixture(),fixture({version:"9.0.0"}),source).join(" "),/must be newer/);
});

test("S7.2 blocks stale or altered built runtime and missing signatures",()=>{
  assert.match(verifyUpdate(fixture({overrides:{"tv-runtime.js":"stale"}}),fixture({version:"0.0.0"}),source).join(" "),
    /tv-runtime.js/);
  assert.throws(()=>inspectWgt(fixture({missing:"author-signature.xml"})),/missing author-signature/);
  assert.throws(()=>inspectWgt(fixture({missing:"signature1.xml"})),/missing signature1/);
});

test("S7.2 blocks unrelated source, untrusted files, unsafe names and corrupted ZIP",()=>{
  assert.match(verifyUpdate(fixture(),fixture({version:"0.0.0"}),{...source,"styles.css":"changed"}).join(" "),/styles.css/);
  assert.throws(()=>inspectWgt(fixture({overrides:{"author.p12":"secret"}})),/Sensitive/);
  assert.throws(()=>zipEntries(zip({"../config.xml":"no"})),/Unsafe/);
  assert.throws(()=>zipEntries(Buffer.from("not a zip")) ,/not a ZIP/);
});

test("S7.2 CLI is offline-only and blocks missing baseline without device operations",()=>{
  const code=readFileSync(new URL("../scripts/tv-update-preflight.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(code,/vd_appinstall|vd_appuninstall|wits --start|sdb install|Run Project/);
  const run=spawnSync(process.execPath,["scripts/tv-update-preflight.mjs","--candidate","candidate.wgt"],{
    cwd:new URL("..",import.meta.url),encoding:"utf8"
  });
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/S7.2 update blocked/);
  assert.match(run.stderr,/--baseline/);
});

test("S7.2 checks WGT ZIP CRC rather than trusting unsigned ZIP metadata",()=>{
  const packaged=fixture();
  const valid=inspectWgt(packaged);
  assert.equal(valid.identity.packageId,"VDRSuiteTV");
  const damaged=Buffer.from(packaged);
  const offset=damaged.indexOf(Buffer.from("<widget"));
  assert.ok(offset>0);
  damaged[offset]^=1;
  assert.throws(()=>inspectWgt(damaged),/CRC mismatch/);
});

test("S7.2 rejects conflicting local ZIP metadata and detects corrupted source bytes",()=>{
  const packaged=fixture();
  const local=Buffer.from(packaged);
  local.writeUInt32LE(0,14);
  assert.throws(()=>inspectWgt(local),/Conflicting ZIP entry lengths or CRC/);
  const different=fixture({overrides:{"styles.css":"changed by an attacker"}});
  assert.match(verifyUpdate(different,fixture({version:"0.0.0"}),source).join(" "),/styles.css/);
});

test("S7.2 offline evidence is machine-readable, non-secret and NEVER an update approval",()=>{
  const evidence=releaseEvidence(fixture(),fixture({version:"0.0.0"}),source);
  assert.equal(evidence.schema,1);
  assert.equal(evidence.package_id,"VDRSuiteTV");
  assert.equal(evidence.application_id,"VDRSuiteTV.VDRSuite");
  assert.equal(evidence.baseline_version,"0.0.0");
  assert.equal(evidence.offline_preflight,"PASS");
  assert.equal(evidence.approval_to_install,false);
  assert.equal(evidence.baseline_confirmed_installed_on_tv,false);
  assert.equal(evidence.data_preserving_tv_update_method_confirmed,false);
  assert.equal(evidence.xml_signature_cryptographically_verified,false);
  assert.equal(evidence.keymanager_persistence_on_hardware,"NOT_TESTED");
  assert.match(evidence.candidate_wgt_sha256,/^[a-f0-9]{64}$/);
  assert.match(evidence.author_certificate_sha256,/^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(evidence),/192\.168\.|password|token|deviceCredential/i);
});

test("S7.2 evidence refuses signer changes, downgrades and wrong dev package",()=>{
  assert.throws(()=>releaseEvidence(fixture({signer:2}),fixture({version:"0.0.0"}),source),/Author certificate differs/);
  assert.throws(()=>releaseEvidence(fixture(),fixture(),source),/must be newer/);
  assert.throws(()=>releaseEvidence(fixture({ids:"VDRSuitDev"}),fixture({version:"0.0.0"}),source),/Candidate/);
});

test("S7.2 CLI JSON mode fails closed without baseline; no TV access",()=>{
  const script=readFileSync(new URL("../scripts/tv-update-preflight.mjs",import.meta.url),"utf8");
  assert.ok(script.includes('opts.json'));
  const run=spawnSync(process.execPath,["scripts/tv-update-preflight.mjs","--candidate","candidate.wgt","--json"],{
    cwd:new URL("..",import.meta.url),encoding:"utf8"
  });
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/--baseline/);
});
