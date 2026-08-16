---
name: api-caching
description: "Implement HTTP caching with Cache-Control, ETags, conditional requests, CDN invalidation, Vary headers, and application-level caching with Redis. Use when optimizing API response times, reducing server load, or designing cache invalidation strategies."
version: 1.0.0
---

# API Caching Strategies

Caching is the single highest-impact optimization for API performance. Done correctly, it reduces latency, server load, and bandwidth. Done incorrectly, it serves stale data and causes debugging nightmares.

## Cache-Control Directives

### Directive Reference

| Directive | Meaning | Example |
|-----------|---------|---------|
| `max-age=N` | Cache is fresh for N seconds | `max-age=3600` (1 hour) |
| `s-maxage=N` | CDN/proxy cache lifetime (overrides max-age for shared caches) | `s-maxage=86400` (1 day) |
| `no-cache` | Must revalidate with server before using (NOT "don't cache") | Conditional requests |
| `no-store` | Do not cache at all (sensitive data) | Auth responses, PII |
| `private` | Only browser may cache (not CDN/proxy) | User-specific data |
| `public` | Any cache may store (CDN, proxy, browser) | Public catalog data |
| `must-revalidate` | After max-age expires, must revalidate (no stale serving) | Critical data accuracy |
| `stale-while-revalidate=N` | Serve stale for N seconds while revalidating in background | Semi-fresh content |
| `stale-if-error=N` | Serve stale for N seconds if origin returns 5xx | Resilience |
| `immutable` | Content will never change (versioned assets) | `/assets/main.a1b2c3.js` |

### Common Patterns

```typescript
// Static assets with content hash (cache forever)
response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');

// Public API data that changes occasionally
response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');

// User-specific data (browser only, revalidate often)
response.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');

// Sensitive data (never cache)
response.headers.set('Cache-Control', 'no-store');

// API list that can be slightly stale
response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120, stale-if-error=300');
```

---

## ETags and Conditional Requests

ETags let clients ask "has this changed?" without downloading the full response.

### ETag Generation

```typescript
import { createHash } from 'node:crypto';

function generateETag(content: string | Buffer): string {
  const hash = createHash('md5').update(content).digest('hex');
  return `"${hash}"`;
}

// For database records, use version or updated timestamp
function recordETag(record: { id: string; updatedAt: Date }): string {
  return `"${record.id}-${record.updatedAt.getTime()}"`;
}
```

### Conditional Request Handling

```typescript
export async function GET({ request }: APIContext) {
  const model = await getModel(id);
  if (!model) return new Response(null, { status: 404 });

  const etag = recordETag(model);

  // If-None-Match: client has a cached version
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    // Content has not changed --- return 304 with no body
    return new Response(null, {
      status: 304,
      headers: { 'ETag': etag, 'Cache-Control': 'private, max-age=0, must-revalidate' },
    });
  }

  const body = JSON.stringify(model);
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'ETag': etag,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
```

### Weak vs Strong ETags

```typescript
// Strong ETag: byte-for-byte identical
const strongETag = `"a1b2c3d4"`;

// Weak ETag: semantically equivalent (minor formatting differences OK)
const weakETag = `W/"a1b2c3d4"`;

// Use weak ETags for JSON APIs where field order may vary
// Use strong ETags for binary content (images, files)
```

---

## Last-Modified / If-Modified-Since

Simpler alternative to ETags for time-based resources.

```typescript
export async function GET({ request }: APIContext) {
  const article = await getArticle(id);
  const lastModified = article.updatedAt.toUTCString();

  const ifModifiedSince = request.headers.get('If-Modified-Since');
  if (ifModifiedSince) {
    const cachedDate = new Date(ifModifiedSince);
    if (article.updatedAt <= cachedDate) {
      return new Response(null, {
        status: 304,
        headers: { 'Last-Modified': lastModified },
      });
    }
  }

  return new Response(JSON.stringify(article), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Last-Modified': lastModified,
      'Cache-Control': 'public, max-age=60',
    },
  });
}
```

---

## Vary Header

