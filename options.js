const DEFAULTS = {
  autoEnable: false,
  rememberPerVideo: true,
  overlayPos: "top-right",
  repeatCount: 0
};

async function load() {
  const { ytrp_settings = {} } = await chrome.storage.local.get("ytrp_settings");
  const s = { ...DEFAULTS, ...ytrp_settings };
  document.getElementById("autoEnable").checked = !!s.autoEnable;
  document.getElementById("rememberPerVideo").checked = !!s.rememberPerVideo;
  document.getElementById("overlayPos").value = s.overlayPos || "top-right";
  document.getElementById("repeatCount").value = Number(s.repeatCount || 0);
}

async function save() {
  const s = {
    autoEnable: document.getElementById("autoEnable").checked,
    rememberPerVideo: document.getElementById("rememberPerVideo").checked,
    overlayPos: document.getElementById("overlayPos").value,
    repeatCount: Number(document.getElementById("repeatCount").value) || 0
  };
  await chrome.storage.local.set({ ytrp_settings: s });
  if (!s.rememberPerVideo) await chrome.storage.local.set({ ytrp_vid: {} });
  const msg = document.getElementById("msg");
  msg.textContent = "Saved!";
  setTimeout(() => msg.textContent = "", 1200);
}

document.getElementById("save").addEventListener("click", save);
load();
