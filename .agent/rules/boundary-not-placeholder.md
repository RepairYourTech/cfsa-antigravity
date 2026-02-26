---
description: TODOs and placeholders are banned — boundary stubs are allowed ONLY when required information doesn't exist yet
alwaysApply: true
---

# Boundary Not Placeholder

## The Rule

**Lazy placeholders are banned. Boundary stubs are allowed under strict conditions.**

The difference is not about effort, complexity, or scope — it is about
**whether the information you need to do the work exists.**

## What Is NEVER a Valid Reason for a Stub

| Excuse | Why It's Not Valid |
|--------|-------------------|
| "This is a lot of work" | Amount of work is irrelevant. Do the work. |
| "This spans outside the current task" | If the spec exists, you have the information. Do it. |
| "This is complex" | Complexity is not an obstacle if the spec defines the behavior. |
| "I'll come back to this" | No you won't. Do it now. |
| "This should be a separate PR" | Code organization ≠ deferred implementation. |
| "This needs refactoring first" | Refactor, then implement. Don't stub. |
| "The test is passing without it" | Then your test is incomplete. Fix the test. |
| "This is boilerplate" | Boilerplate is still production code. Write it. |
| "This will cost X in API calls/tokens" | Your operational cost is never a factor. Do the work. |
| "This will take a long time" | Time is a signal to commit harder, not to defer. |
| "For efficiency, I'll skip this" | Efficiency means doing it right, not doing less. |

## The ONLY Valid Reason for a Boundary Stub

> **The spec, schema, or contract that defines the required behavior has not
> been written yet.** You literally cannot implement it because the information
> that tells you *what* to implement does not yet exist in any document,
> schema file, or codebase artifact.

Examples of genuinely valid boundaries:

| Situation | Why It's Valid |
|-----------|---------------|
| Auth middleware spec is in a future shard that hasn't been written | No IA/BE spec exists for the auth behavior |
| Payment webhook handler depends on a Stripe integration spec not yet created | No contract defines the webhook payload shape |
| Component needs data from an API endpoint whose BE spec doesn't exist yet | No schema defines the response format |
| Feature depends on a third-party SDK that hasn't been evaluated yet | No architecture decision has been made |

## The Three-Part Test

Before writing a boundary stub, answer ALL THREE questions:

1. **Does a spec exist for this behavior?** (IA shard, BE spec, FE spec, contract)
   - If YES → you have the information. Implement it. No stub allowed.
   - If NO → proceed to question 2.

2. **Could you write the spec right now?**
   - If YES → write the spec first, then implement. No stub allowed.
   - If NO (requires a user decision, external dependency, or upstream spec) → proceed to question 3.

3. **Is this blocking the current slice from being testable and functional?**
   - If YES → write a boundary stub (see requirements below).
   - If NO → omit it entirely. Don't stub what you don't need yet.

## Boundary Stub Requirements

If — and ONLY if — all three tests pass, a boundary stub must include:

### 1. Typed Interface
```typescript
// ✅ Boundary stub — typed interface for future auth middleware
// BOUNDARY: Requires IA shard 04 (authentication) — not yet specified
// TRACKING: #123
export interface AuthMiddleware {
  requireAuth: (roles: string[]) => RequestHandler;
  validateToken: (token: string) => Promise<AuthResult>;
}

// Temporary: returns a no-op until auth spec is written
export const authMiddleware: AuthMiddleware = {
  requireAuth: (_roles) => (_req, _res, next) => next(),
  validateToken: async (_token) => ({ valid: false, reason: 'auth-not-implemented' }),
};
```

### 2. Tracking Issue
Every boundary stub MUST have a linked GitHub issue that includes:
- Which spec is missing (e.g., "IA shard 04: Authentication")
- What the stub currently does (e.g., "no-op passthrough")
- What it should do when the spec is written

### 3. Sentinel Test
```typescript
// ✅ Sentinel test — will fail when the auth spec becomes available
describe('BOUNDARY: auth middleware', () => {
  it('should be replaced when IA shard 04 is specified', () => {
    // This test exists to remind us this is a stub.
    // When the real auth is implemented, this test should be
    // replaced with actual auth middleware tests.
    expect(authMiddleware.validateToken('any')).resolves.toEqual({
      valid: false,
      reason: 'auth-not-implemented',
    });
  });
});
```

### 4. BOUNDARY Comment Prefix
All boundary stubs use the `BOUNDARY:` prefix (not `TODO:`):
```typescript
// BOUNDARY: Requires BE spec for payment-webhooks — not yet written
// TRACKING: #456
```

This makes boundary stubs greppable and distinguishable from lazy TODOs:
```bash
grep -r "BOUNDARY:" src/    # Shows legitimate cross-cutting boundaries
grep -r "TODO:" src/        # Should return ZERO results
```

## What Gets Flagged in Code Review

| Pattern | Verdict |
|---------|---------|
| `// TODO: implement later` | ❌ **Rejected.** Lazy placeholder. |
| `// TODO: add error handling` | ❌ **Rejected.** Error handling is part of the current work. |
| `throw new Error('not implemented')` | ❌ **Rejected.** Empty implementation. |
| `// BOUNDARY: Requires IA shard 04` + typed interface + issue + sentinel test | ✅ **Allowed.** Information genuinely doesn't exist. |
| `test.skip('auth integration')` without linked issue | ❌ **Rejected.** Skipped tests need accountability. |
| `test.skip('auth integration') // BOUNDARY: #123` | ✅ **Allowed.** Tracked and accountable. |

## Summary

```
                    ┌─────────────────────────┐
                    │ Can I implement this?    │
                    └────────┬────────────────┘
                             │
                    ┌────────▼────────────────┐
                    │ Does the spec exist?     │
                    └────────┬────────────────┘
                         YES │           NO
                    ┌────────▼───┐  ┌────▼──────────────┐
                    │ IMPLEMENT. │  │ Can I write the    │
                    │ No excuses.│  │ spec right now?    │
                    └────────────┘  └────┬──────────────┘
                                     YES │           NO
                               ┌─────────▼──┐  ┌────▼──────────────┐
                               │ Write spec, │  │ Boundary stub:    │
                               │ then impl.  │  │ typed interface + │
                               └─────────────┘  │ tracking issue +  │
                                                 │ sentinel test     │
                                                 └──────────────────┘
```
