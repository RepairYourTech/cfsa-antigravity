---
name: pgvector
description: "Expert pgvector guide covering vector column types, HNSW and IVFFlat indexing, distance operators, hybrid queries combining SQL and vector similarity, embedding storage patterns, index tuning, and integration with PostgreSQL features (CTEs, JOINs, RLS). Use when adding vector search to an existing PostgreSQL database without a separate vector store."
version: 1.0.0
---

# pgvector Expert Guide

> Use this skill when adding vector similarity search to an existing PostgreSQL database using the pgvector extension. This avoids a separate vector store by co-locating embeddings with relational data. Targets pgvector 0.7+.

## When to Use This Skill

- Adding semantic search to an existing PostgreSQL-backed application
- Co-locating vector embeddings with relational data to avoid a separate vector store
- Hybrid queries combining SQL filters (WHERE, JOIN, RLS) with vector similarity
- RAG pipelines where the primary data is already in PostgreSQL
- Teams that want to minimize infrastructure by reusing their existing database

## When NOT to Use This Skill

- Dedicated vector workloads at massive scale (100M+ vectors) → use Qdrant or Pinecone
- No existing PostgreSQL database → evaluate dedicated vector stores first
- Real-time streaming similarity → Qdrant or Weaviate may offer lower latency

---

## 1. Setup

### Enable Extension

```sql
-- Requires superuser or rds_superuser on managed services
CREATE EXTENSION IF NOT EXISTS vector;
```

### Vector Column

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),  -- dimension must match embedding model
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. Distance Operators

| Operator | Distance | Use Case |
|----------|----------|----------|
| `<->` | L2 (Euclidean) | Feature vectors |
| `<=>` | Cosine | Text embeddings (most common) |
| `<#>` | Inner product (negative) | Pre-normalised vectors |

```sql
-- Cosine similarity search (most common for LLM embeddings)
SELECT id, title, 1 - (embedding <=> $1) AS similarity
FROM documents
ORDER BY embedding <=> $1
LIMIT 10;
```

---

## 3. Index Strategy

### HNSW Index (Recommended)

```sql
-- Create HNSW index for cosine distance
CREATE INDEX ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- At query time, set ef_search for recall/speed tradeoff
SET hnsw.ef_search = 100;  -- higher = more accurate, slower
```

### IVFFlat Index (Legacy, Faster Build)

```sql
-- Create IVFFlat index
CREATE INDEX ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);  -- sqrt(row_count) is a good starting point

-- At query time
SET ivfflat.probes = 10;  -- higher = more accurate
```

### Choosing Index Type

| Factor | HNSW | IVFFlat |
|--------|------|---------|
| Query accuracy | Higher | Lower (depends on probes) |
| Build time | Slower | Faster |
| Memory | Higher | Lower |
| Recommendation | **Default choice** | Large datasets with fast index rebuild needs |

---

## 4. Hybrid Queries (SQL + Vector)

### Filtered Vector Search

```sql
-- Vector search with SQL filters — pgvector's superpower
SELECT id, title, 1 - (embedding <=> $1) AS similarity
FROM documents
WHERE category = 'engineering'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY embedding <=> $1
LIMIT 20;
```

### JOIN with Vector Search

```sql
-- Find similar documents by the same author
SELECT d.id, d.title, 1 - (d.embedding <=> $1) AS similarity, u.name AS author
FROM documents d
JOIN users u ON d.author_id = u.id
WHERE u.team = 'engineering'
ORDER BY d.embedding <=> $1
LIMIT 10;
```

### Row-Level Security + Vector Search

```sql
-- RLS policies apply transparently to vector queries
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_read ON documents FOR SELECT
    USING (public = true OR author_id = current_setting('app.user_id')::uuid);

-- This vector query automatically respects RLS
SELECT id, title FROM documents ORDER BY embedding <=> $1 LIMIT 10;
```

### CTE Pattern for Multi-Stage Retrieval

```sql
-- Stage 1: Coarse vector retrieval
-- Stage 2: Re-rank or filter
WITH candidates AS (
    SELECT id, title, content, embedding <=> $1 AS distance
    FROM documents
    ORDER BY embedding <=> $1
    LIMIT 100
)
SELECT id, title, 1 - distance AS similarity
FROM candidates
WHERE distance < 0.3  -- threshold
ORDER BY distance
LIMIT 10;
```

---

## 5. Embedding Storage Patterns

### Batch Upsert

```sql
-- Use INSERT ... ON CONFLICT for idempotent upserts
INSERT INTO documents (id, title, content, embedding)
VALUES ($1, $2, $3, $4)
ON CONFLICT (id) DO UPDATE SET
    embedding = EXCLUDED.embedding,
    content = EXCLUDED.content;
```

### Partial Indexes (Sparse Vectors)

```sql
-- Index only rows that have embeddings
CREATE INDEX ON documents
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;
```

---

## 6. Driver Usage

### Python (psycopg + pgvector)

```python
import psycopg
from pgvector.psycopg import register_vector

conn = psycopg.connect(os.environ["DATABASE_URL"])
register_vector(conn)

# Search
embedding = get_embedding("search query")  # from your embedding model
results = conn.execute(
    "SELECT id, title, 1 - (embedding <=> %s) AS similarity "
    "FROM documents ORDER BY embedding <=> %s LIMIT 10",
    (embedding, embedding),
).fetchall()
```

### Node.js (pgvector/pg)

```typescript
import pgvector from 'pgvector/pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pgvector.registerType(pool);

const result = await pool.query(
    'SELECT id, title, 1 - (embedding <=> $1) AS similarity FROM documents ORDER BY embedding <=> $1 LIMIT 10',
    [pgvector.toSql(queryEmbedding)]
);
```

---

## 7. Cross-Store Coordination

pgvector lives **inside** PostgreSQL, so there is no cross-store coordination needed when PostgreSQL is the primary store. The canonical IDs are the same table PKs. This is pgvector's primary advantage: no sync, no eventual consistency, no ID mapping.

If another store is primary, follow the standard canonical ID rule — store the primary store's UUID in the `id` column.

---

## 8. Common Anti-Patterns

1. **Missing HNSW index** — without an index, vector queries do sequential scans on the entire table
2. **Wrong distance operator** — using `<->` (L2) for cosine-normalised embeddings instead of `<=>`
3. **Storing embeddings without the source text** — you need the text for re-embedding; store it or keep a reference
4. **Not setting `ef_search`** — HNSW defaults may be too low for your accuracy needs
5. **Huge embedding dimensions without quantization** — pgvector supports `halfvec` for 16-bit floats to halve storage
6. **Using pgvector as a dedicated vector engine at 100M+ scale** — at extreme scale, a purpose-built vector DB offers better throughput
