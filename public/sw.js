// Service Worker for C Profit PWA
const CACHE_NAME = 'c-profit-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/c-profit.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Push notification listener
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'C Profit';
    const options = {
      body: data.body || 'Nova notificação do C Profit',
      icon: data.icon || '/c-profit.png',
      badge: data.badge || '/icon-192.png',
      data: data.data || { url: '/' },
      vibrate: [100, 50, 100],
      tag: data.tag || 'c-profit-notification',
      renotify: true,
      requireInteraction: data.requireInteraction || false
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('C Profit', {
        body: text,
        icon: '/c-profit.png'
      })
    );
  }
});

// Notification click listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (event.notification.data?.tab) {
            client.postMessage({ type: 'NAVIGATE_TAB', tab: event.notification.data.tab });
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
