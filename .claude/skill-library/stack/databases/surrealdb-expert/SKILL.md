---
name: surrealdb-expert
description: "Expert SurrealDB 3.0 guide covering multi-model database design (document, graph, vector, KV), SurrealQL 3.0 syntax, DEFINE ACCESS authentication, DEFINE API custom endpoints, computed fields, record references, HNSW vector indexing, schema design, cross-store coordination, and security hardening. Use when building SurrealDB 3.0 applications or integrating SurrealDB into a polyglot persistence architecture."
version: 3.0.0
---

# SurrealDB 3.0 Expert Guide

> Use this skill when designing multi-model schemas, writing SurrealQL queries, implementing authentication with `DEFINE ACCESS`, creating custom API endpoints, working with graph relations, vector search, computed fields, record references, or hardening a SurrealDB 3.0 deployment. **This skill targets SurrealDB 3.0 GA (February 2026).**

## When to Use This Skill

- Designing schemas that span document, graph, key-value, and vector models in one database
- Writing or reviewing SurrealQL queries (SELECT, CREATE, UPDATE, RELATE, DEFINE)
- Implementing authentication (DEFINE ACCESS TYPE RECORD — replaces deprecated DEFINE SCOPE)
- Building custom HTTP endpoints directly in the database (DEFINE API)
- Creating graph schemas with bidirectional record references (REFERENCE keyword)
- Using vector search with HNSW indexing for AI/embedding workloads
- Integrating SurrealDB as primary or multi-role store in a polyglot persistence architecture
- Hardening SurrealDB for production deployment

## When NOT to Use This Skill

- Time-series analytics with compression/retention/continuous aggregates → use TimescaleDB
- Dedicated full-text search with ranking/faceting → use Meilisearch or Elasticsearch
- Pure file/blob storage → use S3/object storage (SurrealDB file support is still experimental)
- Simple relational-only workloads with no graph/vector needs → may be simpler with PostgreSQL

---

## 1. Schema Design

### Table Definitions

SurrealDB 3.0 tables can be `SCHEMAFULL` (strict) or `SCHEMALESS` (flexible):

```surql
-- Strict schema — all fields must be defined
DEFINE TABLE user SCHEMAFULL
    PERMISSIONS
        FOR select, update, delete WHERE id = $auth.id
        FOR create FULL;

DEFINE FIELD email ON user TYPE string
    ASSERT string::is::email($value);
DEFINE FIELD password ON user TYPE string
    VALUE crypto::argon2::generate($value);
DEFINE FIELD role ON user TYPE string
    DEFAULT 'user'
    ASSERT $value IN ['user', 'admin', 'moderator'];
DEFINE FIELD created_at ON user TYPE datetime
    DEFAULT time::now();

-- Unique index
DEFINE INDEX user_email_idx ON user FIELDS email UNIQUE;
```

> ⚠️ **3.0 Change:** Use `FIELDS` keyword for indexes, not ~~`COLUMNS`~~. The old `COLUMNS` syntax is deprecated.

### Field Types

```surql
-- Scalar types
DEFINE FIELD name ON user TYPE string;
DEFINE FIELD age ON user TYPE int;
DEFINE FIELD balance ON user TYPE decimal;
DEFINE FIELD active ON user TYPE bool DEFAULT true;
DEFINE FIELD bio ON user TYPE option<string>;  -- nullable

-- Complex types
DEFINE FIELD tags ON post TYPE array<string> DEFAULT [];
DEFINE FIELD metadata ON post TYPE object;
DEFINE FIELD metadata.source ON post TYPE option<string>;

-- Record links (foreign keys)
DEFINE FIELD author ON post TYPE record<user>;
DEFINE FIELD category ON post TYPE record<category>;

-- Arrays of record links
DEFINE FIELD collaborators ON project TYPE array<record<user>> DEFAULT [];

-- Geometry types
DEFINE FIELD location ON venue TYPE geometry<point>;
```

### Computed Fields (NEW in 3.0)

Computed fields replace the deprecated "futures" system. They are defined once in the schema and evaluated **at query time** — never stored.

