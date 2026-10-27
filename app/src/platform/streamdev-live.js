// Samsung DEV-only direct Live-TV via local VDR streamdev-server MPEG-TS.
// Explicit user-configured host, one selected Public-v1 VDR channel ID, native AVPlay.
// No API-v1 MediaSession, no cookies, no URL tokens and no background autoplay.
// Only used after a conscious user action. Does not change the protected API-v1 player.
export function parseStreamdevBase(input) {
  if (typeof input!=="string" || input.length>180) return null;
  var value=input.trim().replace(/\/$/,"");
  var match=/^http:\/\/([^\/:?#@]+):(\d{1,5})$/.exec(value);
  if (!match) return null;
  var host=match[1].toLowerCase(),port=Number(match[2]);
  if (port<1 || port>65535) return null;
  // Direct-stream trial is limited to an explicitly configured local endpoint.
  // Do not accidentally turn the TV into a client for arbitrary external URLs.
  var ipv4=/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  var local=false;
  if (ipv4) {
    var n=ipv4.slice(1).map(Number);
    local=n.every(function(x){return x>=0&&x<=255;}) &&
      (n[0]===10 || (n[0]===172 && n[1]>=16 && n[1]<=31) ||
       (n[0]===192 && n[1]===168));
  } else local=/^[a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63})*\.local$/.test(host);
  return local ? "http://"+host+":"+port : null;
}
export function streamdevChannelUrl(base,channelId) {
  var url=parseStreamdevBase(base);
  if (!url || typeof channelId!=="string" ||
      !/^[A-Za-z0-9._-]{1,128}$/.test(channelId))
    return null;
  return url+"/TS/"+encodeURIComponent(channelId);
}
export function createStreamdevLivePlayer(environment) {
  var api=environment&&environment.webapis&&environment.webapis.avplay;
  var generation=0,active=false,busy=false,opened=false,paused=false;
  function available() {
    return !!(api&&typeof api.open==="function"&&
      typeof api.prepareAsync==="function"&&typeof api.play==="function"&&
      typeof api.stop==="function"&&typeof api.close==="function");
  }
  function stop() {
    generation++;active=false;busy=false;paused=false;
    // NEVER close a player that was never opened by this adapter.
    // The Recording adapter shares the singleton native AVPlay instance.
    if (!opened) return;
    opened=false;
    try{api.stop();}catch(_){}
    try{api.close();}catch(_){}
  }
  function start(base,channelId,onState) {
    var url=streamdevChannelUrl(base,channelId);
    if(!available()||!url||typeof onState!=="function"){
      if(typeof onState==="function")onState("unsupported",{stage:"input"});
      return false;
    }
    if(busy||active)return false;
    busy=true;
    var token=++generation;
    try {
      api.open(url);
      opened=true;
      if(typeof api.setDisplayRect==="function")
        api.setDisplayRect(0,0,1920,1080);
      if(typeof api.setDisplayMethod==="function")
        try{api.setDisplayMethod("PLAYER_DISPLAY_MODE_LETTER_BOX");}catch(_){}
      if(typeof api.setListener==="function")
        api.setListener({
          onbufferingstart:function(){if(token===generation)onState("buffering");},
          onbufferingcomplete:function(){if(token===generation)onState("ready");},
          onstreamcompleted:function(){
            if(token!==generation)return;
            // A continuous TS stream ending means provider/connection EOF.
            stop();onState("ended");
          },
          onerror:function(){
            if(token!==generation)return;
            stop();onState("error",{stage:"stream"});
          }
        });
      api.prepareAsync(function(){
        if(token!==generation)return;
        try {
          api.play();busy=false;active=true;paused=false;
          onState("playing");
        } catch(_) {
          stop();onState("error",{stage:"play"});
        }
      },function(){
        if(token!==generation)return;
        stop();onState("error",{stage:"prepare"});
      });
      onState("preparing");
      return true;
    } catch(_) {
      stop();onState("error",{stage:"open"});
      return false;
    }
  }
  function pauseOrResume(action) {
    if(!active)return "unavailable";
    // Pausing an unbounded real-time broadcast can create an unbounded gap
    // in the decoder. First reliability slice supports STOP, not time shift.
    return "live_no_pause";
  }
  return {available:available,start:start,stop:stop,pauseOrResume:pauseOrResume,
    isBusy:function(){return busy;},isActive:function(){return active;}};
}
