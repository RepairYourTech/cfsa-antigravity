---
name: lancedb
description: "Expert LanceDB vector database guide covering embedded serverless setup, table design with Pydantic and Arrow schemas, vector search (IVF-PQ, HNSW-PQ), full-text search, hybrid search with rerankers, scalar indexing, embedding functions, async API, cross-store coordination, and data versioning. Use when building RAG pipelines, semantic search, recommendation engines, or any embedding-based retrieval system with an embedded (no-server) vector store."
version: 1.0.0
---

# LanceDB Expert Guide

> Use this skill when designing vector tables, writing search queries, planning indexing strategies, setting up LanceDB connections, coordinating LanceDB with primary stores, or choosing between LanceDB and a managed vector database. This skill targets LanceDB 0.x (Python `lancedb` / TypeScript `@lancedb/lancedb`).

## When to Use This Skill

- Building semantic search with an **embedded** (serverless, no-infra) vector store
- Implementing RAG (Retrieval-Augmented Generation) pipelines with vector retrieval
- Hybrid search combining vector similarity + full-text search + metadata filtering
- Multi-modal retrieval (text, image, audio embeddings) in a single table
- Projects that need **zero-config vector storage** — no Docker, no managed service
- Integrating as the `DATABASE_VECTOR` store alongside a primary relational/document database

## When NOT to Use This Skill

- Need a managed, distributed vector cluster → use Qdrant or Pinecone
- Relational data with JOINs → use PostgreSQL
- Graph traversals → use Neo4j
- Time-series analytics → use TimescaleDB
- Key-value caching → use Redis
- Full-text search without vectors → use Meilisearch or Elasticsearch

---

## 1. Table Design

### Connection

```python
import lancedb

# Local embedded (file-based — no server required)
db = lancedb.connect("./my_lancedb")

# Cloud (LanceDB Cloud)
db = lancedb.connect(
    "db://my-database",
    api_key=os.environ["LANCEDB_API_KEY"],
    region="us-east-1",
)
```

```typescript
import * as lancedb from "@lancedb/lancedb";

// Local embedded
const db = await lancedb.connect("./my_lancedb");

// Cloud
const db = await lancedb.connect("db://my-database", {
  apiKey: process.env.LANCEDB_API_KEY,
  region: "us-east-1",
});
```

### Schema Definition (Python — Pydantic)

Always define schemas with Pydantic models or PyArrow — never raw dicts.

```python
from lancedb.pydantic import LanceModel, Vector
from lancedb.embeddings import get_registry

# Auto-embed with an embedding function
embeddings = get_registry().get("openai").create(name="text-embedding-3-small")

class Document(LanceModel):
    text: str = embeddings.SourceField()            # source text
    vector: Vector(1536) = embeddings.VectorField()  # auto-generated
    category: str
    author_id: str    # canonical ID from primary store
    created_at: str
    public: bool = True

table = db.create_table("documents", schema=Document, mode="overwrite")
```

### Schema Definition (Python — PyArrow)

```python
import pyarrow as pa

schema = pa.schema([
    ("id", pa.int64()),
    ("text", pa.string()),
    ("category", pa.string()),
    ("vector", pa.list_(pa.float32(), 1536)),
])
table = db.create_table("documents", schema=schema)
```

### Schema Definition (TypeScript — Arrow)

```typescript
import * as lancedb from "@lancedb/lancedb";
import "@lancedb/lancedb/embedding/openai";
import { Utf8 } from "apache-arrow";

const embedFunc = lancedb
  .getRegistry()
  .get("openai")
  ?.create({ model: "text-embedding-3-small" });

const schema = lancedb.embedding.LanceSchema({
  text: embedFunc.sourceField(new Utf8()),
  vector: embedFunc.vectorField(),
});

const table = await db.createEmptyTable("documents", schema, {
  mode: "overwrite",
});
```

### Inserting Data

