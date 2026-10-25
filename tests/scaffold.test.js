import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");

test("Standalone Tizen 5.5 TV configuration points to packaged files", () => {
  const xml = read("app/config.xml");
  assert.match(xml, /required_version="5\.5"/);
  assert.match(xml, /tizen:profile name="tv-samsung"/);
  assert.match(xml, /content src="index\.html"/);
  assert.match(xml, /icon src="assets\/icon\.png"/);
  assert.ok(existsSync(join(root, "app/index.html")));
  assert.ok(existsSync(join(root, "app/assets/icon.png")));
  assert.ok(existsSync(join(root, "app/src/main.js")));
});

test("Phase S1 has no hardcoded remote URL or authentication", () => {
  const code = read("app/src/main.js") + read("app/index.html");
  // S3.1 may show a clearly fictional HTTPS placeholder, never a real deployed host.
  assert.doesNotMatch(read("app/src/main.js"), /https?:\/\//);
  assert.match(read("app/index.html"), /placeholder="https:\/\/server\.example\/vdr-suite"/);
  assert.doesNotMatch(code, /fetch\(|XMLHttpRequest|credentialSecret|Authorization:/);
});

test("Roadmap and hardware test records are present", () => {
  assert.match(read("ROADMAP.md"), /Phase S1/);
  assert.match(read("docs/hardware-acceptance.md"), /OFFEN/);
});
