// S7.2: offline-only inspection of signed Samsung production WGT files.
// Never connects to a TV, launches Tizen tools, installs or uninstalls anything.
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {inflateRawSync} from "node:zlib";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const MAX_ARCHIVE=128*1024*1024;
const MAX_ENTRY=16*1024*1024;
const APP_ID="VDRSuiteTV.VDRSuite";
const PACKAGE_ID="VDRSuiteTV";

function fail(reason) {throw Error(reason);}

// ZIP CRC32 is an archive-integrity check, not a replacement for XMLDSig validation.
export function crc32(buffer) {
  let value=0xffffffff;
  for(const byte of buffer) {
    value^=byte;
    for(let bit=0;bit<8;bit++) value=(value>>>1) ^ ((value&1)?0xedb88320:0);
  }
  return (value^0xffffffff)>>>0;
}
function readU16(buf,at) {
  if (at<0||at+2>buf.length) fail("Truncated WGT ZIP");
  return buf.readUInt16LE(at);
}
function readU32(buf,at) {
  if (at<0||at+4>buf.length) fail("Truncated WGT ZIP");
  return buf.readUInt32LE(at);
}

// Read the ZIP central directory; do not extract files or rely on shell utilities.
export function zipEntries(buffer) {
  if (!Buffer.isBuffer(buffer)||buffer.length<22||buffer.length>MAX_ARCHIVE)
    fail("WGT is empty, oversized or not a ZIP");
  let end=-1;
  for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--) {
    if (readU32(buffer,i)===0x06054b50 && i+22+readU16(buffer,i+20)===buffer.length) {
      end=i;break;
    }
  }
  if(end<0) fail("WGT ZIP directory not found");
  if(readU16(buffer,end+4)!==0||readU16(buffer,end+6)!==0)
    fail("Multi-disk ZIP not supported");
  const count=readU16(buffer,end+10);
  if(count!==readU16(buffer,end+8)||count===0||count>4000)
    fail("Invalid ZIP entry count");
  const length=readU32(buffer,end+12), start=readU32(buffer,end+16);
  if(start+length>end) fail("Invalid ZIP central directory");
  let at=start;
  const entries=new Map();
  for(let i=0;i<count;i++) {
    if(readU32(buffer,at)!==0x02014b50) fail("Invalid ZIP central entry");
    const flags=readU16(buffer,at+8), method=readU16(buffer,at+10);
    const crc=readU32(buffer,at+16), compressed=readU32(buffer,at+20), size=readU32(buffer,at+24);
    const nameLength=readU16(buffer,at+28);
    const extra=readU16(buffer,at+30), comment=readU16(buffer,at+32);
    const offset=readU32(buffer,at+42);
    if((flags&1)!==0||![0,8].includes(method)||size===0xffffffff||compressed===0xffffffff||
       offset===0xffffffff||size>MAX_ENTRY||compressed>MAX_ENTRY)
      fail("Unsafe or unsupported ZIP entry");
    const nameEnd=at+46+nameLength;
    if(nameEnd>start+length) fail("Truncated ZIP filename");
    const name=buffer.toString("utf8",at+46,nameEnd);
    if(!name||name.includes("\\")||name.includes("\0")||name.startsWith("/")||
       name.split("/").some(x=>x==="."||x==="..")||entries.has(name.toLowerCase()))
      fail("Unsafe or duplicate WGT filename");
    const unixMode=readU32(buffer,at+38)>>>16;
    if((unixMode&0xf000)===0xa000) fail("Symlinks are not accepted in WGT");
    entries.set(name.toLowerCase(),{name,flags,method,crc,compressed,size,offset});
    at=nameEnd+extra+comment;
    if(at>start+length) fail("Invalid ZIP directory bounds");
  }
  if(at!==start+length) fail("Trailing ZIP central directory content");
  function file(name) {
    const item=entries.get(name.toLowerCase());
    if(!item||item.name!==name) fail("WGT missing "+name);
    const o=item.offset;
    if(readU32(buffer,o)!==0x04034b50) fail("Invalid ZIP local header");
    if(readU16(buffer,o+8)!==item.method) fail("Conflicting ZIP compression method");
    if(readU16(buffer,o+6)!==item.flags) fail("Conflicting ZIP entry flags");
    if(!(item.flags&8) && (readU32(buffer,o+14)!==item.crc ||
                           readU32(buffer,o+18)!==item.compressed ||
                           readU32(buffer,o+22)!==item.size))
      fail("Conflicting ZIP entry lengths or CRC");
    const n=readU16(buffer,o+26), e=readU16(buffer,o+28);
    const pos=o+30+n+e;
    if(pos+item.compressed>start) fail("Invalid ZIP data bounds");
    if(buffer.toString("utf8",o+30,o+30+n)!==name) fail("Conflicting ZIP filename");
    const data=buffer.subarray(pos,pos+item.compressed);
    const decoded=item.method===0?data:inflateRawSync(data,{maxOutputLength:MAX_ENTRY});
    if(decoded.length!==item.size) fail("ZIP entry size mismatch");
    if(crc32(decoded)!==item.crc) fail("WGT ZIP entry CRC mismatch: "+name);
    return decoded;
  }
  return {names:[...entries.values()].map(x=>x.name),file};
}

export function manifestDetails(xml) {
  const widget=xml.match(/<widget\b[^>]*>/s)?.[0];
  const app=xml.match(/<tizen:application\b[^>]*\/>/s)?.[0];
  const attr=(tag,key)=>tag?.match(new RegExp("\\b"+key+"=\"([^\"]+)\""))?.[1];
  const version=attr(widget,"version"), id=attr(app,"id"), packageId=attr(app,"package");
  if(!version||!id||!packageId) fail("Incomplete packaged config.xml identity/version");
  return {id,packageId,version};
}

