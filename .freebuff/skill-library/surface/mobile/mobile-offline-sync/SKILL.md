---
name: mobile-offline-sync
description: Offline-first data synchronization for mobile apps covering conflict resolution, optimistic UI, local databases, background sync, and network-aware degradation. Use when building mobile features that must work without connectivity.
version: 1.0.0
---

# Mobile Offline Sync

Build mobile applications that work reliably without network connectivity and synchronize seamlessly when reconnected.

## Conflict Resolution Strategies

When multiple clients modify the same record offline, conflicts are inevitable. Choose a strategy based on data semantics.

| Strategy | How It Works | Best For | Risk |
|----------|-------------|----------|------|
| Last-Write-Wins (LWW) | Highest timestamp wins | User preferences, non-critical data | Silent data loss |
| Field-Level Merge | Merge non-conflicting field changes | Profile data, settings | Complex implementation |
| CRDTs | Mathematically guaranteed convergence | Counters, sets, collaborative text | Large metadata overhead |
| Manual Merge | Present both versions to user | Documents, critical business data | Requires UI for resolution |
| Server-Wins | Server version always wins | Read-heavy data, admin-managed content | Client changes lost |
| Client-Wins | Client version always wins | Draft content, user-local data | Server changes lost |

```typescript
// Field-level merge implementation
interface SyncRecord {
  id: string;
  fields: Record<string, unknown>;
  fieldTimestamps: Record<string, number>; // Per-field last-modified
  version: number;
  deletedAt?: number;
}

function fieldLevelMerge(
  local: SyncRecord,
  remote: SyncRecord
): SyncRecord {
  const merged: SyncRecord = {
    id: local.id,
    fields: {},
    fieldTimestamps: {},
    version: Math.max(local.version, remote.version) + 1,
  };

  const allFields = new Set([
    ...Object.keys(local.fields),
    ...Object.keys(remote.fields),
  ]);

  for (const field of allFields) {
    const localTs = local.fieldTimestamps[field] ?? 0;
    const remoteTs = remote.fieldTimestamps[field] ?? 0;

    if (localTs >= remoteTs) {
      merged.fields[field] = local.fields[field];
      merged.fieldTimestamps[field] = localTs;
    } else {
      merged.fields[field] = remote.fields[field];
      merged.fieldTimestamps[field] = remoteTs;
    }
  }

  return merged;
}
```

**Anti-pattern**: Using wall-clock timestamps for LWW without clock synchronization. Use hybrid logical clocks (HLC) or server-assigned timestamps instead.

## Optimistic UI Updates

Apply changes to the local UI immediately. If the server rejects the change, roll back.

```typescript
// Optimistic mutation with rollback
interface OptimisticMutation<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  payload: T;
  previousState?: T;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

class OptimisticStore<T extends { id: string }> {
  private pendingMutations = new Map<string, OptimisticMutation<T>>();
  private confirmedState = new Map<string, T>();

  apply(mutation: OptimisticMutation<T>): void {
    // Save rollback state
    mutation.previousState = this.confirmedState.get(mutation.payload.id);
    this.pendingMutations.set(mutation.id, mutation);

    // Apply optimistically to local state
    if (mutation.type === 'delete') {
      this.confirmedState.delete(mutation.payload.id);
    } else {
      this.confirmedState.set(mutation.payload.id, mutation.payload);
    }
  }

  confirm(mutationId: string): void {
    this.pendingMutations.delete(mutationId);
  }

  rollback(mutationId: string): void {
    const mutation = this.pendingMutations.get(mutationId);
    if (!mutation) return;

    if (mutation.previousState) {
      this.confirmedState.set(mutation.payload.id, mutation.previousState);
    } else {
      this.confirmedState.delete(mutation.payload.id);
    }
    this.pendingMutations.delete(mutationId);
  }
}
```

