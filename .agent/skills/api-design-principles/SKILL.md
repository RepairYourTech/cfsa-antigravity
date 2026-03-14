---
name: api-design-principles
description: "Master REST and GraphQL API design principles to build intuitive, scalable, and maintainable APIs that delight developers. Use when designing new APIs, reviewing API specifications, or establishing API design standards."
version: 2.0.0
source: self
date_added: "2026-02-27"
date_rewritten: "2026-03-14"
---

# API Design Principles

Design APIs that developers love to use — consistent, predictable, and well-documented.

## When to Use

- Designing new REST or GraphQL APIs
- Reviewing API specs before implementation
- Establishing API design standards for a team
- Migrating between API paradigms

## When NOT to Use

- Framework-specific implementation details (use stack skills instead)
- Infrastructure-only work without API contracts
- Existing APIs that cannot be versioned

---

## Core Rules

### 1. Resources Are Nouns, Methods Are Verbs

```
✅ GET    /api/users          → List users
✅ POST   /api/users          → Create user
✅ GET    /api/users/{id}     → Get user
✅ PATCH  /api/users/{id}     → Update user fields
✅ DELETE /api/users/{id}     → Delete user

❌ POST   /api/createUser
❌ GET    /api/getUserById
❌ POST   /api/deleteUser
```

### 2. HTTP Methods Have Meaning

| Method | Purpose | Idempotent | Safe | Request Body |
|--------|---------|------------|------|:------------:|
| GET | Read | ✅ | ✅ | No |
| POST | Create | ❌ | ❌ | Yes |
| PUT | Replace | ✅ | ❌ | Yes |
| PATCH | Partial update | ❌ | ❌ | Yes |
| DELETE | Remove | ✅ | ❌ | No |

### 3. Status Codes Tell the Story

| Code | When | Example |
|------|------|---------|
| 200 | Success with body | GET returns resource |
| 201 | Created | POST creates new resource |
| 204 | Success, no body | DELETE succeeds |
| 400 | Client sent bad data | Malformed JSON |
| 401 | Not authenticated | Missing/invalid token |
| 403 | Authenticated but not authorized | Wrong role |
| 404 | Resource doesn't exist | Invalid ID |
| 409 | Conflict | Duplicate email |
| 422 | Valid JSON, invalid content | Email format wrong |
| 429 | Rate limited | Too many requests |
| 500 | Server error | Unhandled exception |

### 4. Error Responses Are Structured

```json
{
  "error": "ValidationError",
  "code": "INVALID_EMAIL",
  "message": "Email address is not valid",
  "details": {
    "field": "email",
    "value": "not-an-email",
    "constraint": "Must be a valid email format"
  }
}
```

**Rules:**
- Same envelope for every error
- Machine-readable `code` for client logic
- Human-readable `message` for display
- `details` for field-level validation errors
- NEVER include stack traces in production

### 5. Always Paginate Collections

```
GET /api/users?page=2&page_size=20

Response:
{
  "items": [...],
  "total": 243,
  "page": 2,
  "page_size": 20,
  "pages": 13
}
```

For GraphQL, use cursor-based pagination (Relay spec):

```graphql
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
```

### 6. Version From Day One

| Strategy | URL | Header | Query |
|----------|-----|--------|-------|
| Example | `/api/v1/users` | `Accept: application/vnd.api+json; version=1` | `/api/users?version=1` |
| Pros | Simple, visible | Clean URLs | Simple to add |
| Cons | URL pollution | Hidden from browsers | Caching complexity |
| Best for | Most APIs | Internal APIs | Quick prototypes |

### 7. Rate Limit Everything Public

Every public endpoint must return rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1625097600
```

## API Design Checklist

Before implementing any endpoint:

- [ ] Resource name is a plural noun
- [ ] HTTP method matches the operation semantics
- [ ] Request/response schemas are defined (contract-first)
- [ ] Error responses use consistent envelope
- [ ] Pagination is implemented for collection endpoints
- [ ] Authentication and authorization rules are specified
- [ ] Rate limiting is configured
- [ ] API version is specified
- [ ] Input validation rules are documented per field

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Verbs in URLs (`/getUser`) | Nouns + HTTP methods (`GET /users`) |
| 200 for everything | Correct status codes per operation |
| Generic errors ("Something went wrong") | Structured errors with codes |
| Return all fields always | Support field selection or use GraphQL |
| Nest resources >2 levels deep | `/users/{id}/orders` max; flatten after that |
| Ignore backward compatibility | Version APIs; deprecation headers before removal |

## Extended Reference

See `resources/implementation-playbook.md` for:
- Full pagination implementation (FastAPI)
- HATEOAS patterns
- GraphQL schema design with Relay-style connections
- DataLoader patterns for N+1 prevention
- Complete code templates
