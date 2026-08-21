// ============================================================================
// SERVICE WORKER PWA - DISK ENTREGA OFFLINE-FIRST
// Estratégia de Cache e Sincronização em Segundo Plano para Entregadores
// ============================================================================

const CACHE_NAME = 'disk-entrega-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css',
  '/manifest.json'
];

// 1. INSTALAÇÃO: Armazena o Shell da Aplicação no Cache do Navegador
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-carregando arquivos estáticos para uso Offline');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] Falha ao pré-carregar alguns assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. ATIVAÇÃO: Limpa versões antigas de caches se houver atualização
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH INTERCEPTION: Network-First com Fallback para Cache e IndexedDB
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não interceptar requisições não-GET (as baixas offline vão para o IndexedDB)
  if (event.request.method !== 'GET') {
    return;
  }

  // Requisições da API de Carga de Entregador: Network-First com Cache Fallback
  if (url.pathname.includes('/api/entregador/') && url.pathname.includes('/carga')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          console.log('[Service Worker] Sem rede: buscando carga de pedidos do cache');
          return caches.match(event.request);
        })
    );
    return;
  }

  // Demais arquivos e SPA HTML: Cache-First / Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Busca atualização em segundo plano (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).catch((err) => {
        // Se for navegação HTML e estiver offline, retorna o index.html em cache
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw err;
      });
    })
  );
});

// 4. BACKGROUND SYNC: Disparado pelo navegador quando a rede é restabelecida
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-baixas-entregador') {
    console.log('[Service Worker] Evento de Background Sync disparado! Notificando clientes...');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
        });
      })
    );
  }
});

// 5. PUSH NOTIFICATIONS: Notificações Push em Segundo Plano (Supabase / Web Push)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Notificação Push recebida:', event);
  let data = {
    title: '🔔 Novo Pedido Atribuído!',
    body: 'Você recebeu um novo pedido na sua rota de entregas.',
    pedidoId: null,
    prioridade: 'ALTA',
    acoes: [
      { action: 'abrir', title: '👀 Ver Pedido' },
      { action: 'fechar', title: '✕ Dispensar' }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || data.corpo,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `pedido-${data.pedidoId || Date.now()}`,
    vibrate: [300, 100, 300, 100, 400],
    data: {
      url: data.url || '/?tab=entregador',
      pedidoId: data.pedidoId,
      timestamp: new Date().toISOString()
    },
    actions: data.acoes || [
      { action: 'abrir', title: '👀 Ver Rota' },
      { action: 'fechar', title: '✕ Fechar' }
    ],
    requireInteraction: data.prioridade === 'URGENTE',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || data.titulo || '🔔 Logi-Gás: Novo Pedido', options).then(() => {
      // Notifica todas as janelas abertas do PWA
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            payload: data
          });
        });
      });
    })
  );
});

// 6. NOTIFICATION CLICK: Ao clicar na notificação, abre o app na tela do entregador
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'fechar') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já houver uma aba aberta, foca nela
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NAVIGATE_TO_PEDIDO',
            pedidoId: event.notification.data?.pedidoId
          });
          return client.focus();
        }
      }
      // Se nenhuma aba estiver aberta, abre uma nova
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
