import { normalizeRemoteKey } from "./navigation/remote.js";
import { nextFocusId } from "./navigation/premium-focus.js";
import { getPlatformCapabilities } from "./platform/capabilities.js";
import { registerOptionalKeys } from "./platform/keys.js";
import { createStartupVideo } from "./platform/startup-video.js";
import { nextPreviewState, getViewPresentation } from "./views/view-state.js";
import { normalizeSuiteBase, createDiscoveryClient, classifyDiscoveryError } from "./api/public-discovery.js";
import { createPairingClient, pairingError } from "./api/device-pairing.js";
import { createDeviceVault } from "./platform/device-vault.js";
import { createChannelCatalog, channelCatalogError } from "./api/channel-catalog.js";
import { createRecordingCatalog, recordingCatalogError } from "./api/recording-catalog.js";

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
  var recordingCredential = null;
  var recordingBackends = [];
  var recordingBackendIndex = 0;
  var recordingCursors = [null];
  var recordingPageIndex = 0;
  var recordingNextCursor = null;
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
  var pairingRequest = null;
  var pairingBase = null;
  var pairingApproved = false;
  var issueAttempted = false;
  var pairingBusy = false;
  var pendingCredential = null;
  var pairedCredential = null;
  var discoveredBase = null;
  var pairingResult = document.getElementById("pairing-result");
  var pairingCode = document.getElementById("pairing-user-code");
  var liveList = document.getElementById("live-channel-list");
  var liveBackendName = document.getElementById("live-backend-name");
  var recordingList = document.getElementById("recording-list");
  var recordingBackendName = document.getElementById("recording-backend-name");
  var serverInput = document.getElementById("suite-base-input");
  var serverTest = document.getElementById("settings-test-button");
  var connectionResult = document.getElementById("suite-connection-result");
  var homeServerState = document.getElementById("home-server-state");
  var topbarServerState = document.getElementById("topbar-server-status");
  var message = document.getElementById("message");
  var keyStatus = document.getElementById("key-status");

  items.forEach(function (item) {
    var id = item.getAttribute("data-focus-id");
    if (id) controls[id] = item;
  });

  function focusRows() {
    if (currentView === "home") return [NAV_ROW].concat(HOME_ROWS);
    if (currentView === "live") return [NAV_ROW,
      ["detail-live-home", "detail-live-preview", "detail-live-more", "detail-live-backend"]];
    if (currentView === "recordings") {
      var rows = [NAV_ROW,
        ["detail-recordings-home", "detail-recordings-load",
         "detail-recordings-backend", "detail-recordings-previous"]];
      recordingFocusIds.forEach(function (id) { rows.push([id]); });
      rows.push(["detail-recordings-next"]);
      return rows;
    }
    if (currentView === "settings") return [
      NAV_ROW,
      ["detail-settings-home", "settings-base-input", "settings-test"],
      ["settings-pair-start", "settings-pair-check", "settings-pair-activate",
       "settings-pair-verify", "settings-pair-retry"]
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
        result.capabilityCount + " Fähigkeiten gemeldet; noch nicht angemeldet oder freigegeben.";
    }
    if (homeServerState) homeServerState.textContent = "API v1 erreichbar · Anmeldung offen";
    if (topbarServerState) topbarServerState.textContent = "API v1 erreichbar";
    message.textContent = "Einstellungen · Public API v1 erreichbar · noch kein Device-Grant";
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
    var saved = vault.read();
    if (saved.ok && saved.credential) {
      pairedCredential = saved.credential;
      pairMessage("Gerät gespeichert. Anmeldung prüfen; Backend-Berechtigungen sind separat zu vergeben.");
    } else if (!saved.ok) {
      pairMessage("Sichere Geräteablage nicht verfügbar. Kopplung gesperrt (kein unsicherer Ersatz).");
    }
  }
  function pairStart() {
    if (pairingBusy || pendingCredential || pairingRequest) {
      pairMessage("Es läuft bereits eine Kopplung. Status prüfen oder Ablauf abwarten."); return;
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
          pairMessage("Dieses TV-Gerät ist bereits gekoppelt. Vor erneutem Pairing Server-Identität prüfen.");
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
      pendingCredential = null;
      clearPairRequest();
      pairMessage("Gerät sicher gekoppelt. „Anmeldung prüfen“ kontrolliert die Device-Authentifizierung. Noch keine Backend-Rechte.");
    });
  }
  function pairVerify() {
    if (pairingBusy || pendingCredential) {pairMessage("Bitte zuerst Speicherung abschließen.");return;}
    var saved=vault.read();
    if (!saved.ok || !saved.credential) {pairMessage("Kein gespeichertes Device-Credential.");return;}
    pairedCredential=saved.credential;
    pairingBusy = true;
    pairMessage("Prüfe Geräteanmeldung über Public API v1 …");
    pairingClient.verify(pairedCredential,function (result) {
      pairingBusy = false;
      if (result.ok) {
        discoveredBase=pairedCredential.base;
        if (homeServerState) homeServerState.textContent = "Device verbunden · Grants offen";
        if (topbarServerState) topbarServerState.textContent = "Gerät angemeldet";
        message.textContent = "Device authentifiziert · Berechtigungen werden separat vergeben";
        pairMessage("Device-Authentifizierung erfolgreich. Sender/Aufnahmen benötigen Admin-Grants.");
      } else pairMessage("Geräteanmeldung nicht bestätigt: "+pairingError(result.kind,result.status)+
        " Credential bleibt sicher gespeichert.");
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

  function clearLiveRows() {
    liveRows = 0;
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
      // Untrusted server text is always inserted via textContent, never HTML.
      var row = document.createElement("li");
      row.className = "live-channel-row";
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
      liveList.appendChild(row);
      liveRows += 1;
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
        " · Wiedergabe noch nicht freigeschaltet.");
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
    if (!saved.ok || !saved.credential) {
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
        liveBusy = false;
        showLiveError(verified);
        return;
      }
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

  function clearRecordingRows() {
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
      row.setAttribute("data-recording-index", String(index));
      row.setAttribute("aria-label", recording.title || "Aufnahme ohne Titel");
      controls[id] = row;
      items.push(row);
      recordingFocusIds.push(id);
      var title = document.createElement("strong");
      title.textContent = recording.title || "Ohne Titel";
      var details = document.createElement("span");
      var info = [];
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
    if (recordingBusy) return;
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
      clearRecordingRows();
      fetchRecordingPage(++recordingRun, null, 0);
      return;
    }
    // Credentials remain in Tizen KeyManager; no localStorage or automatic pairing.
    var saved = vault.read();
    if (!saved.ok || !saved.credential) {
      showRecordingError({kind:"invalid_credential"}); return;
    }
    var selectedBase = serverInput && normalizeSuiteBase(serverInput.value);
    if (selectedBase && selectedBase !== saved.credential.base) {
      recordingStatus("error", "Anderer Server ausgewählt",
        "Die sichere Geräteanmeldung gehört zu einem anderen Server. Adresse prüfen.");
      return;
    }
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
        recordingBusy = false;
        showRecordingError(verified); return;
      }
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
        fetchRecordingPage(run, null, 0);
      });
    });
  }

  function showView(view) {
    if (ROUTES.indexOf(view) < 0) return false;
    if (currentView === "live" && view !== "live") {
      // In-flight responses cannot update a hidden view after navigation.
      liveRun += 1;
      liveBusy = false;
      channelCatalog.cancel();
    }
    if (currentView === "recordings" && view !== "recordings") {
      recordingRun += 1;
      recordingBusy = false;
      recordingCatalog.cancel();
      channelCatalog.cancel(); // Backend discovery may still be pending.
    }
    currentView = view;
    if (view === "live") {
      // Keep S2.2 DOWN-to-first-detail-button focus behavior.
      if (!rowMemory.live) rowMemory.live = {};
      rowMemory.live[1] = "detail-live-home";
      clearLiveRows();
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
    var liveAction = item.getAttribute("data-live-action");
    if (liveAction) {
      loadLiveChannels(liveAction);
      return;
    }
    var recordingIndex = item.getAttribute("data-recording-index");
    if (recordingIndex !== null && currentView === "recordings") {
      var chosen = recordingCurrentPageItems[Number(recordingIndex)];
      if (chosen) {
        recordingStatus("ready", chosen.title || "Aufnahme",
          (chosen.description || "Aufnahme aus dem VDR-Katalog.") +
          " · Wiedergabe wird in S5 integriert.");
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
  registerOptionalKeys(window);
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

  // Exactly one keydown owner. No view adds its own Samsung remote listener.
  document.addEventListener("keydown", function (event) {
    var key = normalizeRemoteKey(event);
    if (!key) return;
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
          key === "PLAY" || key === "PAUSE") intro.skip();
      return;
    }
    if (key === "UP" || key === "DOWN" || key === "LEFT" || key === "RIGHT") {
      setFocus(nextFocusId(focusedId, key, focusRows(), rowMemory[currentView]));
    } else if (key === "OK") {
      activate(controls[focusedId]);
    } else if (key === "BACK") {
      goBack();
    }
  });

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
