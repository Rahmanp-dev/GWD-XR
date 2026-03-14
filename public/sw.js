const CACHE_NAME = 'gwd-xr-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/favicon.ico',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Cache-first strategy for models and images, network-first for everything else
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Apply Cache-first for large static assets (3D models, images)
    if (url.pathname.startsWith('/models/') || url.pathname.startsWith('/images/')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // Network-first for initial pages, API routes, and JS/CSS chunks
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Ignore API calls from SW caching
                if (!url.pathname.startsWith('/api/')) {
                    const clonedResponse = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clonedResponse));
                }
                return networkResponse;
            })
            .catch(() => caches.match(event.request))
    );
});
