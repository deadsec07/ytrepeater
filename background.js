// Badge bg
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#0b84ff" });
});

// Relay global shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const type =
    command === "toggle-repeat" ? "ytrp-toggle" :
    command === "set-a"        ? "ytrp-set-a" :
    command === "set-b"        ? "ytrp-set-b" : null;
  if (type) chrome.tabs.sendMessage(tab.id, { type });
});

// Badge text from content
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== "ytrp-badge") return;
  const tabId = sender?.tab?.id;
  if (!tabId) return;
  chrome.action.setBadgeText({ text: msg.text || "", tabId });
});
