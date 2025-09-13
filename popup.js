// Tiny helpers
const fmt = s => { if (s==null || isNaN(s)) return "--:--"; s = Math.max(0, s|0); const m=(s/60)|0, sec=s%60; return `${m}:${sec.toString().padStart(2,"0")}`; };
async function activeTab() { const [tab] = await chrome.tabs.query({active: true, currentWindow: true}); return tab; }
async function activeTabId() { const t = await activeTab(); return t?.id; }
async function send(payload) { try { const id = await activeTabId(); if (!id) return null; return await chrome.tabs.sendMessage(id, payload); } catch { return null; } }
async function getState() { return await send({ type: "ytrp-get-state" }); }
function setMsg(msg, ok=true){ const el=document.getElementById("status"); el.textContent=msg||""; el.style.color= ok? "#0a7b22":"#a00"; }

// Always show UI; just sync when possible
function syncUI(s) {
  if (!s) return;
  const bVal = (s.b != null) ? s.b : (Number.isFinite(s.videoDuration) ? s.videoDuration : null);
  document.getElementById("toggle").textContent = `Repeat: ${s.enabled ? (s.remaining ? `x${s.remaining}` : "∞") : "Off"}`;
  document.getElementById("A").textContent = fmt(s.a);
  document.getElementById("B").textContent = fmt(bVal);
  if (typeof s.remaining === "number") document.getElementById("count").value = s.remaining;
}

(async function init() {
  // Version
  try { const mf = chrome.runtime.getManifest?.(); if (mf?.version) document.getElementById("ver").textContent = `v${mf.version}`; } catch {}

  // Try initial state (don’t hide UI if it fails)
  let st = await getState();
  if (!st || !st.hasVideo) {
    await send({ type: "ytrp-rescan" });
    st = await getState();
  }
  if (st && st.hasVideo) { syncUI(st); setMsg(""); }
  else setMsg("Open a YouTube video (click any button to retry).", false);

  // Buttons: always enabled; each click retries state
  document.getElementById("toggle").addEventListener("click", async () => {
    await send({ type: "ytrp-toggle" });
    const s = await getState(); if (s) { syncUI(s); setMsg(""); } else setMsg("No player yet.", false);
  });
  document.getElementById("setA").addEventListener("click", async () => {
    await send({ type: "ytrp-set-a" });
    const s = await getState(); if (s) { syncUI(s); setMsg(""); } else setMsg("No player yet.", false);
  });
  document.getElementById("setB").addEventListener("click", async () => {
    await send({ type: "ytrp-set-b" });
    const s = await getState(); if (s) { syncUI(s); setMsg(""); } else setMsg("No player yet.", false);
  });
  document.getElementById("clear").addEventListener("click", async () => {
    await send({ type: "ytrp-clear-ab" });
    const s = await getState(); if (s) { syncUI(s); setMsg(""); } else setMsg("No player yet.", false);
  });
  document.getElementById("count").addEventListener("change", async (e) => {
    const n = Number(e.target.value) || 0;
    await send({ type: "ytrp-set-count", value: n });
    const s = await getState(); if (s) { syncUI(s); setMsg(""); } else setMsg("No player yet.", false);
  });

  // Shortcuts editor
  document.getElementById("editShortcuts").addEventListener("click", async () => {
    try { await chrome.tabs.create({ url: "chrome://extensions/shortcuts" }); }
    catch {
      try { await navigator.clipboard.writeText("chrome://extensions/shortcuts"); setMsg("Copied chrome://extensions/shortcuts — paste in the address bar."); }
      catch { setMsg("Open chrome://extensions/shortcuts to edit keys.", false); }
    }
  });
})();
