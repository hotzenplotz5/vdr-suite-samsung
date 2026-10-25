import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, copyFileSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {spawnSync} from "node:child_process";
import {devManifest, manifestIdentity, identity, production, verifyStaging} from "../scripts/tv-wits-isolated.mjs";

const original=readFileSync(join(production,"config.xml"),"utf8");
const generated=devManifest(original);

test("WITs always uses a distinct ten-character package ID, not only another application ID",()=>{
  assert.deepEqual(manifestIdentity(original),{app:identity.productionApp,package:identity.productionPackage});
  assert.deepEqual(manifestIdentity(generated),{app:identity.devApp,package:identity.devPackage});
  assert.match(identity.devPackage,/^[A-Za-z0-9]{10}$/);
  assert.notEqual(identity.devPackage,identity.productionPackage);
  assert.equal(identity.witsApp,identity.devApp+"WITs");
  assert.ok(identity.witsApp.startsWith(identity.devPackage+"."));
  assert.match(generated,/<name>VDR-Suite DEV<\/name>/);
  assert.match(generated,/required_version="5\.5"/);
  assert.ok(!generated.includes('package="'+identity.productionPackage+'"'));
});

test("Unknown production package/app changes fail closed instead of clobbering TV identity",()=>{
  assert.throws(()=>devManifest(original.replace('package="VDRSuiteTV"','package="Different1"')),/Unexpected production/);
  assert.throws(()=>devManifest(original.replace('id="VDRSuiteTV.VDRSuite"','id="Other.App"')),/Unexpected production/);
  assert.throws(()=>manifestIdentity("<widget></widget>"),/missing/);
});

function fixture() {
  const base=mkdtempSync(join(tmpdir(),"samsung-wits-isolation-"));
  const source=join(base,"source");
  const target=join(base,"dev");
  mkdirSync(source);mkdirSync(target);
  writeFileSync(join(source,"config.xml"),original);
  writeFileSync(join(target,"config.xml"),generated);
  for(const name of ["index.html","styles.css","tv-runtime.js"]) {
    writeFileSync(join(source,name),"source "+name);
    writeFileSync(join(target,name),"source "+name);
  }
  writeFileSync(join(target,".witsignore"),".witsconfig.json\nDebug\n*.p12\ndevice-local.js\n");
  const config={connectionInfo:{baseAppPath:".",deviceIp:"192.0.2.1"},profileInfo:{path:"profile-only-placeholder"}};
  const putConfig=(next)=>writeFileSync(join(target,".witsconfig.json"),JSON.stringify(next));
  putConfig(config);
  return {base,source,target,config,putConfig,inspect:()=>verifyStaging({source,target})};
}
test("Isolated WITs staging checks identity, source sync and local config without contacting a TV",()=>{
  const f=fixture();
  try {
    assert.deepEqual(f.inspect(),[]);
    f.putConfig({...f.config,connectionInfo:{...f.config.connectionInfo,baseAppPath:"../source"}});
    assert.match(f.inspect().join(" "),/MUST point to isolated/);
    f.putConfig(f.config);
    writeFileSync(join(f.target,"tv-runtime.js"),"old version");
    assert.match(f.inspect().join(" "),/not current/);
    writeFileSync(join(f.target,"tv-runtime.js"),"source tv-runtime.js");
    writeFileSync(join(f.target,"device-local.js"),"should never be copied");
    assert.match(f.inspect().join(" "),/Unknown file/);
  } finally {rmSync(f.base,{recursive:true,force:true});}
});
test("Watch is fail-closed in a fresh checkout and cannot touch production",()=>{
  const script=readFileSync(new URL("../scripts/tv-watch-safe.mjs",import.meta.url),"utf8");
  const npm=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"));
  assert.match(script,/cwd:staging/);
  assert.match(script,/\\["--watch"\\]/);
  assert.doesNotMatch(script,/\\["--start"\\]|\\["-s"\\]|vd_appinstall|vd_appuninstall|Run Project/);
  assert.match(npm.scripts["tv:dev:prepare"],/tv-wits-isolated\\.mjs --prepare/);
  assert.match(npm.scripts["tv:dev:identity"],/tv-wits-isolated\\.mjs --identity/);
  const base=mkdtempSync(join(tmpdir(),"samsung-watch-no-init-"));
  try {
    mkdirSync(join(base,"scripts"));
    copyFileSync(new URL("../scripts/tv-watch-safe.mjs",import.meta.url),join(base,"scripts","tv-watch-safe.mjs"));
    copyFileSync(new URL("../scripts/tv-wits-isolated.mjs",import.meta.url),join(base,"scripts","tv-wits-isolated.mjs"));
    writeFileSync(join(base,"package.json"),'{"type":"module"}');
    const result=spawnSync(process.execPath,["scripts/tv-watch-safe.mjs","--preflight"],{
      cwd:base,encoding:"utf8"
    });
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/WITs Watch blocked/);
    assert.match(result.stderr,/No device contact/);
  } finally {rmSync(base,{recursive:true,force:true});}
});
