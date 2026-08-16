---
name: offline-first-pwa
description: "Build Progressive Web Apps with offline-first architecture, service workers, cache strategies, background sync, push notifications, and IndexedDB persistence. Use when adding PWA features, offline support, or installable web app capabilities."
version: 1.0.0
---

# Offline-First PWA

Build web applications that work reliably regardless of network conditions. Progressive Web Apps combine the reach of the web with the capabilities of native apps.

## Web App Manifest

The manifest defines how the app appears when installed on a device.

```json
{
  "name": "My Application",
  "short_name": "MyApp",
  "description": "A brief description of what the app does",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/desktop.png", "sizes": "1280x720", "type": "image/png", "form_factor": "wide" },
    { "src": "/screenshots/mobile.png", "sizes": "750x1334", "type": "image/png", "form_factor": "narrow" }
  ],
  "categories": ["productivity"],
  "prefer_related_applications": false
}
```

**Link in HTML:**
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#1a1a2e" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

### Display Modes

| Mode | Behavior |
|------|----------|
| `standalone` | Looks like a native app (no browser chrome). Most common. |
| `fullscreen` | No browser chrome, no system status bar. For games/immersive. |
| `minimal-ui` | Standalone with minimal browser controls. |
| `browser` | Normal browser tab. Not recommended for PWA. |

---

## Service Worker Lifecycle

### Registration

```typescript
// src/lib/register-sw.ts
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          // New version available --- notify the user
          showUpdateNotification();
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}
```

### Service Worker Structure

```typescript
// public/sw.js
const CACHE_NAME = 'app-v1';
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/styles/main.css',
  '/scripts/main.js',
  '/icons/icon-192.png',
];

// INSTALL: precache essential assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

// ACTIVATE: clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// FETCH: serve from cache or network
self.addEventListener('fetch', (event: FetchEvent) => {
  // Handle fetch with chosen strategy (see next section)
});
```

---

## Cache Strategies

### Cache First (Static Assets)

Best for versioned assets that rarely change (images, fonts, CSS/JS bundles).

```typescript
// Cache first, fall back to network
self.addEventListener('fetch', (event: FetchEvent) => {
  if (isStaticAsset(event.request.url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
  }
});

function isStaticAsset(url: string): boolean {
  return /\.(js|css|png|jpg|webp|avif|woff2|svg)$/.test(url);
}
```

### Network First (API Data)

Best for data that must be fresh when online but can fall back to cached data offline.

```typescript
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    // Cache the fresh response
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    // Network failed, try cache
    const cached = await caches.match(request);
    if (cached) return cached;
    // Nothing in cache either --- return offline fallback
    return caches.match('/offline.html') as Promise<Response>;
  }
}
```

### Stale-While-Revalidate (Semi-Fresh Content)

Best for content that can be slightly stale (blog posts, user profiles, catalogs).

```typescript
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch fresh version in the background
  const networkPromise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  });

  // Return cached immediately if available, otherwise wait for network
  return cached || networkPromise;
}
```

### Strategy Decision Table

| Content Type | Strategy | Why |
|-------------|----------|-----|
| App shell (HTML layout) | Cache first | Instant load, update in background |
| Static assets (JS, CSS, fonts) | Cache first | Versioned via filename hash |
| API data (user-specific) | Network first | Must be fresh, offline fallback |
| API data (public/catalog) | Stale-while-revalidate | Fast display, refresh in background |
| Images (user uploads) | Cache first | Immutable once uploaded |
| Page navigation | Network first | HTML should be fresh |

---

## Install Prompts

```typescript
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (event: BeforeInstallPromptEvent) => {
  // Prevent the browser's default mini-infobar
  event.preventDefault();
  deferredPrompt = event;
  showInstallButton();
});

async function handleInstallClick(): Promise<void> {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === 'accepted') {
    console.log('User accepted install');
  } else {
    console.log('User dismissed install');
  }

  deferredPrompt = null;
  hideInstallButton();
}

// Detect if already installed
window.addEventListener('appinstalled', () => {
  hideInstallButton();
  deferredPrompt = null;
});

// Check if running as installed PWA
function isInstalledPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true; // iOS Safari
}
```

---

## Background Sync

Queue actions taken offline and replay them when connectivity returns.

```typescript
// In the main app: register a sync
async function saveFormOffline(data: FormData): Promise<void> {
  // Save to IndexedDB
  await saveToQueue('form-submissions', data);

  // Register background sync
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register('sync-forms');
}

// In service worker: handle the sync event
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(replayFormSubmissions());
  }
});

async function replayFormSubmissions(): Promise<void> {
  const queue = await getQueue('form-submissions');

  for (const item of queue) {
    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      await removeFromQueue('form-submissions', item.id);
    } catch {
      // Will retry on next sync event
      throw new Error('Sync failed, will retry');
    }
  }
}
```