The `Vary` header tells caches that the response depends on specific request headers. Without it, a CDN might serve the wrong cached response.

```typescript
// Response varies by Accept-Encoding (compression) and Authorization (user)
response.headers.set('Vary', 'Accept-Encoding, Authorization');

// Response varies by API version header
response.headers.set('Vary', 'API-Version');

// Response varies by Accept-Language
response.headers.set('Vary', 'Accept-Language');
```

### Common Mistakes with Vary

| Mistake | Problem | Fix |
|---------|---------|-----|
| `Vary: *` | Effectively disables caching | List specific headers |
| Missing `Vary: Authorization` on personalized responses | CDN serves user A's data to user B | Always Vary on Authorization for private data |
| `Vary: Cookie` | Every unique cookie = separate cache entry (cache explosion) | Use `private` instead, or extract specific cookie |
| Missing `Vary: Accept-Encoding` | Compressed response served to client that cannot decompress | Most CDNs handle this automatically |

---

## CDN Cache Invalidation

### Purge Strategies

| Strategy | How It Works | When to Use |
|----------|-------------|-------------|
| **TTL expiry** | Cache expires naturally after max-age | Default for most content |
| **Surrogate key purge** | Tag responses, purge by tag | Purge all "product" responses when any product changes |
| **Path purge** | Purge specific URL paths | Single resource updated |
| **Full purge** | Clear entire CDN cache | Deployment, emergency |

### Surrogate Keys (Cache Tags)

```typescript
// Tag responses for targeted invalidation
export async function GET({ params }: APIContext) {
  const model = await getModel(params.id);

  return new Response(JSON.stringify(model), {
    headers: {
      'Cache-Control': 'public, s-maxage=3600',
      'Cache-Tag': `model-${params.id} models provider-${model.provider}`,
      // Cloudflare equivalent:
      'Surrogate-Key': `model-${params.id} models provider-${model.provider}`,
    },
  });
}

// When a model is updated, purge its cache tag
async function onModelUpdated(modelId: string): Promise<void> {
  // Cloudflare API
  await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tags: [`model-${modelId}`],
    }),
  });
}
```

---

## Stale-While-Revalidate at HTTP Level

The `stale-while-revalidate` directive allows CDNs and browsers to serve stale content while fetching fresh content in the background. This gives instant responses with eventual consistency.

```typescript
// CDN serves cached response instantly.
// If the cache is between 60-660 seconds old, CDN also fetches fresh from origin in background.
// If the cache is over 660 seconds old, CDN fetches from origin and waits.
response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
```

### When to Use

| Content | Fresh (s-maxage) | Stale-While-Revalidate | Total |
|---------|-----------------|----------------------|-------|
| Model catalog | 60s | 600s | 11 min |
| User profile (public) | 30s | 300s | 5.5 min |
| Blog posts | 300s | 3600s | 65 min |
| Static config | 3600s | 86400s | 25 hours |

---

## Cache Key Design

The cache key determines which requests share a cached response. Poor key design leads to either stale data (too broad) or cache misses (too narrow).

### Default Cache Key

```
scheme + host + path + query string
```

### Custom Cache Key Considerations

```typescript
// These requests should share a cache entry:
// GET /api/v1/models?sort=name
// GET /api/v1/models?sort=name  (identical)

// These should NOT share:
// GET /api/v1/models?sort=name
// GET /api/v1/models?sort=price  (different query param value)

// Normalize query params for consistent cache keys
function normalizeUrl(url: URL): string {
  const params = new URLSearchParams(url.searchParams);
  // Sort params alphabetically for consistent keys
  const sorted = new URLSearchParams([...params.entries()].sort());
  // Remove cache-busting params
  sorted.delete('_');
  sorted.delete('t');
  return `${url.pathname}?${sorted.toString()}`;
}
```

### Cache Key Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Authorization in cache key | Every user gets their own cache entry | Use `private` or strip auth from key |
| Random query params (`?_=timestamp`) | Cache never hits | Strip cache-busting params at CDN |
| Case-sensitive paths | `/API/Models` and `/api/models` are different keys | Normalize to lowercase |
| Trailing slashes | `/api/models` and `/api/models/` are different keys | Redirect one to the other |

