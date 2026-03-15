---
name: fcm
description: "Firebase Cloud Messaging patterns covering push notification setup, topic messaging, data messages, notification payloads, service worker handling, and multicast sending. Use when implementing push notifications with FCM."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# Firebase Cloud Messaging (FCM)

Push notification service for web, Android, and iOS. Send targeted notifications via device tokens, topics, or conditions with customizable payloads.

## When to Use

- Sending push notifications to web browsers or mobile apps
- Need topic-based pub/sub for notification channels
- Using Firebase ecosystem (Auth, Firestore, etc.)
- Need cross-platform push (web + Android + iOS)

## When NOT to Use

- Sending email or SMS (use SendGrid, Twilio)
- In-app real-time messaging (use WebSockets or Firestore)
- Need guaranteed delivery for critical alerts (FCM is best-effort)

## Setup

### Server SDK (Firebase Admin)

```bash
npm install firebase-admin
```

```typescript
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const messaging = admin.messaging();
```

### Web Client Setup

```typescript
// firebase-messaging-sw.js (Service Worker)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  messagingSenderId: 'your-sender-id',
  appId: 'your-app-id',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification ?? {};
  self.registration.showNotification(title ?? 'Notification', {
    body,
    icon: icon ?? '/icon-192.png',
  });
});
```

```typescript
// Client-side: request permission and get token
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const messaging = getMessaging();

async function requestNotificationPermission(): Promise<string | null> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  // Save token to your server
  await fetch('/api/push/register', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });

  return token;
}

// Handle foreground messages
onMessage(messaging, (payload) => {
  console.log('Foreground message:', payload);
  // Show in-app notification UI
});
```

## Send Notifications

### To Single Device

```typescript
await messaging.send({
  token: deviceToken,
  notification: {
    title: 'Order Shipped',
    body: 'Your order #1234 has been shipped!',
    imageUrl: 'https://example.com/order-shipped.png',
  },
  data: {
    orderId: '1234',
    type: 'order_update',
    url: '/orders/1234',
  },
  webpush: {
    fcmOptions: { link: 'https://example.com/orders/1234' },
  },
});
```

### To Multiple Devices (Multicast)

```typescript
const response = await messaging.sendEachForMulticast({
  tokens: deviceTokens, // Up to 500 tokens
  notification: {
    title: 'New Feature Available',
    body: 'Check out our new dashboard!',
  },
});

// Handle failures
response.responses.forEach((resp, i) => {
  if (!resp.success) {
    const failedToken = deviceTokens[i];
    if (resp.error?.code === 'messaging/registration-token-not-registered') {
      removeStaleToken(failedToken); // Token expired, clean up
    }
  }
});
```

### Topic Messaging

```typescript
// Subscribe device to topic (server-side)
await messaging.subscribeToTopic(deviceTokens, 'news-updates');

// Send to all subscribers of a topic
await messaging.send({
  topic: 'news-updates',
  notification: { title: 'Breaking News', body: 'Important update...' },
});

// Condition-based targeting
await messaging.send({
  condition: "'news-updates' in topics && !('muted' in topics)",
  notification: { title: 'News', body: 'For unmuted news subscribers' },
});
```

## Data-Only Messages (Silent Push)

```typescript
// No notification shown — app processes data in background
await messaging.send({
  token: deviceToken,
  data: {
    type: 'sync_required',
    resource: 'conversations',
    timestamp: Date.now().toString(),
  },
  // Android: set priority for background delivery
  android: { priority: 'high' },
  // APNs: required for background delivery on iOS
  apns: {
    headers: { 'apns-priority': '10' },
    payload: { aps: { contentAvailable: true } },
  },
});
```

## Token Management

```typescript
// API route to register/update tokens
export async function POST(request: Request) {
  const { userId, token, platform } = await request.json();

  await db.pushTokens.upsert({
    where: { token },
    create: { userId, token, platform, createdAt: new Date() },
    update: { userId, updatedAt: new Date() },
  });

  return new Response('OK');
}

// Clean up stale tokens
async function cleanStaleTokens() {
  const tokens = await db.pushTokens.findMany();
  const results = await messaging.sendEachForMulticast({
    tokens: tokens.map(t => t.token),
    data: { type: 'ping' }, // Dry run
  });

  const staleTokens = tokens.filter((_, i) => !results.responses[i].success);
  await db.pushTokens.deleteMany({ where: { token: { in: staleTokens.map(t => t.token) } } });
}
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Store device tokens without a user association | Link tokens to user IDs for targeted messaging |
| Ignore `registration-token-not-registered` errors | Remove stale tokens to keep your token list clean |
| Send notifications without user consent | Request permission explicitly, respect denials |
| Put sensitive data in notification payload | Notification payloads are visible — use data messages for secrets |
| Use `sendAll` (deprecated) | Use `sendEachForMulticast` for batch sends |
| Hardcode VAPID keys in client code | Use environment variables for VAPID and project config |
| Skip the service worker for web push | `firebase-messaging-sw.js` is required for background web messages |
| Trust device tokens indefinitely | Tokens rotate — implement refresh and cleanup logic |
