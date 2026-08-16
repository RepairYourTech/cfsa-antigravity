---
name: sqlite
description: "Expert SQLite development guide covering when to use SQLite, WAL mode, PRAGMA tuning, full-text search (FTS5), JSON support, window functions, CTEs, better-sqlite3 (Node.js), LMDB comparison, Turso/libSQL for distributed SQLite, Litestream for replication, database-per-tenant patterns, testing with in-memory SQLite, file locking, backup strategies, and migration patterns."
version: 1.0.0
---

# SQLite Expert

## 1. When to Use SQLite

### Ideal Use Cases

```
Edge computing        -- Embedded in IoT devices, Cloudflare Workers (D1), edge functions
Embedded apps         -- Desktop apps (Electron), mobile apps (iOS, Android)
CLI tools             -- Local data storage for command-line applications
Testing               -- In-memory databases as test doubles for PostgreSQL/MySQL
Single-server apps    -- Web apps with moderate traffic on a single server
Prototyping           -- Rapid development before migrating to a client-server DB
Data analysis         -- Ad-hoc queries on local datasets, CSV/JSON imports
Configuration stores  -- Application settings, feature flags, local state
Personal projects     -- Blogs, small SaaS, internal tools with < 100K daily requests
```

### When NOT to Use SQLite

```
High write concurrency   -- Many concurrent writers (SQLite serializes writes)
Multi-server deployments -- Multiple app servers writing to the same database
Very large datasets      -- Databases approaching 281 TB limit (practical limit is lower)
Client-server needs      -- When multiple applications must access the same database over a network
Real-time replication    -- Built-in replication does not exist (use Turso/Litestream as workarounds)
Heavy analytics          -- OLAP workloads with full table scans on 100M+ rows
```

### Capacity Guidelines

```
Max database size:    281 TB (theoretical), practical limit depends on filesystem
Max row size:         1 GB (default page size limits practical row size)
Max columns per table: 2000
Concurrent readers:   Unlimited (with WAL mode)
Concurrent writers:   1 at a time (writes are serialized)
Typical sweet spot:   < 1 TB database, < 100K writes/day, unlimited reads
```

---

## 2. WAL Mode

Write-Ahead Logging mode is essential for production SQLite. It allows concurrent reads during writes and improves performance significantly.

```sql
-- Enable WAL mode (do this once, it persists across connections)
PRAGMA journal_mode = WAL;

-- Check current journal mode
PRAGMA journal_mode;
```

### How WAL Works

```
Default (DELETE) mode:
  - Writes lock the entire database
  - Readers blocked during writes
  - Safe but slow

WAL mode:
  - Writes go to a separate WAL file
  - Readers see the last committed state (snapshot isolation)
  - Multiple readers can run concurrently with one writer
  - WAL file is periodically checkpointed (merged back into main DB)
```

### WAL Configuration

```sql
-- Auto-checkpoint threshold (pages, default 1000)
-- Set to 0 to disable auto-checkpoint (manual control)
PRAGMA wal_autocheckpoint = 1000;

-- Manual checkpoint
PRAGMA wal_checkpoint(TRUNCATE);   -- Checkpoint and truncate WAL file
PRAGMA wal_checkpoint(PASSIVE);    -- Checkpoint without blocking
PRAGMA wal_checkpoint(FULL);       -- Checkpoint, block new writers until done
```

### WAL Caveats

```
- WAL file can grow large if checkpoints are infrequent or long transactions hold a snapshot
- WAL mode does not work over network filesystems (NFS, SMB)
- WAL mode creates two extra files: .db-wal and .db-shm
- All three files (.db, .db-wal, .db-shm) must be backed up together
- WAL mode is slightly slower for write-heavy workloads with no concurrent reads
```

---

## 3. PRAGMA Settings for Performance

