---
name: postgresql
description: "Expert PostgreSQL guide covering schema design, index strategies, query optimization, connection pooling, migrations, row-level security, JSONB, and full-text search. Use when designing database schemas, writing complex queries, optimizing performance, or integrating PostgreSQL with TypeScript applications."
version: 1.0.0
---

# PostgreSQL Expert

## 1. Schema Design Patterns

### Normalization vs Denormalization

**Normalize** when data integrity matters more than read speed. **Denormalize** when read performance is critical and you control write paths.

```sql
-- Normalized: data integrity, no duplication, slower reads with joins
CREATE TABLE users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total      numeric(12,2) NOT NULL CHECK (total >= 0),
  status     text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity   int NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0)
);

-- Denormalized: faster reads, requires maintaining consistency on writes
CREATE TABLE order_summaries (
  order_id    uuid PRIMARY KEY REFERENCES orders(id),
  user_email  text NOT NULL,               -- duplicated from users
  item_count  int NOT NULL DEFAULT 0,      -- computed from order_items
  total       numeric(12,2) NOT NULL,      -- duplicated from orders
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

**Decision guide**: Use normalized tables as your source of truth. Create materialized views or denormalized read tables only when you have measured query latency problems with joins.

### Enum Types vs Check Constraints

```sql
-- Enum type: compile-time safety, harder to migrate (requires ALTER TYPE)
CREATE TYPE order_status AS ENUM ('pending','confirmed','shipped','delivered','cancelled');
ALTER TABLE orders ALTER COLUMN status TYPE order_status USING status::order_status;

-- Check constraint: easier to modify, no type dependency
ALTER TABLE orders ADD CONSTRAINT valid_status
  CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled'));
```

**Prefer check constraints** for values that change over time. **Use enums** for truly stable domain values.

### Partitioning

```sql
-- Range partitioning for time-series data
CREATE TABLE events (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2025_q1 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE events_2025_q2 PARTITION OF events
  FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- Partition pruning happens automatically when queries filter on created_at
SELECT * FROM events WHERE created_at >= '2025-02-01' AND created_at < '2025-03-01';
```

---

## 2. Index Types and Strategy

### B-tree (Default)

Best for equality and range queries. Used for `=`, `<`, `>`, `<=`, `>=`, `BETWEEN`, `IN`, `IS NULL`, `ORDER BY`.

```sql
CREATE INDEX idx_users_email ON users (email);
CREATE UNIQUE INDEX idx_users_email_unique ON users (lower(email));
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);
```

### GIN (Generalized Inverted Index)

Best for composite values: arrays, JSONB, full-text search.

```sql
-- JSONB containment queries
CREATE INDEX idx_products_attrs ON products USING GIN (attributes);
-- Enables: SELECT * FROM products WHERE attributes @> '{"color": "red"}';

-- Array contains
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
-- Enables: SELECT * FROM posts WHERE tags @> ARRAY['postgresql'];

-- Full-text search
CREATE INDEX idx_articles_search ON articles USING GIN (to_tsvector('english', title || ' ' || body));
```

### GiST (Generalized Search Tree)

Best for geometric data, ranges, and nearest-neighbor searches.

```sql
-- Range overlap queries
CREATE INDEX idx_bookings_during ON bookings USING GIST (tstzrange(start_at, end_at));
-- Enables: SELECT * FROM bookings WHERE tstzrange(start_at, end_at) && tstzrange('2025-03-01', '2025-03-08');

-- PostGIS geographic queries
CREATE INDEX idx_locations_geo ON locations USING GIST (coordinates);
```

### BRIN (Block Range Index)

Best for physically ordered data (time-series, append-only tables). Tiny index size.

```sql
-- Perfect for append-only time-series where rows are inserted in order
CREATE INDEX idx_events_created ON events USING BRIN (created_at);
-- 1000x smaller than B-tree on large tables, nearly as fast for range scans
```

### Partial Indexes

Index only the rows you query. Saves space, improves write performance.

```sql
-- Only index active users (90% of queries filter on active = true)
CREATE INDEX idx_active_users ON users (email) WHERE active = true;

-- Only index pending orders
CREATE INDEX idx_pending_orders ON orders (created_at) WHERE status = 'pending';
```

### Index Anti-Patterns

```sql
-- BAD: Indexing low-cardinality boolean columns alone
CREATE INDEX idx_users_active ON users (active);  -- Only 2 values, rarely selective

