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
import { createPublicMediaMetadata, mediaMetadataError } from "./api/media-metadata.js";
import { createRecordingPlaybackClient, recordingPlaybackError } from "./api/recording-playback.js";
import { probeMediaHttpHeaders, describeMediaAccessProbe } from "./api/media-access-probe.js";
import { createSamsungRecordingPlayer, conservativeSamsungCapabilities, samsungPlaybackDiagnosis, describeSamsungAudio } from "./platform/recording-player.js";
import { createHtml5RecordingPlayer, html5PlaybackDiagnosis } from "./platform/html5-recording-player.js";

// Every control is in exactly one row per visible route. Navigation never
// uses hidden DOM items or relies on pixel positions (Tizen 5.5 safe).
const NAV_ROW = [
  "nav-home", "nav-live", "nav-recordings", "nav-search", "nav-timers", "nav-settings"
];
const HOME_ROWS = [
  ["stage-favorites", "stage-hero", "stage-recordings"],
  ["action-live", "action-recordings", "action-settings"],
  ["rail-recordings", "rail-live", "rail-search", "rail-timers"]
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
  var testingConnection = false;
  var discovery = createDiscoveryClient(window);
  var pairingClient = createPairingClient(window);
  var vault = createDeviceVault(window);
  var channelCatalog = createChannelCatalog(window);
  var recordingCatalog = createRecordingCatalog(window);
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
    if (currentView === "home") return [NAV_ROW].concat(HOME_ROWS);
    if (currentView === "live") {
      var liveFocusRows = [NAV_ROW,
        ["detail-live-home", "detail-live-preview", "detail-live-more", "detail-live-backend",
       "detail-live-epg-now", "detail-live-epg-window", "detail-live-epg-more"]];
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
         "detail-recordings-html5", "detail-recordings-previous"]];
      recordingFocusIds.forEach(function (id) { rows.push([id]); });
      rows.push(["detail-recordings-next"]);
      return rows;
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
           "detail-live-backend","detail-live-epg-now","detail-live-epg-window",
           "detail-live-epg-more"].indexOf(lastAction) !== -1)
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
        " · Live-Wiedergabe benötigt einen separat bestätigten MediaSession-Pfad.");
      if (jumpToNewPage && liveFocusIds[firstNewRow])
        setFocus(liveFocusIds[firstNewRow]);
    });
  }

  function loadLiveChannels(action) {
    if (liveBusy) return;
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
    var caps = conservativeSamsungCapabilities({document:document});
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
      rec.title + " · media.recording.play erforderlich");
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
            if (recordingAudioHint)
              recordingAudioHint.textContent = describeSamsungAudio(detail);
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
    if (action === "play" || action === "html5") {startSelectedRecording(action);return;}
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
    if (currentView === "live" && view !== "live") {
      clearLiveEpg();
      // In-flight responses cannot update a hidden view after navigation.
      liveRun += 1;
      liveBusy = false;
      channelCatalog.cancel();
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
      if (!rowMemory.recordings) rowMemory.recordings = {};
      rowMemory.recordings[1] = "detail-recordings-home";
      clearRecordingRows();
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
      ? "Offline-Designvorschau · Navigation: Pfeile · OK · Zurück"
      : "Bereich: " + view + (discoveredBase ? " · Public API v1 erreichbar" : " · Server noch nicht geprüft") + " · Zurück = vorherige Ansicht";
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
          "Dafür sind media.live.play und ein bestätigter Device-Medienpfad erforderlich.");
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
    serverInput.addEventListener("blur", function () {
      editingServerAddress = false;
      saveServerBase();
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
    var key = normalizeRemoteKey(event);
    var playbackKeysActive = (recordingPlaybackSession || recordingPlayBusy) &&
      currentView === "recordings";
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
    if (editingServerAddress && event.target === serverInput) {
      if (key === "BACK") {
        event.preventDefault();
        editingServerAddress = false;
        setFocus("settings-test");
      }
      return; // Samsung virtual keyboard owns input keys while editing.
    }
    event.preventDefault();
    keyStatus.textContent = key;
    if (intro.active()) {
      if (key === "OK" || key === "BACK" || key === "STOP" ||
          key === "PLAY" || key === "PAUSE" || key === "PLAY_PAUSE") intro.skip();
      return;
    }
    if (playbackKeysActive) {
      var action = playbackRemoteAction(key);
      // A held button must not rapidly toggle pause/resume or repeat STOP.
      if (event.repeat && action) return;
      if (action === "stop") {
        stopRecordingPlayback("user"); return;
      }
      if (action === "audio") {
        if (recordingPlayerMode !== "avplay") {
          if (recordingAudioHint) recordingAudioHint.textContent =
            "Audio · Spurauswahl nur bei AVPlay";
          return;
        }
        var sound=recordingPlayer.cycleAudioTrack();
        if (recordingAudioHint) recordingAudioHint.textContent =
          describeSamsungAudio(sound);
        if (recordingRemoteHint)
          recordingRemoteHint.textContent="Fernbedienung · BLAU (Code "+
            (event.keyCode || event.which || "?")+") · Tonspur wechseln";
        return;
      }
      if (action === "play" || action === "pause" || action === "toggle") {
        var playbackState = (recordingPlayerMode === "html5" ?
          recordingHtml5Player : recordingPlayer).pauseOrResume(action);
        if (recordingRemoteHint) {
          var evidence=recordingPlayerMode==="avplay" ?
            recordingPlayer.inspectPlayback() : null;
          recordingRemoteHint.textContent = "Fernbedienung · "+key+
            " (Code "+(event.keyCode || event.which || "?")+")"+
            " · Aktion "+playbackState+(evidence ?
              " · AVPlay "+evidence.state+
              (evidence.seconds===null ? "" : " · Zeit "+evidence.seconds+"s")+
              " · Delta "+evidence.deltaSeconds+"s" : "");
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

  storedStatus();
  showView("home");
  setFocus("nav-home");
  intro.start();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}
