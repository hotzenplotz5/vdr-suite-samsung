import { normalizeRemoteKey } from "./navigation/remote.js";
import { nextMenuIndex } from "./navigation/focus.js";
import { getPlatformCapabilities } from "./platform/capabilities.js";
import { registerOptionalKeys } from "./platform/keys.js";
import { createStartupVideo } from "./platform/startup-video.js";

const VIEWS = {
  home: ["Willkommen bei VDR-Suite", "Dieser erste Prototyp prüft Bildschirm, Fernbedienung und Samsung-Laufzeit. Noch keine Verbindung zum Server."],
  live: ["Live-TV", "Live-TV wird erst nach bestätigter API-Verbindung und AVPlay-Abnahme implementiert (S6)."],
  recordings: ["Aufnahmen", "Ordner und Aufnahmen werden später ausschließlich über die autorisierte VDR-Suite Public API v1 geladen (S4)."],
  settings: ["Einstellungen", "Die Geräteanzeige unten enthält nur harmlose Fähigkeiten; Pairing folgt erst in S3."]
};

function boot() {
  const buttons = Array.prototype.slice.call(document.querySelectorAll(".menu-item"));
  let focused = 0;
  let currentView = "home";
  const message = document.getElementById("message");
  const keyStatus = document.getElementById("key-status");

  function showMessage(text) { message.textContent = text; }
  function setFocus(next) {
    focused = next;
    buttons.forEach(function (button, index) {
      const active = index === focused;
      button.classList.toggle("is-focused", active);
      button.tabIndex = active ? 0 : -1;
    });
    buttons[focused].focus();
  }
  function showView(view) {
    if (!VIEWS[view]) return;
    currentView = view;
    document.getElementById("view-title").textContent = VIEWS[view][0];
    document.getElementById("view-description").textContent = VIEWS[view][1];
    showMessage("Bereich: " + buttons[focused].textContent.trim() + " · keine Serververbindung");
  }
  function quitApp() {
    try {
      if (window.tizen && window.tizen.application) {
        window.tizen.application.getCurrentApplication().exit();
        return;
      }
    } catch (_) { /* runtime may deny app exit */ }
    showMessage("Back im Startmenü erkannt. App-Exit am TV noch zu verifizieren.");
  }

  const caps = getPlatformCapabilities(window);
  document.getElementById("tizen-status").textContent = caps.tizen ? "vorhanden" : "nicht erkannt";
  document.getElementById("avplay-status").textContent = caps.avplay ? "vorhanden" : "nicht erkannt";
  document.getElementById("remote-status").textContent = caps.tvInputDevice ? "vorhanden" : "nicht erkannt";
  registerOptionalKeys(window);
  const intro = createStartupVideo({
    overlay: document.getElementById("startup-cover"),
    video: document.getElementById("startup-video"),
    environment: window,
    source: "./assets/branding/startvideo.mp4"
  });
  intro.start();

  document.addEventListener("keydown", function (event) {
    const key = normalizeRemoteKey(event);
    if (!key) return;
    event.preventDefault();
    keyStatus.textContent = key;
    // Cover is presentation only: never activate a hidden navigation button.
    if (intro.active()) {
      if (key === "OK" || key === "BACK" || key === "STOP" ||
          key === "PLAY" || key === "PAUSE") intro.skip();
      return;
    }
    if (key === "UP" || key === "DOWN" || key === "LEFT" || key === "RIGHT") {
      setFocus(nextMenuIndex(focused, key, buttons.length));
    } else if (key === "OK") {
      showView(buttons[focused].getAttribute("data-view"));
    } else if (key === "BACK") {
      if (currentView !== "home") {
        showView("home");
        setFocus(0);
      } else {
        quitApp();
      }
    } else {
      showMessage("Taste " + key + " empfangen (noch ohne Medienfunktion).");
    }
  });

  buttons.forEach(function (button, index) {
    button.addEventListener("click", function () {
      setFocus(index);
      showView(button.getAttribute("data-view"));
    });
  });
  setFocus(0);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}
