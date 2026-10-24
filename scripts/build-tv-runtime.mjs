// Deterministic, dependency-free classic JS builder for packaged Tizen 5.5.
// ES modules stay source-of-truth. VS Code Tizen Build Project does not run npm.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const inputs = [
  "app/src/navigation/remote.js",
  "app/src/navigation/focus.js",
  "app/src/platform/capabilities.js",
  "app/src/platform/keys.js",
  "app/src/platform/startup-video.js",
  "app/src/main.js"
];
const output = join(root, "app/tv-runtime.js");

function makeRuntime() {
  const bodies = inputs.map(function (path) {
    const code = readFileSync(join(root, path), "utf8")
      .replace(/^import\s+\{[^}\n]+\}\s+from\s+["'][^"'\n]+["'];\r?\n/gm, "")
      .replace(/^export\s+(?=function\s)/gm, "");
    if (/^\s*(?:import|export)\s/m.test(code)) {
      throw new Error("Unsupported module syntax in " + path + "; update builder intentionally");
    }
    return "  // BEGIN " + path + "\n" +
      code.trimEnd().split("\n").map(line => "  " + line).join("\n") +
      "\n  // END " + path + "\n";
  }).join("\n");
  return "/* Generated with 'npm run build:tv' from app/src/**/*.js. DO NOT EDIT.\n" +
    " * A classic single-file script supports packaged Tizen 5.5 file URLs.\n" +
    " */\n(function () {\n  \"use strict\";\n\n" + bodies + "\n}());\n";
}

const expected = makeRuntime();
if (process.argv.includes("--check")) {
  let actual;
  try { actual = readFileSync(output, "utf8"); }
  catch (_) { throw new Error("Missing app/tv-runtime.js: run npm run build:tv"); }
  if (actual !== expected) {
    throw new Error("Stale app/tv-runtime.js: run npm run build:tv and commit the result");
  }
  console.log("Tizen 5.5 classic runtime: synchronized");
} else {
  writeFileSync(output, expected, "utf8");
  console.log("Generated app/tv-runtime.js");
}
