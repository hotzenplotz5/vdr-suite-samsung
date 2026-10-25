// No installation path exists here. WITs Watch always targets an isolated DEV package.
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawn, spawnSync} from "node:child_process";
import {identity, root, staging, verifyStaging} from "./tv-wits-isolated.mjs";

export function preflight() {
  return verifyStaging({requireWitsConfig:true});
}
function runCheck(args) {
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:"inherit"});
  return result.status===0;
}
function main() {
  const problems=preflight();
  if (problems.length) {
    for (const error of problems) console.error("WITs Watch blocked: "+error);
    console.error("No device contact, install/uninstall or production app change.");
    process.exitCode=1;
    return;
  }
  if (!runCheck(["scripts/build-tv-runtime.mjs","--check"]) ||
      !runCheck(["--check","app/tv-runtime.js"]) || !runCheck(["--test"])) {
    console.error("WITs Watch blocked: run npm.cmd run build:tv, check, tv:dev:prepare first.");
    process.exitCode=1;
    return;
  }
  if (process.argv.includes("--preflight")) {
    console.log("Isolated WITs Watch ready (offline). No TV contact or installation.");
    return;
  }
  console.log("WITs WATCH ONLY — expected "+identity.witsApp+" ("+identity.devPackage+").");
  console.log("Production "+identity.productionApp+" ("+identity.productionPackage+") is NOT the target.");
  const windows=process.platform==="win32";
  const child=spawn(windows?"wits.cmd":"wits",["--watch"],{
    cwd:staging,stdio:"inherit",shell:windows
  });
  child.on("error",()=> {
    console.error("WITs not available. No automatic bootstrap/install.");
    process.exitCode=1;
  });
  child.on("exit",(code,signal)=> {
    if (signal || code!==0) {
      console.error("WITs Watch failed: DEV host may not yet be installed.");
      console.error("Never start WITs against app/. No installation fallback.");
      process.exitCode=1;
    }
  });
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) main();
