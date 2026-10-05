(function () {
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const IC = {
  today:"M4 4h16v16H4zM8 9h8M8 13h5", following:"M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  saved:"M6 3h12v18l-6-4-6 4z",search:"M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4",moon:"M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z",
  sun:"M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5",
  back:"M15 5l-7 7 7 7",next:"M9 5l7 7-7 7",link:"M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  like:"M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z",comment:"M4 5h16v11H9l-5 4z",
  share:"M4 12v7h16v-7M12 3v12M8 7l4-4 4 4",send:"M12 19V5M6 11l6-6 6 6",check:"M5 12l5 5 9-10",
  x:"M6 6l12 12M18 6L6 18",user:"M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  sections:"M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",  mail:"M3 6h18v12H3zM3 7l9 7 9-7",
  sidebar:"M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm6-2v18"
};
let isSidebarPinned = false;
try { isSidebarPinned = localStorage.getItem("kiosk-sidebar-pinned") === "true"; } catch (_) {}
const ic = name => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[name] || IC.today}"/></svg>`;
const SECTIONS = window.SECTIONS || [];
const SEC = Object.fromEntries(SECTIONS);
const STORIES = window.STORIES || [];
let ST = { saved:[], hl:[], liked:[], follow:[], cm:{}, theme:"light", sz:0, ...(window.READER_STATE || {}) };
ST.saved = Array.isArray(ST.saved) ? ST.saved : [];
ST.hl = Array.isArray(ST.hl) ? ST.hl : [];
ST.liked = Array.isArray(ST.liked) ? ST.liked : [];
ST.follow = Array.isArray(ST.follow) ? ST.follow : [];
ST.cm = ST.cm && typeof ST.cm === "object" ? ST.cm : {};
const SIZES = ["1.0625rem","1.25rem","1.5rem"], SZN = ["Default","Large","Largest"];
const LINE = {world:"Places, borders and the people who cross them.",politics:"Who decides, and what it costs.",business:"Prices, pay and the markets behind them.",tech:"Phones, apps and the people who fix them.",sports:"Results, rule changes and the people on the pitch.",culture:"Screens, shelves and the rooms people fill.",science:"Data, fieldwork and what it found."};
const FILT = [["Latest",items=>items],["Top this week",items=>items.slice(0,5)],["Explainers",items=>items.filter(s=>/^(Why|How|What)/.test(s.t))],["Opinion",()=>[]]];
const by = id => STORIES.find(story => String(story.id) === String(id));
let saveTimer, debounceTimer, undoAction, toastTimer, selectedRange = null, briefingIndex = 0, savedView = "s", accountCache = null, activeAccountRequest = 0;
function hexToHsl(hex) {
  if (!hex || typeof hex !== "string") return null;
  hex = hex.trim().replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    str: `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  };
}

const THEME_PRESETS = [
  {
    id: "royal",
    name: "Royal Gazette",
    badge: "Default",
    primary: "#3C63ED",
    secondary: "#17703F",
    paper: "#f8faff",
    paperDark: "#0b1020"
  },
  {
    id: "editorial",
    name: "Editorial Rust",
    badge: "Warm",
    primary: "#c2410c",
    secondary: "#0f766e",
    paper: "#fbf9f5",
    paperDark: "#10141d"
  },
  {
    id: "nordic",
    name: "Nordic Forest",
    badge: "Nature",
    primary: "#059669",
    secondary: "#d97706",
    paper: "#f7fee7",
    paperDark: "#061a14"
  },
  {
    id: "cobalt",
    name: "Cobalt Modern",
    badge: "Vivid",
    primary: "#2563eb",
    secondary: "#059669",
    paper: "#f8fafc",
    paperDark: "#0b132b"
  },
  {
    id: "crimson",
    name: "Crimson Press",
    badge: "Bold",
    primary: "#dc2626",
    secondary: "#4f46e5",
    paper: "#fff7ed",
    paperDark: "#1a0808"
  }
];

let CUSTOM_THEME = {
  preset: "royal",
  primary: "#3C63ED",
  secondary: "#17703F",
  paper: "#f8faff",
  paperDark: "#0b1020"
};
try {
  const saved = localStorage.getItem("kiosk-custom-theme");
  if (saved) CUSTOM_THEME = { ...CUSTOM_THEME, ...JSON.parse(saved) };
} catch (_) {}

function hexToRgb(hex) {
  hex = String(hex || "").trim().replace(/^#/, "");
  if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
    hex = hex.split("").map(c => c + c).join("");
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return null;
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function calculateLuminance(r, g, b) {
  const [lr, lg, lb] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function getContrastRatio(hex1, hex2) {
  try {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    if (!rgb1 || !rgb2) return null;
    const l1 = calculateLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = calculateLuminance(rgb2.r, rgb2.g, rgb2.b);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return Math.round(ratio * 10) / 10;
  } catch (_) {
    return null;
  }
}

const isDark = () => ST.theme === "dark";
const applyTheme = () => {
  const dark = isDark();
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const root = document.documentElement;

  const p = hexToHsl(CUSTOM_THEME.primary);
  if (p) {
    root.style.setProperty("--accent", p.str);
    const softL = dark ? 22 : 94;
    const softS = Math.min(p.s, 60);
    root.style.setProperty("--accent-soft", `${p.h} ${softS}% ${softL}%`);
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-soft");
  }

  const s = hexToHsl(CUSTOM_THEME.secondary);
  if (s) {
    root.style.setProperty("--green", s.str);
  } else {
    root.style.removeProperty("--green");
  }

  const paperHex = dark ? (CUSTOM_THEME.paperDark || "#10141d") : (CUSTOM_THEME.paper || "#fbf9f5");
  const pap = hexToHsl(paperHex);
  if (pap) {
    root.style.setProperty("--paper", pap.str);
  } else {
    root.style.removeProperty("--paper");
  }
};
const localTimezone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch (_) { return "UTC"; }
};
const persist = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!window.AUTH_TOKEN) return;
    try { await NEWS_API.putReader(ST); window.READER_STATE_ERROR = ""; }
    catch (error) { toast("Your reading changes could not sync. Try again."); console.warn("Reader state update failed", error); }
  }, 350);
};
const tag = section => `<span class="section-tag s-${esc(section)}"><i class="sec-accent" aria-hidden="true"></i>${esc(SEC[section] || section || "News")}</span>`;
const meta = (story, author, section, date) => `<div class="meta-line">${author && story.by ? `<span class="meta-author">${esc(story.by)}</span><i class="meta-sep" aria-hidden="true"></i>` : ""}${section ? tag(story.s) + '<i class="meta-sep" aria-hidden="true"></i>' : ""}${story.src ? `<span class="source-tag">${esc(story.src)}</span><i class="meta-sep" aria-hidden="true"></i>` : ""}<span class="meta-time">${esc(date || story.ago || "Today")}</span><i class="meta-sep" aria-hidden="true"></i><span class="meta-duration">${Number(story.rt) || 4} min read</span></div>`;
const img = (story, content = "", cls = "") => {
  const src = story.img || story.image_url || "";
  const photo = src ? `<img class="img-media" src="${esc(src)}" alt="${esc(story.t || '')}" loading="lazy" onerror="this.classList.add('broken')">` : "";
  const cap = (cls.includes("hero") && story.cap) ? `<figcaption class="hero-caption">${esc(story.cap)}</figcaption>` : "";
  return `<div class="img s-${esc(story.s)} ${cls}">${photo}${content}${cap}</div>`;
};
const saveButton = id => `<button class="save-btn ib" data-act="save" data-id="${esc(id)}" aria-pressed="${ST.saved.includes(id)}" aria-label="${ST.saved.includes(id) ? "Remove saved story" : "Save story"}">${ic("saved")}</button>`;
const markTerms = (text, words) => {
  const safe = esc(text);
  if (!words || !words.length) return safe;
  const expression = new RegExp("(" + words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|") + ")", "gi");
  return safe.replace(expression, "<mark>$1</mark>");
};
const storyCard = (story, variant = "row", words = []) => {
  const isSaved = ST.saved.some(item => String(item) === String(story.id));
  const headline = words && words.length ? markTerms(story.t, words) : esc(story.t);
  const deck = story.d ? (words && words.length ? markTerms(story.d, words) : esc(story.d)) : "";
  const secName = SEC[story.s] || story.s || "News";
  return `
    <div class="card-slot">
      <article class="story-card variant-${variant}" data-id="${esc(story.id)}">
        <div class="story-body">
          <div class="story-kicker">
            <span class="section-tag s-${esc(story.s)}">
              <i class="sec-accent" aria-hidden="true"></i>
              ${esc(secName)}
            </span>
            ${story.live ? '<span class="live-tag">Live</span>' : ""}
          </div>
          <h3 class="story-headline">
            <a href="#/story/${encodeURIComponent(story.id)}" class="headline-link">
              ${headline}
            </a>
          </h3>
          ${deck ? `<p class="story-deck">${deck}</p>` : ""}
          <div class="meta-line">
            ${story.by ? `<span class="meta-author">${esc(story.by)}</span><i class="meta-sep" aria-hidden="true"></i>` : ""}
            <span class="meta-time">${esc(story.ago || "Today")}</span>
            <i class="meta-sep" aria-hidden="true"></i>
            <span class="meta-duration">${Number(story.rt) || 4} min read</span>
          </div>
        </div>
        <div class="story-media-wrap">
          <a href="#/story/${encodeURIComponent(story.id)}" class="media-link" tabindex="-1" aria-hidden="true">
            ${img(story, story.live ? '<span class="live-tag" style="position:absolute;top:10px;left:10px;z-index:2">Live</span>' : "")}
          </a>
          <button class="save-btn" data-act="save" data-id="${esc(story.id)}" aria-pressed="${isSaved}" aria-label="${isSaved ? "Remove saved story" : "Save story"}">
            ${ic("saved")}
          </button>
        </div>
      </article>
    </div>
  `;
};
const row = (story, words = []) => storyCard(story, "row", words);
const relatedCard = story => `<a class="rc" href="#/story/${encodeURIComponent(story.id)}">${img(story)}<span><b>${esc(story.t)}</b>${tag(story.s)}</span></a>`;
const tile = story => storyCard(story, "tile");
const lead = (story, split = false) => storyCard(story, "lead");
const empty = (heading, body, linkText, href, icon = "search") => `<section class="empty glass-2">${ic(icon)}<h2>${esc(heading)}</h2><p>${esc(body)}</p><a class="btn btn-p" href="${href}">${esc(linkText)}</a></section>`;
const sectionHeading = (heading, body) => `<section class="rp"><h2>${esc(heading)}</h2>${body}</section>`;
const sharePanel = () => {
  const url = encodeURIComponent(location.href);
  return sectionHeading("Share this story",`<div class="shr">${[["LinkedIn","in","https://www.linkedin.com/sharing/share-offsite/?url="+url],["X","X","https://twitter.com/intent/tweet?url="+url],["Facebook","f","https://www.facebook.com/sharer/sharer.php?u="+url]].map(([name,glyph,href])=>`<a class="ib glass-2" target="_blank" rel="noopener" href="${href}" aria-label="Share on ${name}">${glyph}</a>`).join("")}<a class="ib glass-2" href="mailto:?body=${url}" aria-label="Share by email">${ic("mail")}</a><button class="ib glass-2" data-act="copy" aria-label="Copy story link">${ic("link")}</button></div>`);
};
const followButton = key => {
  const following = ST.follow.includes(key);
  return `<button class="btn ${following ? "btn-g glass-2" : "btn-p"}" data-act="follow" data-k="${esc(key)}">${following ? ic("check")+"Following" : "Follow "+esc(SEC[key] || key)}</button>`;
};
const chips = current => `<div class="chips m-chips">${[["/","Today"],...SECTIONS.map(([key,name])=>["/"+key,name])].map(([href,name])=>`<a class="chip glass-2"${href===current?' aria-current="page"':""} href="#${href}">${esc(name)}</a>`).join("")}</div>`;
const side = current => `<nav class="sidebar" aria-label="Main navigation"><div class="sidebar-head"><a class="logo" href="#/" aria-label="News APP home"><i>N</i><span class="wm">News APP</span></a><button class="sidebar-toggle-btn" data-act="toggle-pin" aria-label="${isSidebarPinned ? "Collapse sidebar" : "Keep sidebar open"}" title="${isSidebarPinned ? "Collapse sidebar" : "Keep sidebar open"}">${ic("sidebar")}</button></div><div class="nav">${[["/","today","Today"],["/following","following","Following"],["/saved","saved","Saved"],["/search","search","Search"]].map(([href,icon,label])=>`<a href="#${href}"${current===href?' aria-current="page"':""}>${ic(icon)}<span class="lbl">${label}</span></a>`).join("")}</div><div class="hr"></div><div class="nav">${SECTIONS.map(([key,name])=>`<a class="sec s-${esc(key)}" href="#/${encodeURIComponent(key)}"${current==="/"+key?' aria-current="page"':""}><span class="lbl">${esc(name)}</span></a>`).join("")}</div><div class="sp"></div><div class="nav"><a href="#/account"${current==="/account"?' aria-current="page"':""}>${ic("user")}<span class="lbl">Account</span></a></div></nav>`;
const top = (title, back = false, extra = "") => `<div class="topbar-wrap">${!back ? `<button class="sidebar-toggle-btn d-only" data-act="toggle-pin" aria-label="${isSidebarPinned ? "Collapse sidebar" : "Open sidebar"}" title="${isSidebarPinned ? "Collapse sidebar" : "Open sidebar"}">${ic("sidebar")}</button>` : ""}<header class="topbar glass-3">${back ? `<a class="btn btn-g topbar-back" href="#/">${ic("back")}<span class="d-only">Today</span></a>` : `<a class="logo m-only" href="#/" aria-label="News APP"><i>N</i></a><b class="pt">${esc(title)}</b>`}${extra}<span class="sp"></span><label class="pill glass-2 d-only">${ic("search")}<input id="tq" type="search" placeholder="Search news…" aria-label="Search news"></label><a class="ib glass-2 m-only" href="#/search" aria-label="Search news">${ic("search")}</a><a class="ib glass-2" href="#/account" aria-label="Your account">${ic("user")}</a><button class="ib glass-2" data-act="theme" aria-label="Switch to ${isDark() ? "light" : "dark"} theme">${ic(isDark() ? "sun" : "moon")}</button></header></div>`;
const briefWidget = () => `<section class="brief glass-2"><h2>Today in 5 stories</h2><p class="mt">A clear picture in two minutes.</p><div class="dots"><i></i><i></i><i></i><i></i><i></i></div><button class="btn btn-p" data-act="brief">Start briefing</button></section>`;
const mostRead = () => sectionHeading("Worth your time",STORIES.slice(0,5).map((story,index)=>`<a class="rc mr" href="#/story/${encodeURIComponent(story.id)}"><span class="rank">${index+1}</span><span><b>${esc(story.t)}</b>${tag(story.s)}</span></a>`).join(""));

let sidebarHoverTimer = null;
function openSidebarHover() {
  if (isSidebarPinned || window.innerWidth <= 760) return;
  const sidebar = $(".sidebar");
  if (!sidebar) return;
  clearTimeout(sidebarHoverTimer);
  sidebar.classList.add("is-hover-open");
}
function closeSidebarHover(delay = 180) {
  if (isSidebarPinned) return;
  const sidebar = $(".sidebar");
  if (!sidebar) return;
  clearTimeout(sidebarHoverTimer);
  sidebarHoverTimer = setTimeout(() => {
    const curSidebar = $(".sidebar");
    if (curSidebar && !isSidebarPinned) {
      curSidebar.classList.remove("is-hover-open");
    }
  }, delay);
}
function bindSidebarEvents() {
  const sidebar = $(".sidebar");
  if (!sidebar) return;
  sidebar.addEventListener("mouseenter", openSidebarHover);
  sidebar.addEventListener("mouseleave", () => closeSidebarHover(220));
  $$(".nav a", sidebar).forEach(link => {
    link.addEventListener("click", () => {
      if (!isSidebarPinned) closeSidebarHover(60);
    });
  });
}

const setPage = view => {
  $("#app").className = `shell layout ${isSidebarPinned ? "sidebar-pinned" : "sidebar-unpinned"}${view.rail ? "" : " no-rail"}`;
  $("#app").innerHTML = `${side(view.path)}${view.top}<main class="main fade">${view.main}</main>${view.rail ? `<aside class="rail">${view.rail}</aside>` : ""}`;
  $("#tabbar").innerHTML = [["/","today","Today"],["/world","sections","Sections"],["/search","search","Search"],["/saved","saved","Saved"]].map(([href,icon,label])=>`<a href="#${href}"${(href==="/world" ? !!SEC[view.path.slice(1)] : href===view.path) ? ' aria-current="page"' : ""}>${ic(icon)}${label}</a>`).join("");
  $("#tabbar").hidden = false;
  scrollTo(0,0);
  $("#pb").style.transform = "scaleX(0)";
  bindSidebarEvents();
  const articleBody = $(".art");
  if (articleBody) {
    ST.hl.filter(item=>String(item.id)===String(articleBody.dataset.id)).forEach(item=>{
      $$("p,li",articleBody).forEach(paragraph=>{
        const txt=paragraph.textContent;
        if(item.t && txt.includes(item.t) && !paragraph.querySelector("mark")) paragraph.innerHTML=esc(txt).replace(esc(item.t),`<mark>${esc(item.t)}</mark>`);
      });
    });
  }
};
function broadsheetTicker(stories) {
  if (!stories || !stories.length) return "";
  return `
    <div class="broadsheet-ticker" role="region" aria-label="Live breaking updates">
      <div class="ticker-badge">
        <i class="sec-accent" style="background:#fff;width:6px;height:6px;" aria-hidden="true"></i>
        <span>Live Wire</span>
      </div>
      <div class="ticker-track">
        ${stories.map(s => `
          <a href="#/story/${encodeURIComponent(s.id)}" class="ticker-item" data-id="${esc(s.id)}">
            <span class="ticker-title">${esc(s.t)}</span>
            <time datetime="${esc(s.ago || '')}">${esc(s.ago || 'Just now')}</time>
          </a>
        `).join('<span class="meta-sep" aria-hidden="true" style="opacity:.4"></span>')}
      </div>
    </div>
  `;
}

function broadsheetLeadPackage(leadStory, companions) {
  if (!leadStory) return "";
  const isSaved = ST.saved.some(item => String(item) === String(leadStory.id));
  const leadSrc = leadStory.img || leadStory.image_url || "";
  const leadPhoto = leadSrc
    ? `<img class="img-media" src="${esc(leadSrc)}" alt="${esc(leadStory.t || '')}" fetchpriority="high" decoding="async" onerror="this.classList.add('broken')">`
    : "";
  const leadCap = leadStory.cap ? `<figcaption class="hero-caption">${esc(leadStory.cap)}</figcaption>` : "";
  const leadImgHtml = `<div class="img s-${esc(leadStory.s)} hero">${leadPhoto}${leadStory.live ? '<span class="live-tag" style="position:absolute;top:10px;left:10px;z-index:2">Live</span>' : ""}${leadCap}</div>`;

  const heroHtml = `
    <article class="broadsheet-splash" data-id="${esc(leadStory.id)}">
      <div class="splash-media-wrap">
        <a href="#/story/${encodeURIComponent(leadStory.id)}" class="media-link" tabindex="-1" aria-hidden="true">
          ${leadImgHtml}
        </a>
        <button class="save-btn" data-act="save" data-id="${esc(leadStory.id)}" aria-pressed="${isSaved}" aria-label="${isSaved ? "Remove saved story" : "Save story"}">
          ${ic("saved")}
        </button>
      </div>
      <div class="story-kicker">
        ${tag(leadStory.s)}
        ${leadStory.live ? '<span class="live-tag">Live</span>' : ""}
      </div>
      <h2 class="story-headline">
        <a href="#/story/${encodeURIComponent(leadStory.id)}" class="headline-link">${esc(leadStory.t)}</a>
      </h2>
      ${leadStory.d ? `<p class="story-deck">${esc(leadStory.d)}</p>` : ""}
      <div class="meta-line">
        ${leadStory.by ? `<span class="meta-author">${esc(leadStory.by)}</span><i class="meta-sep" aria-hidden="true"></i>` : ""}
        <span class="meta-time">${esc(leadStory.ago || "Today")}</span>
        <i class="meta-sep" aria-hidden="true"></i>
        <span class="meta-duration">${Number(leadStory.rt) || 4} min read</span>
      </div>
    </article>
  `;

  const companionsHtml = companions && companions.length ? `
    <div class="broadsheet-companions">
      ${companions.map(s => {
        const compSaved = ST.saved.some(item => String(item) === String(s.id));
        return `
        <article class="companion-item" data-id="${esc(s.id)}">
          <a href="#/story/${encodeURIComponent(s.id)}" class="companion-thumb" tabindex="-1" aria-hidden="true">
            ${img(s)}
          </a>
          <div class="companion-content">
            <div class="story-kicker">
              ${tag(s.s)}
              ${s.live ? '<span class="live-tag">Live</span>' : ""}
            </div>
            <h3 class="companion-title">
              <a href="#/story/${encodeURIComponent(s.id)}" class="headline-link">${esc(s.t)}</a>
            </h3>
            <div class="meta-line">
              <span class="meta-time">${esc(s.ago || "Today")}</span>
              <i class="meta-sep" aria-hidden="true"></i>
              <span class="meta-duration">${Number(s.rt) || 4} min read</span>
              <button class="meta-save" data-act="save" data-id="${esc(s.id)}" aria-pressed="${compSaved}" aria-label="${compSaved ? "Remove saved story" : "Save story"}">
                ${ic("saved")}
              </button>
            </div>
          </div>
        </article>
      `;
      }).join("")}
    </div>
  ` : "";

  return `
    <div class="broadsheet-lead-wrap">
      <section class="broadsheet-lead-package">
        ${heroHtml}
        ${companionsHtml}
      </section>
    </div>
  `;
}

function broadsheetShelf(stories) {
  if (!stories || !stories.length) return "";
  return `
    <section class="broadsheet-shelf-wrap">
      <div class="broadsheet-shelf-header">
        <h2>Top Stories</h2>
        <span class="mt">Essential reporting selected by editors</span>
      </div>
      <div class="broadsheet-shelf">
        ${stories.map(s => {
          const isSaved = ST.saved.some(item => String(item) === String(s.id));
          return `
            <article class="shelf-card" data-id="${esc(s.id)}">
              <div class="shelf-thumb">
                <a href="#/story/${encodeURIComponent(s.id)}" class="media-link" tabindex="-1" aria-hidden="true">
                  ${img(s)}
                </a>
                <button class="save-btn" data-act="save" data-id="${esc(s.id)}" aria-pressed="${isSaved}" aria-label="${isSaved ? "Remove saved story" : "Save story"}">
                  ${ic("saved")}
                </button>
              </div>
              <div class="story-kicker">
                ${tag(s.s)}
                ${s.live ? '<span class="live-tag">Live</span>' : ""}
              </div>
              <h3 class="shelf-headline">
                <a href="#/story/${encodeURIComponent(s.id)}" class="headline-link">${esc(s.t)}</a>
              </h3>
              <div class="meta-line">
                <span class="meta-time">${esc(s.ago || "Today")}</span>
                <i class="meta-sep" aria-hidden="true"></i>
                <span class="meta-duration">${Number(s.rt) || 4} min read</span>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderPerspectiveModule(stories) {
  const explainersHtml = stories && stories.length ? `
    <div class="perspective-spotlight">
      <h3 class="desk-heading">Analysis &amp; Perspective</h3>
      <div class="perspective-cards">
        ${stories.map(s => {
          const isSaved = ST.saved.some(item => String(item) === String(s.id));
          return `
            <article class="perspective-card glass-2" data-id="${esc(s.id)}">
              <div class="story-kicker">
                ${tag(s.s)}
                <span class="source-tag">Analysis</span>
              </div>
              <h4 class="perspective-title">
                <a href="#/story/${encodeURIComponent(s.id)}" class="headline-link">${esc(s.t)}</a>
              </h4>
              ${s.d ? `<p class="perspective-deck">${esc(s.d)}</p>` : ""}
              <div class="meta-line">
                <span class="meta-time">${esc(s.ago || "Today")}</span>
                <i class="meta-sep" aria-hidden="true"></i>
                <span class="meta-duration">${Number(s.rt) || 4} min read</span>
                <button class="meta-save" data-act="save" data-id="${esc(s.id)}" aria-pressed="${isSaved}" aria-label="${isSaved ? "Remove saved story" : "Save story"}">
                  ${ic("saved")}
                </button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </div>
  ` : "";

  return `
    <aside class="desk-sidebar">
      ${briefWidget()}
      ${mostRead()}
      ${explainersHtml}
    </aside>
  `;
}

function broadsheetSectionRack() {
  return `
    <section class="broadsheet-section-rack">
      <div class="rack-header">
        <h2>Explore the Desks</h2>
        <span class="mt">Independent reporting across all sections</span>
      </div>
      <div class="rack-grid">
        ${SECTIONS.map(([key, name]) => `
          <a class="rack-card glass-2 s-${esc(key)}" href="#/${encodeURIComponent(key)}">
            <span class="section-tag s-${esc(key)}"><i class="sec-accent" aria-hidden="true"></i>${esc(name)}</span>
            <p class="rack-desc">${esc(LINE[key] || "Coverage and analysis.")}</p>
            <span class="rack-action">View desk &rarr;</span>
          </a>
        `).join("")}
      </div>
    </section>
    <footer class="broadsheet-colophon">
      <div class="colophon-inner">
        <div class="colophon-brand">
          <a class="logo" href="#/" aria-label="News APP home"><i>N</i><span>News APP</span></a>
          <p class="colophon-tagline">Thoughtful reporting, calm reading, and verified facts.</p>
        </div>
        <div class="colophon-links">
          <a href="#/">Today</a>
          <a href="#/following">Following</a>
          <a href="#/saved">Saved</a>
          <a href="#/search">Search</a>
          <a href="#/account">Account</a>
        </div>
        <div class="colophon-meta">
          <span>&copy; ${new Date().getFullYear()} News APP. All rights reserved.</span>
        </div>
      </div>
    </footer>
  `;
}

function homepage() {
  const allStories = Array.isArray(window.STORIES) ? window.STORIES : (STORIES || []);
  if (!allStories.length) {
    return {
      path: "/",
      top: top("Today"),
      main: window.STORIES_ERROR
        ? `<section class="empty"><h2>We couldn’t load today’s stories</h2><p>${esc(window.STORIES_ERROR)}</p><button class="btn btn-p" data-act="retry">Try again</button></section>`
        : empty("A quieter moment", "There are no stories to show just yet. Check back soon.", "Refresh", "#/", "today"),
      rail: ""
    };
  }

  const prioritized = [...allStories].sort((a, b) => Number(ST.follow.includes(b.s)) - Number(ST.follow.includes(a.s)));
  const leadStory = prioritized[0];
  if (!leadStory) {
    return {
      path: "/",
      top: top("Today"),
      main: window.STORIES_ERROR
        ? `<section class="empty"><h2>We couldn’t load today’s stories</h2><p>${esc(window.STORIES_ERROR)}</p><button class="btn btn-p" data-act="retry">Try again</button></section>`
        : empty("A quieter moment", "There are no stories to show just yet. Check back soon.", "Refresh", "#/", "today"),
      rail: ""
    };
  }

  const usedIds = new Set();
  const takeFromPool = (filterFn, count) => {
    const matched = [];
    for (const story of prioritized) {
      if (!usedIds.has(String(story.id)) && (!filterFn || filterFn(story))) {
        matched.push(story);
        usedIds.add(String(story.id));
        if (matched.length === count) break;
      }
    }
    return matched;
  };

  // Bucket 1: Lead story (top priority)
  takeFromPool(s => String(s.id) === String(leadStory.id), 1);
  usedIds.add(String(leadStory.id));

  // Bucket 2: Live ticker wire (live stories or fallback to next 4)
  let tickerStories = takeFromPool(s => s.live, 4);
  if (tickerStories.length < 4) {
    tickerStories = tickerStories.concat(takeFromPool(null, 4 - tickerStories.length));
  }

  // Bucket 3: Lead companions (4 stories)
  const companionStories = takeFromPool(null, 4);

  // Bucket 4: Scanning Shelf (5 stories)
  const shelfStories = takeFromPool(null, 5);

  // Bucket 5: Explainer spotlight for Desk B (2 stories)
  let explainerStories = takeFromPool(s => /^(Why|How|What)/i.test(s.t), 2);
  if (explainerStories.length < 2) {
    explainerStories = explainerStories.concat(takeFromPool(s => Number(s.rt) >= 5, 2 - explainerStories.length));
  }
  if (explainerStories.length < 2) {
    explainerStories = explainerStories.concat(takeFromPool(null, 2 - explainerStories.length));
  }

  // Bucket 6: Desk A newsroom feed (initial 6 stories)
  const deskStories = takeFromPool(null, 6);

  // Check remaining unrendered stories count
  const unrenderedCount = allStories.filter(s => !usedIds.has(String(s.id))).length;

  const mainContent = `
    ${chips("/")}
    ${broadsheetTicker(tickerStories)}
    ${broadsheetLeadPackage(leadStory, companionStories)}
    ${broadsheetShelf(shelfStories)}
    <div class="broadsheet-dual-wrap">
      <section class="broadsheet-dual-desk">
        <div class="desk-feed">
          <h2 class="desk-heading">Latest Dispatches</h2>
          <div id="feed" class="feed">
            ${deskStories.length ? deskStories.map(story => row(story)).join("") : '<p class="mt" style="color:hsl(var(--muted));padding:12px 0;">No further dispatches right now.</p>'}
          </div>
          ${unrenderedCount > 0 ? '<button class="btn btn-s glass-2" data-act="more" style="align-self:center;min-height:48px;padding:0 24px;">Load more stories</button>' : ""}
        </div>
        ${renderPerspectiveModule(explainerStories)}
      </section>
    </div>
    ${broadsheetSectionRack()}
  `;

  return {
    path: "/",
    top: top("Today"),
    main: mainContent,
    rail: ""
  };
}
function sectionPage(key,filter=0) {
  const matching = STORIES.filter(story=>story.s===key);
  const chosenFilter = Number.isInteger(filter) && FILT[filter] ? filter : 0;
  const list = FILT[chosenFilter][1](matching);
  const coverageLine=ST.follow.includes(key)?"In your Following feed":"Follow to add this coverage to your feed";
  return {path:"/"+key,top:top(SEC[key]||key),main:`${chips("/"+key)}<header class="sh glass-2 s-${esc(key)}"><div><h1>${esc(SEC[key]||key)}</h1><p>${esc(LINE[key]||"Reporting and perspective on the stories shaping today.")}</p><p class="mt">${coverageLine}</p></div>${followButton(key)}</header><div class="chips">${FILT.map((filterOption,idx)=>`<a class="chip glass-2"${idx===chosenFilter?' aria-current="page"':""} href="#/${encodeURIComponent(key)}${idx?"?f="+idx:""}">${esc(filterOption[0])}</a>`).join("")}</div>${list.length ? `${lead(list[0],true)}<div class="tiles">${list.slice(1,10).map(tile).join("")}</div>` : empty(`No ${FILT[chosenFilter][0].toLowerCase()} stories yet`,"New reporting will appear here as it publishes.","See latest","#/"+key)}`,rail:sectionHeading("Across the desk",STORIES.filter(story=>story.s!==key).slice(0,6).map(relatedCard).join(""))};
}
function articleBody(story) {
  if (Array.isArray(story.body) && story.body.length) {
    return story.body.map(block => {
      const type=String(block.type||block.kind||"paragraph").toLowerCase();
      const text=esc(block.text||block.content||"");
      if (!text) return "";
      if (type==="heading"||type==="h2") return `<h2>${text}</h2>`;
      if (type==="quote"||type==="blockquote") return `<blockquote>${text}</blockquote>`;
      if (type==="list") {
        const items=Array.isArray(block.items)?block.items:[block.text||block.content||""];
        return `<ul>${items.filter(Boolean).map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`;
      }
      return `<p>${text.replace(/\n/g,"<br>")}</p>`;
    }).join("");
  }
  const rawText=typeof story.body==="string" ? story.body.trim() : "";
  if(rawText) return rawText.split(/\n{2,}/).filter(Boolean).map(paragraph=>`<p>${esc(paragraph).replace(/\n/g,"<br>")}</p>`).join("");
  return `<p>${esc(story.d || story.t)}</p><aside class="notice"><b>Story brief</b><p>The summary above is the latest information available in this edition. Full article text will appear here when it is published by the reporting desk.</p></aside>`;
}
function comments(story) {
  const list=Array.isArray(ST.cm[story.id])?ST.cm[story.id]:[];
  return `<section class="cms"><h2>Comments <span class="mt">${list.length}</span></h2>${list.length?list.map(comment=>`<div class="cm"><span class="av lg">Y</span><div><b>You</b> <span class="mt">just now</span><p>${esc(comment)}</p></div></div>`).join(""):'<p class="mt">No comments yet. Start the conversation.</p>'}</section>`;
}
function articlePage(story) {
  const liked=ST.liked.includes(story.id), saved=ST.saved.includes(story.id);
  const other=STORIES.filter(item=>item.id!==story.id).sort((a,b)=>Number(b.s===story.s)-Number(a.s===story.s));
  const next=other[0], related=other.slice(0,5);
  const extra=`<button class="btn btn-s glass-2" data-act="aa" aria-label="Change article text size">Aa</button><button class="btn btn-s glass-2" data-act="save" data-id="${esc(story.id)}" aria-pressed="${saved}">${ic("saved")}<span class="sl d-only">${saved?"Saved":"Save"}</span></button>`;
  const sizeIndex=Number(ST.sz)>=0&&Number(ST.sz)<SIZES.length?Number(ST.sz):0;
  const citationBadge = (story.src || story.url) ? `<div class="article-source-badge glass-2"><span>Source:</span> ${story.url ? `<a href="${esc(story.url)}" target="_blank" rel="noopener noreferrer">${esc(story.src || "Original Publisher")} ↗</a>` : `<b>${esc(story.src)}</b>`}</div>` : "";
  const citationFooter = `<aside class="article-citation-footer glass-2"><span class="eyebrow">Article & Media Citation</span><p>Originally reported and published by ${story.url ? `<a href="${esc(story.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(story.src || "the reporting desk")}</strong> ↗</a>` : `<strong>${esc(story.src || "the reporting desk")}</strong>`}.${story.cap ? ` Photo credit & caption: <em>${esc(story.cap)}</em>.` : ""}</p></aside>`;
  return {path:"/"+story.s,top:top("",true,extra),main:`<header><h1>${esc(story.t)}</h1>${meta(story,1,1,story.ago)}<div class="pub-mini">News APP reporting desk</div>${citationBadge}</header>${img(story,"","hero")}<div class="art" data-id="${esc(story.id)}" style="--sz:${SIZES[sizeIndex]}">${articleBody(story)}${citationFooter}</div>${next?`<section><h2>Continue reading</h2>${row(next)}</section>`:""}${comments(story)}<div class="eng glass-3"><button class="cnt" data-act="like" data-id="${esc(story.id)}" aria-pressed="${liked}" aria-label="${liked?"Unlike":"Like"} story">${ic("like")}<span>${liked?"Liked":"Like"}</span></button><button class="cnt" data-act="cscroll" aria-label="Go to comments">${ic("comment")}<span id="cc">${(ST.cm[story.id]||[]).length}</span></button><button class="cnt" data-act="copy" aria-label="Share story">${ic("share")}</button><label class="pill glass-2"><input id="cin" placeholder="Write a comment…" maxlength="500" aria-label="Write a comment"></label><button class="send" data-act="send" data-id="${esc(story.id)}" aria-label="Post comment">${ic("send")}</button></div>`,rail:sharePanel()+sectionHeading("Related reporting",related.map(relatedCard).join(""))};
}
function searchMatches(query) {
  const words=query.toLowerCase().split(/\s+/).filter(Boolean);
  const results=words.length ? STORIES.map(story=>[words.filter(word=>(story.t+" "+story.d).toLowerCase().includes(word)).length,story]).filter(item=>item[0]).sort((a,b)=>b[0]-a[0]).map(item=>item[1]) : [];
  return [words,results];
}
function searchResults(query,section) {
  if (!query.trim()) return `<h2>Trending today</h2><div class="feed">${STORIES.slice(0,5).map(story=>row(story)).join("")}</div>`;
  const [words,all]=searchMatches(query);
  if (!all.length) return empty(`No stories match “${query}”`,"Try another phrase or browse a section.","Browse sections","#/world");
  const results=section?all.filter(story=>story.s===section):all;
  const root="#/search?q="+encodeURIComponent(query);
  return `<div class="chips">${[["","All",all.length],...SECTIONS.map(([key,name])=>[key,name,all.filter(story=>story.s===key).length]).filter(item=>item[2])].map(([key,name,count])=>`<a class="chip glass-2"${key===section?' aria-current="page"':""} href="${root}${key?"&s="+encodeURIComponent(key):""}">${esc(name)} ${count}</a>`).join("")}</div><span class="meta">${results.length} ${results.length===1?"story":"stories"}</span><div class="feed">${results.map(story=>row(story,words)).join("")}</div>`;
}
function searchPage(query,section) {
  return {path:"/search",top:top("Search"),main:`<label class="sf glass-2">${ic("search")}<input id="q" value="${esc(query)}" placeholder="Search reporting, topics and places…" autocomplete="off" aria-label="Search news"></label><div id="res" class="fade">${searchResults(query,section)}</div>`,rail:sectionHeading("Explore topics",`<div class="shr">${["World","Politics","Business","Tech","Sports","Culture","Science"].map(name=>`<a class="chip glass-2" href="#/${name.toLowerCase()}">${name}</a>`).join("")}</div>`)};
}
function savedPage() {
  const isHighlights=savedView==="h";
  const stories=ST.saved.map(by).filter(Boolean);
  const content=isHighlights ? (ST.hl.length?`<div class="hcs">${ST.hl.map((item,index)=>{const story=by(item.id);return story?`<article class="hc glass-2"><a href="#/story/${encodeURIComponent(story.id)}"><q>${esc(item.t)}</q></a><b>${esc(story.t)}</b>${tag(story.s)}<div class="mrow"><span class="meta">${esc(item.d||"")}</span><button class="ib sv" data-act="rmhl" data-i="${index}" aria-label="Remove highlight">${ic("x")}</button></div></article>`:""}).join("")}</div>`:empty("No highlights yet","Select a passage in an article to keep a useful quote here.","Browse today","#/","saved")) : (stories.length?`<div class="feed">${stories.map(story=>row(story)).join("")}</div>`:empty("Your reading list starts here","Save a story to return to it whenever you have time.","Browse today","#/","saved"));
  return {path:"/saved",top:top("Saved"),main:`<h1>Saved</h1><div class="mrow"><div class="seg glass-2">${[["s","Stories"],["h","Highlights"]].map(([value,label])=>`<button data-act="seg" data-v="${value}"${isHighlights=== (value==="h")?' aria-current="true"':""}>${label}</button>`).join("")}</div>${isHighlights&&ST.hl.length?'<button class="btn btn-s glass-2" data-act="copyall">Copy all</button>':""}</div>${content}`,rail:sectionHeading("Your reading",`<div class="stats"><div><b>${stories.length}</b><span class="mt">stories saved</span></div><div><b>${ST.hl.length}</b><span class="mt">highlights</span></div><div><b>${ST.follow.length}</b><span class="mt">sections followed</span></div></div>`)};
}
function followingPage() {
  const stories=STORIES.filter(story=>ST.follow.includes(story.s));
  return {path:"/following",top:top("Following"),main:stories.length?`<h1>Following</h1><div class="feed">${stories.map(story=>row(story)).join("")}</div>`:empty("Your own front page","Follow a section to see its reporting gathered here.","Explore World","#/world","following"),rail:""};
}
function revealOnScroll() {
  const targets=[...document.querySelectorAll(".public > section:not(.hero-public), .preview")];
  if(!("IntersectionObserver" in window)){return;}
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("in");io.unobserve(entry.target);}}),{threshold:.15,rootMargin:"0px 0px -6% 0px"});
  targets.forEach((el,i)=>{el.classList.add("reveal");el.style.setProperty("--d",(el.classList.contains("preview")?(i%4)*0.09:0)+"s");io.observe(el);});
}
function landingPage() {
  $("#tabbar").hidden=true;
  $("#app").className="shell";
  $("#app").innerHTML=`<div class="public fade"><nav class="pubnav"><a class="logo" href="#/landing" aria-label="News APP home"><i>N</i><span>News APP</span></a><div class="navlinks"><a href="#/landing#today-preview">Today</a><a href="#/landing#coverage">Coverage</a><a href="#/landing#newsroom">Newsroom</a><a href="#/landing#about">Our approach</a></div><span class="sp"></span><a class="btn btn-g" href="#/login">Log in</a><a class="btn btn-p" href="#/signup">Create account</a></nav><section class="hero-public"><div class="hero-copy"><span class="eyebrow">A better-informed day starts here</span><h1>The day,<br><em>in context.</em></h1><p>Reporting across the stories that shape your world — with the useful detail, clear perspective and time to read what matters.</p><div class="hero-cta"><a class="btn btn-p" href="#/signup">Make it yours ${ic("next")}</a><a class="btn btn-g" href="#/login">I have an account</a></div><p class="pub-mini">Independent perspective. Your pace. No noise.</p></div><div class="topic-orbit" aria-label="Coverage across world, politics, tech, business, culture, sports and science"><div class="orbit"></div><div class="orbit o2"></div><div class="orbit-core">The bigger<br>picture</div><span class="orbit-item">World</span><span class="orbit-item">Politics</span><span class="orbit-item">Business</span><span class="orbit-item">Tech</span><span class="orbit-item">Sports</span><span class="orbit-item">Culture</span><span class="orbit-item">Science</span></div></section><section id="today-preview"><div class="public-kicker"><div><span class="eyebrow">A window into your day</span><h2>Less scrolling.<br>More understanding.</h2></div><span class="pub-mini">A few screens. A clearer picture.</span></div><div class="previews"><article class="preview"><div class="pv-screen"><div class="pv-bar"></div><div class="pv-visual img s-world"></div><div class="pv-line"></div><div class="pv-line short"></div><div class="pv-row"><div class="pv-thumb"></div><div style="flex:1"><div class="pv-line"></div><div class="pv-line short"></div></div></div></div><div class="pv-label">Today · editor’s lead</div></article><article class="preview"><div class="pv-screen"><div class="pv-bar"></div><div class="pv-line short"></div><div class="pv-line"></div><div class="pv-visual img s-business" style="height:74px"></div><div class="pv-line"></div><div class="pv-line"></div><div class="pv-line short"></div></div><div class="pv-label">The article · built for focus</div></article><article class="preview"><div class="pv-screen"><div class="pv-bar"></div><div class="pv-line short"></div><div class="pv-row"><div class="pv-thumb"></div><div style="flex:1"><div class="pv-line"></div><div class="pv-line short"></div></div></div><div class="pv-row"><div class="pv-thumb"></div><div style="flex:1"><div class="pv-line"></div><div class="pv-line short"></div></div></div><div class="pv-row"><div class="pv-thumb"></div><div style="flex:1"><div class="pv-line"></div><div class="pv-line short"></div></div></div></div><div class="pv-label">Search · find the thread</div></article><article class="preview"><div class="pv-screen"><div class="pv-bar"></div><div style="width:62px;height:62px;border-radius:50%;background:hsl(var(--accent-soft));margin:18px auto"></div><div class="pv-line" style="width:75%;margin:auto"></div><div class="pv-row" style="margin-top:16px"><div class="pv-line" style="flex:1"></div></div><div class="pv-row"><div class="pv-line" style="flex:1"></div></div></div><div class="pv-label">Your account · your interests</div></article></div></section><section class="newsroom-tour" id="newsroom"><div class="nt-grid"><div class="nt-copy"><span class="eyebrow">Behind every story</span><h2>Reported carefully. Reviewed in the open.</h2><p>Every story you read on News APP is written, checked and edited in our own newsroom. Editors review the same page the reporter wrote, comment on exact words, and fix small slips directly.</p><ul><li>Every change is recorded, so corrections are easy to trace.</li><li>Readers&#39; privacy choices decide what we measure.</li><li>Stories can be published in English and Hindi.</li></ul></div><div class="nt-stage"><div class="nt-window"><div class="nt-bar"><i></i><i></i><i></i></div><div class="nt-doc"><div class="nt-page"><span class="nt-kicker">Business</span><span class="nt-title">G7 to release millions of barrels of oil and diesel</span><span class="nt-line"></span><span class="nt-line s"></span><span class="nt-line"></span><span class="nt-line"></span><span><mark class="nt-mark">releases are aimed at heading off further price spikes</mark></span><span class="nt-line s"></span></div><div class="nt-side"><div class="nt-note"><b>Editor</b>Add the date of the meeting here.</div><div class="nt-note"><b>Editor fix</b>Spelling corrected in paragraph 2.</div></div></div></div><div class="nt-float"><h3>Readers this week</h3><div class="nt-chart" aria-hidden="true">${[40,55,48,70,62,86,78,64,90,100].map((h,i)=>`<span style="--h:${h}%;--i:${i}"></span>`).join("")}</div></div></div></div></section><section class="manifesto" id="about"><span class="eyebrow">A more useful news habit</span><div><h2>Know what happened.<br>See what it means.</h2><p>News APP brings together world, politics, business, technology, sport, culture and science in one calm reading space. Follow what you care about, save the stories worth revisiting, and take your understanding one day at a time.</p><a class="btn btn-p" href="#/signup">Start with your interests</a></div></section><section id="coverage" class="public-kicker"><div><span class="eyebrow">Seven desks. One connected world.</span><h2>Read across the whole story.</h2></div><div class="chips">${SECTIONS.map(([key,name])=>`<span class="chip">${esc(name)}</span>`).join("")}</div></section><footer class="pub-footer"><a class="logo" href="#/landing"><i>N</i><span>News APP</span></a><span>Thoughtful reporting for every day.</span><span>© News APP</span></footer></div>`;
  revealOnScroll();
  const anchor=location.hash.slice(1).split("#")[1];
  if(anchor) setTimeout(()=>document.getElementById(anchor)?.scrollIntoView({behavior:"smooth"}),40);
}
function authPage(kind) {
  $("#tabbar").hidden=true;
  $("#app").className="shell";
  const signup=kind==="signup";
  const configured=window.AUTH_CONFIG && window.AUTH_CONFIG.configured !== false;
  const initialError=!configured ? "Account sign-in is not set up yet. Please contact the administrator." : "";
   $("#app").innerHTML=`<main class="auth-wrap fade"><section class="auth-art"><a class="logo" href="#/landing"><i>N</i><span>News APP</span></a><div><span class="eyebrow">Your day, better informed</span><h1>Stories worth your time. Context worth keeping.</h1><p class="deck">A thoughtful daily briefing, shaped around the things you care about.</p></div><div class="orbit-mini" aria-hidden="true"></div><span class="pub-mini">World · Politics · Business · Tech · Culture</span></section><section class="auth-panel"><div class="form-card"><a href="#/landing" class="pub-mini">← Back to News APP</a><h1>${signup?"Create your account":"Welcome back"}</h1><p>${signup?"Choose the coverage you want. We’ll take it from there.":"Pick up where your reading left off."}</p><div id="auth-error" class="form-error" role="alert"${initialError?'':' hidden'}>${esc(initialError)}</div><div id="auth-success" class="form-success" role="status" hidden></div><form id="auth-form" class="form-stack"><label class="field">Email address<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><label class="field">Password<input name="password" type="password" autocomplete="${signup?"new-password":"current-password"}" minlength="8" required placeholder="At least 8 characters"></label>${signup?'<label class="field">Display name<input name="display_name" autocomplete="name" required maxlength="80" placeholder="How should we address you?"></label>':""}<button class="btn btn-p" type="submit"${configured?"":" disabled"}>${signup?"Create account":"Log in"}</button></form><p class="form-note">${signup?'Already have an account? <a href="#/login">Log in</a>':'New to News APP? <a href="#/signup">Create an account</a>'}</p><p class="form-note">Your reading, saved stories and preferences stay with your account.</p></div></section></main>`;
}
function onboardingPage() {
  $("#tabbar").hidden=true;
  $("#app").className="shell";
  const name=(accountCache && accountCache.display_name) || (window.SESSION_USER && window.SESSION_USER.email) || "there";
  const selected=(accountCache && accountCache.interests) || [];
  const prefs=(accountCache && accountCache.cookie_preferences) || {};
  $("#app").innerHTML=`<main class="onboard-wrap fade"><a class="logo" href="#/"><i>N</i><span>News APP</span></a><div class="onboard-head"><span class="eyebrow">A few choices, then you’re in</span><h1>Good to have you, ${esc(name)}.</h1><p class="deck">Choose the coverage you want to see first. You can change it any time.</p><div class="stepbar"><i></i></div></div><section><h2>What are you following?</h2><p class="mt">Choose at least one topic. Your Today page will make room for it.</p><div class="choice-grid">${SECTIONS.map(([key,label])=>`<button type="button" class="choice" data-act="interest" data-k="${esc(key)}" aria-pressed="${selected.includes(key)}">${esc(label)}</button>`).join("")}</div></section><section class="cookie-panel"><h2>Privacy, your way</h2><p class="mt">Essential cookies keep your account and reading preferences working. They are always on.</p><div class="cookie-choice"><div><b>Essential</b><div class="mt">Sign-in and security</div></div><input class="toggle" type="checkbox" checked disabled aria-label="Essential cookies always enabled"></div><div class="cookie-choice"><div><b>Personalisation</b><div class="mt">Remember your reading preferences</div></div><input class="toggle" type="checkbox" id="cookie-personal" ${prefs.personalization !== false?"checked":""} aria-label="Allow personalisation cookies"></div><div class="cookie-choice"><div><b>Analytics</b><div class="mt">Help improve the reading experience</div></div><input class="toggle" type="checkbox" id="cookie-analytics" ${prefs.analytics===true?"checked":""} aria-label="Allow analytics cookies"></div></section><div id="onboard-error" class="form-error" role="alert" hidden></div><button class="btn btn-p" data-act="finish-onboarding">Save choices & open Today</button></main>`;
}
async function loadAccount(force=false) {
  if (accountCache && !force) return accountCache;
  const requestId=++activeAccountRequest;
  const result=await NEWS_API.getAccount();
  if (requestId===activeAccountRequest) accountCache=result;
  return result;
}
let currentAccountTab = "profile";

function renderReadingHabitsSection(account) {
  const streak = Number(account.streak_days) || 0;
  const longest = Number(account.longest_streak) || streak;
  const totalDays = Number(account.total_active_days) || (streak > 0 ? streak : 0);
  const activeToday = !!account.active_today;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const pad = n => String(n).padStart(2, "0");
  const localTodayIso = `${year}-${pad(month + 1)}-${pad(now.getDate())}`;

  const activeDates = new Set(Array.isArray(account.active_dates) ? account.active_dates : []);
  if (activeToday) activeDates.add(localTodayIso);

  const monthName = now.toLocaleString("en-US", { month: "long" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0, Sun=6

  let activeThisMonth = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
    if (activeDates.has(iso)) activeThisMonth++;
  }

  const weekLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  let calCells = "";
  for (let i = 0; i < firstDayOfWeek; i++) {
    calCells += `<div class="heatmap-cell is-empty" aria-hidden="true"></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
    const isActive = activeDates.has(iso);
    const isToday = iso === localTodayIso;
    calCells += `
      <div class="heatmap-cell ${isActive ? "is-active" : ""} ${isToday ? "is-today" : ""}" title="${iso}${isActive ? " (Active)" : ""}${isToday ? " (Today)" : ""}">
        <span>${d}</span>
      </div>
    `;
  }

  return `
    <section class="panel reading-habits-panel">
      <div class="habits-overview">
        <div class="habits-title-wrap">
          <h3>Reading Activity & Rhythm</h3>
          <p>A quiet, factual record of your reading consistency across editions.</p>
        </div>
        <div>
          ${activeToday
            ? `<span class="habits-status-badge active">✓ Reading logged today</span>`
            : `<button class="btn btn-p" data-act="checkin">Log today’s reading</button>`}
        </div>
      </div>

      <div class="habits-stats-grid">
        <div class="habits-stat-card">
          <span class="habits-stat-label">Current consistency</span>
          <span class="habits-stat-val">${streak} <span style="font-size:13px;font-weight:600;color:hsl(var(--muted))">days</span></span>
          <span class="habits-stat-sub">${activeToday ? "Logged today" : "Pending today"}</span>
        </div>
        <div class="habits-stat-card">
          <span class="habits-stat-label">Longest sequence</span>
          <span class="habits-stat-val">${longest} <span style="font-size:13px;font-weight:600;color:hsl(var(--muted))">days</span></span>
          <span class="habits-stat-sub">Personal record</span>
        </div>
        <div class="habits-stat-card">
          <span class="habits-stat-label">Total reading days</span>
          <span class="habits-stat-val">${totalDays} <span style="font-size:13px;font-weight:600;color:hsl(var(--muted))">days</span></span>
          <span class="habits-stat-sub">${activeThisMonth} in ${monthName}</span>
        </div>
      </div>

      <div class="heatmap-card">
        <div class="heatmap-header">
          <div>
            <h4>${monthName} ${year} Reading Log</h4>
            <span class="heatmap-caption">${activeThisMonth} active reading day${activeThisMonth === 1 ? "" : "s"} recorded</span>
          </div>
          <div class="heatmap-legend">
            <span class="heatmap-legend-item"><span class="heatmap-legend-box" style="background:hsl(var(--accent));border-color:hsl(var(--accent))"></span> Active</span>
            <span class="heatmap-legend-item"><span class="heatmap-legend-box" style="outline:2px solid hsl(var(--ink))"></span> Today</span>
            <span class="heatmap-legend-item"><span class="heatmap-legend-box" style="background:hsl(var(--surface-soft))"></span> Inactive</span>
          </div>
        </div>
        <div class="heatmap-week-labels">
          ${weekLabels.map(w => `<span>${w}</span>`).join("")}
        </div>
        <div class="heatmap-days-grid">
          ${calCells}
        </div>
      </div>
    </section>
  `;
}

function renderThemeSettingsSection() {
  const currentPaper = isDark() ? (CUSTOM_THEME.paperDark || "#0b1020") : (CUSTOM_THEME.paper || "#f8faff");
  const primaryClean = (CUSTOM_THEME.primary || "#3C63ED").replace(/^#/, "");
  const secondaryClean = (CUSTOM_THEME.secondary || "#17703F").replace(/^#/, "");
  const paperClean = currentPaper.replace(/^#/, "");
  const contrastRatio = getContrastRatio(CUSTOM_THEME.primary || "#3C63ED", currentPaper);
  const isPass = contrastRatio !== null && contrastRatio >= 4.5;

  return `
    <section class="panel theme-customizer-panel">
      <div class="panel-head">
        <h2>Theme & Display</h2>
        <p class="panel-desc">Reading text size and editorial palette.</p>
      </div>

      <div id="wcag-banner" class="wcag-banner ${isPass ? "is-pass" : "is-fail"}" role="${isPass ? "status" : "alert"}">
        <span>${isPass ? "✓ WCAG AA Compliant — primary brand meets minimum contrast (4.5:1) against canvas." : (contrastRatio === null ? "⚠️ Enter valid 6-digit hex colors to verify WCAG contrast." : "⚠️ Low Contrast Warning — ratio falls below WCAG AA minimum (4.5:1 required).")}</span>
        <span class="wcag-ratio">${contrastRatio !== null ? `${contrastRatio}:1 ${isPass ? "Pass" : "Fail"}` : "—"}</span>
      </div>

      <div class="setting-group">
        <span class="setting-heading">Pre-built Theme Presets</span>
        <p class="setting-caption">Select a curated palette designed for reading comfort.</p>
        <div class="preset-cards-grid">
          ${THEME_PRESETS.map(p => {
            const isSelected = CUSTOM_THEME.preset === p.id;
            const pPaper = isDark() ? p.paperDark : p.paper;
            return `
              <button type="button" class="preset-card ${isSelected ? "is-selected" : ""}" data-act="select-preset" data-preset="${esc(p.id)}">
                <div class="preset-swatches">
                  <span class="swatch-circle" style="background:${p.primary}" title="Primary: ${p.primary}"></span>
                  <span class="swatch-circle" style="background:${p.secondary}" title="Secondary: ${p.secondary}"></span>
                  <span class="swatch-circle swatch-paper" style="background:${pPaper}" title="Paper: ${pPaper}"></span>
                </div>
                <div class="preset-text">
                  <strong>${esc(p.name)}</strong>
                  <span class="preset-badge">${esc(p.badge)}</span>
                </div>
                ${isSelected ? '<span class="preset-active-check">✓</span>' : ""}
              </button>
            `;
          }).join("")}
        </div>
      </div>

      <div class="setting-group">
        <span class="setting-heading">Custom Color Design Tokens</span>
        <p class="setting-caption">Fine-tune the design system tokens with hex codes or color pickers.</p>
        <div class="token-inputs-grid">
          <div class="token-field">
            <div class="token-header">
              <strong>Primary Accent</strong>
              <code>--accent</code>
            </div>
            <p class="token-role">Brand color, active navigation, headline links.</p>
            <div class="color-picker-row">
              <input type="color" class="color-picker-input" id="picker-primary" value="#${primaryClean}" aria-label="Pick primary accent color">
              <div class="hex-input-wrap">
                <span class="hex-hash">#</span>
                <input type="text" class="hex-text-input" id="hex-primary" value="${primaryClean}" maxlength="6" placeholder="3C63ED" aria-label="Hex code for primary accent">
              </div>
            </div>
          </div>

          <div class="token-field">
            <div class="token-header">
              <strong>Secondary Accent</strong>
              <code>--green</code>
            </div>
            <p class="token-role">Reading checkmark, success indicators, followed desks.</p>
            <div class="color-picker-row">
              <input type="color" class="color-picker-input" id="picker-secondary" value="#${secondaryClean}" aria-label="Pick secondary accent color">
              <div class="hex-input-wrap">
                <span class="hex-hash">#</span>
                <input type="text" class="hex-text-input" id="hex-secondary" value="${secondaryClean}" maxlength="6" placeholder="17703F" aria-label="Hex code for secondary accent">
              </div>
            </div>
          </div>

          <div class="token-field">
            <div class="token-header">
              <strong>Canvas / Paper Tint</strong>
              <code>--paper</code>
            </div>
            <p class="token-role">Base background tint for calm editorial reading.</p>
            <div class="color-picker-row">
              <input type="color" class="color-picker-input" id="picker-paper" value="#${paperClean}" aria-label="Pick canvas paper color">
              <div class="hex-input-wrap">
                <span class="hex-hash">#</span>
                <input type="text" class="hex-text-input" id="hex-paper" value="${paperClean}" maxlength="6" placeholder="${isDark() ? "0b1020" : "f8faff"}" aria-label="Hex code for canvas paper">
              </div>
            </div>
          </div>
        </div>

        <div class="token-live-preview">
          <span class="preview-title">Live Token Preview</span>
          <div class="preview-elements">
            <button class="btn btn-p btn-sm" type="button">Primary CTA</button>
            <span class="habits-status-badge active" style="font-size:11px">✓ Active Tag</span>
            <a href="javascript:void(0)" style="color:hsl(var(--accent));font-weight:700;font-size:13px">Sample Headline Link ↗</a>
          </div>
          <div class="token-actions-row">
            <button class="btn btn-p btn-sm" data-act="apply-custom-tokens">Save & Apply Tokens</button>
            <button class="btn btn-s btn-sm glass-2" data-act="reset-tokens">Reset to Default</button>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <span class="setting-heading">Display & Typography</span>
        <div class="setting-row">
          <div>
            <strong>Appearance Mode</strong>
            <p class="setting-caption" style="margin:2px 0 0">Switch between light paper tint and OLED dark theme.</p>
          </div>
          <button class="btn btn-s glass-2" data-act="theme" aria-label="Switch to ${isDark() ? "light" : "dark"} theme">
            ${isDark() ? "Dark" : "Light"} · Switch
          </button>
        </div>

        <div class="setting-row">
          <div>
            <strong>Article Text Size</strong>
            <p class="setting-caption" style="margin:2px 0 0">Default font scale for reading articles without zooming.</p>
          </div>
          <div class="size-btn-group">
            ${SZN.map((name, idx) => `
              <button class="btn btn-s glass-2 btn-sm ${Number(ST.sz || 0) === idx ? "is-selected" : ""}" data-act="set-size" data-sz="${idx}">
                ${name}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="setting-row">
          <div>
            <strong>Cookie & Privacy Settings</strong>
            <p class="setting-caption" style="margin:2px 0 0">Review essential, personalization and analytics cookies.</p>
          </div>
          <button type="button" class="btn btn-s glass-2 btn-sm" data-consent-open>Review Choices</button>
        </div>

        <div class="setting-row">
          <div>
            <strong>Saved Stories & Highlights</strong>
            <p class="setting-caption" style="margin:2px 0 0">Manage your bookmarks, quotes and reading queue.</p>
          </div>
          <a class="btn btn-s glass-2 btn-sm" href="#/saved">Open Saved List</a>
        </div>

        <div class="setting-row">
          <div>
            <strong>Followed Sections</strong>
            <p class="setting-caption" style="margin:2px 0 0">Choose which categories populate your front page.</p>
          </div>
          <a class="btn btn-s glass-2 btn-sm" href="#/following">Manage Sections</a>
        </div>
      </div>
    </section>
  `;
}

function renderReaderProfileSection(account) {
  const name = account.display_name || "";
  const interests = Array.isArray(account.interests) ? account.interests : [];

  return `
    <section class="panel">
      <div class="panel-head">
        <h2>Reader Profile</h2>
        <p class="panel-desc">Manage your identity, subscribed topics, and account details.</p>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:hsl(var(--surface-soft));border-radius:12px;border:1px solid hsl(var(--line));margin-bottom:20px">
        <div>
          <strong>Membership Status</strong>
          <div class="mt">Independent Reader · Cloud Synced</div>
        </div>
        <span class="habits-status-badge active">Active Member</span>
      </div>

      <form id="profile-form" class="form-stack">
        <label class="field">Display name
          <input name="display_name" maxlength="80" required value="${esc(name)}">
        </label>
        <label class="field">Email address
          <input type="email" value="${esc(account.email || "")}" disabled aria-label="Email address (managed by authentication provider)">
        </label>
        <div class="field">
          <span>Followed Topics & Desks</span>
          <div class="choice-grid">
            ${SECTIONS.map(([key, label]) => `
              <button type="button" class="choice" data-act="account-interest" data-k="${esc(key)}" aria-pressed="${interests.includes(key)}">
                ${esc(label)}
              </button>
            `).join("")}
          </div>
        </div>
        <button class="btn btn-p" type="submit">Save profile</button>
      </form>
    </section>
  `;
}

function renderAccountSecuritySection(account) {
  return `
    <section class="panel">
      <div class="panel-head">
        <h2>Account Security</h2>
        <p class="panel-desc">Authentication status and session controls.</p>
      </div>

      <div style="display:grid;gap:14px;margin-bottom:24px">
        <div style="padding:16px 18px;background:hsl(var(--surface-soft));border-radius:12px;border:1px solid hsl(var(--line))">
          <strong>Authentication Status</strong>
          <p class="mt" style="margin:4px 0 0">Signed in securely as <strong>${esc(account.email || "Reader")}</strong>.</p>
        </div>

        <div style="padding:16px 18px;background:hsl(var(--surface-soft));border-radius:12px;border:1px solid hsl(var(--line))">
          <strong>Reading Synchronization</strong>
          <p class="mt" style="margin:4px 0 0">Your reading history, bookmarks, and highlights are encrypted and synced.</p>
        </div>
      </div>

      <div class="setting-row" style="border-top:1px solid hsl(var(--line));padding-top:18px">
        <div>
          <strong>Sign Out</strong>
          <p class="setting-caption" style="margin:2px 0 0">Disconnect your session on this device.</p>
        </div>
        <button class="btn btn-g" data-act="logout">Log out</button>
      </div>
    </section>
  `;
}

async function accountPage() {
  const request = ++activeAccountRequest;
  setPage({path:"/account",top:top("Account"),main:'<div class="sk" style="height:220px"></div><div class="sk" style="height:190px"></div>',rail:""});
  try {
    const account = await NEWS_API.getAccount();
    if (request !== activeAccountRequest || location.hash.split("?")[0] !== "#/account") return;
    accountCache = account;

    const tabParam = new URLSearchParams(location.hash.split("?")[1] || "").get("tab");
    if (tabParam && ["profile", "habits", "theme", "security"].includes(tabParam)) {
      currentAccountTab = tabParam;
    }

    setPage({
      path: "/account",
      top: top("Account"),
      main: `
        <div class="account-header">
          <span class="eyebrow">Reader Preferences</span>
          <h1>Your Account</h1>
          <p class="account-lead">Manage your profile, reading rhythm, display themes, and security.</p>
        </div>

        <nav class="settings-tabs" role="tablist" aria-label="Account Settings Tabs">
          <button type="button" class="settings-tab-btn ${currentAccountTab === "profile" ? "is-selected" : ""}" role="tab" id="tab-profile-btn" aria-controls="panel-profile" aria-selected="${currentAccountTab === "profile"}" data-act="account-tab" data-tab="profile">
            ${ic("user")} Reader Profile
          </button>
          <button type="button" class="settings-tab-btn ${currentAccountTab === "habits" ? "is-selected" : ""}" role="tab" id="tab-habits-btn" aria-controls="panel-habits" aria-selected="${currentAccountTab === "habits"}" data-act="account-tab" data-tab="habits">
            ${ic("today")} Reading Habits
          </button>
          <button type="button" class="settings-tab-btn ${currentAccountTab === "theme" ? "is-selected" : ""}" role="tab" id="tab-theme-btn" aria-controls="panel-theme" aria-selected="${currentAccountTab === "theme"}" data-act="account-tab" data-tab="theme">
            ${ic("sun")} Theme & Display
          </button>
          <button type="button" class="settings-tab-btn ${currentAccountTab === "security" ? "is-selected" : ""}" role="tab" id="tab-security-btn" aria-controls="panel-security" aria-selected="${currentAccountTab === "security"}" data-act="account-tab" data-tab="security">
            ${ic("check")} Account Security
          </button>
        </nav>

        <div id="account-error" class="form-error" hidden></div>
        <div id="account-success" class="form-success" hidden></div>

        <div id="panel-profile" class="settings-tabpanel ${currentAccountTab === "profile" ? "is-active" : ""}" role="tabpanel" aria-labelledby="tab-profile-btn">
          ${renderReaderProfileSection(account)}
        </div>

        <div id="panel-habits" class="settings-tabpanel ${currentAccountTab === "habits" ? "is-active" : ""}" role="tabpanel" aria-labelledby="tab-habits-btn">
          ${renderReadingHabitsSection(account)}
        </div>

        <div id="panel-theme" class="settings-tabpanel ${currentAccountTab === "theme" ? "is-active" : ""}" role="tabpanel" aria-labelledby="tab-theme-btn">
          ${renderThemeSettingsSection()}
        </div>

        <div id="panel-security" class="settings-tabpanel ${currentAccountTab === "security" ? "is-active" : ""}" role="tabpanel" aria-labelledby="tab-security-btn">
          ${renderAccountSecuritySection(account)}
        </div>
      `,
      rail: ""
    });
  } catch (error) {
    if (request !== activeAccountRequest) return;
    setPage({path:"/account",top:top("Account"),main:`<section class="empty"><h2>Account details unavailable</h2><p>${esc(error.message)}</p><button class="btn btn-p" data-act="account-retry">Try again</button></section>`,rail:""});
  }
}
function go(path,push) {
  const next="#"+path;
  if (location.hash===next) return;
  history[push?"pushState":"replaceState"](null,"",next);
  setTimeout(()=>window.dispatchEvent(new HashChangeEvent("hashchange")),0);
}
function route() {
  const [pathPart,query=""]=location.hash.slice(1).split("?");
  const path=pathPart || "/landing";
  if (path.startsWith("/landing#")) { landingPage(); return; }
  const params=new URLSearchParams(query);
  if (path==="/landing" || path==="/signup" || path==="/login") {
    if (window.AUTH_TOKEN && path!=="/landing") { go(window.SESSION_USER && window.SESSION_USER.onboarding_completed===false ? "/onboarding" : "/"); return; }
    if (path==="/landing") landingPage(); else authPage(path.slice(1));
    return;
  }
  if (!window.AUTH_TOKEN) { go("/landing"); return; }
  if (path==="/onboarding") { if (!accountCache) { setPage({path:"",top:top("Getting started"),main:'<div class="sk" style="height:320px"></div>',rail:""}); loadAccount().then(account=>{accountCache=account; if(location.hash.split("?")[0]==="#/onboarding") onboardingPage();}).catch(error=>{setPage({path:"",top:top("Getting started"),main:`<section class="empty"><h2>Your preferences couldn’t load</h2><p>${esc(error.message)}</p><button class="btn btn-p" data-act="onboarding-retry">Try again</button></section>`,rail:""});}); } else onboardingPage(); return; }
  if (path!=="/account" && accountCache && accountCache.onboarding_completed===false) { go("/onboarding"); return; }
  const storyMatch=path.match(/^\/story\/(.+)$/);
  try {
    if (path==="/") setPage(homepage());
    else if (storyMatch) {
      const storyId=decodeURIComponent(storyMatch[1]);
      let story=by(storyId);
      if (!story) {
        setPage({path:"",top:top("Story",true),main:'<div class="sk" style="height:300px"></div><div class="sk" style="height:150px"></div>',rail:""});
        if(!window._storyLookups)window._storyLookups=new Set();
        if(!window._storyLookups.has(storyId)){
          window._storyLookups.add(storyId);
          NEWS_API.getStory(storyId).then(result=>{
            const detail=result.story||result.item||result;
            if(location.hash.split("?")[0]!==path)return;
            if(!detail||!(detail.id||detail.title)){setPage({path:"",top:top("Story unavailable",true),main:empty("We can’t find that story","It may have moved or been removed.","Go to Today","#/"),rail:""});return;}
            STORIES.push({id:detail.id||storyId,s:detail.section||detail.section_key||"world",t:detail.title||"Story",d:detail.deck||"",by:detail.author||"",ago:detail.ago||detail.published_at||"",rt:detail.read_minutes||4,live:!!detail.live,img:detail.image_url||detail.img||"",src:detail.source_name||detail.src||"",url:detail.source_url||detail.url||"",cap:detail.caption||detail.cap||"",body:detail.body||detail.content||""});
            route();
          }).catch(error=>{
            window._storyLookups.delete(storyId);
            if(location.hash.split("?")[0]===path)setPage({path:"",top:top("Story unavailable",true),main:`<section class="empty"><h2>This story couldn’t load</h2><p>${esc(error.message)}</p><button class="btn btn-p" data-act="story-retry" data-id="${esc(storyId)}">Try again</button></section>`,rail:""});
          });
        }
        return;
      }
      setPage(articlePage(story));
      const seenKey=String(story.id);
      if (!window._readEvents) window._readEvents=new Set();
      if (!window._readEvents.has(seenKey)) {
        window._readEvents.add(seenKey);
        NEWS_API.readStory(story.id).then(()=>{if(accountCache)accountCache.active_today=true;}).catch(error=>console.warn("Reading activity could not be recorded",error));
        NEWS_API.getStory(story.id).then(result=>{
          const detail=result.story || result.item || result;
          const current=by(story.id);
          if (detail && location.hash.split("?")[0]===path) {
            if (detail.title) current.t=detail.title;
            if (detail.deck) current.d=detail.deck;
            if (detail.author) current.by=detail.author;
            current.body = detail.body || detail.content || "";
            if (detail.read_minutes) current.rt=detail.read_minutes;
            if (detail.image_url) current.img=detail.image_url;
            if (detail.source_name) current.src=detail.source_name;
            if (detail.source_url) current.url=detail.source_url;
            if (detail.caption) current.cap=detail.caption;
            const title=$(".main > header h1"),metaLine=$(".main > header .meta"),body=$(".art");
            if(title)title.textContent=current.t;
            if(metaLine)metaLine.innerHTML=meta(current,1,1,current.ago);
            if(body&&current.body){
              const citationFooter = `<aside class="article-citation-footer glass-2"><span class="eyebrow">Article & Media Citation</span><p>Originally reported and published by ${current.url ? `<a href="${esc(current.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(current.src || "the reporting desk")}</strong> ↗</a>` : `<strong>${esc(current.src || "the reporting desk")}</strong>`}.${current.cap ? ` Photo credit & caption: <em>${esc(current.cap)}</em>.` : ""}</p></aside>`;
              body.innerHTML=articleBody(current)+citationFooter;
              ST.hl.filter(item=>String(item.id)===String(current.id)).forEach(item=>$$("p,li",body).forEach(paragraph=>{if(item.t&&paragraph.textContent.includes(item.t))paragraph.innerHTML=esc(paragraph.textContent).replace(esc(item.t),`<mark>${esc(item.t)}</mark>`);}));
            }
          }
        }).catch(()=>{});
      }
    } else if (SEC[path.slice(1)]) setPage(sectionPage(path.slice(1),Number(params.get("f"))||0));
    else if (path==="/search") setPage(searchPage(params.get("q")||"",params.get("s")||""));
    else if (path==="/saved") setPage(savedPage());
    else if (path==="/following") setPage(followingPage());
    else if (path==="/account") { accountPage(); }
    else setPage({path:"",top:top("Not found",true),main:empty("That page isn’t here","Try Today or choose a section from the menu.","Go to Today","#/"),rail:""});
  } catch (error) {
    console.error(error);
    setPage({path:"",top:top("News APP"),main:`<section class="empty"><h2>We couldn’t open this page</h2><p>${esc(error.message)}</p><button class="btn btn-p" data-act="retry">Try again</button></section>`,rail:""});
  }
}
function toast(message, undo) {
  const element=$("#toast");
  undoAction=undo||null;
  element.innerHTML=`<span>${esc(message)}</span>${undo?'<button class="btn btn-g" data-act="undo">Undo</button>':""}`;
  element.hidden=false;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>element.hidden=true,undo?5000:3200);
}
function toggleSave(id,quiet=false) {
  const wasSaved=ST.saved.some(item=>String(item)===String(id));
  ST.saved=wasSaved?ST.saved.filter(item=>String(item)!==String(id)):[id,...ST.saved];
  persist();
  $$(`[data-act="save"][data-id="${CSS.escape(String(id))}"]`).forEach(button=>{button.setAttribute("aria-pressed",String(!wasSaved));button.setAttribute("aria-label",wasSaved?"Save story":"Remove saved story");const label=$(".sl",button);if(label)label.textContent=wasSaved?"Save":"Saved";});
  if(location.hash.startsWith("#/saved")) route();
  if(!quiet)toast(wasSaved?"Removed from Saved":"Story saved",()=>toggleSave(id,true));
}
function showBrief() {
  const stories=STORIES.slice(0,5);
  if (!stories.length) { toast("No stories are available for a briefing yet."); return; }
  const story=stories[Math.min(briefingIndex,stories.length-1)];
  const overlay=$("#ov");
  overlay.hidden=false;
  overlay.setAttribute("aria-label",`Today in ${stories.length} stories`);
  $(".ovp",overlay).innerHTML=`<div class="mrow"><span class="meta">${briefingIndex+1} of ${stories.length}</span><button class="ib glass-2" data-act="bclose" aria-label="Close briefing">${ic("x")}</button></div><div class="bar"><i style="transform:scaleX(${(briefingIndex+1)/stories.length})"></i></div>${tag(story.s)}<h2>${esc(story.t)}</h2><p class="deck">${esc(story.d)}</p><a class="btn btn-g" href="#/story/${encodeURIComponent(story.id)}" data-act="bclose">Read the full story</a><div class="mrow"><button class="btn btn-s glass-2" data-act="bprev"${briefingIndex?"":" disabled"}>Previous</button><button class="btn btn-p" data-act="bnext">${briefingIndex<stories.length-1?"Next":"Done"}</button></div>`;
  $(".btn-p",overlay).focus();
}
const copyText = async text => {
  try { await navigator.clipboard.writeText(text); }
  catch (_) { const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.append(area);area.select();document.execCommand("copy");area.remove(); }
};
async function finishOnboarding() {
  const selected=$$(".choice[data-act=interest][aria-pressed=true]").map(button=>button.dataset.k);
  const errorBox=$("#onboard-error");
  if (!selected.length) { errorBox.textContent="Choose at least one topic to continue."; errorBox.hidden=false; return; }
  const button=$('[data-act="finish-onboarding"]'); button.disabled=true;button.textContent="Saving your choices…";errorBox.hidden=true;
  try {
    const preferences={necessary:true,personalization:$("#cookie-personal")?.checked!==false,analytics:$("#cookie-analytics")?.checked===true};
    const displayName=(accountCache&&accountCache.display_name)||(window.SESSION_USER&&window.SESSION_USER.display_name)||(window.SESSION_USER&&window.SESSION_USER.email)||"Reader";
    if(window.NEWS_CONSENT)window.NEWS_CONSENT.save({preferences:true,analytics:preferences.analytics,personalization:preferences.personalization},"onboarding");
    accountCache=await NEWS_API.putAccount({display_name:displayName,interests:selected,cookie_preferences:preferences,timezone:localTimezone(),onboarding_completed:true});
    ST.follow=[...new Set([...ST.follow,...selected])];
    await NEWS_API.putReader(ST);
    go("/");
  } catch (error) {
    errorBox.textContent="We couldn’t save your choices. "+error.message;
    errorBox.hidden=false;button.disabled=false;button.textContent="Save choices & open Today";
  }
}
async function submitAuth(form) {
  const formData=new FormData(form);
  const signup=location.hash==="#/signup";
  const errorBox=$("#auth-error"),successBox=$("#auth-success"),button=$("button[type=submit]",form);
  errorBox.hidden=true;successBox.hidden=true;button.disabled=true;button.textContent=signup?"Creating account…":"Signing in…";
  const email=String(formData.get("email")||"").trim();
  const password=String(formData.get("password")||"");
  try {
    if (window.AUTH_CONFIG && window.AUTH_CONFIG.configured===false) throw new Error("Email sign-in is not configured yet. Please contact the administrator.");
    const response=signup
      ? await NEWS_API.signup({email,password,display_name:String(formData.get("display_name")||"").trim()})
      : await NEWS_API.login({email,password});
    const hasSession=NEWS_API.saveSession(response);
    if (!hasSession) {
      if (signup) {
        successBox.textContent="Account created. Check your email for a verification link, then come back here to sign in.";
        successBox.hidden=false;form.reset();button.disabled=false;button.textContent="Create account";
      } else throw new Error("No active session was returned. Please verify your email, then try again.");
      return;
    }
    if (!window.SESSION_USER && response.user) window.SESSION_USER=response.user;
    accountCache=null;
    try { accountCache=await NEWS_API.getAccount(); } catch (_) {}
    go(signup && (!accountCache || !accountCache.onboarding_completed) ? "/onboarding" : "/");
  } catch (error) {
    errorBox.textContent=error.message;
    errorBox.hidden=false;
    button.disabled=false;button.textContent=signup?"Create account":"Log in";
  }
}
async function saveProfile(form) {
  const name=String(new FormData(form).get("display_name")||"").trim();
  const interests=$$(".choice[data-act=account-interest][aria-pressed=true]").map(button=>button.dataset.k);
  const error=$("#account-error"),success=$("#account-success"),button=$("button[type=submit]",form);
  error.hidden=true;success.hidden=true;button.disabled=true;button.textContent="Saving…";
  try {
    const prior=accountCache||{};
    accountCache=await NEWS_API.putAccount({display_name:name,interests,cookie_preferences:{necessary:true,personalization:prior.cookie_preferences?.personalization!==false,analytics:prior.cookie_preferences?.analytics===true},timezone:prior.timezone||localTimezone(),onboarding_completed:prior.onboarding_completed!==false});
    success.textContent="Your profile is up to date.";success.hidden=false;
    button.disabled=false;button.textContent="Save profile";
  } catch (problem) {
    error.textContent="Your changes couldn’t be saved. "+problem.message;error.hidden=false;
    button.disabled=false;button.textContent="Save profile";
  }
}
document.addEventListener("submit",event=>{
  if(event.target.id==="auth-form"){event.preventDefault();submitAuth(event.target);}
  if(event.target.id==="profile-form"){event.preventDefault();saveProfile(event.target);}
});
document.addEventListener("input", event => {
  const id = event.target.id;
  if (["picker-primary", "hex-primary", "picker-paper", "hex-paper"].includes(id)) {
    if (id === "picker-primary") {
      const hex = $("#hex-primary"); if (hex) hex.value = event.target.value.replace(/^#/, "");
    } else if (id === "hex-primary") {
      const picker = $("#picker-primary"); if (picker && /^[0-9A-Fa-f]{6}$/.test(event.target.value)) picker.value = "#" + event.target.value;
    } else if (id === "picker-paper") {
      const hex = $("#hex-paper"); if (hex) hex.value = event.target.value.replace(/^#/, "");
    } else if (id === "hex-paper") {
      const picker = $("#picker-paper"); if (picker && /^[0-9A-Fa-f]{6}$/.test(event.target.value)) picker.value = "#" + event.target.value;
    }
    const prim = ($("#hex-primary")?.value || "3C63ED").trim();
    const pap = ($("#hex-paper")?.value || (isDark() ? "0b1020" : "f8faff")).trim();
    const ratio = getContrastRatio("#" + prim, "#" + pap);
    const banner = $("#wcag-banner");
    if (banner) {
      if (ratio === null) {
        banner.className = "wcag-banner is-fail";
        banner.setAttribute("role", "alert");
        banner.innerHTML = `<span>⚠️ Enter valid 6-digit hex colors to verify WCAG contrast.</span><span class="wcag-ratio">—</span>`;
      } else {
        const isPass = ratio >= 4.5;
        banner.className = `wcag-banner ${isPass ? "is-pass" : "is-fail"}`;
        banner.setAttribute("role", isPass ? "status" : "alert");
        banner.innerHTML = `<span>${isPass ? "✓ WCAG AA Compliant — primary brand meets minimum contrast (4.5:1) against canvas." : "⚠️ Low Contrast Warning — ratio falls below WCAG AA minimum (4.5:1 required)."}</span><span class="wcag-ratio">${ratio}:1 ${isPass ? "Pass" : "Fail"}</span>`;
      }
    }
  }
});
document.addEventListener("keydown", event => {
  if (event.target.classList.contains("settings-tab-btn") && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    const tabs = $$(".settings-tab-btn");
    const idx = tabs.indexOf(event.target);
    if (idx === -1) return;
    let nextIdx = idx;
    if (event.key === "ArrowLeft") nextIdx = (idx - 1 + tabs.length) % tabs.length;
    else if (event.key === "ArrowRight") nextIdx = (idx + 1) % tabs.length;
    else if (event.key === "Home") nextIdx = 0;
    else if (event.key === "End") nextIdx = tabs.length - 1;
    tabs[nextIdx].focus();
    tabs[nextIdx].click();
  }
});
document.addEventListener("click",async event=>{
  const button=event.target.closest("[data-act]");
  if(!button)return;
  const action=button.dataset.act,id=button.dataset.id;
  if(action==="save") toggleSave(id);
  else if(action==="like"){
    const on=!ST.liked.includes(id);ST.liked=on?[...ST.liked,id]:ST.liked.filter(item=>item!==id);persist();button.setAttribute("aria-pressed",String(on));button.setAttribute("aria-label",(on?"Unlike":"Like")+" story");$("span",button).textContent=on?"Liked":"Like";
  } else if(action==="theme"){
    ST.theme=isDark()?"light":"dark";persist();applyTheme();$$('[data-act="theme"]').forEach(item=>{item.innerHTML=ic(isDark()?"sun":"moon");item.setAttribute("aria-label","Switch to "+(isDark()?"light":"dark")+" theme");});
    if (location.hash.split("?")[0] === "#/account") accountPage();
  } else if(action==="account-tab"){
    currentAccountTab = button.dataset.tab;
    $$(".settings-tab-btn").forEach(btn => {
      const isCur = btn.dataset.tab === currentAccountTab;
      btn.setAttribute("aria-selected", String(isCur));
      btn.classList.toggle("is-selected", isCur);
    });
    $$(".settings-tabpanel").forEach(panel => {
      panel.classList.toggle("is-active", panel.id === `panel-${currentAccountTab}`);
    });
    try {
      history.replaceState(null, "", `#/account?tab=${currentAccountTab}`);
    } catch (_) {}
  } else if(action==="checkin"){
    button.disabled=true;
    button.textContent="Logging…";
    try {
      accountCache = await NEWS_API.checkin();
      toast("Reading logged for today");
      accountPage();
    } catch(e) {
      toast("Could not log reading: " + e.message);
      button.disabled=false;
      button.textContent="Log today’s reading";
    }
  } else if(action==="select-preset"){
    const presetId=button.dataset.preset;
    const preset=THEME_PRESETS.find(p=>p.id===presetId);
    if(preset){
      CUSTOM_THEME={
        preset:preset.id,
        primary:preset.primary,
        secondary:preset.secondary,
        paper:preset.paper,
        paperDark:preset.paperDark
      };
      try{localStorage.setItem("kiosk-custom-theme",JSON.stringify(CUSTOM_THEME));}catch(_){}
      applyTheme();
      toast(`Applied theme preset: ${preset.name}`);
      accountPage();
    }
  } else if(action==="apply-custom-tokens"){
    const pVal=($("#hex-primary")?.value||"").trim().replace(/^#/,"");
    const sVal=($("#hex-secondary")?.value||"").trim().replace(/^#/,"");
    const papVal=($("#hex-paper")?.value||"").trim().replace(/^#/,"");
    if(!/^[0-9A-Fa-f]{6}$/.test(pVal) || !/^[0-9A-Fa-f]{6}$/.test(sVal) || !/^[0-9A-Fa-f]{6}$/.test(papVal)){
      toast("Please enter valid 6-digit hex colors (e.g. 3C63ED)");
      return;
    }
    CUSTOM_THEME.preset="custom";
    CUSTOM_THEME.primary="#"+pVal;
    CUSTOM_THEME.secondary="#"+sVal;
    if(isDark()) CUSTOM_THEME.paperDark="#"+papVal;
    else CUSTOM_THEME.paper="#"+papVal;
    try{localStorage.setItem("kiosk-custom-theme",JSON.stringify(CUSTOM_THEME));}catch(_){}
    applyTheme();
    toast("Custom color tokens saved and applied");
    accountPage();
  } else if(action==="reset-tokens"){
    const def=THEME_PRESETS[0];
    CUSTOM_THEME={
      preset:def.id,
      primary:def.primary,
      secondary:def.secondary,
      paper:def.paper,
      paperDark:def.paperDark
    };
    try{localStorage.setItem("kiosk-custom-theme",JSON.stringify(CUSTOM_THEME));}catch(_){}
    applyTheme();
    toast("Color tokens reset to " + def.name);
    accountPage();
  } else if(action==="set-size"){
    const szIndex=Number(button.dataset.sz);
    if(!isNaN(szIndex) && szIndex>=0 && szIndex<SIZES.length){
      ST.sz=szIndex;
      persist();
      $(".art")?.style.setProperty("--sz",SIZES[ST.sz]);
      toast("Article text size: "+SZN[ST.sz]);
      accountPage();
    }
  } else if(action==="follow"){
    const key=button.dataset.k,on=!ST.follow.includes(key);ST.follow=on?[...ST.follow,key]:ST.follow.filter(item=>item!==key);persist();button.outerHTML=followButton(key);if(on)toast((SEC[key]||key)+" stories will appear on Today.");
  } else if(action==="more"){
    const feed = $("#feed");
    if (!feed) return;
    const renderedIds = new Set([...$$("[data-id]")].map(el => String(el.dataset.id)));
    const storiesPool = Array.isArray(window.STORIES) ? window.STORIES : (STORIES || []);
    const prioritized = [...storiesPool].sort((a, b) => Number(ST.follow.includes(b.s)) - Number(ST.follow.includes(a.s)));
    const unrendered = prioritized.filter(story => !renderedIds.has(String(story.id)));
    const nextBatch = unrendered.slice(0, 6);
    if (nextBatch.length) {
      feed.insertAdjacentHTML("beforeend", nextBatch.map(story => row(story)).join(""));
      const firstNew = feed.querySelector(`[data-id="${CSS.escape(String(nextBatch[0].id))}"]`);
      if (firstNew) $("a", firstNew)?.focus();
    }
    if (unrendered.length <= 6) button.remove();
  } else if(action==="copy"){copyText(location.href);toast("Story link copied");}
  else if(action==="aa"){ST.sz=(Number(ST.sz||0)+1)%SIZES.length;persist();$(".art")?.style.setProperty("--sz",SIZES[ST.sz]);toast("Text size: "+SZN[ST.sz]);}
  else if(action==="cscroll"){$(".cms")?.scrollIntoView({behavior:"smooth"});$("#cin")?.focus();}
  else if(action==="send"){
    const input=$("#cin"),text=input && input.value.trim();if(!text)return;
    ST.cm[id]=Array.isArray(ST.cm[id])?ST.cm[id]:[];ST.cm[id].unshift(text);persist();input.value="";
    $(".cms").outerHTML=comments(by(id));$("#cc").textContent=ST.cm[id].length;toast("Comment posted");
  } else if(action==="hl"&&selectedRange){
    const text=selectedRange.toString().trim(),storyId=$(".art")?.dataset.id;if(!text||!storyId)return;
    ST.hl.unshift({id:storyId,t:text,d:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})});persist();getSelection().removeAllRanges();$("#seltb").hidden=true;toast("Highlight saved");
  } else if(action==="hlcopy"&&selectedRange){copyText(selectedRange.toString());$("#seltb").hidden=true;toast("Passage copied");}
  else if(action==="hlshare"&&selectedRange){const text=selectedRange.toString();$("#seltb").hidden=true;if(navigator.share)navigator.share({text,url:location.href}).catch(()=>{});else{copyText(text+" "+location.href);toast("Passage copied");}}
  else if(action==="rmhl"){const index=Number(button.dataset.i),[item]=ST.hl.splice(index,1);persist();route();toast("Highlight removed",()=>{ST.hl.splice(index,0,item);persist();route();});}
  else if(action==="seg"){savedView=button.dataset.v;route();}
  else if(action==="copyall"){copyText(ST.hl.map(item=>`“${item.t}” ${location.origin+location.pathname}#/story/${encodeURIComponent(item.id)}`).join("\n\n"));toast(ST.hl.length+" highlights copied");}
  else if(action==="undo"){if(undoAction)undoAction();$("#toast").hidden=true;}
  else if(action==="retry"){if(location.hash==="#/account")accountPage();else location.reload();}
  else if(action==="brief"){briefingIndex=0;showBrief();}
  else if(action==="bnext"){if(briefingIndex<4&&briefingIndex<STORIES.length-1){briefingIndex++;showBrief();}else $("#ov").hidden=true;}
  else if(action==="bprev"){briefingIndex=Math.max(0,briefingIndex-1);showBrief();}
  else if(action==="bclose")$("#ov").hidden=true;
  else if(action==="interest"||action==="account-interest"){const selected=button.getAttribute("aria-pressed")==="true";button.setAttribute("aria-pressed",String(!selected));}
  else if(action==="finish-onboarding")finishOnboarding();
  else if(action==="account-retry")accountPage();
  else if(action==="onboarding-retry"){accountCache=null;route();}
  else if(action==="story-retry"){window._storyLookups?.delete(id);route();}
  else if(action==="logout"){NEWS_API.logout().catch(()=>{}).finally(()=>{accountCache=null;go("/landing");});}
  else if(action==="toggle-pin"){
    isSidebarPinned = !isSidebarPinned;
    try { localStorage.setItem("kiosk-sidebar-pinned", isSidebarPinned ? "true" : "false"); } catch (_) {}
    const app = $("#app");
    if (app && app.classList.contains("layout")) {
      app.classList.toggle("sidebar-pinned", isSidebarPinned);
      app.classList.toggle("sidebar-unpinned", !isSidebarPinned);
    }
    const sidebar = $(".sidebar");
    if (sidebar) sidebar.classList.remove("is-hover-open");
    const topbarBtn = $(".topbar-wrap .sidebar-toggle-btn");
    if (topbarBtn) {
      topbarBtn.classList.toggle("is-pinned", isSidebarPinned);
      topbarBtn.setAttribute("aria-label", isSidebarPinned ? "Collapse sidebar" : "Open sidebar");
      topbarBtn.setAttribute("title", isSidebarPinned ? "Collapse sidebar" : "Open sidebar");
    }
    const sideHeadBtn = $(".sidebar-head .sidebar-toggle-btn");
    if (sideHeadBtn) {
      sideHeadBtn.classList.toggle("is-pinned", isSidebarPinned);
      sideHeadBtn.setAttribute("aria-label", isSidebarPinned ? "Collapse sidebar" : "Keep sidebar open");
      sideHeadBtn.setAttribute("title", isSidebarPinned ? "Collapse sidebar" : "Keep sidebar open");
    }
  }
});
document.addEventListener("input",event=>{
  const target=event.target;
  if(target.id==="q"){
    clearTimeout(debounceTimer);
    debounceTimer=setTimeout(()=>{
      const query=target.value,params=query?"?q="+encodeURIComponent(query):"";
      history.replaceState(null,"","#/search"+params);
      const results=$("#res");if(results)results.innerHTML=searchResults(query,"");
    },160);
    return;
  }
  if(target.id==="picker-primary"){
    const hex=target.value.replace(/^#/,"");
    const hexInput=$("#hex-primary");
    if(hexInput)hexInput.value=hex;
    const p=hexToHsl(target.value);
    if(p){
      document.documentElement.style.setProperty("--accent",p.str);
      const softL=isDark()?22:94;
      document.documentElement.style.setProperty("--accent-soft",`${p.h} ${Math.min(p.s,60)}% ${softL}%`);
    }
  } else if(target.id==="hex-primary"){
    const val=target.value.trim().replace(/^#/,"");
    if(/^[0-9A-Fa-f]{6}$/.test(val)){
      const picker=$("#picker-primary");
      if(picker)picker.value="#"+val;
      const p=hexToHsl("#"+val);
      if(p){
        document.documentElement.style.setProperty("--accent",p.str);
        const softL=isDark()?22:94;
        document.documentElement.style.setProperty("--accent-soft",`${p.h} ${Math.min(p.s,60)}% ${softL}%`);
      }
    }
  } else if(target.id==="picker-secondary"){
    const hex=target.value.replace(/^#/,"");
    const hexInput=$("#hex-secondary");
    if(hexInput)hexInput.value=hex;
    const s=hexToHsl(target.value);
    if(s)document.documentElement.style.setProperty("--green",s.str);
  } else if(target.id==="hex-secondary"){
    const val=target.value.trim().replace(/^#/,"");
    if(/^[0-9A-Fa-f]{6}$/.test(val)){
      const picker=$("#picker-secondary");
      if(picker)picker.value="#"+val;
      const s=hexToHsl("#"+val);
      if(s)document.documentElement.style.setProperty("--green",s.str);
    }
  } else if(target.id==="picker-paper"){
    const hex=target.value.replace(/^#/,"");
    const hexInput=$("#hex-paper");
    if(hexInput)hexInput.value=hex;
    const pap=hexToHsl(target.value);
    if(pap)document.documentElement.style.setProperty("--paper",pap.str);
  } else if(target.id==="hex-paper"){
    const val=target.value.trim().replace(/^#/,"");
    if(/^[0-9A-Fa-f]{6}$/.test(val)){
      const picker=$("#picker-paper");
      if(picker)picker.value="#"+val;
      const pap=hexToHsl("#"+val);
      if(pap)document.documentElement.style.setProperty("--paper",pap.str);
    }
  }
});
document.addEventListener("keydown",event=>{
  const target=event.target;
  if(event.key==="Enter"&&target.id==="tq"){go("/search?q="+encodeURIComponent(target.value),true);}
  else if(event.key==="Enter"&&target.id==="cin"){event.preventDefault();$('[data-act="send"]')?.click();}
  else if(event.key==="/"&&!/INPUT|TEXTAREA/.test(target.tagName)){const input=$("#q")||$("#tq");if(input){event.preventDefault();input.focus();}}
  else if(event.key==="Escape"){if(target.id==="q"){target.value="";target.dispatchEvent(new Event("input",{bubbles:true}));}$("#ov").hidden=true;if(!isSidebarPinned)closeSidebarHover(0);}
});
document.addEventListener("pointerdown",event=>{if(event.target.closest(".seltb"))event.preventDefault();if(!isSidebarPinned&&!event.target.closest(".sidebar")&&!event.target.closest(".sidebar-toggle-btn"))closeSidebarHover(0);});
document.addEventListener("selectionchange",()=>{
  const selection=getSelection(),range=selection.rangeCount&&!selection.isCollapsed?selection.getRangeAt(0):null,article=$(".art"),toolbar=$("#seltb");
  if(!range||!article||!article.contains(range.commonAncestorContainer)){toolbar.hidden=true;return;}
  selectedRange=range;const bounds=range.getBoundingClientRect();toolbar.hidden=false;toolbar.style.top=Math.max(8,bounds.top-52)+"px";toolbar.style.left=Math.max(8,Math.min(innerWidth-220,bounds.left))+"px";
});
addEventListener("scroll",()=>{
  const distance=document.documentElement.scrollHeight-innerHeight;
  const progress=$(".art")&&distance>0?Math.min(1,Math.max(0,scrollY/distance)):0;
  $("#pb").style.transform=`scaleX(${progress})`;
  $("#seltb").hidden=true;
},{passive:true});
addEventListener("hashchange",route);
const hotzone = $("#sidebar-hotzone");
if (hotzone) {
  hotzone.addEventListener("mouseenter", openSidebarHover);
  hotzone.addEventListener("mouseleave", () => closeSidebarHover(220));
}
window.addEventListener("pointermove", event => {
  if (isSidebarPinned || !$(".sidebar") || window.innerWidth <= 760) return;
  if (event.clientX <= 28) {
    openSidebarHover();
  } else if (event.clientX > 275) {
    const sidebar = $(".sidebar");
    if (sidebar && sidebar.classList.contains("is-hover-open")) {
      closeSidebarHover(120);
    }
  }
});
document.addEventListener("mouseleave", () => closeSidebarHover(100));
applyTheme();
if (window.AUTH_TOKEN && !accountCache) {
  NEWS_API.getAccount().then(account=>{accountCache=account;route();}).catch(()=>route());
} else route();
})();
