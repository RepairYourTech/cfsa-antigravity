---
name: pinecone
description: "Expert Pinecone guide covering serverless and pod-based index design, namespace partitioning, metadata filtering, sparse-dense hybrid search, embedding pipeline patterns, SDK setup, cross-store coordination, and security hardening. Use when building production vector search with a fully managed serverless infrastructure."
version: 1.0.0
---

# Pinecone Expert Guide

> Use this skill when designing vector indexes on Pinecone, writing upsert and query operations, planning namespace strategies, setting up SDKs, or coordinating Pinecone with primary stores. Targets Pinecone Serverless.

## When to Use This Skill

- Production vector search requiring fully managed, auto-scaling infrastructure
- RAG pipelines with millions to billions of vectors
- Sparse-dense hybrid search (BM25 + embedding)
- Teams that want zero operational overhead for vector infrastructure
- Multi-tenant applications using namespace isolation

## When NOT to Use This Skill

- Budget-constrained projects → self-hosted Qdrant is free
- Need to co-locate vectors with relational data → use pgvector
- Graph traversal requirements → use Neo4j
- Need full SQL alongside vectors → use pgvector or SurrealDB

---

## 1. Index Design

### Serverless Index (Recommended)

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])

pc.create_index(
    name="documents",
    dimension=1536,
    metric="cosine",      # cosine, euclidean, dotproduct
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1",
    ),
)
```

### Namespaces (Multi-Tenancy)

Namespaces partition data within a single index. Use them for:
- Per-tenant isolation in multi-tenant apps
- Per-environment separation (dev/staging/prod data in one index)
- Logical grouping (by document type, language, etc.)

```python
index = pc.Index("documents")

# Upsert into a specific namespace
index.upsert(
    vectors=[("doc-1", [0.1, 0.2, ...], {"title": "Doc 1"})],
    namespace="tenant-abc",
)

# Query within a namespace
results = index.query(
    vector=query_embedding,
    top_k=10,
    namespace="tenant-abc",
)
```

---

## 2. Upsert Patterns

### Batch Upsert

```python
# Always batch — never upsert one vector at a time
vectors = [
    ("id-1", embedding_1, {"title": "Doc 1", "category": "eng"}),
    ("id-2", embedding_2, {"title": "Doc 2", "category": "sales"}),
]

index.upsert(vectors=vectors, namespace="default")
```

### Metadata Schema

```python
# Metadata values: string, number, boolean, list of strings
{
    "title": "Architecture Design",
    "category": "engineering",
    "created_at": 1706000000,        # Unix timestamp (number)
    "tags": ["architecture", "design"],  # list of strings
    "public": True,
    "word_count": 2500,
    "author_id": "user-uuid-123",    # canonical ID from primary store
}
```

> Metadata keys and string values are indexed automatically. Maximum metadata size: 40KB per vector.

---

## 3. Query Patterns

### Basic Vector Search

```python
results = index.query(
    vector=query_embedding,
    top_k=10,
    include_metadata=True,
)
```

### Filtered Search

```python
results = index.query(
    vector=query_embedding,
    top_k=20,
    filter={
        "category": {"$eq": "engineering"},
        "word_count": {"$gte": 500},
        "tags": {"$in": ["architecture"]},
    },
    include_metadata=True,
)
```

### Sparse-Dense Hybrid Search

```python
# Combines BM25-style sparse vectors with dense embeddings
results = index.query(
    vector=dense_embedding,
    sparse_vector={"indices": [1, 50, 1000], "values": [0.5, 0.3, 0.8]},
    top_k=10,
)
```

### Fetch by ID (No Vector Search)

```python
result = index.fetch(ids=["doc-1", "doc-2"], namespace="default")
```

---

## 4. SDK Setup

### Python

```python
from pinecone import Pinecone

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
index = pc.Index("documents")
```

### JavaScript/TypeScript

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index('documents');
```

---

## 5. Cross-Store Coordination

### Canonical ID Rule

Use the primary store's UUID as the Pinecone vector ID:

```python
# Primary store creates entity → returns UUID
# Use that UUID as the Pinecone vector ID
index.upsert(vectors=[(primary_store_uuid, embedding, metadata)])
```

### Sync Pattern

1. Write to primary store → get UUID
2. Generate embedding from entity content
3. Upsert to Pinecone with UUID as vector ID
4. On update → regenerate embedding → upsert (idempotent)
5. On delete → `index.delete(ids=[uuid])`

---

## 6. Security

- **API key rotation** — rotate keys regularly; use environment variables, never hardcode
- **Project isolation** — each Pinecone project has its own API keys and indexes
- **Namespace isolation** — use namespaces for tenant-level data separation
- **Network** — Pinecone is cloud-hosted; no port exposure to manage

---

## 7. Common Anti-Patterns

1. **Single-vector upserts** — always batch upserts for throughput
2. **Using Pinecone as primary store** — it's a search index; keep source data in your primary database
3. **Over-filtering** — highly selective filters reduce the candidate pool, which can hurt recall
4. **Ignoring namespace isolation** — mixing tenant data in one namespace creates security risks
5. **Not including metadata** — metadata enables filtered search without a separate query to the primary store
