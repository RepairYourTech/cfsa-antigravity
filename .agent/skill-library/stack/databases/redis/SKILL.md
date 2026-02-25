---
name: redis
description: "Expert Redis development guide covering data structures (strings, hashes, lists, sets, sorted sets, streams, JSON), caching patterns (cache-aside, write-through, write-behind), pub/sub, Lua scripting, transactions (MULTI/EXEC), pipelining, Redis Stack (Search, JSON, TimeSeries, Bloom), key naming, TTL strategies, memory management, eviction policies, Redis Cluster, Sentinel, client libraries (ioredis, redis-py), and rate limiting."
version: 1.0.0
---

# Redis Expert

## 1. Data Structures

### Strings

The most basic type. Stores text, integers, floats, or binary data up to 512 MB.

```redis
# Basic key-value
SET user:1001:name "Alice Johnson"
GET user:1001:name

# With expiration
SET session:abc123 "{\"userId\":\"1001\"}" EX 3600    # Expires in 1 hour
SET session:abc123 "{\"userId\":\"1001\"}" PX 60000   # Expires in 60 seconds (ms)

# Set only if key does not exist (distributed lock primitive)
SET lock:order:5001 "worker-1" NX EX 30    # Acquire lock for 30 seconds

# Set only if key exists (update, not create)
SET user:1001:name "Alice Smith" XX

# Atomic counters
INCR page:views:home           # Increment by 1
INCRBY user:1001:score 50      # Increment by 50
DECR inventory:product:301     # Decrement by 1
INCRBYFLOAT account:1001:balance 19.99

# Bit operations (compact boolean flags)
SETBIT user:1001:features 0 1    # Feature 0 enabled
SETBIT user:1001:features 1 0    # Feature 1 disabled
GETBIT user:1001:features 0      # Returns 1
BITCOUNT user:1001:features      # Count enabled features
```

### Hashes

Field-value maps. Ideal for representing objects. More memory-efficient than separate string keys.

```redis
# Set fields
HSET user:1001 name "Alice" email "alice@example.com" age 28 active 1
HMSET user:1001 city "Portland" country "US"

# Get fields
HGET user:1001 name                    # "Alice"
HMGET user:1001 name email age         # ["Alice", "alice@example.com", "28"]
HGETALL user:1001                      # All fields and values

# Atomic field operations
HINCRBY user:1001 login_count 1
HINCRBYFLOAT user:1001 balance 19.99

# Check existence
HEXISTS user:1001 email                # 1 (exists)
HLEN user:1001                         # Number of fields

# Delete fields
HDEL user:1001 temporary_field

# Get only keys or values
HKEYS user:1001
HVALS user:1001
```

### Lists

Ordered sequences. Support push/pop from both ends. Good for queues, activity feeds, and recent items.

```redis
# Push items
LPUSH queue:emails "{\"to\":\"alice@example.com\",\"subject\":\"Welcome\"}"
RPUSH activity:user:1001 "logged_in" "viewed_product" "added_to_cart"

# Pop items (queue pattern: LPUSH + RPOP or RPUSH + LPOP)
RPOP queue:emails                  # Pop from right (FIFO with LPUSH)
LPOP queue:emails                  # Pop from left

# Blocking pop (waits for data, great for worker queues)
BRPOP queue:emails 30              # Block up to 30 seconds
BLPOP queue:high queue:low 10      # Priority queues: check high first

# Range queries
LRANGE activity:user:1001 0 9     # Last 10 items
LRANGE activity:user:1001 0 -1    # All items

# Trim (keep only recent items)
LTRIM activity:user:1001 0 99     # Keep only the 100 most recent

# Length
LLEN queue:emails

# Move between lists (atomic)
LMOVE queue:processing queue:completed LEFT RIGHT
```

### Sets

Unordered collections of unique strings. Ideal for tags, unique visitors, membership tracking.

```redis
# Add members
SADD tags:product:301 "electronics" "sale" "featured"
SADD online:users "user:1001" "user:1002" "user:1003"

# Check membership
SISMEMBER online:users "user:1001"    # 1 (member)
SISMEMBER online:users "user:9999"    # 0 (not a member)

# Get all members
SMEMBERS tags:product:301

# Set operations
SADD interests:alice "music" "movies" "coding" "hiking"
SADD interests:bob "movies" "gaming" "coding" "cooking"

SINTER interests:alice interests:bob         # {"movies", "coding"}
SUNION interests:alice interests:bob         # All unique interests
SDIFF interests:alice interests:bob          # {"music", "hiking"} (in alice, not in bob)

# Random members
SRANDMEMBER tags:product:301 2               # 2 random tags
SPOP online:users                            # Remove and return random member

# Cardinality
SCARD online:users                           # Count of members
```

