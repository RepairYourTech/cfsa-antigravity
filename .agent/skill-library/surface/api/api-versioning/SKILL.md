---
name: api-versioning
description: "Manage API versioning and evolution with URL/header/query strategies, deprecation workflows, breaking change classification, sunset headers, and consumer-driven contract testing. Use when designing versioning strategy, deprecating endpoints, or evolving API contracts."
version: 1.0.0
---

# API Versioning & Evolution

APIs are contracts with consumers. Breaking that contract destroys trust. This skill covers how to version, evolve, and deprecate APIs without breaking clients.

## Versioning Strategies

### Strategy Comparison

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| **URL path** | `/api/v2/models` | Obvious, cacheable, easy routing | URL represents resource not version; copies endpoints |
| **Header** | `API-Version: 2` | Clean URLs, content negotiation | Hidden from browser, harder to test |
| **Query param** | `/api/models?version=2` | Easy to test, no routing changes | Pollutes query string, cache key complexity |
| **Accept header** | `Accept: application/vnd.api.v2+json` | Proper content negotiation | Verbose, often misunderstood |

### Recommendation

Use **URL path versioning** for public APIs (simplicity and discoverability). Use **header versioning** for internal/partner APIs (cleaner resource model).

### URL Path Versioning

```typescript
// src/pages/api/v1/models/[id].ts
export async function GET({ params }: APIContext) {
  // V1 response shape
  return new Response(JSON.stringify({
    id: params.id,
    name: model.name,
    provider: model.provider,
    // V1 had a flat pricing field
    price_per_token: model.pricePerToken,
  }));
}

// src/pages/api/v2/models/[id].ts
export async function GET({ params }: APIContext) {
  // V2 response shape (nested pricing)
  return new Response(JSON.stringify({
    id: params.id,
    name: model.name,
    provider: model.provider,
    // V2 has structured pricing
    pricing: {
      input: model.inputPrice,
      output: model.outputPrice,
      currency: 'USD',
      unit: 'per_million_tokens',
    },
  }));
}
```

### Header Versioning

```typescript
// Version routing middleware
function versionRouter(handlers: Record<string, Handler>): Handler {
  return async (context) => {
    const version = context.request.headers.get('API-Version')
      ?? context.url.searchParams.get('version')
      ?? DEFAULT_VERSION;

    const handler = handlers[version];
    if (!handler) {
      return new Response(JSON.stringify({
        type: 'https://api.example.com/problems/unsupported-version',
        title: 'Unsupported API Version',
        status: 400,
        detail: `API version '${version}' is not supported. Supported versions: ${Object.keys(handlers).join(', ')}`,
      }), { status: 400, headers: { 'Content-Type': 'application/problem+json' } });
    }

    const response = await handler(context);
    response.headers.set('API-Version', version);
    return response;
  };
}

// Usage
export const GET = versionRouter({
  '1': handleV1,
  '2': handleV2,
});
```

---

## Default Version Behavior

When a client does not specify a version, the API must behave predictably.

| Strategy | Behavior | When to Use |
|----------|----------|-------------|
| **Default to latest** | Unversioned requests get the newest version | Internal APIs with controlled consumers |
| **Default to oldest supported** | Unversioned requests get V1 | Public APIs (avoid surprise breakage) |
| **Require explicit version** | Return 400 if no version specified | Strict APIs where ambiguity is unacceptable |

```typescript
const DEFAULT_VERSION = '1'; // Conservative default for public APIs

function resolveVersion(request: Request): string {
  return request.headers.get('API-Version')
    ?? request.url.searchParams.get('version')
    ?? DEFAULT_VERSION;
}
```

---

## Breaking vs Non-Breaking Changes

### Non-Breaking (Safe to Ship)

| Change | Example | Why It Is Safe |
|--------|---------|---------------|
| Add optional field to response | `"avatar_url": "..."` added to user response | Clients ignore unknown fields |
| Add optional query parameter | `?sort=name` now supported | Existing queries still work |
| Add new endpoint | `POST /api/v1/webhooks` | Does not affect existing endpoints |
| Widen accepted input types | Field accepts `string \| number` instead of just `string` | Existing valid inputs remain valid |
| Add optional request field | `"metadata": {}` now accepted | Existing requests without it still work |
| Relax validation | Max length changed from 100 to 200 | Previously valid inputs still valid |