```sql
-- Essential production PRAGMAs (run at connection open)
PRAGMA journal_mode = WAL;          -- Write-ahead logging
PRAGMA synchronous = NORMAL;        -- Balance between safety and speed
PRAGMA cache_size = -64000;         -- 64 MB page cache (negative = KB)
PRAGMA foreign_keys = ON;           -- Enforce foreign key constraints
PRAGMA busy_timeout = 5000;         -- Wait 5 seconds for locks instead of failing immediately
PRAGMA temp_store = MEMORY;         -- Store temp tables in memory
PRAGMA mmap_io = 268435456;         -- Memory-map up to 256 MB of the database file

-- Analysis and optimization
PRAGMA optimize;                    -- Run on connection close (SQLite 3.18+)
ANALYZE;                            -- Update query planner statistics
```

### PRAGMA Reference

```
journal_mode:
  DELETE   -- Default. Delete journal after commit. Safest, slowest.
  WAL      -- Write-ahead log. Best for concurrent reads. Recommended.
  MEMORY   -- Journal in memory. Fast but not crash-safe.
  OFF      -- No journal. Fastest, no crash recovery. Testing only.

synchronous:
  FULL     -- Sync after every write. Slowest, safest.
  NORMAL   -- Sync at critical moments. Good balance. Recommended with WAL.
  OFF      -- No syncing. Fastest. Data loss on power failure.

cache_size:
  Positive -- Number of pages (default page size 4096 bytes)
  Negative -- Size in KB (e.g., -64000 = 64 MB)

busy_timeout:
  0        -- Return SQLITE_BUSY immediately (default)
  N        -- Wait N milliseconds for the lock before returning SQLITE_BUSY

temp_store:
  DEFAULT  -- Use compile-time default
  FILE     -- Temp data on disk
  MEMORY   -- Temp data in memory (faster for temp tables and sorting)
```

---

## 4. Full-Text Search (FTS5)

```sql
-- Create an FTS5 virtual table
CREATE VIRTUAL TABLE articles_fts USING fts5(
  title,
  body,
  tags,
  content='articles',          -- Content table (external content FTS)
  content_rowid='id',          -- Map to the real table's rowid
  tokenize='porter unicode61'  -- Porter stemmer + Unicode tokenizer
);

-- Populate FTS index from existing data
INSERT INTO articles_fts(articles_fts) VALUES('rebuild');

-- Keep FTS in sync with triggers
CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, body, tags)
  VALUES (new.id, new.title, new.body, new.tags);
END;

CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, body, tags)
  VALUES ('delete', old.id, old.title, old.body, old.tags);
END;

CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, body, tags)
  VALUES ('delete', old.id, old.title, old.body, old.tags);
  INSERT INTO articles_fts(rowid, title, body, tags)
  VALUES (new.id, new.title, new.body, new.tags);
END;

-- Search queries
SELECT a.*, rank
FROM articles_fts
JOIN articles a ON a.id = articles_fts.rowid
WHERE articles_fts MATCH 'sqlite AND performance'
ORDER BY rank;

-- Phrase search
SELECT * FROM articles_fts WHERE articles_fts MATCH '"full text search"';

-- Column-specific search
SELECT * FROM articles_fts WHERE articles_fts MATCH 'title:sqlite OR body:optimization';

-- Prefix search
SELECT * FROM articles_fts WHERE articles_fts MATCH 'optim*';

-- NEAR operator
SELECT * FROM articles_fts WHERE articles_fts MATCH 'NEAR(sqlite performance, 5)';

-- BM25 ranking (built into FTS5)
SELECT *, bm25(articles_fts, 10.0, 1.0, 5.0) AS score
FROM articles_fts
WHERE articles_fts MATCH 'database optimization'
ORDER BY score;
-- Weights: title=10, body=1, tags=5

-- Highlight snippets
SELECT highlight(articles_fts, 1, '<mark>', '</mark>') AS snippet
FROM articles_fts
WHERE articles_fts MATCH 'sqlite';

-- Snippet with context
SELECT snippet(articles_fts, 1, '<mark>', '</mark>', '...', 20) AS snippet
FROM articles_fts
WHERE articles_fts MATCH 'sqlite';
```

