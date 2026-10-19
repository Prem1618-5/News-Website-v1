/*
 * Newsroom service worker: makes the app installable and lets it open on a weak or dropped connection.
 * - Pages: network first, falling back to the cached app shell.
 * - Built files (/assets/, hashed names): cache first, they never change.
 * - API calls and uploaded media are never cached here; drafts are protected by the editor's own local copy.
 */
const VERSION = "newsroom-v1";
const SHELL = "./";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll([SHELL, "manifest.webmanifest", "icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/media/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(VERSION).then((c) => c.put(SHELL, copy));
          return res;
        })
        .catch(() => caches.match(SHELL).then((r) => r || Response.error())),
    );
    return;
  }

  if (url.pathname.includes("/assets/") || /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