```surql
-- Computed field: age based on birthdate
DEFINE FIELD age ON user COMPUTED time::now() - born;

-- Computed field: can drive
DEFINE FIELD can_drive ON user COMPUTED time::now() - born > 18y;

-- Computed field: full name
DEFINE FIELD full_name ON user COMPUTED string::concat(first_name, ' ', last_name);

-- Computed field: post count via subquery
DEFINE FIELD post_count ON user COMPUTED count(SELECT id FROM post WHERE author = $this.id);
```

**Rules:**
- Computed fields use the `COMPUTED` keyword (not `VALUE` — `VALUE` is for transforms on write)
- They are top-level fields only — no nested computed fields
- They cannot be written to — they are read-only by definition
- They are evaluated every time the field is accessed

### Record References (NEW in 3.0)

Record references make record links **bidirectional** at the schema level:

```surql
-- Forward link: post has an author (record<user>)
DEFINE FIELD author ON post TYPE record<user> REFERENCE;

-- The REFERENCE keyword means: user records can now "see" which posts link to them
-- No manual reverse lookups needed

-- ON DELETE handlers
DEFINE FIELD author ON post TYPE record<user> REFERENCE ON DELETE CASCADE;
-- Options: REJECT, CASCADE, IGNORE, UNSET, or THEN { custom logic }

-- Custom ON DELETE logic
DEFINE FIELD comments ON person TYPE option<array<record<comment>>> REFERENCE ON DELETE THEN {
    UPDATE $this SET
        deleted_comments += $reference,
        comments -= $reference;
};

-- Array of references
DEFINE FIELD members ON team TYPE array<record<user>> REFERENCE ON DELETE UNSET;
```

**Reference traversal with the `<~` operator:**

```surql
-- Author field on comment — computed from the reverse reference
DEFINE FIELD author ON comment COMPUTED <~person;

-- Query: find all posts that reference a user (via any REFERENCE field)
SELECT <~post FROM user:john;
```

### Record IDs

```surql
-- String IDs
CREATE user:john CONTENT { email: 'john@example.com' };

-- UUID IDs
CREATE user:⟨550e8400-e29b-41d4-a716-446655440000⟩ CONTENT { ... };

-- Auto-generated IDs
CREATE user CONTENT { email: 'auto@example.com' };
-- Returns: user:randomid

-- Numeric IDs
CREATE product:1 CONTENT { name: 'Widget' };

-- Complex IDs with arrays or objects
CREATE event:['2026-01-01', 'concert'] CONTENT { ... };
CREATE event:{ city: 'Berlin', date: '2026-01-01' } CONTENT { ... };
```

---

## 2. SurrealQL Query Patterns

### CRUD Operations

```surql
-- CREATE
CREATE user CONTENT {
    email: $email,
    password: $password,
    role: 'user'
} RETURN id, email, role, created_at;

-- SELECT with filtering
SELECT id, email, role FROM user
    WHERE active = true AND role = 'admin'
    ORDER BY created_at DESC
    LIMIT 20;

-- UPDATE (merge by default)
UPDATE user:john SET role = 'admin', updated_at = time::now();

-- UPDATE with MERGE (explicit)
UPDATE user:john MERGE { role: 'admin', updated_at: time::now() };

-- UPDATE with PATCH (JSON Patch)
UPDATE user:john PATCH [
    { op: 'replace', path: '/role', value: 'admin' }
];

-- DELETE
DELETE user:john;

-- DELETE with condition
DELETE post WHERE created_at < time::now() - 1y AND archived = true;

-- UPSERT
UPSERT user:john CONTENT {
    email: 'john@example.com',
    name: 'John Doe',
    updated_at: time::now()
};
```

### Graph Relations with RELATE

