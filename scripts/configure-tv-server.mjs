// Creates a local-only non-secret HTTPS server base for Tizen development installs.
// Example: npm.cmd run configure:tv -- https://example.invalid/vdr-suite
import { writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeSuiteBase } from "../app/src/api/public-discovery.js";

const target = join(dirname(fileURLToPath(import.meta.url)), "../app/device-local.js");
const address = process.argv[2];
if (address === "--clear") {
  try { unlinkSync(target); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  console.log("Lokale Samsung-Serverkonfiguration entfernt.");
} else {
  const base = normalizeSuiteBase(address);
  if (!base) {
    console.error("Vollständige HTTPS-Adresse mit optionalem Proxy-Pfad angeben.");
    process.exitCode = 1;
  } else {
    writeFileSync(target,
      "/* Nur lokale Serverbasis; niemals Zugangsdaten eintragen. */\n" +
      "window.VDR_SUITE_SERVER_BASE = " + JSON.stringify(base) + ";\n",
      { encoding: "utf8", mode: 0o600 });
    console.log("Lokale Samsung-Serverbasis für künftige .wgt-Pakete vorbereitet.");
  }
}
