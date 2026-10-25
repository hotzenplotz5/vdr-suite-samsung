// Offline-only WITs development project. Never install/uninstall or touch TV credentials.
import {cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

export const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
export const production=join(root,"app");
export const staging=join(root,".tizen-wits-dev");

export const identity=Object.freeze({
  productionPackage:"VDRSuiteTV",
  productionApp:"VDRSuiteTV.VDRSuite",
  devPackage:"VDRSuitDev", // independent, exactly 10 alphanumeric characters
  devApp:"VDRSuitDev.VDRSuite",
  witsApp:"VDRSuitDev.VDRSuiteWITs"
});

export function manifestIdentity(xml) {
  const tag=xml.match(/<tizen:application\b[^>]*\/>/s)?.[0];
  const id=tag?.match(/\bid="([^"]+)"/)?.[1];
  const pkg=tag?.match(/\bpackage="([^"]+)"/)?.[1];
  if (!id || !pkg) throw Error("Tizen application/package attributes missing");
  return {app:id,package:pkg};
}

export function devManifest(xml) {
  const normal=manifestIdentity(xml);
  if (normal.package!==identity.productionPackage || normal.app!==identity.productionApp) {
    throw Error("Unexpected production app identity; staging refused");
  }
  const tag=xml.match(/<tizen:application\b[^>]*\/>/s)[0];
  if (!xml.includes("<name>VDR-Suite</name>")) throw Error("Unexpected production app name");
  const nextTag=tag
    .replace('id="'+identity.productionApp+'"','id="'+identity.devApp+'"')
    .replace('package="'+identity.productionPackage+'"','package="'+identity.devPackage+'"');
  const result=xml.replace(tag,nextTag).replace("<name>VDR-Suite</name>","<name>VDR-Suite DEV</name>");
  const generated=manifestIdentity(result);
  if (generated.package!==identity.devPackage || generated.app!==identity.devApp ||
      generated.package===normal.package) throw Error("Unsafe development package identity");
  return result;
}

export function printIdentity() {
  devManifest(readFileSync(join(production,"config.xml"),"utf8"));
  console.log("Installed production: package="+identity.productionPackage+
    " | app="+identity.productionApp+" (UNCHANGED)");
  console.log("Isolated project:    package="+identity.devPackage+
    " | app="+identity.devApp);
  console.log("WITs host expected:  package="+identity.devPackage+
    " | app="+identity.witsApp);
  console.log("ONLY the separately approved WITs bootstrap may install the DEV package.");
  console.log("No TV contact, installation, credential access or signing.");
}

// Copies only explicit shipping assets. No local device-local.js, profiles, SDK files or secrets.
export function prepare() {
  const check=spawnSync(process.execPath,["scripts/build-tv-runtime.mjs","--check"],{
    cwd:root,encoding:"utf8"
  });
  if (check.status!==0) throw Error("Stale TV runtime; first run npm.cmd run build:tv and npm.cmd run check");
  const xml=readFileSync(join(production,"config.xml"),"utf8");
  const newXml=devManifest(xml);
  if (existsSync(staging) && !lstatSync(staging).isDirectory()) {
    throw Error("Development staging location is not a directory");
  }
  mkdirSync(staging,{recursive:true});
  const copyFile=(name)=> {
    const dst=join(staging,name);
    if (existsSync(dst) && lstatSync(dst).isSymbolicLink()) throw Error("Refusing symlink in dev project: "+name);
    cpSync(join(production,name),dst,{force:true});
  };
  for (const name of ["index.html","styles.css","tv-runtime.js"]) copyFile(name);
  const assetDest=join(staging,"assets");
  if (existsSync(assetDest) && lstatSync(assetDest).isSymbolicLink()) {
    throw Error("Refusing linked assets in dev project");
  }
  cpSync(join(production,"assets"),assetDest,{
    recursive:true,force:true,
    filter:(path)=>!lstatSync(path).isSymbolicLink()
  });
  const configPath=join(staging,"config.xml");
  const ignorePath=join(staging,".witsignore");
  for (const p of [configPath,ignorePath]) {
    if (existsSync(p) && lstatSync(p).isSymbolicLink()) throw Error("Refusing linked dev manifest/ignore file");
  }
  writeFileSync(configPath,newXml,"utf8");
  writeFileSync(ignorePath,readFileSync(join(production,".witsignore"),"utf8")+
    "\n# WITs staging is isolated from production\n.git/\nnode_modules/\ndevice-local.js\n","utf8");
  const problems=verifyStaging({requireWitsConfig:false});
  if (problems.length) throw Error("Unsafe staging: "+problems.join("; "));
  printIdentity();
  console.log("Isolated sources prepared. WITs -i / Start NOT invoked.");
}

export function verifyStaging({requireWitsConfig=true}={}) {
  const problems=[];
  try {
    const expected=devManifest(readFileSync(join(production,"config.xml"),"utf8"));
    const actual=readFileSync(join(staging,"config.xml"),"utf8");
    if (actual!==expected) problems.push("Development manifest missing or differs; run tv:dev:prepare");
    const ids=manifestIdentity(actual);
    if (ids.package!==identity.devPackage || ids.app!==identity.devApp) problems.push("Wrong DEV identity");
    for (const name of ["index.html","styles.css","tv-runtime.js"]) {
      if (readFileSync(join(staging,name),"utf8")!==readFileSync(join(production,name),"utf8")) {
        problems.push("Staged "+name+" is not current");
      }
    }
    const ignore=readFileSync(join(staging,".witsignore"),"utf8");
    for (const name of [".witsconfig.json","Debug","*.p12","device-local.js"]) {
      if (!ignore.includes(name)) problems.push("WITs ignore rule absent: "+name);
    }
    const allow=new Set(["config.xml","index.html","styles.css","tv-runtime.js","assets",
                         ".witsignore",".witsconfig.json"]);
    for(const entry of readdirSync(staging)) {
      if (!allow.has(entry)) problems.push("Unknown file in WITs staging: "+entry);
    }
    if (requireWitsConfig) {
      const config=JSON.parse(readFileSync(join(staging,".witsconfig.json"),"utf8"));
      if (!config.connectionInfo || !config.profileInfo ||
          !config.profileInfo.path || !config.connectionInfo.deviceIp) {
        problems.push("WITs -i configuration incomplete in isolated project");
      } else {
        const base=config.connectionInfo.baseAppPath || ".";
        if (typeof base!=="string" || resolve(staging,base)!==staging) {
          problems.push("WITs baseAppPath MUST point to isolated .tizen-wits-dev, not app/");
        }
      }
    }
  } catch(e) { problems.push("Isolated development setup not ready: "+e.message); }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes("--identity")) printIdentity();
    else if (process.argv.includes("--prepare")) prepare();
    else throw Error("Use --identity or --prepare");
  } catch(e) {
    console.error("WITs DEV blocked: "+e.message);
    process.exitCode=1;
  }
}