-- BAD: Too many indexes on write-heavy tables
-- Each INSERT/UPDATE/DELETE must update every index

-- BAD: Redundant indexes
CREATE INDEX idx_a ON orders (user_id);
CREATE INDEX idx_b ON orders (user_id, created_at);  -- idx_a is redundant, idx_b covers it

-- BAD: Indexing expressions differently than queried
CREATE INDEX idx_email ON users (email);
SELECT * FROM users WHERE lower(email) = 'test@example.com';  -- Index NOT used
-- FIX:
CREATE INDEX idx_email_lower ON users (lower(email));
```

---

## 3. Query Optimization

### EXPLAIN ANALYZE

Always check actual execution, not just the plan.

```sql
-- Show actual timing and row counts
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
  SELECT u.email, count(o.id) as order_count
  FROM users u
  JOIN orders o ON o.user_id = u.id
  WHERE u.created_at > '2025-01-01'
  GROUP BY u.email
  ORDER BY order_count DESC
  LIMIT 10;

-- Key things to look for in output:
-- 1. Seq Scan on large tables (missing index?)
-- 2. Nested Loop with high row estimates (consider Hash Join)
-- 3. actual rows >> estimated rows (stale statistics, run ANALYZE)
-- 4. Buffers: shared hit vs read (cache effectiveness)
```

### CTEs (Common Table Expressions)

```sql
-- CTE for readability (PostgreSQL 12+ may inline non-recursive CTEs)
WITH active_users AS (
  SELECT id, email FROM users WHERE active = true
),
recent_orders AS (
  SELECT user_id, count(*) as cnt, sum(total) as revenue
  FROM orders
  WHERE created_at > now() - interval '30 days'
  GROUP BY user_id
)
SELECT au.email, ro.cnt, ro.revenue
FROM active_users au
JOIN recent_orders ro ON ro.user_id = au.id
ORDER BY ro.revenue DESC;

-- MATERIALIZED CTE: force separate execution (optimization fence)
WITH active_users AS MATERIALIZED (
  SELECT id FROM users WHERE active = true
)
SELECT * FROM orders WHERE user_id IN (SELECT id FROM active_users);
```

### Window Functions

```sql
-- Rank users by order count within their region
SELECT
  email,
  region,
  order_count,
  RANK() OVER (PARTITION BY region ORDER BY order_count DESC) as region_rank,
  ROW_NUMBER() OVER (ORDER BY order_count DESC) as global_rank
FROM user_stats;

-- Running total
SELECT
  date,
  revenue,
  SUM(revenue) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_total
FROM daily_revenue;