```surql
-- Define edge tables
DEFINE TABLE follows SCHEMAFULL;
DEFINE FIELD in ON follows TYPE record<user>;
DEFINE FIELD out ON follows TYPE record<user>;
DEFINE FIELD since ON follows TYPE datetime DEFAULT time::now();

DEFINE TABLE authored SCHEMAFULL;
DEFINE FIELD in ON authored TYPE record<user>;
DEFINE FIELD out ON authored TYPE record<post>;

-- Create relationships
RELATE user:john -> follows -> user:jane SET since = time::now();
RELATE user:john -> authored -> post:first_post;

-- Graph traversal: get posts by a user
SELECT ->authored->post.* FROM user:john;

-- Reverse traversal: get author of a post
SELECT <-authored<-user.* FROM post:first_post;

-- Multi-hop: get comments on a user's posts
SELECT ->authored->post->has_comment->comment.* FROM user:john;

-- Filter during traversal
SELECT ->authored->post[WHERE published = true AND created_at > $since].* FROM user:john;

-- Limit traversal results
SELECT ->follows->user[0:10].name FROM user:john;

-- Bidirectional with aggregation
SELECT
    count(<-follows<-user) AS follower_count,
    count(->follows->user) AS following_count,
    count(->authored->post) AS post_count
FROM user:john;
```

### Subqueries and LET

```surql
-- LET for variables
LET $active_users = SELECT id FROM user WHERE active = true;
SELECT ->authored->post.* FROM $active_users;

-- Inline subquery
SELECT *,
    (SELECT count() FROM post WHERE author = $parent.id GROUP ALL) AS post_count
FROM user;
```

### Transactions

```surql
-- Server-side transaction
BEGIN TRANSACTION;
CREATE product:widget CONTENT { name: 'Widget', stock: 100 };
CREATE order:1 CONTENT { product: product:widget, quantity: 5 };
UPDATE product:widget SET stock -= 5;
COMMIT TRANSACTION;
```

> **3.0 NEW:** Client-side transactions — group operations across multiple requests with full ACID guarantees, managed from application code.

### Pagination (Cursor-Based)

```surql
-- GOOD: Cursor-based (constant performance)
SELECT * FROM post
    WHERE created_at < $cursor
    ORDER BY created_at DESC
    LIMIT 20;

-- BAD: OFFSET-based (gets slower as offset grows)
SELECT * FROM post
    ORDER BY created_at DESC
    LIMIT 20 START 10000;
```

---

## 3. DEFINE ACCESS — Authentication (Replaces DEFINE SCOPE)

> ⚠️ **3.0 Breaking Change:** `DEFINE SCOPE` is **removed**. Use `DEFINE ACCESS ... TYPE RECORD` instead. If migrating from 2.x, all `DEFINE SCOPE` statements must be rewritten.

### Record Access Method

```surql
-- Define user authentication
DEFINE ACCESS user ON DATABASE TYPE RECORD
    SIGNUP (
        CREATE user SET
            email = $email,
            password = crypto::argon2::generate($password),
            role = 'user',
            created_at = time::now()
    )
    SIGNIN (
        SELECT * FROM user
        WHERE email = $email
        AND crypto::argon2::compare(password, $password)
    )
    DURATION FOR TOKEN 15m, FOR SESSION 12h;
```

### With Refresh Tokens

```surql
DEFINE ACCESS user ON DATABASE TYPE RECORD
    SIGNUP (
        CREATE user SET
            email = $email,
            password = crypto::argon2::generate($password)
    )
    SIGNIN (
        SELECT * FROM user
        WHERE email = $email
        AND crypto::argon2::compare(password, $password)
    )
    WITH REFRESH
    DURATION FOR GRANT 15d, FOR TOKEN 1m, FOR SESSION 12h;
```

### With JWT (External Provider)

```surql
DEFINE ACCESS user ON DATABASE TYPE RECORD
    WITH JWT ALGORITHM HS512 KEY 'your-jwt-secret'
    AUTHENTICATE {
        IF $auth.id {
            RETURN $auth.id;
        } ELSE IF $token.email {
            RETURN SELECT * FROM user WHERE email = $token.email;
        };
    };
```

### Client-Side Authentication