---

## 5. JSON Support

```sql
-- SQLite has built-in JSON functions (3.9+) and JSON operators (3.38+)

-- Create a table with JSON data
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  data JSON NOT NULL DEFAULT '{}'
);

-- Insert JSON data
INSERT INTO products (name, data) VALUES (
  'Widget',
  '{"price": 29.99, "specs": {"weight": 1.5, "color": "blue"}, "tags": ["sale", "featured"]}'
);

-- Extract values with json_extract()
SELECT
  name,
  json_extract(data, '$.price') AS price,
  json_extract(data, '$.specs.weight') AS weight,
  json_extract(data, '$.specs.color') AS color
FROM products;

-- Arrow operators (3.38+)
SELECT
  name,
  data ->> '$.price' AS price,        -- Extract as SQL value (text, int, float)
  data -> '$.specs' AS specs           -- Extract as JSON string
FROM products;

-- Query JSON arrays
SELECT * FROM products
WHERE EXISTS (
  SELECT 1 FROM json_each(json_extract(data, '$.tags'))
  WHERE value = 'sale'
);

-- json_each: expand JSON array to rows
SELECT p.name, tag.value AS tag
FROM products p, json_each(json_extract(p.data, '$.tags')) tag;

-- json_tree: recursively expand JSON
SELECT * FROM json_tree('{"a": {"b": [1, 2, 3]}}');

-- Modify JSON
UPDATE products
SET data = json_set(data, '$.price', 24.99)
WHERE id = 1;

UPDATE products
SET data = json_insert(data, '$.inStock', true)
WHERE id = 1;

UPDATE products
SET data = json_remove(data, '$.tags[0]')
WHERE id = 1;

-- JSON aggregation
SELECT json_group_array(name) AS names FROM products;
SELECT json_group_object(name, json_extract(data, '$.price')) AS price_map FROM products;

-- Index on JSON value (generated column approach)
ALTER TABLE products ADD COLUMN price_indexed REAL
  GENERATED ALWAYS AS (json_extract(data, '$.price')) STORED;
CREATE INDEX idx_products_price ON products (price_indexed);
```

---

## 6. Window Functions

```sql
-- ROW_NUMBER, RANK, DENSE_RANK
SELECT
  name,
  category,
  price,
  ROW_NUMBER() OVER (ORDER BY price DESC) AS row_num,
  RANK() OVER (ORDER BY price DESC) AS rank,
  DENSE_RANK() OVER (ORDER BY price DESC) AS dense_rank
FROM products;

-- Partitioned ranking
SELECT
  name,
  category,
  price,
  ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rank_in_category
FROM products;

-- Running totals
SELECT
  date,
  revenue,
  SUM(revenue) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM daily_revenue;

-- Moving average
SELECT
  date,
  revenue,
  AVG(revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS avg_7day
FROM daily_revenue;

-- LAG and LEAD (previous/next row values)
SELECT
  date,
  revenue,
  LAG(revenue, 1) OVER (ORDER BY date) AS prev_day_revenue,
  LEAD(revenue, 1) OVER (ORDER BY date) AS next_day_revenue,
  revenue - LAG(revenue, 1) OVER (ORDER BY date) AS day_over_day_change
FROM daily_revenue;

-- FIRST_VALUE and LAST_VALUE
SELECT
  name,
  category,
  price,
  FIRST_VALUE(name) OVER (PARTITION BY category ORDER BY price DESC) AS most_expensive,
  price * 1.0 / FIRST_VALUE(price) OVER (PARTITION BY category ORDER BY price DESC) AS pct_of_max
FROM products;

-- NTILE (divide into buckets)
SELECT
  name,
  price,
  NTILE(4) OVER (ORDER BY price) AS price_quartile
FROM products;
```

---

## 7. CTEs (Common Table Expressions)

