const CACHE_NAME = 'qsis-v4';
const SHELL = [
  './',
  './index.html',
  './history.html',
  './cached.html',
  './contributors.html',
  './routine.html',
  './css/style.css',
  './css/routine.css',
  './js/config.js',
  './js/db.js',
  './js/github.js',
  './js/app.js',
  './js/routine.js',
  './js/contributors.js',
  './assets/qsis-logo.jpg',
  './assets/pl-logo.png',
  './assets/iiuc-logo.png',
  './assets/arms-logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://documentcloud.adobe.com/view-sdk/main.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
