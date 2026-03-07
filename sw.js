/* ═══════════════════════════════════════════════════════
   EQUILIBRA — Service Worker v1.0
   Cache-first para funcionar offline
   ═══════════════════════════════════════════════════════ */

const CACHE = 'equilibra-v1';
const ASSETS = [
  '/equilibra/',
  '/equilibra/index.html',
  '/equilibra/manifest.json',
  '/equilibra/icon-192.png',
  '/equilibra/icon-512.png'
];

/* ── INSTALL: cacheia todos os assets essenciais ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: limpa caches antigos ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: cache-first, fallback network ── */
self.addEventListener('fetch', e => {
  // Ignora requests que não são GET
  if (e.request.method !== 'GET') return;

  // Ignora extensões externas (fonts, chart.js CDN) — deixa ir à rede
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response('', { status: 503, statusText: 'Offline' })
      )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cacheia respostas válidas do próprio domínio
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback: serve o index.html
        return caches.match('/equilibra/index.html');
      });
    })
  );
});
