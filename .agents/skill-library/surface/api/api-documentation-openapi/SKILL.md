---
name: api-documentation-openapi
description: "Create and maintain API documentation with OpenAPI 3.1, interactive docs (Swagger UI, Redoc, Scalar), SDK generation, schema-first workflows, and strategies for keeping docs synchronized with implementation. Use when documenting APIs, generating SDKs, or setting up interactive API explorers."
version: 1.0.0
---

# API Documentation with OpenAPI

API documentation is the primary interface for developer consumers. If the docs are wrong, incomplete, or out of date, the API is broken --- regardless of what the code does.

## OpenAPI 3.1 Spec Structure

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: My API
  version: 2.0.0
  description: |
    A brief description of the API purpose and key concepts.

    ## Authentication
    All endpoints require a Bearer token in the Authorization header.

    ## Rate Limits
    - Standard: 100 requests/minute
    - Premium: 1000 requests/minute
  contact:
    name: API Support
    email: api-support@example.com
    url: https://docs.example.com/support
  license:
    name: MIT

servers:
  - url: https://api.example.com/v2
    description: Production
  - url: https://staging-api.example.com/v2
    description: Staging
  - url: http://localhost:3000/api/v2
    description: Local development

tags:
  - name: Models
    description: AI model management
  - name: Completions
    description: Generate text completions

paths:
  /models:
    get:
      operationId: listModels
      tags: [Models]
      summary: List available models
      description: Returns a paginated list of AI models available to the authenticated user.
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
        - name: provider
          in: query
          schema:
            type: string
            enum: [openai, anthropic, google, meta]
          description: Filter by provider
      responses:
        '200':
          description: List of models
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ModelListResponse'
              examples:
                default:
                  $ref: '#/components/examples/ModelListExample'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimited'

  /models/{modelId}:
    get:
      operationId: getModel
      tags: [Models]
      summary: Get model details
      parameters:
        - name: modelId
          in: path
          required: true
          schema:
            type: string
          description: The model identifier (e.g., `gpt-4o`, `claude-sonnet-4-20250514`)
      responses:
        '200':
          description: Model details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Model'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    PageParam:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1
    LimitParam:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20

  schemas:
    Model:
      type: object
      required: [id, name, provider, status]
      properties:
        id:
          type: string
          example: gpt-4o
        name:
          type: string
          example: GPT-4o
        provider:
          type: string
          enum: [openai, anthropic, google, meta]
        status:
          type: string
          enum: [active, deprecated, preview]
        pricing:
          $ref: '#/components/schemas/Pricing'
        capabilities:
          type: array
          items:
            type: string
          example: [chat, vision, function_calling]

    Pricing:
      type: object
      properties:
        input:
          type: number
          description: Price per million input tokens (USD)
          example: 2.50
        output:
          type: number
          description: Price per million output tokens (USD)
          example: 10.00
        currency:
          type: string
          default: USD

    ModelListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Model'
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer

    ProblemDetails:
      type: object
      required: [type, title, status]
      properties:
        type:
          type: string
          format: uri
        title:
          type: string
        status:
          type: integer
        detail:
          type: string
        correlationId:
          type: string
          format: uuid

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'
          example:
            type: https://api.example.com/problems/unauthorized
            title: Unauthorized
            status: 401
            detail: Bearer token is missing or invalid.

    NotFound:
      description: Resource not found
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'

    RateLimited:
      description: Rate limit exceeded
      headers:
        Retry-After:
          schema:
            type: integer
          description: Seconds until the rate limit resets
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetails'

  examples:
    ModelListExample:
      summary: A typical model list response
      value:
        data:
          - id: gpt-4o
            name: GPT-4o
            provider: openai
            status: active
            pricing: { input: 2.50, output: 10.00, currency: USD }
            capabilities: [chat, vision, function_calling]
          - id: claude-sonnet-4-20250514
            name: Claude Sonnet 4
            provider: anthropic
            status: active
            pricing: { input: 3.00, output: 15.00, currency: USD }
            capabilities: [chat, vision, tool_use]
        pagination: { page: 1, limit: 20, total: 42, totalPages: 3 }

security:
  - bearerAuth: []
