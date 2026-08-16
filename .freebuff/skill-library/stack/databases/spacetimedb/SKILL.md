---
name: spacetimedb
description: "Expert SpacetimeDB guide covering server module design, table schema with the function-builder API, reducer patterns (atomicity, validation, authorization), subscription optimization, client SDK connection lifecycle, React integration hooks, TypeScript patterns, and real-time sync strategies. Use when building real-time multiplayer apps, collaborative tools, or any application using SpacetimeDB as the primary data store and backend runtime."
version: 1.0.0
---

# SpacetimeDB Expert Guide

> Use this skill when designing SpacetimeDB modules, writing table schemas, implementing reducers, managing client subscriptions, integrating with React, or optimizing real-time sync. This skill targets SpacetimeDB TypeScript SDK v1.4.0+ with the function-builder API.

## When to Use This Skill

- Building real-time multiplayer games with server-authoritative state
- Implementing collaborative apps with live sync (whiteboards, editors, dashboards)
- Designing chat/messaging systems with persistent history
- Projects that need a **combined database + backend runtime** — no separate API layer
- Integrating SpacetimeDB as the `DATABASE_PRIMARY` store with WebSocket-based clients

## When NOT to Use This Skill

- Traditional REST/GraphQL APIs → use a backend framework (Hono, NestJS, FastAPI)
- Relational analytics with complex JOINs → use PostgreSQL
- Vector/embedding search → use LanceDB, Qdrant, or pgvector
- Existing backend + separate database → use a traditional DB skill
- Offline-first mobile apps without WebSocket → use SQLite or Supabase

---

## 1. Module Design (CRITICAL)

SpacetimeDB modules are server-side programs. Each module is a self-contained unit of tables + reducers.

### Module Structure

```typescript
import { spacetimedb, table, t, ReducerContext } from 'spacetimedb';

// 1. Define tables
const Player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().primaryKey(),
    name: t.string(),
    score: t.u64().index(),
    isOnline: t.bool().index(),
  }
);

// 2. Define reducers
spacetimedb.reducer('create_player', { name: t.string() }, (ctx: ReducerContext, { name }) => {
  ctx.db.player.insert({
    identity: ctx.sender,
    name,
    score: 0n,
    isOnline: true,
  });
});

// 3. Lifecycle hooks
spacetimedb.init((ctx: ReducerContext) => { /* module initialization */ });
spacetimedb.clientConnected((ctx: ReducerContext) => { /* mark player online */ });
spacetimedb.clientDisconnected((ctx: ReducerContext) => { /* mark player offline */ });
```

### Module Design Rules

- **One module per domain** — keep modules focused on a single bounded context
- **Use lifecycle hooks** — `init` for setup, `clientConnected`/`clientDisconnected` for presence
- **Handle errors in modules** — throw descriptive errors; reducers are transactional and auto-rollback
- **Export types** — client SDK generates types from your module schema

---

## 2. Table Schema & Indexing (CRITICAL)

### Primary Key Strategies

Every SpacetimeDB table requires a primary key. Choose based on use case:

| Strategy | When to Use | Example |
|----------|------------|---------|
| `t.identity().primaryKey()` | User-owned data | Player profiles, settings |
| `t.string().primaryKey()` | UUID-based entities | Messages, items, rooms |
| `t.u64().primaryKey().autoInc()` | Sequential data | Game rounds, log entries |
| Composite keys | Junction/relationship tables | Friendships, room membership |

```typescript
// ✅ Identity as primary key for user-owned data
const Player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().primaryKey(),
    username: t.string(),
    score: t.u64(),
  }
);

// ✅ UUID for entity tables
const Message = table(
  { name: 'message', public: true },
  {
    id: t.string().primaryKey(),       // UUID generated at insert
    senderId: t.identity(),
    content: t.string(),
    timestamp: t.u64(),
  }
);

// ✅ Auto-increment for sequential data
const GameRound = table(
  { name: 'game_round', public: true },
  {
    roundNumber: t.u64().primaryKey().autoInc(),
    startedAt: t.u64(),
    endedAt: t.u64().optional(),
  }
);
```

### Indexing

Add `.index()` to columns used in subscription filters or frequent queries:

```typescript
const Player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().primaryKey(),
    name: t.string(),
    score: t.u64().index(),       // Indexed: leaderboard queries
    isOnline: t.bool().index(),   // Indexed: online players filter
    roomId: t.string().index(),   // Indexed: room membership queries
  }
);
```

> Index every column that appears in a `WHERE` clause in subscriptions — unindexed filters are expensive.

### Column Types

| Type Builder | TypeScript Type | When to Use |
|-------------|----------------|------------|
| `t.string()` | `string` | Text, UUIDs |
| `t.u32()`, `t.u64()` | `number`, `bigint` | Counts, timestamps |
| `t.i32()`, `t.i64()` | `number`, `bigint` | Signed integers |
| `t.f32()`, `t.f64()` | `number` | Floating point |
| `t.bool()` | `boolean` | Flags |
| `t.identity()` | `Identity` | User identifiers |
| `.optional()` | `T \| undefined` | Nullable fields |

