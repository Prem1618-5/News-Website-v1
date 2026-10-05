/* News APP API/session bootstrap. Reader state remains server-backed for signed-in readers. */
(async () => {
  let legacyId;
  try {
    legacyId = localStorage.getItem("kiosk-reader");
    if (!legacyId) {
      legacyId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "reader-" + Date.now().toString(36);
      localStorage.setItem("kiosk-reader", legacyId);
    }
  } catch (_) { legacyId = "reader-" + Date.now().toString(36); }
  window.READER_ID = legacyId;
  try {
    localStorage.removeItem("news-app-access-token");
    localStorage.removeItem("news-app-refresh-token");
  } catch (_) {}
  window.AUTH_TOKEN = "";
  window.SESSION_USER = null;
  const authHeaders = () => ({});
  const saveSession = (payload) => {
    const data = payload && (payload.session || payload.data && payload.data.session || payload.data || payload);
    if (data && data.authenticated) {
      window.AUTH_TOKEN = "cookie-session";
      window.SESSION_USER = data.user || null;
      return true;
    }
    if (data && data.user) window.SESSION_USER = data.user;
    return false;
  };
  const clearSession = () => {
    window.AUTH_TOKEN = "";
    window.SESSION_USER = null;
  };
  async function request(url, options = {}, retry = true) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const opts = { ...options, headers, credentials: "same-origin" };
    delete opts.auth;
    const response = await fetch(url, opts);
    if (response.status === 401 && retry && url !== "/api/auth/refresh") {
      try {
        const fresh = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
        const result = await fresh.json();
        if (fresh.ok && saveSession(result)) return request(url, options, false);
      } catch (_) {}
      clearSession();
    }
    let body;
    try { body = await response.json(); } catch (_) { body = {}; }
    if (!response.ok) {
      const raw = body.detail || body.message || body.error_description || body.error;
      const message = typeof raw === "string" ? raw
        : Array.isArray(raw) && raw[0] && raw[0].msg ? String(raw[0].msg)
        : response.status >= 500 ? "The server had a problem. Try again in a moment."
        : "Request failed (" + response.status + ")";
      const error = new Error(message);
      error.status = response.status; error.payload = body;
      throw error;
    }
    return body;
  }
  const json = (method, data, extraHeaders = {}) => ({ method, headers: extraHeaders, body: JSON.stringify(data) });
  window.NEWS_API = {
    request,
    headers: authHeaders,
    getToken: () => window.AUTH_TOKEN,
    clearSession,
    saveSession,
    refresh: async () => saveSession(await request("/api/auth/refresh", { method: "POST" }, false)),
    signup: data => request("/api/auth/signup", json("POST", data), false),
    login: data => request("/api/auth/login", json("POST", data), false),
    logout: async () => { try { await request("/api/auth/logout", { method: "POST" }); } finally { clearSession(); } },
    me: async () => {
      const session = await request("/api/auth/session", {}, false);
      if (!session.authenticated) {
        clearSession();
        return null;
      }
      saveSession(session);
      return session.user;
    },
    getAccount: () => request("/api/account"),
    putAccount: data => request("/api/account", json("PUT", data)),
    putReader: data => request("/api/reader/state", json("PUT", data)),
    readStory: id => request("/api/activity/read", json("POST", { story_id: id })),
    checkin: () => request("/api/activity/checkin", json("POST", {})),
    getStory: id => request("/api/stories/" + encodeURIComponent(id)),
    config: null
  };
  let config;
  try { config = await request("/api/auth/config", {}, false); } catch (error) { config = { configured: false, error: error.message }; }
  window.AUTH_CONFIG = config;
  window.NEWS_API.config = config;
  try { await window.NEWS_API.me(); }
  catch (_) { clearSession(); /* The public pages remain available while signed out. */ }
  try {
    const [sections, page] = await Promise.all([
      request("/api/sections", {}, false),
      request("/api/stories?limit=100", {}, false)
    ]);
    window.SECTIONS = (Array.isArray(sections) ? sections : []).map(section => [section.key, section.name]);
    const items = Array.isArray(page) ? page : page.items || [];
    window.STORIES = items.map(story => ({
      id: story.id, s: story.section || story.section_key, t: story.title,
      d: story.deck || "", by: story.author || "", ago: story.ago || story.published_at || "",
      rt: story.read_minutes || story.reading_time || 4, live: !!story.live,
      img: story.image_url || "",
      src: story.source_name || "",
      url: story.source_url || "",
      cap: story.caption || "",
      lang: story.language === "hi" ? "hi" : "en"
    }));
    window.STORIES_ERROR = "";
  } catch (error) {
    window.SECTIONS = [["world","World"],["politics","Politics"],["business","Business"],["tech","Tech"],["sports","Sports"],["culture","Culture"],["science","Science"]];
    window.STORIES = [];
    window.STORIES_ERROR = error.message;
  }
  window.READER_STATE = {};
  if (window.AUTH_TOKEN) {
    try {
      window.READER_STATE = await request("/api/reader/state", {
        headers: { "X-Legacy-Reader-Id": legacyId }
      });
    } catch (error) {
      if (error.status === 401) clearSession();
      else window.READER_STATE_ERROR = error.message;
    }
  }
  await import("./app.js");
  await import("./consent.js");
  await import("./language.js");
})();
