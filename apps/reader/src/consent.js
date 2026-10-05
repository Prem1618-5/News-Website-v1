/* Cookie and tracking consent. Choices are kept on this device and recorded in the API consent ledger.
   Analytics events are sent only when the reader has allowed analytics. Global Privacy Control turns the optional tiers off. */
const VERSION = "2026-05";
const KEY = "news-consent-v1";
const GPC = !!navigator.globalPrivacyControl;
const subject = () => window.READER_ID || "";

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    return saved && saved.version === VERSION ? saved : null;
  } catch (_) { return null; }
};

const normalise = (choices) => ({
  necessary: true,
  preferences: choices.preferences !== false,
  analytics: GPC ? false : choices.analytics === true,
  personalization: GPC ? false : choices.personalization === true,
  notifications: false,
});

let queue = [];
let timer;

function flush() {
  window.clearTimeout(timer);
  const state = read();
  if (!queue.length || !state || !state.choices.analytics || !subject()) { queue = []; return; }
  const events = queue.splice(0, 50);
  fetch("/api/events", {
    method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject_id: subject(), events }),
  }).catch(() => {});
}

function track(name, extra = {}) {
  const state = read();
  if (!state || !state.choices.analytics) return;
  const width = window.innerWidth;
  queue.push({
    name,
    device: width < 768 ? "mobile" : width < 1100 ? "tablet" : "desktop",
    viewport: String(Math.round(width / 10) * 10),
    language: localStorage.getItem("news-lang") === "hi" ? "hi" : "en",
    ...extra,
  });
  window.clearTimeout(timer);
  timer = window.setTimeout(flush, 2500);
}

function save(choices, source = "banner") {
  const clean = normalise(choices);
  try { localStorage.setItem(KEY, JSON.stringify({ version: VERSION, choices: clean, at: Date.now() })); } catch (_) {}
  if (subject().length >= 8) {
    fetch("/api/consent", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ subject_id: subject(), version: VERSION, choices: clean, source, gpc: GPC }),
    }).catch(() => {});
  }
  if (!clean.analytics) queue = [];
  return clean;
}

const toggle = (id, label, hint, checked, disabled) => `
  <label class="cc-row"><span><b>${label}</b><small>${hint}</small></span>
  <input type="checkbox" id="${id}" role="switch" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}></label>`;

function close() { document.getElementById("cc-root")?.remove(); }

function open(mode = "banner") {
  close();
  const current = (read() || {}).choices || { preferences: true, analytics: false, personalization: false };
  const root = document.createElement("div");
  root.id = "cc-root";
  root.className = mode === "banner" ? "cc cc-banner glass-3" : "cc cc-modal";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Cookie and privacy choices");
  const intro = `<div class="cc-copy"><h2>Your privacy choices</h2><p>We use essential cookies to keep you signed in. With your permission we also remember preferences, personalise Today and count anonymous visits so our newsroom can see what helps readers.${GPC ? " Your browser sent a Global Privacy Control signal, so optional tracking stays off." : ""}</p></div>`;
  const options = `<div class="cc-list">
      ${toggle("cc-essential", "Essential", "Sign-in and security. Always on.", true, true)}
      ${toggle("cc-prefs", "Preferences", "Text size, theme and language.", current.preferences !== false, false)}
      ${toggle("cc-person", "Personalisation", "Tune Today to the topics you follow.", !!current.personalization, GPC)}
      ${toggle("cc-analytics", "Analytics", "Anonymous visit counts for the newsroom.", !!current.analytics, GPC)}
    </div>`;
  root.innerHTML = mode === "banner"
    ? `${intro}<div class="cc-actions"><button class="btn btn-s glass-2" data-cc="essential">Essential only</button><button class="btn btn-g" data-cc="customise">Choose</button><button class="btn btn-p" data-cc="all"${GPC ? " hidden" : ""}>Accept all</button></div>`
    : `<div class="cc-card">${intro}${options}<div class="cc-actions"><button class="btn btn-g" data-cc="cancel">Cancel</button><button class="btn btn-p" data-cc="save">Save choices</button></div></div>`;
  root.addEventListener("click", (event) => {
    const action = event.target.closest("[data-cc]")?.dataset.cc;
    if (!action) return;
    if (action === "customise") return open("modal");
    if (action === "cancel") return read() ? close() : open("banner");
    if (action === "all") save({ preferences: true, analytics: true, personalization: true });
    if (action === "essential") save({ preferences: false, analytics: false, personalization: false });
    if (action === "save") {
      save({
        preferences: document.getElementById("cc-prefs").checked,
        analytics: document.getElementById("cc-analytics").checked,
        personalization: document.getElementById("cc-person").checked,
      }, read() ? "preference_center" : "banner");
    }
    close();
    document.dispatchEvent(new CustomEvent("news:consent"));
  });
  document.body.appendChild(root);
  if (mode === "modal") root.querySelector("button:not([hidden])")?.focus({ preventScroll: true });
}

let lastPath = "";
function onRoute() {
  const path = location.hash.replace(/^#/, "") || "/";
  if (path === lastPath) return;
  lastPath = path;
  const internal = !!document.referrer && new URL(document.referrer).origin === location.origin;
  track("page_view", { referrer_kind: internal || lastPath !== path ? "internal" : document.referrer ? "search" : "direct" });
  const story = path.match(/^\/story\/([^/?#]+)/);
  if (story) track("article_open", { story_id: decodeURIComponent(story[1]).slice(0, 160) });
}

window.NEWS_CONSENT = { open: () => open("modal"), save, track, get: () => (read() || {}).choices || null };
window.addEventListener("hashchange", onRoute);
window.addEventListener("pagehide", flush);
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-consent-open]")) { event.preventDefault(); open("modal"); }
});
document.addEventListener("news:language", (event) => track("language_switch", { language: event.detail }));

const start = () => { onRoute(); if (!read()) open("banner"); };
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