```sql
-- Basic CTE for readability
WITH active_users AS (
  SELECT id, name, email
  FROM users
  WHERE active = 1
),
recent_orders AS (
  SELECT user_id, COUNT(*) AS order_count, SUM(total) AS total_spent
  FROM orders
  WHERE created_at > datetime('now', '-30 days')
  GROUP BY user_id
)
SELECT
  au.name,
  au.email,
  COALESCE(ro.order_count, 0) AS orders,
  COALESCE(ro.total_spent, 0) AS spent
FROM active_users au
LEFT JOIN recent_orders ro ON ro.user_id = au.id
ORDER BY spent DESC;

-- Recursive CTE: hierarchical data (org chart, categories, threads)
WITH RECURSIVE category_tree AS (
  -- Base case: root categories
  SELECT id, name, parent_id, 0 AS depth, name AS path
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  -- Recursive case: child categories
  SELECT c.id, c.name, c.parent_id, ct.depth + 1, ct.path || ' > ' || c.name
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY path;

-- Recursive CTE: generate a date series
WITH RECURSIVE dates AS (
  SELECT date('2025-01-01') AS d
  UNION ALL
  SELECT date(d, '+1 day')
  FROM dates
  WHERE d < date('2025-01-31')
)
SELECT d AS date, COALESCE(r.revenue, 0) AS revenue
FROM dates
LEFT JOIN daily_revenue r ON r.date = dates.d;
```

---

## 8. better-sqlite3 (Node.js)

### Setup and Configuration

```typescript
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(process.env.DB_PATH || "./data/app.db");

// Open database with recommended options
const db = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
  fileMustExist: false,   // Create if not exists
});

// Apply production PRAGMAs
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("cache_size = -64000");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
db.pragma("temp_store = MEMORY");

// Enable optimize on close
process.on("exit", () => {
  db.pragma("optimize");
  db.close();
});

// Graceful shutdown
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
```

### CRUD Operations

```typescript
// Prepared statements (compiled once, executed many times -- much faster)
const insertUser = db.prepare(`
  INSERT INTO users (name, email, created_at)
  VALUES (@name, @email, datetime('now'))
`);

const getUserById = db.prepare(`
  SELECT * FROM users WHERE id = ?
`);

const getUsersByStatus = db.prepare(`
  SELECT * FROM users WHERE active = ? ORDER BY created_at DESC LIMIT ?
`);

const updateUser = db.prepare(`
  UPDATE users SET name = @name, email = @email WHERE id = @id
`);

const deleteUser = db.prepare(`
  DELETE FROM users WHERE id = ?
`);

// Execute
const result = insertUser.run({ name: "Alice", email: "alice@example.com" });
console.log("Inserted ID:", result.lastInsertRowid);
console.log("Changes:", result.changes);

const user = getUserById.get(1);  // Returns a single row or undefined
const users = getUsersByStatus.all(1, 20);  // Returns array of rows

updateUser.run({ id: 1, name: "Alice Smith", email: "alice@example.com" });
deleteUser.run(1);
```

### Transactions

```typescript
// Transactions in better-sqlite3 are synchronous and fast
const transferFunds = db.transaction((fromId: number, toId: number, amount: number) => {
  const from = db.prepare("SELECT balance FROM accounts WHERE id = ?").get(fromId);
  if (!from || from.balance < amount) {
    throw new Error("Insufficient funds");
  }

  db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amount, fromId);
  db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amount, toId);

  return { fromId, toId, amount };
});

// Transactions automatically rollback on error
try {
  const result = transferFunds(1, 2, 100);
  console.log("Transfer complete:", result);
} catch (err) {
  console.error("Transfer failed:", err.message);
}

// Bulk insert (wrap in transaction for massive speedup)
const insertMany = db.transaction((items: { name: string; value: number }[]) => {
  const stmt = db.prepare("INSERT INTO items (name, value) VALUES (@name, @value)");
  for (const item of items) {
    stmt.run(item);
  }
  return items.length;
});

// Without transaction: ~50 inserts/second
// With transaction: ~50,000 inserts/second
const count = insertMany(largeArray);
```