---

## Push Notifications

### Subscription

```typescript
async function subscribeToPush(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;

  // Check permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true, // Required by browsers
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Send subscription to your server
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

  return subscription;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}
```

### Display and Click Handling (Service Worker)

```typescript
// Handle incoming push
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() ?? {};

  const options: NotificationOptions = {
    body: data.body ?? 'You have a new notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: data.url ?? '/' },
    actions: data.actions ?? [],
    tag: data.tag, // Replaces existing notification with same tag
    renotify: !!data.tag, // Vibrate again even if replacing
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Notification', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if already open
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
```

---

## IndexedDB for Local Persistence

```typescript
// src/lib/db.ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface AppDB extends DBSchema {
  'offline-queue': {
    key: string;
    value: {
      id: string;
      type: string;
      data: unknown;
      createdAt: number;
      retryCount: number;
    };
    indexes: { 'by-type': string };
  };
  'cached-data': {
    key: string;
    value: {
      key: string;
      data: unknown;
      expiresAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<AppDB>>;

export function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>('app-db', 1, {
      upgrade(db) {
        const queue = db.createObjectStore('offline-queue', { keyPath: 'id' });
        queue.createIndex('by-type', 'type');

        db.createObjectStore('cached-data', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

// Queue operations
export async function enqueue(type: string, data: unknown): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.put('offline-queue', { id, type, data, createdAt: Date.now(), retryCount: 0 });
  return id;
}

export async function dequeue(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('offline-queue', id);
}

export async function getQueueByType(type: string): Promise<AppDB['offline-queue']['value'][]> {
  const db = await getDB();
  return db.getAllFromIndex('offline-queue', 'by-type', type);
}
```

---

## Update Flow

### "New Version Available" Prompt

```tsx
function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    async function checkForUpdate() {
      const registration = await navigator.serviceWorker?.ready;
      if (!registration) return;

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowPrompt(true);
          }
        });
      });
    }

    checkForUpdate();
  }, []);

  function handleUpdate() {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
    // Reload once the new worker takes over
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  if (!showPrompt) return null;

  return (
    <div role="alert" className="update-banner">
      <p>A new version is available.</p>
      <button onClick={handleUpdate}>Update now</button>
      <button onClick={() => setShowPrompt(false)} aria-label="Dismiss update notification">
        Later
      </button>
    </div>
  );
}
```

**In the service worker:**
```typescript
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

---

## Workbox Patterns

[Workbox](https://developer.chrome.com/docs/workbox/) simplifies service worker development with tested, production-ready modules.

```typescript
// sw.ts (compiled with workbox-cli or webpack plugin)
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precache app shell (injected by build tool)
precacheAndRoute(self.__WB_MANIFEST);

// Static assets: cache first
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// API data: network first with cache fallback
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-data',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);

// Page navigations: network first
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new ExpirationPlugin({ maxEntries: 25 }),
    ],
  })
);

// Background sync for form submissions
const bgSyncPlugin = new BackgroundSyncPlugin('form-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
});

registerRoute(
  ({ url }) => url.pathname === '/api/submit',
  new NetworkFirst({ plugins: [bgSyncPlugin] }),
  'POST'
);
```

---

## Offline UI Patterns

### Online/Offline Indicator

```tsx
function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div role="status" aria-live="polite" className="offline-banner">
      You are offline. Some features may be unavailable.
    </div>
  );
}
```

### Queued Actions Display

```tsx
function PendingActions() {
  const [pending, setPending] = useState<QueueItem[]>([]);

  return pending.length > 0 ? (
    <div role="status" aria-live="polite" className="pending-actions">
      <p>{pending.length} action{pending.length > 1 ? 's' : ''} will sync when you are back online.</p>
    </div>
  ) : null;
}
```

---

## Debugging Service Workers

| Tool | Purpose |
|------|---------|
| Chrome DevTools > Application > Service Workers | View registration, state, lifecycle events |
| Chrome DevTools > Application > Cache Storage | Inspect cached assets |
| Chrome DevTools > Application > IndexedDB | Inspect local data |
| chrome://serviceworker-internals | Low-level SW debugging |
| Lighthouse PWA audit | Full PWA compliance check |
| `navigator.serviceWorker.controller` | Verify which SW is controlling the page |

**Force update during development:**
```typescript
// In DevTools console
navigator.serviceWorker.getRegistration().then((reg) => reg?.unregister());
caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
```

## References

- [web.dev: Progressive Web Apps](https://web.dev/progressive-web-apps/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Service Worker API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest (MDN)](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [idb library](https://github.com/jakearchibald/idb)
- [Push API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
