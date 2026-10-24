import { normalizeRemoteKey } from "./navigation/remote.js";
import { nextFocusId } from "./navigation/premium-focus.js";
import { getPlatformCapabilities } from "./platform/capabilities.js";
import { registerOptionalKeys } from "./platform/keys.js";
import { createStartupVideo } from "./platform/startup-video.js";

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
  var message = document.getElementById("message");
  var keyStatus = document.getElementById("key-status");

  items.forEach(function (item) {
    controls[item.getAttribute("data-focus-id")] = item;
  });

  function focusRows() {
    if (currentView === "home") return [NAV_ROW].concat(HOME_ROWS);
    return [NAV_ROW, ["detail-" + currentView + "-home"]];
  }

  function setFocus(id) {
    var chosen = controls[id];
    if (!chosen) return;
    focusedId = id;
    items.forEach(function (item) {
      var active = item === chosen;
      item.classList.toggle("is-focused", active);
      item.tabIndex = active ? 0 : -1;
    });
    chosen.focus();
  }

  function showView(view) {
    if (ROUTES.indexOf(view) < 0) return;
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
      : "Bereich: " + view + " · keine Serververbindung · Zurück = Home";
  }

  function activate(item) {
    if (!item) return;
    var view = item.getAttribute("data-route") || item.getAttribute("data-target-view");
    if (view && ROUTES.indexOf(view) >= 0) {
      showView(view);
      setFocus("nav-" + view);
    }
  }

  function quitApp() {
    try {
      if (window.tizen && window.tizen.application) {
        window.tizen.application.getCurrentApplication().exit();
        return;
      }
    } catch (_) { /* UI remains navigable on rejected app exit */ }
    message.textContent = "Zurück im Home-Menü erkannt · App-Exit am TV prüfen";
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
      setFocus(nextFocusId(focusedId, key, focusRows()));
    } else if (key === "OK") {
      activate(controls[focusedId]);
    } else if (key === "BACK") {
      if (currentView !== "home") {
        showView("home");
        setFocus("nav-home");
      } else {
        quitApp();
      }
    }
  });

  items.forEach(function (item) {
    item.addEventListener("click", function () {
      setFocus(item.getAttribute("data-focus-id"));
      activate(item);
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
