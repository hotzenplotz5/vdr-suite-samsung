import { normalizeRemoteKey } from "./navigation/remote.js";
import { nextFocusId } from "./navigation/premium-focus.js";
import { getPlatformCapabilities } from "./platform/capabilities.js";
import { registerOptionalKeys } from "./platform/keys.js";
import { createStartupVideo } from "./platform/startup-video.js";

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
  var message = document.getElementById("message");
  var keyStatus = document.getElementById("key-status");

  items.forEach(function (item) {
    var id = item.getAttribute("data-focus-id");
    if (id) controls[id] = item;
  });

  function focusRows() {
    return currentView === "home"
      ? [NAV_ROW].concat(HOME_ROWS)
      : [NAV_ROW, ["detail-" + currentView + "-home"]];
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

  function showView(view) {
    if (ROUTES.indexOf(view) < 0) return false;
    currentView = view;
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
      : "Bereich: " + view + " · keine Serververbindung · Zurück = vorherige Ansicht";
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
    var view = item.getAttribute("data-route") || item.getAttribute("data-target-view");
    if (view) navigateTo(view, item.getAttribute("data-focus-id"));
  }

  var caps = getPlatformCapabilities(window);
  document.getElementById("tizen-status").textContent = caps.tizen ? "vorhanden" : "nicht erkannt";
  document.getElementById("avplay-status").textContent = caps.avplay ? "vorhanden" : "nicht erkannt";
  document.getElementById("remote-status").textContent = caps.tvInputDevice ? "vorhanden" : "nicht erkannt";
  registerOptionalKeys(window);

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

  showView("home");
  setFocus("nav-home");
  intro.start();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}
