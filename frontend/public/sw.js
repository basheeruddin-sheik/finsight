// Cache version — bump this string on every deploy to bust stale assets.
// Use the build timestamp so it's always unique without manual edits.
const CACHE = 'finsight-' + (self.__BUILD_TIME__ || 'dev');

const SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline.html',
];

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete all old caches ──────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // 1. API calls — always network, never cache
  if (url.port === '3000' || url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(request));
    return;
  }

  // 2. Navigation (HTML pages) — network-first, fall back to cached '/', then offline page
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          // cache a fresh copy of the shell on every navigation
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match('/') || caches.match('/offline.html'))
        )
    );
    return;
  }

  // 3. Static assets (JS, CSS, images) — cache-first, update in background
  e.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});
