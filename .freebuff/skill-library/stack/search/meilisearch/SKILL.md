---
name: meilisearch
description: Integrate Meilisearch for fast, typo-tolerant full-text search including index management, filtering, faceting, geo search, and relevancy tuning. Use when adding search functionality to applications that need instant, typo-tolerant results.
version: 1.0.0
---

# Meilisearch

Integrate Meilisearch for fast, typo-tolerant full-text search. Meilisearch is an open-source search engine designed for instant search experiences with minimal configuration.

## When to Use This Skill

- Adding search functionality to web applications
- Implementing faceted search (filter by category, price range, etc.)
- Building autocomplete / search-as-you-type experiences
- Searching content that needs typo tolerance and relevancy ranking
- Implementing geo-based search (find nearby locations)
- Multi-tenant search with secure tenant tokens

## Setup

```bash
# Install JavaScript client
pnpm add meilisearch

# Run Meilisearch locally (Docker)
docker run -d -p 7700:7700 \
  -v $(pwd)/meili_data:/meili_data \
  -e MEILI_MASTER_KEY='your-master-key' \
  getmeili/meilisearch:latest
```

### Client Initialization

```typescript
// src/lib/search/meilisearch.ts
import { MeiliSearch } from 'meilisearch';

export const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST ?? 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_ADMIN_KEY, // Admin key for server-side operations
});

// For client-side search, use a search-only API key
export const meiliSearch = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST ?? 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_SEARCH_KEY, // Read-only key
});
```

## Index Management

### Creating and Configuring an Index

```typescript
// Create index with primary key
const index = await meili.createIndex('products', { primaryKey: 'id' });

// Configure searchable attributes (order defines relevancy weight)
await meili.index('products').updateSearchableAttributes([
  'name',        // Highest weight
  'description',
  'category',
  'brand',       // Lowest weight
]);

// Configure filterable attributes (for filtering and faceting)
await meili.index('products').updateFilterableAttributes([
  'category',
  'brand',
  'price',
  'inStock',
  'rating',
  'tags',
  '_geo', // Required for geo search
]);

// Configure sortable attributes
await meili.index('products').updateSortableAttributes([
  'price',
  'rating',
  'createdAt',
]);

// Configure displayed attributes (what is returned in results)
await meili.index('products').updateDisplayedAttributes([
  'id', 'name', 'description', 'price', 'category',
  'brand', 'imageUrl', 'rating', 'slug',
]);

// Configure ranking rules (order matters)
await meili.index('products').updateRankingRules([
  'words',        // Number of matched query words
  'typo',         // Number of typos
  'proximity',    // Distance between matched words
  'attribute',    // Position in searchableAttributes list
  'sort',         // User-defined sort
  'exactness',    // Exact vs prefix match
  'rating:desc',  // Custom ranking: higher rating first
]);
```

### Typo Tolerance

```typescript
await meili.index('products').updateTypoTolerance({
  enabled: true,
  minWordSizeForTypos: {
    oneTypo: 4,   // Allow 1 typo for words >= 4 chars
    twoTypos: 8,  // Allow 2 typos for words >= 8 chars
  },
  disableOnAttributes: ['sku', 'barcode'], // Exact match only for these
  disableOnWords: ['iPhone', 'MacBook'],   // Exact match for specific terms
});
```

### Synonyms

```typescript
await meili.index('products').updateSynonyms({
  'phone': ['smartphone', 'mobile', 'cellphone'],
  'laptop': ['notebook', 'portable computer'],
  'tv': ['television', 'monitor', 'screen'],
  // One-way synonym
  'iphone': ['phone'],
});
```

### Stop Words

```typescript
await meili.index('products').updateStopWords([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'for', 'in',
]);
```

## Document Operations

### Adding Documents

```typescript
const products = [
  {
    id: 'prod_1',
    name: 'Wireless Noise-Canceling Headphones',
    description: 'Premium wireless headphones with active noise cancellation',
    category: 'Electronics',
    brand: 'AudioTech',
    price: 299.99,
    rating: 4.7,
    inStock: true,
    tags: ['wireless', 'noise-canceling', 'bluetooth'],
    slug: 'wireless-noise-canceling-headphones',
    _geo: { lat: 40.7128, lng: -74.0060 },
  },
  // ... more products
];

// Add or replace documents
const task = await meili.index('products').addDocuments(products);

// Wait for indexing to complete
await meili.waitForTask(task.taskUid);

// Update specific documents (partial update)
await meili.index('products').updateDocuments([
  { id: 'prod_1', price: 249.99, inStock: false },
]);

// Delete documents
await meili.index('products').deleteDocument('prod_1');
await meili.index('products').deleteDocuments(['prod_1', 'prod_2']);
await meili.index('products').deleteAllDocuments();
```

### Batch Indexing

```typescript
// For large datasets, batch in chunks
async function indexAllProducts(products: Product[]) {
  const BATCH_SIZE = 1000;
  const tasks: number[] = [];

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const task = await meili.index('products').addDocuments(batch);
    tasks.push(task.taskUid);
  }

  // Wait for all batches to finish
  for (const taskUid of tasks) {
    await meili.waitForTask(taskUid);
  }
}
```