```python
# With Pydantic model (auto-embeds via SourceField)
table.add([
    Document(text="Architecture overview", category="engineering",
             author_id="user-uuid-1", created_at="2026-01-15"),
    Document(text="API design patterns", category="engineering",
             author_id="user-uuid-2", created_at="2026-01-16"),
])

# With raw dicts (requires pre-computed vectors)
table.add([
    {"text": "Hello world", "vector": [0.1, 0.2, ...], "category": "demo"},
])
```

```typescript
await table.add([
  { text: "Architecture overview" },
  { text: "API design patterns" },
]);
```

---

## 2. Search Patterns

### Basic Vector Search

```python
# With embedding function — pass text, auto-embeds
results = table.search("architecture patterns").limit(10).to_pandas()

# With raw vector
results = table.search([0.1, 0.2, ...]).limit(10).to_pandas()
```

```typescript
const results = await table.search("architecture patterns").limit(10).toArray();

// With raw vector
const results = await table
  .query()
  .nearestTo([0.1, 0.2])
  .limit(10)
  .toArrow();
```

### Filtered Search (Vector + Metadata)

```python
results = (
    table.search("deployment strategies")
    .where("category = 'engineering' AND public = true")
    .limit(20)
    .to_pandas()
)
```

```typescript
const results = await table
  .search("deployment strategies")
  .where("category = 'engineering' AND public = true")
  .limit(20)
  .toArray();
```

### Full-Text Search (FTS)

Requires creating an FTS index first.

```python
from lancedb.index import FTS

table.create_fts_index("text")

results = table.search("deployment", query_type="fts").limit(10).to_pandas()
```

```typescript
await table.createIndex("text", { config: lancedb.Index.fts() });

const results = await table
  .search("deployment", { queryType: "fts" })
  .limit(10)
  .toArray();
```

### Hybrid Search (Vector + FTS)

Combines vector similarity and full-text search with reranking for best-of-both retrieval.

```python
from lancedb.rerankers import RRFReranker, LinearCombinationReranker

# Prerequisite: both vector and FTS indexes must exist
table.create_index("vector", config=lancedb.index.IvfPq())
table.create_fts_index("text")

# Reciprocal Rank Fusion
reranker = RRFReranker()
results = (
    table.search("AI architecture", query_type="hybrid")
    .rerank(reranker)
    .limit(10)
    .to_pandas()
)

# Linear combination (70% vector, 30% FTS)
reranker = LinearCombinationReranker(weight=0.7)
results = (
    table.search("AI architecture", query_type="hybrid")
    .rerank(reranker)
    .limit(10)
    .to_pandas()
)
```

### Async API (Python)

```python
import lancedb

async def search():
    db = await lancedb.connect_async("./my_lancedb")
    table = await db.open_table("documents")
    results = await (
        table.hybrid_search([0.1, 0.2, ...], "query text")
        .vector_column("vector")
        .text_column("text")
        .limit(10)
        .to_pandas()
    )
    return results
```

---

## 3. Index & Performance

### Vector Indexes

| Index Type | When to Use | Trade-off |
|-----------|------------|-----------|
| `IvfPq` | Large datasets (100K+ rows) | Fast, lower recall |
| `HnswPq` | Medium datasets, higher recall needed | More memory, better accuracy |
| `IvfFlat` | Binary vectors, Hamming distance | Exact partitioned search |

```python
import lancedb

# IVF-PQ (recommended for large datasets)
table.create_index(
    "vector",
    config=lancedb.index.IvfPq(
        num_partitions=256,
        num_sub_vectors=96,
        distance_type="cosine",  # "l2", "cosine", or "dot"
    ),
)

# HNSW-PQ (better recall, more memory)
table.create_index(
    "vector",
    config=lancedb.index.HnswPq(
        distance_type="cosine",
        num_partitions=1,
        m=20,               # connections per node
        ef_construction=300, # build-time search width
    ),
    replace=True,
)
```

