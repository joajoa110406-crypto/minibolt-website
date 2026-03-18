/* eslint-disable no-restricted-globals */
/**
 * MiniBolt Service Worker
 * - 오프라인 캐싱 (관리자 페이지)
 * - 푸시 알림 핸들링
 *
 * Cache versioning: bump CACHE_VERSION when static assets change.
 * Old caches are automatically deleted on activation.
 */
const CACHE_VERSION = 2;
const CACHE_PREFIX = 'minibolt-v';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

const STATIC_ASSETS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ──── Install: precache static assets ────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ──── Activate: clean ALL old caches ────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ──── Fetch handler ────
// IMPORTANT: Do NOT intercept navigation requests (mode === 'navigate')
// to avoid slowing down page transitions in a Next.js SPA.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Never intercept navigation requests — let the browser/Next.js handle them directly
  if (request.mode === 'navigate') return;

  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip Toss Payments and other payment-related URLs
  if (url.pathname.startsWith('/api/payment')) return;

  // API: network-only (no caching) — API responses change frequently
  // and caching them can cause stale data issues
  if (url.pathname.startsWith('/api/')) return;

  // Admin pages: network-first with cache fallback (offline support)
  if (url.pathname.startsWith('/admin')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (icons, Next.js static bundles): cache-first
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // All other requests: pass through to network (no interception)
});

// ──── Push Notification Handler ────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: '미니볼트', body: event.data.text() };
  }

  const { title, body, icon, badge, url, tag } = payload;

  event.waitUntil(
    self.registration.showNotification(title || '미니볼트', {
      body: body || '',
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-192x192.png',
      tag: tag || 'minibolt-default',
      data: { url: url || '/admin' },
      vibrate: [200, 100, 200],
      requireInteraction: true,
    })
  );
});

// ──── Notification Click Handler ────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname.startsWith(targetUrl) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        } catch {
          // URL 파싱 실패 시 무시
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
