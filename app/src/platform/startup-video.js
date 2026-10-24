// Offline startup branding: original VIDAA MP4, never a VDR MediaSession.
// The main app owns the single remote keydown listener; this controller owns only the cover.
export function createStartupVideo({ overlay, video, environment, source }) {
  const clock = environment || {};
  let running = false;
  let finished = false;
  let timer = null;

  function finish() {
    if (finished) return;
    finished = true;
    running = false;
    if (timer !== null && typeof clock.clearTimeout === "function") {
      clock.clearTimeout(timer);
      timer = null;
    }
    if (video) {
      try { video.pause(); } catch (_) { /* decoder may already be gone */ }
      try { video.removeAttribute("src"); video.load(); } catch (_) { /* teardown best effort */ }
    }
    if (overlay) overlay.hidden = true;
  }

  function start() {
    if (running || finished) return false;
    if (!overlay || !video || typeof source !== "string" ||
        source !== "./assets/branding/startvideo.mp4" ||
        typeof clock.setTimeout !== "function") {
      finish();
      return false;
    }
    running = true;
    overlay.hidden = false;
    video.preload = "auto";
    video.playsInline = true;
    video.muted = false;
    video.defaultMuted = false;
    video.addEventListener("ended", finish);
    video.addEventListener("error", finish);
    video.addEventListener("abort", finish);
    timer = clock.setTimeout(finish, 14000);

    try {
      video.src = source;
      video.load();
      const attempt = video.play();
      if (attempt && typeof attempt.catch === "function") {
        attempt.catch(function (error) {
          if (finished) return;
          if (!error || error.name !== "NotAllowedError") { finish(); return; }
          try {
            // Some runtimes reject unmuted autoplay: try silent intro once.
            video.muted = true;
            video.defaultMuted = true;
            const retry = video.play();
            if (retry && typeof retry.catch === "function") retry.catch(finish);
          } catch (_) { finish(); }
        });
      }
    } catch (_) { finish(); }
    return running;
  }

  return { start, skip: finish, active: () => running, completed: () => finished };
}
