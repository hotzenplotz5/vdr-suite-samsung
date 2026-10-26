import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {registerOptionalKeys} from "../app/src/platform/keys.js";
import {normalizeRemoteKey,playbackRemoteAction} from "../app/src/navigation/remote.js";

test("S6.15 Samsung remote maps every reported key class and preserves mandatory keys",()=>{
  const examples=[
    [48,"DIGIT_0"],[57,"DIGIT_9"],[427,"CHANNEL_UP"],[428,"CHANNEL_DOWN"],
    [10190,"PREVIOUS_CHANNEL"],[412,"REWIND"],[417,"FAST_FORWARD"],
    [457,"INFO"],[18,"SETTINGS"],[10135,"TOOLS"],[10200,"TELETEXT"],
    [403,"RED"],[406,"BLUE"],[13,"OK"],[10009,"BACK"]
  ];
  for(const [keyCode,normalized] of examples)
    assert.equal(normalizeRemoteKey({keyCode}),normalized);
  assert.equal(normalizeRemoteKey({key:"7",keyCode:0}),"DIGIT_7");
  assert.equal(normalizeRemoteKey({key:"MediaFastForward"}),"FAST_FORWARD");
  assert.equal(normalizeRemoteKey({key:"PreviousChannel"}),"PREVIOUS_CHANNEL");
  assert.equal(normalizeRemoteKey({keyCode:99999}),null);
  assert.equal(normalizeRemoteKey(null),null);
});

test("S6.15 Tizen registration covers digits, transport, channel, info and teletext",()=>{
  const attempts=[];
  const status=registerOptionalKeys({tizen:{tvinputdevice:{
    registerKey(name){attempts.push(name);}
  }}});
  for(const name of ["MediaRewind","MediaFastForward","ChannelUp","ChannelDown",
    "PreviousChannel","Info","Menu","Tools","Teletext","0","1","9"])
    assert(attempts.includes(name),name+" registration missing");
  for(const name of ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Enter","Back"])
    assert(!attempts.includes(name),name+" must not be registered");
  assert.equal(status.supported,true);
  assert.deepEqual(status.registered,attempts);
});

test("S6.15 unsupported or rejected Tizen keys are isolated, with no blanket failure",()=>{
  const calls=[];
  const status=registerOptionalKeys({tizen:{tvinputdevice:{
    getSupportedKeys(){return [{name:"ChannelUp",code:427},{name:"MediaRewind",code:412}];},
    registerKey(name){calls.push(name);if(name==="MediaRewind")throw Error("SecurityError");}
  }}});
  assert.deepEqual(calls,["MediaRewind","ChannelUp"]);
  assert.deepEqual(status.registered,["ChannelUp"]);
  assert.deepEqual(status.failed,["MediaRewind"]);
  assert(status.unavailable.includes("Teletext"));
  assert.equal(registerOptionalKeys({}).supported,false);
});

test("S6.15 rewind/forward are recognized without unsafe player seeking",()=>{
  assert.equal(playbackRemoteAction("REWIND"),"rewind");
  assert.equal(playbackRemoteAction("FAST_FORWARD"),"fastforward");
  assert.equal(playbackRemoteAction("STOP"),"stop");
  assert.equal(playbackRemoteAction("OK"),"toggle");
  const main=readFileSync("app/src/main.js","utf8");
  assert.match(main,/Spulen noch nicht freigeschaltet/);
  assert.match(main,/remoteChannelDigits/);
  assert.match(main,/CHANNEL_UP/);
});