```typescript
await table.createIndex("vector", {
  config: lancedb.Index.ivfPq({
    numPartitions: 256,
    numSubVectors: 96,
    distanceType: "cosine",
  }),
});
```

### Scalar Indexes (for filter columns)

```python
# BTree index for filter fields — avoids full scans
table.create_index("category", config=lancedb.index.BTree())
```

> Always create scalar indexes on columns used in `.where()` filters — unindexed filter columns trigger full scans.

### Distance Metrics

| Metric | When to Use |
|--------|------------|
| `cosine` | Text embeddings (OpenAI, Cohere, most LLMs) — direction matters |
| `l2` (Euclidean) | Feature vectors where absolute distance matters |
| `dot` | Pre-normalised embeddings, maximum inner product |

### Listing Indexes

```python
for idx in table.list_indices():
    print(f"Index: {idx['name']} on column {idx['columns']}")
```

---

## 4. Data Versioning

LanceDB uses the Lance columnar format which provides automatic data versioning:

- Every write (add, update, delete) creates a new version
- Previous versions are retained and queryable
- Zero-copy reads — multiple readers can access different versions simultaneously
- Time-travel queries by version number

> This makes LanceDB well-suited for ML experiment tracking and reproducible pipelines where you need to query historical snapshots of your data.

---

## 5. Cross-Store Coordination

### Canonical ID Rule

The primary store's UUID is the canonical identifier. Store it in LanceDB records:

```python
table.add([
    Document(
        text="Architecture overview",
        category="engineering",
        author_id="primary-store-uuid-123",  # canonical ID
        created_at="2026-01-15",
    ),
])
```

### Sync Pattern

1. **Write to primary store first** → generates canonical ID
2. **Add to LanceDB** with canonical ID (embedding auto-generated if using SourceField)
3. On primary store update → update or re-add to LanceDB
4. On primary store delete → delete from LanceDB by filter

```python
# Delete by filter
table.delete('author_id = "primary-store-uuid-123"')
```

---

## 6. Embedding Functions

LanceDB supports built-in embedding functions that auto-generate vectors on insert and search:

| Provider | Registry Key | Example Model |
|----------|-------------|---------------|
| OpenAI | `openai` | `text-embedding-3-small`, `text-embedding-3-large` |
| Cohere | `cohere` | `embed-english-v3.0` |
| Hugging Face | `huggingface` | `sentence-transformers/all-MiniLM-L6-v2` |
| Ollama | `ollama` | `nomic-embed-text` |

```python
from lancedb.embeddings import get_registry

func = get_registry().get("openai").create(name="text-embedding-3-small")
# Use func with LanceModel SourceField/VectorField (see Section 1)
```

> When using embedding functions, you pass text to `.search("query text")` and LanceDB auto-embeds it — no manual vector computation needed.

---

## 7. Security & Deployment

- **Embedded mode** — data is local files; protect with filesystem permissions and encryption-at-rest
- **LanceDB Cloud** — API key auth via `LANCEDB_API_KEY` environment variable
- **No network exposure** — embedded mode has no server port; no network attack surface
- **PII in vectors** — embeddings can leak information; apply the same PII controls as the source text
- **Backups** — Lance format is file-based; standard file backup/replication strategies apply

---

## 8. Common Anti-Patterns

1. **Using raw dicts for schemas** — always use Pydantic `LanceModel` or PyArrow schemas for type safety
2. **Missing vector indexes on large tables** — tables with 100K+ rows without an IVF-PQ or HNSW index will be slow
3. **No scalar indexes on filter columns** — `.where()` filters on unindexed columns cause full scans
4. **Treating LanceDB as a primary store** — LanceDB is a vector index; keep source-of-truth data in a primary store
5. **Mixed vector dimensions in one table** — all vectors in a column must have the same dimension
6. **Skipping the embedding function** — manual embedding computation is error-prone; use built-in embedding functions
7. **Not using hybrid search for RAG** — pure vector search misses keyword-exact matches; hybrid + reranking gives better retrieval
