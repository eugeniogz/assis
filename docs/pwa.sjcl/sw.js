const CACHE_NAME = 'sjcl-file-encrypt-v1.3.0'; // Nova versão para invalidar cache antigo
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

// Instalação do Service Worker
self.addEventListener('install', event => {
    self.skipWaiting(); // Força o novo Service Worker a ativar imediatamente
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Cacheando recursos essenciais.');
                return cache.addAll(urlsToCache);
            })
    );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Removendo cache antigo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Assume o controle de todas as abas abertas imediatamente
    );
});

// Estratégia Network First (Rede Primeiro, com fallback para o Cache offline)
// Isso garante que ao clicar no link você sempre veja a versão mais recente do servidor,
// mas ainda funcione perfeitamente se estiver sem internet (offline).
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Se a resposta da rede for válida, atualiza o cache em segundo plano
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Se estiver sem rede/offline, busca do cache
                return caches.match(event.request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Fallback para requisições de página offline
                        if (event.request.mode === 'navigate') {
                            return caches.match('/pwa.sjcl/offline.html');
                        }
                    });
            })
    );
});