```

---

## Schema-First vs Code-First

### Schema-First (Recommended)

Write the OpenAPI spec first, then generate types and validate implementation against it.

```
openapi.yaml → TypeScript types → Implementation → Validate against spec
```

**Advantages:**
- Spec is the single source of truth
- Frontend and backend teams can work in parallel
- SDK generation is trivial
- API review happens before implementation

### Code-First

Annotate code with decorators/comments, generate the spec from code.

```
Implementation → Decorators/Comments → Generated openapi.yaml
```

**Advantages:**
- Spec is always in sync with code
- No separate file to maintain
- Good for rapid prototyping

**Disadvantages:**
- Spec quality depends on annotation discipline
- Harder to review API design before implementation

### Hybrid (Practical)

Define Zod schemas (source of truth), generate OpenAPI from Zod, validate at runtime.

```typescript
// Define in Zod (your contract)
import { z } from 'zod';
import { extendZodWithOpenApi, generateOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

export const ModelSchema = z.object({
  id: z.string().openapi({ example: 'gpt-4o' }),
  name: z.string().openapi({ example: 'GPT-4o' }),
  provider: z.enum(['openai', 'anthropic', 'google', 'meta']),
  status: z.enum(['active', 'deprecated', 'preview']),
}).openapi('Model');

// Generate OpenAPI spec from Zod schemas
const spec = generateOpenApi({
  info: { title: 'My API', version: '2.0.0' },
  paths: {
    '/models': {
      get: {
        responses: {
          200: { content: { 'application/json': { schema: ModelListResponseSchema } } },
        },
      },
    },
  },
});
```

---

## Interactive Documentation

### Swagger UI

The classic interactive API explorer. Lets users try endpoints directly.

```html
<!-- Host Swagger UI -->
<!DOCTYPE html>
<html>
<head>
  <title>API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/openapi.yaml',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
    });
  </script>
</body>
</html>
```

### Scalar (Modern Alternative)

```html
<!DOCTYPE html>
<html>
<head>
  <title>API Reference</title>
  <meta charset="utf-8" />
</head>
<body>
  <script id="api-reference" data-url="/openapi.yaml"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>
```

### Redoc (Documentation-Focused)

```html
<!DOCTYPE html>
<html>
<head>
  <title>API Documentation</title>
</head>
<body>
  <redoc spec-url="/openapi.yaml"></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>
```

### Tool Comparison

| Feature | Swagger UI | Scalar | Redoc |
|---------|-----------|--------|-------|
| Try it out (send requests) | Yes | Yes | No (paid only) |
| Dark mode | Plugin | Built-in | Theme config |
| Search | Basic | Built-in | Built-in |
| Customization | Limited | High | High |
| Modern look | Dated | Modern | Clean |
| Self-hosted | Yes | Yes | Yes |

---

## Example Responses and Request Bodies

Always provide examples. They are more useful than schema descriptions alone.

```yaml
# In-schema examples
components:
  schemas:
    CreateModelRequest:
      type: object
      required: [name, provider]
      properties:
        name:
          type: string
          example: "My Custom Model"
        provider:
          type: string
          example: "openai"
        config:
          type: object
          example:
            temperature: 0.7
            maxTokens: 2048

# Multiple named examples on an operation
paths:
  /completions:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CompletionRequest'
            examples:
              simple:
                summary: Simple text completion
                value:
                  model: gpt-4o
                  messages:
                    - role: user
                      content: "Hello, world!"
              with_system:
                summary: With system prompt
                value:
                  model: gpt-4o
                  messages:
                    - role: system
                      content: "You are a helpful assistant."
                    - role: user
                      content: "Explain quantum computing."
                  temperature: 0.3
```

---

## Authentication Documentation

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        Obtain a token by calling `POST /auth/token` with your API key.

        Include in all requests:
        ```
        Authorization: Bearer <your-token>
        ```

    apiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: |
        Your API key from the dashboard.
        **Never expose this key in client-side code.**

# Apply globally
security:
  - bearerAuth: []

# Override per endpoint (public endpoint)
paths:
  /health:
    get:
      security: []  # No auth required
      summary: Health check
```

---

## Webhook Documentation

```yaml
webhooks:
  modelStatusChanged:
    post:
      summary: Model status changed
      description: Fired when a model's status changes (active, deprecated, preview).
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [event, data, timestamp]
              properties:
                event:
                  type: string
                  enum: [model.status_changed]
                data:
                  type: object
                  properties:
                    modelId:
                      type: string
                    previousStatus:
                      type: string
                    newStatus:
                      type: string
                timestamp:
                  type: string
                  format: date-time
            example:
              event: model.status_changed
              data:
                modelId: gpt-4
                previousStatus: active
                newStatus: deprecated
              timestamp: "2026-02-15T10:30:00Z"
      responses:
        '200':
          description: Webhook received successfully
```

