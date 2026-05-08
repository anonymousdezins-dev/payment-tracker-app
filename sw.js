const CACHE_NAME = 'payment-tracker-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.svg'
];

// Install Service Worker
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// Fetch events
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      // Return cached response if found, else fetch over network
      return response || fetch(e.request);
    })
  );
});
