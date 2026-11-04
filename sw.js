// Service worker : permet d'utiliser l'app hors-ligne.
// Stratégie "réseau d'abord" : si tu as du réseau, tu reçois toujours la
// dernière version publiée ; sinon, la version en cache est utilisée.
const CACHE_NAME = 'pb-tracker-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/program.js',
  './js/app.js',
  './js/progress.js',
  './js/vendor/supabase.min.js',
  './js/config.js',
  './js/sync.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Les appels externes (Supabase, polices) ne passent pas par le cache
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
      )
  );
});
