import test from "node:test";
import assert from "node:assert/strict";
import {createPublicMediaMetadata,mediaMetadataError} from "../app/src/api/media-metadata.js";
const credential={base:"https://example.invalid/vdr-suite",
  credentialId:"cred-one",credentialSecret:"a_very_long_test_secret_123"};
const cid="S19.2E-1-1019-10301",rid="rec_0123456789abcdef0123456789abcdef";
const aid="fedcba9876543210fedcba9876543210",from=1791565200,until=1791651600;
function mock() {
  const calls=[];
  function XHR(){this.headers={};calls.push(this);}
  XHR.prototype.open=function(method,url){this.method=method;this.url=url;};
  XHR.prototype.setRequestHeader=function(k,v){this.headers[k]=v;};
  XHR.prototype.send=function(data){this.body=data;};
  XHR.prototype.abort=function(){this.aborted=true;};
  XHR.prototype.getResponseHeader=function(name){return this.mime;};
  function reply(index,status,data,mime){
    const x=calls[index];x.status=status;x.responseURL=x.url;
    x.mime=mime;x.responseText=JSON.stringify(data);
    if(x.responseType==="arraybuffer")x.response=data;
    x.onload();
  }
  return {calls,reply,env:{XMLHttpRequest:XHR}};
}
const event={channelId:cid,title:"Heute",subtitle:"Heute Abend",
  startTime:String(from),endTime:String(from+3600),durationSeconds:3600,eventId:"81234"};
const detail={backendId:"home",recordingId:rid,title:"Beispiel",
  recordedAt:"2026-10-20T20:15:00Z",description:"Description",durationSeconds:3600,
  durationKnown:true,sizeMb:2048,edited:false,
  metadata:{state:"available",source:"restfulapi-scraper-bridge",
    contentKind:"series-episode",subtitle:"Episode",seriesTitle:"Show",seasonNumber:3,
    episodeNumber:7,genreText:"Drama"}};

test("S6.4 Device EPG now-next is exactly scoped, cached GET and epg.view protected",()=>{
 const h=mock(),client=createPublicMediaMetadata(h.env);let out;
 client.nowNext(credential,"home",cid,from,r=>out=r);
 assert.equal(h.calls.length,1);
 const request=h.calls[0];
 assert.equal(request.url,credential.base+"/api/v1/epg/now-next?backendId=home&channelId="+cid+
   "&fromTime="+from+"&limit=2");
 assert.equal(request.method,"GET");
 assert.equal(request.headers.Authorization,"VDR-Suite-Device cred-one.a_very_long_test_secret_123");
 assert.equal(request.withCredentials,false);
 assert.equal(request.body,null);
 h.reply(0,200,{backendId:"home",channelId:cid,items:[event],page:{limit:2,hasMore:false},
   meta:{partial:false}});
 assert.equal(out.ok,true);assert.equal(out.value.items.length,1);
});

test("S6.4 EPG window pages use same exact interval and opaque cursor",()=>{
 const h=mock(),client=createPublicMediaMetadata(h.env);let out;
 client.epgWindow(credential,"home",cid,from,until,null,r=>out=r);
 assert.match(h.calls[0].url,/epg\/window\?/);
 assert.match(h.calls[0].url,/fromTime=1791565200&untilTime=1791651600&limit=24$/);
 h.reply(0,200,{backendId:"home",channelId:cid,items:[event],
   page:{limit:24,hasMore:true,nextCursor:"ew1_opaque_123"},meta:{partial:false}});
 assert.equal(out.ok,true);
 client.epgWindow(credential,"home",cid,from,until,out.value.page.nextCursor,r=>out=r);
 assert.match(h.calls[1].url,/cursor=ew1_opaque_123$/);
 h.reply(1,200,{backendId:"home",channelId:cid,items:[],
   page:{limit:24,hasMore:false,nextCursor:null},meta:{partial:false}});
 assert.equal(out.ok,true);
 assert.equal(out.value.page.hasMore,false);
 client.epgWindow(credential,"home",cid,from,until,"bad/path",r=>out=r);
 assert.equal(out.kind,"bad_request");
 assert.equal(h.calls.length,2);
});

test("S6.4 EPG errors and invalid cache rows are not mistaken for empty success",()=>{
 const h=mock(),client=createPublicMediaMetadata(h.env);let out;
 client.nowNext(credential,"home",cid,from,r=>out=r);
 h.reply(0,403,{code:"forbidden"});
 assert.match(mediaMetadataError(out),/epg.view/);
 client.nowNext(credential,"home",cid,from,r=>out=r);
 h.reply(1,200,{backendId:"home",channelId:cid,items:[{...event,channelId:"foreign"}],
   page:{limit:2,hasMore:false},meta:{partial:false}});
 assert.equal(out.kind,"response");
 client.epgWindow(credential,"home",cid,from,until,null,r=>out=r);
 h.reply(2,400,{code:"invalid_request"});
 assert.match(mediaMetadataError(out),/HTTP 400/);
});

