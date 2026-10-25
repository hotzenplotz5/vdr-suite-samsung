import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, copyFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {spawnSync} from "node:child_process";
import {preflight} from "../scripts/tv-watch-safe.mjs";

const requiredIgnore=[
  ".witsconfig.json","Debug",".tizen-rds","*.p12"
];
const manifest='<widget><tizen:application package="VDRSuiteTV" id="VDRSuiteTV.VDRSuite"/></widget>';
function fixture({hasConfig=true,config={connectionInfo:{deviceIp:"example"},profileInfo:{path:"local"}},ignore=requiredIgnore.join("\n"),xml=manifest}={}) {
  return {
    exists(path) {
      if (path.endsWith(".witsconfig.json")) return hasConfig;
      if (path.endsWith(".witsignore")) return true;
      return false;
    },
    read(path) {
      if (path.endsWith(".witsconfig.json")) return JSON.stringify(config);
      if (path.endsWith(".witsignore")) return ignore;
      if (path.endsWith("config.xml")) return xml;
      throw Error("Unexpected file");
    }
  };
}
test("Safe Samsung update Watch accepts a configured Tizen 5.5 developer project",()=>{
  assert.deepEqual(preflight(fixture()),[]);
});
test("Safe Watch rejects absent WITs init; never silently installs the app",()=>{
  const result=preflight(fixture({hasConfig:false}));
  assert.ok(result.some(x=>x.includes("WITs -i")));
});
test("Safe Watch requires ignored developer files and stable package identity",()=>{
  assert.ok(preflight(fixture({ignore:".witsconfig.json"})).some(x=>x.includes("Debug")));
  assert.ok(preflight(fixture({xml:manifest.replace("VDRSuiteTV.VDRSuite","different.app")})).some(x=>x.includes("Paketidentität")));
  assert.ok(preflight(fixture({config:{}})).some(x=>x.includes("unvollständig")));
});
test("Safe Watch code invokes only WITs --watch; no Start, install or secret export",()=>{
  const script=readFileSync(new URL("../scripts/tv-watch-safe.mjs",import.meta.url),"utf8");
  const npm=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"));
  const ignore=readFileSync(new URL("../app/.witsignore",import.meta.url),"utf8");
  assert.match(script,/spawn\(windows\?"wits\.cmd":"wits",\["--watch"\]/);
  assert.doesNotMatch(script,/spawn\([^\n]+\["(?:--start|-s|install|uninstall)"\]/);
  assert.match(npm.scripts["tv:watch"],/scripts\/tv-watch-safe\.mjs/);
  assert.match(npm.scripts["tv:watch:check"],/--preflight/);
  assert.match(readFileSync(new URL("../.gitignore",import.meta.url),"utf8"),/\/app\/\.witsconfig\.json/);
  for (const needle of requiredIgnore) assert.ok(ignore.includes(needle));
  assert.doesNotMatch(script,/credentialSecret|localStorage|exportSecret|saveData/);
});
test("Safe Watch fails closed on an unconfigured checkout, no target/network required",()=>{
  const root=mkdtempSync(join(tmpdir(),"samsung-tv-watch-test-"));
  try {
    mkdirSync(join(root,"app"),{recursive:true});
    mkdirSync(join(root,"scripts"),{recursive:true});
    copyFileSync(new URL("../scripts/tv-watch-safe.mjs",import.meta.url),
      join(root,"scripts","tv-watch-safe.mjs"));
    writeFileSync(join(root,"package.json"),'{"type":"module"}');
    writeFileSync(join(root,"app",".witsignore"),requiredIgnore.join("\\n"));
    writeFileSync(join(root,"app","config.xml"),manifest);
    const result=spawnSync(process.execPath,["scripts/tv-watch-safe.mjs","--preflight"],{
      cwd:root,encoding:"utf8"
    });
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/TV-Watch abgebrochen/);
    assert.match(result.stderr,/Keine Installation/);
  } finally {
    rmSync(root,{recursive:true,force:true});
  }
});
