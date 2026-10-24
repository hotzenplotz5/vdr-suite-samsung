import test from "node:test";
import assert from "node:assert/strict";
import { nextFocusId } from "../app/src/navigation/premium-focus.js";

const rows = [
  ["nav-home","nav-live","nav-recordings","nav-search","nav-timers","nav-settings"],
  ["stage-left","stage-main","stage-right"],
  ["action-live","action-recordings","action-settings"],
  ["rail-recordings","rail-live","rail-search","rail-timers"]
];

test("S2 focus graph moves within a row and clamps at edges", () => {
  assert.equal(nextFocusId("nav-home","LEFT",rows),"nav-home");
  assert.equal(nextFocusId("nav-home","RIGHT",rows),"nav-live");
  assert.equal(nextFocusId("nav-settings","RIGHT",rows),"nav-settings");
  assert.equal(nextFocusId("rail-timers","DOWN",rows),"rail-timers");
  assert.equal(nextFocusId("missing","DOWN",rows),"nav-home");
});

test("S2 focus graph moves between uneven rows predictably", () => {
  assert.equal(nextFocusId("nav-recordings","DOWN",rows),"stage-right");
  assert.equal(nextFocusId("stage-main","DOWN",rows),"action-recordings");
  assert.equal(nextFocusId("action-settings","DOWN",rows),"rail-search");
  assert.equal(nextFocusId("action-live","UP",rows),"stage-left");
});
