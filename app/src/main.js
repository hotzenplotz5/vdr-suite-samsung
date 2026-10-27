import { normalizeRemoteKey, playbackRemoteAction } from "./navigation/remote.js";
import { nextFocusId } from "./navigation/premium-focus.js";
import { getPlatformCapabilities } from "./platform/capabilities.js";
import { registerOptionalKeys } from "./platform/keys.js";
import { createStartupVideo } from "./platform/startup-video.js";
import { nextPreviewState, getViewPresentation } from "./views/view-state.js";
import { devicePairingStatus } from "./views/device-auth-status.js";
import { normalizeSuiteBase, createDiscoveryClient, classifyDiscoveryError } from "./api/public-discovery.js";
import { createPairingClient, pairingError, deviceVerificationError } from "./api/device-pairing.js";
import { createDeviceVault } from "./platform/device-vault.js";
import { restoreVerifiedSessionCredential } from "./platform/device-recovery.js";
import { createChannelCatalog, channelCatalogError } from "./api/channel-catalog.js";
import { createRecordingCatalog, recordingCatalogError } from "./api/recording-catalog.js";
import { createHomeContinueWatching, homeContinueError } from "./api/home-continue.js";
import { createNativeTimerCatalog, nativeTimerCatalogError } from "./api/native-timers.js";
import { createSearchTimerCatalog, searchTimerCatalogError } from "./api/search-timers.js";
import { createPublicGlobalSearch, publicGlobalSearchError } from "./api/global-search.js";
import { createPublicMediaMetadata, mediaMetadataError } from "./api/media-metadata.js";
import { createRecordingPlaybackClient, recordingPlaybackError } from "./api/recording-playback.js";
import { createLivePlaybackClient, livePlaybackError } from "./api/live-playback.js";
import { probeMediaHttpHeaders, describeMediaAccessProbe } from "./api/media-access-probe.js";
import { createSamsungRecordingPlayer, conservativeSamsungCapabilities, samsungAacHlsTsCapabilities, samsungPlaybackDiagnosis, describeSamsungAudio, samsungTvSoundStatus } from "./platform/recording-player.js";
import { createHtml5RecordingPlayer, html5PlaybackDiagnosis } from "./platform/html5-recording-player.js";

// Every control is in exactly one row per visible route. Navigation never
// uses hidden DOM items or relies on pixel positions (Tizen 5.5 safe).
const NAV_ROW = [
  "nav-home", "nav-live", "nav-recordings", "nav-search", "nav-timers", "nav-settings"
];
const ROUTES = ["home", "live", "recordings", "search", "timers", "settings"];
const PREVIEW_ROUTES = ["live", "recordings", "search", "timers"];

