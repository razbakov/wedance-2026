// SDTV Form Service Worker — offline cache for form shell
const CACHE_NAME = 'sdtv-form-v3.2';
const SHELL = ['/', '/index.html', '/style.css', '/app.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API calls + video previews — network only (never cache)
  if (url.pathname.startsWith('/api/')) return;

  // Form shell — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(response => {
        // Update cache in background
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => cached); // Offline → serve cached
      return cached || networkFetch;
    })
  );
});
