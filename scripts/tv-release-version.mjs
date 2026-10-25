// S7.2: Change local production release versions only when explicitly --apply.
// No device connection, install/uninstall, signing, credential access or git reset.
import {readFileSync,writeFileSync} from "node:fs";
import {join,dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const packagePath=join(root,"package.json");
const manifestPath=join(root,"app/config.xml");
const versionPattern=/^\d+\.\d+\.\d+$/;
function parts(v) {
  if(!versionPattern.test(v)) throw Error("Require a numeric X.Y.Z version");
  const nums=v.split(".").map(Number);
  if(nums.some(n=>!Number.isSafeInteger(n))) throw Error("Unsafe version");
  return nums;
}
function higher(next,current) {
  const x=parts(next),y=parts(current);
  for(let i=0;i<3;i++) if(x[i]!==y[i]) return x[i]>y[i];
  return false;
}
export function prepareVersionBump(packageText,manifest,next) {
  const obj=JSON.parse(packageText);
  if(typeof obj.version!=="string"||!versionPattern.test(obj.version))
    throw Error("Unexpected package version");
  const widget=manifest.match(/<widget\b[^>]*>/s)?.[0];
  const app=manifest.match(/<tizen:application\b[^>]*\/>/s)?.[0];
  if(!widget||!app||!app.includes('id="VDRSuiteTV.VDRSuite"')||
     !app.includes('package="VDRSuiteTV"'))
    throw Error("Production app identity changed; refused");
  const current=widget.match(/\bversion="([^"]+)"/)?.[1];
  if(current!==obj.version||!higher(next,current))
    throw Error("Both versions must match and the new version must be higher");
  const oldPackageVersion='"version": "'+obj.version+'"';
  if(packageText.split(oldPackageVersion).length!==2)
    throw Error("Cannot unambiguously change package.json version");
  const changedPackage=packageText.replace(oldPackageVersion,'"version": "'+next+'"');
  const changedManifest=manifest.replace(widget,widget.replace(
    'version="'+current+'"','version="'+next+'"'
  ));
  if(changedManifest===manifest) throw Error("Manifest version unchanged");
  return {from:current,to:next,packageText:changedPackage,manifestText:changedManifest};
}

function main(args) {
  if(args.length!==3||args[0]!=="--next"||!["--dry-run","--apply"].includes(args[2]))
    throw Error("Usage: node scripts/tv-release-version.mjs --next X.Y.Z --dry-run|--apply");
  const packageText=readFileSync(packagePath,"utf8");
  const manifest=readFileSync(manifestPath,"utf8");
  const result=prepareVersionBump(packageText,manifest,args[1]);
  if(args[2]==="--dry-run") {
    console.log("S7.2 version preview: "+result.from+" -> "+result.to+
      " (production IDs unchanged; no files written)");
    return;
  }
  // No implicit runtime build or Tizen package installation.
  writeFileSync(packagePath,result.packageText,"utf8");
  writeFileSync(manifestPath,result.manifestText,"utf8");
  console.log("Updated ONLY package.json and app/config.xml to "+result.to+".");
  console.log("Now run npm.cmd run build:tv; npm.cmd run check; then Build Project (never Run Project).");
  console.log("No WGT signed or TV contacted. No update approved.");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {main(process.argv.slice(2));}
  catch(e){console.error("S7.2 version bump blocked: "+e.message);process.exitCode=1;}
}
