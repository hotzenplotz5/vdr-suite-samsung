import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "scripts/build-tv-runtime.mjs",
  "app/tv-runtime.js",
  "app/src/navigation/remote.js",
  "app/src/navigation/focus.js",
  "app/src/navigation/premium-focus.js",
  "app/src/platform/capabilities.js",
  "app/src/platform/keys.js",
  "app/src/platform/startup-video.js",
  "app/src/main.js"
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
