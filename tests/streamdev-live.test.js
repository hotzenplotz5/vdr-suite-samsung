import test from "node:test";
import assert from "node:assert/strict";
import {parseStreamdevBase,streamdevChannelUrl,createStreamdevLivePlayer}
  from "../app/src/platform/streamdev-live.js";

test("S8.3 Streamdev only accepts explicit LAN server base and native VDR channel identity",()=>{
  assert.equal(parseStreamdevBase("http://192.168.178.20:3000/"),"http://192.168.178.20:3000");
  assert.equal(parseStreamdevBase("http://10.0.1.4:3000"),"http://10.0.1.4:3000");
  assert.equal(parseStreamdevBase("http://172.20.1.4:3000"),"http://172.20.1.4:3000");
  assert.equal(parseStreamdevBase("http://vdr.local:3000"),"http://vdr.local:3000");
  for(const url of ["https://192.168.1.9:3000","http://8.8.8.8:3000",
    "http://192.168.1.9:3000/TS/1","http://user:pass@192.168.1.9:3000",
    "http://192.168.1.9:3000?key=secret","http://192.168.1.9:70000",
    "http://192.168.1.9:3000#frag","http://172.32.0.1:3000"])
    assert.equal(parseStreamdevBase(url),null,url);
  assert.equal(streamdevChannelUrl("http://192.168.178.20:3000","S19.2E-1-1019-10301"),
    "http://192.168.178.20:3000/TS/S19.2E-1-1019-10301");
  assert.equal(streamdevChannelUrl("http://192.168.178.20:3000","../foo"),null);
  assert.equal(streamdevChannelUrl("http://192.168.178.20:3000",""),null);
});
function fixture(){
  const calls=[],api={
    open(url){calls.push(["open",url]);},
    setDisplayRect(...args){calls.push(["rect",...args]);},
    setDisplayMethod(x){calls.push(["display",x]);},
    setListener(listener){this.listener=listener;},
    prepareAsync(ok,fail){this.ok=ok;this.fail=fail;calls.push(["prepare"]);},
    play(){calls.push(["play"]);},
    stop(){calls.push(["stop"]);},
    close(){calls.push(["close"]);},
    setStreamingProperty(...args){calls.push(["cookie",...args]);}
  };
  return {api,calls,player:createStreamdevLivePlayer({webapis:{avplay:api}})};
}
test("S8.3 native AVPlay starts direct MPEG-TS without HTML5, cookies, or MediaSession",()=>{
  const h=fixture(),events=[];
  assert.equal(h.player.available(),true);
  assert.equal(h.player.start("http://vdr.local:3000","S19.2E-1-10-20",
    state=>events.push(state)),true);
  assert.equal(h.calls[0][0],"open");
  assert.equal(h.calls[0][1],"http://vdr.local:3000/TS/S19.2E-1-10-20");
  assert.equal(h.calls.filter(x=>x[0]==="prepare").length,1);
  assert.equal(h.player.isBusy(),true);
  assert.equal(h.player.start("http://vdr.local:3000","S19.2E-1-10-20",()=>{}),false);
  h.api.ok();
  assert.equal(h.player.isActive(),true);
  assert.deepEqual(events,["preparing","playing"]);
  assert.equal(h.calls.filter(x=>x[0]==="cookie").length,0);
  assert.equal(h.player.pauseOrResume("toggle"),"live_no_pause");
  h.player.stop();
  assert.equal(h.player.isActive(),false);
  assert.deepEqual(h.calls.slice(-2).map(x=>x[0]),["stop","close"]);
  const total=h.calls.length;
  h.api.listener.onstreamcompleted();
  assert.equal(h.calls.length,total,"old callback may not reopen/close shared AVPlay");
});
test("S8.3 late AVPlay prepare after STOP cannot play or revive a stream",()=>{
  const h=fixture(),events=[];
  h.player.start("http://192.168.0.2:3000","S19.2E-1-10-20",s=>events.push(s));
  const late=h.api.ok;
  h.player.stop();
  late();
  assert.equal(h.calls.filter(x=>x[0]==="play").length,0);
  assert.equal(h.player.isActive(),false);
});
test("S8.3 EOF and prepare failure close exactly once with no blind reconnection",()=>{
  for(const failure of ["eof","prepare"]){
    const h=fixture(),events=[];
    h.player.start("http://192.168.0.2:3000","S19.2E-1-10-20",s=>events.push(s));
    if(failure==="eof")h.api.listener.onstreamcompleted();
    else h.api.fail({name:"InvalidAccessError"});
    assert.equal(h.calls.filter(x=>x[0]==="close").length,1);
    assert.equal(h.calls.filter(x=>x[0]==="open").length,1);
    assert.equal(h.player.isBusy(),false);
    assert.match(events[events.length-1],/^(ended|error)$/);
  }
});
test("S8.3 absent native player refuses to claim playback",()=>{
  const player=createStreamdevLivePlayer({webapis:{avplay:{}}});
  let value;
  assert.equal(player.start("http://192.168.0.2:3000","S19.2E-1-10-20",
    state=>{value=state;}),false);
  assert.equal(value,"unsupported");
});
