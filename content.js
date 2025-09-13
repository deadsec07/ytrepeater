(() => {
  // ---- Safe chrome.* ----
  async function safeGet(keys) { try { return (await chrome?.storage?.local?.get(keys)) || {}; } catch { return {}; } }
  async function safeSet(obj) { try { await chrome?.storage?.local?.set(obj); } catch {} }

  // ---- State ----
  const DEFAULTS = { autoEnable: false, rememberPerVideo: true, repeatCount: 0 };
  const state = {
    enabled: false, a: null, b: null, remaining: 0,
    rememberingKey: null,
    autoEnable: DEFAULTS.autoEnable,
    rememberPerVideo: DEFAULTS.rememberPerVideo,
    repeatCountDefault: DEFAULTS.repeatCount,
    url: location.href
  };

  let video = null, timeHandler = null, endHandler = null, navPoll = null, mo = null;

  // ---- Utils ----
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const isYT = () => location.hostname.endsWith(".youtube.com") || location.hostname === "youtube.com";
  const getVideoId = () => { try {
    const u = new URL(location.href);
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2]||null;
    return u.searchParams.get("v");
  } catch { return null; } };
  const findVideo = () => {
    const vids = [...document.querySelectorAll("video")];
    let best = null, area = 0;
    for (const v of vids) {
      const r = v.getBoundingClientRect();
      const a = r.width * r.height;
      if (a > area && r.width > 0 && r.height > 0) { best = v; area = a; }
    }
    return best;
  };

  // ---- Storage ----
  async function loadSettings() {
    const { ytrp_settings = {}, ytrp_vid = {} } = await safeGet(["ytrp_settings", "ytrp_vid"]);
    const s = { ...DEFAULTS, ...ytrp_settings };
    state.autoEnable = !!s.autoEnable;
    state.rememberPerVideo = !!s.rememberPerVideo;
    state.repeatCountDefault = Number(s.repeatCount ?? DEFAULTS.repeatCount) || 0;

    const vid = getVideoId();
    state.rememberingKey = vid;

    if (vid && state.rememberPerVideo && ytrp_vid[vid]) {
      const pv = ytrp_vid[vid];
      state.a = Number.isFinite(pv.a) ? pv.a : null;
      state.b = Number.isFinite(pv.b) ? pv.b : null;
      state.enabled = !!pv.enabled;
      state.remaining = Number(pv.remaining) || 0;
    } else {
      state.a = null; state.b = null;
      state.enabled = !!state.autoEnable;
      state.remaining = state.repeatCountDefault;
    }
  }
  async function savePerVideo() {
    if (!state.rememberPerVideo) return;
    const vid = state.rememberingKey; if (!vid) return;
    const { ytrp_vid = {} } = await safeGet(["ytrp_vid"]);
    ytrp_vid[vid] = { a: state.a, b: state.b, enabled: state.enabled, remaining: state.remaining };
    await safeSet({ ytrp_vid });
  }

  // ---- Badge ----
  const badgeText = () => (!state.enabled ? "" : (state.remaining > 0 ? `R${state.remaining}` : "R∞"));
  const pushBadge = () => { try { chrome.runtime.sendMessage({ type: "ytrp-badge", text: badgeText() }); } catch {} };

  // ---- Loop ----
  function attachLoopHandlers() {
    if (!video) return;
    detachLoopHandlers();

    timeHandler = () => {
      if (!state.enabled) return;
      const a = Number.isFinite(state.a) ? state.a : 0;
      let b = Number.isFinite(state.b) ? state.b : (video.duration || 0);
      if (b <= a + 0.01) b = a + 0.01;

      if (video.currentTime >= b) {
        if (state.remaining > 0) {
          state.remaining -= 1;
          if (state.remaining <= 0) { state.enabled = false; pushBadge(); savePerVideo(); return; }
        }
        video.currentTime = a + 0.001;
        video.play();
        pushBadge(); savePerVideo();
      }
    };

    endHandler = () => {
      if (!state.enabled) return;
      if (state.a == null && state.b == null) {
        if (state.remaining > 0) {
          state.remaining -= 1;
          if (state.remaining <= 0) { state.enabled = false; pushBadge(); savePerVideo(); return; }
        }
        video.currentTime = 0.001;
        video.play();
        pushBadge(); savePerVideo();
      }
    };

    video.addEventListener("timeupdate", timeHandler);
    video.addEventListener("ended", endHandler);
  }
  function detachLoopHandlers() {
    if (!video) return;
    if (timeHandler) video.removeEventListener("timeupdate", timeHandler);
    if (endHandler) video.removeEventListener("ended", endHandler);
    timeHandler = null; endHandler = null;
  }

  // ---- Actions ----
  function setA() { if (!video) return; state.a = Math.floor(video.currentTime); if (state.b != null && state.b <= state.a) state.b = null; pushBadge(); savePerVideo(); }
  function setB() { if (!video) return; const cur = Math.floor(video.currentTime); if (state.a != null && cur <= state.a) state.a = Math.max(0, cur - 1); state.b = cur; pushBadge(); savePerVideo(); }
  function clearAB() { state.a = null; state.b = null; pushBadge(); savePerVideo(); }
  function toggleRepeat() { state.enabled = !state.enabled; pushBadge(); savePerVideo(); }

  // ---- Keyboard (ignore modifiers so Cmd/Ctrl+R still reloads) ----
  function onKey(e) {
    if (!video) return;
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (typing) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

    if (e.key === 'r' || e.key === 'R') { toggleRepeat(); e.preventDefault(); }
    else if (e.key === '[') { setA(); e.preventDefault(); }
    else if (e.key === ']') { setB(); e.preventDefault(); }
    else if (e.key === '\\') { clearAB(); e.preventDefault(); }
  }

  // ---- Robust player detection ----
  function startVideoObserver() {
    if (mo) mo.disconnect();
    mo = new MutationObserver(() => {
      if (!video) {
        const v = findVideo();
        if (v) { video = v; attachLoopHandlers(); pushBadge(); }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function initializeForPage() {
    if (!isYT()) return;
    await loadSettings();

    // Try quickly
    for (let i=0; i<30 && !video; i++) { video = findVideo(); if (!video) await sleep(150); }
    if (video) { attachLoopHandlers(); pushBadge(); }
    startVideoObserver(); // keep watching in case video appears later
  }

  function tearDownPage() {
    if (mo) mo.disconnect();
    mo = null;
    detachLoopHandlers();
    video = null;
    pushBadge();
  }

  function startNavWatch() {
    if (navPoll) clearInterval(navPoll);
    navPoll = setInterval(() => {
      if (location.href !== state.url) {
        state.url = location.href;
        tearDownPage();
        initializeForPage();
      }
    }, 500);
    document.addEventListener("yt-navigate-finish", () => {
      state.url = location.href;
      tearDownPage();
      initializeForPage();
    });
  }

  // ---- Messages ----
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case "ytrp-toggle": toggleRepeat(); break;
      case "ytrp-set-a": setA(); break;
      case "ytrp-set-b": setB(); break;
      case "ytrp-clear-ab": clearAB(); break;
      case "ytrp-set-count": {
        const n = Number(msg.value) || 0;
        state.remaining = n; state.repeatCountDefault = n;
        savePerVideo(); pushBadge(); sendResponse({ ok: true }); return true;
      }
      case "ytrp-rescan": {
        const v = findVideo();
        if (v && v !== video) { video = v; attachLoopHandlers(); }
        sendResponse({ hasVideo: !!video, duration: video ? Math.floor(video.duration||0) : null });
        return true;
      }
      case "ytrp-get-state": {
        sendResponse({
          enabled: state.enabled,
          a: state.a,
          b: state.b,
          remaining: state.remaining,
          videoId: state.rememberingKey,
          hasVideo: !!video,
          videoDuration: video ? Math.floor(video.duration || 0) : null
        });
        return true;
      }
    }
    sendResponse({ ok: true });
  });

  // ---- Boot ----
  window.addEventListener("keydown", onKey, { capture: true });
  startNavWatch();
  initializeForPage();
})();