## Searching

### Basic Search

```typescript
const results = await meili.index('products').search('wireless headphones');

// results shape:
// {
//   hits: [...],           // Matching documents
//   query: 'wireless headphones',
//   processingTimeMs: 2,
//   limit: 20,
//   offset: 0,
//   estimatedTotalHits: 42,
// }
```

### Search with Filters

```typescript
const results = await meili.index('products').search('headphones', {
  filter: [
    'category = "Electronics"',
    'price >= 50 AND price <= 300',
    'inStock = true',
    'rating >= 4.0',
  ],
  sort: ['price:asc'],
  limit: 20,
  offset: 0,
});

// Array of filter strings are ANDed together
// Use OR within a string: 'category = "Electronics" OR category = "Audio"'
// Use arrays for AND between groups, strings for OR within groups:
// filter: [['category = "Electronics"', 'category = "Audio"'], 'inStock = true']
// = (Electronics OR Audio) AND inStock
```

### Search with Facets

```typescript
const results = await meili.index('products').search('headphones', {
  facets: ['category', 'brand', 'tags'],
  filter: ['inStock = true'],
});

// results.facetDistribution:
// {
//   category: { Electronics: 15, Audio: 8, Accessories: 3 },
//   brand: { AudioTech: 10, SoundMax: 8, BassKing: 5 },
//   tags: { wireless: 18, bluetooth: 15, 'noise-canceling': 12 },
// }
```

### Search with Highlighting

```typescript
const results = await meili.index('products').search('wireless headphones', {
  attributesToHighlight: ['name', 'description'],
  highlightPreTag: '<mark>',
  highlightPostTag: '</mark>',
  attributesToCrop: ['description'],
  cropLength: 30,
});

// Each hit includes _formatted with highlighted matches:
// hit._formatted.name = '<mark>Wireless</mark> Noise-Canceling <mark>Headphones</mark>'
```

### Geo Search

```typescript
// Find products within 10km of a location
const results = await meili.index('products').search('coffee shop', {
  filter: ['_geoRadius(40.7128, -74.0060, 10000)'], // lat, lng, radius in meters
  sort: ['_geoPoint(40.7128, -74.0060):asc'], // Sort by distance
});

// Bounding box filter
const results2 = await meili.index('products').search('', {
  filter: ['_geoBoundingBox([40.82, -74.02], [40.70, -73.95])'], // top-left, bottom-right
});
```

### Multi-Index Search

```typescript
const results = await meili.multiSearch({
  queries: [
    { indexUid: 'products', q: 'wireless', limit: 5 },
    { indexUid: 'articles', q: 'wireless', limit: 5 },
    { indexUid: 'categories', q: 'wireless', limit: 3 },
  ],
});

// results.results is an array of search results, one per query
```

## Tenant Tokens (Multi-Tenancy)

Tenant tokens restrict search to specific filter rules. Generate them server-side, use them client-side.

```typescript
// Server: Generate a tenant token
import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST!,
  apiKey: process.env.MEILISEARCH_ADMIN_KEY!,
});

function generateTenantToken(tenantId: string): string {
  return client.generateTenantToken(
    process.env.MEILISEARCH_SEARCH_KEY_UID!, // UID of the search key
    {
      products: {
        filter: `tenantId = "${tenantId}"`, // Enforced filter
      },
    },
    {
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    },
  );
}
```

```typescript
// Client: Use the tenant token
const tenantClient = new MeiliSearch({
  host: 'https://search.example.com',
  apiKey: tenantToken, // Token from server
});

// All searches are automatically scoped to the tenant
const results = await tenantClient.index('products').search('headphones');
// Only returns products where tenantId matches
```

## Syncing Data

```typescript
// Pattern: Sync database changes to Meilisearch
// Call this from your database hooks/triggers

async function syncProductToSearch(product: Product, action: 'upsert' | 'delete') {
  const index = meili.index('products');

  if (action === 'delete') {
    await index.deleteDocument(product.id);
    return;
  }

  await index.addDocuments([{
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    brand: product.brand,
    price: product.price,
    rating: product.rating,
    inStock: product.inStock,
    tags: product.tags,
    slug: product.slug,
    updatedAt: product.updatedAt,
  }]);
}
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Using the admin key on the client | Use search-only keys or tenant tokens client-side |
| Not configuring searchableAttributes | Without it, all fields are searchable (slow, noisy results) |
| Indexing raw database rows with all columns | Index only fields needed for search, display, and filtering |
| Calling `waitForTask` in request handlers | Indexing is async -- return immediately, let it process in background |
| Re-indexing entire dataset on every change | Use incremental `addDocuments` (upserts by primary key) |
| Using Meilisearch as a primary database | It is a search index -- your database is the source of truth |

## Environment Variables

```env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_ADMIN_KEY=         # Admin key -- server-side only
MEILISEARCH_SEARCH_KEY=        # Search-only key -- safe for client
MEILISEARCH_SEARCH_KEY_UID=    # UID of search key (for tenant tokens)
```
