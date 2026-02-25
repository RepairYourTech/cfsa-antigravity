---
name: push-notifications
description: Push notification implementation covering permission flows, deep linking, notification channels, APNs/FCM integration, and in-app notification management. Use when adding push notifications to mobile or web applications.
version: 1.0.0
---

# Push Notification Handling

Implement push notifications that respect user attention, drive meaningful engagement, and work reliably across platforms.

## Permission Request Timing

Never request notification permission on first launch. Users deny blanket permission requests at a rate above 50%. Instead, use a pre-permission prompt that explains the value.

| Timing | Approach | Conversion Rate |
|--------|----------|----------------|
| First launch | System prompt immediately | ~40% allow |
| After value moment | Pre-prompt explaining benefit, then system prompt | ~70% allow |
| Contextual | "Notify you when your order ships?" at checkout | ~80% allow |

```tsx
// Pre-permission prompt flow
function NotificationOptIn({ onAccept, onDecline }: NotificationOptInProps) {
  return (
    <View style={styles.container}>
      <BellIcon size={48} color="#6366f1" />
      <Text style={styles.title}>Stay in the loop</Text>
      <Text style={styles.body}>
        Get notified when your builds finish, teammates comment, or
        deployments go live. You can customize this anytime in Settings.
      </Text>
      <Button title="Enable Notifications" onPress={onAccept} />
      <Pressable onPress={onDecline}>
        <Text style={styles.skip}>Not now</Text>
      </Pressable>
    </View>
  );
}

// Only request system permission after user taps "Enable"
async function requestPermissionAfterOptIn(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
```

**Anti-pattern**: Requesting permission in `useEffect` on app launch with no context.
**Anti-pattern**: Not providing a way to enable notifications later if the user declined initially.

## Notification Channels (Android) and Categories (iOS)

Android 8+ requires notification channels. iOS supports categories for actionable notifications.

```typescript
// Android notification channels
import notifee, { AndroidImportance } from '@notifee/react-native';

async function createNotificationChannels() {
  await notifee.createChannelGroup({
    id: 'activity',
    name: 'Activity',
  });

  await notifee.createChannel({
    id: 'messages',
    name: 'Messages',
    description: 'Direct messages and mentions',
    importance: AndroidImportance.HIGH,
    groupId: 'activity',
    sound: 'message_sound',
    vibration: true,
    lights: true,
  });

  await notifee.createChannel({
    id: 'updates',
    name: 'Updates',
    description: 'Build status and deployment updates',
    importance: AndroidImportance.DEFAULT,
    groupId: 'activity',
  });

  await notifee.createChannel({
    id: 'marketing',
    name: 'Promotions',
    description: 'Feature announcements and tips',
    importance: AndroidImportance.LOW,
    groupId: 'activity',
  });
}
```

```typescript
// iOS notification categories with actions
import notifee, { IOSAuthorizationStatus } from '@notifee/react-native';

async function setupIOSCategories() {
  await notifee.setNotificationCategories([
    {
      id: 'message',
      actions: [
        {
          id: 'reply',
          title: 'Reply',
          input: true, // Inline text reply
        },
        {
          id: 'mark-read',
          title: 'Mark as Read',
        },
      ],
    },
    {
      id: 'build-status',
      actions: [
        {
          id: 'view-logs',
          title: 'View Logs',
          foreground: true, // Opens the app
        },
        {
          id: 'retry',
          title: 'Retry Build',
          destructive: false,
        },
      ],
    },
  ]);
}
```

**Rule**: Create channels at app startup, not when sending the first notification.
**Rule**: Users can disable individual channels. Check channel status before assuming delivery.

## Deep Linking from Notifications

Every notification that navigates the user must include structured deep link data.

