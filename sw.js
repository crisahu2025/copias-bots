// ============================================================
// SERVICE WORKER v36 — COPIAS BOTS PWA
// ============================================================

const CACHE_NAME = 'copias-bots-cache-v36';

const STATIC_ASSETS = [
  './index.html',
  './calculadora.html',
  './encargar.html',
  './estado-pedido.html',
  './login.html',
  './dashboard.html',
  './css/style.css',
  './js/config.js',
  './js/app.js',
  './js/pwa.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './img/logo.jpg'
];

// 1. Instalación: cachear archivos estáticos
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forzar activación inmediata
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          fetch(url)
            .then((response) => {
              if (response.ok) return cache.put(url, response);
            })
            .catch((err) => console.warn('[SW] No se pudo cachear:', url, err))
        )
      );
    })
  );
});

// 2. Activación: borrar cachés viejas y tomar control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Borrando caché anterior:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Manejo de Fetch:
// - Para navegación (páginas HTML): Network First (carga la red directo; si no hay red, usa caché)
// - Para assets estáticos: Stale While Revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo peticiones GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignorar APIs externas (Google Apps Script, Telegram, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navegación (HTML pages) -> Network First
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            return cached || caches.match('./index.html') || caches.match('index.html');
          });
        })
    );
    return;
  }

  // Assets estáticos (CSS, JS, imágenes) -> Cache First con fallback a red
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // En segundo plano actualiza el caché
        fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }
      return fetch(req);
    })
  );
});
