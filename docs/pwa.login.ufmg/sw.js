// Nome do cache para armazenar os arquivos do PWA
const CACHE_NAME = 'ufmg-login-pwa-v1';
// Lista de arquivos para cachear durante a instalação
const urlsToCache = [
  '/', // A raiz do seu site (index.html)
  '/index.html',
  '/manifest.json',
  '/sw.js'
  // Adicione aqui os caminhos para seus ícones se eles não estiverem na raiz
  // Ex: '/caminho/para/seu/icone-192x192.png',
  // Ex: '/caminho/para/seu/icone-512x512.png'
];

// Evento de instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Evento de instalação.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aberto.');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Falha ao cachear arquivos durante a instalação:', error);
      })
  );
});

// Evento de fetch (intercepta requisições de rede)
self.addEventListener('fetch', (event) => {
  // Para este PWA simples, apenas servimos os arquivos cacheados se existirem.
  // A lógica principal de navegação é tratada pelo `start_url` no manifest.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna o recurso do cache se encontrado, senão faz a requisição de rede
        return response || fetch(event.request);
      })
      .catch((error) => {
        console.error('Service Worker: Erro no fetch:', error);
        // Opcional: retornar uma página offline se a requisição falhar e não houver cache
        // return caches.match('/offline.html');
      })
  );
});

// Evento de ativação do Service Worker (limpa caches antigos)
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Evento de ativação.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});