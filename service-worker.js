// service-worker.js
const CACHE_NAME = 'planovac-sluzeb-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/modules/storage.js',
    '/modules/employees.js',
    '/modules/shifts.js',
    '/modules/rules.js',
    '/manifest.json',
    '/icons/icon-72x72.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    'https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css'
];

// Instalace Service Workeru
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache otevřena');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((error) => {
                console.error('Chyba při cachování:', error);
            })
    );
});

// Aktivace Service Workeru
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Smazání starých cachí
                    if (cacheName !== CACHE_NAME) {
                        console.log('Mažu starou cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Zachycení požadavků
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - vraťme odpověď z cache
                if (response) {
                    return response;
                }

                // Kopie požadavku, protože požadavek je stream a může být použit pouze jednou
                const fetchRequest = event.request.clone();

                // Získání dat ze sítě
                return fetch(fetchRequest)
                    .then((response) => {
                        // Kontrola, zda jsme dostali validní odpověď
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Kopie odpovědi, protože odpověď je stream a může být použita pouze jednou
                        const responseToCache = response.clone();

                        // Přidání odpovědi do cache
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    });
            })
    );
});

// Offline fallback
self.addEventListener('fetch', (event) => {
    if (!navigator.onLine) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) {
                        return response;
                    }
                    // Pokud nemáme cache, vrátíme offline stránku
                    return caches.match('/offline.html');
                })
        );
    }
});

// Aktualizace cache při nové verzi
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
