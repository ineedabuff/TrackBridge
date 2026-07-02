const DEFAULT_BASE_URL = "https://trackbridge.maranda.io";
const form = document.querySelector("#settings-form");
const apiBaseUrlInput = document.querySelector("#api-base-url");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const statusEl = document.querySelector("#status");
const openDashboardButton = document.querySelector("#open-dashboard");
const clearSessionButton = document.querySelector("#clear-session");

function normalizeBaseUrl(value) {
  return (value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
}

function apiBaseUrl(value) {
  const base = normalizeBaseUrl(value);
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

function dashboardUrl(value) {
  return normalizeBaseUrl(value).replace(/\/api\/v1$/, "");
}

function setStatus(message) {
  statusEl.textContent = message;
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(["apiBaseUrl", "dashboardUrl", "accessToken", "email"]);
  apiBaseUrlInput.value = stored.dashboardUrl || dashboardUrl(stored.apiBaseUrl || DEFAULT_BASE_URL);
  emailInput.value = stored.email || "";
  setStatus(stored.accessToken ? "Connected" : "Not connected");
}

async function login(event) {
  event.preventDefault();
  setStatus("Connecting...");

  const base = apiBaseUrl(apiBaseUrlInput.value);
  const dash = dashboardUrl(apiBaseUrlInput.value);
  const response = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailInput.value, password: passwordInput.value })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Login failed" }));
    setStatus(error.detail || "Login failed");
    return;
  }

  const auth = await response.json();
  await chrome.storage.sync.set({
    apiBaseUrl: base,
    dashboardUrl: dash,
    accessToken: auth.access_token,
    email: emailInput.value
  });
  passwordInput.value = "";
  setStatus("Connected");
}

async function openDashboard() {
  const stored = await chrome.storage.sync.get(["dashboardUrl", "apiBaseUrl"]);
  const url = stored.dashboardUrl || dashboardUrl(stored.apiBaseUrl || DEFAULT_BASE_URL);
  await chrome.tabs.create({ url });
}

async function clearSession() {
  await chrome.storage.sync.remove(["accessToken"]);
  setStatus("Disconnected");
}

form.addEventListener("submit", (event) => {
  login(event).catch((error) => setStatus(error.message || "Login failed"));
});
openDashboardButton.addEventListener("click", () => {
  openDashboard().catch((error) => setStatus(error.message || "Could not open dashboard"));
});
clearSessionButton.addEventListener("click", () => {
  clearSession().catch((error) => setStatus(error.message || "Could not disconnect"));
});

loadSettings();
