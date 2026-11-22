/* HighWater service worker v2 — the app shell is served cache-first so the
   page survives offline, and every same-origin response is revalidated in
   the background (stale-while-revalidate): a browser that already has the
   app installed gets the cached copy instantly, the fresh copy is fetched
   and written into the cache, and the NEXT load serves the new version.
   The cache name is versioned, so v1 installs are evicted on activation
   and every already-installed browser picks up this update. API calls
   (USGS / NWS) are cross-origin and pass straight through; when they fail
   offline the app itself shows cached data with honest labels. */
const CACHE = 'highwater-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // APIs go live; app handles their failure
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const fresh = fetch(e.request)
        .then((r) => {
          if (r && r.ok) {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return r;
        })
        .catch(() => null);
      if (hit) return hit;           // instant offline answer, background refresh
      return fresh.then((r) => r || new Response('offline', { status: 503, statusText: 'offline' }));
    })
  );
});