### Sorted Sets

Sets with a score for each member. Sorted by score. Perfect for leaderboards, ranking, time-based data.

```redis
# Add members with scores
ZADD leaderboard 1500 "alice" 1200 "bob" 1800 "carol" 900 "dave"

# Get by rank (ascending score)
ZRANGE leaderboard 0 9                       # Top 10 (lowest scores)
ZRANGE leaderboard 0 9 REV                   # Top 10 (highest scores)
ZRANGE leaderboard 0 9 REV WITHSCORES        # With scores

# Get by score range
ZRANGEBYSCORE leaderboard 1000 2000          # Scores between 1000 and 2000
ZRANGEBYSCORE leaderboard "-inf" "+inf"      # All members

# Rank of a member
ZRANK leaderboard "alice"                     # Rank (0-indexed, ascending)
ZREVRANK leaderboard "alice"                  # Rank (0-indexed, descending)

# Score of a member
ZSCORE leaderboard "alice"                    # 1500

# Increment score
ZINCRBY leaderboard 100 "alice"               # Alice now has 1600

# Count members in score range
ZCOUNT leaderboard 1000 2000

# Remove members
ZREM leaderboard "dave"
ZREMRANGEBYSCORE leaderboard "-inf" 500       # Remove low scorers
ZREMRANGEBYRANK leaderboard 0 -11            # Keep only top 10
```

### Streams

Append-only log data structure. Best for event sourcing, message queues, and real-time feeds.

```redis
# Add entries (auto-generated ID with *)
XADD events:orders * action "created" orderId "5001" userId "1001" total "59.99"
XADD events:orders * action "paid" orderId "5001" paymentMethod "card"

# Read entries
XRANGE events:orders - +                     # All entries
XRANGE events:orders - + COUNT 10            # First 10
XRANGE events:orders 1700000000000-0 +       # From timestamp

# Read new entries (blocking, consumer pattern)
XREAD COUNT 10 BLOCK 5000 STREAMS events:orders $  # Wait for new entries

# Consumer groups (parallel processing with acknowledgment)
XGROUP CREATE events:orders order-processors $ MKSTREAM

# Read as consumer in group
XREADGROUP GROUP order-processors worker-1 COUNT 1 BLOCK 5000 STREAMS events:orders >

# Acknowledge processed entry
XACK events:orders order-processors 1700000000001-0

# Check pending entries (not yet acknowledged)
XPENDING events:orders order-processors - + 10

# Claim stuck entries (when a worker dies)
XCLAIM events:orders order-processors worker-2 60000 1700000000001-0

# Trim stream length
XTRIM events:orders MAXLEN ~ 10000           # Keep approximately 10000 entries
```

---

## 2. Caching Patterns

### Cache-Aside (Lazy Loading)

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

async function getUser(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return JSON.parse(cached) as User;
  }

  // 2. Cache miss: fetch from database
  const user = await db.users.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // 3. Populate cache with TTL
  await redis.set(cacheKey, JSON.stringify(user), "EX", 3600);

  return user;
}

// Invalidate on write
async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  const user = await db.users.updateById(userId, data);
  await redis.del(`user:${userId}`);  // Invalidate cache
  return user;
}
```

### Write-Through

```typescript
// Write to cache AND database on every write
async function saveProduct(product: Product): Promise<void> {
  // Write to database
  await db.products.upsert(product);

  // Write to cache (cache is always fresh)
  await redis.set(
    `product:${product.id}`,
    JSON.stringify(product),
    "EX",
    7200
  );
}
```

### Write-Behind (Write-Back)

```typescript
// Write to cache immediately, flush to database asynchronously
async function recordPageView(pageId: string): Promise<void> {
  // Increment in Redis (fast)
  await redis.hincrby(`pageviews:pending`, pageId, 1);
}