```tsx
// React hook for optimistic mutations
function useOptimisticMutation<T>(
  mutationFn: (data: T) => Promise<T>,
  options: {
    onOptimistic: (data: T) => void;
    onConfirm: (data: T) => void;
    onRollback: (data: T, error: Error) => void;
  }
) {
  const mutate = useCallback(async (data: T) => {
    options.onOptimistic(data);

    try {
      const result = await mutationFn(data);
      options.onConfirm(result);
    } catch (error) {
      options.onRollback(data, error as Error);
    }
  }, [mutationFn, options]);

  return { mutate };
}
```

**Rule**: Always store the previous state before applying an optimistic update so rollback is possible.
**Rule**: Show a subtle indicator (sync icon, muted timestamp) for unconfirmed optimistic changes.

## Local Database Options

| Database | Platform | Strengths | Weaknesses |
|----------|----------|-----------|------------|
| SQLite (via expo-sqlite, react-native-sqlite-storage) | iOS, Android | Mature, SQL, large datasets | No reactive queries by default |
| WatermelonDB | iOS, Android | Reactive, lazy loading, fast sync | Complex setup, learning curve |
| Realm (MongoDB) | iOS, Android | Object-oriented, reactive, sync built-in | Vendor lock-in with Atlas |
| MMKV | iOS, Android | Fastest key-value store | Not a relational database |
| OPFS + SQLite (wa-sqlite) | Web | SQL in browser, persistent | Browser support varies |

```typescript
// WatermelonDB - Model with sync support
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

class Task extends Model {
  static table = 'tasks';

  @field('title') title!: string;
  @field('is_completed') isCompleted!: boolean;
  @field('server_id') serverId?: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}

// Schema definition
const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'is_completed', type: 'boolean' },
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
```

## Background Sync Scheduling

```typescript
// React Native - Background fetch for sync
import BackgroundFetch from 'react-native-background-fetch';

function configureBackgroundSync() {
  BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // minutes (OS may defer)
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    },
    async (taskId) => {
      console.log('[BackgroundFetch] Task:', taskId);

      try {
        await syncPendingMutations();
        await pullRemoteChanges();
      } catch (error) {
        console.error('[BackgroundFetch] Sync failed:', error);
      }

      BackgroundFetch.finish(taskId);
    },
    (taskId) => {
      // Task timeout - OS is forcing termination
      console.warn('[BackgroundFetch] Timeout:', taskId);
      BackgroundFetch.finish(taskId);
    }
  );
}
```

**Rule**: Background sync is best-effort. The OS controls scheduling. Never assume a specific interval.
**Rule**: Background tasks on iOS have ~30 seconds. Keep sync operations fast and incremental.

## Queue Management for Pending Mutations

```typescript
interface MutationQueue {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  recordId: string;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

class SyncQueue {
  private db: SQLiteDatabase;
  private maxRetries = 5;

  async enqueue(mutation: Omit<MutationQueue, 'id' | 'createdAt' | 'retryCount'>): Promise<void> {
    await this.db.execute(
      `INSERT INTO sync_queue (id, operation, table_name, record_id, payload, created_at, retry_count)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [generateId(), mutation.operation, mutation.table, mutation.recordId,
       JSON.stringify(mutation.payload), Date.now()]
    );
  }

  async processQueue(): Promise<SyncResult> {
    const pending = await this.db.query<MutationQueue>(
      `SELECT * FROM sync_queue WHERE retry_count < ? ORDER BY created_at ASC`,
      [this.maxRetries]
    );

    const results: SyncResult = { succeeded: 0, failed: 0, skipped: 0 };

    for (const mutation of pending) {
      try {
        await this.sendToServer(mutation);
        await this.dequeue(mutation.id);
        results.succeeded++;
      } catch (error) {
        if (isRetryable(error)) {
          await this.incrementRetry(mutation.id, (error as Error).message);
          results.failed++;
        } else {
          // Non-retryable: move to dead letter queue
          await this.moveToDeadLetter(mutation, error);
          results.skipped++;
        }
      }
    }

    return results;
  }

  async getPendingCount(): Promise<number> {
    const result = await this.db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue WHERE retry_count < ?',
      [this.maxRetries]
    );
    return result[0].count;
  }
}
```

**Anti-pattern**: Unbounded retry without backoff. Use exponential backoff: `delay = min(baseDelay * 2^retryCount, maxDelay)`.
**Anti-pattern**: Losing mutations on app crash. Persist the queue to SQLite, not in-memory.

## Network Status Detection

```typescript
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