-- Moving average (7-day)
SELECT
  date,
  revenue,
  AVG(revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as avg_7day
FROM daily_revenue;
```

### Pagination

```sql
-- BAD: OFFSET-based (gets slower as offset grows)
SELECT * FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- GOOD: Cursor-based (constant performance)
SELECT * FROM products
WHERE created_at < $last_seen_created_at
ORDER BY created_at DESC
LIMIT 20;

-- For stable ordering with duplicates, use a tiebreaker
SELECT * FROM products
WHERE (created_at, id) < ($last_created_at, $last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

---

## 4. Connection Pooling

### PgBouncer Patterns

```ini
; pgbouncer.ini
[databases]
myapp = host=127.0.0.1 port=5432 dbname=myapp

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Transaction pooling: best for web apps
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

; Connection limits
server_idle_timeout = 300
server_lifetime = 3600
client_idle_timeout = 0
```

**Pool modes**:
- `session`: one server connection per client session (safest, least efficient)
- `transaction`: connection returned to pool after each transaction (best for web apps)
- `statement`: connection returned after each statement (cannot use transactions)

**Transaction pooling caveats** -- these features require session-level state and break under transaction pooling:
- `SET` commands (use `SET LOCAL` inside transactions instead)
- `LISTEN/NOTIFY`
- Prepared statements (use `DEALLOCATE ALL` or disable with `server_reset_query`)
- Advisory locks
- Temporary tables

---

## 5. Zero-Downtime Migrations

### Safe Operations

```sql
-- SAFE: Add nullable column (no table rewrite, instant)
ALTER TABLE users ADD COLUMN phone text;

-- SAFE: Add column with a non-volatile default (PG 11+, instant)
ALTER TABLE users ADD COLUMN active boolean NOT NULL DEFAULT true;

-- SAFE: Create index concurrently (no write locks)
CREATE INDEX CONCURRENTLY idx_users_phone ON users (phone);

-- SAFE: Add constraint as NOT VALID, then validate separately
ALTER TABLE orders ADD CONSTRAINT positive_total CHECK (total >= 0) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT positive_total;  -- scans table but allows writes

-- SAFE: Create enum value
ALTER TYPE order_status ADD VALUE 'refunded';
```

### Dangerous Operations (Require Lock Planning)

```sql
-- DANGEROUS: Adding NOT NULL constraint on existing column (full table scan with lock)
-- Instead, do this in steps:
-- Step 1: Add check constraint NOT VALID
ALTER TABLE users ADD CONSTRAINT users_email_not_null CHECK (email IS NOT NULL) NOT VALID;
-- Step 2: Validate (allows concurrent writes)
ALTER TABLE users VALIDATE CONSTRAINT users_email_not_null;
-- Step 3: Add NOT NULL using the existing constraint (instant in PG 12+)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
-- Step 4: Drop the now-redundant check constraint
ALTER TABLE users DROP CONSTRAINT users_email_not_null;

-- DANGEROUS: Renaming columns (breaks running application code)
-- Instead: add new column, backfill, deploy code using both, drop old column

-- DANGEROUS: Changing column type (may rewrite table)
-- Safe exceptions: varchar(N) to varchar(M) where M > N, varchar to text
```

### Migration File Pattern

```sql
-- migrations/20250216_001_add_user_preferences.sql
BEGIN;

-- Add the column (instant, no lock)
ALTER TABLE users ADD COLUMN preferences jsonb NOT NULL DEFAULT '{}';

-- Create index for querying preferences (no lock)
CREATE INDEX CONCURRENTLY idx_users_preferences ON users USING GIN (preferences);

COMMIT;

-- Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction.
-- Run it separately after the ALTER TABLE commits.
```

---

## 6. Row-Level Security (RLS)

```sql
-- Enable RLS on the table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (important for testing)
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- Users can only see their own documents
CREATE POLICY select_own ON documents
  FOR SELECT
  USING (owner_id = current_setting('app.current_user_id')::uuid);

-- Users can only insert documents they own
CREATE POLICY insert_own ON documents
  FOR INSERT
  WITH CHECK (owner_id = current_setting('app.current_user_id')::uuid);

-- Users can update only their own documents
CREATE POLICY update_own ON documents
  FOR UPDATE
  USING (owner_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (owner_id = current_setting('app.current_user_id')::uuid);

-- Admins can see everything
CREATE POLICY admin_all ON documents
  FOR ALL
  USING (current_setting('app.current_role') = 'admin');

-- Setting the user context per request (in your application):
-- SET LOCAL only lasts for the current transaction
BEGIN;
SET LOCAL app.current_user_id = 'a1b2c3d4-...';
SET LOCAL app.current_role = 'user';
SELECT * FROM documents;  -- RLS filters automatically
COMMIT;
```

---

## 7. JSONB Operations

```sql
-- Store structured data
CREATE TABLE products (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}'
);

-- Index for containment queries
CREATE INDEX idx_products_attrs ON products USING GIN (attributes);

-- Query patterns
SELECT * FROM products WHERE attributes @> '{"color": "red"}';           -- containment
SELECT * FROM products WHERE attributes ? 'warranty';                     -- key exists
SELECT * FROM products WHERE attributes ->> 'brand' = 'Acme';           -- text extraction
SELECT * FROM products WHERE (attributes -> 'specs' ->> 'weight')::numeric < 2.0;

-- Update nested values
UPDATE products
SET attributes = jsonb_set(attributes, '{specs,weight}', '1.5')
WHERE id = $1;

-- Aggregate JSONB
SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM products;

-- Expand JSONB to rows
SELECT p.name, kv.key, kv.value
FROM products p, jsonb_each_text(p.attributes) kv;

-- JSONB path queries (PG 12+)
SELECT * FROM products WHERE attributes @? '$.specs.weight ? (@ < 2)';
```

**When to use JSONB vs columns**: Use JSONB for truly dynamic/variable schemas (user preferences, plugin data, API payloads). Use columns for data you query, join, or constrain regularly.

---

## 8. Full-Text Search

```sql
-- Add tsvector column with auto-update trigger
ALTER TABLE articles ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'B')
  ) STORED;

CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

-- Search with ranking
SELECT
  id, title,
  ts_rank(search_vector, query) AS rank
FROM articles, plainto_tsquery('english', 'database optimization') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;

-- Phrase search
SELECT * FROM articles
WHERE search_vector @@ phraseto_tsquery('english', 'connection pooling');

-- Highlight matching terms
SELECT
  ts_headline('english', body, plainto_tsquery('english', 'optimization'),
    'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') as snippet
FROM articles
WHERE search_vector @@ plainto_tsquery('english', 'optimization');
```

---

## 9. Common Anti-Patterns

### N+1 Queries

```typescript
// BAD: N+1 -- one query per user to get their orders
const users = await db.query('SELECT * FROM users LIMIT 100');
for (const user of users.rows) {
  const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [user.id]);
  // ...
}

// GOOD: single query with join
const result = await db.query(`
  SELECT u.id, u.email, json_agg(o.*) as orders
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id, u.email
  LIMIT 100
`);
```

### Missing Indexes on Foreign Keys

```sql
-- Foreign keys do NOT automatically create indexes in PostgreSQL
-- Joins and ON DELETE CASCADE scans will be slow without them
ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX idx_orders_user_id ON orders (user_id);  -- Add this explicitly
```

### Over-Indexing

Every index slows down writes and consumes disk. Audit unused indexes:

```sql
SELECT schemaname, relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Unbounded Queries

```sql
-- BAD: no limit
SELECT * FROM logs;

-- GOOD: always paginate
SELECT * FROM logs ORDER BY created_at DESC LIMIT 50;
```

---

## 10. TypeScript Integration

### With postgres.js (Recommended)

```typescript
import postgres from 'postgres';

const sql = postgres({
  host: process.env.DATABASE_HOST,
  port: 5432,
  database: process.env.DATABASE_NAME,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  max: 20,                 // connection pool size
  idle_timeout: 20,        // seconds before closing idle connections
  max_lifetime: 60 * 30,   // max connection lifetime in seconds
  transform: postgres.camel,  // snake_case columns -> camelCase JS
});

// Parameterized queries (safe from injection)
const users = await sql`
  SELECT id, email, created_at
  FROM users
  WHERE active = ${true}
  ORDER BY created_at DESC
  LIMIT ${20}
`;

// Transactions
await sql.begin(async (tx) => {
  const [order] = await tx`
    INSERT INTO orders (user_id, total, status)
    VALUES (${userId}, ${total}, 'pending')
    RETURNING *
  `;
  await tx`
    INSERT INTO order_items ${sql(items.map(i => ({
      order_id: order.id,
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
    })))}
  `;
});

// Dynamic columns with sql()
const columns = ['email', 'name'];
const result = await sql`SELECT ${sql(columns)} FROM users WHERE id = ${id}`;
```

### Type Generation with pgtyped or Kysely

```typescript
// With Kysely: type-safe query builder
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

interface Database {
  users: {
    id: string;
    email: string;
    active: boolean;
    created_at: Date;
  };
  orders: {
    id: string;
    user_id: string;
    total: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    created_at: Date;
  };
}

const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL }) }),
});