```typescript
// Sign up
const token = await db.signup({
    access: 'user',  // NOT 'scope' — that's the old 2.x API
    namespace: 'app',
    database: 'production',
    variables: {
        email: 'user@example.com',
        password: 'secure-password'
    }
});

// Sign in
const token = await db.signin({
    access: 'user',
    namespace: 'app',
    database: 'production',
    variables: {
        email: 'user@example.com',
        password: 'secure-password'
    }
});
```

### System Users (RBAC)

```surql
-- Root-level admin
DEFINE USER admin ON ROOT PASSWORD 'strong-password' ROLES OWNER;

-- Namespace-level user
DEFINE USER ns_admin ON NAMESPACE PASSWORD 'strong-password' ROLES OWNER;

-- Database-level users with least privilege
DEFINE USER reader ON DATABASE PASSWORD 'strong-password' ROLES VIEWER;
DEFINE USER editor ON DATABASE PASSWORD 'strong-password' ROLES EDITOR;
```

### Row-Level Security

```surql
-- Table-level permissions using $auth context
DEFINE TABLE document SCHEMAFULL
    PERMISSIONS
        FOR select WHERE public = true OR owner = $auth.id
        FOR create WHERE $auth.id != NONE
        FOR update, delete WHERE owner = $auth.id;

DEFINE FIELD owner ON document TYPE record<user>
    DEFAULT $auth.id;
DEFINE FIELD public ON document TYPE bool DEFAULT false;
```

---

## 4. DEFINE API — Custom Endpoints (NEW in 3.0)

Custom API endpoints let you define HTTP routes directly in the database, eliminating the need for an external API layer for simple cases.

### Basic Endpoint

```surql
DEFINE API "/health" FOR get
    THEN {
        {
            status: 200,
            body: { status: "ok", version: "3.0.0" }
        };
    };
```

**Access:** `GET /api/:namespace/:database/health`

### Endpoint with Query Logic

```surql
DEFINE API "/users" FOR get
    MIDDLEWARE api::timeout(5s)
    THEN {
        LET $users = SELECT id, email, role FROM user WHERE active = true LIMIT 100;
        {
            status: 200,
            body: { users: $users, count: count($users) }
        };
    };

DEFINE API "/users/:id" FOR get
    THEN {
        LET $user = SELECT * FROM type::thing('user', $request.params.id);
        IF $user {
            { status: 200, body: $user }
        } ELSE {
            { status: 404, body: { error: "User not found" } }
        };
    };
```

### POST Endpoint

```surql
DEFINE API "/posts" FOR post
    MIDDLEWARE api::timeout(3s)
    PERMISSIONS $auth.id != NONE
    THEN {
        LET $post = CREATE post CONTENT {
            title: $request.body.title,
            body: $request.body.body,
            author: $auth.id,
            published: false
        };
        {
            status: 201,
            body: $post[0],
            headers: { 'location': string::concat('/api/ns/db/posts/', $post[0].id) }
        };
    };
```

### Response Format

```surql
-- API endpoints return an object with:
{
    status: 200,         -- HTTP status code (required)
    body: { ... },       -- Response body (any type)
    headers: { ... },    -- Custom response headers (optional)
    context: { ... }     -- Additional context (optional)
}
```

### Global API Configuration

```surql
-- Set global middleware and permissions for all API endpoints
DEFINE CONFIG API
    MIDDLEWARE api::cors('*'), api::timeout(10s)
    PERMISSIONS $auth.id != NONE;
```

---

## 5. Index Strategy

### Standard Indexes

```surql
-- Range index (default)
DEFINE INDEX user_email ON user FIELDS email UNIQUE;

-- Composite index
DEFINE INDEX post_author_created ON post FIELDS author, created_at;

-- Non-unique index
DEFINE INDEX user_role ON user FIELDS role;
```

### Full-Text Search (BM25)

```surql
-- Define search analyzer and index
DEFINE INDEX post_search ON post
    FIELDS title, content
    SEARCH ANALYZER simple BM25;

-- Query with scoring
SELECT *, search::score(1) AS relevance
FROM post
WHERE title @1@ 'database tutorial' OR content @1@ 'database tutorial'
ORDER BY relevance DESC
LIMIT 20;
```

