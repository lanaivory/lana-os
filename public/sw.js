/* Lana OS service worker — cache shell + web push for text capture. */
const CACHE = 'lana-os-shell-v3'
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

self.addEventListener('push', (event) => {
  let title = 'Lana OS'
  let body = 'Got it ✅'
  let url = '/'
  let taskId = undefined
  let listId = undefined
  try {
    const data = event.data ? event.data.json() : null
    if (data && typeof data === 'object') {
      if (typeof data.title === 'string' && data.title.trim()) title = data.title
      if (typeof data.body === 'string' && data.body.trim()) body = data.body
      if (typeof data.url === 'string' && data.url.trim()) url = data.url
      if (typeof data.taskId === 'string' && data.taskId.trim()) taskId = data.taskId.trim()
      if (typeof data.listId === 'string' && data.listId.trim()) listId = data.listId.trim()
      if ((!url || url === '/') && taskId) {
        url = `/?focus=${encodeURIComponent(taskId)}`
      }
    }
  } catch {
    try {
      const text = event.data ? event.data.text() : ''
      if (text.trim()) body = text
    } catch {
      // keep defaults
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url, taskId, listId },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  let targetUrl = typeof data.url === 'string' && data.url.trim() ? data.url : '/'
  if (
    (targetUrl === '/' || !targetUrl.includes('focus=')) &&
    typeof data.taskId === 'string' &&
    data.taskId.trim()
  ) {
    targetUrl = `/?focus=${encodeURIComponent(data.taskId.trim())}`
  }

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of all) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client && targetUrl) {
            try {
              await client.navigate(targetUrl)
            } catch {
              // navigate may be unsupported; post a focus message as fallback
              try {
                client.postMessage({ type: 'lana-focus', url: targetUrl })
              } catch {
                // ignore
              }
            }
          }
          return
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })(),
  )
})