function boot() {
  var items = Array.prototype.slice.call(document.querySelectorAll(".tv-focusable"));
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-panel]"));
  var menu = Array.prototype.slice.call(document.querySelectorAll(".menu-item"));
  var controls = {};
  var currentView = "home";
  var focusedId = "nav-home";
  var lastHomeFocus = "nav-home";
  var history = [];
  var rowMemory = {};
  var previewStates = {};
  var editingServerAddress = false;
  var remoteChannelDigits = "";
  var remoteLastDigitAt = 0;
  var testingConnection = false;
  var discovery = createDiscoveryClient(window);
  var pairingClient = createPairingClient(window);
  var vault = createDeviceVault(window);
  var channelCatalog = createChannelCatalog(window);
  var recordingCatalog = createRecordingCatalog(window);
  var homePairing = createPairingClient(window);
  var homeBackendCatalog = createChannelCatalog(window);
  var homeRecordingCatalog = createRecordingCatalog(window);
  var homeResume = createHomeContinueWatching(window);
  var homeTimerCatalog = createNativeTimerCatalog(window);
  var homeChannelCatalog = createChannelCatalog(window);
  var homeEpgMetadata = createPublicMediaMetadata(window);
  var homeFeatureMetadata = createPublicMediaMetadata(window);
  var homeFeatureArtwork = createPublicMediaMetadata(window);
  var homeContinueMetadata = [
    createPublicMediaMetadata(window),
    createPublicMediaMetadata(window),
    createPublicMediaMetadata(window)
  ];
  var homeRun = 0;
  var homeFeatureRun = 0;
  var homeCredential = null;
  var homeBackendId = null;
  var homeFeatureKind = "recordings";
  var homeFeaturePriority = 0;
  var homeArtworkUrl = null;
  var homeCardArtworkClients = [];
  var homeCardDetailClients = [];
  var homeCardUrls = [];
  var homeEpgReaders = [];
  var homeCardIds = {continue:[],recordings:[],epg:[]};
  var homeCardItems = {continue:[],recordings:[],epg:[]};
  var homeFeaturePoster = document.getElementById("home-feature-poster");
  var globalSearchClient = createPublicGlobalSearch(window);
  var globalSearchMetadata = createPublicMediaMetadata(window);
  var globalSearchCatalog = createChannelCatalog(window);
  var globalSearchPairing = createPairingClient(window);
  var globalSearchCredential = null;
  var globalSearchBackends = [];
  var globalSearchBackendIndex = 0;
  var globalSearchRun = 0;
  var globalSearchDetailRun = 0;
  var globalSearchBusy = false;
  var globalSearchEditing = false;
  var globalSearchTerm = "";
  var globalSearchPages = {epg:null,recordings:null};
  var globalSearchRows = {epg:[],recordings:[]};
  var globalSearchItems = {epg:[],recordings:[]};
  var globalSearchInput = document.getElementById("global-search-input");
  var globalSearchBackendLabel = document.getElementById("global-search-backend-name");
  var globalSearchStatusLabel = document.getElementById("global-search-status");
  var globalSearchDetailTitle = document.getElementById("global-search-detail-title");
  var globalSearchDetailDescription = document.getElementById("global-search-detail-description");
  var nativeTimerCatalog = createNativeTimerCatalog(window);
  var searchTimerCatalog = createSearchTimerCatalog(window);
  var searchTimerBackendCatalog = createChannelCatalog(window);
  var searchTimerPairing = createPairingClient(window);
  var searchTimerCredential = null;
  var searchTimerBackends = [];
  var searchTimerBackendIndex = 0;
  var searchTimerCursor = null;
  var searchTimerBusy = false;
  var searchTimerRun = 0;
  var searchTimerSelectionRun = 0;
  var searchTimerRows = [];
  var searchTimerItems = [];
  var selectedSearchTimer = null;
  var searchTimerList = document.getElementById("searchtimer-list");
  var searchTimerBackendLabel = document.getElementById("searchtimer-backend");
  var searchTimerStatusLabel = document.getElementById("searchtimer-status");
  var searchTimerDetailTitle = document.getElementById("searchtimer-detail-title");
  var searchTimerDetailInfo = document.getElementById("searchtimer-detail-info");
  var searchTimerPreviewStatus = document.getElementById("searchtimer-preview-status");
  var searchTimerPreviewList = document.getElementById("searchtimer-preview-list");
  var nativeTimerCredential = null;
  var nativeTimerBackends = [];
  var nativeTimerBackendIndex = 0;
  var nativeTimerRun = 0;
  var nativeTimerBusy = false;
  var nativeTimerNextOffset = null;
  var nativeTimerRows = [];
  var nativeTimerItems = [];
  var nativeTimerList = document.getElementById("native-timer-list");
  var nativeTimerBackendName = document.getElementById("native-timer-backend-name");
  var liveMetadata = createPublicMediaMetadata(window);
  var liveDetailMetadata = createPublicMediaMetadata(window);
  var liveArtworkMetadata = createPublicMediaMetadata(window);
  var liveEpgArtworkUrl = null;
  var recordingMetadata = createPublicMediaMetadata(window);
  var recordingPlaybackClient = createRecordingPlaybackClient(window);
  var recordingPlayer = createSamsungRecordingPlayer(window);
  var recordingSelected = null;
  var recordingDetailRun = 0;
  var recordingPosterUrl = null;
  var recordingPlayBusy = false;
  // Invalidate deferred read-only AVPlay key latency probes after changes.
  var recordingControlSequence = 0;
  var recordingTeardownBusy = false;
  var recordingPlaybackSession = null;
  var recordingPlayerSurface = document.getElementById("recording-player-surface");
  var recordingHtml5Video = document.getElementById("recording-html5-video");
  var recordingAvplayObject = document.getElementById("recording-avplay-object");
  var recordingRemoteHint = document.getElementById("recording-remote-hint");
  var recordingAudioHint = document.getElementById("recording-audio-hint");
  var recordingLifecycleHint = document.getElementById("recording-lifecycle-hint");
  var recordingHtml5Player = createHtml5RecordingPlayer(recordingHtml5Video,window);
  var recordingPlayerMode = "avplay";
  // Samsung native AVPlay requires a viewport-level object, not one clipped by
  // .detail-page / .recording-catalog scrolling containers.
  if (recordingPlayerSurface && document.body)
    document.body.appendChild(recordingPlayerSurface);
  var recordingCredential = null;
  var recordingBackends = [];
  var recordingBackendIndex = 0;
  var recordingCursors = [null];
  var recordingPageIndex = 0;
  var recordingNextCursor = null;
  var recordingMode = "folders";
  var recordingFolderId = null;
  var recordingFolderName = "VDR";
  var recordingFolderStack = [];
  var recordingFolderOffset = 0;
  var recordingFolderHasMore = false;
  var recordingFocusIds = [];
  var recordingCurrentPageItems = [];
  var recordingBusy = false;
  var recordingRun = 0;
  var liveCredential = null;
  var livePlaybackClient = createLivePlaybackClient(window);
  var liveHtml5Video = document.getElementById("live-html5-video");
  var livePlayerSurface = document.getElementById("live-player-surface");
  var livePlayerHint = document.getElementById("live-player-hint");
  var liveHtml5Player = createHtml5RecordingPlayer(liveHtml5Video,window,"live-channel");
  var livePlaybackSession = null;
  var livePlayBusy = false;
  var liveTeardownBusy = false;
  var livePlayRun = 0;
  if (livePlayerSurface && document.body)
    document.body.appendChild(livePlayerSurface);
  var liveBackends = [];
  var liveBackendIndex = 0;
  var liveCursor = null;
  var liveBusy = false;
  var liveRun = 0;
  var liveRows = 0;
  var liveFocusIds = [];
  var liveEpgFocusIds = [];
  var liveEpgRows = [];
  var liveEpgDetailRun = 0;
  var liveCurrentChannels = [];
  var selectedLiveChannel = null;
  var liveEpgRun = 0;
  var liveWindow = null;
  var pairingRequest = null;
  var pairingBase = null;
  var pairingApproved = false;
  var issueAttempted = false;
  var pairingBusy = false;
  var pendingCredential = null;
  var pairedCredential = null;
  // Volatile session proof, never cached across restarts or written to storage.
  var lastVerifiedDevice = null;
  // A local KeyManager entry is not proof of server-side Device authorization.
  var rejectedCredentialId = null;
  var resetConfirmationId = null;
  var discoveredBase = null;
  var pairingResult = document.getElementById("pairing-result");
  var pairingCode = document.getElementById("pairing-user-code");
  var liveList = document.getElementById("live-channel-list");
  var liveBackendName = document.getElementById("live-backend-name");
  var liveEpgStatus = document.getElementById("live-epg-status");
  var liveEpgList = document.getElementById("live-epg-list");
  var liveEpgDetail = document.getElementById("live-epg-detail");
  var liveEpgScrollActions = document.getElementById("live-epg-scroll-actions");
  var liveEpgDetailTime = document.getElementById("live-epg-detail-time");
  var liveEpgDetailTitle = document.getElementById("live-epg-detail-title");
  var liveEpgDetailSubtitle = document.getElementById("live-epg-detail-subtitle");
  var liveEpgDetailDescription = document.getElementById("live-epg-detail-description");
  var liveEpgPoster = document.getElementById("live-epg-detail-poster");
  var liveEpgArtworkStatus = document.getElementById("live-epg-artwork-status");
  var recordingList = document.getElementById("recording-list");
  var recordingBackendName = document.getElementById("recording-backend-name");
  var recordingDetailInfo = document.getElementById("recording-detail-info");
  var recordingPoster = document.getElementById("recording-detail-poster");
  var serverInput = document.getElementById("suite-base-input");
  var serverTest = document.getElementById("settings-test-button");
  var connectionResult = document.getElementById("suite-connection-result");
  var homeServerState = document.getElementById("home-server-state");
  var topbarServerState = document.getElementById("topbar-server-status");
  var homeContentStatus = document.getElementById("home-content-status");
  var homeFeatureKicker = document.getElementById("home-feature-kicker");
  var homeFeatureTitle = document.getElementById("home-feature-title");
  var homeFeatureDescription = document.getElementById("home-feature-description");
  var homeFeatureMeta = document.getElementById("home-feature-meta");
  var homeTimerSummary = document.getElementById("home-timer-summary");
  var message = document.getElementById("message");
  var keyStatus = document.getElementById("key-status");
  // The visible label comes from the packaged runtime, never from Git, a
  // network request, localStorage or a developer-controlled TV setting.
  var buildText = VDR_SUITE_BUILD_IDENTITY.label;
  var buildFooter = document.getElementById("app-build-version");
  var buildSettings = document.getElementById("settings-app-build-version");
  if (buildFooter) buildFooter.textContent = buildText;
  if (buildSettings) buildSettings.textContent = buildText;

  items.forEach(function (item) {
    var id = item.getAttribute("data-focus-id");
    if (id) controls[id] = item;
  });

  function focusRows() {
    if (currentView === "home") {
      var homeRows=[NAV_ROW,["home-refresh"],["home-feature","home-timer-open"]];
      ["continue","recordings","epg"].forEach(function(kind){
        if(homeCardIds[kind].length)homeRows.push(homeCardIds[kind].slice());
      });
      return homeRows;
    }
    if (currentView === "live") {
      var liveFocusRows = [NAV_ROW,
        ["detail-live-home", "detail-live-preview", "detail-live-more", "detail-live-backend",
       "detail-live-play", "detail-live-epg-now", "detail-live-epg-window", "detail-live-epg-more"]];
      var count=Math.max(liveFocusIds.length,liveEpgFocusIds.length);
      for (var i=0;i<count;i++) {
        var cells=[];
        if (liveFocusIds[i]) cells.push(liveFocusIds[i]);
        if (liveEpgFocusIds[i]) cells.push(liveEpgFocusIds[i]);
        if (cells.length) liveFocusRows.push(cells);
      }
      if (liveEpgScrollActions && !liveEpgScrollActions.hidden)
        liveFocusRows.push(["live-epg-scroll-up","live-epg-scroll-down"]);
      return liveFocusRows;
    }
    if (currentView === "recordings") {
      var rows = [NAV_ROW,
        ["detail-recordings-home", "detail-recordings-load",
         "detail-recordings-backend", "detail-recordings-up",
         "detail-recordings-all", "detail-recordings-play",
         "detail-recordings-html5", "detail-recordings-aac-hls",
         "detail-recordings-previous"]];
      recordingFocusIds.forEach(function (id) { rows.push([id]); });
      rows.push(["detail-recordings-next"]);
      return rows;
    }
    if (currentView === "search") {
      var searchRows=[NAV_ROW,
        ["global-search-input","global-search-go","global-search-clear",
          "global-search-backend"],
        ["global-search-recording-more","global-search-epg-more"]];
      var count=Math.max(globalSearchRows.recordings.length,globalSearchRows.epg.length);
      for(var n=0;n<count;n++){
        var group=[];
        if(globalSearchRows.recordings[n])group.push(globalSearchRows.recordings[n]);
        if(globalSearchRows.epg[n])group.push(globalSearchRows.epg[n]);
        if(group.length)searchRows.push(group);
      }
      searchRows.push(["detail-search-home","detail-search-preview"]);
      return searchRows;
    }
    if (currentView === "timers") {
      var timerRows=[NAV_ROW,["detail-timers-home","detail-timers-load",
        "detail-timers-more","detail-timers-backend","detail-timers-preview"]];
      nativeTimerRows.forEach(function(id){timerRows.push([id]);});
      timerRows.push(["searchtimer-load","searchtimer-more",
        "searchtimer-backend-change","searchtimer-preview"]);
      searchTimerRows.forEach(function(id){timerRows.push([id]);});
      return timerRows;
    }
    if (currentView === "settings") return [
      NAV_ROW,
      ["detail-settings-home", "settings-base-input", "settings-test"],
      ["settings-pair-start", "settings-pair-check", "settings-pair-activate",
       "settings-pair-verify", "settings-pair-retry"],
      ["settings-pair-clear"]
    ];
    return [NAV_ROW, PREVIEW_ROUTES.indexOf(currentView) >= 0
      ? ["detail-" + currentView + "-home", "detail-" + currentView + "-preview"]
      : ["detail-" + currentView + "-home"]];
  }


  // S8.1: Home composes existing backend-owned domains. No synthetic
  // "recently recorded" ordering and no invented resume positions.
  function homeMessage(id,message) {
    var node=document.getElementById(id);
    if(node)node.textContent=message;
  }
  function homeAlive(token){
    return token===homeRun && currentView==="home";
  }
  function homeClearArtwork(){
    if(homeFeaturePoster){
      homeFeaturePoster.hidden=true;
      homeFeaturePoster.onerror=null;
      homeFeaturePoster.onload=null;
      homeFeaturePoster.removeAttribute("src");
    }
    if(homeArtworkUrl && window.URL &&
        typeof window.URL.revokeObjectURL==="function")
      window.URL.revokeObjectURL(homeArtworkUrl);
    homeArtworkUrl=null;
  }
  function homeCancelReads(){
    ++homeRun;++homeFeatureRun;
    homePairing.cancel();homeBackendCatalog.cancel();
    homeRecordingCatalog.cancel();homeResume.cancel();
    homeTimerCatalog.cancel();homeChannelCatalog.cancel();
    homeEpgMetadata.cancel();homeFeatureMetadata.cancel();
    homeFeatureArtwork.cancel();
    homeContinueMetadata.forEach(function(client){client.cancel();});
    homeCardArtworkClients.forEach(function(client){client.cancel();});
    homeCardDetailClients.forEach(function(client){client.cancel();});
    homeEpgReaders.forEach(function(client){client.cancel();});
    homeCardArtworkClients=[];homeCardDetailClients=[];homeEpgReaders=[];
    homeCardUrls.forEach(function(url){
      if(window.URL && typeof window.URL.revokeObjectURL==="function")
        window.URL.revokeObjectURL(url);
    });
    homeCardUrls=[];
    homeClearArtwork();
  }
  function homeClearCards(){
    // Always leave the focused dynamic rail before removing its DOM node.
    if((homeCardIds.continue.concat(homeCardIds.recordings,homeCardIds.epg))
        .indexOf(focusedId)>=0) setFocus("home-refresh");
    ["continue","recordings","epg"].forEach(function(kind){
      homeCardIds[kind].forEach(function(id){
        var node=controls[id];delete controls[id];
        var i=items.indexOf(node);if(i!==-1)items.splice(i,1);
      });
      homeCardIds[kind]=[];homeCardItems[kind]=[];
      var list=document.getElementById("home-"+kind+"-list");
      if(list)list.textContent="";
    });
    homeFeaturePriority=0;homeFeatureKind="recordings";
    homeClearArtwork();
    if(homeFeatureKicker)homeFeatureKicker.textContent="DEINE MEDIATHEK";
    if(homeFeatureTitle)homeFeatureTitle.textContent="Fernsehen neu erleben.";
    if(homeFeatureDescription)homeFeatureDescription.textContent=
      "Echte Sendungen, Aufnahmen und dein Wiedergabeverlauf – direkt von VDR-Suite.";
    if(homeFeatureMeta)homeFeatureMeta.textContent="Inhalte werden geladen …";
    if(homeTimerSummary)homeTimerSummary.textContent="Timerstatus wird gelesen …";
  }
  function homeCard(kind,item,label,meta,progress){
    var list=document.getElementById("home-"+kind+"-list");
    if(!list)return null;
    var idx=homeCardItems[kind].length,id="home-"+kind+"-row-"+idx;
    var node=document.createElement("button");
    node.type="button";
    node.className="home-media-card tv-focusable";
    node.setAttribute("data-focus-id",id);
    node.setAttribute("data-home-kind",kind);
    node.setAttribute("data-home-index",String(idx));
    node.setAttribute("aria-label",label);
    var art=document.createElement("img");art.className="home-card-art";
    art.alt="";art.hidden=true;
    var title=document.createElement("strong");title.textContent=label;
    var info=document.createElement("small");info.textContent=meta;
    node.appendChild(art);node.appendChild(title);node.appendChild(info);
    if(typeof progress==="number" && progress>0 && progress<100) {
      var bar=document.createElement("span");bar.className="home-card-progress";
      var value=document.createElement("span");
      value.style.width=Math.min(99,Math.max(1,Math.round(progress)))+"%";
      bar.appendChild(value);node.appendChild(bar);
    }
    list.appendChild(node);
    homeCardIds[kind].push(id);homeCardItems[kind].push(item);
    items.push(node);controls[id]=node;
    node.addEventListener("click",function(){if(setFocus(id))activate(node);});
    return {node:node,title:title,info:info,art:art};
  }
  function homeMetadataText(row,fallback) {
    var m=row && row.metadata || {},parts=[];
    if(m.genreText)parts.push(m.genreText.split("[").join("").split("]").join("").split("|").join(" · "));
    if(Number.isInteger(m.seasonNumber) && Number.isInteger(m.episodeNumber))
      parts.push("S"+m.seasonNumber+" E"+m.episodeNumber);
    else if(m.episodeTitle)parts.push(m.episodeTitle);
    if(row && row.durationKnown && Number.isInteger(row.durationSeconds) &&
       row.durationSeconds>0)parts.push(Math.ceil(row.durationSeconds/60)+" Min.");
    if(!parts.length && fallback)parts.push(fallback);
    return parts.join(" · ");
  }
  function homeAttachCardArt(credential,backendId,kind,row,card,token) {
    if(!card || !card.art)return;
    var client=createPublicMediaMetadata(window);
    homeCardArtworkClients.push(client);
    function alive(){
      return homeAlive(token) && homeBackendId===backendId &&
        card.node===controls[card.node.getAttribute("data-focus-id")];
    }
    function loaded(result) {
      if(!alive() || !result.ok || !window.URL ||
         typeof window.URL.createObjectURL!=="function" ||
         typeof window.Blob!=="function")return;
      var url;
      try{url=window.URL.createObjectURL(new window.Blob(
        [result.value.bytes],{type:result.value.contentType}));}catch(_){return;}
      if(!alive()){
        if(typeof window.URL.revokeObjectURL==="function")window.URL.revokeObjectURL(url);
        return;
      }
      homeCardUrls.push(url);
      card.art.onerror=function(){
        card.art.hidden=true;card.art.removeAttribute("src");
        if(typeof window.URL.revokeObjectURL==="function")window.URL.revokeObjectURL(url);
        var at=homeCardUrls.indexOf(url);if(at!==-1)homeCardUrls.splice(at,1);
      };
      card.art.src=url;card.art.hidden=false;
    }
    if(kind==="epg"){
      if(row.event && row.event.eventId)
        client.epgPreferredArtwork(credential,backendId,row.channel.channelId,
          row.event.eventId,loaded);
      return;
    }
    if(!/^rec_[0-9a-f]{32}$/.test(row.recordingId))return;
    client.artworkList(credential,backendId,row.recordingId,function(list){
      if(!alive() || !list.ok)return;
      var art=list.value.items.filter(function(x){return x.kind==="poster";})[0] ||
        list.value.items.filter(function(x){return x.kind==="fanart";})[0];
      if(art)client.artworkBytes(credential,backendId,
        row.recordingId,art.artworkId,loaded);
    });
  }
  function homeFeatureShow(row,kind,priority,subtitle) {
    if(!row || priority<homeFeaturePriority)return;
    homeFeaturePriority=priority;homeFeatureKind=kind;
    if(homeFeatureKicker)homeFeatureKicker.textContent=kind==="epg" ?
      "JETZT IM TV" : priority>=3 ? "WEITERSEHEN" : "AUS DEINER MEDIATHEK";
    if(homeFeatureTitle)homeFeatureTitle.textContent=row.title || "Unbenannt";
    if(homeFeatureDescription)homeFeatureDescription.textContent=
      (row.metadata && (row.metadata.overview || row.metadata.tagline)) ||
      row.description || row.subtitle || subtitle ||
      "Keine ausführliche Beschreibung verfügbar.";
    if(homeFeatureMeta)homeFeatureMeta.textContent=subtitle || "";
    homeClearArtwork();
    homeFeatureArtwork.cancel();
    // Images are fetched only through the authenticated public binary API.
    if(!homeCredential || !homeBackendId)return;
    var ticket=++homeFeatureRun,token=homeRun;
    if(kind==="epg"){
      if(!row.eventId || !row.channelId)return;
      homeFeatureArtwork.epgPreferredArtwork(homeCredential,homeBackendId,
        row.channelId,row.eventId,function(bytes){
          if(!homeAlive(token) || ticket!==homeFeatureRun || !bytes.ok ||
             !window.URL || typeof window.URL.createObjectURL!=="function" ||
             typeof window.Blob!=="function")return;
          var url;
          try{url=window.URL.createObjectURL(new window.Blob(
            [bytes.value.bytes],{type:bytes.value.contentType}));}catch(_){return;}
          homeClearArtwork();homeArtworkUrl=url;
          if(homeFeaturePoster){
            homeFeaturePoster.onerror=function(){
              if(homeArtworkUrl===url)homeClearArtwork();
            };
            homeFeaturePoster.src=url;homeFeaturePoster.hidden=false;
          }
        });
      return;
    }
    if(kind!=="recordings" || !/^rec_[0-9a-f]{32}$/.test(row.recordingId))return;
    homeFeatureArtwork.artworkList(homeCredential,homeBackendId,
      row.recordingId,function(result){
        if(!homeAlive(token) || ticket!==homeFeatureRun ||
           !result.ok || !result.value.items.length)return;
        var artwork=result.value.items.filter(function(x){
          return x.kind==="poster";
        })[0] || result.value.items.filter(function(x){
          return x.kind==="fanart";
        })[0];
        if(!artwork)return;
        homeFeatureArtwork.artworkBytes(homeCredential,homeBackendId,
          row.recordingId,artwork.artworkId,function(bytes){
            if(!homeAlive(token) || ticket!==homeFeatureRun || !bytes.ok ||
               !window.URL || typeof window.URL.createObjectURL!=="function" ||
               typeof window.Blob!=="function")return;
            var url=null;
            try {url=window.URL.createObjectURL(new window.Blob(
              [bytes.value.bytes],{type:bytes.value.contentType}));}
            catch(_) {return;}
            homeClearArtwork();homeArtworkUrl=url;
            if(homeFeaturePoster){
              homeFeaturePoster.onerror=function(){
                if(homeArtworkUrl===url)homeClearArtwork();
              };
              homeFeaturePoster.src=url;
              homeFeaturePoster.hidden=false;
            }
          });
      });
  }
  function homeSelectRecording(row,kind,force){
    if(!row || !homeCredential || !homeBackendId)return;
    var token=homeRun;
    ++homeFeatureRun;homeFeatureMetadata.cancel();
    if(force)homeFeaturePriority=0;
    var priority=force?4:kind==="continue"?3:2;
    homeFeatureShow(row,"recordings",priority,
      kind==="continue" ?
        "Gespeicherte Position: "+Math.floor(row.positionSeconds/60)+" Min." :
        (row.recordedAt ? "Aufgenommen: "+row.recordedAt : "Aufnahme"));
    var selected=homeFeatureRun;
    homeFeatureMetadata.recordingDetail(homeCredential,homeBackendId,
      row.recordingId,function(result){
        if(!homeAlive(token) || selected!==homeFeatureRun)return;
        if(result.ok){
          var desc=kind==="continue" ?
            "Gespeicherte Position: "+Math.floor(row.positionSeconds/60)+" Min." :
            "Metadaten aus VDR-Suite";
          // Upgraded title, overview and genre are authoritative, never made up.
          homeFeatureShow(result.value,"recordings",priority,
            [desc,result.value.metadata.genreText||""].filter(Boolean).join(" · "));
        } else if(homeFeatureMeta)
          homeFeatureMeta.textContent="Details: "+mediaMetadataError(result);
      });
  }
  function homeDisplayContinue(credential,backendId,token){
    homeResume.load(credential,backendId,function(result){
      if(!homeAlive(token))return;
      if(!result.ok){
        homeMessage("home-continue-status",homeContinueError(result));return;
      }
      var first=result.value.items.slice(0,3);
      homeMessage("home-continue-status",first.length ?
        first.length+" von "+result.value.items.length+" gespeicherten Positionen" :
        "Noch keine fortsetzbaren Aufnahmen.");
      first.forEach(function(progress,index){
        // A Continue Watching card has an actual server checkpoint, not a
        // position guessed from a recording entry.
        var pct=progress.durationSeconds===null ? null :
          progress.positionSeconds*100/progress.durationSeconds;
        var item={backendId:backendId,recordingId:progress.recordingId,
          positionSeconds:progress.positionSeconds,
          durationSeconds:progress.durationSeconds,
          durationKnown:progress.durationSeconds!==null,
          title:"Aufnahmedetails werden geladen"};
        var position="Position "+Math.floor(progress.positionSeconds/60)+" Min."+
          (progress.durationSeconds===null?"":" von "+
            Math.ceil(progress.durationSeconds/60)+" Min.");
        var card=homeCard("continue",item,item.title,position,pct);
        homeContinueMetadata[index].recordingDetail(credential,backendId,
          progress.recordingId,function(detail){
            if(!homeAlive(token))return;
            if(!detail.ok){
              if(card)card.title.textContent="Aufnahme (Details nicht verfügbar)";
              return;
            }
            Object.assign(item,detail.value);
            // Checkpoint duration has its own truth and may not equal the
            // catalog duration. Never rewrite its position or percentage.
            item.positionSeconds=progress.positionSeconds;
            item.resumeDurationSeconds=progress.durationSeconds;
            if(card){
              card.title.textContent=item.title;
              card.info.textContent=position+
                (homeMetadataText(item,"") ? " · "+homeMetadataText(item,"") : "");
              homeAttachCardArt(credential,backendId,"continue",item,card,token);
            }
            if(index===0 && homeFeaturePriority<3)homeSelectRecording(item,"continue");
          });
      });
    });
  }
  function homeDisplayRecordings(credential,backendId,token){
    homeRecordingCatalog.listRecordings(credential,backendId,null,function(result){
      if(!homeAlive(token))return;
      if(!result.ok){
        homeMessage("home-recordings-status",recordingCatalogError(result));return;
      }
      var list=result.value.items.slice(0,4);
      homeMessage("home-recordings-status",list.length ?
        "Aus dem freigegebenen VDR-Katalog · "+list.length+" angezeigt" :
        "Noch keine Aufnahmen vorhanden");
      list.forEach(function(row){
        var card=homeCard("recordings",row,row.title,
          homeMetadataText(row,row.recordedAt ?
            "Aufgenommen: "+row.recordedAt : "Aufnahme"),null);
        homeAttachCardArt(credential,backendId,"recordings",row,card,token);
        var client=createPublicMediaMetadata(window);
        homeCardDetailClients.push(client);
        client.recordingDetail(credential,backendId,row.recordingId,function(detail){
          if(!homeAlive(token) || !detail.ok)return;
          Object.assign(row,detail.value);
          if(card){
            card.title.textContent=row.title;
            card.info.textContent=homeMetadataText(row,
              row.recordedAt ? "Aufgenommen: "+row.recordedAt : "Aufnahme");
          }
        });
      });
      if(list.length && homeFeaturePriority<2)
        homeSelectRecording(list[0],"recordings");
    });
  }
  function homeDisplayTimers(credential,backendId,token){
    homeTimerCatalog.list(credential,backendId,0,function(result){
      if(!homeAlive(token))return;
      if(!result.ok){
        if(homeTimerSummary)homeTimerSummary.textContent=
          nativeTimerCatalogError(result);return;
      }
      var list=result.value.items;
      var recording=list.filter(function(x){return x.recording;}).length;
      if(homeTimerSummary){
        var upcoming=list.filter(function(x){return x.enabled && !x.recording;})
          .slice(0,2).map(function(x){
            return x.title+" ("+x.day+" "+x.startTime+")";
          });
        homeTimerSummary.textContent=
          (result.value.page.hasMore?"Mindestens ":"")+list.length+
          " native VDR-Timer · "+recording+" gerade aktiv"+
          (upcoming.length?" · Geplant: "+upcoming.join(" · "):"");
      }
    });
  }
  function homeDisplayEpg(credential,backendId,token){
    homeChannelCatalog.listChannels(credential,backendId,null,function(result){
      if(!homeAlive(token))return;
      if(!result.ok){
        homeMessage("home-epg-status",channelCatalogError(result));return;
      }
      var channels=result.value.items.filter(function(x){
        return x.enabled && !x.radio;
      }).slice(0,3);
      if(!channels.length){
        homeMessage("home-epg-status","Keine TV-Sender auf der ersten Seite verfügbar.");
        return;
      }
      homeMessage("home-epg-status","Jetzt im TV · "+channels.length+" Sender");
      var now=Math.floor(Date.now()/1000),found=0,failures=0;
      channels.forEach(function(channel){
        var reader=createPublicMediaMetadata(window);
        homeEpgReaders.push(reader);
        reader.nowNext(credential,backendId,channel.channelId,now,function(epg){
          if(!homeAlive(token))return;
          if(!epg.ok){
            failures++;
            if(!found)homeMessage("home-epg-status",mediaMetadataError(epg));
            return;
          }
          var event=epg.value.items.filter(function(x){
            return Number(x.startTime)<=now && Number(x.endTime)>now;
          })[0];
          if(!event)return;
          found++;
          homeMessage("home-epg-status","Jetzt im TV · "+found+" Sendungen");
          var row={event:event,channel:channel};
          var card=homeCard("epg",row,event.title,
            channel.name+" · "+globalSearchDate(event.startTime)+
            (event.subtitle?" · "+event.subtitle:""),null);
          homeAttachCardArt(credential,backendId,"epg",row,card,token);
        });
      });
    });
  }
  function homeRefresh(){
    if(currentView!=="home")return;
    homeCancelReads();homeClearCards();
    homeCredential=null;homeBackendId=null;
    var saved=vault.read();
    if(!saved.ok || !saved.credential){
      homeMessage("home-content-status",
        "Keine gekoppelte Geräteanmeldung · Einstellungen prüfen");
      ["continue","recordings","epg"].forEach(function(k){
        homeMessage("home-"+(k==="continue"?"continue":k)+"-status",
          "Ohne Geräteanmeldung nicht verfügbar");
      });
      return;
    }
    var address=serverInput && normalizeSuiteBase(serverInput.value);
    if(address && address!==saved.credential.base){
      homeMessage("home-content-status","Serveradresse stimmt nicht mit Geräteanmeldung überein.");
      return;
    }
    var credential=saved.credential,token=homeRun;
    homeCredential=credential;
    homeMessage("home-content-status","Prüfe vorhandene Geräteanmeldung …");
    homePairing.verify(credential,function(valid){
      if(!homeAlive(token))return;
      if(!valid.ok){
        homeMessage("home-content-status",deviceVerificationError(valid));return;
      }
      markDeviceAuthenticated(credential);
      homeBackendCatalog.listBackends(credential,function(backendResult){
        if(!homeAlive(token))return;
        if(!backendResult.ok || !backendResult.value.items.length){
          homeMessage("home-content-status",backendResult.ok ?
            "Kein freigegebenes Backend" : channelCatalogError(backendResult));
          return;
        }
        // One explicit selected/first accessible backend, no hidden fanout.
        var backend=backendResult.value.items[0];
        homeBackendId=backend.backendId;
        homeMessage("home-content-status","Backend: "+backend.name+
          " · echte API-v1-Metadaten");
        homeMessage("home-continue-status","Lade gespeicherte Positionen …");
        homeMessage("home-recordings-status","Lade Aufnahmekatalog …");
        homeMessage("home-epg-status","Lade Jetzt/Nächste …");
        homeDisplayContinue(credential,homeBackendId,token);
        homeDisplayRecordings(credential,homeBackendId,token);
        homeDisplayTimers(credential,homeBackendId,token);
        homeDisplayEpg(credential,homeBackendId,token);
      });
    });
  }

  function reportDiscoverySuccess(result) {
    discoveredBase = result.base;
    if (connectionResult) {
      connectionResult.setAttribute("data-connection-state", "success");
      connectionResult.textContent = "Public API v1 erreichbar. " +
        result.capabilityCount + " Fähigkeiten gemeldet. " +
        "Geräteanmeldung hier nicht geprüft – dafür „Anmeldung prüfen“ wählen.";
    }
    if (homeServerState) homeServerState.textContent = "API v1 erreichbar · Anmeldung ungeprüft";
    if (topbarServerState) topbarServerState.textContent = "API v1 erreichbar";
    message.textContent = "Einstellungen · Server erreichbar · Geräteanmeldung ungeprüft";
  }

  function saveServerBase() {
    if (!serverInput) return;
    var base = normalizeSuiteBase(serverInput.value);
    if (!base) return;
    try {
      if (window.localStorage) window.localStorage.setItem("vdr-suite.samsung.serverBase", base);
    } catch (_) { /* Tizen test installations may erase/deny Web storage */ }
  }

  function testServerConnection() {
    if (testingConnection || pairingBusy || !serverInput || !connectionResult) return;
    var address = normalizeSuiteBase(serverInput.value);
    if (!address) {
      connectionResult.textContent = classifyDiscoveryError("invalid_origin");
      connectionResult.setAttribute("data-connection-state", "error");
      return;
    }
    // Store only the validated base; credentials never use localStorage.
    saveServerBase();
    discoveredBase = null;
    if (homeServerState) homeServerState.textContent = "Noch nicht verbunden";
    if (topbarServerState) topbarServerState.textContent = "Offline";
    testingConnection = true;
    if (serverTest) serverTest.disabled = true;
    connectionResult.setAttribute("data-connection-state", "loading");
    connectionResult.textContent = "Verbindung wird auf diesem TV geprüft …";
    discovery.probe(address, function (result) {
      testingConnection = false;
      if (serverTest) serverTest.disabled = false;
      if (!result.ok) {
        connectionResult.setAttribute("data-connection-state", "error");
        connectionResult.textContent = classifyDiscoveryError(result.kind, result.status);
        return;
      }
      reportDiscoverySuccess(result);
    });
  }


  function pairMessage(text) { if (pairingResult) pairingResult.textContent = text; }
  function clearPairRequest() {
    pairingRequest = null; pairingBase = null; pairingApproved = false;
    issueAttempted = false;
    if (pairingCode) pairingCode.textContent = "– – – – – –";
  }
  function storedStatus() {
    // Always refresh on entering Settings: cached startup text becomes stale
    // after authenticating via Live TV / Recordings.
    if (pairingBusy || pendingCredential || pairingRequest) return;
    var saved = vault.read();
    if (saved.ok && saved.credential) pairedCredential = saved.credential;
    var status = devicePairingStatus(saved,lastVerifiedDevice,rejectedCredentialId);
    pairMessage(status.text);
    if (pairingResult) pairingResult.setAttribute("data-pair-state",status.state);
  }
  function markDeviceAuthenticated(credential) {
    // Only successful public-v1 Device verification can set this marker.
    lastVerifiedDevice = {credentialId:credential.credentialId,base:credential.base};
    pairedCredential = credential;
    rejectedCredentialId = null;
    resetConfirmationId = null;
    if (homeServerState) homeServerState.textContent = "Device verbunden";
    if (topbarServerState) topbarServerState.textContent = "Gerät angemeldet";
    storedStatus();
  }
  function updateVerificationFailure(credential, result) {
    resetConfirmationId = null;
    if (result.kind === "http" && result.status === 401) {
      rejectedCredentialId = credential.credentialId;
      lastVerifiedDevice = null;
      pairedCredential = null;
      if (homeServerState) homeServerState.textContent = "Geräteanmeldung abgewiesen";
      if (topbarServerState) topbarServerState.textContent = "Anmeldung ungültig";
      return true;
    }
    rejectedCredentialId = null;
    if (homeServerState) homeServerState.textContent = "Geräteanmeldung nicht bestätigt";
    if (topbarServerState) topbarServerState.textContent = "Anmeldung ungeprüft";
    return false;
  }
  function clearRejectedLocalCredential() {
    if (pairingBusy || pendingCredential || pairingRequest) {
      pairMessage("Laufende Kopplung/Speicherung zuerst abschließen."); return;
    }
    if (!rejectedCredentialId) {
      pairMessage("Lokale Anmeldung wird nur nach einer bestätigten HTTP-401-Ablehnung zurückgesetzt. Erst „Anmeldung prüfen“ wählen.");
      return;
    }
    var saved = vault.read();
    if (!saved.ok || !saved.credential ||
        saved.credential.credentialId !== rejectedCredentialId) {
      resetConfirmationId = null;
      pairMessage("KeyManager nicht lesbar oder Credential inzwischen geändert. Nichts entfernt; erneut prüfen.");
      return;
    }
    if (resetConfirmationId !== rejectedCredentialId) {
      resetConfirmationId = rejectedCredentialId;
      pairMessage("Nur dieses lokal abgewiesene Credential entfernen? Zum Bestätigen „Lokale Anmeldung zurücksetzen“ NOCH EINMAL drücken. Keine Server-Geräte werden verändert.");
      return;
    }
    var cleared = vault.removeLocal(rejectedCredentialId);
    resetConfirmationId = null;
    if (!cleared.ok) {
      pairMessage("Lokale Anmeldung NICHT entfernt: KeyManager nicht lesbar oder Credential geändert. Keine automatische Neukopplung.");
      return;
    }
    pairedCredential = null;
    rejectedCredentialId = null;
    lastVerifiedDevice = null;
    liveCredential = null;
    recordingCredential = null;
    if (homeServerState) homeServerState.textContent = "Keine lokale Geräteanmeldung";
    if (topbarServerState) topbarServerState.textContent = "Nicht angemeldet";
    pairMessage("Abgewiesenes Credential lokal entfernt. Kein Server-Gerät verändert. Bei Bedarf Kopplung ausdrücklich neu starten; Grants werden nicht übertragen.");
  }
  function pairStart() {
    if (pairingBusy || pendingCredential || pairingRequest) {
      pairMessage("Es läuft bereits eine Kopplung. Status prüfen oder Ablauf abwarten."); return;
    }
    // A disappearing alias in a session that already authenticated is NOT
    // permission to create a second server device. Diagnose/recover first.
    if (lastVerifiedDevice && pairedCredential &&
        lastVerifiedDevice.credentialId === pairedCredential.credentialId &&
        lastVerifiedDevice.base === pairedCredential.base) {
      pairMessage("Dieses Gerät wurde in der laufenden Sitzung bereits authentifiziert. " +
        "Bitte zuerst „Anmeldung prüfen“ wählen. Keine neue Kopplung gestartet.");
      return;
    }
    var base = serverInput && normalizeSuiteBase(serverInput.value);
    if (!base) { pairMessage("Zuerst eine gültige HTTPS-Serveradresse eingeben."); return; }
    if (testingConnection) { pairMessage("Die Verbindung wird noch geprüft."); return; }
    saveServerBase();
    if (base !== discoveredBase) {
      // Only an explicit pairing click starts the required anonymous discovery.
      pairingBusy = true;
      pairMessage("Prüfe die öffentliche API v1 vor dem Kopplungsstart …");
      discovery.probe(base, function (result) {
        pairingBusy = false;
        if (!result.ok) {
          pairMessage("Serverprüfung fehlgeschlagen: " +
            classifyDiscoveryError(result.kind, result.status));
          return;
        }
        reportDiscoverySuccess(result);
        beginPairingOnVerifiedServer(base);
      });
      return;
    }
    beginPairingOnVerifiedServer(base);
  }
  function beginPairingOnVerifiedServer(base) {
    pairingBusy = true;
    pairMessage("Prüfe den sicheren Tizen KeyManager …");
    vault.preflight(function (ready) {
      if (!ready.ok || ready.credential) {
        pairingBusy = false;
        if (ready.credential) {
          pairedCredential = ready.credential;
          pairMessage("Credential nur lokal vorhanden. Das beweist KEINE gültige Kopplung. „Anmeldung prüfen“ wählen; bei HTTP 401 kann die lokale Anmeldung ausdrücklich zurückgesetzt werden.");
        } else pairMessage("KeyManager nicht schreib-/lesbar. Keine Kopplung gestartet.");
        return;
      }
      pairingClient.create(base,function (result) {
        pairingBusy = false;
        if (!result.ok) {pairMessage(pairingError(result.kind,result.status));return;}
        pairingRequest = result.pairing;
        pairingBase = base; pairingApproved = false; issueAttempted = false;
        if (pairingCode) pairingCode.textContent = result.pairing.code;
        pairMessage("Code beim Administrator freigeben. Anschließend „Status prüfen“ drücken. Gültigkeit laut Server: "+result.pairing.expiresAt);
      });
    });
  }
  function pairCheck() {
    if (pairingBusy || !pairingRequest || !pairingBase) {
      pairMessage(pairingRequest ? "Bitte laufenden Vorgang abschließen." : "Bitte zuerst eine Kopplung starten.");return;
    }
    if (issueAttempted) {pairMessage("Credential-Ausgabe wurde schon versucht. Nicht wiederholen.");return;}
    pairingBusy = true;
    pairMessage("Frage Kopplungsstatus beim Server ab …");
    pairingClient.poll(pairingBase,pairingRequest,function (result) {
      pairingBusy = false;
      if (!result.ok) {
        pairMessage(pairingError(result.kind,result.status));
        if (result.kind==="http" && (result.status===404 || result.status===410)) clearPairRequest();
        return;
      }
      if (result.status==="approved") {
        pairingApproved = true;
        pairMessage("Administrator hat freigegeben! Jetzt „Gerät aktivieren“ drücken.");
      } else if (result.status==="rejected") {
        pairMessage("Kopplung vom Administrator abgelehnt.");
        clearPairRequest();
      } else pairMessage("Freigabe steht noch aus. Später erneut „Status prüfen“ drücken.");
    });
  }
  function pairActivate() {
    if (pairingBusy || !pairingRequest || !pairingApproved || issueAttempted) {
      pairMessage("Erst Kopplung starten, Freigabe prüfen und noch nicht verbraucht haben.");return;
    }
    pairingBusy = true;
    // Last safety check before the one-way credential issuance.
    vault.preflight(function (ready) {
      if (!ready.ok || ready.credential) {
        pairingBusy = false;
        pairMessage("KeyManager nicht verfügbar oder Gerät bereits gespeichert. Ausgabe nicht gestartet.");return;
      }
      issueAttempted = true;
      pairMessage("Einmaliges Geräte-Credential wird ausgestellt und sicher gespeichert …");
      pairingClient.issue(pairingBase,pairingRequest,function (result) {
        if (!result.ok) {
          pairingBusy = false;
          pairMessage(pairingError(result.kind,result.status)+" Bei unklarem POST-Ergebnis niemals blind wiederholen.");
          return;
        }
        pendingCredential = result.credential;
        savePendingCredential();
      });
    });
  }
  function savePendingCredential() {
    if (!pendingCredential) {pairMessage("Kein ausstehendes Credential.");return;}
    pairingBusy = true;
    vault.store(pendingCredential,function (result) {
      pairingBusy = false;
      if (!result.ok) {
        pairMessage("Credential-Ausgabe erfolgt, aber KeyManager-Speicherung fehlgeschlagen. App NICHT schließen; „Speichern wiederholen“ drücken. Nie erneut ausstellen.");
        return;
      }
      pairedCredential = result.credential;
      // Saving locally does not establish server authentication.
      lastVerifiedDevice = null;
      rejectedCredentialId = null;
      resetConfirmationId = null;
      pendingCredential = null;
      clearPairRequest();
      pairMessage("Gerät sicher gekoppelt. „Anmeldung prüfen“ kontrolliert die Device-Authentifizierung. Noch keine Backend-Rechte.");
    });
  }
  function pairVerify() {
    if (pairingBusy || pendingCredential) {pairMessage("Bitte zuerst Speicherung abschließen.");return;}
    resetConfirmationId = null;
    var saved = vault.read();
    if (!saved.ok) {
      rejectedCredentialId = null;
      pairMessage("KeyManager nicht lesbar. Credential-Status unbekannt; später erneut prüfen, nicht neu koppeln.");
      return;
    }
    if (!saved.credential) {
      rejectedCredentialId = null;
      var currentState = devicePairingStatus(saved,lastVerifiedDevice,rejectedCredentialId);
      if (currentState.state !== "conflict") {
        pairMessage(currentState.text + " Nach einer deinstallierenden Testinstallation " +
          "ist das Credential nicht wiederherstellbar; niemals alte Server-Geräte auf Verdacht löschen.");
        return;
      }
      // Do not recover a credential for a different selected server.
      var requestedBase = serverInput && normalizeSuiteBase(serverInput.value);
      if (requestedBase && pairedCredential && requestedBase !== pairedCredential.base) {
        pairMessage("Die Sitzung gehört zu einem anderen Server. Adresse prüfen; " +
          "keine lokale Wiederherstellung, keine neue Kopplung.");
        return;
      }
      // Only in the running process can we possess a credential that was
      // demonstrably verified earlier. The explicit Verify click authorizes
      // a read-only server recheck and a guarded KeyManager re-save.
      pairingBusy = true;
      pairMessage("Bereits authentifiziertes Gerät erkannt. Prüfe die " +
        "bestehende Anmeldung erneut und sichere sie gegebenenfalls im KeyManager …");
      restoreVerifiedSessionCredential(saved,pairedCredential,lastVerifiedDevice,
        function (credential,done) {pairingClient.verify(credential,done);},
        function (credential,done) {vault.store(credential,done);},
        function (restored) {
          pairingBusy = false;
          if (restored.ok) {
            markDeviceAuthenticated(restored.credential);
            pairMessage("Bestehende Geräteanmeldung sicher erneut gespeichert und " +
              "serverseitig bestätigt (Device-ID: " + restored.credential.deviceId +
              "). Keine neue Kopplung, kein neues Server-Gerät.");
          } else if (restored.kind === "verification") {
            if (restored.verification && restored.verification.kind === "http" &&
                restored.verification.status === 401)
              updateVerificationFailure(pairedCredential,restored.verification);
            pairMessage("Frühere Anmeldung in dieser Sitzung bekannt, aber erneute " +
              "Serverprüfung fehlgeschlagen: " + deviceVerificationError(restored.verification) +
              " Nichts entfernt, kein neues Gerät angelegt.");
          } else {
            pairMessage("Frühere Anmeldung in dieser Sitzung bekannt, aber " +
              "KeyManager-Wiederherstellung nicht bestätigt. Keine neue Kopplung; " +
              "App möglichst nicht beenden.");
          }
        });
      return;
    }
    var selectedBase = serverInput && normalizeSuiteBase(serverInput.value);
    if (selectedBase && selectedBase !== saved.credential.base) {
      rejectedCredentialId = null;
      pairMessage("Credential gehört zu einem anderen Server. Adresse prüfen; keine lokale Löschung.");
      return;
    }
    var checkingCredential = saved.credential;
    pairedCredential = checkingCredential;
    pairingBusy = true;
    pairMessage("Prüfe Geräteanmeldung über Public API v1 …");
    pairingClient.verify(checkingCredential,function (result) {
      pairingBusy = false;
      if (result.ok) {
        discoveredBase = checkingCredential.base;
        markDeviceAuthenticated(checkingCredential);
        message.textContent = "Device authentifiziert · Berechtigungen werden separat vergeben";
        pairMessage("Device-Authentifizierung erfolgreich (Device-ID: " +
          checkingCredential.deviceId + "). Sender/Aufnahmen benötigen Admin-Grants.");
      } else if (updateVerificationFailure(checkingCredential,result)) {
        pairMessage("Geräteanmeldung ABGEWIESEN: " + deviceVerificationError(result) +
          " Lokales Credential noch vorhanden (Device-ID: " + checkingCredential.deviceId +
          "). Für bewusstes Neu-Koppeln zuerst „Lokale Anmeldung zurücksetzen“ zweimal bestätigen.");
      } else {
        pairMessage("Geräteanmeldung nicht bestätigt: " + deviceVerificationError(result) +
          " Lokales Credential bleibt unverändert; nicht auf Verdacht neu koppeln.");
      }
    });
  }

  function isVisibleFocus(id) {
    if (!controls[id]) return false;
    var rows = focusRows();
    for (var r = 0; r < rows.length; r += 1) {
      if (rows[r].indexOf(id) !== -1) return true;
    }
    return false;
  }

  function setFocus(id) {
    if (!isVisibleFocus(id)) return false;
    var chosen = controls[id];
    focusedId = id;
    // On Tizen TV, simply focusing a text input can open the native IME.
    // Its arrow/Backspace keys belong to editing, not to the app focus graph.
    if (currentView === "settings") editingServerAddress = id === "settings-base-input";
    if (currentView === "search") globalSearchEditing = id === "global-search-input";
    if (currentView === "home") lastHomeFocus = id;
    if (!rowMemory[currentView]) rowMemory[currentView] = {};
    var rows = focusRows();
    for (var r = 0; r < rows.length; r += 1) {
      if (rows[r].indexOf(id) !== -1) rowMemory[currentView][r] = id;
    }
    items.forEach(function (item) {
      var active = item === chosen;
      item.classList.toggle("is-focused", active);
      item.tabIndex = active ? 0 : -1;
    });
    chosen.focus();
    // On smaller screens and future longer media rails, bring focus into view.
    if (typeof chosen.scrollIntoView === "function") {
      try { chosen.scrollIntoView({ block: "nearest", inline: "nearest" }); }
      catch (_) { try { chosen.scrollIntoView(false); } catch (_) {} }
    }
    return true;
  }

  function renderPreview(route, state) {
    var presentation = getViewPresentation(route, state);
    if (!presentation) return;
    var card = document.getElementById("detail-state-" + route);
    var badge = document.getElementById("detail-state-badge-" + route);
    var title = document.getElementById("detail-state-title-" + route);
    var description = document.getElementById("detail-state-description-" + route);
    var skeleton = document.getElementById("detail-state-skeleton-" + route);
    if (!card || !badge || !title || !description || !skeleton) return;
    previewStates[route] = presentation.state;
    card.setAttribute("data-state", presentation.state);
    badge.textContent = presentation.badge;
    title.textContent = presentation.title;
    description.textContent = presentation.description;
    skeleton.hidden = !presentation.skeleton;
  }


  function liveStatus(state, title, description) {
    var card = document.getElementById("detail-state-live");
    var badge = document.getElementById("detail-state-badge-live");
    var headline = document.getElementById("detail-state-title-live");
    var explanation = document.getElementById("detail-state-description-live");
    var skeleton = document.getElementById("detail-state-skeleton-live");
    if (card) card.setAttribute("data-state", state);
    if (badge) badge.textContent = state === "ready" ? "SENDER" :
      state === "loading" ? "LÄDT" : state === "error" ? "FEHLER" :
      state === "empty" ? "LEER" : "OFFLINE";
    if (headline) headline.textContent = title;
    if (explanation) explanation.textContent = description;
    if (skeleton) skeleton.hidden = state !== "loading";
  }

  function clearEpgArtwork() {
    if (liveEpgPoster) {
      liveEpgPoster.hidden=true;
      liveEpgPoster.onerror=null;
      liveEpgPoster.onload=null;
      liveEpgPoster.removeAttribute("src");
    }
    if (liveEpgArtworkUrl && window.URL &&
        typeof window.URL.revokeObjectURL==="function")
      window.URL.revokeObjectURL(liveEpgArtworkUrl);
    liveEpgArtworkUrl=null;
    if (liveEpgArtworkStatus) liveEpgArtworkStatus.textContent="";
  }
  function clearEpgFocusRows() {
    if (currentView==="live" && liveEpgFocusIds.indexOf(focusedId)>=0)
      setFocus("detail-live-epg-now");
    liveEpgFocusIds.forEach(function(id) {
      var element=controls[id];
      delete controls[id];
      var index=items.indexOf(element);
      if (index!==-1) items.splice(index,1);
    });
    liveEpgFocusIds=[];
    liveEpgRows=[];
    liveDetailMetadata.cancel();
    liveArtworkMetadata.cancel();
    clearEpgArtwork();
    liveEpgDetailRun+=1;
    if (liveEpgDetail) liveEpgDetail.hidden=true;
    if (liveEpgScrollActions) liveEpgScrollActions.hidden=true;
  }
  function clearLiveEpg() {
    liveMetadata.cancel();
    clearEpgFocusRows();
    liveEpgRun += 1;
    selectedLiveChannel = null;
    liveWindow = null;
    if (liveEpgStatus) liveEpgStatus.textContent =
      "EPG: Sender mit OK auswählen. epg.view ist erforderlich.";
    if (liveEpgList) {liveEpgList.textContent = "";liveEpgList.hidden = true;}
  }
  function epgRow(item,index,nowNext) {
    var start=new Date(Number(item.startTime)*1000);
    var end=new Date(Number(item.endTime)*1000);
    var clock=function(value) {
      return isFinite(value.getTime()) ?
        value.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) : "--:--";
    };
    var label=nowNext ? (index===0 ? "Jetzt · " : "Danach · ") : "";
    return label+clock(start)+"–"+clock(end)+" · "+item.title+
      (item.subtitle ? " · "+item.subtitle : "");
  }
  // OK on a focusable EPG row must do something visible. A description
  // can only be fetched if Public v1 advertises a proven native eventId.
  function selectEpgEvent(item,loadDescription) {
    liveDetailMetadata.cancel();
    liveArtworkMetadata.cancel();
    clearEpgArtwork();
    var token=++liveEpgDetailRun;
    if (!item || !liveEpgDetail) return;
    var start=new Date(Number(item.startTime)*1000);
    var end=new Date(Number(item.endTime)*1000);
    var clock=function(date) {
      return isFinite(date.getTime()) ?
        date.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) : "--:--";
    };
    var date=isFinite(start.getTime()) ?
      start.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit"}) : "";
    liveEpgDetail.hidden=false;
    liveEpgDetail.scrollTop=0;
    if (liveEpgScrollActions) liveEpgScrollActions.hidden=false;
    if (liveEpgDetailTime) liveEpgDetailTime.textContent =
      date+" · "+clock(start)+"–"+clock(end);
    if (liveEpgDetailTitle) liveEpgDetailTitle.textContent=item.title.slice(0,512);
    if (liveEpgDetailSubtitle) {
      liveEpgDetailSubtitle.textContent=(item.subtitle || "").slice(0,512);
      liveEpgDetailSubtitle.hidden=!item.subtitle;
    }
    if (!liveEpgDetailDescription) return;
    if (!loadDescription) {
      liveEpgDetailDescription.textContent="OK: Sendungsinformationen anzeigen.";
      if (liveEpgArtworkStatus) liveEpgArtworkStatus.textContent=
        "Sendungsbild wird bei OK geladen, sofern im EPG vorhanden.";
      return;
    }
    var backend=liveBackends[liveBackendIndex];
    var channel=selectedLiveChannel;
    if (!backend || !channel || !liveCredential ||
        channel.backendId!==backend.backendId || item.channelId!==channel.channelId)
      return;
    function stillSelected() {
      return token===liveEpgDetailRun && currentView==="live" &&
        selectedLiveChannel && selectedLiveChannel.channelId===channel.channelId &&
        selectedLiveChannel.backendId===channel.backendId;
    }
    // Reuse Public v1's already authorized EPG artwork service. An absent
    // preferred image may fall back to the direct EPG image only on 404.
    // Every old selection's image request and Object URL are cancelled.
    function loadEpgArtwork(id) {
      if (!stillSelected() || !liveEpgPoster || !liveEpgArtworkStatus) return;
      liveEpgArtworkStatus.textContent="Prüfe vorhandenes Sendungsbild …";
      function receiveArtwork(result) {
        if (!stillSelected()) return;
        if (!result.ok) {
          liveEpgArtworkStatus.textContent=result.kind==="http" &&
            result.status===404 ? "Kein Sendungsbild hinterlegt." :
            "Sendungsbild: "+mediaMetadataError(result);
          return;
        }
        try {
          if (!window.URL || !window.Blob ||
              typeof window.URL.createObjectURL!=="function")
            throw Error("No object URL support");
          var objectUrl=window.URL.createObjectURL(
            new window.Blob([result.value.bytes],{type:result.value.contentType}));
          if (!stillSelected()) {
            window.URL.revokeObjectURL(objectUrl);return;
          }
          clearEpgArtwork();
          liveEpgArtworkUrl=objectUrl;
          liveEpgPoster.onload=function() {
            if (stillSelected() && liveEpgArtworkUrl===objectUrl)
              liveEpgArtworkStatus.textContent="";
          };
          liveEpgPoster.onerror=function() {
            if (!stillSelected() || liveEpgArtworkUrl!==objectUrl) return;
            clearEpgArtwork();
            liveEpgArtworkStatus.textContent="Sendungsbild konnte nicht dargestellt werden.";
          };
          liveEpgPoster.src=objectUrl;
          liveEpgPoster.hidden=false;
          liveEpgArtworkStatus.textContent="Sendungsbild geladen.";
        } catch (_) {
          clearEpgArtwork();
          liveEpgArtworkStatus.textContent="Bildanzeige auf diesem TV nicht verfügbar.";
        }
      }
      liveArtworkMetadata.epgPreferredArtwork(liveCredential,
        backend.backendId,channel.channelId,id,function(result) {
          if (!stillSelected()) return;
          if (!result.ok && result.kind==="http" && result.status===404) {
            liveArtworkMetadata.epgDirectArtwork(liveCredential,
              backend.backendId,channel.channelId,id,receiveArtwork);
            return;
          }
          receiveArtwork(result);
        });
    }
    function loadEventDetail(id) {
      if (!stillSelected()) return;
      liveEpgDetailDescription.textContent="Lade Sendungsbeschreibung …";
      liveDetailMetadata.eventDetail(liveCredential,backend.backendId,
        channel.channelId,id,function(result) {
          if (!stillSelected()) return;
          if (!result.ok) {
            liveEpgDetailDescription.textContent =
              "Sendungsdetails: "+mediaMetadataError(result);
            return;
          }
          var info=result.value;
          // Native IDs can be reused after a cache refresh. Show only the
          // exact airing that the user selected, never a stale replacement.
          if (info.startTime!==item.startTime || info.endTime!==item.endTime) {
            liveEpgDetailDescription.textContent =
              "Das EPG wurde aktualisiert. Bitte das Programm neu laden.";
            return;
          }
          if (liveEpgDetailTitle) liveEpgDetailTitle.textContent=info.title;
          if (liveEpgDetailSubtitle) {
            liveEpgDetailSubtitle.textContent=info.subtitle || "";
            liveEpgDetailSubtitle.hidden=!info.subtitle;
          }
          liveEpgDetailDescription.textContent=info.description ||
            "Für diese Sendung ist keine ausführliche Beschreibung hinterlegt.";
          loadEpgArtwork(id);
        });
    }
    if (/^[A-Za-z0-9._:-]{1,160}$/.test(item.eventId || "")) {
      loadEventDetail(item.eventId);
      return;
    }
    // Public v1 now-next deliberately omits eventId even when the native
    // EPG source has one. A single authorized window GET can expose a
    // source-provenanced ID without guessing or using a Browser-only API.
    var from=Number(item.startTime),until=Number(item.endTime);
    if (!isFinite(from) || !isFinite(until) || from<1000000000 ||
        until<=from || until-from>172800) {
      liveEpgDetailDescription.textContent="Sendezeit nicht für Detailabfrage geeignet.";
      return;
    }
    liveEpgDetailDescription.textContent="Prüfe Event-ID im EPG-Zeitfenster …";
    liveDetailMetadata.epgWindow(liveCredential,backend.backendId,
      channel.channelId,from,until,null,function(result) {
        if (!stillSelected()) return;
        if (!result.ok) {
          liveEpgDetailDescription.textContent =
            "EPG-Zeitfenster: "+mediaMetadataError(result);
          return;
        }
        var candidates=result.value.items.filter(function(e) {
          return e.channelId===item.channelId &&
            e.startTime===item.startTime && e.endTime===item.endTime &&
            e.title===item.title &&
            (e.subtitle || "")===(item.subtitle || "") &&
            e.durationSeconds===item.durationSeconds;
        });
        if (result.value.page.hasMore || candidates.length!==1 ||
            !/^[A-Za-z0-9._:-]{1,160}$/.test(candidates[0].eventId || "")) {
          liveEpgDetailDescription.textContent =
            "Die Public-v1-EPG-Antwort liefert keine eindeutig belegte native Event-ID für diese Sendung.";
          return;
        }
        loadEventDetail(candidates[0].eventId);
      });
  }
  function showEpgRows(rows,append,nowNext) {
    if (!liveEpgList) return;
    if (!append) {
      clearEpgFocusRows();
      liveEpgList.textContent="";
    }
    rows.forEach(function(item,index){
      var eventIndex=liveEpgFocusIds.length;
      var id="live-epg-row-"+eventIndex;
      var node=document.createElement("li");
      node.className="live-epg-event tv-focusable";
      node.tabIndex=-1;
      node.setAttribute("role","button");
      node.setAttribute("data-focus-id",id);
      node.setAttribute("data-epg-index",String(eventIndex));
      node.setAttribute("aria-label",epgRow(item,index,!!nowNext).slice(0,400));
      node.textContent=epgRow(item,index,!!nowNext).slice(0,550);
      controls[id]=node;
      items.push(node);
      liveEpgFocusIds.push(id);
      liveEpgRows.push(item);
      liveEpgList.appendChild(node);
      node.addEventListener("click",function(){
        if (setFocus(id)) selectEpgEvent(item,true);
      });
    });
    liveEpgList.hidden=!liveEpgList.children.length;
    if (!append) {
      liveEpgList.scrollTop=0;
      if (rows.length) selectEpgEvent(rows[0],false);
    }
  }
  function loadSelectedEpg(action) {
    if (!selectedLiveChannel || !liveCredential || !liveBackends.length) {
      if (liveEpgStatus) liveEpgStatus.textContent =
        "Zuerst einen geladenen Sender mit OK auswählen.";
      return;
    }
    var backendId = liveBackends[liveBackendIndex].backendId;
    var channelId = selectedLiveChannel.channelId;
    if (selectedLiveChannel.backendId !== backendId) return;
    var token = ++liveEpgRun;
    if (action === "now") {
      liveWindow = null;
      if (liveEpgStatus) liveEpgStatus.textContent = "EPG Jetzt/Nächste wird geladen …";
      liveMetadata.nowNext(liveCredential,backendId,channelId,
        Math.floor(Date.now()/1000),function(result){
          if (token!==liveEpgRun || currentView!=="live") return;
          if (!result.ok) {
            if (liveEpgStatus) liveEpgStatus.textContent =
              "EPG Jetzt/Nächste: " + mediaMetadataError(result);
            showEpgRows([],false);return;
          }
          showEpgRows(result.value.items,false,true);
          if (liveEpgStatus) liveEpgStatus.textContent = result.value.items.length ?
            "EPG Jetzt/Nächste · "+result.value.items.length+" Einträge" :
            "EPG-Cache enthält keine passenden Sendungen.";
        });
      return;
    }
    if (action==="more" && (!liveWindow || !liveWindow.cursor)) {
      if (liveEpgStatus) liveEpgStatus.textContent = "Keine weitere EPG-Seite.";
      return;
    }
    var previous = action==="more" ? liveWindow.cursor : null;
    if (action!=="more") {
      var from=Math.floor(Date.now()/1000);
      liveWindow={from:from,until:from+86400,cursor:null};
      showEpgRows([],false);
    }
    var scope = liveWindow;
    if (liveEpgStatus) liveEpgStatus.textContent = "24-Stunden-EPG wird geladen …";
    liveMetadata.epgWindow(liveCredential,backendId,channelId,
      scope.from,scope.until,previous,function(result){
        if (token!==liveEpgRun || currentView!=="live" || liveWindow!==scope) return;
        if (!result.ok) {
          if (liveEpgStatus) liveEpgStatus.textContent =
            "EPG-Zeitfenster: "+mediaMetadataError(result);
          return;
        }
        showEpgRows(result.value.items,!!previous);
        scope.cursor = result.value.page.hasMore ?
          result.value.page.nextCursor : null;
        if (liveEpgStatus) liveEpgStatus.textContent =
          "24-Stunden-Programm · "+(scope.cursor ?
            "Weitere Sendungen verfügbar" : "Ende des Zeitfensters");
      });
  }
  // Explicit S6.18 Live-TV API v1 test, never triggered by focusing a channel.
  // STOP releases the server tuner before a new Live-TV session may begin.
  function stopLivePlayback(reason) {
    var session=livePlaybackSession;
    ++livePlayRun; // Fence a pending CREATE response and player callbacks.
    livePlayBusy=false;
    livePlaybackSession=null;
    liveHtml5Player.stop();
    if (livePlayerSurface) livePlayerSurface.hidden=true;
    if (session && !liveTeardownBusy) {
      liveTeardownBusy=true;
      livePlaybackClient.stop(session.credential,session.backendId,session.sessionId,
        function(result) {
          liveTeardownBusy=false;
          if (!result.ok && reason==="user" && currentView==="live")
            liveStatus("error","Live-TV gestoppt · Tunerfreigabe unbestätigt",
              livePlaybackError(result)+" · Backend-Session-Status prüfen.");
        });
    }
    if (reason==="user" && currentView==="live")
      liveStatus("ready","Live-TV beendet",
        session ? "Lokaler Player gestoppt, Public-v1-MediaSession-STOP angefordert." :
          "Live-Start abgebrochen; unbekannte Serverantwort wird nicht erneut angefordert.");
  }
  function startSelectedLive() {
    if (livePlayBusy || livePlaybackSession || liveTeardownBusy) return;
    if (!selectedLiveChannel || !liveCredential || !liveBackends.length ||
        selectedLiveChannel.backendId!==liveBackends[liveBackendIndex].backendId) {
      liveStatus("error","Kein Sender gewählt",
        "Erst Sender laden und einen realen Sender mit OK auswählen.");
      return;
    }
    if (!liveHtml5Player.available()) {
      liveStatus("error","HTML5-Liveplayer fehlt",
        "Dieser erste Device-v1-Live-MP4-Test nutzt HTML5; kein unautorisierter AVPlay-Fallback.");
      return;
    }
    var capabilities=conservativeSamsungCapabilities({document:document});
    if (!capabilities) {
      liveStatus("error","HTML5-MP4-Decoder nicht belegt",
        "Browser meldet keine H.264/AAC-Unterstützung. Kein Medien-POST.");
      return;
    }
    // The published Live Device contract provides only protected progressive
    // fMP4 with an HttpOnly browser cookie, not AVPlay's native COOKIE.
    capabilities.protocols=["progressive"];
    capabilities.containers=["fmp4","mp4"];
    var stored=vault.read();
    if (!stored.ok || !stored.credential ||
        stored.credential.base!==liveCredential.base ||
        stored.credential.credentialId!==liveCredential.credentialId) {
      liveStatus("error","Geräteanmeldung prüfen",
        "Live-TV benötigt die unveränderte sichere Device-Identität.");
      return;
    }
    var credential=stored.credential;
    var backendId=selectedLiveChannel.backendId;
    var channelId=selectedLiveChannel.channelId;
    var token=++livePlayRun;
    livePlayBusy=true;
    liveStatus("loading","Live-MediaSession wird angefordert",
      "POST /api/v1/live-playback-sessions · media.live.play erforderlich.");
    livePlaybackClient.begin(credential,backendId,channelId,capabilities,function(result){
      if (token!==livePlayRun || currentView!=="live") {
        if (result.ok) livePlaybackClient.stop(credential,backendId,result.sessionId,
          function(){});
        return;
      }
      livePlayBusy=false;
      if (!result.ok) {
        liveStatus("error","Live-TV-API v1 abgewiesen",livePlaybackError(result));
        return;
      }
      livePlaybackSession={credential:credential,backendId:backendId,
        sessionId:result.sessionId};
      if (livePlayerSurface) livePlayerSurface.hidden=false;
      if (livePlayerHint) livePlayerHint.textContent=
        "Public v1: live-progressive-fmp4 · HTML5-MP4 · PLAY/PAUSE · STOP/ZURÜCK beendet";
      var active=livePlaybackSession;
      var started=liveHtml5Player.start(result.mediaUrl,function(state,detail){
        if (livePlaybackSession!==active || currentView!=="live") return;
        if (state==="playing") {
          liveStatus("ready","Live-MP4 spielt",
            "HTML5 onplaying · echte Bildbewegung und hörbaren Ton am TV prüfen.");
          if (livePlayerHint) livePlayerHint.textContent=
            "Live-MP4 onplaying · Bild/Ton am Samsung prüfen · STOP beendet und gibt Tuner frei";
        } else if (state==="buffering" || state==="preparing") {
          liveStatus("loading","Live-MP4 "+(state==="buffering"?"puffert":"bereitet vor"),
            "Session bereit · TV-Videoelement wartet auf geschützte Medienbytes.");
        } else if (state==="error" || state==="unsupported") {
          var failure=html5PlaybackDiagnosis(detail);
          liveStatus("loading","Live-MP4-Medienzugriff prüfen",failure);
          // Read only response HEADERS from this same scoped active session.
          probeMediaHttpHeaders(window,result.mediaUrl,function(probe){
            if (livePlaybackSession!==active) return;
            stopLivePlayback("failure");
            liveStatus("error","Live-TV konnte nicht gestartet werden",
              failure+" · "+describeMediaAccessProbe(probe));
          });
        } else if (state==="finished") {
          stopLivePlayback("finished");
          liveStatus("ready","Live-Stream beendet",
            "Live-Sitzung freigegeben; Backend-Logs auf unerwartetes Ende prüfen.");
        }
      });
      if (!started && livePlaybackSession===active) stopLivePlayback("failure");
    });
  }




  // S6.23 – common Web search index, separately authorized Public-v1 reads.
  // EPG and recordings are independent panes (including errors and pagination).
  function globalSearchMessage(message) {
    if(globalSearchStatusLabel)globalSearchStatusLabel.textContent=message;
  }
  function globalSearchPane(kind) {
    return {
      list:document.getElementById("global-search-"+kind),
      status:document.getElementById("global-search-"+(kind==="recordings"?"recording":"epg")+"-status"),
      count:document.getElementById("global-search-"+(kind==="recordings"?"recording":"epg")+"-count")
    };
  }
  function clearGlobalSearchRows() {
    ["recordings","epg"].forEach(function(kind) {
      globalSearchRows[kind].forEach(function(id){
        var node=controls[id];delete controls[id];
        var index=items.indexOf(node);
        if(index!==-1)items.splice(index,1);
      });
      globalSearchRows[kind]=[];
      globalSearchItems[kind]=[];
      globalSearchPages[kind]=null;
      var pane=globalSearchPane(kind);
      if(pane.list){pane.list.textContent="";pane.list.hidden=true;}
      if(pane.count)pane.count.textContent="–";
    });
    if(globalSearchDetailTitle)globalSearchDetailTitle.textContent="Noch kein Treffer ausgewählt";
    if(globalSearchDetailDescription)
      globalSearchDetailDescription.textContent="OK auf einem Treffer zeigt Details aus API v1.";
    ++globalSearchDetailRun;
    globalSearchMetadata.cancel();
  }
  function globalSearchDate(value) {
    var raw=Number(value);
    var date=(isFinite(raw) && raw>0) ?
      new Date(raw<100000000000 ? raw*1000 : raw) : new Date(value);
    return isFinite(date.getTime()) ?
      date.toLocaleString("de-DE",{day:"2-digit",month:"2-digit",
        hour:"2-digit",minute:"2-digit"}) : "Zeit unbekannt";
  }
  function appendGlobalSearchResults(kind,rows) {
    var pane=globalSearchPane(kind);
    if(!pane.list)return;
    rows.forEach(function(row){
      var index=globalSearchItems[kind].length;
      var id="global-search-"+kind+"-row-"+index;
      var node=document.createElement("li");
      node.className="global-search-row tv-focusable";
      node.tabIndex=-1;
      node.setAttribute("role","button");
      node.setAttribute("data-focus-id",id);
      node.setAttribute("data-global-search-kind",kind);
      node.setAttribute("data-global-search-index",String(index));
      node.setAttribute("aria-label",row.title);
      var title=document.createElement("strong");
      title.textContent=row.title;
      var info=document.createElement("span");
      info.textContent=kind==="recordings" ?
        "Aufnahme"+(row.edited?" · bearbeitet":"") :
        globalSearchDate(row.startTime)+
          (row.subtitle?" · "+row.subtitle:"")+
          " · "+row.channelId;
      node.appendChild(title);node.appendChild(info);
      pane.list.appendChild(node);
      pane.list.hidden=false;
      controls[id]=node;items.push(node);
      globalSearchRows[kind].push(id);
      globalSearchItems[kind].push(row);
      node.addEventListener("click",function(){if(setFocus(id))activate(node);});
    });
  }
  function globalSearchBackend() {
    return globalSearchBackends[globalSearchBackendIndex] || null;
  }
  function globalSearchPage(kind,offset,run,term) {
    var backend=globalSearchBackend();
    if(run!==globalSearchRun || !globalSearchCredential || !backend)return;
    var pane=globalSearchPane(kind);
    if(pane.status)pane.status.textContent=
      (kind==="epg"?"EPG":"Aufnahmen")+" werden durchsucht …";
    globalSearchClient.request(globalSearchCredential,backend.backendId,term,
      kind,offset,function(result){
        if(run!==globalSearchRun || currentView!=="search" ||
            globalSearchTerm!==term)return;
        if(!result.ok) {
          if(pane.status)pane.status.textContent=
            publicGlobalSearchError(result,kind);
          if(offset===0 && pane.count)pane.count.textContent="Fehler";
          return;
        }
        if(offset===0) {
          // Start has already cleared the old rows; leave the other pane alone.
          globalSearchPages[kind]=null;
        }
        var value=result.value;
        appendGlobalSearchResults(kind,value.items);
        globalSearchPages[kind]=value.page;
        if(pane.count)pane.count.textContent=value.page.totalCount+" Treffer";
        if(pane.status)pane.status.textContent=
          value.page.totalCount===0 ?
            "Keine passenden "+(kind==="epg"?"Sendungen":"Aufnahmen")+
              " im Suchindex." :
            globalSearchItems[kind].length+" von "+value.page.totalCount+
              " angezeigt · "+(value.page.hasMore?"Weitere Ergebnisse verfügbar":"Ende");
      });
  }
  function performGlobalSearch() {
    if(currentView!=="search" || globalSearchBusy)return;
    var term=globalSearchClient.normalizeQuery(globalSearchInput &&
      globalSearchInput.value);
    if(!term){
      globalSearchMessage("Mindestens zwei Zeichen eingeben; keine Suche gestartet.");
      return;
    }
    var read=vault.read();
    if(!read.ok || !read.credential){
      globalSearchMessage("Gespeicherte Geräteanmeldung fehlt – Einstellungen prüfen.");
      return;
    }
    var base=serverInput && normalizeSuiteBase(serverInput.value);
    if(base && base!==read.credential.base){
      globalSearchMessage("Geräteanmeldung und Serveradresse gehören nicht zusammen.");
      return;
    }
    ++globalSearchRun;
    globalSearchClient.cancel();
    globalSearchCatalog.cancel();
    globalSearchPairing.cancel();
    clearGlobalSearchRows();
    globalSearchCredential=read.credential;
    globalSearchTerm=term;
    var run=globalSearchRun;
    globalSearchBusy=true;
    globalSearchMessage("Prüfe gekoppelte Device-Identität …");
    globalSearchPairing.verify(read.credential,function(result){
      if(run!==globalSearchRun || currentView!=="search")return;
      if(!result.ok){
        globalSearchBusy=false;
        globalSearchMessage(deviceVerificationError(result));return;
      }
      markDeviceAuthenticated(read.credential);
      globalSearchCatalog.listBackends(read.credential,function(backends){
        if(run!==globalSearchRun || currentView!=="search")return;
        globalSearchBusy=false;
        if(!backends.ok || !backends.value.items.length){
          globalSearchMessage(backends.ok?
            "Keine Backends freigegeben." : channelCatalogError(backends));
          return;
        }
        globalSearchBackends=backends.value.items;
        if(globalSearchBackendIndex>=globalSearchBackends.length)
          globalSearchBackendIndex=0;
        var backend=globalSearchBackend();
        if(globalSearchBackendLabel)globalSearchBackendLabel.textContent=
          "Backend: "+backend.name+" · "+backend.backendId;
        globalSearchMessage("Suchbegriff: "+term+
          " · EPG und Aufnahmen werden unabhängig geprüft.");
        globalSearchPage("recordings",0,run,term);
        globalSearchPage("epg",0,run,term);
      });
    });
  }
  function globalSearchAction(action) {
    if(currentView!=="search")return;
    if(action==="clear"){
      ++globalSearchRun;globalSearchBusy=false;
      globalSearchClient.cancel();
      globalSearchCatalog.cancel();
      globalSearchPairing.cancel();
      clearGlobalSearchRows();
      globalSearchTerm="";
      if(globalSearchInput)globalSearchInput.value="";
      globalSearchMessage("Suchbegriff eingeben und Suchen drücken.");
      return;
    }
    if(action==="backend"){
      if(globalSearchBusy || globalSearchBackends.length<2) {
        globalSearchMessage("Kein weiteres Backend verfügbar.");return;
      }
      globalSearchBackendIndex=(globalSearchBackendIndex+1)%
        globalSearchBackends.length;
      ++globalSearchRun;
      globalSearchClient.cancel();
      globalSearchCatalog.cancel();
      globalSearchPairing.cancel();
      clearGlobalSearchRows();
      globalSearchMessage("Backend gewechselt · Suche mit Suchen neu starten.");
      var backend=globalSearchBackend();
      if(globalSearchBackendLabel)globalSearchBackendLabel.textContent=
        "Backend: "+backend.name+" · "+backend.backendId;
      return;
    }
    if(action==="go"){performGlobalSearch();return;}
    if(action!=="recordings-more" && action!=="epg-more")return;
    var kind=action==="epg-more"?"epg":"recordings";
    var page=globalSearchPages[kind];
    if(!page || !page.hasMore || globalSearchItems[kind].length>=300) {
      globalSearchMessage("Für "+(kind==="epg"?"EPG":"Aufnahmen")+
        " ist keine weitere Seite verfügbar.");return;
    }
    globalSearchPage(kind,globalSearchItems[kind].length,
      globalSearchRun,globalSearchTerm);
  }
  function selectGlobalSearchResult(kind,index) {
    var row=globalSearchItems[kind][index],backend=globalSearchBackend();
    if(!row || !backend || row.backendId!==backend.backendId ||
        !globalSearchCredential)return;
    ++globalSearchDetailRun;
    globalSearchMetadata.cancel();
    var token=globalSearchDetailRun,run=globalSearchRun;
    if(globalSearchDetailTitle)globalSearchDetailTitle.textContent=row.title;
    if(globalSearchDetailDescription)
      globalSearchDetailDescription.textContent=
        "Lade "+(kind==="epg"?"EPG-":"Aufnahme-")+"details über API v1 …";
    function finish(result){
      if(token!==globalSearchDetailRun || run!==globalSearchRun ||
          currentView!=="search")return;
      if(!result.ok){
        if(globalSearchDetailDescription)
          globalSearchDetailDescription.textContent=
            mediaMetadataError(result);
        return;
      }
      var data=result.value;
      if(globalSearchDetailTitle)globalSearchDetailTitle.textContent=
        data.title || row.title;
      if(globalSearchDetailDescription) {
        var fields=kind==="epg" ?
          [globalSearchDate(data.startTime)+"–"+
            globalSearchDate(data.endTime),
            data.subtitle||"",data.description||""] :
          [data.recordedAt||"",
            data.durationKnown?Math.round(data.durationSeconds/60)+" Minuten":"",
            data.metadata && data.metadata.overview || data.description ||""];
        globalSearchDetailDescription.textContent=fields.filter(function(x){
          return !!x;
        }).join(" · ").slice(0,2100);
      }
    }
    if(kind==="epg")
      globalSearchMetadata.eventDetail(globalSearchCredential,
        backend.backendId,row.channelId,row.eventId,finish);
    else globalSearchMetadata.recordingDetail(globalSearchCredential,
      backend.backendId,row.recordingId,finish);
  }

  // S6.20: independent saved epgsearch rule browser. A rule is neither an
  // existing native VDR timer nor a Suite TimerAssignment.
  function searchTimerMessage(message) {
    if(searchTimerStatusLabel)searchTimerStatusLabel.textContent=message;
  }
  function clearSearchTimerPreview() {
    if(searchTimerPreviewList) {
      searchTimerPreviewList.textContent="";
      searchTimerPreviewList.hidden=true;
    }
    if(searchTimerPreviewStatus)
      searchTimerPreviewStatus.textContent=
        "EPG-Treffer benötigen zusätzlich epg.view; keine Aufnahmeprognose.";
  }
  function clearSearchTimerRows() {
    searchTimerRows.forEach(function(id) {
      var control=controls[id];
      delete controls[id];
      var found=items.indexOf(control);
      if(found!==-1)items.splice(found,1);
    });
    searchTimerRows=[];
    searchTimerItems=[];
    searchTimerCursor=null;
    selectedSearchTimer=null;
    if(searchTimerList) {
      searchTimerList.textContent="";
      searchTimerList.hidden=true;
    }
    if(searchTimerDetailTitle)searchTimerDetailTitle.textContent="Noch keine Regel gewählt";
    if(searchTimerDetailInfo)searchTimerDetailInfo.textContent=
      "OK auf eine Regel zeigt ihre aktuellen Details.";
    clearSearchTimerPreview();
  }
  function searchTimerState(rule) {
    return rule.state==="active"?"AKTIV":
      rule.state==="inactive"?"INAKTIV":"STATUS UNBEKANNT";
  }
  function appendSearchTimerRows(rules) {
    if(!searchTimerList)return;
    rules.forEach(function(rule) {
      var index=searchTimerItems.length,id="searchtimer-row-"+index;
      var node=document.createElement("li");
      node.className="native-timer-row tv-focusable";
      node.tabIndex=-1;
      node.setAttribute("role","button");
      node.setAttribute("data-focus-id",id);
      node.setAttribute("data-searchtimer-index",String(index));
      node.setAttribute("aria-label",rule.name);
      var name=document.createElement("strong");
      name.textContent=rule.name;
      var info=document.createElement("span");
      info.textContent="Suchbegriff: "+rule.query+" · "+searchTimerState(rule);
      node.appendChild(name);
      node.appendChild(info);
      controls[id]=node;
      items.push(node);
      searchTimerRows.push(id);
      searchTimerItems.push(rule);
      searchTimerList.appendChild(node);
      node.addEventListener("click",function(){if(setFocus(id))activate(node);});
    });
    searchTimerList.hidden=searchTimerItems.length===0;
  }
  function fetchSearchTimerPage(run,cursor) {
    if(run!==searchTimerRun || !searchTimerCredential ||
        !searchTimerBackends.length)return;
    var backend=searchTimerBackends[searchTimerBackendIndex];
    searchTimerBusy=true;
    searchTimerMessage("Lese gespeicherte epgsearch-Suchtimer · "+backend.name+" …");
    searchTimerCatalog.list(searchTimerCredential,backend.backendId,cursor,
      function(result) {
        if(run!==searchTimerRun || currentView!=="timers")return;
        searchTimerBusy=false;
        if(!result.ok) {
          clearSearchTimerRows();
          searchTimerMessage(searchTimerCatalogError(result,false));
          return;
        }
        if(!cursor)clearSearchTimerRows();
        var ruleList=result.value.items;
        if(cursor && searchTimerItems.length && ruleList.length &&
            ruleList[0].searchTimerId<=
              searchTimerItems[searchTimerItems.length-1].searchTimerId) {
          clearSearchTimerRows();
          searchTimerMessage("Suchtimerreihenfolge geändert – bitte neu laden.");
          return;
        }
        var first=searchTimerRows.length;
        appendSearchTimerRows(ruleList);
        searchTimerCursor=result.value.page.hasMore ?
          result.value.page.nextCursor:null;
        if(searchTimerBackendLabel)
          searchTimerBackendLabel.textContent="Backend: "+backend.name+
            " · "+backend.backendId;
        searchTimerMessage(searchTimerItems.length ?
          searchTimerItems.length+" echte Suchtimer geladen · "+
            (searchTimerCursor?"Weitere Seite verfügbar":"Ende der Liste") :
          "Keine gespeicherten Suchtimer für dieses Backend.");
        if(cursor && searchTimerRows[first])setFocus(searchTimerRows[first]);
      });
  }
  function selectSearchTimer(index) {
    if(searchTimerBusy || !searchTimerCredential ||
        !searchTimerBackends.length)return;
    var rule=searchTimerItems[index];
    if(!rule)return;
    selectedSearchTimer=rule;
    ++searchTimerSelectionRun;
    var ticket=searchTimerSelectionRun;
    var backend=searchTimerBackends[searchTimerBackendIndex];
    if(rule.backendId!==backend.backendId)return;
    clearSearchTimerPreview();
    if(searchTimerDetailTitle)searchTimerDetailTitle.textContent=rule.name;
    if(searchTimerDetailInfo)searchTimerDetailInfo.textContent=
      "Suchbegriff: "+rule.query+" · "+searchTimerState(rule)+
      " · Lade aktuellen Regelstand …";
    searchTimerBusy=true;
    searchTimerCatalog.detail(searchTimerCredential,backend.backendId,
      rule.searchTimerId,function(result){
        if(ticket!==searchTimerSelectionRun || currentView!=="timers" ||
            selectedSearchTimer!==rule)return;
        searchTimerBusy=false;
        if(!result.ok) {
          if(searchTimerDetailInfo)
            searchTimerDetailInfo.textContent=searchTimerCatalogError(result,false);
          if(result.kind==="http" && (result.status===403 || result.status===404))
            selectedSearchTimer=null;
          return;
        }
        selectedSearchTimer=result.value;
        if(searchTimerDetailInfo)searchTimerDetailInfo.textContent=
          "Suche: "+result.value.query+" · "+searchTimerState(result.value)+
          " · EPG-Treffer über eigene Schaltfläche ansehen.";
      });
  }
  function searchTimerEventTime(value) {
    if(/^\d{9,11}$/.test(value)) {
      var date=new Date(Number(value)*1000);
      if(!isNaN(date.getTime()))return date.toLocaleString("de-DE");
    }
    return value;
  }
  function loadSearchTimerPreview() {
    if(searchTimerBusy || !selectedSearchTimer || !searchTimerCredential ||
        !searchTimerBackends.length) {
      if(!selectedSearchTimer)
        searchTimerMessage("Zuerst einen gespeicherten Suchtimer mit OK auswählen.");
      return;
    }
    var rule=selectedSearchTimer;
    var backend=searchTimerBackends[searchTimerBackendIndex];
    if(rule.backendId!==backend.backendId)return;
    ++searchTimerSelectionRun;
    var ticket=searchTimerSelectionRun;
    clearSearchTimerPreview();
    searchTimerBusy=true;
    if(searchTimerPreviewStatus)searchTimerPreviewStatus.textContent=
      "Lese EPG-Treffervorschau … searchtimers.view + epg.view";
    searchTimerCatalog.preview(searchTimerCredential,backend.backendId,
      rule.searchTimerId,function(result){
        if(ticket!==searchTimerSelectionRun || currentView!=="timers" ||
            selectedSearchTimer!==rule)return;
        searchTimerBusy=false;
        if(!result.ok) {
          if(searchTimerPreviewStatus)
            searchTimerPreviewStatus.textContent=
              searchTimerCatalogError(result,true);
          return;
        }
        var value=result.value;
        if(searchTimerPreviewStatus)
          searchTimerPreviewStatus.textContent=value.totalCount+
            " EPG-Texttreffer · "+value.items.length+
            " angezeigt · keine garantierten Aufnahmen";
        if(!searchTimerPreviewList)return;
        value.items.forEach(function(event){
          var node=document.createElement("li");
          var title=document.createElement("strong");
          title.textContent=event.title;
          var details=document.createElement("span");
          details.textContent=searchTimerEventTime(event.startTime)+"–"+
            searchTimerEventTime(event.endTime)+" · "+event.channelId+
            (event.subtitle?" · "+event.subtitle:"");
          node.appendChild(title);node.appendChild(details);
          searchTimerPreviewList.appendChild(node);
        });
        searchTimerPreviewList.hidden=value.items.length===0;
      });
  }
  function loadSearchTimers(action) {
    if(searchTimerBusy || currentView!=="timers")return;
    if(action==="preview"){loadSearchTimerPreview();return;}
    if(action==="more") {
      if(!searchTimerCursor || searchTimerItems.length>=300) {
        searchTimerMessage("Keine weitere Seite in dieser Ansicht.");return;
      }
      fetchSearchTimerPage(searchTimerRun,searchTimerCursor);return;
    }
    if(action==="backend") {
      if(!searchTimerCredential || searchTimerBackends.length<2) {
        searchTimerMessage("Kein zweites Backend geladen.");return;
      }
      ++searchTimerRun;
      ++searchTimerSelectionRun;
      searchTimerCatalog.cancel();
      clearSearchTimerRows();
      searchTimerBackendIndex=(searchTimerBackendIndex+1)%
        searchTimerBackends.length;
      fetchSearchTimerPage(searchTimerRun,null);return;
    }
    var read=vault.read();
    if(!read.ok || !read.credential) {
      searchTimerMessage("Geräteanmeldung nicht verfügbar – unter Einstellungen prüfen.");
      return;
    }
    var base=serverInput && normalizeSuiteBase(serverInput.value);
    if(base && base!==read.credential.base) {
      searchTimerMessage("Gespeicherte Anmeldung gehört zu einem anderen Server.");
      return;
    }
    searchTimerCredential=read.credential;
    searchTimerBackends=[];
    searchTimerBackendIndex=0;
    ++searchTimerSelectionRun;
    clearSearchTimerRows();
    var run=++searchTimerRun;
    searchTimerBusy=true;
    searchTimerMessage("Prüfe vorhandene Geräteanmeldung …");
    searchTimerPairing.verify(searchTimerCredential,function(result){
      if(run!==searchTimerRun || currentView!=="timers")return;
      if(!result.ok){
        searchTimerBusy=false;
        searchTimerMessage(deviceVerificationError(result));return;
      }
      markDeviceAuthenticated(searchTimerCredential);
      searchTimerMessage("Lese Public-v1-Backends …");
      searchTimerBackendCatalog.listBackends(searchTimerCredential,function(found){
        if(run!==searchTimerRun || currentView!=="timers")return;
        if(!found.ok || !found.value.items.length) {
          searchTimerBusy=false;
          searchTimerMessage(found.ok?"Keine lesbaren Backends.":
            channelCatalogError(found));return;
        }
        searchTimerBackends=found.value.items;
        fetchSearchTimerPage(run,null);
      });
    });
  }

  // S6.19: one real native VDR timer inventory (not TimerAssignments).
  // No POST, no client-side timer construction and no cross-backend fanout.
  function nativeTimerStatus(state,title,description) {
    var node=document.getElementById("detail-state-timers");
    var badge=document.getElementById("detail-state-badge-timers");
    var headline=document.getElementById("detail-state-title-timers");
    var info=document.getElementById("detail-state-description-timers");
    var skeleton=document.getElementById("detail-state-skeleton-timers");
    if(node) node.setAttribute("data-state",state);
    if(badge) badge.textContent=state==="ready"?"TIMER" :
      state==="loading"?"LÄDT" : state==="error"?"FEHLER" :
      state==="empty"?"LEER":"OFFLINE";
    if(headline) headline.textContent=title;
    if(info) info.textContent=description;
    if(skeleton) skeleton.hidden=state!=="loading";
  }
  function clearNativeTimerRows() {
    nativeTimerRows.forEach(function(id) {
      var element=controls[id];
      delete controls[id];
      var index=items.indexOf(element);
      if(index!==-1) items.splice(index,1);
    });
    nativeTimerRows=[];
    nativeTimerItems=[];
    nativeTimerNextOffset=null;
    if(nativeTimerList) {
      nativeTimerList.textContent="";
      nativeTimerList.hidden=true;
    }
  }
  function nativeTimerClock(value) {
    return /^([01][0-9]|2[0-3])[0-5][0-9]$/.test(value) ?
      value.slice(0,2)+":"+value.slice(2) : value;
  }
  function nativeTimerSchedule(item) {
    var day=/^[0-9]{8}$/.test(item.day) ?
      item.day.slice(6,8)+"."+item.day.slice(4,6)+"."+item.day.slice(0,4) :
      (item.weekdays || "Wiederholung");
    return day+" · "+nativeTimerClock(item.startTime)+
      "–"+nativeTimerClock(item.endTime);
  }
  function appendNativeTimerRows(rows) {
    if(!nativeTimerList) return;
    rows.forEach(function(timer) {
      var index=nativeTimerItems.length,id="native-timer-row-"+index;
      var row=document.createElement("li");
      row.className="native-timer-row tv-focusable";
      row.tabIndex=-1;
      row.setAttribute("role","button");
      row.setAttribute("data-focus-id",id);
      row.setAttribute("data-native-timer-index",String(index));
      row.setAttribute("aria-label",timer.title);
      var name=document.createElement("strong");
      name.textContent=timer.title || "Timer ohne Titel";
      var info=document.createElement("span");
      var status=timer.recording?"AUFNAHME LÄUFT":
        timer.pending?"ANSTEHEND":timer.enabled?"AKTIV":"DEAKTIVIERT";
      info.textContent=nativeTimerSchedule(timer)+" · "+
        (timer.channelName || timer.channelId)+" · "+status;
      row.appendChild(name);row.appendChild(info);
      controls[id]=row;items.push(row);nativeTimerRows.push(id);
      nativeTimerItems.push(timer);
      nativeTimerList.appendChild(row);
      row.addEventListener("click",function(){if(setFocus(id))activate(row);});
    });
    nativeTimerList.hidden=nativeTimerItems.length===0;
  }
  function fetchNativeTimerPage(run,offset) {
    if(run!==nativeTimerRun || !nativeTimerCredential ||
        !nativeTimerBackends.length) return;
    var backend=nativeTimerBackends[nativeTimerBackendIndex];
    nativeTimerBusy=true;
    nativeTimerStatus("loading","Lese VDR-Timer",
      backend.name+" · "+offset+" bis "+(offset+29)+" · nur lesend");
    nativeTimerCatalog.list(nativeTimerCredential,backend.backendId,offset,function(result){
      if(run!==nativeTimerRun || currentView!=="timers") return;
      nativeTimerBusy=false;
      if(!result.ok) {
        clearNativeTimerRows();
        nativeTimerStatus("error","VDR-Timer nicht verfügbar",
          nativeTimerCatalogError(result));
        return;
      }
      if(offset===0) clearNativeTimerRows();
      var first=nativeTimerRows.length;
      appendNativeTimerRows(result.value.items);
      nativeTimerNextOffset=result.value.page.hasMore ?
        result.value.page.nextOffset:null;
      if(nativeTimerBackendName) nativeTimerBackendName.textContent=
        "Backend: "+backend.name+" · "+backend.backendId;
      nativeTimerStatus(nativeTimerItems.length?"ready":"empty",
        nativeTimerItems.length ?
          nativeTimerItems.length+" echte VDR-Timer" : "Keine VDR-Timer vorhanden",
        "Nur native Timer · "+(nativeTimerNextOffset===null ?
          "Ende der Liste" : "Weitere Timer verfügbar")+
        " · OK zeigt Timerdetails; keine Mutation.");
      if(offset!==0 && nativeTimerRows[first])setFocus(nativeTimerRows[first]);
    });
  }
  function loadNativeTimers(action) {
    if(nativeTimerBusy || currentView!=="timers")return;
    if(action==="more") {
      if(nativeTimerNextOffset===null || nativeTimerItems.length>=300) {
        nativeTimerStatus(nativeTimerItems.length?"ready":"empty",
          "Keine weitere Timerseite","Bis zu 300 Timer pro Ansicht; neu laden für weitere Abfragen.");
        return;
      }
      fetchNativeTimerPage(nativeTimerRun,nativeTimerNextOffset);return;
    }
    if(action==="backend") {
      if(!nativeTimerCredential || nativeTimerBackends.length<2) {
        nativeTimerStatus("empty","Kein zweites Backend",
          "Nur ein lesbares Backend bekannt.");return;
      }
      nativeTimerBackendIndex=(nativeTimerBackendIndex+1)%nativeTimerBackends.length;
      nativeTimerCatalog.cancel();
      clearNativeTimerRows();
      fetchNativeTimerPage(++nativeTimerRun,0);return;
    }
    var saved=vault.read();
    if(!saved.ok || !saved.credential) {
      nativeTimerStatus("error","Geräteanmeldung fehlt",
        "Gekoppelte DEV-App unter Einstellungen prüfen; nicht neu koppeln.");
      return;
    }
    var base=serverInput && normalizeSuiteBase(serverInput.value);
    if(base && base!==saved.credential.base) {
      nativeTimerStatus("error","Anderer Server",
        "Die vorhandene Geräteanmeldung gehört zu einem anderen Server.");
      return;
    }
    nativeTimerCredential=saved.credential;
    nativeTimerBackends=[];
    nativeTimerBackendIndex=0;
    clearNativeTimerRows();
    nativeTimerCatalog.cancel();
    var run=++nativeTimerRun;
    nativeTimerBusy=true;
    nativeTimerStatus("loading","Prüfe Geräteanmeldung",
      "Lesender Public-v1-Zugriff; timers.view erforderlich.");
    pairingClient.verify(nativeTimerCredential,function(result){
      if(run!==nativeTimerRun || currentView!=="timers")return;
      if(!result.ok) {
        nativeTimerBusy=false;
        nativeTimerStatus("error","Geräteanmeldung abgewiesen",
          deviceVerificationError(result));
        return;
      }
      markDeviceAuthenticated(nativeTimerCredential);
      nativeTimerStatus("loading","Suche Backend","Public-v1-Backendliste wird gelesen.");
      channelCatalog.listBackends(nativeTimerCredential,function(found){
        if(run!==nativeTimerRun || currentView!=="timers")return;
        if(!found.ok || !found.value.items.length) {
          nativeTimerBusy=false;
          nativeTimerStatus("error","Backendliste nicht verfügbar",
            found.ok ? "Keine berechtigten Backends gefunden." : channelCatalogError(found));
          return;
        }
        nativeTimerBackends=found.value.items;
        fetchNativeTimerPage(run,0);
      });
    });
  }

  function clearLiveRows() {
    if (currentView === "live" && liveFocusIds.indexOf(focusedId) >= 0)
      setFocus("detail-live-preview");
    liveFocusIds.forEach(function (id) {
      var item = controls[id];
      delete controls[id];
      var index = items.indexOf(item);
      if (index !== -1) items.splice(index, 1);
    });
    liveFocusIds = [];
    liveCurrentChannels = [];
    clearLiveEpg();
    liveRows = 0;
    // Drop stale dynamic channel-row memories, but preserve the user's last
    // focus on the static Live action row (e.g. Sender laden).
    if (rowMemory.live) {
      var lastAction = rowMemory.live[1];
      rowMemory.live = {};
      if (["detail-live-home","detail-live-preview","detail-live-more",
           "detail-live-backend","detail-live-play","detail-live-epg-now",
           "detail-live-epg-window","detail-live-epg-more"].indexOf(lastAction) !== -1)
        rowMemory.live[1] = lastAction;
    }
    if (liveList) {
      liveList.textContent = "";
      liveList.hidden = true;
    }
  }

  function showLiveError(result) {
    clearLiveRows();
    liveCursor = null;
    liveStatus("error", "Sender nicht verfügbar", channelCatalogError(result));
  }

  function appendLiveRows(channels) {
    if (!liveList) return;
    channels.forEach(function (ch) {
      // Same single D-Pad focus owner as recordings; no separate key handler.
      // Untrusted server text is inserted only via textContent.
      var index = liveCurrentChannels.length;
      var id = "channel-row-" + String(index);
      var row = document.createElement("li");
      row.className = "live-channel-row tv-focusable";
      row.tabIndex = -1;
      row.setAttribute("role", "button");
      row.setAttribute("data-focus-id", id);
      row.setAttribute("data-channel-index", String(index));
      row.setAttribute("aria-label", String(ch.channelNumber) + " · " + ch.name);
      var name = document.createElement("strong");
      name.textContent = String(ch.channelNumber) + " · " + ch.name;
      var meta = document.createElement("span");
      var details = [];
      if (ch.groupName) details.push(ch.groupName);
      if (ch.provider) details.push(ch.provider);
      if (ch.radio) details.push("Radio");
      if (ch.encrypted) details.push("Verschlüsselt");
      if (!ch.enabled) details.push("Deaktiviert");
      meta.textContent = details.join(" · ");
      row.appendChild(name);
      row.appendChild(meta);
      controls[id] = row;
      items.push(row);
      liveFocusIds.push(id);
      liveCurrentChannels.push(ch);
      liveList.appendChild(row);
      liveRows += 1;
      row.addEventListener("click", function () {
        if (setFocus(id)) activate(row);
      });
    });
    liveList.hidden = liveRows === 0;
  }

  function fetchLivePage(run, cursor) {
    if (!liveCredential || !liveBackends.length || run !== liveRun) return;
    var backend = liveBackends[liveBackendIndex];
    liveBusy = true;
    liveStatus("loading", "Lade Sender", backend.name + " · maximal 20 Sender pro Seite");
    channelCatalog.listChannels(liveCredential, backend.backendId, cursor, function (result) {
      if (run !== liveRun) return;
      liveBusy = false;
      if (!result.ok) { showLiveError(result); return; }
      var response = result.value;
      if (!cursor) clearLiveRows();
      var firstNewRow = liveFocusIds.length;
      var jumpToNewPage = !!cursor && focusedId === "detail-live-more";
      appendLiveRows(response.items);
      liveCursor = response.page.hasMore ? response.page.nextCursor : null;
      if (liveBackendName) liveBackendName.textContent =
        "Backend: " + backend.name + " · " + backend.backendId;
      var partial = response.meta.partial ?
        " · Mindestens eine Backend-Quelle ist nicht erreichbar." : "";
      liveStatus(liveRows ? "ready" : "empty",
        liveRows ? String(liveRows) + " echte Sender geladen" : "Keine Sender gefunden",
        "Nur freigegebene Senderdaten · " +
        (liveCursor ? "Weitere Seite über „Mehr Sender“" : "Ende der Senderliste") + partial +
        " · Sender mit OK wählen; „Live-TV testen“ startet explizit eine Device-MediaSession.");
      if (jumpToNewPage && liveFocusIds[firstNewRow])
        setFocus(liveFocusIds[firstNewRow]);
    });
  }

  function loadLiveChannels(action) {
    if (liveBusy || livePlayBusy || livePlaybackSession || liveTeardownBusy) return;
    if (action === "more") {
      if (!liveCursor) {
        liveStatus(liveRows ? "ready" : "empty", "Keine weitere Seite",
          "„Sender laden“ startet einen neuen Abruf."); return;
      }
      fetchLivePage(liveRun, liveCursor);
      return;
    }
    if (action === "backend") {
      if (liveBackends.length < 2 || !liveCredential) {
        liveStatus(liveRows ? "ready" : "empty", "Kein weiteres Backend",
          "Es wurde nur ein freigegebenes Backend gefunden."); return;
      }
      liveBackendIndex = (liveBackendIndex + 1) % liveBackends.length;
      liveCursor = null;
      clearLiveRows();
      fetchLivePage(++liveRun, null);
      return;
    }
    // Always re-read the persisted Tizen KeyManager after restart. No login
    // secret is ever stored in localStorage, or copied into UI/error messages.
    var saved = vault.read();
    if (!saved.ok) {
      liveStatus("error", "Sicherer Gerätespeicher nicht lesbar",
        "KeyManager-Zugriff vorübergehend fehlgeschlagen. Anmeldung erneut prüfen; nicht neu koppeln.");
      return;
    }
    if (!saved.credential) {
      showLiveError({kind:"invalid_credential"});
      return;
    }
    var selectedBase = serverInput && normalizeSuiteBase(serverInput.value);
    if (selectedBase && selectedBase !== saved.credential.base) {
      liveStatus("error", "Anderer Server ausgewählt",
        "Die sichere Geräteanmeldung gehört zu einem anderen Server. Adresse prüfen; nicht erneut koppeln.");
      return;
    }
    liveCredential = saved.credential;
    liveCursor = null;
    liveBackends = [];
    liveBackendIndex = 0;
    clearLiveRows();
    liveBusy = true;
    var run = ++liveRun;
    liveStatus("loading", "Prüfe Geräteanmeldung", "Anmeldung mit dem gespeicherten Tizen-Credential …");
    pairingClient.verify(liveCredential, function (verified) {
      if (run !== liveRun) return;
      if (!verified.ok) {
        updateVerificationFailure(liveCredential, verified);
        liveBusy = false;
        showLiveError(verified);
        return;
      }
      markDeviceAuthenticated(liveCredential);
      liveStatus("loading", "Prüfe freigegebene Backends", "Public API v1 · Geräteberechtigungen");
      channelCatalog.listBackends(liveCredential, function (found) {
        if (run !== liveRun) return;
        if (!found.ok) {
          liveBusy = false;
          showLiveError(found);
          return;
        }
        liveBackends = found.value.items;
        if (!liveBackends.length) {
          liveBusy = false;
          liveStatus("empty", "Keine Backends freigegeben",
            "Der Administrator muss den Senderzugriff für ein Backend freigeben.");
          return;
        }
        if (found.value.page.hasMore) {
          liveStatus("loading", "Backends gefunden", "Die ersten 30 freigegebenen Backends werden angeboten.");
        }
        fetchLivePage(run, null);
      });
    });
  }

  function recordingStatus(state, title, description) {
    var card = document.getElementById("detail-state-recordings");
    var badge = document.getElementById("detail-state-badge-recordings");
    var headline = document.getElementById("detail-state-title-recordings");
    var explanation = document.getElementById("detail-state-description-recordings");
    var skeleton = document.getElementById("detail-state-skeleton-recordings");
    if (card) card.setAttribute("data-state", state);
    if (badge) badge.textContent = state === "ready" ? "AUFNAHMEN" :
      state === "loading" ? "LÄDT" : state === "error" ? "FEHLER" :
      state === "empty" ? "LEER" : "OFFLINE";
    if (headline) headline.textContent = title;
    if (explanation) explanation.textContent = description;
    if (skeleton) skeleton.hidden = state !== "loading";
  }

  function clearRecordingPoster() {
    if (recordingPoster) {
      recordingPoster.hidden=true;
      recordingPoster.removeAttribute("src");
    }
    if (recordingPosterUrl && window.URL &&
        typeof window.URL.revokeObjectURL==="function")
      window.URL.revokeObjectURL(recordingPosterUrl);
    recordingPosterUrl=null;
  }
  function fetchRecordingDetails(recording) {
    recordingMetadata.cancel();
    clearRecordingPoster();
    var token=++recordingDetailRun;
    var credential=recordingCredential;
    var backend=recordingBackends[recordingBackendIndex];
    if (!credential || !backend || !recording || !recording.recordingId) return;
    var backendId=backend.backendId,recId=recording.recordingId;
    if (recordingDetailInfo) recordingDetailInfo.textContent =
      "Aufnahmedetails werden geladen …";
    function current() {
      return token===recordingDetailRun && currentView==="recordings" &&
        recordingSelected && recordingSelected.recordingId===recId &&
        recordingBackends[recordingBackendIndex] &&
        recordingBackends[recordingBackendIndex].backendId===backendId;
    }
    recordingMetadata.recordingDetail(credential,backendId,recId,function(detail){
      if (!current()) return;
      if (!detail.ok) {
        if (recordingDetailInfo) recordingDetailInfo.textContent =
          "Aufnahmedetails: "+mediaMetadataError(detail);
        return;
      }
      var item=detail.value,meta=item.metadata,fields=[];
      fields.push((item.title || recording.title || "Aufnahme").slice(0,180));
      fields.push(meta.contentKind==="series-episode" ? "Serienepisode" :
        meta.contentKind==="series" ? "Serie" :
        meta.contentKind==="movie" ? "Film" : "VDR-Aufnahme");
      if (meta.providerTitle && meta.providerTitle!==item.title)
        fields.push("Originaltitel: "+meta.providerTitle.slice(0,180));
      if (meta.seriesTitle) fields.push("Serie: "+meta.seriesTitle.slice(0,150));
      if (meta.episodeTitle) fields.push("Episode: "+meta.episodeTitle.slice(0,150));
      if (meta.subtitle && !meta.episodeTitle)
        fields.push("Untertitel: "+meta.subtitle.slice(0,150));
      var episode=[];
      if (meta.seasonNumber!==undefined) episode.push("Staffel "+meta.seasonNumber);
      if (meta.episodeNumber!==undefined) episode.push("Folge "+meta.episodeNumber);
      if (episode.length) fields.push(episode.join(" · "));
      if (meta.genreText) {
        var genres=meta.genreText.replace(/^\[|\]$/g,"").split("|").filter(function(x){return !!x;});
        fields.push("Genre: "+genres.join(" · ").slice(0,180));
      }
      if (meta.releaseDate) fields.push("Erscheinung: "+meta.releaseDate.slice(0,64));
      if (item.recordedAt) {
        var rawDate=item.recordedAt;
        var value=/^\d{10}$/.test(rawDate) ? new Date(Number(rawDate)*1000) :
          /^\d{13}$/.test(rawDate) ? new Date(Number(rawDate)) : new Date(rawDate);
        var readable=isFinite(value.getTime()) ?
          value.toLocaleDateString("de-DE",{year:"numeric",month:"2-digit",day:"2-digit"})+
          " · "+value.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) :
          rawDate.replace("T"," ").slice(0,32);
        fields.push("Aufgenommen: "+readable);
      }
      if (item.durationKnown) fields.push("Laufzeit: "+Math.round(item.durationSeconds/60)+" Min.");
      if (meta.tagline) fields.push(meta.tagline.slice(0,220));
      if (meta.overview) fields.push("Inhalt: "+meta.overview.slice(0,1800));
      else if (item.description) fields.push("Inhalt: "+item.description.slice(0,1800));
      if (meta.state==="absent") fields.push("Keine erweiterten Metadaten verfügbar");
      if (meta.state==="partial") fields.push("Weitere Metadaten nicht vollständig");
      if (recordingDetailInfo) recordingDetailInfo.textContent=fields.join("\n");
      recordingMetadata.artworkList(credential,backendId,recId,function(art){
        if (!current()) return;
        if (!art.ok) {
          if (recordingDetailInfo) recordingDetailInfo.textContent +=
            " · Artwork: "+mediaMetadataError(art);
          return;
        }
        var list=art.value.items;
        if (!list.length) {
          if (recordingDetailInfo) recordingDetailInfo.textContent+=" · Kein Artwork";
          return;
        }
        if (recordingDetailInfo)
          recordingDetailInfo.textContent+=" · "+list.length+" Artwork-Referenz(en)";
        var poster=list.filter(function(x){return x.kind==="poster";})[0];
        if (!poster || !recordingPoster || !window.Blob || !window.URL ||
            typeof window.URL.createObjectURL!=="function") return;
        recordingMetadata.artworkBytes(credential,backendId,recId,
          poster.artworkId,function(img){
            if (!current() || !img.ok) return;
            // Authenticated image bytes only; never use server-returned URLs.
            try {
              var objectUrl=window.URL.createObjectURL(
                new window.Blob([img.value.bytes],{type:img.value.contentType}));
              clearRecordingPoster();
              recordingPosterUrl=objectUrl;
              recordingPoster.src=objectUrl;
              recordingPoster.hidden=false;
            } catch (_) {clearRecordingPoster();}
          });
      });
    });
  }
  function clearRecordingRows() {
    recordingMetadata.cancel();
    recordingDetailRun += 1;
    clearRecordingPoster();
    if (recordingDetailInfo) recordingDetailInfo.textContent =
      "Aufnahme mit OK auswählen, um Metadaten und Artwork anzufordern.";
    recordingSelected = null;
    if (recordingFocusIds.indexOf(focusedId) >= 0 &&
        currentView === "recordings")
      setFocus("detail-recordings-load");
    recordingFocusIds.forEach(function (id) {
      var item = controls[id];
      delete controls[id];
      var index = items.indexOf(item);
      if (index !== -1) items.splice(index, 1);
    });
    recordingFocusIds = [];
    recordingCurrentPageItems = [];
    recordingSelected = null; // Changing folder/page must not play an old selection.
    if (rowMemory.recordings) rowMemory.recordings = {};
    if (!recordingList) return;
    recordingList.textContent = "";
    recordingList.hidden = true;
  }

  function showRecordingError(result) {
    clearRecordingRows();
    recordingStatus("error", "Aufnahmen nicht verfügbar", recordingCatalogError(result));
  }

  function showRecordingRows(rows) {
    clearRecordingRows();
    if (!recordingList) return;
    recordingCurrentPageItems = rows.slice();
    rows.forEach(function (recording, index) {
      // One focus owner: dynamic list items join the existing D-Pad graph.
      var row = document.createElement("li");
      var id = "recording-row-" + String(index);
      row.className = "recording-row tv-focusable";
      row.tabIndex = -1;
      row.setAttribute("role", "button");
      row.setAttribute("data-focus-id", id);
      if (recording.kind === "folder")
        row.setAttribute("data-folder-index", String(index));
      else row.setAttribute("data-recording-index", String(index));
      row.setAttribute("aria-label", recording.kind === "folder" ?
        "VDR-Ordner " + recording.name : (recording.title || "Aufnahme ohne Titel"));
      controls[id] = row;
      items.push(row);
      recordingFocusIds.push(id);
      var title = document.createElement("strong");
      title.textContent = recording.kind === "folder" ?
        "Ordner: " + recording.name : (recording.title || "Ohne Titel");
      var details = document.createElement("span");
      var info = [];
      if (recording.kind === "folder") info.push(String(recording.recordingCount) + " Aufnahmen");
      if (recording.recordedAt) {
        info.push("Aufgenommen: " +
          recording.recordedAt.replace("T", " ").slice(0, 16));
      }
      if (recording.durationKnown)
        info.push(Math.round(recording.durationSeconds / 60) + " Min.");
      if (recording.edited) info.push("Geschnitten");
      if (recording.sizeMb > 0) info.push(Math.round(recording.sizeMb) + " MB");
      details.textContent = info.join(" · ");
      row.appendChild(title);
      row.appendChild(details);
      recordingList.appendChild(row);
      row.addEventListener("click", function () {
        if (setFocus(id)) activate(row);
      });
    });
    recordingList.hidden = rows.length === 0;
    recordingList.scrollTop = 0;
  }

  function stopRecordingPlayback(reason) {
    recordingControlSequence++;
    // The stop request is a SECONDARY cleanup operation. A late timeout may
    // never overwrite an earlier AVPlay/decoder/media-access failure.
    if (recordingTeardownBusy) return;
    recordingPlaybackClient.cancel();
    recordingPlayer.stop();
    recordingHtml5Player.stop();
    recordingPlayerMode = "avplay";
    if (recordingHtml5Video) recordingHtml5Video.hidden = true;
    if (recordingAvplayObject) recordingAvplayObject.hidden = false;
    if (recordingPlayerSurface) recordingPlayerSurface.hidden = true;
    document.documentElement.classList.remove("recording-avplay-active");
    var session = recordingPlaybackSession;
    recordingPlaybackSession = null;
    recordingPlayBusy = false;
    if (session && session.credential) {
      recordingTeardownBusy = true;
      recordingPlaybackClient.stop(session.credential,session.backendId,
        session.sessionId,function (result) {
          recordingTeardownBusy = false;
          // Report cleanup failure only after an explicit user STOP/BACK;
          // never mask the native player failure that triggered cleanup.
          if (reason === "user" && currentView === "recordings" && !result.ok)
            recordingStatus("error","AVPlay gestoppt · Session-Stop unbestätigt",
              recordingPlaybackError(result) + " · Server-Idle-Timeout kann aufräumen.");
        });
    }
    if (reason === "user") recordingStatus("ready",
      session ? "Wiedergabe beendet" : "Wiedergabeversuch abgebrochen",
      session ? "Player lokal gestoppt; MediaSession-Stop angefordert." :
        "Player abgebrochen, bevor eine MediaSession bestätigt wurde. Ein unbekanntes Server-Ergebnis wird nicht erneut angefordert.");
  }
  function startSelectedRecording(mode) {
    recordingControlSequence++;
    // Explicit manual transport comparison, never automatic fallback.
    var aacHlsTsTest = mode === "aac-hls";
    mode = mode === "html5" ? "html5" : "avplay";
    if (recordingPlayBusy || recordingPlaybackSession) return;
    if (recordingTeardownBusy) {
      recordingStatus("loading","Vorige MediaSession wird beendet",
        "Bitte erst den Server-Stop abschließen, dann erneut Wiedergabe testen.");
      return;
    }
    if (!recordingSelected || !recordingCredential || !recordingBackends.length) {
      recordingStatus("error","Keine Aufnahme ausgewählt",
        "Zuerst eine Aufnahme per OK markieren, dann „Wiedergabe testen“ wählen.");
      return;
    }
    if (mode === "avplay" && !recordingPlayer.available()) {
      recordingStatus("error","AVPlay nicht verfügbar",
        "Samsung AVPlay API fehlt. Gerät/Runtime prüfen.");
      return;
    }
    if (mode === "html5" && !recordingHtml5Player.available()) {
      recordingStatus("error","HTML5-Video nicht verfügbar",
        "Browser-Videoelement fehlt; keine neue MediaSession gestartet.");
      return;
    }
    var caps = aacHlsTsTest ?
      samsungAacHlsTsCapabilities({document:document}) :
      conservativeSamsungCapabilities({document:document});
    if (!caps) {
      recordingStatus("error","Decoderprobe unklar",
        "H.264/AAC-Unterstützung nicht nachgewiesen; keine Fähigkeiten erfinden.");
      return;
    }
    if (mode === "html5") {
      // Only direct progressive MP4 is a candidate for the HTML5 <video>.
      // Never claim the browser supports native MPEG-TS or HLS here.
      caps.protocols = ["progressive"];
      caps.containers = ["mp4","fmp4"];
    }
    var safe = vault.read();
    if (!safe.ok || !safe.credential ||
        safe.credential.credentialId !== recordingCredential.credentialId ||
        safe.credential.base !== recordingCredential.base) {
      recordingStatus("error","Geräteanmeldung prüfen",
        "KeyManager-Credential vor Playback nicht mehr identisch.");
      return;
    }
    var backendId = recordingBackends[recordingBackendIndex].backendId;
    var rec = recordingSelected;
    recordingPlayBusy = true;
    recordingStatus("loading","MediaSession wird angefordert",
      rec.title + (aacHlsTsTest ? " · HLS-TS/AAC Stereo gezielt angefordert" :
        " · media.recording.play erforderlich"));
    recordingPlaybackClient.begin(safe.credential,backendId,rec.recordingId,caps,
      function (result) {
        recordingPlayBusy = false;
        if (currentView !== "recordings") {
          if (result.ok) recordingPlaybackClient.stop(safe.credential,backendId,
            result.sessionId,function () {});
          return;
        }
        if (!result.ok) {
          recordingStatus("error","Wiedergabe verweigert",recordingPlaybackError(result));
          return;
        }
        recordingPlaybackSession = {
          credential:safe.credential,backendId:backendId,sessionId:result.sessionId
        };
        // The comparison test must not silently use direct TS/MP4 or fMP4 HLS.
        // Reject and STOP this owned MediaSession if the server chose otherwise.
        if (aacHlsTsTest && (result.profile !== "hls-ts" ||
            !/\/hls\/master\.m3u8$/.test(result.mediaUrl))) {
          stopRecordingPlayback("failure");
          recordingStatus("error","HLS-TS/AAC-Profil nicht bereitgestellt",
            "Serverantwort passt nicht zum expliziten AAC-HLS-TS-Test. Sitzung beendet.");
          return;
        }
        if (mode === "html5" &&
            !/\/recording\/stream\.mp4$/.test(result.mediaUrl)) {
          stopRecordingPlayback("failure");
          recordingStatus("error","HTML5-Test benötigt MP4",
            "Der Server hat kein progressives MP4 ausgewählt. Bitte eine passende Aufnahme wählen.");
          return;
        }
        if (mode === "avplay" && !result.nativeCookie) {
          stopRecordingPlayback("failure");
          recordingStatus("error","Nativer Medienzugang fehlt",
            "Backend liefert noch keinen Device-MediaSession-Cookie. " +
            "Server- und Samsung-Version prüfen.");
          return;
        }
        recordingPlayerMode = mode;
        if (recordingLifecycleHint) recordingLifecycleHint.textContent =
          mode === "avplay" ? "AVPlay · MediaSession bereit · Player wird vorbereitet" :
            "HTML5 MP4 · Player wird vorbereitet · 12s Startdiagnose";
        if (recordingAudioHint) recordingAudioHint.textContent =
          aacHlsTsTest ? "Audio · HLS-TS mit AAC Stereo angefordert; auf AVPlay-Spuren warten" :
          mode === "avplay" ? "Audio · prüfe native AVPlay-Spuren …" :
            "Audio · HTML5 ohne AVPlay-Spurdiagnose";
        if (recordingRemoteHint) recordingRemoteHint.textContent =
          "Fernbedienung · "+remoteSummary+" · OK/PLAY-PAUSE schaltet um · STOP/ZURÜCK beendet";
        if (recordingAvplayObject) recordingAvplayObject.hidden = mode === "html5";
        if (recordingHtml5Video) recordingHtml5Video.hidden = mode !== "html5";
        if (recordingPlayerSurface) {
          // Show the full-screen AVPlay object and uncover the native video plane.
          recordingPlayerSurface.hidden = false;
          document.documentElement.classList.add("recording-avplay-active");
        }
        var transport = /\/hls\/master\.m3u8$/.test(result.mediaUrl) ? "HLS" :
          /\/recording\/stream\.ts$/.test(result.mediaUrl) ? "TS" :
          /\/recording\/stream\.mp4$/.test(result.mediaUrl) ? "MP4" : "unbekannt";
        var player = mode === "html5" ? recordingHtml5Player : recordingPlayer;
        var started = player.start(result.mediaUrl,function (state,detail) {
          if (state === "playing") {
            if (recordingLifecycleHint) recordingLifecycleHint.textContent =
              mode === "html5" ? "HTML5 · onplaying empfangen · Bild/Ton prüfen" :
                "AVPlay · play() ausgeführt · Bild/Ton prüfen";
            recordingStatus("ready",mode === "html5" ? "HTML5-Wiedergabe läuft" : "AVPlay-Play ausgelöst",rec.title +
              " · Bild/Ton am TV prüfen · PLAY/PAUSE pausieren · STOP oder Zurück beendet.");
          } else if (state === "progress" && mode === "avplay") {
            // Samsung timeline callbacks measure the demux clock, not video
            // frames or audibility; report exactly what the TV observed.
            if (recordingLifecycleHint && detail &&
                typeof detail.seconds==="number") {
              recordingLifecycleHint.textContent="AVPlay-Zeit " +
                Math.floor(detail.seconds/60)+":"+
                ("0"+detail.seconds%60).slice(-2)+
                " · Fortschritt "+detail.deltaSeconds+"s · Bild/Ton separat prüfen";
            }
          } else if (state === "audio" && mode === "avplay") {
            if (recordingAudioHint) {
              var mismatch = aacHlsTsTest && detail &&
                Array.isArray(detail.tracks) &&
                detail.tracks.some(function(t) {return t.codec==="MPEG";});
              recordingAudioHint.textContent = describeSamsungAudio(detail)+
                (mismatch ? " · ACHTUNG: TV meldet MPEG trotz AAC-Anforderung" : "")+
                " | "+samsungTvSoundStatus(window);
            }
          } else if (state === "preparing" || state === "buffering") {
            if (recordingLifecycleHint) recordingLifecycleHint.textContent =
              (mode === "html5" ? "HTML5" : "AVPlay") + " · " +
              (state === "buffering" ? "Pufferung – auf Daten warten" : "Vorbereitung läuft");
            recordingStatus("loading",mode === "html5" ? "HTML5-Video startet" : "Samsung AVPlay startet",rec.title +
              " · " + transport + " · " + (state === "buffering" ? "Pufferung" : "Vorbereitung"));
          } else if (state === "ready") {
            if (recordingLifecycleHint) recordingLifecycleHint.textContent =
              "AVPlay · Pufferung abgeschlossen · Bild/Ton prüfen";
            recordingStatus("ready","AVPlay-Pufferung abgeschlossen",
              rec.title + " · Decoder und Tonausgabe auf dem TV prüfen.");
          } else if (state === "error" || state === "unsupported") {
            // The media gateway permits GET, not HEAD. Probe only the response
            // headers of the very same protected session while still active.
            // This does NOT prove what cookies native AVPlay transmits.
            var failedSession = recordingPlaybackSession;
            var playerFailure = mode === "html5"
              ? html5PlaybackDiagnosis(detail)
              : samsungPlaybackDiagnosis(detail,transport);
            if (recordingLifecycleHint) recordingLifecycleHint.textContent =
              mode === "html5" ? html5PlaybackDiagnosis(detail) :
                "AVPlay · Medienfehler · Zugang wird geprüft";
            recordingStatus("loading","Prüfe Medienzugriff",
              playerFailure + " · Diagnose ohne Video-Download …");
            probeMediaHttpHeaders(window,result.mediaUrl,function (probe) {
              if (recordingPlaybackSession !== failedSession || !failedSession) return;
              stopRecordingPlayback("failure");
              recordingStatus("error",mode === "html5" ? "HTML5-Wiedergabe fehlgeschlagen" : "AVPlay-Wiedergabe fehlgeschlagen",
                playerFailure + " " + describeMediaAccessProbe(probe));
            });
          } else if (state === "finished") {
            if (recordingLifecycleHint) recordingLifecycleHint.textContent =
              "Player · Aufnahme regulär beendet";
            stopRecordingPlayback("finished");
            recordingStatus("ready","Aufnahme beendet",rec.title);
          }
        },mode === "avplay" ? result.nativeCookie : null);
        if (!started && recordingPlaybackSession) stopRecordingPlayback();
      },mode === "avplay");
  }

  function fetchRecordingFolderPage(run, folderId, offset) {
    if (!recordingCredential || !recordingBackends.length || run !== recordingRun) return;
    var backend = recordingBackends[recordingBackendIndex];
    recordingBusy = true;
    recordingStatus("loading","Lade VDR-Verzeichnis",recordingFolderName);
    recordingCatalog.listFolders(recordingCredential,backend.backendId,folderId,offset,
      function (result) {
        if (run !== recordingRun || recordingMode !== "folders" ||
            recordingFolderId !== folderId) return;
        recordingBusy = false;
        if (!result.ok) { showRecordingError(result); return; }
        recordingFolderOffset = offset;
        recordingFolderHasMore = result.value.page.hasMore;
        showRecordingRows(result.value.items);
        if (recordingBackendName) recordingBackendName.textContent =
          "VDR: " + recordingFolderName + " · Backend: " + backend.name +
          " · Seite " + String(Math.floor(offset / 100) + 1);
        if (offset > 0 && recordingFocusIds.length) setFocus(recordingFocusIds[0]);
        recordingStatus(result.value.items.length ? "ready" : "empty",
          result.value.items.length ?
            String(result.value.items.length) + " VDR-Verzeichniseinträge" :
            "VDR-Verzeichnis leer",
          "Ordner mit OK öffnen · Aufnahmen mit OK auswählen · " +
          (recordingFolderHasMore ? "Weitere Einträge über „Weitere Aufnahmen“" :
            "Letzte Verzeichnisseite") + " · Genres folgen später.");
      });
  }
  function openRecordingFolder(folder) {
    if (recordingMode !== "folders" || recordingBusy ||
        !folder || folder.kind !== "folder" ||
        !/^fld1_[0-9a-f]{32}$/.test(folder.folderId)) return;
    if (recordingFolderStack.length >= 32) {
      recordingStatus("error","Ordnertiefe begrenzt",
        "Maximal 32 Ordnerstufen; zurückgehen oder anderen Ordner wählen.");
      return;
    }
    recordingFolderStack.push({
      folderId:recordingFolderId,name:recordingFolderName,offset:recordingFolderOffset
    });
    recordingFolderId = folder.folderId;
    recordingFolderName = folder.name;
    recordingFolderOffset = 0;
    clearRecordingRows();
    fetchRecordingFolderPage(++recordingRun, recordingFolderId, 0);
  }
  function recordingFolderUp() {
    if (recordingMode !== "folders" || recordingBusy ||
        !recordingFolderStack.length) return false;
    var parent = recordingFolderStack.pop();
    recordingFolderId = parent.folderId;
    recordingFolderName = parent.name;
    recordingFolderOffset = parent.offset;
    clearRecordingRows();
    fetchRecordingFolderPage(++recordingRun,recordingFolderId,recordingFolderOffset);
    return true;
  }

  function fetchRecordingPage(run, cursor, pageIndex) {
    if (!recordingCredential || !recordingBackends.length || run !== recordingRun) return;
    var backend = recordingBackends[recordingBackendIndex];
    recordingBusy = true;
    recordingStatus("loading", "Lade Aufnahmen",
      backend.name + " · maximal 100 Aufnahmen pro Serveranfrage");
    recordingCatalog.listRecordings(recordingCredential, backend.backendId, cursor, function (result) {
      if (run !== recordingRun) return;
      recordingBusy = false;
      if (!result.ok) { showRecordingError(result); return; }
      recordingPageIndex = pageIndex;
      recordingCursors[pageIndex] = cursor;
      // Do not retain a speculative forward cursor if the catalog changed.
      recordingCursors.length = pageIndex + 1;
      recordingNextCursor = result.value.page.hasMore ?
        result.value.page.nextCursor : null;
      showRecordingRows(result.value.items);
      if (recordingBackendName) recordingBackendName.textContent =
        "Backend: " + backend.name + " · " + backend.backendId +
        " · Seite " + String(pageIndex + 1);
      if (pageIndex > 0 && recordingFocusIds.length) setFocus(recordingFocusIds[0]);
      recordingStatus(result.value.items.length ? "ready" : "empty",
        result.value.items.length ?
          String(result.value.items.length) + " echte Aufnahmen · Seite " +
            String(pageIndex + 1) : "Keine Aufnahmen gefunden",
        "Nur freigegebene Aufnahmedaten · " +
          (recordingNextCursor ? "Weitere Aufnahmen über „Nächste Seite“" :
           "Ende der Aufnahmeliste") +
          " · Wiedergabe folgt in S5.");
    });
  }

  function loadRecordings(action) {
    if (recordingBusy || recordingPlayBusy || recordingPlaybackSession) return;
    if (action === "play" || action === "html5" ||
        action === "aac-hls") {startSelectedRecording(action);return;}
    if (action === "up") {
      if (!recordingFolderUp())
        recordingStatus("ready","Oberstes Verzeichnis","Kein übergeordneter VDR-Ordner.");
      return;
    }
    if (action === "previous" && recordingMode === "folders") {
      if (!recordingFolderOffset) {
        recordingStatus("ready","Erste Verzeichnisseite",
          "Zum übergeordneten Ordner „Ordner hoch“ verwenden.");
        return;
      }
      fetchRecordingFolderPage(recordingRun,recordingFolderId,
        Math.max(0,recordingFolderOffset-100));
      return;
    }
    if (action === "next" && recordingMode === "folders") {
      if (recordingFolderHasMore)
        fetchRecordingFolderPage(recordingRun,recordingFolderId,
          recordingFolderOffset+100);
      else recordingStatus("ready","Letzte Verzeichnisseite","Keine weiteren Einträge.");
      return;
    }
    if (action === "previous") {
      if (recordingPageIndex === 0 || !recordingCredential) {
        recordingStatus("empty", "Erste Seite",
          "„Aufnahmen laden“ startet einen neuen Abruf."); return;
      }
      fetchRecordingPage(recordingRun,
        recordingCursors[recordingPageIndex - 1], recordingPageIndex - 1);
      return;
    }
    if (action === "next") {
      if (!recordingNextCursor || !recordingCredential) {
        recordingStatus("empty", "Keine weitere Seite",
          "„Aufnahmen laden“ startet einen neuen Abruf."); return;
      }
      fetchRecordingPage(recordingRun, recordingNextCursor, recordingPageIndex + 1);
      return;
    }
    if (action === "backend") {
      if (!recordingCredential || recordingBackends.length < 2) {
        recordingStatus("empty", "Kein weiteres Backend",
          "Es wurde nur ein sichtbares Backend gefunden."); return;
      }
      recordingBackendIndex = (recordingBackendIndex + 1) % recordingBackends.length;
      recordingCursors = [null];
      recordingPageIndex = 0;
      recordingNextCursor = null;
      recordingFolderId = null;
      recordingFolderName = "VDR";
      recordingFolderStack = [];
      recordingFolderOffset = 0;
      recordingFolderHasMore = false;
      clearRecordingRows();
      if (recordingMode === "folders")
        fetchRecordingFolderPage(++recordingRun,null,0);
      else fetchRecordingPage(++recordingRun,null,0);
      return;
    }
    // Credentials remain in Tizen KeyManager; no localStorage or automatic pairing.
    var saved = vault.read();
    if (!saved.ok) {
      recordingStatus("error", "Sicherer Gerätespeicher nicht lesbar",
        "KeyManager-Zugriff fehlgeschlagen. Anmeldung erneut prüfen; nicht neu koppeln.");
      return;
    }
    if (!saved.credential) {
      showRecordingError({kind:"invalid_credential"}); return;
    }
    var selectedBase = serverInput && normalizeSuiteBase(serverInput.value);
    if (selectedBase && selectedBase !== saved.credential.base) {
      recordingStatus("error", "Anderer Server ausgewählt",
        "Die sichere Geräteanmeldung gehört zu einem anderen Server. Adresse prüfen.");
      return;
    }
    recordingMode = action === "all" ? "all" : "folders";
    recordingFolderId = null;
    recordingFolderName = "VDR";
    recordingFolderStack = [];
    recordingFolderOffset = 0;
    recordingFolderHasMore = false;
    recordingCredential = saved.credential;
    recordingBackends = [];
    recordingBackendIndex = 0;
    recordingCursors = [null];
    recordingPageIndex = 0;
    recordingNextCursor = null;
    clearRecordingRows();
    recordingBusy = true;
    var run = ++recordingRun;
    recordingStatus("loading", "Prüfe Geräteanmeldung",
      "Anmeldung mit dem gespeicherten Tizen-Credential …");
    pairingClient.verify(recordingCredential, function (verified) {
      if (run !== recordingRun) return;
      if (!verified.ok) {
        updateVerificationFailure(recordingCredential, verified);
        recordingBusy = false;
        showRecordingError(verified); return;
      }
      markDeviceAuthenticated(recordingCredential);
      recordingStatus("loading", "Prüfe sichtbare Backends",
        "Für Aufnahmen ist recordings.view erforderlich.");
      channelCatalog.listBackends(recordingCredential, function (found) {
        if (run !== recordingRun) return;
        if (!found.ok) {
          recordingBusy = false;
          showRecordingError(found); return;
        }
        recordingBackends = found.value.items;
        if (!recordingBackends.length) {
          recordingBusy = false;
          recordingStatus("empty", "Keine Backends freigegeben",
            "Der Administrator muss recordings.view für ein Backend freigeben.");
          return;
        }
        if (recordingMode === "folders") fetchRecordingFolderPage(run,null,0);
        else fetchRecordingPage(run, null, 0);
      });
    });
  }

  function showView(view) {
    if (ROUTES.indexOf(view) < 0) return false;
    if (currentView === "home" && view !== "home") homeCancelReads();
    if (currentView === "live" && view !== "live") {
      if (livePlaybackSession || livePlayBusy) stopLivePlayback("navigate");
      clearLiveEpg();
      // In-flight responses cannot update a hidden view after navigation.
      liveRun += 1;
      liveBusy = false;
      channelCatalog.cancel();
    }
    if (currentView === "search" && view !== "search") {
      ++globalSearchRun;++globalSearchDetailRun;
      globalSearchBusy=false;globalSearchEditing=false;
      globalSearchClient.cancel();globalSearchMetadata.cancel();
      globalSearchCatalog.cancel();globalSearchPairing.cancel();
      clearGlobalSearchRows();
    }
    if (currentView === "timers" && view !== "timers") {
      ++searchTimerRun;
      ++searchTimerSelectionRun;
      searchTimerBusy=false;
      searchTimerCatalog.cancel();
      searchTimerBackendCatalog.cancel();
      searchTimerPairing.cancel();
      clearSearchTimerRows();
      nativeTimerRun++;
      nativeTimerBusy=false;
      nativeTimerCatalog.cancel();
      channelCatalog.cancel();
      clearNativeTimerRows();
    }
    if (currentView === "recordings" && view !== "recordings") {
      recordingMetadata.cancel();
      recordingDetailRun+=1;
      clearRecordingPoster();
      if (recordingPlaybackSession || recordingPlayBusy) stopRecordingPlayback();
      recordingRun += 1;
      recordingBusy = false;
      recordingCatalog.cancel();
      channelCatalog.cancel(); // Backend discovery may still be pending.
    }
    currentView = view;
    if (view !== "settings") resetConfirmationId = null;
    if (view === "live") {
      // Remove stale focus registrations before resetting live row memory.
      clearLiveRows();
      if (!rowMemory.live) rowMemory.live = {};
      rowMemory.live[1] = "detail-live-home";
      liveCredential = null;
      liveBackends = [];
      liveBackendIndex = 0;
      liveCursor = null;
      liveStatus("offline", "Bereit für echte Sender",
        "„Sender laden“ nutzt deine gespeicherte Geräteanmeldung.");
    } else if (view === "recordings") {
      clearRecordingRows();
      // clearRecordingRows resets row memory; restore the first action after it.
      if (!rowMemory.recordings) rowMemory.recordings = {};
      rowMemory.recordings[1] = "detail-recordings-home";
      recordingCredential = null;
      recordingBackends = [];
      recordingBackendIndex = 0;
      recordingCursors = [null];
      recordingPageIndex = 0;
      recordingNextCursor = null;
      recordingMode = "folders";
      recordingFolderId = null;
      recordingFolderName = "VDR";
      recordingFolderStack = [];
      recordingFolderOffset = 0;
      recordingFolderHasMore = false;
      if (recordingBackendName)
        recordingBackendName.textContent = "Noch kein Backend geladen";
      recordingStatus("offline", "Bereit für echte Aufnahmen",
        "„Aufnahmen laden“ nutzt die gespeicherte Geräteanmeldung. recordings.view erforderlich.");
    } else if (view === "timers") {
      ++searchTimerRun;
      ++searchTimerSelectionRun;
      searchTimerBusy=false;
      searchTimerCatalog.cancel();
      searchTimerBackendCatalog.cancel();
      searchTimerPairing.cancel();
      clearSearchTimerRows();
      searchTimerCredential=null;
      searchTimerBackends=[];
      searchTimerBackendIndex=0;
      if(searchTimerBackendLabel)
        searchTimerBackendLabel.textContent="Noch kein Backend geladen";
      searchTimerMessage("Suchtimer laden benötigt searchtimers.view.");
      nativeTimerRun++;
      nativeTimerBusy=false;
      nativeTimerCatalog.cancel();
      clearNativeTimerRows();
      nativeTimerBackends=[];
      nativeTimerCredential=null;
      nativeTimerBackendIndex=0;
      if(nativeTimerBackendName)
        nativeTimerBackendName.textContent="Noch kein Backend geladen";
      nativeTimerStatus("offline","Bereit für echte VDR-Timer",
        "„Timer laden“ liest native Timer über Public API v1 mit timers.view.");
      if (!rowMemory.timers) rowMemory.timers = {};
      rowMemory.timers[1]="detail-timers-load";
    } else if (view === "search") {
      renderPreview("search","offline");
      ++globalSearchRun;++globalSearchDetailRun;
      globalSearchBusy=false;globalSearchEditing=false;
      globalSearchClient.cancel();globalSearchMetadata.cancel();
      globalSearchCatalog.cancel();globalSearchPairing.cancel();
      clearGlobalSearchRows();
      globalSearchCredential=null;
      globalSearchBackends=[];globalSearchBackendIndex=0;
      globalSearchTerm="";
      if(globalSearchBackendLabel)
        globalSearchBackendLabel.textContent="Backend noch nicht geladen";
      globalSearchMessage("Suchbegriff eingeben und „Suchen“ drücken.");
      if(!rowMemory.search)rowMemory.search={};
      rowMemory.search[1]="global-search-go";
    } else if (PREVIEW_ROUTES.indexOf(view) >= 0) {
      renderPreview(view, "offline");
      // Preserve S2.2's DOWN-to-first-detail-button behavior.
      if (!rowMemory[view]) rowMemory[view] = {};
      rowMemory[view][1] = "detail-" + view + "-home";
    } else if (view === "settings") {
      // A new server address/test row must not steal the first DOWN key.
      if (!rowMemory.settings) rowMemory.settings = {};
      rowMemory.settings[1] = "detail-settings-home";
      storedStatus();
    }
    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== view;
    });
    menu.forEach(function (item) {
      var active = item.getAttribute("data-route") === view;
      item.setAttribute("data-active", active ? "true" : "false");
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    message.textContent = view === "home"
      ? "Media Home · Inhalte über Public API v1 · Pfeile · OK · Zurück"
      : "Bereich: " + view + (discoveredBase ? " · Public API v1 erreichbar" : " · Server noch nicht geprüft") + " · Zurück = vorherige Ansicht";
    if(view==="home" && document.visibilityState==="visible")homeRefresh();
    return true;
  }

  function goHome(focusId) {
    history = [];
    showView("home");
    setFocus(isVisibleFocus(focusId) ? focusId : "nav-home");
  }

  function navigateTo(view, originId) {
    if (ROUTES.indexOf(view) < 0) return;
    if (view === "home") {
      // Explicit Home clears history: Back on Home should exit the app.
      // A detail-page Home button returns to the previously selected Home tile.
      goHome(originId && originId.indexOf("detail-") === 0 ? lastHomeFocus : "nav-home");
      return;
    }
    if (view === currentView) {
      setFocus("nav-" + view);
      return;
    }
    history.push({ view: currentView, focusId: focusedId });
    if (history.length > 12) history.shift();
    showView(view);
    setFocus("nav-" + view);
  }

  function quitApp() {
    try {
      if (window.tizen && window.tizen.application) {
        window.tizen.application.getCurrentApplication().exit();
        return;
      }
    } catch (_) { /* app exit can be rejected on simulators */ }
    message.textContent = "Zurück im Home-Menü erkannt · App-Exit am TV prüfen";
  }

  function goBack() {
    if (currentView === "live" && (livePlaybackSession || livePlayBusy)) {
      stopLivePlayback("user");
      return;
    }
    if (currentView === "recordings" && (recordingPlaybackSession || recordingPlayBusy)) {
      stopRecordingPlayback("user");
      return;
    }
    if (currentView === "recordings" && recordingFolderStack.length &&
        recordingMode === "folders") {
      recordingFolderUp();
      return;
    }
    if (currentView === "home") {
      quitApp();
      return;
    }
    if (history.length) {
      var previous = history.pop();
      showView(previous.view);
      // All rows are checked against the newly visible view before focus.
      if (!setFocus(previous.focusId)) setFocus("nav-" + previous.view);
    } else {
      goHome(lastHomeFocus);
    }
  }

  function activate(item) {
    if (!item) return;
    var homeKind=item.getAttribute("data-home-kind");
    var homeIndex=item.getAttribute("data-home-index");
    if(currentView==="home" && homeKind && homeIndex!==null) {
      var selected=homeCardItems[homeKind][Number(homeIndex)];
      if(homeKind==="epg" && selected && selected.event){
        homeFeaturePriority=0;
        homeFeatureShow(Object.assign({},selected.event,{
          channelId:selected.channel.channelId,
          description:selected.event.subtitle || selected.channel.name
        }),"epg",4,
          globalSearchDate(selected.event.startTime)+" · "+selected.channel.name);
      } else if(selected)homeSelectRecording(selected,homeKind,true);
      return;
    }
    var homeAction=item.getAttribute("data-home-action");
    if(currentView==="home" && homeAction) {
      if(homeAction==="refresh")homeRefresh();
      else navigateTo(homeFeatureKind==="epg"?"live":"recordings",
        item.getAttribute("data-focus-id"));
      return;
    }
    var pairAction = item.getAttribute("data-pair-action");
    if (pairAction) {
      if (pairAction === "start") pairStart();
      else if (pairAction === "check") pairCheck();
      else if (pairAction === "activate") pairActivate();
      else if (pairAction === "verify") pairVerify();
      else if (pairAction === "retry") savePendingCredential();
      else if (pairAction === "clear") clearRejectedLocalCredential();
      return;
    }
    if (item.getAttribute("data-server-test") === "true") {
      testServerConnection();
      return;
    }
    if (item.getAttribute("data-focus-id") === "settings-base-input") {
      editingServerAddress = true;
      if (serverInput) {
        try { serverInput.focus(); } catch (_) {}
      }
      return;
    }
    var epgScroll=item.getAttribute("data-epg-scroll");
    if (epgScroll!==null && currentView==="live") {
      if (liveEpgDetail && !liveEpgDetail.hidden) {
        var direction=epgScroll==="-1" ? -1 : epgScroll==="1" ? 1 : 0;
        // No focus scroll-out and no extra global key listener.
        if (direction) liveEpgDetail.scrollTop=Math.max(0,
          liveEpgDetail.scrollTop+direction*230);
      }
      return;
    }
    var epgAction = item.getAttribute("data-live-epg-action");
    if (epgAction) {loadSelectedEpg(epgAction);return;}
    var epgIndex=item.getAttribute("data-epg-index");
    if (epgIndex!==null && currentView==="live") {
      var epgItem=liveEpgRows[Number(epgIndex)];
      if (epgItem) selectEpgEvent(epgItem,true);
      return;
    }
    if (item.getAttribute("data-live-play")==="start" && currentView==="live") {
      startSelectedLive();return;
    }
    var liveAction = item.getAttribute("data-live-action");
    if (liveAction) {
      loadLiveChannels(liveAction);
      return;
    }
    var channelIndex = item.getAttribute("data-channel-index");
    if (channelIndex !== null && currentView === "live") {
      var selected = liveCurrentChannels[Number(channelIndex)];
      if (selected) {
        liveMetadata.cancel();
        liveEpgRun+=1;
        liveWindow=null;
        selectedLiveChannel={backendId:selected.backendId,channelId:selected.channelId};
        clearEpgFocusRows();
        if (liveEpgList) {liveEpgList.textContent="";liveEpgList.hidden=true;}
        if (liveEpgStatus) liveEpgStatus.textContent =
          "Ausgewählt: "+selected.name+" · Jetzt/Nächste oder 24h EPG wählen.";
        liveStatus("ready", String(selected.channelNumber) + " · " + selected.name,
          "Sender ausgewählt · Live-Stream wird nicht automatisch gestartet. " +
          "„Live-TV testen“ startet ausdrücklich eine geschützte MediaSession. media.live.play erforderlich.");
      }
      return;
    }
    var folderIndex = item.getAttribute("data-folder-index");
    if (folderIndex !== null && currentView === "recordings") {
      openRecordingFolder(recordingCurrentPageItems[Number(folderIndex)]);
      return;
    }
    var recordingIndex = item.getAttribute("data-recording-index");
    if (recordingIndex !== null && currentView === "recordings") {
      var chosen = recordingCurrentPageItems[Number(recordingIndex)];
      if (chosen) {
        recordingSelected = chosen;
        fetchRecordingDetails(chosen);
        recordingStatus("ready", chosen.title || "Aufnahme",
          (chosen.description ? chosen.description.slice(0, 240) :
           "Aufnahme aus dem VDR-Katalog.") +
          " · Jetzt OK auf „Wiedergabe testen“ startet einen kontrollierten MediaSession-Test.");
        setFocus("detail-recordings-play");
      }
      return;
    }
    var recordingAction = item.getAttribute("data-recordings-action");
    if (recordingAction) {
      loadRecordings(recordingAction);
      return;
    }
    var searchKind=item.getAttribute("data-global-search-kind");
    var searchIndex=item.getAttribute("data-global-search-index");
    if(currentView==="search" && searchKind && searchIndex!==null) {
      selectGlobalSearchResult(searchKind,Number(searchIndex));return;
    }
    var searchAction=item.getAttribute("data-global-search-action");
    if(currentView==="search" && searchAction) {
      globalSearchAction(searchAction);return;
    }
    if(currentView==="search" &&
        item.getAttribute("data-focus-id")==="global-search-input"){
      globalSearchEditing=true;
      if(globalSearchInput && typeof globalSearchInput.focus==="function")
        globalSearchInput.focus();
      return;
    }
    var searchTimerIndex=item.getAttribute("data-searchtimer-index");
    if(searchTimerIndex!==null && currentView==="timers") {
      selectSearchTimer(Number(searchTimerIndex));return;
    }
    var searchTimerAction=item.getAttribute("data-searchtimer-action");
    if(searchTimerAction && currentView==="timers") {
      loadSearchTimers(searchTimerAction);return;
    }
    var timerIndex=item.getAttribute("data-native-timer-index");
    if(timerIndex!==null && currentView==="timers") {
      var timer=nativeTimerItems[Number(timerIndex)];
      if(timer)nativeTimerStatus("ready",timer.title || "VDR-Timer",
        nativeTimerSchedule(timer)+" · "+
        (timer.channelName || timer.channelId)+" · "+
        (timer.recording?"AUFNAHME LÄUFT":
          timer.pending?"ANSTEHEND":timer.enabled?"AKTIV":"DEAKTIVIERT")+
        " · nur lesend");
      return;
    }
    var timerAction=item.getAttribute("data-native-timers-action");
    if(timerAction && currentView==="timers") {
      loadNativeTimers(timerAction);return;
    }
    var previewRoute = item.getAttribute("data-preview-route");
    if (previewRoute && previewRoute === currentView) {
      renderPreview(previewRoute, nextPreviewState(previewStates[previewRoute]));
      return;
    }
    var view = item.getAttribute("data-route") || item.getAttribute("data-target-view");
    if (view) navigateTo(view, item.getAttribute("data-focus-id"));
  }

  var caps = getPlatformCapabilities(window);
  document.getElementById("tizen-status").textContent = caps.tizen ? "vorhanden" : "nicht erkannt";
  document.getElementById("avplay-status").textContent = caps.avplay ? "vorhanden" : "nicht erkannt";
  document.getElementById("remote-status").textContent = caps.tvInputDevice ? "vorhanden" : "nicht erkannt";
  var optionalRemote = registerOptionalKeys(window);
  var remoteKeys = ["MediaPlay","MediaPause","MediaStop","ColorF3Blue"];
  var missingRemote = remoteKeys.filter(function(name) {
    return optionalRemote.registered.indexOf(name) < 0;
  });
  var remoteSummary = missingRemote.length ?
    "Zusatz-Tasten nicht registriert: "+missingRemote.join(", ") :
    "PLAY/PAUSE/STOP/BLAU registriert (Empfang am TV noch prüfen)";
  var extraKeys = ["MediaRewind","MediaFastForward","ChannelUp","ChannelDown",
    "PreviousChannel","Info","Menu","Tools","Teletext",
    "0","1","2","3","4","5","6","7","8","9"];
  var activeExtra = extraKeys.filter(function(name) {
    return optionalRemote.registered.indexOf(name)>=0;
  });
  remoteSummary += " · Weitere "+activeExtra.length+"/"+extraKeys.length+
    " registriert (Empfang am TV prüfen)";
  document.getElementById("remote-status").textContent =
    caps.tvInputDevice ? remoteSummary : "TV-Eingabegerät nicht verfügbar";
  if (serverInput) {
    var savedBase = null;
    try {
      savedBase = window.localStorage &&
        window.localStorage.getItem("vdr-suite.samsung.serverBase");
    } catch (_) { /* Tizen test install can erase Web storage */ }
    // A Git-ignored developer-local bundle restores the origin across re-installs.
    // Valid user edits in TV Web storage take precedence over the bundle default.
    var restoredBase = normalizeSuiteBase(savedBase) ||
      normalizeSuiteBase(window.VDR_SUITE_SERVER_BASE);
    if (!restoredBase) {
      var device = vault.read();
      if (device.ok && device.credential)
        restoredBase = normalizeSuiteBase(device.credential.base);
    }
    if (restoredBase) serverInput.value = restoredBase;
    serverInput.addEventListener("change", saveServerBase);
    serverInput.addEventListener("focus", function () {
      if (currentView === "settings") editingServerAddress = true;
    });
    serverInput.addEventListener("blur", function () {
      editingServerAddress = false;
      saveServerBase();
    });
  }


  if(globalSearchInput){
    globalSearchInput.addEventListener("focus",function(){
      if(currentView==="search")globalSearchEditing=true;
    });
    globalSearchInput.addEventListener("blur",function(){
      globalSearchEditing=false;
    });
  }

  var intro = createStartupVideo({
    overlay: document.getElementById("startup-cover"),
    video: document.getElementById("startup-video"),
    environment: window,
    source: "./assets/branding/startvideo.mp4"
  });

  // Exactly one capture-phase keydown owner: catch events from the native
  // playback surface before focused elements can consume them.
  document.addEventListener("keydown", function (event) {
    // Samsung Tizen 5.5 IME owns the keys while the address editor is focused.
    // Do not preventDefault or navigate for Backspace, arrows, digits or OK,
    // even if the native keyboard targets document instead of the input node.
    if (currentView === "settings" && editingServerAddress) {
      var imeCode = event.keyCode || event.which;
      if (imeCode === 65376 || imeCode === 65385 || imeCode === 10009) {
        // Samsung IME Done/Cancel and remote Return close the editor first.
        // No global BACK route and no forced text mutation.
        if (serverInput && typeof serverInput.blur === "function") serverInput.blur();
        editingServerAddress = false;
        setFocus("settings-test");
      }
      return;
    }
    // Samsung IME owns all text-editor keys, like the proven S6.16 address
    // editor. Never intercept Backspace, arrows, digits or OK while editing.
    if(currentView==="search" && globalSearchEditing){
      var code=event.keyCode || event.which;
      if(code===65376 || code===65385 || code===10009){
        if(globalSearchInput && typeof globalSearchInput.blur==="function")
          globalSearchInput.blur();
        globalSearchEditing=false;
        setFocus("global-search-go");
      }
      return;
    }
    var key = normalizeRemoteKey(event);
    var playbackKeysActive = (recordingPlaybackSession || recordingPlayBusy) &&
      currentView === "recordings";
    var liveKeysActive=(livePlaybackSession || livePlayBusy) && currentView==="live";
    if (!key) {
      if (playbackKeysActive && recordingRemoteHint) {
        // Display only a bounded numeric TV key code. Never display raw event
        // objects, native media URLs, headers or credentials.
        var raw = event.keyCode || event.which;
        recordingRemoteHint.textContent = "Fernbedienung · Unbekannte Taste" +
          (typeof raw === "number" && isFinite(raw) && raw >= 0 &&
           raw <= 65535 && Math.floor(raw) === raw ? " · Code " + raw : "");
      }
      return;
    }
    event.preventDefault();
    keyStatus.textContent = key;
    if (intro.active()) {
      if (key === "OK" || key === "BACK" || key === "STOP" ||
          key === "PLAY" || key === "PAUSE" || key === "PLAY_PAUSE") intro.skip();
      return;
    }
    if (liveKeysActive) {
      var liveAction=playbackRemoteAction(key);
      if (event.repeat && liveAction) return;
      if (liveAction==="stop") { stopLivePlayback("user");return; }
      if (liveAction==="play" || liveAction==="pause" || liveAction==="toggle") {
        var liveState=liveHtml5Player.pauseOrResume(liveAction);
        if (livePlayerHint) livePlayerHint.textContent=
          "Live-MP4 · "+key+" · "+liveState+" · STOP beendet";
        return;
      }
      if (livePlayerHint) livePlayerHint.textContent=
        "Live-TV aktiv · "+key+" · STOP/ZURÜCK beendet; kein automatischer Senderwechsel";
      return;
    }
    if (playbackKeysActive) {
      if (key==="INFO") {
        var infoSnapshot=recordingPlayerMode==="avplay" ?
          recordingPlayer.inspectPlayback() : null;
        if (recordingRemoteHint) recordingRemoteHint.textContent=
          "Fernbedienung · INFO (Code "+(event.keyCode || event.which || "?")+")"+
          (infoSnapshot ? " · AVPlay "+infoSnapshot.state+
            (infoSnapshot.seconds===null ? "" : " · Zeit "+infoSnapshot.seconds+"s") :
            " · HTML5-Player");
        return; // Diagnostic only: never change native playback state.
      }
      var action = playbackRemoteAction(key);
      // A held button must not rapidly toggle pause/resume or repeat STOP.
      if (event.repeat && action) return;
      if (action === "stop") {
        stopRecordingPlayback("user"); return;
      }
      if (action === "rewind" || action === "fastforward") {
        if (recordingRemoteHint) recordingRemoteHint.textContent =
          "Fernbedienung · "+key+" erkannt · Spulen noch nicht freigeschaltet";
        return; // No blind seek on a stalled/unverified AVPlay media stream.
      }
      if (action === "audio") {
        if (recordingPlayerMode !== "avplay") {
          if (recordingAudioHint) recordingAudioHint.textContent =
            "Audio · Spurauswahl nur bei AVPlay";
          return;
        }
        var sound=recordingPlayer.cycleAudioTrack();
        if (recordingAudioHint) recordingAudioHint.textContent =
          describeSamsungAudio(sound)+
          " | "+samsungTvSoundStatus(window);
        if (recordingRemoteHint)
          recordingRemoteHint.textContent="Fernbedienung · BLAU (Code "+
            (event.keyCode || event.which || "?")+") · Tonspur wechseln";
        return;
      }
      if (action === "play" || action === "pause" || action === "toggle") {
        var controlTicket=++recordingControlSequence;
        var controllingSession=recordingPlaybackSession;
        var beforeCall=Date.now();
        // Measure the synchronous native operation. Tizen may block JS here;
        // a status like resume_requested does NOT mean decoded frames resumed.
        var playbackState = (recordingPlayerMode === "html5" ?
          recordingHtml5Player : recordingPlayer).pauseOrResume(action);
        var afterCall=Date.now();
        var callMs=Math.max(0,Math.min(600000,afterCall-beforeCall));
        if (recordingRemoteHint) {
          var beforeSnapshot=Date.now();
          var evidence=recordingPlayerMode==="avplay" ?
            recordingPlayer.inspectPlayback() : null;
          var snapshotMs=Math.max(0,Math.min(600000,Date.now()-beforeSnapshot));
          recordingRemoteHint.textContent = "Fernbedienung · "+key+
            " (Code "+(event.keyCode || event.which || "?")+")"+
            " · Aktion "+playbackState+
            " · Native-API "+callMs+"ms · Snapshot "+snapshotMs+"ms"+(evidence ?
              " · AVPlay "+evidence.state+
              (evidence.seconds===null ? "" : " · Zeit "+evidence.seconds+"s")+
              " · Delta "+evidence.deltaSeconds+"s" : "");
          // After one explicit native key command, inspect the CLOCK again.
          // It is read-only; no guessed seek, audio switch, new session or
          // "video frames OK" claim. Stop and subsequent keypresses fence it.
          if (evidence && controllingSession &&
              typeof window.setTimeout==="function") {
            var initialSeconds=evidence.seconds;
            window.setTimeout(function () {
              if (recordingControlSequence!==controlTicket ||
                  currentView!=="recordings" ||
                  recordingPlaybackSession!==controllingSession) return;
              var later=recordingPlayer.inspectPlayback();
              var wallSeconds=Math.max(0,Math.min(600,
                Math.floor((Date.now()-afterCall)/1000)));
              var clock=initialSeconds!==null && later.seconds!==null ?
                (later.seconds>initialSeconds ? "Uhr vorwärts" :
                  later.seconds===initialSeconds ? "Uhr unverändert" :
                    "Uhr rückwärts") : "Uhr nicht lesbar";
              if (recordingRemoteHint)
                recordingRemoteHint.textContent += " · nach "+wallSeconds+
                  "s: "+later.state+" · "+clock+
                  (later.seconds===null ? "" : " ("+later.seconds+"s)");
            },10000);
          }
        }
        if (playbackState === "paused" || playbackState === "already_paused")
          recordingStatus("ready","Wiedergabe pausiert",
            "PLAY setzt fort · OK oder PLAY/PAUSE schaltet um · STOP beendet.");
        else if (playbackState === "already_playing")
          recordingStatus("ready","Player meldet PLAYING",
            "PLAY bereits aktiv · Bild/Ton am TV prüfen · PAUSE hält an.");
        else if (playbackState === "resume_requested")
          recordingStatus("loading","Fortsetzen angefordert",
            "AVPlay/HTML5-Play aufgerufen; Bildfortschritt am TV prüfen · STOP beendet.");
        else if (playbackState === "error")
          recordingStatus("error","Tastenaktion fehlgeschlagen",
            "PLAY/PAUSE im aktuellen Player-Zustand fehlgeschlagen.");
        else
          recordingStatus("loading","Taste erkannt","Player noch nicht bereit.");
        return;
      }
      if (recordingRemoteHint)
        recordingRemoteHint.textContent = "Fernbedienung · Taste " + key +
          " (Code "+(event.keyCode || event.which || "?")+")"+
          " · keine Wiedergabeaktion";
      return; // no focus movement under native full-screen player
    }
    if (key === "SETTINGS") {
      navigateTo("settings","nav-settings");
      return;
    }
    if (currentView === "live" && (key === "CHANNEL_UP" || key === "CHANNEL_DOWN")) {
      if (!liveFocusIds.length) {
        message.textContent = "CH+/CH− erkannt · zuerst Sender laden"; return;
      }
      var cursor = liveFocusIds.indexOf(focusedId);
      var next = cursor<0 ? (key==="CHANNEL_UP" ? liveFocusIds.length-1 : 0) :
        Math.max(0,Math.min(liveFocusIds.length-1,
          cursor+(key==="CHANNEL_UP" ? -1 : 1)));
      setFocus(liveFocusIds[next]);
      return; // Only visible catalog entries; never auto-tune.
    }
    if (currentView === "live" && /^DIGIT_[0-9]$/.test(key)) {
      var now = Date.now();
      if (now-remoteLastDigitAt>1800) remoteChannelDigits="";
      remoteChannelDigits=(remoteChannelDigits+key.slice(6)).slice(-5);
      remoteLastDigitAt=now;
      var matched=-1;
      for (var ci=0;ci<liveCurrentChannels.length;ci++) {
        if (String(liveCurrentChannels[ci].channelNumber)===
            String(Number(remoteChannelDigits))) { matched=ci; break; }
      }
      if (matched>=0 && liveFocusIds[matched]) setFocus(liveFocusIds[matched]);
      message.textContent="Sendernummer "+remoteChannelDigits+
        (matched>=0 ? " · Sender fokussiert (OK zeigt EPG)" :
          " · nur bereits geladene Katalogseite");
      return;
    }
    if (key==="INFO") {
      // INFO reuses the existing authenticated detail handlers: no new API.
      if (currentView==="live") {
        var infoTarget=controls[focusedId];
        var epgIndex=infoTarget && infoTarget.getAttribute("data-epg-index");
        if (epgIndex!==null && epgIndex!==undefined) {
          activate(infoTarget);
          message.textContent="INFO · Sendungsdetails geöffnet";
          return;
        }
        var channelIndex=infoTarget && infoTarget.getAttribute("data-channel-index");
        if (channelIndex!==null && channelIndex!==undefined) activate(infoTarget);
        if (selectedLiveChannel) {
          loadSelectedEpg("now");
          message.textContent="INFO · Jetzt/Nächste für gewählten Sender";
        } else {
          if (liveEpgStatus) liveEpgStatus.textContent=
            "INFO erkannt · zuerst einen Sender laden und auswählen.";
          message.textContent="INFO · noch kein Sender ausgewählt";
        }
        return;
      }
      if (currentView==="recordings") {
        var infoRecord=controls[focusedId];
        if (infoRecord && infoRecord.getAttribute("data-recording-index")!==null) {
          activate(infoRecord);
          message.textContent="INFO · Aufnahmedetails geöffnet";
          return;
        }
      }
      message.textContent="INFO erkannt · Details unter Live-TV/Aufnahmen";
      return;
    }
    if (key==="PREVIOUS_CHANNEL" || key==="TELETEXT" || key==="TOOLS") {
      message.textContent=key+" erkannt · Funktion noch nicht implementiert"; return;
    }
    if (currentView==="live" && liveEpgScrollActions &&
        !liveEpgScrollActions.hidden && liveEpgFocusIds.length) {
      // The last EPG item must lead directly to the nearby detail-scroll
      // controls, not down through every row of the unrelated sender list.
      if (key==="DOWN" &&
          focusedId===liveEpgFocusIds[liveEpgFocusIds.length-1] &&
          setFocus("live-epg-scroll-down")) return;
      if (key==="UP" &&
          (focusedId==="live-epg-scroll-up" ||
           focusedId==="live-epg-scroll-down") &&
          setFocus(liveEpgFocusIds[liveEpgFocusIds.length-1])) return;
    }
    if (key === "UP" || key === "DOWN" || key === "LEFT" || key === "RIGHT") {
      setFocus(nextFocusId(focusedId, key, focusRows(), rowMemory[currentView]));
    } else if (key === "OK") {
      activate(controls[focusedId]);
    } else if (key === "BACK") {
      goBack();
    }
  }, true);

  // Mouse/keyboard focus can also occur on desktop/emulator; synchronize it
  // without registering another key handler or moving into a hidden panel.
  document.addEventListener("focusin", function (event) {
    var item = event.target;
    if (!item || typeof item.getAttribute !== "function") return;
    var id = item.getAttribute("data-focus-id");
    if (id && id !== focusedId && isVisibleFocus(id)) setFocus(id);
  });

  items.forEach(function (item) {
    item.addEventListener("click", function () {
      var id = item.getAttribute("data-focus-id");
      if (setFocus(id)) activate(item);
    });
  });

  document.addEventListener("visibilitychange",function(){
    if(document.visibilityState==="visible" && currentView==="home")homeRefresh();
    else if(document.visibilityState==="hidden" && currentView==="home")
      homeCancelReads();
  });
  storedStatus();
  showView("home");
  setFocus("nav-home");
  intro.start();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}
