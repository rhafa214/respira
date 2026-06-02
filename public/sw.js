const CACHE_NAME = 'respira-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Just an empty cache or minimal
      return cache.addAll(['/']);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
