---
name: algolia
description: "Algolia search patterns covering indexing, search queries, faceting, filtering, InstantSearch UI, relevance tuning, and analytics. Use when implementing search with Algolia."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# Algolia

Hosted search-as-a-service with sub-100ms query performance, typo tolerance, faceted filtering, and pre-built UI components.

## When to Use

- Need fast, typo-tolerant full-text search
- Building e-commerce, marketplace, or content search
- Need faceted navigation (filter by category, price, brand)
- Want pre-built search UI components (InstantSearch)

## When NOT to Use

- Need full-text search on private/sensitive data with strict data residency (evaluate self-hosted options)
- Search is simple enough for database `LIKE`/`ILIKE` queries
- Using Elasticsearch or Typesense already

## Setup

### Installation

```bash
npm install algoliasearch                    # Backend indexing
npm install algoliasearch react-instantsearch # Frontend search UI
```

### Client Initialization

```typescript
// Backend — admin client (can write)
import { algoliasearch } from 'algoliasearch';
const client = algoliasearch('APP_ID', 'ADMIN_API_KEY');

// Frontend — search-only client
import { liteClient as algoliasearch } from 'algoliasearch/lite';
const searchClient = algoliasearch('APP_ID', 'SEARCH_ONLY_API_KEY');
```

### Environment Variables

```env
ALGOLIA_APP_ID=your-app-id
ALGOLIA_ADMIN_KEY=your-admin-key        # Server-only
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your-search-key  # Client-safe
ALGOLIA_INDEX_NAME=products
```

## Indexing

### Push Records

```typescript
const index = client.initIndex('products');

// Single record
await index.saveObject({
  objectID: 'product-123',  // Required unique ID
  name: 'iPhone 15 Pro',
  description: 'Latest iPhone with titanium design',
  price: 999,
  category: 'Electronics',
  brand: 'Apple',
  inStock: true,
  rating: 4.8,
  _tags: ['smartphone', 'apple', 'premium'],
});

// Batch indexing (up to 1000 records per batch)
await index.saveObjects(products.map(p => ({
  objectID: p.id,
  ...p,
})));

// Partial update (only specified attributes)
await index.partialUpdateObject({
  objectID: 'product-123',
  price: 899,
  inStock: false,
});
```

### Configure Index Settings

```typescript
await index.setSettings({
  searchableAttributes: ['name', 'description', 'brand', 'category'],
  attributesForFaceting: ['filterOnly(inStock)', 'searchable(brand)', 'category', 'price'],
  customRanking: ['desc(rating)', 'desc(popularity)'],
  attributesToRetrieve: ['name', 'price', 'category', 'brand', 'image', 'slug'],
  attributesToHighlight: ['name', 'description'],
  typoTolerance: true,
  minWordSizefor1Typo: 3,
  minWordSizefor2Typos: 7,
});
```

## Search Queries

### Backend Search

```typescript
const { hits, nbHits, page, nbPages } = await index.search('iphone pro', {
  filters: 'inStock:true AND price < 1200',
  facets: ['brand', 'category'],
  hitsPerPage: 20,
  page: 0,
  attributesToHighlight: ['name'],
});

hits.forEach(hit => {
  console.log(`${hit.name} — $${hit.price}`);
  console.log(`Highlighted: ${hit._highlightResult?.name?.value}`);
});
```

### Faceted Search

```typescript
const results = await index.search('laptop', {
  facets: ['brand', 'category', 'price'],
  facetFilters: [['brand:Apple', 'brand:Dell']], // OR within array
  numericFilters: ['price >= 500', 'price <= 2000'],
});

// results.facets = { brand: { Apple: 12, Dell: 8 }, category: { ... } }
```

## InstantSearch UI (React)

```tsx
import { InstantSearch, SearchBox, Hits, RefinementList, Pagination } from 'react-instantsearch';
import { liteClient as algoliasearch } from 'algoliasearch/lite';

const searchClient = algoliasearch('APP_ID', 'SEARCH_ONLY_API_KEY');

function SearchPage() {
  return (
    <InstantSearch searchClient={searchClient} indexName="products">
      <SearchBox placeholder="Search products..." />
      <div className="flex gap-8">
        <aside>
          <h3>Brand</h3>
          <RefinementList attribute="brand" limit={10} showMore />
          <h3>Category</h3>
          <RefinementList attribute="category" />
        </aside>
        <main>
          <Hits hitComponent={ProductHit} />
          <Pagination />
        </main>
      </div>
    </InstantSearch>
  );
}

function ProductHit({ hit }: { hit: any }) {
  return (
    <article>
      <h2>{hit.name}</h2>
      <p>${hit.price}</p>
      <p>{hit.category}</p>
    </article>
  );
}
```

## Sync with Database

```typescript
// Webhook handler — sync on DB changes
export async function POST(request: Request) {
  const { event, record } = await request.json();

  switch (event) {
    case 'INSERT':
    case 'UPDATE':
      await index.saveObject({ objectID: record.id, ...record });
      break;
    case 'DELETE':
      await index.deleteObject(record.id);
      break;
  }
  return new Response('OK');
}
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Expose admin API key to the client | Use search-only API key on frontend, admin key server-side only |
| Index everything from the database | Index only searchable/filterable fields — trim payload |
| Skip `objectID` | Every record needs a unique `objectID` |
| Re-index entire dataset on every change | Use `partialUpdateObject` or `saveObject` for incremental updates |
| Set searchable attributes to `*` | Explicitly list `searchableAttributes` for relevance quality |
| Use `filters` for user-facing facets | Use `facetFilters` with `RefinementList` UI for faceted nav |
| Ignore `customRanking` | Set business-relevant ranking signals (popularity, rating, recency) |
| Store sensitive/PII in Algolia index | Never index passwords, tokens, or unredacted PII |
