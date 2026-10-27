// Read-only diagnostics for an already issued public v1 MediaSession.
// Avoid HEAD: MediaGatewayHttpServer allows GET only.
// Never read or log media bytes, cookies, device credentials or session URLs.
export function probeMediaHttpHeaders(environment,mediaUrl,done) {
  if (!environment || typeof environment.XMLHttpRequest !== "function" ||
      typeof mediaUrl !== "string" ||
      !/^https:\/\/[^\s?#]+\/[^?#]*\/api\/v1\/media\/sessions\/ms_[0-9a-f]{32}\/(?:hls\/master\.m3u8|recording\/stream\.(?:mp4|ts)|live\/stream\.mp4)$/.test(mediaUrl)) {
    done({kind:"not_supported"}); return;
  }
  var xhr = new environment.XMLHttpRequest();
  var ended = false;
  function finish(value) {
    if (ended) return;
    ended = true;
    // Abort immediately after headers: never download a VDR recording.
    try {xhr.abort();} catch (_) {}
    done(value);
  }
  try {
    xhr.open("GET",mediaUrl,true);
    xhr.withCredentials = true; // only the browser cookie jar, no JS cookie access
    xhr.timeout = 6000;
    xhr.setRequestHeader("Range","bytes=0-0");
    xhr.setRequestHeader("Cache-Control","no-store");
    xhr.onreadystatechange = function () {
      if (xhr.readyState < 2 || ended) return;
      // On the HEADERS_RECEIVED transition no response data is consumed.
      if (xhr.status === 200 || xhr.status === 206)
        finish({kind:"reachable",status:xhr.status});
      else if (xhr.status === 401 || xhr.status === 403)
        finish({kind:"denied",status:xhr.status});
      else if (xhr.status === 404 || xhr.status === 416)
        finish({kind:"unavailable",status:xhr.status});
      else finish({kind:"unknown",status:Number(xhr.status)||0});
    };
    xhr.onerror = function () {finish({kind:"network_or_cors"});};
    xhr.ontimeout = function () {finish({kind:"network_or_cors"});};
    xhr.send(null);
  } catch (_) {finish({kind:"network_or_cors"});}
}

export function describeMediaAccessProbe(result) {
  if (!result) return "Medienzugriff nicht geprüft.";
  if (result.kind === "reachable")
    return "Browser-Medienzugriff HTTP " + result.status +
      " – AVPlay-Zugriff/Decoder getrennt prüfen; Browser-Cookie gilt nicht automatisch für AVPlay.";
  if (result.kind === "denied")
    return "Geschützte Mediendatei im Browser HTTP " + result.status +
      " – Cookie-/SameSite-/Proxy-Pfad prüfen. Keine Credentials in URL übergeben.";
  if (result.kind === "unavailable")
    return "Medienroute antwortet HTTP " + result.status +
      " – aktiven MediaSession-Status/Range-Bereitstellung prüfen.";
  if (result.kind === "network_or_cors")
    return "Browser-Medienprüfung durch Netzwerk/TLS/CORS blockiert; " +
      "kein Beweis für einen AVPlay-Decoderfehler.";
  return "Medienzugriff unbekannt – AVPlay-/Backend-Logs erforderlich.";
}