---

## 3. Reducer Patterns (HIGH)

Reducers are transactional server-side functions. They either complete entirely or roll back.

### Atomicity — One Reducer, One Job

```typescript
// ✅ Focused reducer — does one thing
spacetimedb.reducer(
  'move_player',
  { direction: t.string() },
  (ctx: ReducerContext, { direction }) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    if (!player) throw new Error('Player not found');

    const newPosition = calculateNewPosition(player.position, direction);
    if (!isValidPosition(newPosition)) throw new Error('Invalid move');

    ctx.db.player.identity.update({
      ...player,
      position: newPosition,
      lastMoveAt: ctx.timestamp,
    });
  }
);

// ❌ Avoid: one reducer that moves, checks collisions, awards achievements, and updates leaderboard
```

### Input Validation

Always validate at reducer entry:

```typescript
spacetimedb.reducer(
  'send_message',
  { channelId: t.string(), content: t.string() },
  (ctx: ReducerContext, { channelId, content }) => {
    // Validate input
    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }
    if (content.length > 2000) {
      throw new Error('Message too long (max 2000 characters)');
    }

    // Verify channel exists
    const channel = ctx.db.channel.id.find(channelId);
    if (!channel) throw new Error('Channel not found');

    ctx.db.message.insert({
      id: crypto.randomUUID(),
      senderId: ctx.sender,
      channelId,
      content: content.trim(),
      timestamp: ctx.timestamp,
    });
  }
);
```

### Authorization

Check caller identity for sensitive operations:

```typescript
spacetimedb.reducer(
  'delete_message',
  { messageId: t.string() },
  (ctx: ReducerContext, { messageId }) => {
    const message = ctx.db.message.id.find(messageId);
    if (!message) throw new Error('Message not found');

    // Only the sender can delete their own message
    if (!message.senderId.isEqual(ctx.sender)) {
      throw new Error('Unauthorized: can only delete your own messages');
    }

    ctx.db.message.id.delete(messageId);
  }
);
```

---

## 4. Subscription Optimization (HIGH)

### Selective Subscriptions

Subscribe only to the data your client needs. Use `WHERE` clauses to filter server-side:

```typescript
import { DbConnection } from './generated';

const conn = DbConnection.builder()
  .withUri('ws://localhost:3000')
  .withModuleName('game-module')
  .onConnect((ctx, identity, token) => {
    const myId = identity.toHexString();

    // ✅ Only online players
    conn.subscription(['SELECT * FROM player WHERE isOnline = true']);

    // ✅ Only my inventory
    conn.subscription(['SELECT * FROM inventory WHERE ownerId = ?', myId]);

    // ✅ Leaderboard top 100
    conn.subscription(['SELECT * FROM player ORDER BY score DESC LIMIT 100']);
  })
  .build();

// ✅ Dynamic subscriptions with cleanup
function subscribeToChannel(channelId: string) {
  return conn.subscription([
    'SELECT * FROM message WHERE channelId = ?',
    channelId,
  ]);
}

// Unsubscribe when leaving channel
function leaveChannel(sub: any) {
  sub?.unsubscribe();
}
```

> **Rule**: Never `SELECT * FROM table` without filters — this downloads the entire table to every client.

### Subscription Batching

Batch subscription setup on client connect to reduce round trips:

```typescript
.onConnect((ctx, identity, token) => {
  // Batch multiple subscriptions in one connect handler
  conn.subscription([
    'SELECT * FROM player WHERE isOnline = true',
    'SELECT * FROM player WHERE identity = ?', identity.toHexString(),
    'SELECT * FROM config',
  ]);
})
```

---

## 5. Client SDK Integration

### Connection Lifecycle

```typescript
import { DbConnection } from './generated';

const conn = DbConnection.builder()
  .withUri('ws://localhost:3000')
  .withModuleName('my-module')
  .onConnect((ctx, identity, token) => {
    console.log('Connected as', identity.toHexString());
    // Store token for reconnection
    localStorage.setItem('spacetimedb_token', token);
    // Set up subscriptions
    conn.subscription(['SELECT * FROM player WHERE isOnline = true']);
  })
  .onDisconnect((ctx, error) => {
    console.error('Disconnected:', error);
    // Implement reconnection logic
  })
  .build();

// Call reducers
await conn.reducers.createPlayer('Alice');

// Access tables
const player = conn.db.player.identity.find(identity);
```

### Reconnection Pattern

```typescript
function connectWithRetry(maxRetries = 5, delayMs = 1000) {
  let attempt = 0;

  function connect() {
    return DbConnection.builder()
      .withUri('ws://localhost:3000')
      .withModuleName('my-module')
      .withToken(localStorage.getItem('spacetimedb_token') ?? undefined)
      .onConnect((ctx, identity, token) => {
        attempt = 0; // Reset on success
        localStorage.setItem('spacetimedb_token', token);
      })
      .onDisconnect((ctx, error) => {
        if (attempt < maxRetries) {
          attempt++;
          setTimeout(connect, delayMs * Math.pow(2, attempt));
        }
      })
      .build();
  }

  return connect();
}
```