### Custom Functions

```typescript
// Register custom SQL functions
db.function("generate_slug", (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
});

// Use in queries
db.prepare("INSERT INTO posts (title, slug) VALUES (?, generate_slug(?))").run(title, title);

// Aggregate function
db.aggregate("median", {
  start: () => [] as number[],
  step: (acc: number[], value: number) => {
    acc.push(value);
  },
  result: (acc: number[]) => {
    acc.sort((a, b) => a - b);
    const mid = Math.floor(acc.length / 2);
    return acc.length % 2 === 0 ? (acc[mid - 1] + acc[mid]) / 2 : acc[mid];
  },
});

const result = db.prepare("SELECT median(price) AS median_price FROM products").get();
```

---

## 9. Turso / libSQL (Distributed SQLite)

### What It Is

```
Turso is a hosted SQLite-compatible database built on libSQL (a fork of SQLite):
  - Edge deployment: database replicas close to users worldwide
  - Embedded replicas: sync a local SQLite copy for zero-latency reads
  - HTTP API: access from serverless environments (no persistent connections needed)
  - SQLite compatibility: use standard SQLite syntax and tools
  - Multi-tenancy: one database per tenant, or shared database with RLS
```

### Client Usage

```typescript
import { createClient } from "@libsql/client";

// Remote connection (Turso hosted)
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,    // libsql://mydb-myorg.turso.io
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Embedded replica (local copy with remote sync)
const db = createClient({
  url: "file:./local-replica.db",
  syncUrl: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncInterval: 60,  // Sync every 60 seconds
});

// Queries
const result = await db.execute("SELECT * FROM users WHERE active = ?", [true]);
console.log(result.rows);

// Batch (transaction)
await db.batch([
  { sql: "INSERT INTO users (name, email) VALUES (?, ?)", args: ["Alice", "alice@example.com"] },
  { sql: "INSERT INTO audit_log (action, user_email) VALUES (?, ?)", args: ["user_created", "alice@example.com"] },
], "write");

// Interactive transaction
const tx = await db.transaction("write");
try {
  await tx.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", [100, fromId]);
  await tx.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", [100, toId]);
  await tx.commit();
} catch {
  await tx.rollback();
}
```

---

## 10. Litestream (Continuous Replication)

### What It Is

```
Litestream continuously replicates a SQLite database to S3-compatible storage:
  - Streaming WAL replication (near real-time, sub-second lag)
  - Point-in-time recovery
  - No changes to application code required
  - Works with any SQLite database
  - Restore to any point in time within retention period
```

### Configuration

```yaml
# litestream.yml
dbs:
  - path: /data/app.db
    replicas:
      - type: s3
        bucket: my-backup-bucket
        path: app-db
        region: us-west-2
        access-key-id: ${AWS_ACCESS_KEY_ID}
        secret-access-key: ${AWS_SECRET_ACCESS_KEY}
        retention: 720h          # Keep 30 days of WAL segments
        retention-check-interval: 1h
        sync-interval: 1s        # Replicate every second

      # Multiple replicas supported
      - type: abs               # Azure Blob Storage
        bucket: my-container
        path: app-db
        account-name: ${AZURE_ACCOUNT_NAME}
        account-key: ${AZURE_ACCOUNT_KEY}
```

### Commands

```bash
# Start replication (runs as a daemon alongside your app)
litestream replicate -config litestream.yml

# Restore from replica
litestream restore -config litestream.yml -o /data/restored.db /data/app.db

# Restore to a specific point in time
litestream restore -config litestream.yml -timestamp "2025-02-15T10:30:00Z" -o /data/restored.db /data/app.db

# List available snapshots and WAL segments
litestream snapshots -config litestream.yml /data/app.db
litestream wal -config litestream.yml /data/app.db
```

### Dockerfile Pattern

