import test from "node:test";
import assert from "node:assert/strict";
import { nextPreviewState, getViewPresentation } from "../app/src/views/view-state.js";

test("S2.3 preview state sequence is deterministic and finite", () => {
  assert.equal(nextPreviewState("offline"), "loading");
  assert.equal(nextPreviewState("loading"), "empty");
  assert.equal(nextPreviewState("empty"), "error");
  assert.equal(nextPreviewState("error"), "offline");
  assert.equal(nextPreviewState("unknown"), "offline");
});

test("S2.3 every media area provides safe offline/loading/empty/error copy", () => {
  for (const route of ["live", "recordings", "search", "timers"]) {
    for (const state of ["offline", "loading", "empty", "error"]) {
      const result = getViewPresentation(route, state);
      assert.equal(result.state, state);
      assert.equal(typeof result.title, "string");
      assert.ok(result.description.length > 30);
      assert.equal(result.skeleton, state === "loading");
      assert.match(result.description, /(?:keine|nicht|Simulierter|geladen|angefragt|Anfrage)/);
    }
    assert.deepEqual(getViewPresentation(route, "unexpected"), getViewPresentation(route, "offline"));
  }
  assert.equal(getViewPresentation("admin", "error"), null);
  assert.equal(getViewPresentation("settings", "loading"), null);
});

test("S2.3 preview does not claim authentic EPG/recording data", () => {
  for (const route of ["live", "recordings", "search", "timers"]) {
    for (const state of ["loading","empty","error"]) {
      const p = getViewPresentation(route, state);
      assert.match(p.badge, /(?:VORSCHAU|DEMO)/);
    }
  }
});
