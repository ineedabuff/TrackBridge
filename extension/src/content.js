const ROOT_CLASS = "trackbridge-compose-widget";
const MENU_CLASS = "trackbridge-compose-menu";
const STYLE_ID = "trackbridge-gmail-styles";

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

function findComposeToolbar(compose) {
  const sendButton = compose.querySelector('div[role="button"][data-tooltip^="Send"], div[role="button"][data-tooltip^="Envoyer"]');
  const sendContainer = sendButton?.closest('td') || sendButton?.parentElement;
  const toolbar = sendContainer?.parentElement;
  if (toolbar) return { toolbar, sendContainer };

  const body = findMessageBody(compose);
  const fallbackToolbar = body?.closest('table')?.querySelector('tr:last-child') || compose;
  return { toolbar: fallbackToolbar, sendContainer: null };
}

function readSubject(compose) {
  const input = compose.querySelector('input[name="subjectbox"]');
  return input?.value?.trim() || "Tracked Gmail message";
}

function readRecipient(compose) {
  const emailChip = compose.querySelector('[email], [data-hovercard-id]');
  const chipValue = emailChip?.getAttribute("email") || emailChip?.getAttribute("data-hovercard-id");
  if (chipValue?.includes("@")) return chipValue;

  const textarea = compose.querySelector('textarea[name="to"], textarea[aria-label*="To"], textarea[aria-label*="À"]');
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
  document.querySelectorAll(`.${ROOT_CLASS} .trackbridge-status`).forEach((status) => {
    status.textContent = text;
    window.setTimeout(() => {
      status.textContent = "Ready";
    }, 2500);
  });
}

function closeMenus(exceptWidget = null) {
  document.querySelectorAll(`.${ROOT_CLASS}.is-open`).forEach((widget) => {
    if (widget !== exceptWidget) widget.classList.remove("is-open");
  });
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${ROOT_CLASS} {
      position: relative;
      display: inline-flex;
      align-items: center;
      margin: 0 4px;
      color: #f6f8f2;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      vertical-align: middle;
      z-index: 20;
    }
    .trackbridge-trigger {
      display: inline-grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 999px;
      background: #121c1f;
      color: #ddff24;
      cursor: pointer;
      font: inherit;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0;
      box-shadow: inset 0 0 0 1px rgba(221, 255, 36, 0.18);
    }
    .trackbridge-trigger:hover,
    .${ROOT_CLASS}.is-open .trackbridge-trigger {
      background: #ddff24;
      color: #000000;
    }
    .${MENU_CLASS} {
      position: absolute;
      left: 0;
      bottom: 42px;
      display: none;
      width: 286px;
      padding: 14px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      background: #ffffff;
      color: #202124;
      font-family: Arial, sans-serif;
      box-shadow: 0 12px 32px rgba(60, 64, 67, 0.28);
    }
    .${ROOT_CLASS}.is-open .${MENU_CLASS} {
      display: grid;
      gap: 12px;
    }
    .${MENU_CLASS}::after {
      content: "";
      position: absolute;
      left: 14px;
      bottom: -8px;
      width: 14px;
      height: 14px;
      background: #ffffff;
      transform: rotate(45deg);
      box-shadow: 2px 2px 4px rgba(60, 64, 67, 0.08);
    }
    .trackbridge-menu-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 14px;
      font-weight: 700;
    }
    .trackbridge-menu-head span {
      color: #0b8043;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .trackbridge-action-list {
      display: grid;
      gap: 8px;
    }
    .trackbridge-action-list button {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 36px;
      padding: 0 10px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #202124;
      cursor: pointer;
      font: inherit;
      font-size: 14px;
      text-align: left;
    }
    .trackbridge-action-list button:hover {
      background: #f1f3f4;
    }
    .trackbridge-icon {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 5px;
      background: #e6f4ea;
      color: #137333;
      font-size: 13px;
      font-weight: 800;
      flex: 0 0 auto;
    }
    .trackbridge-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 10px;
      border-top: 1px solid #e0e0e0;
      color: #3c4043;
      font-size: 14px;
    }
    .trackbridge-switch {
      display: inline-grid;
      place-items: center;
      width: 21px;
      height: 21px;
      border-radius: 3px;
      background: #0b8043;
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
    }
    .trackbridge-status {
      min-height: 15px;
      color: #5f6368;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
  document.documentElement.append(style);
}

function createWidget(compose) {
  if (compose.querySelector(`.${ROOT_CLASS}`)) return;

  const placement = findComposeToolbar(compose);
  if (!placement?.toolbar) return;

  const widget = document.createElement("span");
  widget.className = ROOT_CLASS;
  widget.innerHTML = `
    <button class="trackbridge-trigger" type="button" aria-label="TrackBridge">TB</button>
    <div class="${MENU_CLASS}" role="menu">
      <div class="trackbridge-menu-head">
        <strong>Me notifier par</strong>
        <span>TrackBridge</span>
      </div>
      <div class="trackbridge-action-list">
        <button type="button" data-action="pixel"><span class="trackbridge-icon">@</span>Suivre les ouvertures d'e-mail</button>
        <button type="button" data-action="link"><span class="trackbridge-icon">↗</span>Créer un lien suivi</button>
        <button type="button" data-action="dashboard"><span class="trackbridge-icon">▦</span>Ouvrir le dashboard</button>
      </div>
      <div class="trackbridge-toggle-row">
        <span>Tracking actif</span>
        <span class="trackbridge-switch">✓</span>
      </div>
      <div class="trackbridge-status">Ready</div>
    </div>
  `;

  widget.querySelector(".trackbridge-trigger").addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const willOpen = !widget.classList.contains("is-open");
    closeMenus(widget);
    widget.classList.toggle("is-open", willOpen);
  });

  widget.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    try {
      showStatus("Working...");
      if (button.dataset.action === "pixel") await addPixel();
      if (button.dataset.action === "link") await addTrackedLink();
      if (button.dataset.action === "dashboard") await openDashboard();
      widget.classList.remove("is-open");
    } catch (error) {
      showStatus(error.message || "Error");
    }
  });

  if (placement.sendContainer?.nextSibling) {
    placement.toolbar.insertBefore(widget, placement.sendContainer.nextSibling);
    return;
  }
  placement.toolbar.append(widget);
}

function attachWidgets() {
  ensureStyles();
  document.querySelectorAll('div[role="dialog"]').forEach((compose) => {
    if (compose.querySelector('div[contenteditable="true"][role="textbox"]')) {
      createWidget(compose);
    }
  });
}

document.addEventListener("click", () => closeMenus());
const observer = new MutationObserver(() => attachWidgets());
observer.observe(document.body, { childList: true, subtree: true });
attachWidgets();
