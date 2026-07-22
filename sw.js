const CACHE_NAME = 'qsis-v17';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/db.js',
  './js/auth.js',
  './js/github.js',
  './js/router.js',
  './js/routine.js',
  './js/contributors.js',
  './js/views/home.js',
  './js/views/contributors.js',
  './js/views/routine.js',
  './js/views/history.js',
  './js/views/downloads.js',
  './js/views/settings.js',
  './js/app.js',
  './assets/arms-logo.png',
  './assets/qsis-logo.jpg',
  './assets/pl-logo.png',
  './assets/iiuc-logo.png',
  './assets/app-icon.jpg',
  './manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function(c) { return c.addAll(SHELL); }).then(function() { return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) { return Promise.all(
      keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); })
    ); }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(res) {
        if (res.ok && e.request.method === 'GET') {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { return c.put(e.request, clone); });
        }
        return res;
      });
    })
  );
});