### Breaking (Requires New Version)

| Change | Example | Why It Breaks |
|--------|---------|---------------|
| Remove field from response | `price_per_token` removed | Clients reading this field break |
| Rename field | `price_per_token` renamed to `pricing` | Clients reading old name break |
| Change field type | `price` from number to object | Parsing breaks |
| Remove endpoint | `DELETE /api/v1/legacy` | Clients calling it get 404 |
| Add required request field | `"region"` now required | Existing requests missing it fail |
| Tighten validation | Max length changed from 200 to 100 | Previously valid inputs now rejected |
| Change error response format | Different error shape | Client error handling breaks |
| Change authentication scheme | Bearer token to API key | Auth headers break |

---

## Additive-Only API Policy

The safest evolution strategy: never remove or rename, only add.

```typescript
// V1 response (original)
interface ModelV1 {
  id: string;
  name: string;
  price_per_token: number; // original flat field
}

// V1.1 response (additive evolution --- no new version needed)
interface ModelV1_1 {
  id: string;
  name: string;
  price_per_token: number; // KEPT for backward compatibility
  pricing: {              // ADDED new structured field
    input: number;
    output: number;
    currency: string;
    unit: string;
  };
}
// Clients reading price_per_token still work.
// New clients use pricing object.
// Remove price_per_token only in V2.
```

---

## Sunset Headers and Deprecation Workflow

### Sunset Header (RFC 8594)

```typescript
function addDeprecationHeaders(response: Response, sunsetDate: string, docUrl: string): Response {
  response.headers.set('Deprecation', 'true');
  response.headers.set('Sunset', sunsetDate); // HTTP date format
  response.headers.set('Link', `<${docUrl}>; rel="sunset"`);
  return response;
}

// Usage
const response = await handleV1Request(context);
addDeprecationHeaders(
  response,
  'Sat, 01 Mar 2026 00:00:00 GMT',
  'https://docs.example.com/migration/v1-to-v2'
);
```

### Deprecation Timeline

| Phase | Duration | Actions |
|-------|----------|---------|
| **Announce** | T-6 months | Add `Deprecation: true` header, publish migration guide |
| **Warn** | T-3 months | Add `Sunset` header with date, send email to consumers |
| **Monitor** | T-1 month | Track usage, notify active consumers directly |
| **Sunset** | T-0 | Return 410 Gone with migration link |
| **Remove** | T+3 months | Remove code (keep tests to prevent regression) |

### Sunset Response

```typescript
function sunsetResponse(migrationUrl: string): Response {
  return new Response(JSON.stringify({
    type: 'https://api.example.com/problems/gone',
    title: 'API Version Removed',
    status: 410,
    detail: `This API version has been sunset. Please migrate to the latest version.`,
    migrationGuide: migrationUrl,
  }), {
    status: 410,
    headers: {
      'Content-Type': 'application/problem+json',
      'Link': `<${migrationUrl}>; rel="successor-version"`,
    },
  });
}
```

---

## Consumer-Driven Contract Testing

Consumers define the contract they depend on. The provider runs these contracts in CI to ensure backward compatibility.

```typescript
// consumer-contracts/model-service.contract.test.ts
import { describe, it, expect } from 'vitest';

describe('Model API Contract (Consumer: Dashboard)', () => {
  it('GET /api/v1/models/:id returns expected shape', async () => {
    const response = await fetch(`${API_URL}/api/v1/models/gpt-4`);
    const data = await response.json();

    // Consumer only depends on these fields --- adding fields is fine
    expect(data).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      provider: expect.any(String),
    });

    // These fields must exist with these types
    expect(typeof data.id).toBe('string');
    expect(typeof data.name).toBe('string');
  });

  it('returns 404 for unknown model', async () => {
    const response = await fetch(`${API_URL}/api/v1/models/nonexistent`);
    expect(response.status).toBe(404);
  });
});
```