### Vector Index (HNSW) — AI/Embeddings

```surql
-- Define a vector field
DEFINE FIELD embedding ON document TYPE array<float>
    ASSERT array::len($value) = 1536;  -- OpenAI ada-002 dimension

-- Create HNSW vector index
DEFINE INDEX document_embedding_idx ON document FIELDS embedding
    MTREE DIMENSION 1536 TYPE F32;

-- Vector similarity search
SELECT id, title,
    vector::similarity::cosine(embedding, $query_embedding) AS score
FROM document
WHERE embedding <|10,128|> $query_embedding
ORDER BY score DESC;
```

### Deferred Index Building

```surql
-- Build index in background (3.0 feature — useful for large datasets)
DEFINE INDEX DEFER large_idx ON events FIELDS timestamp;
```

### Verifying Index Usage

```surql
-- Check if query uses an index
EXPLAIN SELECT * FROM user WHERE email = $email;
-- Look for "IndexSeek" vs "TableScan"
```

---

## 6. Driver Setup

### JavaScript/TypeScript SDK

```typescript
import Surreal from 'surrealdb';

// Create client
const db = new Surreal();

// Connect
await db.connect('ws://localhost:8000');

// Select namespace and database
await db.use({ namespace: 'app', database: 'production' });

// Authenticate as root (admin operations)
await db.signin({ username: 'root', password: 'root' });

// Or authenticate as record user
await db.signin({
    access: 'user',
    namespace: 'app',
    database: 'production',
    variables: {
        email: 'user@example.com',
        password: 'secure-password'
    }
});

// Parameterized query (ALWAYS use parameters)
const users = await db.query(
    'SELECT id, email, role FROM user WHERE role = $role LIMIT $limit',
    { role: 'admin', limit: 10 }
);

// CRUD operations
const user = await db.create('user', {
    email: 'new@example.com',
    password: 'hashed-by-schema'
});

await db.update('user:john', { role: 'admin' });
await db.delete('user:john');

// Live queries
const uuid = await db.live('post', (action, result) => {
    console.log(`${action}:`, result);
});

// ALWAYS clean up live queries
await db.kill(uuid);

// Close connection
await db.close();
```

### Python SDK

```python
from surrealdb import Surreal

async with Surreal("ws://localhost:8000") as db:
    await db.use("app", "production")
    await db.signin({"username": "root", "password": "root"})

    # Parameterized query
    users = await db.query(
        "SELECT * FROM user WHERE role = $role",
        {"role": "admin"}
    )

    # Create
    user = await db.create("user", {
        "email": "new@example.com",
        "password": "secure"
    })
```

### Go SDK (1.0 GA in 3.0)

```go
package main

import (
    "github.com/surrealdb/surrealdb.go"
    "github.com/surrealdb/surrealdb.go/pkg/models"
)

func main() {
    db, err := surrealdb.New("ws://localhost:8000")
    if err != nil {
        panic(err)
    }
    defer db.Close()

    if _, err = db.Use("app", "production"); err != nil {
        panic(err)
    }

    if _, err = db.Signin(models.Auth{
        Username: "root",
        Password: "root",
    }); err != nil {
        panic(err)
    }

    // Query
    result, err := db.Query(
        "SELECT * FROM user WHERE role = $role",
        map[string]interface{}{"role": "admin"},
    )
}
```

### Connection Lifecycle Rules

1. **Create one client per application** — reuse across request handlers
2. **Use parameterized queries** — never string-interpolate user input
3. **Always close live query subscriptions** — leaked subscriptions cause memory pressure
4. **Handle reconnection** — WebSocket connections can drop; implement retry logic
5. **Close on shutdown** — `db.close()` in shutdown handlers

---

## 7. Cross-Store Coordination

When SurrealDB is one store in a polyglot persistence architecture:

### Canonical ID Rule

The canonical identifier is generated by whichever store creates the entity first. If SurrealDB IS the primary store, its record IDs are canonical. If SurrealDB is a secondary store (e.g., for graph enrichment alongside PostgreSQL), store the primary store's UUID as a field.