// Periodic flush to database (run every 30 seconds)
async function flushPageViews(): Promise<void> {
  const pending = await redis.hgetall("pageviews:pending");
  if (Object.keys(pending).length === 0) return;

  // Batch update database
  const updates = Object.entries(pending).map(([pageId, count]) =>
    db.pages.increment(pageId, "views", parseInt(count, 10))
  );
  await Promise.all(updates);

  // Clear pending counts
  await redis.del("pageviews:pending");
}
```

### Cache Stampede Prevention

```typescript
// Problem: many requests arrive simultaneously for an expired key
// All of them miss cache and hit the database at once

// Solution 1: Locking (only one request rebuilds cache)
async function getWithLock(key: string, fetchFn: () => Promise<string>, ttl: number): Promise<string> {
  const cached = await redis.get(key);
  if (cached !== null) return cached;

  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, "1", "NX", "EX", 10);

  if (acquired) {
    try {
      const value = await fetchFn();
      await redis.set(key, value, "EX", ttl);
      return value;
    } finally {
      await redis.del(lockKey);
    }
  }

  // Wait briefly and retry
  await new Promise((resolve) => setTimeout(resolve, 100));
  return getWithLock(key, fetchFn, ttl);
}

// Solution 2: Stale-while-revalidate (serve stale, refresh in background)
async function getStaleWhileRevalidate(key: string, fetchFn: () => Promise<string>, ttl: number, staleTTL: number): Promise<string | null> {
  const cached = await redis.get(key);
  const staleMarker = await redis.get(`stale:${key}`);

  if (cached !== null) {
    if (staleMarker === null) {
      // Data is stale, refresh in background
      fetchFn().then(async (value) => {
        await redis.set(key, value, "EX", ttl + staleTTL);
        await redis.set(`stale:${key}`, "1", "EX", ttl);
      });
    }
    return cached;
  }

  // Full cache miss
  const value = await fetchFn();
  await redis.set(key, value, "EX", ttl + staleTTL);
  await redis.set(`stale:${key}`, "1", "EX", ttl);
  return value;
}
```

---

## 3. Pub/Sub

```typescript
import Redis from "ioredis";

const publisher = new Redis(process.env.REDIS_URL);
const subscriber = new Redis(process.env.REDIS_URL);

// Subscribe to channels
subscriber.subscribe("orders:created", "orders:updated", (err, count) => {
  if (err) throw err;
  console.log(`Subscribed to ${count} channels`);
});

// Handle messages
subscriber.on("message", (channel, message) => {
  const data = JSON.parse(message);
  switch (channel) {
    case "orders:created":
      handleNewOrder(data);
      break;
    case "orders:updated":
      handleOrderUpdate(data);
      break;
  }
});

// Pattern subscribe (wildcard)
subscriber.psubscribe("events:*", (err) => {
  if (err) throw err;
});

subscriber.on("pmessage", (pattern, channel, message) => {
  console.log(`Pattern ${pattern}, channel ${channel}: ${message}`);
});

// Publish
await publisher.publish("orders:created", JSON.stringify({
  orderId: "5001",
  userId: "1001",
  total: 59.99,
}));
```

### Pub/Sub Limitations

```
- Messages are fire-and-forget: if no subscriber is listening, the message is lost
- No message persistence or replay
- No consumer groups (use Streams for this)
- Subscriber connections cannot run other commands
- All subscribers get all messages (no load balancing)

Use Streams instead when you need:
  - Message durability
  - Consumer groups (parallel processing)
  - Message acknowledgment
  - Replay from a specific point
```

---

## 4. Lua Scripting

Lua scripts execute atomically on the Redis server. No other command runs during script execution.

```typescript
// Rate limiter using Lua (atomic check-and-increment)
const rateLimitScript = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('GET', key)
if current and tonumber(current) >= limit then
  return 0
end

current = redis.call('INCR', key)
if tonumber(current) == 1 then
  redis.call('EXPIRE', key, window)
end

return 1
`;

// Usage
const allowed = await redis.eval(
  rateLimitScript,
  1,                          // Number of KEYS
  `ratelimit:${userId}`,      // KEYS[1]
  "100",                      // ARGV[1]: max requests
  "60"                        // ARGV[2]: window in seconds
);

if (!allowed) {
  throw new Error("Rate limit exceeded");
}

// Sliding window rate limiter with sorted sets
const slidingWindowScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

local windowStart = now - window
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

local count = redis.call('ZCARD', key)
if count >= limit then
  return 0
end

redis.call('ZADD', key, now, member)
redis.call('EXPIRE', key, window)
return 1
`;

