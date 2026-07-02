const PANEL_ID = "trackbridge-gmail-panel";

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "TrackBridge request failed"));
        return;
      }
      resolve(response.data);
    });
  });
}

function findCompose() {
  const dialogs = [...document.querySelectorAll('div[role="dialog"]')].filter((dialog) => {
    return dialog.querySelector('div[contenteditable="true"][role="textbox"]');
  });
  return dialogs.at(-1) || document;
}

function findMessageBody(compose) {
  const bodies = [...compose.querySelectorAll('div[contenteditable="true"][role="textbox"]')];
  return bodies.find((body) => body.getAttribute("aria-label")?.toLowerCase().includes("message")) || bodies.at(-1);
}

function readSubject(compose) {
  const input = compose.querySelector('input[name="subjectbox"]');
  return input?.value?.trim() || "Tracked Gmail message";
}

function readRecipient(compose) {
  const emailChip = compose.querySelector('[email], [data-hovercard-id]');
  const chipValue = emailChip?.getAttribute("email") || emailChip?.getAttribute("data-hovercard-id");
  if (chipValue?.includes("@")) return chipValue;

  const textarea = compose.querySelector('textarea[name="to"], textarea[aria-label*="To"]');
  if (textarea?.value?.includes("@")) return textarea.value.trim();

  return prompt("Recipient email for this tracked pixel:", "") || "recipient@example.com";
}

function insertHtmlIntoCompose(html) {
  const compose = findCompose();
  const body = findMessageBody(compose);
  if (!body) {
    throw new Error("Open a Gmail compose window first.");
  }

  body.focus();
  const inserted = document.execCommand("insertHTML", false, html);
  if (!inserted) {
    body.insertAdjacentHTML("beforeend", html);
  }
}

async function addPixel() {
  const compose = findCompose();
  const recipientEmail = readRecipient(compose);
  const subject = readSubject(compose);
  const trackedEmail = await sendRuntimeMessage({
    type: "CREATE_TRACKED_EMAIL",
    payload: { recipient_email: recipientEmail, subject }
  });
  insertHtmlIntoCompose(trackedEmail.pixel_html);
  showStatus("Pixel inserted");
}

async function addTrackedLink() {
  const selectedText = window.getSelection()?.toString().trim();
  const label = prompt("Link label:", selectedText || "View link");
  if (!label) return;

  const destinationUrl = prompt("Destination URL:", selectedText?.startsWith("http") ? selectedText : "https://");
  if (!destinationUrl) return;

  const trackedLink = await sendRuntimeMessage({
    type: "CREATE_TRACKED_LINK",
    payload: { label, destination_url: destinationUrl }
  });
  insertHtmlIntoCompose(trackedLink.link_html);
  showStatus("Tracked link inserted");
}

async function openDashboard() {
  const config = await sendRuntimeMessage({ type: "GET_CONFIG" });
  window.open(config.dashboardUrl, "_blank", "noopener,noreferrer");
}

function showStatus(text) {
  const status = document.querySelector(`#${PANEL_ID} .trackbridge-status`);
  if (!status) return;
  status.textContent = text;
  window.setTimeout(() => {
    status.textContent = "Ready";
  }, 2500);
}

function createPanel() {
  if (document.getElementById(PANEL_ID)) return;

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="trackbridge-title">TrackBridge</div>
    <button type="button" data-action="pixel">Pixel</button>
    <button type="button" data-action="link">Link</button>
    <button type="button" data-action="dashboard">Dashboard</button>
    <div class="trackbridge-status">Ready</div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #${PANEL_ID} {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 2147483647;
      display: grid;
      gap: 8px;
      width: 176px;
      padding: 12px;
      border: 1px solid #2b2b2b;
      border-radius: 8px;
      background: #050505;
      color: #f6f8f2;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      box-shadow: 0 16px 50px rgba(0, 0, 0, 0.36);
    }
    #${PANEL_ID} .trackbridge-title {
      color: #ddff24;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }
    #${PANEL_ID} button {
      min-height: 34px;
      border: 0;
      border-radius: 6px;
      background: #ddff24;
      color: #000000;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
    }
    #${PANEL_ID} .trackbridge-status {
      min-height: 16px;
      color: #9ea395;
      font-size: 11px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;

  panel.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    try {
      showStatus("Working...");
      if (button.dataset.action === "pixel") await addPixel();
      if (button.dataset.action === "link") await addTrackedLink();
      if (button.dataset.action === "dashboard") await openDashboard();
    } catch (error) {
      showStatus(error.message || "Error");
    }
  });

  document.documentElement.append(style, panel);
}

createPanel();
