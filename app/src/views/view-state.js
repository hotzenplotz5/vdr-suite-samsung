// Offline S2.3 presentation states; no transport, media or mock 'real' data.
const PREVIEW_SEQUENCE = ["offline", "loading", "empty", "error"];
const SECTION_LABELS = {
  live: "Sender",
  recordings: "Aufnahmen",
  search: "Suchergebnisse",
  timers: "Timer"
};

export function nextPreviewState(current) {
  var index = PREVIEW_SEQUENCE.indexOf(current);
  return PREVIEW_SEQUENCE[(index + 1) % PREVIEW_SEQUENCE.length];
}

export function getViewPresentation(route, requested) {
  var name = SECTION_LABELS[route];
  if (!name) return null;
  var state = PREVIEW_SEQUENCE.indexOf(requested) >= 0 ? requested : "offline";
  if (state === "loading") {
    return {
      state: "loading", badge: "LADEVORSCHAU",
      title: name + " werden geladen",
      description: "So sieht der Ladezustand später aus. Es wird jetzt keine Anfrage gesendet.",
      skeleton: true
    };
  }
  if (state === "empty") {
    return {
      state: "empty", badge: "LEERE ANSICHT · DEMO",
      title: "Noch keine " + name,
      description: "Beispiel für eine leere Ansicht. Es wurden keine echten Inhalte abgefragt.",
      skeleton: false
    };
  }
  if (state === "error") {
    return {
      state: "error", badge: "FEHLERVORSCHAU",
      title: "Verbindung derzeit nicht möglich",
      description: "Simulierter Fehlerzustand. Später erscheinen hier konkrete Hinweise und eine sichere Wiederholen-Aktion.",
      skeleton: false
    };
  }
  return {
    state: "offline", badge: "OFFLINE",
    title: "Noch keine Serververbindung",
    description: "Die Inhalte werden erst nach autorisierter API-Anbindung geladen.",
    skeleton: false
  };
}