// Load script for repeated use (avoids sending full script each time)
const sha = await redis.script("LOAD", rateLimitScript);
const result = await redis.evalsha(sha, 1, `ratelimit:${userId}`, "100", "60");
```

---

## 5. Transactions (MULTI/EXEC)

```typescript
// MULTI/EXEC: all commands execute atomically
const pipeline = redis.multi();
pipeline.set("account:1001:balance", "500");
pipeline.set("account:1002:balance", "300");
pipeline.incrby("account:1001:balance", -100);
pipeline.incrby("account:1002:balance", 100);
const results = await pipeline.exec();
// results: [[null, "OK"], [null, "OK"], [null, 400], [null, 400]]

// WATCH for optimistic locking (CAS -- check-and-set)
async function transferFunds(fromId: string, toId: string, amount: number): Promise<boolean> {
  const fromKey = `account:${fromId}:balance`;
  const toKey = `account:${toId}:balance`;

  // Watch keys for changes
  await redis.watch(fromKey, toKey);

  const balance = parseInt(await redis.get(fromKey) || "0", 10);
  if (balance < amount) {
    await redis.unwatch();
    return false;
  }

  // If any watched key changed since WATCH, EXEC returns null
  const result = await redis.multi()
    .decrby(fromKey, amount)
    .incrby(toKey, amount)
    .exec();

  return result !== null;  // null means a watched key was modified
}
```

---

## 6. Pipelining

```typescript
// Pipelining: send multiple commands without waiting for individual responses
// Reduces round trips from N to 1

const pipeline = redis.pipeline();
for (let i = 0; i < 1000; i++) {
  pipeline.set(`key:${i}`, `value:${i}`);
}
const results = await pipeline.exec();
// All 1000 commands sent in a single round trip

// Read pipeline
const readPipeline = redis.pipeline();
const userIds = ["1001", "1002", "1003", "1004", "1005"];
for (const id of userIds) {
  readPipeline.hgetall(`user:${id}`);
}
const users = await readPipeline.exec();
// users: [[null, { name: "Alice", ... }], [null, { name: "Bob", ... }], ...]
```

### Pipeline vs MULTI

```
Pipeline:
  - Commands sent in batch (1 round trip)
  - Commands may interleave with other clients' commands
  - No atomicity guarantee
  - Use for performance when atomicity is not needed

MULTI/EXEC:
  - Commands queued and executed atomically
  - No other command runs between them
  - Slightly more overhead
  - Use when atomicity matters

Pipeline + MULTI: combine for atomic batch operations in 1 round trip
```

---

## 7. Redis Stack Modules

### RedisJSON

```redis
# Store JSON documents natively
JSON.SET user:1001 $ '{"name":"Alice","age":28,"address":{"city":"Portland","state":"OR"},"tags":["premium","early-adopter"]}'

# Get specific path
JSON.GET user:1001 $.name                           # "Alice"
JSON.GET user:1001 $.address.city                   # "Portland"
JSON.GET user:1001 $.tags[0]                        # "premium"

# Update nested value
JSON.SET user:1001 $.address.city '"Seattle"'

# Numeric operations
JSON.NUMINCRBY user:1001 $.age 1                    # 29

# Array operations
JSON.ARRAPPEND user:1001 $.tags '"vip"'             # Add to array
JSON.ARRLEN user:1001 $.tags                        # Array length
JSON.ARRPOP user:1001 $.tags                        # Pop last element

# Type checking
JSON.TYPE user:1001 $.name                          # string
JSON.TYPE user:1001 $.age                           # integer
```

### RediSearch

```redis
# Create a search index on hashes
FT.CREATE idx:products ON HASH PREFIX 1 "product:"
  SCHEMA
    name TEXT WEIGHT 5.0
    description TEXT
    category TAG
    price NUMERIC SORTABLE
    in_stock TAG

# Search
FT.SEARCH idx:products "wireless headphones" LIMIT 0 10

# Filtered search
FT.SEARCH idx:products "@category:{electronics} @price:[50 200]"

# Autocomplete
FT.SUGADD autocomplete:products "Wireless Bluetooth Headphones" 100
FT.SUGGET autocomplete:products "wire" FUZZY MAX 5

# Aggregation
FT.AGGREGATE idx:products "*"
  GROUPBY 1 @category
  REDUCE COUNT 0 AS product_count
  REDUCE AVG 1 @price AS avg_price
  SORTBY 2 @product_count DESC
  LIMIT 0 10
