const CACHE_NAME = 'sjcl-file-encrypt-v1.2.0'; // Updated cache version
const urlsToCache = [
    '/pwa.sjcl/',
    '/pwa.sjcl/index.html',
    '/pwa.sjcl/offline.html',
    '/pwa.sjcl/style.css',
    '/pwa.sjcl/filehandledb.js',
    '/pwa.sjcl/sjcl.js',
    '/pwa.sjcl/app.js',
    '/pwa.sjcl/manifest.json',
    '/pwa.sjcl/images/icon-1024x1024.png'
];

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).catch(() => {
                    return caches.match('/pwa.sjcl/offline.html');
                });
            })
    );
});

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Cache aberto e recursos adicionados.');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Deletando cache antigo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