---

## SDK Generation

### openapi-typescript (TypeScript Types)

```bash
npx openapi-typescript ./openapi.yaml -o ./src/types/api.ts
```

```typescript
// Generated types are used directly
import type { paths, components } from './types/api';

type Model = components['schemas']['Model'];
type ListModelsResponse = paths['/models']['get']['responses']['200']['content']['application/json'];
```

### openapi-fetch (Type-Safe Client)

```typescript
import createClient from 'openapi-fetch';
import type { paths } from './types/api';

const client = createClient<paths>({ baseUrl: 'https://api.example.com/v2' });

// Fully typed: params, body, and response are inferred
const { data, error } = await client.GET('/models/{modelId}', {
  params: { path: { modelId: 'gpt-4o' } },
});

if (data) {
  console.log(data.name); // TypeScript knows this is a string
}
```

### Orval (React Query + Axios)

```bash
npx orval --input ./openapi.yaml --output ./src/api
```

```typescript
// Generated React Query hooks
import { useListModels, useGetModel } from './api';

function ModelList() {
  const { data, isLoading } = useListModels({ provider: 'openai' });
  // Fully typed, with loading/error states
}
```

---

## Keeping Docs in Sync

### Strategy 1: Spec Validation in CI

```bash
# Validate spec syntax
npx @redocly/cli lint openapi.yaml

# Validate implementation matches spec
npx openapi-diff openapi.yaml --actual http://localhost:3000/openapi.json
```

### Strategy 2: Contract Tests from Spec

```typescript
// Generate tests from OpenAPI spec
import { describe, it, expect } from 'vitest';
import spec from './openapi.yaml';

for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    describe(`${method.toUpperCase()} ${path}`, () => {
      it('returns documented status codes', async () => {
        const response = await fetch(`${BASE_URL}${path}`, { method });
        const expectedStatuses = Object.keys(operation.responses).map(Number);
        expect(expectedStatuses).toContain(response.status);
      });
    });
  }
}
```

### Strategy 3: Runtime Response Validation

```typescript
// Validate every response matches the spec in development
import { ResponseValidator } from 'openapi-response-validator';

const validator = new ResponseValidator({ spec });

function validateResponse(path: string, method: string, statusCode: number, body: unknown): void {
  if (process.env.NODE_ENV !== 'development') return;

  const errors = validator.validate(path, method, statusCode, body);
  if (errors.length > 0) {
    console.error(`Response does not match OpenAPI spec for ${method} ${path}:`, errors);
  }
}
```

---

## API Reference vs Guides

| Document Type | Purpose | Format |
|--------------|---------|--------|
| **API Reference** | Every endpoint, parameter, and schema | OpenAPI + interactive docs |
| **Getting Started Guide** | First API call in < 5 minutes | Markdown tutorial |
| **Authentication Guide** | How to obtain and use tokens | Markdown with code samples |
| **Webhooks Guide** | How to receive and verify webhooks | Markdown with examples |
| **Error Handling Guide** | How to interpret and handle errors | Markdown with error catalog |
| **Migration Guide** | How to upgrade between versions | Markdown with before/after |
| **SDKs & Libraries** | Official and community clients | README with install instructions |

---

## Versioned Documentation

```
/docs/v1/   ← Previous version (deprecated)
/docs/v2/   ← Current version (default)
/docs/next/ ← Preview of upcoming changes
```

```yaml
# v1 spec includes sunset notice
info:
  title: My API (v1 - Deprecated)
  description: |
    **This version is deprecated.** Please migrate to [v2](/docs/v2/).
    Sunset date: July 1, 2026.
```

---

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|------------------|
| No examples in spec | Include at least one example per endpoint |
| Spec exists but is not published | Host interactive docs at a public URL |
| Spec is manually maintained | Generate from Zod schemas or validate in CI |
| No error response documentation | Document every possible error status and shape |
| Documentation has no search | Use Scalar or Redoc (built-in search) |
| Authentication documented only in spec | Write a separate authentication guide |
| SDK types manually maintained | Generate from OpenAPI spec |

## References

- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [Redocly CLI](https://redocly.com/docs/cli/)
- [openapi-typescript](https://openapi-ts.dev/)
- [Scalar API Reference](https://github.com/scalar/scalar)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
