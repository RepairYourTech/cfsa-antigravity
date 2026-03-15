---
name: typesense
description: "Typesense search patterns covering collection schemas, indexing, search queries, faceting, geo-search, curation, and InstantSearch adapter. Use when implementing search with Typesense."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# Typesense

Open-source, typo-tolerant search engine built in C++. Self-hosted or Typesense Cloud. Sub-50ms latency with schema-enforced collections.

## When to Use

- Need fast full-text search with a schema-first approach
- Want a self-hosted, open-source alternative to Algolia
- Need geo-search, faceted filtering, or curation rules
- Building e-commerce or content search

## When NOT to Use

- Need complex aggregations or analytics on search data (use Elasticsearch)
- Search is simple enough for DB `LIKE` queries
- Need document-level security per user (Typesense has collection-level API keys)

## Setup

### Installation

```bash
npm install typesense                       # Backend client
npm install typesense-instantsearch-adapter # For InstantSearch UI
```

### Client Initialization

```typescript
import Typesense from 'typesense';

const client = new Typesense.Client({
  nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
  apiKey: 'your-admin-api-key',
  connectionTimeoutSeconds: 2,
});
```

## Collections (Schema Definition)

```typescript
await client.collections().create({
  name: 'products',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'price', type: 'float', facet: true },
    { name: 'brand', type: 'string', facet: true },
    { name: 'category', type: 'string', facet: true },
    { name: 'rating', type: 'float', facet: true },
    { name: 'in_stock', type: 'bool', facet: true },
    { name: 'tags', type: 'string[]', facet: true },
    { name: 'location', type: 'geopoint', optional: true }, // [lat, lng]
  ],
  default_sorting_field: 'rating',
});
```

## Indexing

```typescript
// Single document
await client.collections('products').documents().upsert({
  id: 'product-123',
  name: 'iPhone 15 Pro',
  description: 'Latest iPhone with titanium design',
  price: 999,
  brand: 'Apple',
  category: 'Electronics',
  rating: 4.8,
  in_stock: true,
  tags: ['smartphone', 'apple', 'premium'],
});

// Batch import (JSONL format, up to 40MB per batch)
await client.collections('products').documents().import(products, { action: 'upsert' });

// Delete
await client.collections('products').documents('product-123').delete();
```

## Search Queries

```typescript
const results = await client.collections('products').documents().search({
  q: 'iphone pro',
  query_by: 'name,description,brand',
  filter_by: 'in_stock:true && price:<1200',
  sort_by: 'rating:desc',
  facet_by: 'brand,category,price',
  max_facet_values: 10,
  page: 1,
  per_page: 20,
  highlight_full_fields: 'name',
});

results.hits?.forEach(hit => {
  const doc = hit.document;
  console.log(`${doc.name} — $${doc.price}`);
  console.log(`Highlight: ${hit.highlights?.[0]?.snippet}`);
});

// Facet counts
results.facet_counts?.forEach(facet => {
  console.log(`${facet.field_name}:`, facet.counts);
});
```

### Geo-Search

```typescript
const results = await client.collections('stores').documents().search({
  q: '*',
  query_by: 'name',
  filter_by: 'location:(37.7749, -122.4194, 10 km)', // Within 10km of SF
  sort_by: 'location(37.7749, -122.4194):asc',        // Nearest first
});
```

## Scoped API Keys (Multi-Tenant)

```typescript
// Generate a search key scoped to specific tenant
const scopedKey = client.keys().generateScopedSearchKey(
  'base-search-api-key',
  {
    filter_by: 'tenant_id:tenant-123',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  }
);
// Give this key to the frontend — it can only search tenant-123's data
```

## InstantSearch Adapter

```tsx
import TypesenseInstantsearchAdapter from 'typesense-instantsearch-adapter';
import { InstantSearch, SearchBox, Hits, RefinementList } from 'react-instantsearch';

const adapter = new TypesenseInstantsearchAdapter({
  server: {
    apiKey: 'search-only-key',
    nodes: [{ host: 'search.example.com', port: 443, protocol: 'https' }],
  },
  additionalSearchParameters: { query_by: 'name,description,brand' },
});

function SearchPage() {
  return (
    <InstantSearch searchClient={adapter.searchClient} indexName="products">
      <SearchBox />
      <RefinementList attribute="brand" />
      <Hits hitComponent={ProductHit} />
    </InstantSearch>
  );
}
```

## Key Limits

| Limit | Value |
|-------|-------|
| Max document size | 10 KB (default, configurable) |
| Max import batch size | 40 MB |
| Max `query_by` fields | 100 |
| Max facet values returned | 250 |
| Max results per search | 250 (use pagination for more) |
| API key scoping | Collection-level (not document-level) |

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Expose admin API key to client | Generate scoped search keys for frontend |
| Skip schema definition | Define explicit schemas — Typesense enforces types |
| Use `*` for `query_by` | List specific fields ordered by relevance priority |
| Import one document at a time | Batch import with `documents().import()` |
| Filter by high-cardinality fields without facet:true | Mark filterable fields as `facet: true` in schema |
| Use `default_sorting_field` for non-numeric fields | Only numeric fields (int32, float) work as default sort |
| Skip `upsert` action on re-import | Use `{ action: 'upsert' }` to avoid duplicate errors |
| Store large blobs as document fields | Store file content externally, index metadata only |
