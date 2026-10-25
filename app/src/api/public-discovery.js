// Public API v1 discovery only. No credentials, private APIs or playback.
// Accept an HTTPS deployment base (possibly behind a reverse-proxy prefix).
export function normalizeSuiteBase(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 1024) return null;
  var raw = value.trim();
  if (!/^https:\/\//i.test(raw) || /\s/.test(raw)) return null;
  var parsed;
  try { parsed = new URL(raw); } catch (_) { return null; }
  if (!parsed || parsed.protocol !== "https:" || !parsed.hostname ||
      parsed.username || parsed.password || parsed.search || parsed.hash) return null;
  var path = parsed.pathname || "/";
  if (/\/api\/v1\/?$/i.test(path) || /\/{2,}/.test(path) ||
      /%2f|%5c|%00/i.test(path)) return null;
  // Never allow encoded path traversal or an ambiguous scheme change.
  if (/\/\.\.?\/|\/\.\.?$|\\/.test(path)) return null;
  path = path.replace(/\/+$/, "");
  return parsed.origin + (path === "/" ? "" : path);
}

export function classifyDiscoveryError(type, status) {
  if (type === "invalid_origin") return "Bitte eine vollständige HTTPS-Serveradresse ohne Benutzername, Parameter oder Fragment eingeben.";
  if (type === "network") return "TV kann den Server nicht erreichen. Verbindung, DNS, TLS-Zertifikat und CORS prüfen.";
  if (type === "timeout") return "Zeitüberschreitung beim TV-Serverzugriff. Netzwerk oder Server prüfen.";
  if (type === "redirect") return "Unerwartete Weiterleitung. Bitte die endgültige HTTPS-Adresse eintragen.";
  if (type === "invalid_json" || type === "invalid_contract") return "Antwort entspricht nicht dem öffentlichen VDR-Suite-API-v1-Vertrag.";
  if (type === "incompatible") return "Dieser Server bietet keine kompatible Public API v1 an.";
  if (type === "http") return "Server antwortet mit HTTP " + status + ". Proxy und Public-v1-Pfad prüfen.";
  if (type === "unsupported") return "Netzwerk-API auf diesem TV nicht verfügbar.";
  return "Verbindung konnte nicht bestätigt werden.";
}

export function createDiscoveryClient(environment) {
  var env = environment || {};
  var currentRequest = null;
  var cancelled = false;

  function cancel() {
    cancelled = true;
    if (currentRequest && typeof currentRequest.abort === "function") {
      try { currentRequest.abort(); } catch (_) {}
    }
    currentRequest = null;
  }

  function getJson(url, callback) {
    if (typeof env.XMLHttpRequest !== "function") {
      callback({ok:false,kind:"unsupported"});
      return;
    }
    var request = new env.XMLHttpRequest();
    currentRequest = request;
    var ended = false;
    function finish(result) {
      if (ended || cancelled) return;
      ended = true;
      currentRequest = null;
      callback(result);
    }
    try {
      request.open("GET", url, true);
      request.timeout = 8000;
      request.withCredentials = false;
      request.setRequestHeader("Accept", "application/json");
      request.setRequestHeader("Cache-Control", "no-store");
      request.onload = function () {
        if (request.responseURL && request.responseURL !== url) {
          finish({ok:false,kind:"redirect"});
          return;
        }
        if (request.status === 0) {
          finish({ok:false,kind:"network"});
          return;
        }
        if (request.status !== 200) {
          finish({ok:false,kind:"http",status:request.status});
          return;
        }
        var body;
        try { body = JSON.parse(request.responseText); }
        catch (_) { finish({ok:false,kind:"invalid_json"}); return; }
        finish({ok:true,value:body});
      };
      request.onerror = function () { finish({ok:false,kind:"network"}); };
      request.ontimeout = function () { finish({ok:false,kind:"timeout"}); };
      request.send();
    } catch (_) {
      finish({ok:false,kind:"network"});
    }
  }

  function probe(address, callback) {
    var base = normalizeSuiteBase(address);
    if (!base) {
      callback({ok:false,kind:"invalid_origin"});
      return;
    }
    cancelled = false;
    getJson(base + "/api/v1", function (root) {
      if (!root.ok) { callback(root); return; }
      var value = root.value;
      if (!value || typeof value !== "object" || value.apiVersion !== "v1" ||
          !Array.isArray(value.supportedApiMajors) ||
          value.supportedApiMajors.indexOf("v1") < 0) {
        callback({ok:false,kind:"incompatible"});
        return;
      }
      if (!value.links || typeof value.links.capabilities !== "string" ||
          !value.compatibilityPolicy || !value.authentication) {
        callback({ok:false,kind:"invalid_contract"});
        return;
      }
      // Use the canonical documented route, never arbitrary server-provided links.
      getJson(base + "/api/v1/capabilities", function (caps) {
        if (!caps.ok) { callback(caps); return; }
        var data = caps.value;
        if (!data || typeof data !== "object" || data.apiVersion !== "v1" ||
            !Array.isArray(data.capabilities) || !data.compatibility ||
            !data.links || typeof data.links.root !== "string") {
          callback({ok:false,kind:"invalid_contract"});
          return;
        }
        callback({ok:true,base:base,capabilityCount:data.capabilities.length,
          authenticated:value.authentication.authenticated === true});
      });
    });
  }

  return {probe:probe,cancel:cancel};
}
