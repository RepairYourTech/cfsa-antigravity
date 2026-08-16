# TypeScript API Versioning Patterns

Language-specific patterns for the `api-versioning` skill. Read `SKILL.md` first for universal methodology.

---

## URL Path Versioning

```typescript
// src/pages/api/v1/models/[id].ts
export async function GET({ params }: APIContext) {
  return new Response(JSON.stringify({
    id: params.id,
    name: model.name,
    provider: model.provider,
    price_per_token: model.pricePerToken, // V1 flat field
  }));
}

// src/pages/api/v2/models/[id].ts
export async function GET({ params }: APIContext) {
  return new Response(JSON.stringify({
    id: params.id,
    name: model.name,
    provider: model.provider,
    pricing: { // V2 structured pricing
      input: model.inputPrice,
      output: model.outputPrice,
      currency: 'USD',
      unit: 'per_million_tokens',
    },
  }));
}
```

## Header Versioning Middleware

```typescript
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
        detail: `API version '${version}' is not supported.`,
      }), { status: 400, headers: { 'Content-Type': 'application/problem+json' } });
    }

    const response = await handler(context);
    response.headers.set('API-Version', version);
    return response;
  };
}
```

## Sunset Headers

```typescript
function addDeprecationHeaders(response: Response, sunsetDate: string, docUrl: string): Response {
  response.headers.set('Deprecation', 'true');
  response.headers.set('Sunset', sunsetDate);
  response.headers.set('Link', `<${docUrl}>; rel="sunset"`);
  return response;
}

function sunsetResponse(migrationUrl: string): Response {
  return new Response(JSON.stringify({
    type: 'https://api.example.com/problems/gone',
    title: 'API Version Removed',
    status: 410,
    detail: 'This API version has been sunset. Please migrate.',
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

## Consumer-Driven Contract Tests (Vitest)

```typescript
import { describe, it, expect } from 'vitest';

describe('Model API Contract (Consumer: Dashboard)', () => {
  it('GET /api/v1/models/:id returns expected shape', async () => {
    const response = await fetch(`${API_URL}/api/v1/models/gpt-4`);
    const data = await response.json();

    expect(data).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      provider: expect.any(String),
    });
  });

  it('returns 404 for unknown model', async () => {
    const response = await fetch(`${API_URL}/api/v1/models/nonexistent`);
    expect(response.status).toBe(404);
  });
});
```

## Full Version Routing Middleware

```typescript
export function createVersionedRoute(
  handlers: Record<string, Handler>,
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
        title: 'API Version Required', status: 400,
        detail: 'Please specify an API version via the API-Version header.',
      });
    }

    if (!(version in handlers)) {
      return problemResponse({
        type: 'https://api.example.com/problems/unsupported-version',
        title: 'Unsupported API Version', status: 400,
        detail: `Version '${version}' is not supported.`,
      });
    }

    const response = await handlers[version](context);
    response.headers.set('API-Version', version);

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