```dockerfile
FROM node:20-slim

# Install Litestream
RUN apt-get update && apt-get install -y wget && \
    wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.deb && \
    dpkg -i litestream-v0.3.13-linux-amd64.deb && \
    rm litestream-v0.3.13-linux-amd64.deb

COPY litestream.yml /etc/litestream.yml
COPY . /app
WORKDIR /app

# Restore database on startup, then run app with replication
CMD ["sh", "-c", "litestream restore -if-db-not-exists -config /etc/litestream.yml /data/app.db && litestream replicate -config /etc/litestream.yml -exec 'node server.js'"]
```

---

## 11. Database-per-Tenant Pattern

```typescript
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const TENANT_DB_DIR = path.resolve("./data/tenants");

// Cache open database connections
const dbPool = new Map<string, Database.Database>();

function getTenantDB(tenantId: string): Database.Database {
  // Validate tenant ID (prevent path traversal)
  if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    throw new Error("Invalid tenant ID");
  }

  if (dbPool.has(tenantId)) {
    return dbPool.get(tenantId)!;
  }

  const dbPath = path.join(TENANT_DB_DIR, `${tenantId}.db`);
  const isNew = !fs.existsSync(dbPath);

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  if (isNew) {
    // Run migrations for new tenant
    applyMigrations(db);
  }

  dbPool.set(tenantId, db);
  return db;
}

function closeTenantDB(tenantId: string): void {
  const db = dbPool.get(tenantId);
  if (db) {
    db.pragma("optimize");
    db.close();
    dbPool.delete(tenantId);
  }
}

// Close all on shutdown
function closeAllTenantDBs(): void {
  for (const [tenantId] of dbPool) {
    closeTenantDB(tenantId);
  }
}

process.on("exit", closeAllTenantDBs);
```

### Benefits and Trade-offs

```
Benefits:
  - Complete data isolation between tenants
  - Easy to backup, restore, or delete a single tenant's data
  - Easy to move a tenant to a different server
  - No noisy neighbor problems (one tenant's queries do not affect others)
  - Different tenants can run different schema versions during migrations
  - Simple per-tenant data export (just copy the .db file)

Trade-offs:
  - More files to manage (one .db + .db-wal + .db-shm per tenant)
  - Cross-tenant queries require opening multiple databases
  - Connection pool management (open file descriptor limits)
  - Schema migrations must be applied to every tenant database
  - Monitoring and alerting is more complex
```

---

## 12. Testing with In-Memory SQLite

```typescript
import Database from "better-sqlite3";

function createTestDB(): Database.Database {
  const db = new Database(":memory:");  // In-memory, no disk I/O
  db.pragma("foreign_keys = ON");

  // Apply schema
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total REAL NOT NULL CHECK (total >= 0),
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_orders_user_id ON orders (user_id);
    CREATE INDEX idx_orders_status ON orders (status);
  `);

  return db;
}

// Vitest example
import { describe, it, expect, beforeEach } from "vitest";

describe("User Repository", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDB();  // Fresh database per test (fast, isolated)
  });

  it("should create a user", () => {
    const stmt = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
    const result = stmt.run("Alice", "alice@example.com");
    expect(result.lastInsertRowid).toBe(1);
    expect(result.changes).toBe(1);
  });

  it("should enforce unique email", () => {
    const stmt = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
    stmt.run("Alice", "alice@example.com");
    expect(() => stmt.run("Bob", "alice@example.com")).toThrow(/UNIQUE constraint failed/);
  });

  it("should cascade delete orders when user is deleted", () => {
    db.prepare("INSERT INTO users (name, email) VALUES (?, ?)").run("Alice", "alice@example.com");
    db.prepare("INSERT INTO orders (user_id, total) VALUES (?, ?)").run(1, 49.99);
    db.prepare("INSERT INTO orders (user_id, total) VALUES (?, ?)").run(1, 29.99);

    db.prepare("DELETE FROM users WHERE id = ?").run(1);

    const orders = db.prepare("SELECT * FROM orders WHERE user_id = ?").all(1);
    expect(orders).toHaveLength(0);
  });
});
```

### Using SQLite as a PostgreSQL Test Double

```typescript
// If your production DB is PostgreSQL, you can use SQLite for fast unit tests.
// Key differences to account for:
//
// 1. Type system: SQLite is dynamically typed, PostgreSQL is strict
// 2. Date functions: datetime('now') vs now(), date arithmetic differs
// 3. String functions: Some PostgreSQL functions do not exist in SQLite
// 4. RETURNING clause: SQLite 3.35+ supports RETURNING
// 5. UPSERT: SQLite supports ON CONFLICT, syntax is slightly different
// 6. JSON: SQLite uses json_extract(), PostgreSQL uses -> and ->>
//
// Strategy: Write a thin adapter layer that translates between the two.
// Use SQLite for fast unit tests, PostgreSQL for integration tests.
```

---

## 13. File Locking

```
SQLite uses file-level locking to manage concurrent access:

