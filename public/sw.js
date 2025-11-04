// Enhanced Service Worker for EchoChat PWA - Advanced Offline Support
const CACHE_VERSION = 'v2.1.1';
const CACHE_NAME = `echochat-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const IMAGE_CACHE = `${CACHE_NAME}-images`;
const API_CACHE = `${CACHE_NAME}-api`;

// Assets to cache immediately on install
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/default-avatar.png'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE && 
                cacheName !== API_CACHE &&
                cacheName.startsWith('echochat-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        // Claim clients - handle errors gracefully
        if (self.clients && self.clients.claim) {
          return self.clients.claim().catch((error) => {
            // Only log if it's not the expected "only active worker can claim" error
            if (!error.message.includes('Only the active worker')) {
              console.warn('[SW] Could not claim clients:', error.message);
            }
            // Return resolved promise to continue activation
            return Promise.resolve();
          });
        }
        return Promise.resolve();
      })
  );
});

// Determine cache strategy based on request
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // JavaScript and CSS files - network first to ensure fresh code
  if (url.pathname.match(/\.(js|css)$/i) || 
      url.pathname.startsWith('/assets/')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // Icons and manifest - cache first (these don't change often)
  if (url.pathname.startsWith('/icons/') || 
      url.pathname === '/manifest.json') {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // Images - stale while revalidate
  if (request.destination === 'image' || 
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // API calls - network first with cache fallback
  if (url.pathname.startsWith('/api/') || 
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // HTML pages - network first
  if (request.mode === 'navigate') {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // Default - network first
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return cached version even if stale
    return cached || new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Update cache with fresh response
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    // Return offline response
    return new Response('Offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Fetch fresh version in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);
  
  // Return cached version immediately if available
  return cached || fetchPromise || new Response('Offline', { status: 503 });
}

// Fetch event - intelligent caching
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // Skip Chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip Vite dev server requests
  if (url.hostname === 'localhost' && url.port === '5173') {
    return;
  }
  
  const strategy = getCacheStrategy(event.request);
  let cacheName = DYNAMIC_CACHE;
  
  // Choose appropriate cache
  if (event.request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    cacheName = IMAGE_CACHE;
  } else if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    cacheName = API_CACHE;
  } else if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/assets/')) {
    cacheName = STATIC_CACHE;
  }
  
  event.respondWith(
    (async () => {
      try {
        switch (strategy) {
          case CACHE_STRATEGIES.CACHE_FIRST:
            return await cacheFirst(event.request, cacheName);
          case CACHE_STRATEGIES.NETWORK_FIRST:
            return await networkFirst(event.request, cacheName);
          case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
            return await staleWhileRevalidate(event.request, cacheName);
          default:
            return await networkFirst(event.request, cacheName);
        }
      } catch (error) {
        console.error('[SW] Fetch error:', error);
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          const offlinePage = await caches.match('/');
          if (offlinePage) return offlinePage;
        }
        return new Response('Offline', { 
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

// Background sync for offline message sending
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'send-messages') {
    event.waitUntil(sendOfflineMessages());
  } else if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Send offline messages when connection is restored
async function sendOfflineMessages() {
  try {
    const offlineMessages = await getOfflineMessages();
    console.log(`[SW] Sending ${offlineMessages.length} offline messages`);
    
    for (const message of offlineMessages) {
      try {
        await sendMessageToServer(message);
        await removeOfflineMessage(message.id);
        console.log('[SW] Offline message sent:', message.id);
      } catch (error) {
        console.error('[SW] Error sending offline message:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Error processing offline messages:', error);
  }
}

// Sync messages periodically
async function syncMessages() {
  try {
    console.log('[SW] Syncing messages in background...');
    // Notify all clients to sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_MESSAGES' });
    });
  } catch (error) {
    console.error('[SW] Error syncing messages:', error);
  }
}

// Get offline messages from IndexedDB
async function getOfflineMessages() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EchoChatDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offlineMessages')) {
        resolve([]);
        return;
      }
      const transaction = db.transaction(['offlineMessages'], 'readonly');
      const store = transaction.objectStore('offlineMessages');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offlineMessages')) {
        db.createObjectStore('offlineMessages', { keyPath: 'id' });
      }
    };
  });
}

// Send message to server (Firebase)
async function sendMessageToServer(message) {
  // This will be called when connection is restored
  // In production, this would integrate with Firebase
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
  
  if (!response.ok) {
    throw new Error('Failed to send message');
  }
  
  return response.json();
}

// Remove offline message from IndexedDB
async function removeOfflineMessage(messageId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EchoChatDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlineMessages'], 'readwrite');
      const store = transaction.objectStore('offlineMessages');
      const deleteRequest = store.delete(messageId);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Push notification handling (Firebase Cloud Messaging)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  let notificationData = {
    title: 'EchoChat',
    body: 'You have a new message',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'echochat-message',
    requireInteraction: false,
    data: {}
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.notification?.title || data.title || notificationData.title,
        body: data.notification?.body || data.body || notificationData.body,
        icon: data.notification?.icon || notificationData.icon,
        badge: data.notification?.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: data.data || data
      };
    } catch (error) {
      // Try text parsing
      try {
        const text = event.data.text();
        notificationData.body = text;
      } catch (e) {
        console.error('[SW] Error parsing push data:', error);
      }
    }
  }
  
  const options = {
    ...notificationData,
    actions: [
      {
        action: 'open',
        title: 'Open EchoChat',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (let client of clientList) {
            if (client.url === '/' && 'focus' in client) {
              return client.focus();
            }
          }
          // If not, open a new window
          if (clients.openWindow) {
            const url = event.notification.data?.url || '/';
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          return cache.addAll(event.data.urls);
        })
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
  
  // Reply to client
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({ success: true });
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Handle app updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
    console.log('[SW] Update available, reloading...');
    self.skipWaiting().then(() => {
      return clients.matchAll().then((clients) => {
        clients.forEach(client => {
          client.postMessage({ type: 'RELOAD' });
        });
      });
    });
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

console.log('[SW] EchoChat Enhanced Service Worker loaded v' + CACHE_VERSION);