```

### RedisTimeSeries

```redis
# Create a time series
TS.CREATE temperature:sensor-1 RETENTION 86400000 LABELS sensor_id "1" location "warehouse-a"

# Add data points
TS.ADD temperature:sensor-1 * 22.5       # Auto timestamp
TS.ADD temperature:sensor-1 1700000000 23.1  # Explicit timestamp

# Range query
TS.RANGE temperature:sensor-1 1700000000 1700003600

# Aggregation over time buckets
TS.RANGE temperature:sensor-1 - + AGGREGATION avg 3600000  # Hourly averages
TS.RANGE temperature:sensor-1 - + AGGREGATION max 86400000 # Daily maximums

# Multi-series query by labels
TS.MRANGE - + FILTER location="warehouse-a" AGGREGATION avg 3600000
```

### Bloom Filter

```redis
# Create and add to a Bloom filter (probabilistic: no false negatives, possible false positives)
BF.ADD seen:emails "alice@example.com"
BF.ADD seen:emails "bob@example.com"

# Check membership (fast, memory-efficient)
BF.EXISTS seen:emails "alice@example.com"    # 1 (definitely exists)
BF.EXISTS seen:emails "unknown@example.com"  # 0 (definitely does not exist)

# Reserve with specific error rate and capacity
BF.RESERVE seen:emails 0.001 1000000  # 0.1% false positive rate, 1M capacity

# Use case: prevent duplicate processing
# Before processing an event, check if we have seen it before
# If BF.EXISTS returns 0, we know for certain it is new
```

---

## 8. Key Naming Conventions

```
Pattern: object-type:id:field

Examples:
  user:1001                    -- Hash of user data
  user:1001:sessions           -- Set of active session IDs
  user:1001:notifications      -- List of notifications
  session:abc123               -- Session data (string or hash)
  cache:api:products:list      -- Cached API response
  lock:order:5001              -- Distributed lock
  ratelimit:ip:192.168.1.1     -- Rate limit counter
  queue:emails                 -- Email processing queue
  leaderboard:global           -- Sorted set leaderboard
  counter:page:views:home      -- Page view counter
  temp:import:batch-42         -- Temporary data with TTL

Conventions:
  - Use colons (:) as separators
  - Keep keys short but descriptive
  - Prefix by data domain or application name in shared environments
  - Use consistent patterns across the codebase
  - Avoid very long keys (network overhead) but do not sacrifice clarity
```

---

## 9. TTL Strategies

```typescript
// Tier-based TTL
const TTL = {
  SESSION: 24 * 60 * 60,           // 24 hours
  CACHE_API: 5 * 60,               // 5 minutes
  CACHE_DB: 60 * 60,               // 1 hour
  CACHE_STATIC: 24 * 60 * 60,      // 24 hours
  RATE_LIMIT: 60,                   // 1 minute window
  LOCK: 30,                         // 30 seconds
  TEMP: 10 * 60,                    // 10 minutes
} as const;

// Jittered TTL (prevent cache stampede from synchronized expiry)
function jitteredTTL(baseTTL: number): number {
  const jitter = Math.floor(Math.random() * baseTTL * 0.1);  // +/- 10%
  return baseTTL + jitter;
}

await redis.set("cache:products:list", data, "EX", jitteredTTL(3600));

// Sliding expiration (reset TTL on access)
async function getWithSlidingExpiry(key: string, ttl: number): Promise<string | null> {
  const value = await redis.get(key);
  if (value !== null) {
    await redis.expire(key, ttl);  // Reset TTL on access
  }
  return value;
}

// Check remaining TTL
const remaining = await redis.ttl("session:abc123");
// -2: key does not exist
// -1: key exists but has no expiration
// N:  seconds until expiration
```

---

## 10. Memory Management

### Eviction Policies

```
# Set in redis.conf or at runtime
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru

Policies:
  noeviction          -- Return errors when memory limit is reached (default)
  allkeys-lru         -- Evict least recently used keys (best for general caching)
  allkeys-lfu         -- Evict least frequently used keys (better for skewed access)
  volatile-lru        -- Evict LRU keys that have a TTL set
  volatile-lfu        -- Evict LFU keys that have a TTL set
  volatile-ttl        -- Evict keys with the shortest TTL first
  allkeys-random      -- Evict random keys
  volatile-random     -- Evict random keys that have a TTL set