test("S6.4 recording detail validates authorized public identity and metadata facts",()=>{
 const h=mock(),client=createPublicMediaMetadata(h.env);let out;
 client.recordingDetail(credential,"home",rid,r=>out=r);
 assert.equal(h.calls[0].url,credential.base+"/api/v1/recordings/"+rid+"?backendId=home");
 assert.equal(h.calls[0].method,"GET");
 h.reply(0,200,detail);
 assert.equal(out.ok,true);
 assert.equal(out.value.metadata.seasonNumber,3);
 client.recordingDetail(credential,"other",rid,r=>out=r);
 h.reply(1,200,detail);
 assert.equal(out.kind,"response");
 client.recordingDetail(credential,"home","/srv/recording",r=>out=r);
 assert.equal(out.kind,"bad_request");
 assert.equal(h.calls.length,2);
});

test("S6.4 artwork references never promote response url into an image fetch",()=>{
 const h=mock(),client=createPublicMediaMetadata(h.env);let out;
 client.artworkList(credential,"home",rid,r=>out=r);
 h.reply(0,200,{backendId:"home",recordingId:rid,items:[{
   artworkId:aid,kind:"poster",url:"https://evil.invalid/leak-secret",
   width:640,height:960
 }]});
 assert.equal(out.ok,true);
 client.artworkBytes(credential,"home",rid,out.value.items[0].artworkId,r=>out=r);
 assert.equal(h.calls[1].method,"GET");
 assert.equal(h.calls[1].responseType,"arraybuffer");
 assert.equal(h.calls[1].url,credential.base+"/api/v1/recordings/"+rid+
   "/artwork/"+aid+"?backendId=home");
 assert.doesNotMatch(h.calls[1].url,/evil|leak-secret/);
 h.reply(1,200,new Uint8Array([1,2,3]).buffer,"image/jpeg");
 assert.equal(out.ok,true);
 assert.equal(out.value.contentType,"image/jpeg");
 assert.equal(out.value.bytes.byteLength,3);
});

test("S6.4 image errors reject non-images, overlarge bytes and redirects",()=>{
 const h=mock(),client=createPublicMediaMetadata(h.env);let out;
 client.artworkBytes(credential,"home",rid,aid,r=>out=r);
 h.reply(0,200,new Uint8Array(2).buffer,"text/html");
 assert.equal(out.kind,"response");
 client.artworkBytes(credential,"home",rid,aid,r=>out=r);
 h.reply(1,200,new Uint8Array(2*1024*1024+1).buffer,"image/png");
 assert.equal(out.kind,"response");
 client.artworkBytes(credential,"home",rid,aid,r=>out=r);
 h.calls[2].status=200;h.calls[2].responseURL="https://evil.invalid";
 h.calls[2].response=new Uint8Array([1]).buffer;h.calls[2].mime="image/jpeg";
 h.calls[2].onload();
 assert.equal(out.kind,"response");
 assert.equal(h.calls.every(x=>x.method==="GET"),true);
});

test("S6.4 EPG, detail and artwork never use insecure origins or accept stale callbacks",()=>{
 const h=mock(),client=createPublicMediaMetadata(h.env);let count=0,out;
 client.nowNext({...credential,base:"http://untrusted.invalid"},"home",cid,from,r=>out=r);
 assert.equal(out.kind,"unavailable");assert.equal(h.calls.length,0);
 client.nowNext(credential,"home",cid,from,()=>count++);
 client.recordingDetail(credential,"home",rid,()=>count++);
 assert.equal(h.calls[0].aborted,true);
 h.reply(0,200,{backendId:"home",channelId:cid,items:[],page:{limit:2,hasMore:false},
   meta:{partial:false}});
 assert.equal(count,0);
 client.cancel();
 assert.equal(h.calls[1].aborted,true);
 h.reply(1,200,detail);
 assert.equal(count,0);
});

