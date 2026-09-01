const CACHE = 'vectora-shell-v2';
const SHELL = ['/', '/help/', '/manifest.webmanifest', '/icon.svg', '/icon-light.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        // A graph URL is application state, not a distinct document shell.
        // Keep one current root response instead of one duplicate per graph.
        const key = new URL(event.request.url).pathname.startsWith('/g/') ? '/' : event.request;
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(key, copy)).catch(() => {}));
      }
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached ?? caches.match('/'))));
    return;
  }
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && response.type === 'basic') { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached ?? Response.error())));
});