Recommendations:
  - Cache-only workloads: allkeys-lru or allkeys-lfu
  - Mixed workloads (cache + persistent): volatile-lru
  - Session stores: volatile-ttl
  - Never use noeviction for cache workloads (causes write failures)
```

### Memory Optimization

```redis
# Check memory usage
INFO memory
MEMORY USAGE user:1001                    # Bytes used by a specific key
MEMORY DOCTOR                             # Diagnostic suggestions

# Optimize small hashes (ziplist encoding)
# When a hash has few fields and small values, Redis uses a compact encoding
CONFIG SET hash-max-ziplist-entries 128    # Max fields for ziplist
CONFIG SET hash-max-ziplist-value 64      # Max value size for ziplist

# Optimize small sorted sets
CONFIG SET zset-max-ziplist-entries 128
CONFIG SET zset-max-ziplist-value 64

# Optimize small lists
CONFIG SET list-max-ziplist-size -2       # 8 KB per node

# Scan for large keys
redis-cli --bigkeys

# Check key count and memory by pattern
redis-cli --memkeys --pattern "cache:*"
```

---

## 11. Redis Cluster

### Cluster Architecture

```
- Data is split across 16384 hash slots
- Each primary node owns a range of hash slots
- Each primary can have one or more replicas
- Clients route commands to the correct node based on the key's hash slot
- Minimum: 3 primary nodes + 3 replicas (6 nodes total)
```

### Hash Tags (Force Keys to Same Slot)

```redis
# Keys with the same hash tag go to the same slot
# Hash tag is the content between the first { and first }
SET {user:1001}:profile "..."
SET {user:1001}:settings "..."
SET {user:1001}:cart "..."

# These all hash on "user:1001" and land on the same node
# Multi-key commands (MGET, transactions) require same-slot keys

# Without hash tags, these could be on different nodes:
SET user:1001:profile "..."    # Hashes on "user:1001:profile"
SET user:1001:settings "..."   # Hashes on "user:1001:settings"
# MGET on these would fail in cluster mode
```

### ioredis Cluster Client

```typescript
import Redis from "ioredis";

const cluster = new Redis.Cluster([
  { host: "node1.example.com", port: 6379 },
  { host: "node2.example.com", port: 6379 },
  { host: "node3.example.com", port: 6379 },
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
    tls: {},  // Enable TLS for production
  },
  scaleReads: "slave",         // Read from replicas
  maxRedirections: 16,         // Max MOVED/ASK redirections
  retryDelayOnMoved: 100,      // Delay on MOVED response (ms)
  retryDelayOnCloverdown: 300, // Delay when cluster is down
  enableReadyCheck: true,
  natMap: {},                  // NAT mapping for cloud environments
});

cluster.on("error", (err) => console.error("Cluster error:", err));
cluster.on("ready", () => console.log("Cluster ready"));
```

---

## 12. Sentinel (High Availability)

```typescript
// Sentinel monitors primary nodes and performs automatic failover
const redis = new Redis({
  sentinels: [
    { host: "sentinel1.example.com", port: 26379 },
    { host: "sentinel2.example.com", port: 26379 },
    { host: "sentinel3.example.com", port: 26379 },
  ],
  name: "mymaster",            // Sentinel master name
  password: process.env.REDIS_PASSWORD,
  sentinelPassword: process.env.SENTINEL_PASSWORD,
  db: 0,
  role: "master",              // Connect to master
  // role: "slave",            // Connect to a replica for reads
});

redis.on("error", (err) => console.error("Redis error:", err));
redis.on("reconnecting", () => console.log("Reconnecting to Redis..."));
redis.on("ready", () => console.log("Redis ready"));
```

### Cluster vs Sentinel

```
Sentinel:
  - Single primary with replicas
  - Automatic failover on primary failure
  - All data fits on one node
  - Simpler setup and operations
  - Use when data fits in a single node's memory

Cluster:
  - Multiple primaries, each owning a slice of data
  - Horizontal scaling (add nodes to add capacity)
  - Data sharded across nodes
  - More complex operations (resharding, rebalancing)
  - Use when data exceeds single node memory or you need write scaling
```

---

## 13. Client Libraries

### ioredis (Node.js)

```typescript
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  maxRetriesPerRequest: 3,
  retryStrategy(times: number): number | null {
    if (times > 10) return null;  // Stop retrying after 10 attempts
    return Math.min(times * 200, 2000);  // Exponential backoff, max 2s
  },
  enableReadyCheck: true,
  lazyConnect: true,           // Connect on first command
  keepAlive: 30000,            // TCP keepalive (ms)
  connectTimeout: 10000,       // Connection timeout (ms)
  commandTimeout: 5000,        // Command timeout (ms)
});

