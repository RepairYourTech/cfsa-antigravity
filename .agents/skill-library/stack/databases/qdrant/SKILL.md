---
name: qdrant
description: "Expert Qdrant vector database guide covering collection design, vector indexing (HNSW), payload filtering, distance metrics, snapshot management, multi-tenancy, quantization, driver setup, cross-store coordination, and security hardening. Use when building similarity search, RAG pipelines, recommendation engines, or any embedding-based retrieval system."
version: 1.0.0
---

# Qdrant Expert Guide

> Use this skill when designing vector collections, writing search queries, planning indexing and quantization strategies, setting up Qdrant clients, coordinating Qdrant with primary stores, or hardening a Qdrant deployment. This skill targets Qdrant 1.x.

## When to Use This Skill

- Building similarity search for embeddings (text, image, audio, multi-modal)
- Implementing RAG (Retrieval-Augmented Generation) pipelines with vector retrieval
- Designing recommendation engines using embedding similarity
- Combining vector search with structured payload filtering
- Integrating Qdrant as the `DATABASE_VECTOR` store alongside a primary relational/document database

## When NOT to Use This Skill

- Relational data with JOINs → use PostgreSQL
- Graph traversals → use Neo4j
- Time-series analytics → use TimescaleDB
- Full-text search without vectors → use Meilisearch or Elasticsearch
- Key-value caching → use Redis

---

## 1. Collection Design

### Creating Collections

```bash
# REST API
PUT /collections/documents
{
    "vectors": {
        "size": 1536,
        "distance": "Cosine"
    },
    "on_disk_payload": true,
    "optimizers_config": {
        "default_segment_number": 4
    }
}
```

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

client = QdrantClient(host="localhost", port=6333)

client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(
        size=1536,          # Must match embedding model dimension
        distance=Distance.COSINE,
    ),
    on_disk_payload=True,   # Large payloads stored on disk
)
```

### Distance Metrics

| Metric | When to Use | Range |
|--------|------------|-------|
| `Cosine` | Text embeddings (OpenAI, Cohere, most LLMs) — direction matters, magnitude doesn't | 0–2 (0 = identical) |
| `Euclid` | Feature vectors where absolute distance matters (image features, sensor data) | 0–∞ |
| `Dot` | When embeddings are pre-normalised and you want maximum inner product | -∞–∞ (higher = more similar) |

### Named Vectors (Multi-Vector Collections)

```python
from qdrant_client.models import VectorParams

client.create_collection(
    collection_name="products",
    vectors_config={
        "text": VectorParams(size=1536, distance=Distance.COSINE),
        "image": VectorParams(size=512, distance=Distance.COSINE),
    },
)
```

### Payload Schema

Payloads are structured metadata stored alongside vectors:

```python
from qdrant_client.models import PointStruct

client.upsert(
    collection_name="documents",
    points=[
        PointStruct(
            id="doc-uuid-1",
            vector=[0.1, 0.2, ...],  # 1536-dim
            payload={
                "title": "Architecture Design",
                "category": "engineering",
                "created_at": "2026-01-15T10:30:00Z",
                "author_id": "user-uuid-123",  # canonical ID from primary store
                "tags": ["architecture", "design"],
                "word_count": 2500,
                "public": True,
            },
        )
    ],
)
```

---

## 2. Search Patterns

### Basic Vector Search

```python
results = client.search(
    collection_name="documents",
    query_vector=[0.1, 0.2, ...],
    limit=10,
    score_threshold=0.7,  # minimum similarity
)
```

### Filtered Search (Vector + Payload)

```python
from qdrant_client.models import Filter, FieldCondition, MatchValue, Range

results = client.search(
    collection_name="documents",
    query_vector=query_embedding,
    query_filter=Filter(
        must=[
            FieldCondition(key="category", match=MatchValue(value="engineering")),
            FieldCondition(key="public", match=MatchValue(value=True)),
        ],
        must_not=[
            FieldCondition(key="word_count", range=Range(lt=100)),
        ],
    ),
    limit=20,
)
```

### Batch Search

```python
from qdrant_client.models import SearchRequest