---

## Application-Level Caching (Redis / In-Memory)

### Redis Caching Pattern

```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function cachedQuery<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  // Cache miss: fetch from source
  const data = await fetcher();

  // Store in cache (non-blocking)
  redis.setex(key, ttlSeconds, JSON.stringify(data)).catch((err) => {
    console.error('Cache write failed:', err);
  });

  return data;
}

// Usage
const models = await cachedQuery(
  'models:list:active',
  300, // 5 minutes
  () => db.query('SELECT * FROM models WHERE status = $1', ['active'])
);
```

### Cache Invalidation

```typescript
// Invalidate specific key
await redis.del('models:list:active');

// Invalidate by pattern (use with caution --- SCAN, not KEYS)
async function invalidatePattern(pattern: string): Promise<void> {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}

// Invalidate all model caches
await invalidatePattern('models:*');
```

### In-Memory Cache (Single-Instance)

```typescript
class MemoryCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}
```

---

## Cache Warming

Pre-populate caches for high-traffic endpoints to avoid cold-start cache misses.

```typescript
// Run after deployment or on a schedule
async function warmCaches(): Promise<void> {
  const popularModels = await db.query('SELECT id FROM models ORDER BY request_count DESC LIMIT 50');

  await Promise.all(
    popularModels.map(async (model) => {
      const data = await getModelDetails(model.id);
      await redis.setex(`model:${model.id}`, 300, JSON.stringify(data));
    })
  );

  console.log(`Warmed cache for ${popularModels.length} models`);
}
```

---

## Cache Busting for Deployments

### Asset Versioning

```html
<!-- Content hash in filename (best approach) -->
<script src="/assets/main.a1b2c3d4.js"></script>
<link rel="stylesheet" href="/assets/styles.e5f6a7b8.css" />

<!-- These are immutable: cache forever -->
<!-- Cache-Control: public, max-age=31536000, immutable -->
```

### API Cache Busting

```typescript
// After deploying a new API version, purge CDN cache
async function postDeploymentPurge(): Promise<void> {
  await purgeByTag('api-responses');
  await warmCaches();
}
```

---

## Response-Level vs Data-Level Caching

| Level | Where | What | TTL | Invalidation |
|-------|-------|------|-----|-------------|
| **CDN/HTTP** | Cloudflare, Fastly | Full HTTP response | Minutes to hours | Surrogate key purge |
| **Application** | Redis, Memcached | Serialized data | Seconds to minutes | On write/update |
| **Query** | Database query cache | Raw query results | Seconds | On schema change |
| **Computed** | In-memory | Derived/computed values | Seconds | On dependency change |

**Layer them together:**
```
Client → CDN (s-maxage) → App Server (Redis) → Database
           ↓ HIT? serve   ↓ HIT? serve       ↓ query
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| `no-cache` thinking it means "don't cache" | It means "revalidate before use" | Use `no-store` to prevent all caching |
| Caching responses with `Set-Cookie` | CDN may serve another user's session | `private` or strip cookies at CDN |
| Same `max-age` for all endpoints | Over-caching dynamic data, under-caching static | Tune per endpoint based on change frequency |
| No `Vary` header on personalized responses | Wrong data served to wrong user | `Vary: Authorization` or `Cache-Control: private` |
| Cache invalidation on every write | Defeats the purpose of caching | Use TTL-based expiry, invalidate selectively |
| `KEYS *` in Redis for invalidation | Blocks Redis server on large keyspaces | Use `SCAN` with cursor |
| Caching error responses | 500 errors served from cache | Only cache 2xx responses |
| No cache-busting on deploys | Users get stale JS/CSS after deploy | Content-hash filenames + immutable |

## References

- [MDN: Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- [MDN: ETag](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag)
- [HTTP Caching (web.dev)](https://web.dev/http-cache/)
- [Cloudflare Cache Documentation](https://developers.cloudflare.com/cache/)
- [Heroku: HTTP Caching](https://devcenter.heroku.com/articles/increasing-application-performance-with-http-cache-headers)