// Error handling
redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("ready", () => {
  console.log("Redis is ready");
});

// Graceful shutdown
async function shutdown(): Promise<void> {
  await redis.quit();
}
```

### redis-py (Python)

```python
import redis
import json
from datetime import timedelta

# Connection pool (reuse connections across requests)
pool = redis.ConnectionPool(
    host="localhost",
    port=6379,
    password="your_password",
    db=0,
    max_connections=50,
    decode_responses=True,  # Return strings instead of bytes
    socket_timeout=5,
    socket_connect_timeout=5,
    retry_on_timeout=True,
)

r = redis.Redis(connection_pool=pool)

# Basic operations
r.set("key", "value", ex=3600)
value = r.get("key")

# Pipeline
pipe = r.pipeline(transaction=False)  # Non-transactional pipeline
for i in range(1000):
    pipe.set(f"key:{i}", f"value:{i}")
pipe.execute()

# Pub/Sub
pubsub = r.pubsub()
pubsub.subscribe("channel")
for message in pubsub.listen():
    if message["type"] == "message":
        data = json.loads(message["data"])
        process(data)
```

---

## 14. Rate Limiting with Sorted Sets

```typescript
// Sliding window rate limiter
async function isRateLimited(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ limited: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Atomic operation using pipeline
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, "-inf", windowStart);  // Remove old entries
  pipeline.zadd(key, now, `${now}-${Math.random()}`);   // Add current request
  pipeline.zcard(key);                                    // Count requests in window
  pipeline.expire(key, windowSeconds);                    // Set key expiry

  const results = await pipeline.exec();
  const requestCount = results[2][1] as number;

  return {
    limited: requestCount > maxRequests,
    remaining: Math.max(0, maxRequests - requestCount),
    resetAt: now + windowSeconds * 1000,
  };
}

// Usage
const { limited, remaining } = await isRateLimited("user:1001", 100, 60);
if (limited) {
  return new Response("Too Many Requests", {
    status: 429,
    headers: { "X-RateLimit-Remaining": String(remaining) },
  });
}
```

---

## 15. Common Anti-Patterns

### Using KEYS in Production

```redis
# BAD: KEYS blocks the server, scans all keys
KEYS user:*

# GOOD: Use SCAN for iterating keys (non-blocking, cursor-based)
SCAN 0 MATCH user:* COUNT 100
```

### Storing Large Values

```
# BAD: Storing 10 MB JSON blobs in a single key
# Causes network latency, memory fragmentation, slow serialization

# GOOD: Break into smaller pieces
# Store summary in a hash, details in separate keys
# Use RedisJSON for nested document access without full deserialization
```

### No TTL on Cache Keys

```typescript
// BAD: Cache without expiration (memory leak)
await redis.set("cache:data", value);

// GOOD: Always set TTL on cache entries
await redis.set("cache:data", value, "EX", 3600);
```

### Hot Keys

```
# BAD: Single key receiving massive traffic (e.g., global counter)
INCR global:page_views

# GOOD: Shard the hot key
INCR global:page_views:{shard_id}    # shard_id = hash(request_id) % N
# Periodically aggregate shards
```

---

## 16. Critical Reminders

### ALWAYS

- Set `maxmemory` and an eviction policy in production
- Use connection pooling (never create a connection per request)
- Set TTL on all cache keys
- Use `SCAN` instead of `KEYS` for iteration
- Use pipelining for batch operations
- Handle connection errors and implement retry logic
- Use Lua scripts for operations that must be atomic
- Use hash tags in Cluster mode for multi-key operations
- Monitor memory usage, hit rate, and slow log
- Close connections gracefully on application shutdown

### NEVER

- Use `KEYS *` in production (blocks the server)
- Store values larger than 1 MB in a single key without good reason
- Use Redis as a primary database without persistence configuration
- Forget to handle `MOVED` and `ASK` redirections in Cluster mode
- Use `FLUSHALL` or `FLUSHDB` in production without extreme caution
- Leave `maxmemory` unset in production (Redis will use all available RAM)
- Assume pub/sub messages are durable (they are fire-and-forget)
- Use blocking commands (`BLPOP`, `BRPOP`) without timeouts
- Store secrets or sensitive data without encryption
