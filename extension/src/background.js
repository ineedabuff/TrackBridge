const DEFAULT_API_BASE_URL = "https://trackbridge.maranda.io/api/v1";

function normalizeApiBaseUrl(value) {
  const raw = (value || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, "");
  return raw.endsWith("/api/v1") ? raw : `${raw}/api/v1`;
}

async function getConfig() {
  const stored = await chrome.storage.sync.get(["apiBaseUrl", "accessToken", "dashboardUrl"]);
  const apiBaseUrl = normalizeApiBaseUrl(stored.apiBaseUrl);
  const dashboardUrl = stored.dashboardUrl || apiBaseUrl.replace(/\/api\/v1$/, "");
  return { apiBaseUrl, dashboardUrl, accessToken: stored.accessToken || "" };
}

async function apiRequest(path, options = {}) {
  const config = await getConfig();
  if (!config.accessToken && path !== "/auth/login") {
    throw new Error("TrackBridge is not connected. Open the extension popup and sign in.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (config.accessToken) {
    headers.set("Authorization", `Bearer ${config.accessToken}`);
  }

  const response = await fetch(`${config.apiBaseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }
  return response.json();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  async function handleMessage() {
    if (message.type === "GET_CONFIG") {
      return getConfig();
    }

    if (message.type === "CREATE_TRACKED_EMAIL") {
      return apiRequest("/tracked-emails", {
        method: "POST",
        body: JSON.stringify(message.payload)
      });
    }

    if (message.type === "CREATE_TRACKED_LINK") {
      return apiRequest("/tracked-links", {
        method: "POST",
        body: JSON.stringify(message.payload)
      });
    }

    throw new Error("Unknown TrackBridge action");
  }

  handleMessage()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
