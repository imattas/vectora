const CACHE = 'vectora-shell-v4';
const PAGES = ['/', '/help/'];
const SHELL = ['/manifest.webmanifest', '/icon.svg', '/icon-light.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png'];

async function cachePage(cache, path) {
  const response = await fetch(new Request(path, { cache: 'no-store' }));
  if (!response.ok || response.type !== 'basic') return;
  await cache.put(path, response.clone());
  const html = await response.text();
  const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)]
    .map(match => match[1])
    .filter(ref => ref && !ref.startsWith('#'));
  await Promise.all(refs.map(async ref => {
    try {
      const url = new URL(ref, new URL(path, self.location.origin));
      if (url.origin !== self.location.origin || url.pathname === '/sw.js') return;
      await cache.add(url.href);
    } catch {
      // One optional asset must not prevent the rest of the shell installing.
    }
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(async cache => {
      await Promise.all(SHELL.map(url => cache.add(url).catch(() => undefined)));
      await Promise.all(PAGES.map(path => cachePage(cache, path).catch(() => undefined)));
    })
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    const path = new URL(event.request.url).pathname;
    const offlineFallback = path.startsWith('/help') ? '/help/' : '/';
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        // A graph URL is application state, not a distinct document shell.
        // Keep one current root response instead of one duplicate per graph.
        const key = new URL(event.request.url).pathname.startsWith('/g/') ? '/' : event.request;
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(key, copy)).catch(() => {}));
      }
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached ?? caches.match(offlineFallback))));
    return;
  }
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {}));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached ?? Response.error())));
});
