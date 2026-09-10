const CACHE = 'world-explorer-v15';
const CORE = [
  '/',
  '/index.html',
  '/style.css?v=15',
  '/ui-overrides.css?v=15',
  '/app.js?v=15',
  '/mobile-engine.js?v=15',
  '/manifest.webmanifest',
  '/vendor/leaflet.js',
  '/vendor/leaflet.css'
];
const NO_CACHE = ['/app.js', '/style.css', '/ui-overrides.css', '/mobile-engine.js', '/index.html', '/sw.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(async (cache) => {
        for (const url of CORE) {
          try {
            const response = await fetch(url, { cache: 'no-store' });
            if (response.ok) await cache.put(url, response);
          } catch (_) {}
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  const path = url.pathname;
  const critical = event.request.mode === 'navigate' || NO_CACHE.includes(path);

  if (critical) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response.ok && event.request.mode === 'navigate') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match('/index.html')))
  );
});
