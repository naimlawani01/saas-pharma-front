const CACHE_NAME = 'pharmacie-manager-cache-v1';
// Liste minimale pour éviter les échecs d'installation.
// Les assets fingerprintés (Vite) seront mis en cache à la volée via le handler fetch.
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(ASSETS_TO_CACHE);
    } catch (err) {
      // Ne pas bloquer l'installation si une ressource échoue (utile en dev ou hors ligne).
      console.warn('[SW] addAll failed, continuing without blocking install:', err);
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorer les schémas non supportés (chrome-extension, data, blob, etc.)
  const url = new URL(request.url);
  if (!['http:', 'https:'].includes(url.protocol)) {
    return; // Laisser passer sans mise en cache
  }
  
  // Ignorer les requêtes API (elles ne doivent pas être mises en cache)
  if (url.pathname.startsWith('/api/')) {
    return; // Laisser passer sans mise en cache
  }

  event.respondWith((async () => {
    try {
      // Essayer d'abord le cache
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
      
      // Si pas en cache, faire la requête réseau
      const response = await fetch(request);
      
      // Vérifier que la réponse est valide avant de la mettre en cache
      if (response && response.status === 200 && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        // Cloner la réponse car elle ne peut être utilisée qu'une fois
        cache.put(request, response.clone()).catch(err => {
          // Ignorer les erreurs de mise en cache (peut arriver avec certains types de requêtes)
          console.warn('[SW] Failed to cache:', request.url, err);
        });
      }
      
      return response;
    } catch (err) {
      // En cas d'échec réseau, essayer le cache
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
      // Si pas de cache, laisser l'erreur se propager
      throw err;
    }
  })());
});

