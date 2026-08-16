---
name: elasticsearch
description: "Expert Elasticsearch guide covering index design (mappings, analyzers, sharding), query DSL (full-text, filters, aggregations, fuzzy), indexing patterns (bulk API, ingest pipelines), performance (query profiling, caching, segment management), and operational best practices. Use when building search features, log analytics, or autocomplete with Elasticsearch or OpenSearch."
version: 1.0.0
---

# Elasticsearch Expert Guide

> Use this skill when building full-text search, autocomplete, log analytics, or faceted navigation with Elasticsearch (8.x) or OpenSearch.

## When to Use This Skill

- Building search features (product search, site search, document search)
- Implementing autocomplete / search-as-you-type
- Log analytics and aggregation dashboards
- Faceted navigation with filters and counts
- Geo-spatial search

## When NOT to Use This Skill

- Primary database → use PostgreSQL or MongoDB
- Simple key-value lookups → use Redis
- Vector similarity search → use a vector DB (Qdrant, Pinecone)
- Small dataset (<100K docs) with basic search → PostgreSQL full-text may suffice

---

## 1. Index Design (CRITICAL)

### Mapping

```json
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "english",
        "fields": {
          "keyword": { "type": "keyword" },
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete_analyzer"
          }
        }
      },
      "description": { "type": "text", "analyzer": "english" },
      "price": { "type": "scaled_float", "scaling_factor": 100 },
      "category": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "created_at": { "type": "date" },
      "location": { "type": "geo_point" },
      "in_stock": { "type": "boolean" }
    }
  }
}
```

### Field Type Selection

| Data | Type | When |
|------|------|------|
| Full-text search | `text` | Search with relevance scoring |
| Exact match / filter / sort | `keyword` | Enums, IDs, tags, status |
| Both search + filter | Multi-field (`text` + `.keyword`) | Title, name |
| Numbers | `integer`, `long`, `scaled_float` | Prices, counts |
| Dates | `date` | Timestamps, created_at |
| Booleans | `boolean` | Flags |
| Geo | `geo_point` | Coordinates |

### Analyzers

```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "autocomplete_tokenizer",
          "filter": ["lowercase"]
        }
      },
      "tokenizer": {
        "autocomplete_tokenizer": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 20,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  }
}
```

### Sharding Strategy

| Shard size | Rule |
|-----------|------|
| Target | 10–50 GB per shard |
| Max | Never exceed 65 GB |
| Small indices (<10GB) | 1 primary shard |
| Time-series | ILM with rollover |

---

## 2. Query DSL (CRITICAL)

### Full-Text Search

```json
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "wireless headphones",
            "fields": ["title^3", "description", "tags^2"],
            "type": "best_fields",
            "fuzziness": "AUTO"
          }
        }
      ],
      "filter": [
        { "term": { "category": "electronics" } },
        { "range": { "price": { "gte": 20, "lte": 200 } } },
        { "term": { "in_stock": true } }
      ],
      "should": [
        { "term": { "featured": { "value": true, "boost": 5 } } }
      ]
    }
  },
  "highlight": {
    "fields": { "title": {}, "description": {} }
  },
  "sort": [
    "_score",
    { "created_at": "desc" }
  ],
  "from": 0,
  "size": 20
}
```

> **Rule**: Use `filter` for exact matches (no scoring, cached), `must` for relevance-scored text.

### Autocomplete

```json
{
  "query": {
    "match": {
      "title.autocomplete": {
        "query": "wire",
        "analyzer": "standard"
      }
    }
  },
  "_source": ["title", "category"],
  "size": 5
}
```

### Aggregations

```json
{
  "size": 0,
  "aggs": {
    "by_category": {
      "terms": { "field": "category", "size": 20 },
      "aggs": {
        "avg_price": { "avg": { "field": "price" } },
        "price_ranges": {
          "range": {
            "field": "price",
            "ranges": [
              { "to": 50 },
              { "from": 50, "to": 100 },
              { "from": 100 }
            ]
          }
        }
      }
    }
  }
}
```

---

## 3. Indexing Patterns

### Bulk API

```json
POST _bulk
{"index": {"_index": "products", "_id": "1"}}
{"title": "Wireless Headphones", "price": 79.99, "category": "electronics"}
{"index": {"_index": "products", "_id": "2"}}
{"title": "Running Shoes", "price": 129.99, "category": "sports"}
```

| Rule | Detail |
|------|--------|
| Batch size | 5–15 MB per bulk request |
| Refresh interval | Set `refresh_interval: 30s` during bulk indexing |
| Replicas | Set `number_of_replicas: 0` during initial load, restore after |

### Index Lifecycle Management (ILM)

```json
{
  "policy": {
    "phases": {
      "hot":   { "actions": { "rollover": { "max_size": "50gb", "max_age": "7d" } } },
      "warm":  { "min_age": "30d", "actions": { "shrink": { "number_of_shards": 1 }, "forcemerge": { "max_num_segments": 1 } } },
      "cold":  { "min_age": "90d", "actions": { "searchable_snapshot": { "snapshot_repository": "backups" } } },
      "delete": { "min_age": "365d", "actions": { "delete": {} } }
    }
  }
}
```

---

## 4. Common Anti-Patterns

1. **Using ES as a primary database** — it's a search engine, not ACID storage
2. **Not setting explicit mappings** — dynamic mapping guesses wrong types
3. **Keyword fields for full-text search** — use `text` with analyzers
4. **Querying without filters** — filters are cached and avoid scoring overhead
5. **Too many shards** — small indices need 1 shard; over-sharding wastes resources
6. **Deep pagination with `from`+`size`** — use `search_after` for >10K results
7. **Not using bulk API** — single-doc indexing is orders of magnitude slower
8. **Wildcard queries on large fields** — extremely expensive; use `edge_ngram` instead

---

## References

- [Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/)
- [Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
- [Mapping Types](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html)
- [Index Lifecycle Management](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html)
