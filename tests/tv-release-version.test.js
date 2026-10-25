import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {prepareVersionBump} from "../scripts/tv-release-version.mjs";
const pkg=readFileSync(new URL("../package.json",import.meta.url),"utf8");
const manifest=readFileSync(new URL("../app/config.xml",import.meta.url),"utf8");
const current=JSON.parse(pkg).version;

test("S7.2 release version bump edits only matching manifest/package versions",()=>{
  const bumped=prepareVersionBump(pkg,manifest,"0.1.1");
  assert.equal(bumped.from,current);
  assert.equal(JSON.parse(bumped.packageText).version,"0.1.1");
  assert.match(bumped.manifestText,/<widget[^>]*\bversion="0\.1\.1"/s);
  assert.match(bumped.manifestText,/id="VDRSuiteTV\.VDRSuite"/);
  assert.match(bumped.manifestText,/package="VDRSuiteTV"/);
  assert.equal(bumped.packageText.replace('"version": "0.1.1"','"version": "'+current+'"'),pkg);
  assert.equal(bumped.manifestText.replace('version="0.1.1"','version="'+current+'"'),manifest);
});

test("S7.2 rejects same version, downgrade and changed package or app identity",()=>{
  assert.throws(()=>prepareVersionBump(pkg,manifest,current),/higher/);
  assert.throws(()=>prepareVersionBump(pkg,manifest,"0.0.1"),/higher/);
  assert.throws(()=>prepareVersionBump(pkg,manifest,"other"),/X.Y.Z/);
  assert.throws(()=>prepareVersionBump(pkg,manifest.replace("VDRSuiteTV.VDRSuite","VDRSuitDev.VDRSuite"),"0.1.1"),/identity/);
  assert.throws(()=>prepareVersionBump(pkg,manifest.replace('package="VDRSuiteTV"','package="VDRSuitDev"'),"0.1.1"),/identity/);
  assert.throws(()=>prepareVersionBump(pkg,manifest.replace('version="'+current+'"','version="0.0.1"'),"0.1.1"),/versions must match/);
});

test("S7.2 dry-run is read-only and never starts tools or touches credentials",()=>{
  const src=readFileSync(new URL("../scripts/tv-release-version.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(src,/vd_appuninstall|vd_appinstall|wits --start|sdb install|keymanager|tizen install/);
  const before=readFileSync(new URL("../package.json",import.meta.url),"utf8");
  const result=spawnSync(process.execPath,["scripts/tv-release-version.mjs","--next","0.1.1","--dry-run"],{
    cwd:new URL("..",import.meta.url),encoding:"utf8"
  });
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/no files written/);
  assert.equal(readFileSync(new URL("../package.json",import.meta.url),"utf8"),before);
});
