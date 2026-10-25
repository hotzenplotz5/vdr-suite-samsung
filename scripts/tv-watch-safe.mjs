// Development-only, non-installing Samsung WITs Watch wrapper.
// Intentionally NEVER invokes WITs Start, Tizen install/uninstall or SDB install.
import {existsSync, readFileSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawn, spawnSync} from "node:child_process";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const app=join(root,"app");

export function preflight({exists=existsSync,read=readFileSync}={}) {
  const problems=[];
  const witsConfig=join(app,".witsconfig.json");
  if (!exists(witsConfig)) {
    problems.push("app/.witsconfig.json fehlt. Einmalig im Ordner app/ mit WITs -i konfigurieren; WITs Start ist KEIN sicherer Update-Befehl.");
  } else {
    try {
      const config=JSON.parse(read(witsConfig,"utf8"));
      if (!config || typeof config!=="object" ||
          !config.connectionInfo || !config.profileInfo) {
        problems.push("WITs-Konfiguration ist unvollständig (connectionInfo/profileInfo).");
      }
    } catch (_) {
      problems.push("WITs-Konfiguration ist kein gültiges JSON.");
    }
  }
  const ignorePath=join(app,".witsignore");
  if (!exists(ignorePath)) {
    problems.push("app/.witsignore fehlt.");
  } else {
    const ignore=read(ignorePath,"utf8");
    for (const needle of [".witsconfig.json","Debug",".tizen-rds","*.p12"]) {
      if (!ignore.includes(needle)) {
        problems.push("Sichere WITs-Ausschlussregel fehlt: "+needle);
      }
    }
  }
  const manifest=read(join(app,"config.xml"),"utf8");
  if (!manifest.includes('package="VDRSuiteTV"') ||
      !manifest.includes('id="VDRSuiteTV.VDRSuite"')) {
    problems.push("Tizen-Paketidentität wurde geändert: kein Update ohne bewusste Migration.");
  }
  return problems;
}

function runCheck(args) {
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:"inherit"});
  return result.status===0;
}

function main() {
  const problems=preflight();
  if (problems.length) {
    for (const error of problems) console.error("TV-Watch abgebrochen: "+error);
    console.error("Keine Installation, keine Geräte- oder KeyManager-Änderung ausgeführt.");
    process.exitCode=1;
    return;
  }
  if (!runCheck(["scripts/build-tv-runtime.mjs","--check"]) ||
      !runCheck(["--check","app/tv-runtime.js"]) ||
      !runCheck(["--test"])) {
    console.error("TV-Watch abgebrochen: erst npm.cmd run build:tv und npm.cmd run check erfolgreich ausführen.");
    process.exitCode=1;
    return;
  }
  if (process.argv.includes("--preflight")) {
    console.log("WITs Watch vorbereitet. Kein Gerät kontaktiert, keine Installation.");
    return;
  }
  console.log("WITs WATCH ONLY: kein WITs Start/Run Project/Uninstall.");
  console.log("Voraussetzung: die App wurde bereits mit WITs initialisiert; Geräteanmeldung am TV vor/nach dem Watch prüfen.");
  const windows=process.platform==="win32";
  const child=spawn(windows?"wits.cmd":"wits",["--watch"],{
    cwd:app,stdio:"inherit",shell:windows
  });
  child.on("error",()=> {
    console.error("WITs nicht gefunden/startbar. @tizentv/wits lokal installieren und im app/-Ordner WITs -i konfigurieren.");
    console.error("Es wird ausdrücklich KEIN Installations-Fallback ausgelöst.");
    process.exitCode=1;
  });
  child.on("exit",(code,signal)=> {
    if (signal) process.exitCode=1;
    else process.exitCode=code===0?0:1;
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  main();
}
