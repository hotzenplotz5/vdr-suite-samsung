import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("Local-only server config is HTTPS-validated, Git-ignored and not committed", () => {
  const ignore=readFileSync(".gitignore","utf8");
  assert.match(ignore,/^\/app\/device-local\.js$/m);
  assert.match(readFileSync("app/index.html","utf8"),/src="device-local\.js"/);
  assert.equal(existsSync("app/device-local.js"),false);
  const root=mkdtempSync(join(tmpdir(),"samsung-local-base-"));
  try {
    mkdirSync(join(root,"scripts"));
    mkdirSync(join(root,"app","src","api"),{recursive:true});
    writeFileSync(join(root,"package.json"),'{"type":"module"}');
    copyFileSync("scripts/configure-tv-server.mjs",join(root,"scripts","configure-tv-server.mjs"));
    copyFileSync("app/src/api/public-discovery.js",join(root,"app","src","api","public-discovery.js"));
    const script=join(root,"scripts","configure-tv-server.mjs");
    const execute=(arg)=>spawnSync(process.execPath,[script,arg],{cwd:root,encoding:"utf8"});
    const invalid=execute("http://example.test/vdr-suite");
    assert.notEqual(invalid.status,0);
    assert.equal(existsSync(join(root,"app","device-local.js")),false);
    const valid=execute("https://example.test/vdr-suite/");
    assert.equal(valid.status,0,valid.stderr);
    const config=readFileSync(join(root,"app","device-local.js"),"utf8");
    assert.match(config,/window\.VDR_SUITE_SERVER_BASE = "https:\/\/example\.test\/vdr-suite";/);
    assert.doesNotMatch(config,/credential|pairingToken/i);
    const clear=execute("--clear");
    assert.equal(clear.status,0,clear.stderr);
    assert.equal(existsSync(join(root,"app","device-local.js")),false);
  } finally {
    rmSync(root,{recursive:true,force:true});
  }
});