Lock levels (in order of escalation):
  UNLOCKED    -- No lock held
  SHARED      -- Reading, multiple readers allowed
  RESERVED    -- Planning to write, one writer allowed, readers continue
  PENDING     -- Waiting for readers to finish before writing
  EXCLUSIVE   -- Writing, no other access allowed

WAL mode changes this significantly:
  - Readers never block writers
  - Writers never block readers
  - Only one writer at a time (other writers wait based on busy_timeout)

Common SQLITE_BUSY errors:
  - Multiple processes writing simultaneously
  - Long-running read transactions holding a snapshot
  - WAL file growing because a reader holds an old snapshot

Solutions:
  - Set PRAGMA busy_timeout = 5000 (wait before failing)
  - Keep write transactions short
  - Use a single write connection and multiple read connections
  - In WAL mode, close long-running read transactions promptly
```

### Connection Pool Pattern

```typescript
import Database from "better-sqlite3";

class SQLitePool {
  private writer: Database.Database;
  private readers: Database.Database[];
  private readerIndex = 0;

  constructor(dbPath: string, readerCount = 4) {
    // Single writer connection
    this.writer = new Database(dbPath);
    this.writer.pragma("journal_mode = WAL");
    this.writer.pragma("synchronous = NORMAL");
    this.writer.pragma("foreign_keys = ON");
    this.writer.pragma("busy_timeout = 5000");

    // Multiple reader connections
    this.readers = Array.from({ length: readerCount }, () => {
      const reader = new Database(dbPath, { readonly: true });
      reader.pragma("cache_size = -32000");
      return reader;
    });
  }

  getWriter(): Database.Database {
    return this.writer;
  }

  getReader(): Database.Database {
    const reader = this.readers[this.readerIndex % this.readers.length];
    this.readerIndex++;
    return reader;
  }

  close(): void {
    this.writer.pragma("optimize");
    this.writer.close();
    for (const reader of this.readers) {
      reader.close();
    }
  }
}
```

---

## 14. Backup Strategies

```bash
# Online backup using SQLite's backup API (safe with concurrent access)
sqlite3 /data/app.db ".backup /backups/app-$(date +%Y%m%d-%H%M%S).db"

# With better-sqlite3 in Node.js:
```

```typescript
const db = new Database("/data/app.db");

// Backup to a file
db.backup("/backups/app-backup.db")
  .then(() => console.log("Backup complete"))
  .catch((err) => console.error("Backup failed:", err));

// Backup with progress
await db.backup("/backups/app-backup.db", {
  progress({ totalPages, remainingPages }) {
    const pct = ((totalPages - remainingPages) / totalPages * 100).toFixed(1);
    console.log(`Backup progress: ${pct}%`);
    return 200;  // Sleep 200ms between steps (reduce I/O pressure)
  },
});
```

```bash
# NEVER just copy the .db file while the database is in use
# The .db-wal file may contain uncommitted data