```surql
-- SurrealDB as primary: use its native record IDs
CREATE user:john CONTENT { email: 'john@example.com' };
-- Canonical ID: user:john

-- SurrealDB as secondary: store external UUID
CREATE user_graph CONTENT {
    external_id: $postgres_uuid,  -- from primary store
    username: $username
};
DEFINE INDEX ext_id ON user_graph FIELDS external_id UNIQUE;
```

### SurrealDB as Multi-Role Store

SurrealDB 3.0 can serve multiple roles simultaneously:

```surql
-- Document storage (primary)
DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD email ON user TYPE string;

-- Graph relations
RELATE user:john -> follows -> user:jane;
SELECT ->follows->user.* FROM user:john;

-- Vector search (AI)
DEFINE FIELD embedding ON document TYPE array<float>;
DEFINE INDEX doc_vec ON document FIELDS embedding MTREE DIMENSION 1536 TYPE F32;
SELECT * FROM document WHERE embedding <|5,128|> $query_vec;

-- All in one query (multi-model)
SELECT
    *,
    ->authored->post[WHERE published = true].title AS posts,
    (SELECT id FROM document WHERE embedding <|3,64|> $vec) AS similar_docs
FROM user:john;
```

### When to Pair with Another Store

| Need | SurrealDB Handles It? | Alternative |
|------|----------------------|-------------|
| ACID documents | ✅ Yes | — |
| Graph traversal | ✅ Yes | — |
| Vector similarity | ✅ Yes (HNSW) | Qdrant (if vector-only workload at massive scale) |
| KV cache | ✅ Yes (in-memory engine) | Redis (if sub-ms latency is critical) |
| Time-series analytics | ❌ No native chunking | TimescaleDB |
| File/blob storage | ⚠️ Experimental | S3 |

---

## 8. Security

### Query Injection Prevention

```surql
-- GOOD: Parameterized query
SELECT * FROM user WHERE email = $email;

-- BAD: String interpolation — VULNERABLE TO INJECTION
-- NEVER do this in application code:
-- `SELECT * FROM user WHERE email = '${userInput}'`
```

In every SDK, always use the parameters argument:

```typescript
// GOOD
await db.query('SELECT * FROM user WHERE email = $email', { email });

// BAD — NEVER DO THIS
await db.query(`SELECT * FROM user WHERE email = '${email}'`);
```

### Network Restrictions

```bash
# Production: restrict outbound network access
surreal start --allow-net api.example.com --deny-net 10.0.0.0/8

# NEVER use in production
surreal start --allow-all  # Unrestricted — dangerous
```

### Password Hashing

```surql
-- Always hash on write using VALUE transform
DEFINE FIELD password ON user TYPE string
    VALUE crypto::argon2::generate($value);

-- Verify during signin
DEFINE ACCESS user ON DATABASE TYPE RECORD
    SIGNIN (
        SELECT * FROM user
        WHERE email = $email
        AND crypto::argon2::compare(password, $password)
    )
    DURATION FOR TOKEN 15m, FOR SESSION 12h;
```

### Permissions Checklist

| Resource | Rule |
|----------|------|
| Every table with user data | Must have explicit `PERMISSIONS` |
| `DEFINE ACCESS` | Must set `DURATION` — never unlimited sessions |
| `DEFINE API` endpoints | Must set `PERMISSIONS` on mutation endpoints |
| System users | Least privilege: use `VIEWER` unless writes needed |
| Network | `--allow-net` with explicit domains, `--deny-net` for internals |

---

## 9. Common Anti-Patterns

### 1. Using Deprecated DEFINE SCOPE

```surql
-- ❌ REMOVED in 3.0 — will not work
DEFINE SCOPE user_scope SESSION 2h SIGNUP (...) SIGNIN (...);

-- ✅ Use DEFINE ACCESS instead
DEFINE ACCESS user ON DATABASE TYPE RECORD
    SIGNUP (...) SIGNIN (...)
    DURATION FOR TOKEN 15m, FOR SESSION 2h;
```

### 2. Old COLUMNS Syntax for Indexes

