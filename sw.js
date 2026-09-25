// WIMPS Service Worker - Cache static assets for offline support
const CACHE_NAME = 'wimps-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/mtn.html',
  '/telecel.html',
  '/atgo.html',
  '/checkers.html',
  '/history.html',
  '/account.html',
  '/login-page.html',
  '/wimp-rewards.html',
  '/wimp-spend.html',
  '/wimp-earn.html',
  '/home-page.css',
  '/responsive.css',
  '/footer.css',
  '/login-page.css',
  '/about.css',
  '/account.css',
  '/mtn.css',
  '/telecel.css',
  '/atgo.css',
  '/checkers.css',
  '/history.css',
  '/wimp-rewards.css',
  '/nav.js',
  '/home-page.js',
  '/footer.js',
  '/config.js',
  '/account.js',
  '/login-page.js',
  '/history.js',
  '/phone-validation.js',
  '/mtn.js',
  '/telecel.js',
  '/atgo.js',
  '/checkers.js',
  '/wimp-rewards.js',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/browserconfig.xml',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://js.paystack.co/v1/inline.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { credentials: 'same-origin' })))
          .catch(err => console.log('Some assets failed to cache:', err));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests that aren't in our static assets
  if (url.origin !== location.origin && !STATIC_ASSETS.includes(request.url)) {
    return;
  }

  // Network first for API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache error responses
          if (!response.ok) return response;
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache first for static assets
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update in background
          event.waitUntil(
            fetch(request)
              .then((response) => {
                if (response.ok) {
                  caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
                }
              })
              .catch(() => {})
          );
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            if (!response.ok) return response;
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New update from WIMPS',
    icon: '/assets/icon-192.png',
    badge: '/assets/badge-72.png',
    vibrate: [100, 50, 100],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'WIMPS', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const targetUrl = event.notification.data || '/';
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});