---
name: weaviate
description: "Expert Weaviate vector database guide covering schema design with classes and properties, vectorizer modules, hybrid BM25+vector search, GraphQL and REST APIs, multi-tenancy, generative search, cross-references, driver setup, cross-store coordination, and security. Use when building semantic search, RAG, or multi-modal retrieval with built-in ML model integration."
version: 1.0.0
---

# Weaviate Expert Guide

> Use this skill when designing Weaviate schemas, writing hybrid search queries, configuring vectorizer modules, setting up clients, or coordinating Weaviate with primary stores. Targets Weaviate 1.25+.

## When to Use This Skill

- Semantic search with built-in vectorization (no external embedding pipeline needed)
- Hybrid search combining BM25 keyword scoring with vector similarity
- Multi-modal search (text, image, video via module integrations)
- Generative search (RAG) using built-in generative modules
- Multi-tenant applications with native tenant isolation

## When NOT to Use This Skill

- Simple vector search without ML module needs → Qdrant is lighter
- Co-locating vectors with existing PostgreSQL data → use pgvector
- Graph-heavy workloads → use Neo4j
- Time-series analytics → use TimescaleDB

---

## 1. Schema Design

### Collection Definition

```python
import weaviate
import weaviate.classes.config as wc

client = weaviate.connect_to_local()

collection = client.collections.create(
    name="Document",
    vectorizer_config=wc.Configure.Vectorizer.text2vec_openai(
        model="text-embedding-3-small",
    ),
    properties=[
        wc.Property(name="title", data_type=wc.DataType.TEXT),
        wc.Property(name="content", data_type=wc.DataType.TEXT),
        wc.Property(name="category", data_type=wc.DataType.TEXT,
                    skip_vectorization=True),
        wc.Property(name="author_id", data_type=wc.DataType.TEXT,
                    skip_vectorization=True),
        wc.Property(name="created_at", data_type=wc.DataType.DATE),
        wc.Property(name="word_count", data_type=wc.DataType.INT),
    ],
)
```

### Multi-Tenancy

```python
collection = client.collections.create(
    name="Document",
    multi_tenancy_config=wc.Configure.multi_tenancy(enabled=True),
    vectorizer_config=wc.Configure.Vectorizer.text2vec_openai(),
    properties=[...],
)

# Add tenants
collection.tenants.create([
    wc.Tenant(name="tenant-abc"),
    wc.Tenant(name="tenant-xyz"),
])

# Query within a tenant
tenant_collection = collection.with_tenant("tenant-abc")
results = tenant_collection.query.near_text(query="architecture", limit=10)
```

---

## 2. Search Patterns

### Vector (Semantic) Search

```python
collection = client.collections.get("Document")

results = collection.query.near_text(
    query="system architecture design patterns",
    limit=10,
    return_metadata=wc.MetadataQuery(distance=True),
)
```

### BM25 Keyword Search

```python
results = collection.query.bm25(
    query="architecture design",
    limit=10,
    return_metadata=wc.MetadataQuery(score=True),
)
```

### Hybrid Search (BM25 + Vector)

```python
results = collection.query.hybrid(
    query="architecture design patterns",
    alpha=0.5,  # 0 = pure BM25, 1 = pure vector
    limit=10,
)
```

### Filtered Search

```python
import weaviate.classes.query as wq

results = collection.query.near_text(
    query="design patterns",
    filters=wq.Filter.by_property("category").equal("engineering")
    & wq.Filter.by_property("word_count").greater_than(500),
    limit=10,
)
```

### Generative Search (RAG)

```python
collection = client.collections.get("Document")

results = collection.generate.near_text(
    query="database design best practices",
    grouped_task="Summarise the key themes across these documents.",
    limit=5,
)
print(results.generated)  # LLM-generated summary
```

---

## 3. Vectorizer Modules

| Module | Provider | Use Case |
|--------|----------|----------|
| `text2vec-openai` | OpenAI | Text embeddings (most common) |
| `text2vec-cohere` | Cohere | Text embeddings |
| `text2vec-huggingface` | HuggingFace | Self-hosted text models |
| `multi2vec-clip` | CLIP | Multi-modal (text + image) |
| `img2vec-neural` | ResNet | Image embeddings |

> If you prefer to generate embeddings externally, use `none` as the vectorizer and provide vectors at insert time.

---

## 4. Driver Setup

### Python (v4 client)

```python
import weaviate

# Local
client = weaviate.connect_to_local()

# Weaviate Cloud
client = weaviate.connect_to_weaviate_cloud(
    cluster_url=os.environ["WEAVIATE_URL"],
    auth_credentials=weaviate.auth.AuthApiKey(os.environ["WEAVIATE_API_KEY"]),
    headers={"X-OpenAI-Api-Key": os.environ["OPENAI_API_KEY"]},
)

# Always close
client.close()
```

### JavaScript/TypeScript

```typescript
import weaviate from 'weaviate-client';

const client = await weaviate.connectToLocal();
// or
const client = await weaviate.connectToWeaviateCloud(
    process.env.WEAVIATE_URL!,
    { authCredentials: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY!) },
);
```

---

## 5. Cross-Store Coordination

### Canonical ID Rule

Store the primary store's UUID as a property (e.g., `author_id`). Weaviate generates its own UUIDs for objects; use the `author_id` property for cross-store lookups.

### Sync Pattern

Same as other vector stores: write to primary → generate embedding (or let Weaviate vectorize) → upsert to Weaviate → delete from Weaviate on primary delete.

---

## 6. Security

- **API key auth** — set `WEAVIATE_API_KEY` in production
- **OIDC auth** — use OIDC for multi-user environments with fine-grained access
- **Multi-tenancy** — tenant isolation is the primary access control mechanism
- **Network** — keep Weaviate behind VPC; use TLS for all connections

---

## 7. Common Anti-Patterns

1. **Skipping multi-tenancy** — mixing tenant data without isolation creates security risks
2. **Vectorizing IDs and metadata** — mark non-semantic fields with `skip_vectorization=True`
3. **Not using hybrid search** — pure vector search misses exact keyword matches; hybrid gives better recall
4. **Using Weaviate as primary store** — it's a search engine; keep source-of-truth data in your primary database
5. **Ignoring module configuration** — vectorizer modules need API keys passed as headers
