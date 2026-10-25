import test from "node:test";
import assert from "node:assert/strict";
import { nextFocusId } from "../app/src/navigation/premium-focus.js";

const rows = [
  ["nav-home","nav-live","nav-recordings","nav-search","nav-timers","nav-settings"],
  ["stage-left","stage-main","stage-right"],
  ["action-live","action-recordings","action-settings"],
  ["rail-recordings","rail-live","rail-search","rail-timers"]
];

test("S2.2 focus moves along rows, never wraps and clamps at edges", () => {
  assert.equal(nextFocusId("nav-home","LEFT",rows),"nav-home");
  assert.equal(nextFocusId("nav-home","RIGHT",rows),"nav-live");
  assert.equal(nextFocusId("nav-settings","RIGHT",rows),"nav-settings");
  assert.equal(nextFocusId("rail-timers","DOWN",rows),"rail-timers");
  assert.equal(nextFocusId("missing","DOWN",rows),"nav-home");
  assert.equal(nextFocusId("nav-home","UP",rows),"nav-home");
  assert.equal(nextFocusId("stage-right","RIGHT",rows),"stage-right");
  assert.equal(nextFocusId("nav-live","PAUSE",rows),"nav-live");
});

test("S2.2 first visit maps between differently sized rows", () => {
  assert.equal(nextFocusId("nav-recordings","DOWN",rows),"stage-right");
  assert.equal(nextFocusId("stage-main","DOWN",rows),"action-recordings");
  assert.equal(nextFocusId("action-settings","DOWN",rows),"rail-search");
  assert.equal(nextFocusId("action-live","UP",rows),"stage-left");
  assert.equal(nextFocusId("rail-timers","UP",rows),"action-settings");
});

test("S2.2 revisiting a row restores its previously focused tile", () => {
  assert.equal(nextFocusId("nav-home","DOWN",rows,{1:"stage-main"}),"stage-main");
  assert.equal(nextFocusId("stage-main","UP",rows,{0:"nav-search"}),"nav-search");
  assert.equal(nextFocusId("action-settings","DOWN",rows,{3:"rail-timers"}),"rail-timers");
  // Stale row memory must not move focus to a hidden or absent button.
  assert.equal(nextFocusId("action-live","DOWN",rows,{3:"detail-settings-home"}),"rail-recordings");
  assert.equal(nextFocusId("nav-live","DOWN",[rows[0],["detail-live-home"]],{1:"stage-main"}),"detail-live-home");
});

test("S2.2 missing and empty rows fail closed", () => {
  assert.equal(nextFocusId("x","DOWN",[]),null);
  assert.equal(nextFocusId("x","DOWN",[[]]),null);
  assert.equal(nextFocusId("x","DOWN",null),null);
  assert.equal(nextFocusId("nav-home","DOWN",[["nav-home"],[]]),"nav-home");
});