// Fully typed queries
const users = await db
  .selectFrom('users')
  .select(['id', 'email'])
  .where('active', '=', true)
  .orderBy('created_at', 'desc')
  .limit(20)
  .execute();
// users is typed as { id: string; email: string }[]
```

---

## 11. Critical Reminders

### ALWAYS

- Use parameterized queries -- never interpolate user input into SQL strings
- Create indexes on foreign key columns
- Use `CREATE INDEX CONCURRENTLY` in production
- Set `statement_timeout` to prevent runaway queries
- Use `BEGIN; SET LOCAL ...; ... COMMIT;` for RLS context
- Monitor slow queries via `pg_stat_statements`
- Run `ANALYZE` after bulk data loads
- Use `LIMIT` on all user-facing queries

### NEVER

- Interpolate user input into SQL: `` `SELECT * FROM users WHERE id = '${id}'` ``
- Use `OFFSET` for deep pagination (use cursor-based instead)
- Add `NOT NULL` to existing columns without the multi-step constraint pattern
- Create indexes without `CONCURRENTLY` on production tables with traffic
- Forget to index foreign key columns
- Use `SELECT *` in application code (select only needed columns)
- Store passwords in plaintext (use `pgcrypto` or hash in application layer)
- Run migrations without testing on a copy of production data first