**Provider CI pipeline runs all consumer contracts before deploy:**
```yaml
# .github/workflows/api-deploy.yml
jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run consumer contracts
        run: pnpm test:contracts
      # Deploy only if contracts pass
  deploy:
    needs: contract-tests
    # ...
```

---

## Changelog Automation

### Conventional Commits for API Changes

```
feat(api): add /api/v1/webhooks endpoint
fix(api): correct pagination cursor encoding in /api/v1/models
deprecate(api): mark /api/v1/legacy/search as deprecated
breaking(api): remove price_per_token field from /api/v2/models response
```

### Generated Changelog

```markdown
## API Changelog

### v2.3.0 (2026-02-15)

#### Added
- `GET /api/v1/webhooks` - List registered webhooks
- `POST /api/v1/webhooks` - Register a new webhook

#### Deprecated
- `GET /api/v1/legacy/search` - Use `GET /api/v1/search` instead. Sunset: 2026-08-01.

#### Fixed
- Pagination cursor encoding now handles special characters correctly

### v2.0.0 (2026-01-01)

#### Breaking Changes
- Removed `price_per_token` field from model responses. Use `pricing` object instead.
- See [migration guide](https://docs.example.com/migration/v1-to-v2).
```

---

## Migration Guides

Every version bump must include a migration guide that covers:

```markdown
# Migrating from API v1 to v2

## Timeline
- **v1 deprecated:** January 1, 2026
- **v1 sunset:** July 1, 2026
- **v1 removed:** October 1, 2026

## Breaking Changes

### Model pricing field restructured

**Before (v1):**
```json
{ "price_per_token": 0.00003 }
```

**After (v2):**
```json
{ "pricing": { "input": 0.00001, "output": 0.00003, "currency": "USD", "unit": "per_million_tokens" } }
```

**Migration steps:**
1. Update your response type definitions
2. Replace `model.price_per_token` with `model.pricing.output`
3. Test with v2 endpoint
4. Update API-Version header to `2`
```

---

## Version Routing Middleware

```typescript
// src/middleware/api-version.ts
type VersionedHandlers = Record<string, Handler>;

export function createVersionedRoute(
  handlers: VersionedHandlers,
  options: {
    defaultVersion?: string;
    deprecated?: Record<string, { sunset: string; migrationUrl: string }>;
  } = {}
): Handler {
  const { defaultVersion, deprecated = {} } = options;

  return async (context) => {
    const version = resolveVersion(context.request) ?? defaultVersion;

    if (!version) {
      return problemResponse({
        type: 'https://api.example.com/problems/version-required',
        title: 'API Version Required',
        status: 400,
        detail: 'Please specify an API version via the API-Version header.',
      });
    }

    if (!(version in handlers)) {
      return problemResponse({
        type: 'https://api.example.com/problems/unsupported-version',
        title: 'Unsupported API Version',
        status: 400,
        detail: `Version '${version}' is not supported.`,
      });
    }

    const response = await handlers[version](context);
    response.headers.set('API-Version', version);

    // Add deprecation headers if applicable
    if (version in deprecated) {
      const { sunset, migrationUrl } = deprecated[version];
      response.headers.set('Deprecation', 'true');
      response.headers.set('Sunset', sunset);
      response.headers.set('Link', `<${migrationUrl}>; rel="sunset"`);
    }

    return response;
  };
}
```

---

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|------------------|
| Increment version for every change | Version only on breaking changes |
| Remove old version without notice | Follow deprecation timeline (6+ months) |
| Different versioning per endpoint | Consistent strategy across the entire API |
| Version in the response body only | Use URL path or headers --- visible and consistent |
| No default version behavior | Define and document the default |
| Breaking change without migration guide | Every breaking change needs a guide |
| No consumer notification | Email, changelog, and headers all used together |

## References

- [RFC 8594: Sunset Header](https://tools.ietf.org/html/rfc8594)
- [Stripe API Versioning](https://stripe.com/docs/api/versioning)
- [Microsoft REST API Guidelines: Versioning](https://github.com/microsoft/api-guidelines)
- [Pact Contract Testing](https://docs.pact.io/)