export function versionParts(version) {
  if(!/^\d+\.\d+\.\d+$/.test(version)) fail("Expected numeric Tizen version X.Y.Z");
  return version.split(".").map(Number);
}

function compareVersion(a,b) {
  const x=versionParts(a),y=versionParts(b);
  for(let i=0;i<3;i++) {
    if(!Number.isSafeInteger(x[i])||!Number.isSafeInteger(y[i]))
      fail("Unsafe Tizen version component");
    if(x[i]!==y[i]) return x[i]>y[i]?1:-1;
  }
  return 0;
}

function authorFingerprint(xml) {
  const matches=[...xml.matchAll(/<(?:[A-Za-z0-9_-]+:)?X509Certificate\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?X509Certificate>/g)];
  if(matches.length!==1) fail("Author signature must identify exactly one X509 certificate");
  const encoded=matches[0][1].replace(/\s+/g,"");
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) fail("Invalid author certificate encoding");
  const bytes=Buffer.from(encoded,"base64");
  if(bytes.length<64||bytes.toString("base64")!==encoded) fail("Invalid author certificate");
  return createHash("sha256").update(bytes).digest("hex");
}

export function inspectWgt(buffer) {
  const zip=zipEntries(buffer);
  for(const name of zip.names) {
    if(/(^|\/)(?:\.witsconfig\.json|\.git|device-local-credential|node_modules)(?:\/|$)/i.test(name)||
       /\.(?:p12|pfx|pem|key|der)$/i.test(name)||
       name.startsWith("../"))
      fail("Sensitive/development file in WGT: "+name);
  }
  const manifest=zip.file("config.xml").toString("utf8");
  const identity=manifestDetails(manifest);
  if(identity.packageId!==PACKAGE_ID||identity.id!==APP_ID)
    fail("WGT is not the original production package/app identity");
  const author=zip.file("author-signature.xml").toString("utf8");
  zip.file("signature1.xml"); // presence is not proof of cryptographic validity
  const fingerprint=authorFingerprint(author);
  return {zip,manifest,identity,fingerprint};
}

function normalized(text) {return text.replace(/\r\n?/g,"\n");}
export function verifyUpdate(candidateBuffer,baselineBuffer,sourceFiles) {
  const problems=[];
  let candidate, baseline;
  try {candidate=inspectWgt(candidateBuffer);} catch(e){problems.push("Candidate: "+e.message);}
  try {baseline=inspectWgt(baselineBuffer);} catch(e){problems.push("Baseline: "+e.message);}
  if(!candidate||!baseline) return problems;
  if(candidate.fingerprint!==baseline.fingerprint)
    problems.push("Author certificate differs from the confirmed installed baseline");
  if(compareVersion(candidate.identity.version,baseline.identity.version)<=0)
    problems.push("Candidate Tizen version must be newer than the baseline");
  const desired=manifestDetails(sourceFiles["config.xml"]);
  if(desired.id!==APP_ID||desired.packageId!==PACKAGE_ID)
    problems.push("Repository's production package identity changed");
  if(candidate.identity.version!==desired.version)
    problems.push("WGT version differs from repository manifest");
  for(const name of ["config.xml","index.html","styles.css","tv-runtime.js"]) {
    try {
      if(normalized(candidate.zip.file(name).toString("utf8"))!==normalized(sourceFiles[name]))
        problems.push("WGT content differs from current source: "+name);
    } catch(e) {problems.push(e.message);}
  }
  return problems;
}

function usage() {
  fail("Usage: node scripts/tv-update-preflight.mjs --inspect FILE.wgt | --candidate NEW.wgt --baseline LAST_CONFIRMED_INSTALLED.wgt");
}

function main(argv) {
  const opts={};
  for(let i=0;i<argv.length;i+=2) {
    if(!["--inspect","--candidate","--baseline"].includes(argv[i])||!argv[i+1]||opts[argv[i]])
      usage();
    opts[argv[i]]=argv[i+1];
  }
  if(opts["--inspect"]&&Object.keys(opts).length===1) {
    const inspected=inspectWgt(readFileSync(opts["--inspect"]));
    console.log("Signed-WGT inspection (offline; XML signatures NOT cryptographically verified):");
    console.log("Package: "+inspected.identity.packageId+" | app: "+inspected.identity.id+
                " | version: "+inspected.identity.version);
    console.log("Author certificate SHA-256: "+inspected.fingerprint);
    console.log("No device contact; no installation.");
    return;
  }
  if(!opts["--candidate"]||!opts["--baseline"]||Object.keys(opts).length!==2) usage();
  if(resolve(opts["--candidate"])===resolve(opts["--baseline"]))
    fail("Candidate and baseline must be different files");
  const src={};
  for(const name of ["config.xml","index.html","styles.css","tv-runtime.js"])
    src[name]=readFileSync(join(root,"app",name),"utf8");
  const issues=verifyUpdate(readFileSync(opts["--candidate"]),readFileSync(opts["--baseline"]),src);
  if(issues.length) fail(issues.join("; "));
  console.log("S7.2 WGT offline preflight PASS: production IDs, higher version, source contents and author certificate match.");
  console.log("NO hardware/data-persistence PASS. Baseline must be the WGT actually installed on the TV.");
  console.log("NO install/uninstall is performed or approved. Stop before any TV deployment.");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {main(process.argv.slice(2));}
  catch(e) {console.error("S7.2 update blocked: "+e.message);process.exitCode=1;}
}