results = client.search_batch(
    collection_name="documents",
    requests=[
        SearchRequest(vector=embedding_1, limit=5),
        SearchRequest(vector=embedding_2, limit=5, filter=some_filter),
    ],
)
```

### Scroll (Paginated Retrieval Without Vector)

```python
records, next_offset = client.scroll(
    collection_name="documents",
    scroll_filter=Filter(
        must=[FieldCondition(key="category", match=MatchValue(value="engineering"))]
    ),
    limit=100,
    offset=None,  # or previous next_offset
    with_payload=True,
    with_vectors=False,
)
```

---

## 3. Index & Performance

### Payload Indexes

```python
client.create_payload_index(
    collection_name="documents",
    field_name="category",
    field_schema="keyword",  # keyword, integer, float, geo, datetime, text
)

client.create_payload_index(
    collection_name="documents",
    field_name="created_at",
    field_schema="datetime",
)
```

> Always index payload fields used in filters — unindexed payload filters trigger full scans.

### Quantization (Memory Reduction)

```python
from qdrant_client.models import ScalarQuantization, ScalarQuantizationConfig, QuantizationType

client.update_collection(
    collection_name="documents",
    quantization_config=ScalarQuantization(
        scalar=ScalarQuantizationConfig(
            type=QuantizationType.INT8,
            quantile=0.99,
            always_ram=True,
        ),
    ),
)
```

### HNSW Tuning

| Parameter | Default | Effect |
|-----------|---------|--------|
| `m` | 16 | Higher = more accurate, more memory |
| `ef_construct` | 100 | Higher = better index quality, slower build |
| `full_scan_threshold` | 10000 | Below this collection size, skip HNSW |

---

## 4. Driver Setup

### Python (qdrant-client)

```python
from qdrant_client import QdrantClient

# Local
client = QdrantClient(host="localhost", port=6333)

# Qdrant Cloud
client = QdrantClient(
    url="https://your-cluster.cloud.qdrant.io:6333",
    api_key=os.environ["QDRANT_API_KEY"],
)

# Always close on shutdown
client.close()
```

### JavaScript/TypeScript

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({
    url: 'http://localhost:6333',
    // For Qdrant Cloud:
    // url: 'https://your-cluster.cloud.qdrant.io',
    // apiKey: process.env.QDRANT_API_KEY,
});
```

### Go

```go
import "github.com/qdrant/go-client/qdrant"

client, err := qdrant.NewClient(&qdrant.Config{
    Host: "localhost",
    Port: 6334, // gRPC port
})
```

---

## 5. Cross-Store Coordination

### Canonical ID Rule

The primary store's UUID is the canonical identifier. Store it as the Qdrant point ID or in the payload:

```python
# Option A: Use primary store UUID as Qdrant point ID
PointStruct(id="primary-store-uuid", vector=[...], payload={...})

# Option B: Store as payload field (if using integer IDs)
PointStruct(id=12345, vector=[...], payload={"external_id": "primary-store-uuid"})
```

### Sync Pattern

1. **Write to primary store first** → generates canonical ID
2. **Generate embedding** from entity content
3. **Upsert to Qdrant** with canonical ID
4. On primary store update → regenerate embedding → upsert to Qdrant
5. On primary store delete → delete from Qdrant by ID

---

## 6. Security

- **API Key auth** — always set `QDRANT_API_KEY` in production
- **Network isolation** — keep Qdrant behind VPC; never expose port 6333/6334 publicly
- **TLS** — enable HTTPS for all non-local connections
- **Read-only collections** — use collection aliases for read-only access patterns

---

## 7. Common Anti-Patterns

1. **Wrong distance metric** — using Euclid for text embeddings (use Cosine)
2. **Missing payload indexes** — filtering on unindexed fields causes full scans
3. **Storing raw text in payload** — store only metadata; keep full text in primary store
4. **No quantization for large collections** — 1M+ vectors without quantization wastes RAM
5. **Using Qdrant as primary store** — Qdrant is a search index, not a source-of-truth database