test("S6.6 EPG OK resolves native event details over protected Public v1",()=>{
  const h=mock(),client=createPublicMediaMetadata(h.env);let out;
  client.eventDetail(credential,"home",cid,"81234",r=>out=r);
  assert.equal(h.calls[0].method,"GET");
  assert.equal(h.calls[0].url,credential.base+
    "/api/v1/epg/event?backendId=home&channelId="+cid+"&eventId=81234");
  assert.equal(h.calls[0].headers.Authorization,
    "VDR-Suite-Device cred-one.a_very_long_test_secret_123");
  h.reply(0,200,{backendId:"home",channelId:cid,eventId:"81234",
    title:"Die Rosenheim-Cops",subtitle:"Frostiger Tod",
    description:"Echte Sendungsbeschreibung",startTime:String(from),
    endTime:String(from+3600),durationSeconds:3600});
  assert.equal(out.ok,true);
  assert.equal(out.value.description,"Echte Sendungsbeschreibung");
  client.eventDetail(credential,"other",cid,"81234",r=>out=r);
  h.reply(1,200,{backendId:"home",channelId:cid,eventId:"81234",
    title:"Nicht zugänglich",subtitle:"",description:"",startTime:String(from),
    endTime:String(from+3600),durationSeconds:3600});
  assert.equal(out.kind,"response","foreign backend detail is rejected");
  client.eventDetail(credential,"home",cid,"../../cookie",r=>out=r);
  assert.equal(out.kind,"bad_request");
  assert.equal(h.calls.length,2);
});

test("S6.7 EPG source event IDs accept backend-compatible colon syntax",()=>{
 const h=mock(),client=createPublicMediaMetadata(h.env);let out;
 const nativeId="native-event:1234";
 client.epgWindow(credential,"home",cid,from,until,null,r=>out=r);
 h.reply(0,200,{backendId:"home",channelId:cid,
   items:[{...event,eventId:nativeId}],
   page:{limit:24,hasMore:false,nextCursor:null},meta:{partial:false}});
 assert.equal(out.ok,true);
 assert.equal(out.value.items[0].eventId,nativeId);
 client.eventDetail(credential,"home",cid,nativeId,r=>out=r);
 assert.match(h.calls[1].url,/eventId=native-event:1234$/);
 assert.equal(new URL(h.calls[1].url).searchParams.get("eventId"),nativeId);
 h.reply(1,200,{backendId:"home",channelId:cid,eventId:nativeId,
   title:"Heute",subtitle:"",description:"Native Detailinformation",
   startTime:String(from),endTime:String(from+3600),durationSeconds:3600});
 assert.equal(out.ok,true);
 assert.equal(out.value.description,"Native Detailinformation");
});

test("S6.8 EPG artwork uses only bounded authenticated image bytes",()=>{
 const h=mock(),client=createPublicMediaMetadata(h.env);let out;
 client.epgPreferredArtwork(credential,"home",cid,"native-event:1234",r=>out=r);
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].method,"GET");
 assert.equal(h.calls[0].url,credential.base+
   "/api/v1/epg/preferred-artwork?backendId=home&channelId="+cid+
   "&eventId=native-event:1234");
 assert.equal(h.calls[0].headers.Authorization,
   "VDR-Suite-Device cred-one.a_very_long_test_secret_123");
 assert.equal(h.calls[0].responseType,"arraybuffer");
 assert.equal(h.calls[0].withCredentials,false);
 h.reply(0,200,new Uint8Array([1,2,3]).buffer,"image/png");
 assert.equal(out.ok,true);
 assert.equal(out.value.contentType,"image/png");
 client.epgDirectArtwork(credential,"home",cid,"81234",r=>out=r);
 assert.match(h.calls[1].url,/\/api\/v1\/epg\/artwork\?/);
 h.reply(1,404,{code:"not_found"});
 assert.equal(out.kind,"http");assert.equal(out.status,404);
 client.epgPreferredArtwork(credential,"home",cid,"../bad",r=>out=r);
 assert.equal(out.kind,"bad_request");
 assert.equal(h.calls.length,2);
});

test("S6.8 EPG poster GET refuses wrong image type, large body and redirects",()=>{
 const h=mock(),client=createPublicMediaMetadata(h.env);let out;
 client.epgPreferredArtwork(credential,"home",cid,"81234",r=>out=r);
 h.reply(0,200,new Uint8Array([1]).buffer,"text/html");
 assert.equal(out.kind,"response");
 client.epgPreferredArtwork(credential,"home",cid,"81234",r=>out=r);
 h.reply(1,200,new Uint8Array(2*1024*1024+1).buffer,"image/jpeg");
 assert.equal(out.kind,"response");
 client.epgPreferredArtwork(credential,"home",cid,"81234",r=>out=r);
 h.calls[2].status=200;h.calls[2].mime="image/jpeg";
 h.calls[2].responseURL="https://foreign.invalid/picture";
 h.calls[2].response=new Uint8Array([1]).buffer;h.calls[2].onload();
 assert.equal(out.kind,"response");
});