---

## 6. React Integration

### Table Hooks

```typescript
import { useTable, where, eq } from 'spacetimedb/react';
import { DbConnection, Player, Message } from './generated';

function OnlinePlayers() {
  const { rows: players } = useTable<DbConnection, Player>(
    'player',
    where(eq('isOnline', true))
  );

  return (
    <div>
      {players.map(p => (
        <div key={p.identity.toHexString()}>{p.name} — Score: {p.score}</div>
      ))}
    </div>
  );
}

function ChatMessages({ channelId }: { channelId: string }) {
  const { rows: messages } = useTable<DbConnection, Message>(
    'message',
    where(eq('channelId', channelId))
  );

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.content}</div>
      ))}
    </div>
  );
}
```

### Reducer Calls with Error Handling

```typescript
function SendMessageForm({ conn, channelId }: { conn: DbConnection; channelId: string }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    try {
      setError(null);
      await conn.reducers.sendMessage(channelId, content);
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    }
  };

  return (
    <form onSubmit={e => { e.preventDefault(); handleSend(); }}>
      <input value={content} onChange={e => setContent(e.target.value)} />
      <button type="submit">Send</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

### Subscription Lifecycle in Components

```typescript
import { useEffect, useState } from 'react';

function ChatRoom({ channelId, conn }: { channelId: string; conn: DbConnection }) {
  useEffect(() => {
    const sub = conn.subscription([
      'SELECT * FROM message WHERE channelId = ?',
      channelId,
    ]);

    return () => { sub?.unsubscribe(); };
  }, [channelId, conn]);

  const { rows: messages } = useTable<DbConnection, Message>(
    'message',
    where(eq('channelId', channelId))
  );

  return <div>{messages.map(m => <div key={m.id}>{m.content}</div>)}</div>;
}
```

---

## 7. TypeScript Patterns

- **Use generated types** — run `spacetimedb generate` and import from `./generated`
- **Enable strict mode** — `"strict": true` in tsconfig for better type safety
- **Use `bigint` for u64** — SpacetimeDB `u64` maps to TypeScript `bigint` (e.g., `0n`, `ctx.timestamp`)
- **Type guards for runtime validation** — validate data shapes at module boundaries

```typescript
// ✅ Use generated types
import { Player, Message, DbConnection } from './generated';

// ✅ Use bigint for u64 fields
const score: bigint = 100n;

// ✅ Type guard example
function isValidDirection(dir: string): dir is 'up' | 'down' | 'left' | 'right' {
  return ['up', 'down', 'left', 'right'].includes(dir);
}
```

---

## 8. Real-time Sync Patterns

### Debounce Rapid Updates

For high-frequency state changes (mouse position, typing indicators), debounce on the client:

```typescript
function useDebouncedReducer(conn: DbConnection, intervalMs = 50) {
  const lastSent = useRef(0);

  return (x: number, y: number) => {
    const now = Date.now();
    if (now - lastSent.current > intervalMs) {
      lastSent.current = now;
      conn.reducers.updateCursor(x, y);
    }
  };
}
```

### Presence

Use `clientConnected`/`clientDisconnected` lifecycle hooks for user presence:

```typescript
// Server module
spacetimedb.clientConnected((ctx: ReducerContext) => {
  const player = ctx.db.player.identity.find(ctx.sender);
  if (player) {
    ctx.db.player.identity.update({ ...player, isOnline: true, lastSeen: ctx.timestamp });
  }
});

spacetimedb.clientDisconnected((ctx: ReducerContext) => {
  const player = ctx.db.player.identity.find(ctx.sender);
  if (player) {
    ctx.db.player.identity.update({ ...player, isOnline: false, lastSeen: ctx.timestamp });
  }
});
```

---

## 9. Common Anti-Patterns

1. **God reducer** — one reducer doing everything; break into focused, atomic reducers
2. **Unfiltered subscriptions** — `SELECT * FROM table` with no WHERE clause wastes bandwidth
3. **Mutable primary keys** — using `username` as PK when it can change; use `identity` or UUID
4. **No input validation** — always validate at reducer entry; never trust client input
5. **Missing indexes** — subscription WHERE columns without `.index()` are slow
6. **Storing secrets in tables** — SpacetimeDB tables marked `public: true` are visible to subscribers
7. **Ignoring `ctx.sender`** — always verify the caller's identity for mutations on user-owned data
8. **No reconnection logic** — WebSocket connections drop; implement exponential backoff

---

## References

- [SpacetimeDB Documentation](https://spacetimedb.com/docs)
- [TypeScript Module Quickstart](https://spacetimedb.com/docs/modules/typescript/quickstart/)
- [TypeScript SDK Reference](https://spacetimedb.com/docs/sdks/typescript/)
- Source patterns adapted from [iSyn/stdb-skills](https://github.com/iSyn/stdb-skills) (MIT)
