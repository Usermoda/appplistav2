// ============================================================
// Service Worker — cache de assets estáticos (stale-while-revalidate)
// ============================================================
const CACHE = 'app-lista-v5';

const PRECACHE = [
  './',
  './index.html',
  './login.html',
  './cadastro.html',
  './css/style.css',
  './js/config.js',
  './js/supabase.js',
  './js/auth.js',
  './js/app.js',
  './js/importar.js',
  './js/metricas.js',
  './favicon.svg',
  './icon.svg',
  './icon-maskable.svg',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE).catch((err) => console.warn('[SW] precache falhou', err))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Nunca cachear chamadas pro Supabase
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

  // Nunca cachear CDN dinâmico de módulos (fica no cache do browser mesmo)
  // mas também não interceptamos
  if (url.hostname === 'cdn.jsdelivr.net') return;

  // Só cacheamos same-origin
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((resp) => {
          if (resp && resp.ok && resp.type === 'basic') {
            cache.put(req, resp.clone()).catch(() => {});
          }
          return resp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
