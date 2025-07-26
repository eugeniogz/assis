const CACHE_NAME = 'financeiro-1.5.1'; // Nome do cache, pode ser alterado para forçar atualização
const urlsToCache = [
    '/pwa.financeiro/',
    '/pwa.financeiro/index.html',
    '/pwa.financeiro/offline.html',
    '/pwa.financeiro/style.css',
    '/pwa.financeiro/filehandledb.js',
    '/pwa.financeiro/sjcl.js',
    '/pwa.financeiro/app.js',
    '/pwa.financeiro/manifest.json',
    '/pwa.financeiro/piechart.js',
    '/pwa.financeiro/images/icon-1024x1024.svg'
];

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Se o recurso estiver no cache, retorne-o
                if (response) {
                    return response;
                }
                // Caso contrário, faça a requisição de rede
                return fetch(event.request).catch(() => {
                    // Fallback para páginas offline, se necessário
                    // Por exemplo, uma página offline genérica
                    return caches.match('/pwa.financeiro/offline.html');
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
            .then(() => self.skipWaiting()) // Adicione esta linha para ativar o novo SW mais rápido
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) { // Compara com o CACHE_NAME atual
                        console.log('Service Worker: Deletando cache antigo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Adicione esta linha para assumir o controle de clientes existentes
    );
});
