import { normalizeRemoteKey } from "./navigation/remote.js";
import { nextFocusId } from "./navigation/premium-focus.js";
import { getPlatformCapabilities } from "./platform/capabilities.js";
import { registerOptionalKeys } from "./platform/keys.js";
import { createStartupVideo } from "./platform/startup-video.js";
import { nextPreviewState, getViewPresentation } from "./views/view-state.js";
import { normalizeSuiteBase, createDiscoveryClient, classifyDiscoveryError } from "./api/public-discovery.js";
import { createPairingClient, pairingError } from "./api/device-pairing.js";
import { createDeviceVault } from "./platform/device-vault.js";

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

  function testServerConnection() {
    if (testingConnection || !serverInput || !connectionResult) return;
    var address = normalizeSuiteBase(serverInput.value);
    if (!address) {
      connectionResult.textContent = classifyDiscoveryError("invalid_origin");
      connectionResult.setAttribute("data-connection-state", "error");
      return;
    }
    // Only the server base is retained, never credentials or query parameters.
    try {
      if (window.localStorage) window.localStorage.setItem("vdr-suite.samsung.serverBase", address);
    } catch (_) {}
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
      connectionResult.setAttribute("data-connection-state", "success");
      discoveredBase = result.base;
      if (homeServerState) homeServerState.textContent = "API v1 erreichbar · Anmeldung offen";
      if (topbarServerState) topbarServerState.textContent = "API v1 erreichbar";
      message.textContent = "Einstellungen · Public API v1 erreichbar · noch kein Device-Grant";
      connectionResult.textContent = "Public API v1 erreichbar. " +
        result.capabilityCount + " Fähigkeiten gemeldet; noch nicht angemeldet oder freigegeben.";
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
      pairMessage("Es läuft bereits eine Kopplung. Status prüfen oder Ablauf abwarten.");return;
    }
    var base = serverInput && normalizeSuiteBase(serverInput.value);
    if (!base) {pairMessage("Zuerst eine gültige HTTPS-Serveradresse eingeben.");return;}
    if (base !== discoveredBase) {
      pairMessage("Bitte zuerst für genau diese Serveradresse „Verbindung prüfen“ ausführen.");return;
    }
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

  function showView(view) {
    if (ROUTES.indexOf(view) < 0) return false;
    currentView = view;
    if (PREVIEW_ROUTES.indexOf(view) >= 0) {
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
    try {
      var savedBase = window.localStorage && window.localStorage.getItem("vdr-suite.samsung.serverBase");
      if (normalizeSuiteBase(savedBase)) serverInput.value = savedBase;
    } catch (_) {}
    serverInput.addEventListener("blur", function () { editingServerAddress = false; });
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
