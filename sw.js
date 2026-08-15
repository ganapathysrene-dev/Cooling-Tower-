// Service worker for the ASHRAE Ch. 40 Cooling Tower Performance dashboard.
// Deploy this file in the SAME folder as index.html (repository root).
//
// IMPORTANT: bump CACHE_VERSION whenever you publish an updated index.html —
// otherwise phones that already installed the app will keep serving the old
// cached copy and never see your changes.
const CACHE_VERSION = 'cooling-tower-v3';

const ASSETS = [
  './',
  './index.html',
];

// Pre-cache on install so the app works offline immediately after first visit,
// then take over without waiting for existing tabs to close.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => { /* a missing asset shouldn't block installation */ })
  );
});

// Remove caches from previous versions on activation.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first for page loads: online users always get the newest published
// version; offline users fall back to the cached copy. Cache-first for anything
// else, since the dashboard is fully self-contained with no external assets.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