```typescript
// Notification payload with deep link
interface NotificationData {
  type: 'message' | 'build' | 'comment' | 'invite';
  deepLink: string; // e.g., "myapp://builds/abc123/logs"
  entityId: string;
  entityType: string;
}

// Handle notification tap -- works for both foreground and background/killed states
import messaging from '@react-native-firebase/messaging';
import { Linking } from 'react-native';
import { navigationRef } from './navigation';

// App opened from killed state via notification
messaging().getInitialNotification().then((remoteMessage) => {
  if (remoteMessage?.data?.deepLink) {
    // Store for processing after navigation is ready
    pendingDeepLink = remoteMessage.data.deepLink as string;
  }
});

// App in background, notification tapped
messaging().onNotificationOpenedApp((remoteMessage) => {
  if (remoteMessage.data?.deepLink) {
    handleDeepLink(remoteMessage.data.deepLink as string);
  }
});

function handleDeepLink(url: string) {
  const parsed = parseDeepLink(url);

  switch (parsed.screen) {
    case 'builds':
      navigationRef.navigate('BuildDetail', { buildId: parsed.params.id });
      break;
    case 'messages':
      navigationRef.navigate('Conversation', { threadId: parsed.params.id });
      break;
    default:
      navigationRef.navigate('Home');
  }
}
```

**Anti-pattern**: Notifications that open the app but land on the home screen instead of the relevant content.
**Anti-pattern**: Deep links that crash if the user is not authenticated. Always check auth state first and redirect to login if needed.

## Badge Management

```typescript
// Badge count represents unread items across the app
import notifee from '@notifee/react-native';

async function updateBadgeCount(unreadCount: number) {
  // iOS: sets the app icon badge
  // Android: sets the badge on supported launchers
  await notifee.setBadgeCount(unreadCount);
}

// Clear badge when user opens the relevant screen
async function clearBadge() {
  await notifee.setBadgeCount(0);
}

// Server-side: include badge count in push payload
const pushPayload = {
  notification: {
    title: 'New message from Alex',
    body: 'Hey, can you review the PR?',
  },
  apns: {
    payload: {
      aps: {
        badge: totalUnreadCount, // Server tracks this
      },
    },
  },
};
```

**Rule**: Badge count must be managed server-side for accuracy. The server knows the true unread count.
**Rule**: Clear the badge when the user views the relevant content, not when the app opens.

## Silent / Background Notifications

Silent notifications wake the app in the background to perform work without showing anything to the user.

```typescript
// FCM data-only message (silent)
const silentPush = {
  data: {
    type: 'sync',
    syncTable: 'tasks',
    lastModified: '2026-02-16T12:00:00Z',
  },
  // No 'notification' key = silent on Android
  apns: {
    payload: {
      aps: {
        'content-available': 1, // Required for iOS background delivery
      },
    },
  },
  topic: 'com.example.myapp',
};

// Handle in background handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  if (remoteMessage.data?.type === 'sync') {
    await syncTable(remoteMessage.data.syncTable);
  }
});
```

**Rule**: iOS limits background execution to ~30 seconds. Keep background work minimal.
**Rule**: iOS will throttle silent notifications if the app does not demonstrate user engagement.

## Notification Grouping

```typescript
// Group notifications by thread/conversation
async function displayGroupedNotification(message: ChatMessage) {
  await notifee.displayNotification({
    title: message.senderName,
    body: message.text,
    android: {
      channelId: 'messages',
      groupId: `thread-${message.threadId}`,
      groupSummary: false,
    },
    ios: {
      threadId: `thread-${message.threadId}`,
      summaryArgument: message.senderName,
    },
  });

  // Android: create a summary notification for the group
  await notifee.displayNotification({
    title: `${unreadCount} new messages`,
    body: `From ${senderNames.join(', ')}`,
    android: {
      channelId: 'messages',
      groupId: `thread-${message.threadId}`,
      groupSummary: true, // This is the group header
      groupAlertBehavior: AndroidGroupAlertBehavior.CHILDREN,
    },
  });
}
```

## Rich Media Notifications

```typescript
// Notification with image
await notifee.displayNotification({
  title: 'Build #1234 deployed',
  body: 'Production deployment completed successfully',
  android: {
    channelId: 'updates',
    largeIcon: 'https://example.com/avatar.png',
    style: {
      type: AndroidStyle.BIGPICTURE,
      picture: 'https://example.com/deployment-preview.png',
    },
  },
  ios: {
    attachments: [
      {
        url: 'https://example.com/deployment-preview.png',
        thumbnailHidden: false,
      },
    ],
  },
});
```

## APNs vs FCM Differences

