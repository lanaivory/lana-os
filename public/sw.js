/* Lana OS service worker — cache shell for installable / offline open. */
const CACHE = 'lana-os-shell-v1'
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Always hit the network for API — never cache board / Twilio traffic.
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req)
        const cache = await caches.open(CACHE)
        if (fresh.ok) cache.put(req, fresh.clone())
        return fresh
      } catch {
        const cached = await caches.match(req)
        if (cached) return cached
        if (req.mode === 'navigate') {
          const shell = await caches.match('/index.html')
          if (shell) return shell
        }
        throw new Error('offline')
      }
    })(),
  )
})
