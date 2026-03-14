---
name: minimalist-surgical-development
description: "Use when editing an existing codebase and the goal is minimal, standard, and non-invasive changes — prioritizes simplest solution, standard libraries first, and surgical modification without unsolicited refactors"
version: 2.0.0
source: self
date_added: "2026-02-27"
date_rewritten: "2026-03-14"
---

# Minimalist & Surgical Development

**Code like Kent Beck.** Solve the stated problem with the least code and the least disruption to the existing structure.

## When to Use

- Task emphasizes "minimal changes", "surgical fix", "preserve structure", "don't refactor"
- Modifying existing code rather than building from scratch
- Temptation exists to introduce new abstractions, frameworks, or large rewrites
- Bug fixes where scope creep is the real risk

## When NOT to Use

- Greenfield development (building from scratch)
- Explicit refactoring requests ("restructure this module")
- Performance work that requires architectural change

---

## Minimalist Code Generation

### Simplicity First

Always provide the most straightforward solution possible. The goal is to solve the problem with the least amount of code and complexity.

```typescript
// ❌ Over-engineered
class ConfigurableRetryStrategy {
  constructor(private config: RetryConfig) {}
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 40 lines of retry logic with exponential backoff...
  }
}

// ✅ Minimalist (if you only retry once)
try {
  result = await fetchData();
} catch {
  result = await fetchData(); // One retry
}
```

### Standard Library First

Heavily favor standard library functions and widely accepted common patterns. Only introduce third-party libraries if they are the industry standard for the task or absolutely necessary.

```typescript
// ❌ Adding lodash for one function
import { groupBy } from "lodash";
const grouped = groupBy(items, "category");

// ✅ Standard library
const grouped = Object.groupBy(items, (item) => item.category);
// Or if targeting older runtimes:
const grouped = items.reduce((acc, item) => {
  (acc[item.category] ??= []).push(item);
  return acc;
}, {} as Record<string, typeof items>);
```

### Focus on the Core Request

Generate code that directly addresses the user's request. Do not add extra features or handle edge cases that were not mentioned.

## Surgical Code Modification

### Preserve Existing Code

The current codebase is the source of truth. Respect its structure, style, and logic.

### Minimal Necessary Changes

When adding a feature or fixing a bug, alter the absolute minimum amount of existing code required.

```diff
 // The user asked: "add a createdAt timestamp to new users"
 function createUser(data: UserInput): User {
   return db.users.insert({
     ...data,
+    createdAt: new Date(),
     status: "active",
   });
 }
 // That's it. Don't refactor the function, rename variables,
 // add types, or "improve" unrelated code.
```

### Explicit Instructions Only

Only modify, refactor, or delete code that has been explicitly targeted by the user's request. Do not perform unsolicited refactoring, cleanup, or style changes on untouched code.

### Integrate, Don't Replace

Whenever feasible, integrate new logic into the existing structure rather than replacing entire functions or blocks.

## Navigation Before Modification

Before making any change, understand what you're modifying:

1. **Read the target** — view the specific function/class being changed
2. **Check call sites** — grep for usages to understand impact
3. **Respect patterns** — if the codebase does X one way, continue that way
4. **Verify after** — run the relevant tests, not the whole suite unless needed

## Quick Checklist

Before submitting a change:

- [ ] Is this the smallest diff that satisfies the requirement?
- [ ] Did I avoid modifying unrelated code?
- [ ] Did I use existing utilities/abstractions instead of adding new ones?
- [ ] Did I avoid adding new dependencies?
- [ ] Does the change follow existing code style and patterns?
- [ ] If I added an abstraction — was it explicitly requested?

## Anti-Patterns

| Don't | Do |
|-------|-----|
| "While I'm here, let me also..." | Only change what was requested |
| Introduce new abstractions unprompted | Use existing patterns |
| Add a library for one utility function | Use standard library |
| Replace an entire function for a one-line fix | Surgical single-line edit |
| "Improve" naming in unrelated code | Respect existing conventions |
| Handle edge cases not mentioned | Solve the stated problem |
| Add types/docs to untouched functions | Leave existing code alone |
