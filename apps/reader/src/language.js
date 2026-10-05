/* English and Hindi reading. No translation API is used.
   Stories written in Hindi are shown in Devanagari. For English stories, readers who choose Hindi are pointed to their
   browser's built-in Translate, which is free and runs on the device. */
const KEY = "news-lang";
const get = () => (localStorage.getItem(KEY) === "hi" ? "hi" : "en");
let tipDismissed = false;

function apply() {
  const lang = get();
  document.documentElement.dataset.readLang = lang;
  document.querySelectorAll(".art[data-id]").forEach((el) => {
    const story = (window.STORIES || []).find((s) => String(s.id) === el.dataset.id);
    const storyLang = story && story.lang === "hi" ? "hi" : "en";
    el.setAttribute("lang", storyLang);
    el.closest("main, article, .shell")?.querySelector("header h1")?.setAttribute("lang", storyLang);
  });
  document.querySelectorAll(".logo span, .logo i").forEach((el) => el.setAttribute("translate", "no"));

  document.querySelectorAll(".topbar:not(:has(.lang-switch))").forEach((bar) => {
    const wrap = document.createElement("div");
    wrap.className = "lang-switch glass-2";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Reading language");
    wrap.innerHTML = `<button type="button" data-lang="en" translate="no">EN</button><button type="button" data-lang="hi" translate="no" lang="hi">हिं</button>`;
    bar.querySelector(".sp")?.after(wrap);
  });
  document.querySelectorAll(".lang-switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));

  const art = document.querySelector(".art[lang='en']");
  const existing = document.getElementById("lang-tip");
  if (lang === "hi" && art && !tipDismissed) {
    if (!existing) {
      const tip = document.createElement("aside");
      tip.id = "lang-tip";
      tip.className = "lang-tip glass-2";
      tip.setAttribute("role", "note");
      tip.innerHTML = `<p><b lang="hi">हिन्दी में पढ़ें।</b> This story was written in English. Use your browser's Translate to read it in Hindi: in Chrome open the page menu and choose <b>Translate</b>; in Safari tap <b>aA</b> then <b>Translate to Hindi</b>.</p><button type="button" class="btn btn-g btn-sm" data-lang-dismiss>Got it</button>`;
      art.before(tip);
    }
  } else existing?.remove();
}

document.addEventListener("click", (event) => {
  const pick = event.target.closest("[data-lang]");
  if (pick) {
    try { localStorage.setItem(KEY, pick.dataset.lang); } catch (_) {}
    tipDismissed = false;
    document.dispatchEvent(new CustomEvent("news:language", { detail: pick.dataset.lang }));
    apply();
  }
  if (event.target.closest("[data-lang-dismiss]")) { tipDismissed = true; apply(); }
});

let pending = 0;
new MutationObserver(() => {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(apply);
}).observe(document.getElementById("app") || document.body, { childList: true, subtree: true });
window.addEventListener("hashchange", () => { tipDismissed = false; });
apply();