| Feature | APNs (iOS) | FCM (Android + iOS) |
|---------|-----------|---------------------|
| Protocol | HTTP/2 to Apple servers | HTTP v1 to Google servers |
| Auth | JWT or certificate-based | Service account (OAuth 2.0) |
| Payload limit | 4 KB | 4 KB |
| Silent push | `content-available: 1` in `aps` | Data-only message (no `notification` key) |
| Priority | 1-10 (`apns-priority` header) | `HIGH` or `NORMAL` |
| Token format | Hex string (device token) | Registration token (FCM token) |
| Feedback | HTTP response per push | FCM Diagnostics, BigQuery export |
| Token refresh | App delegate callback | `onTokenRefresh` listener |
| Grouping | `threadIdentifier` | `notification.tag` or `groupId` |

```typescript
// Server-side: sending via FCM Admin SDK (handles both platforms)
import { getMessaging } from 'firebase-admin/messaging';

async function sendPush(token: string, payload: PushPayload) {
  const message = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
    android: {
      priority: 'high' as const,
      notification: {
        channelId: payload.channelId,
        clickAction: 'OPEN_DEEP_LINK',
      },
    },
    apns: {
      payload: {
        aps: {
          badge: payload.badgeCount,
          sound: 'default',
          category: payload.category,
          threadId: payload.threadId,
        },
      },
    },
  };

  try {
    await getMessaging().send(message);
  } catch (error: unknown) {
    if (isTokenExpired(error)) {
      await removeDeviceToken(token);
    }
    throw error;
  }
}
```

## In-App Notification Center

Not all notifications are push notifications. Provide an in-app notification center for non-urgent updates.

```tsx
interface InAppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'action_required';
  title: string;
  body: string;
  deepLink?: string;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable onPress={markAllAsRead}>
            <Text style={styles.markAll}>Mark all as read</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            onPress={() => {
              markAsRead(item.id);
              if (item.deepLink) handleDeepLink(item.deepLink);
            }}
          />
        )}
        ListEmptyComponent={<EmptyState message="No notifications yet" />}
      />
    </View>
  );
}
```

## Notification Preferences UI

```tsx
interface NotificationPreferences {
  pushEnabled: boolean;
  channels: {
    messages: { push: boolean; inApp: boolean; email: boolean };
    builds: { push: boolean; inApp: boolean; email: boolean };
    mentions: { push: boolean; inApp: boolean; email: boolean };
    marketing: { push: boolean; inApp: boolean; email: boolean };
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
    timezone: string;
  };
}

function NotificationSettings() {
  const { preferences, updatePreference } = useNotificationPreferences();

  return (
    <ScrollView>
      <Section title="Delivery Methods">
        {Object.entries(preferences.channels).map(([channel, settings]) => (
          <ChannelRow
            key={channel}
            label={CHANNEL_LABELS[channel]}
            push={settings.push}
            inApp={settings.inApp}
            email={settings.email}
            onToggle={(method, value) =>
              updatePreference(`channels.${channel}.${method}`, value)
            }
          />
        ))}
      </Section>
      <Section title="Quiet Hours">
        <Toggle
          label="Do Not Disturb"
          value={preferences.quietHours.enabled}
          onToggle={(v) => updatePreference('quietHours.enabled', v)}
        />
        {preferences.quietHours.enabled && (
          <TimeRangePicker
            start={preferences.quietHours.start}
            end={preferences.quietHours.end}
            onChange={(start, end) => {
              updatePreference('quietHours.start', start);
              updatePreference('quietHours.end', end);
            }}
          />
        )}
      </Section>
    </ScrollView>
  );
}
```

## Output Checklist

- [ ] Permission requested after a value moment, not on first launch
- [ ] Pre-permission prompt explains specific value to the user
- [ ] Notification channels created at app startup (Android)
- [ ] Notification categories with actions configured (iOS)
- [ ] Every notification includes deep link data
- [ ] Deep links handle unauthenticated state gracefully
- [ ] Badge count managed server-side
- [ ] Silent notifications used for background sync
- [ ] Notifications grouped by thread or category
- [ ] In-app notification center for non-push updates
- [ ] Notification preferences UI with per-channel controls
- [ ] Quiet hours / Do Not Disturb support
- [ ] Expired device tokens removed from server
- [ ] Notification tap handling works from killed, background, and foreground states
