/*
 * Reader service worker: installable app, and the last stories you opened stay readable without a connection.
 * - Pages: network first; offline, the cached copy of that page, else the home page.
 * - Built files (/assets/, hashed names) and icons: cache first.
 * - Story API reads: network first with a cached fallback (a small, capped cache).
 * - Account, consent and analytics calls are never cached.
 */
const VERSION = 'reader-v1'
const PAGES = `${VERSION}-pages`
const DATA = `${VERSION}-data`
const MAX_DATA = 80

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon-192.png'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function trim(name, max) {
  const cache = await caches.open(name)
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)))
}

function networkFirst(req, cacheName, fallback) {
  return fetch(req)
    .then((res) => {
      if (res.ok) {
        const copy = res.clone()
        caches.open(cacheName).then((c) => c.put(req, copy).then(() => trim(cacheName, MAX_DATA)))
      }
      return res
    })
    .catch(() => caches.match(req).then((hit) => hit || (fallback ? caches.match(fallback) : undefined) || Response.error()))
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/newsroom')) return

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, PAGES, '/'))
    return
  }
  if (url.pathname.startsWith('/api/')) {
    if (/^\/api\/(stories|sections|trending)/.test(url.pathname)) event.respondWith(networkFirst(req, DATA))
    return
  }
  if (url.pathname.startsWith('/assets/') || /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(VERSION).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})
