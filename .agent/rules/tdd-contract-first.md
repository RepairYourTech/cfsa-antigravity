---
description: Zod schema before implementation, failing test before code — Red Green Refactor every slice
alwaysApply: true
---

# TDD & Contract-First Development

> **The CFPA Order**: Contract (Zod schema) → Tests (failing) → Implementation (make them pass) → Never reverse this.

## Contract-First: Schema Before Code

Every data boundary gets a Zod schema **before** any implementation:

| Scenario | Schema Required |
|----------|----------------|
| New API endpoint | Request/response schemas |
| New DB model | Document/record schema |
| New UI form | Form data schema |
| New config | Configuration schema |
| External integration | External data shape schema |

### What Contract Tests Must Cover

- ✅ Valid input accepted
- ✅ Invalid input rejected with correct error
- ✅ Edge cases (empty, null, boundary values)
- ✅ Type coercion where applicable
- ✅ Required vs optional fields

## TDD: Tests ARE The Spec

Every feature starts with a **failing test**:

```
Red → Green → Refactor
```

1. **Red**: Write a test that fails (proves the feature doesn't exist yet)
2. **Green**: Write the minimum code to make it pass
3. **Refactor**: Clean up without changing behavior

### Five Test Levels

| Level | What | When |
|-------|------|------|
| Contract | Zod schema validation | Every data boundary |
| Permission | RBAC + ownership | Every protected resource |
| Unit | Pure logic | Every function with logic |
| Integration | Component interaction | Every API endpoint |
| E2E | Full user flow | Every critical path |

### Non-Negotiables

- Tests pass before commit — **no exceptions**
- Test file lives next to source: `foo.ts` → `foo.test.ts`
- No `any` in test files — type your mocks
- Coverage minimum: 80% lines, 90% branches on critical paths