# If you must copy files, checkpoint first:
sqlite3 /data/app.db "PRAGMA wal_checkpoint(TRUNCATE);"
# Then copy the .db file (WAL is now empty)

# For continuous backup, use Litestream (see section 10)
```

---

## 15. Migration Patterns

```typescript
interface Migration {
  version: number;
  description: string;
  up: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: "Create users table",
    up: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
  {
    version: 2,
    description: "Create orders table",
    up: `
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total REAL NOT NULL CHECK (total >= 0),
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_orders_user_id ON orders (user_id);
    `,
  },
  {
    version: 3,
    description: "Add phone column to users",
    up: `
      ALTER TABLE users ADD COLUMN phone TEXT;
    `,
  },
];

function applyMigrations(db: Database.Database): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const currentVersion = db.prepare(
    "SELECT COALESCE(MAX(version), 0) AS version FROM _migrations"
  ).get() as { version: number };

  const pending = migrations.filter((m) => m.version > currentVersion.version);

  if (pending.length === 0) {
    return;
  }

  const applyAll = db.transaction(() => {
    for (const migration of pending) {
      db.exec(migration.up);
      db.prepare(
        "INSERT INTO _migrations (version, description) VALUES (?, ?)"
      ).run(migration.version, migration.description);
      console.log(`Applied migration ${migration.version}: ${migration.description}`);
    }
  });

  applyAll();
}
```

---

## 16. Common Anti-Patterns

### Missing WAL Mode

```typescript
// BAD: Default journal mode (readers blocked during writes)
const db = new Database("app.db");

// GOOD: Enable WAL for concurrent access
const db = new Database("app.db");
db.pragma("journal_mode = WAL");
```

### Missing busy_timeout

```typescript
// BAD: No busy timeout (SQLITE_BUSY errors on contention)
const db = new Database("app.db");

// GOOD: Wait for locks instead of failing immediately
const db = new Database("app.db");
db.pragma("busy_timeout = 5000");
```

### Unbatched Inserts

```typescript
// BAD: 10,000 individual transactions (~50 inserts/second)
for (const item of items) {
  db.prepare("INSERT INTO items (name) VALUES (?)").run(item.name);
}

// GOOD: Single transaction (~50,000 inserts/second)
const insertAll = db.transaction((items: { name: string }[]) => {
  const stmt = db.prepare("INSERT INTO items (name) VALUES (?)");
  for (const item of items) {
    stmt.run(item.name);
  }
});
insertAll(items);
```

### Using SQLite Over NFS

```
# BAD: SQLite on a network filesystem
# WAL mode does not work, file locking is unreliable, data corruption risk

# GOOD: Keep the database on a local filesystem
# Use Turso or Litestream if you need remote access or replication
```

---

## 17. Critical Reminders

### ALWAYS

- Enable WAL mode for any production use
- Set `PRAGMA foreign_keys = ON` (it is off by default)
- Set `PRAGMA busy_timeout` to a reasonable value (e.g., 5000 ms)
- Use prepared statements (compiled once, faster execution)
- Wrap bulk operations in transactions (orders of magnitude faster)
- Use parameterized queries -- never interpolate user input into SQL
- Run `PRAGMA optimize` periodically or on connection close
- Back up using the SQLite backup API or Litestream, not file copy
- Close database connections on application shutdown
- Validate tenant IDs when using database-per-tenant pattern (prevent path traversal)

### NEVER

- Copy a `.db` file while the database is in use (use backup API instead)
- Use SQLite over a network filesystem (NFS, SMB, CIFS)
- Assume SQLite supports concurrent writes (it serializes them)
- Skip foreign key PRAGMA (it is disabled by default, constraints will not be enforced)
- Insert thousands of rows without a wrapping transaction
- Store the database in a temporary or world-writable directory
- Use `PRAGMA synchronous = OFF` in production (data loss on crash)
- Ignore the `.db-wal` and `.db-shm` files during backup
- Use SQLite as a message queue with high concurrency (use Redis or a proper queue)
