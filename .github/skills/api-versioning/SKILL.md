---
name: api-versioning
description: "Manage API versioning and evolution with URL/header/query strategies, deprecation workflows, breaking change classification, sunset headers, and consumer-driven contract testing. Use when designing versioning strategy, deprecating endpoints, or evolving API contracts."
version: 2.0.0
---

# API Versioning & Evolution

APIs are contracts with consumers. Breaking that contract destroys trust. This skill covers how to version, evolve, and deprecate APIs without breaking clients.

## Stack-Specific References

After reading the methodology below, read the reference matching your surface's framework:

| Framework | Reference |
|-----------|-----------|
| TypeScript / Node.js | `references/typescript.md` |

---

## Versioning Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| **URL path** | `/api/v2/models` | Obvious, cacheable, easy routing | URL represents resource not version; copies endpoints |
| **Header** | `API-Version: 2` | Clean URLs, content negotiation | Hidden from browser, harder to test |
| **Query param** | `/api/models?version=2` | Easy to test, no routing changes | Pollutes query string, cache key complexity |
| **Accept header** | `Accept: application/vnd.api.v2+json` | Proper content negotiation | Verbose, often misunderstood |

### Recommendation

Use **URL path versioning** for public APIs (simplicity and discoverability). Use **header versioning** for internal/partner APIs (cleaner resource model).

---

## Default Version Behavior

| Strategy | Behavior | When to Use |
|----------|----------|-------------|
| **Default to latest** | Unversioned requests get the newest version | Internal APIs with controlled consumers |
| **Default to oldest supported** | Unversioned requests get V1 | Public APIs (avoid surprise breakage) |
| **Require explicit version** | Return 400 if no version specified | Strict APIs where ambiguity is unacceptable |

---

## Breaking vs Non-Breaking Changes

### Non-Breaking (Safe to Ship)

| Change | Example | Why It Is Safe |
|--------|---------|---------------|
| Add optional field to response | `"avatar_url": "..."` added | Clients ignore unknown fields |
| Add optional query parameter | `?sort=name` now supported | Existing queries still work |
| Add new endpoint | `POST /api/v1/webhooks` | Does not affect existing endpoints |
| Widen accepted input types | Field accepts `string | number` | Existing valid inputs remain valid |
| Add optional request field | `"metadata": {}` now accepted | Existing requests without it still work |
| Relax validation | Max length 100 → 200 | Previously valid inputs still valid |

### Breaking (Requires New Version)

| Change | Example | Why It Breaks |
|--------|---------|---------------|
| Remove field from response | `price_per_token` removed | Clients reading this field break |
| Rename field | `price_per_token` → `pricing` | Clients reading old name break |
| Change field type | `price` from number to object | Parsing breaks |
| Remove endpoint | `DELETE /api/v1/legacy` | Clients calling it get 404 |
| Add required request field | `"region"` now required | Existing requests missing it fail |
| Tighten validation | Max length 200 → 100 | Previously valid inputs rejected |
| Change error response format | Different error shape | Client error handling breaks |
| Change authentication scheme | Bearer token → API key | Auth headers break |

---

## Additive-Only API Policy

The safest evolution strategy: never remove or rename, only add.

```
V1 response:
  { id, name, price_per_token }

V1.1 response (additive — no new version needed):
  { id, name, price_per_token, pricing: { input, output, currency, unit } }

Clients reading price_per_token still work.
New clients use pricing object.
Remove price_per_token only in V2.
```

---

## Sunset Headers and Deprecation Workflow

### Sunset Header (RFC 8594)

Every deprecated endpoint/version must include these headers:
- `Deprecation: true`
- `Sunset: <HTTP date>` — when this version will stop working
- `Link: <migration-url>; rel="sunset"`

### Deprecation Timeline

| Phase | Duration | Actions |
|-------|----------|---------|
| **Announce** | T-6 months | Add `Deprecation: true` header, publish migration guide |
| **Warn** | T-3 months | Add `Sunset` header with date, email consumers |
| **Monitor** | T-1 month | Track usage, notify active consumers directly |
| **Sunset** | T-0 | Return 410 Gone with migration link |
| **Remove** | T+3 months | Remove code (keep tests to prevent regression) |

---

## Consumer-Driven Contract Testing

Consumers define the contract they depend on. The provider runs these contracts in CI.

**Concept:**
1. Each API consumer writes contract tests specifying fields they depend on
2. Provider runs ALL consumer contracts in CI before deploy
3. If a consumer contract breaks, the deploy is blocked
4. Adding new fields never breaks contracts (consumers ignore unknown fields)

---

## Changelog Automation

### Conventional Commits for API Changes

```
feat(api): add /api/v1/webhooks endpoint
fix(api): correct pagination cursor encoding in /api/v1/models
deprecate(api): mark /api/v1/legacy/search as deprecated
breaking(api): remove price_per_token field from /api/v2/models response
```

---

## Migration Guides

Every version bump must include a migration guide:

1. **Timeline** — deprecation date, sunset date, removal date
2. **Breaking changes** — before/after for each changed field or endpoint
3. **Migration steps** — numbered steps to update client code
4. **Testing instructions** — how to verify migration works

---

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|------------------|
| Increment version for every change | Version only on breaking changes |
| Remove old version without notice | Follow deprecation timeline (6+ months) |
| Different versioning per endpoint | Consistent strategy across the entire API |
| Version in the response body only | Use URL path or headers — visible and consistent |
| No default version behavior | Define and document the default |
| Breaking change without migration guide | Every breaking change needs a guide |
| No consumer notification | Email, changelog, and headers all used together |

## References

- [RFC 8594: Sunset Header](https://tools.ietf.org/html/rfc8594)
- [Stripe API Versioning](https://stripe.com/docs/api/versioning)
- [Microsoft REST API Guidelines: Versioning](https://github.com/microsoft/api-guidelines)
- [Pact Contract Testing](https://docs.pact.io/)
