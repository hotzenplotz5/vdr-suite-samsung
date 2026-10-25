import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const builder = readFileSync(join(root, "scripts/build-tv-runtime.mjs"), "utf8");
// Use the real bundle manifests. Adding a new module must not silently break
// the Windows CRLF checkout fixture by omitting it from the temp project.
function buildInputList(name) {
  const match = builder.match(new RegExp("\\bconst\\s+" + name + "\\s*=\\s*(\\[[\\s\\S]*?\\]);"));
  assert.ok(match, "Missing builder input list: " + name);
  return JSON.parse(match[1]);
}
const files = [
  "scripts/build-tv-runtime.mjs",
  "app/tv-runtime.js",
  ...buildInputList("inputs"),
  ...buildInputList("presentationInputs")
];

test("Tizen TV bundle accepts Windows CRLF checkout yet detects real changes", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "vdr-suite-tizen-crlf-"));
  try {
    for (const path of files) {
      const dest = join(tempRoot, path);
      mkdirSync(dirname(dest), { recursive: true });
      // Simulate Git for Windows core.autocrlf=true for every source/target file.
      const normalized = readFileSync(join(root, path), "utf8").replace(/\r\n?/g, "\n");
      writeFileSync(dest, normalized.replace(/\n/g, "\r\n"), "utf8");
    }

    const script = join(tempRoot, "scripts/build-tv-runtime.mjs");
    const verify = () => spawnSync(process.execPath, [script, "--check"], {
      cwd: tempRoot, encoding: "utf8"
    });

    const ok = verify();
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /Tizen 5\.5 classic runtime: synchronized/);

    // Tizen Extension adds this TypeScript editor hint to local main.js.
    // It must not invalidate the checked-in classic TV runtime.
    const mainPath = join(tempRoot, "app/src/main.js");
    const untouched = readFileSync(mainPath, "utf8");
    writeFileSync(mainPath,
      '/// <reference path="../../index.d.ts" />\r\n\r\n' + untouched, "utf8");
    const tizenAnnotated = verify();
    assert.equal(tizenAnnotated.status, 0, tizenAnnotated.stderr);
    writeFileSync(mainPath, untouched, "utf8");

    const output = join(tempRoot, "app/tv-runtime.js");
    writeFileSync(output, readFileSync(output, "utf8") + "// unexpected change\r\n");
    const stale = verify();
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /Stale app\/tv-runtime\.js/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("Tizen generated runtime has a repository-enforced LF checkout rule", () => {
  const attrs = readFileSync(join(root, ".gitattributes"), "utf8");
  assert.match(attrs, /^app\/tv-runtime\.js\s+text\s+eol=lf\s*$/m);
});