```surql
-- ❌ Deprecated
DEFINE INDEX email_idx ON TABLE user COLUMNS email UNIQUE;

-- ✅ 3.0 syntax
DEFINE INDEX email_idx ON user FIELDS email UNIQUE;
```

### 3. No Permissions on Tables

```surql
-- ❌ No permissions — record users get NONE access by default,
-- but system users get FULL access, which may over-grant
DEFINE TABLE sensitive_data SCHEMAFULL;

-- ✅ Explicit permissions
DEFINE TABLE sensitive_data SCHEMAFULL
    PERMISSIONS
        FOR select WHERE $auth.role = 'admin'
        FOR create, update, delete NONE;
```

### 4. N+1 Query Pattern

```surql
-- ❌ Multiple queries in a loop
LET $users = SELECT * FROM user;
FOR $user IN $users {
    SELECT * FROM post WHERE author = $user.id;  -- N queries!
};

-- ✅ Single query with graph traversal
SELECT *, ->authored->post.* AS posts FROM user;

-- ✅ Or use subquery
SELECT *,
    (SELECT * FROM post WHERE author = $parent.id) AS posts
FROM user;
```

### 5. Unbounded Graph Traversals

```surql
-- ❌ Can traverse the entire graph
SELECT ->follows->user->follows->user->follows->user.* FROM user:john;

-- ✅ Limit depth and results
SELECT ->follows->user[0:10].name FROM user:john;
SELECT ->follows->user[WHERE active = true][0:20].* FROM user:john;
```

### 6. Missing Indexes on Queried Fields

```surql
-- ❌ Full table scan
SELECT * FROM user WHERE email = $email;

-- ✅ Create index first
DEFINE INDEX user_email ON user FIELDS email UNIQUE;
SELECT * FROM user WHERE email = $email;  -- Uses index
```

### 7. Not Cleaning Up LIVE Queries

```typescript
// ❌ Memory leak — subscription never killed
const uuid = await db.live('user', callback);
// Component unmounts, page navigates away... subscription leaks

// ✅ Always clean up
const uuid = await db.live('user', callback);
// On cleanup:
await db.kill(uuid);
await db.close();
```

### 8. Plain Text Passwords

```surql
-- ❌ Password stored as plain text
DEFINE FIELD password ON user TYPE string;

-- ✅ Auto-hash on write
DEFINE FIELD password ON user TYPE string
    VALUE crypto::argon2::generate($value);
```

### 9. Using Futures Instead of Computed Fields

```surql
-- ❌ Removed in 3.0 — futures no longer work
DEFINE FIELD age ON user VALUE <future> { time::now() - born };

-- ✅ Use COMPUTED keyword
DEFINE FIELD age ON user COMPUTED time::now() - born;
```

---

## 10. Migration from 2.x to 3.0

### Breaking Changes Checklist

| 2.x Syntax | 3.0 Replacement |
|-------------|----------------|
| `DEFINE SCOPE name SESSION ...` | `DEFINE ACCESS name ON DATABASE TYPE RECORD ... DURATION ...` |
| `DEFINE INDEX ... COLUMNS ...` | `DEFINE INDEX ... FIELDS ...` |
| `<future> { expr }` / futures | `COMPUTED expr` |
| `scope: 'name'` in SDK signin | `access: 'name'` in SDK signin |
| Unidirectional record links | Bidirectional with `REFERENCE` keyword |
| No custom endpoints | `DEFINE API` for HTTP routes |
| No computed fields | `DEFINE FIELD ... COMPUTED ...` |

### Migration Steps

1. **Search-and-replace** `DEFINE SCOPE` → `DEFINE ACCESS ... TYPE RECORD`
2. **Update all indexes** from `COLUMNS` → `FIELDS`
3. **Replace futures** with `COMPUTED` fields
4. **Update SDK calls**: `scope:` → `access:` in signin/signup
5. **Add `REFERENCE`** to record link fields where bidirectional access is needed
6. **Add `ON DELETE`** handlers to reference fields to define cascade behavior
7. **Test thoroughly** — auth flows are the most likely breakage point