class NetworkMonitor {
  private listeners = new Set<(online: boolean) => void>();
  private currentState: NetInfoState | null = null;

  start(): () => void {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline();
      this.currentState = state;
      const nowOnline = this.isOnline();

      if (!wasOnline && nowOnline) {
        // Came back online -- trigger sync
        this.notifyListeners(true);
      } else if (wasOnline && !nowOnline) {
        this.notifyListeners(false);
      }
    });

    return unsubscribe;
  }

  isOnline(): boolean {
    if (!this.currentState) return true; // Assume online until proven otherwise
    return this.currentState.isConnected === true &&
           this.currentState.isInternetReachable !== false;
  }

  onStatusChange(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(online: boolean): void {
    this.listeners.forEach((listener) => listener(online));
  }
}
```

**Rule**: `isConnected` can be `true` while `isInternetReachable` is `false` (e.g., captive portal). Check both.

## Graceful Degradation Patterns

| Feature | Online Behavior | Offline Behavior |
|---------|----------------|-----------------|
| Data display | Fetch from server, cache locally | Show cached data with "offline" banner |
| Create/edit | Send to server immediately | Save locally, queue for sync |
| Search | Server-side search | Local full-text search on cached data |
| Images | Load from CDN | Show cached images, placeholder for uncached |
| Auth | Validate token with server | Accept cached token if not expired |
| Real-time features | WebSocket connection | Disabled with "reconnecting" indicator |

## Sync Status UI Indicators

```tsx
function SyncStatusBadge() {
  const { isOnline, pendingCount, lastSyncAt, syncState } = useSyncStatus();

  if (syncState === 'syncing') {
    return (
      <View style={styles.badge}>
        <ActivityIndicator size="small" />
        <Text>Syncing {pendingCount} changes...</Text>
      </View>
    );
  }

  if (!isOnline) {
    return (
      <View style={[styles.badge, styles.offline]}>
        <OfflineIcon />
        <Text>Offline - {pendingCount} changes pending</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={[styles.badge, styles.pending]}>
        <Text>{pendingCount} unsynced</Text>
      </View>
    );
  }

  return null; // No badge when fully synced and online
}
```

**Rule**: Never show "all synced" permanently. Only show sync status when there is something to communicate.

## Data Versioning

Track schema versions to handle migrations when the app updates and the local database schema changes.

```typescript
const MIGRATIONS: Migration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    sql: [
      'ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 0',
      'CREATE INDEX idx_tasks_priority ON tasks(priority)',
    ],
  },
  {
    fromVersion: 2,
    toVersion: 3,
    sql: [
      'ALTER TABLE tasks ADD COLUMN assigned_to TEXT',
    ],
  },
];

async function runMigrations(db: SQLiteDatabase, currentVersion: number, targetVersion: number) {
  const applicable = MIGRATIONS.filter(
    (m) => m.fromVersion >= currentVersion && m.toVersion <= targetVersion
  ).sort((a, b) => a.fromVersion - b.fromVersion);

  for (const migration of applicable) {
    await db.transaction(async (tx) => {
      for (const sql of migration.sql) {
        await tx.execute(sql);
      }
      await tx.execute('PRAGMA user_version = ?', [migration.toVersion]);
    });
  }
}
```

## Output Checklist

- [ ] Conflict resolution strategy chosen and documented
- [ ] Optimistic UI with rollback on server rejection
- [ ] Local database persists data across app restarts
- [ ] Background sync configured with OS-appropriate scheduling
- [ ] Mutation queue persisted to disk (survives crashes)
- [ ] Network status monitored with reconnection-triggered sync
- [ ] UI indicates offline state and pending change count
- [ ] Retry with exponential backoff and max retry limit
- [ ] Dead letter queue for permanently failed mutations
- [ ] Database migrations handle schema version changes
