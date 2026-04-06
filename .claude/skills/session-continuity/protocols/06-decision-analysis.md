> **Framework context required**: This is a protocol excerpt. Before following these steps, read `.agent/skills/session-continuity/SKILL.md` for the complete framework — including the Adaptive Granularity Rule, Level Hierarchy Reference, Frozen Files concept, and Parallel Claim protocol. Protocol files are reference documents for specific steps, not standalone instructions.

# Protocol 6: Decision Effect Analysis

> Part of [Session Continuity](../SKILL.md) — read the index for overview, directory structure, and integration points.

**Invoked by**: Any moment a non-trivial decision needs to be made

**Purpose**: Two-pass deliberation — the Philosopher explores, the Analyst
stress-tests. Same questions, different lenses. They loop until they agree.
No code is written until convergence.

## Triage: Should This Protocol Be Invoked?

**Does this decision have upstream or downstream effects?**

- **Isolated** (UI element shape, variable name, test structure) → **Skip**. Just decide.
- **Has ripple effects** (touches other components, changes contracts, affects data
  flow, sets precedent) → **Invoke**.

Rule of thumb: if changing this later requires editing more than the current file,
it has ripple effects.

## Pass 1: The Philosopher

1. **What are the project's established guidelines and protocols for this?**
   Read the relevant rules, instructions, specs, and existing patterns.

2. **What are the different ways to accomplish this within those guidelines?**
   List at least 3 viable approaches (forcing function against first-idea bias).

3. **What are the pros and cons of each?**
   Be specific — name concrete trade-offs, not vague qualities.

4. **Which one is the clear winner and why?**
   State the recommendation with reasoning.

## Pass 2: The Devil's Advocate

Take the Philosopher's recommendation and **try to find flaws in it**:

1. **What are the project's established guidelines and protocols for this?**
   Did the Philosopher miss any? Misinterpret any?

2. **What are the different ways to accomplish this within those guidelines?**
   Review the options the Philosopher considered. Did they overlook any?

3. **What are the pros and cons of each?**
   Did the Philosopher underweight a con or overweight a pro?
   Are there hidden costs they didn't surface?

4. **Do I agree with the Philosopher's recommendation, or is there a better way?**
   - **If agree** → proceed to Record step
   - **If disagree** → state what's better and why, then **push findings back
     to the Philosopher** for another pass

## Convergence Loop

If the Devil's Advocate disagrees, the Philosopher reviews those findings and
re-evaluates. The Devil's Advocate then scrutinizes again. **Repeat until both
agree.**

They are twins with different jobs — the Philosopher explores and proposes,
the Devil's Advocate stress-tests and finds flaws. Together they catch blind spots.

## Record

Once converged, write to `memory/decisions.md`:
```markdown
### DEC-004: Use middleware over per-route auth (2026-02-15)
- **Problem**: 12+ routes need identical auth enforcement
- **Guidelines checked**: security-first rule, extensibility rule, DRY principle
- **Options considered**: Per-route checks, middleware, decorator pattern
- **Decision**: Middleware — single enforcement point
- **Philosopher reasoning**: DRY, single place to enforce and audit
- **Devil's Advocate concurrence**: Agreed — per-route is a security risk (forgotten routes)
- **Upstream**: Depends on Firebase Admin SDK token verification
- **Downstream**: All future routes auto-protected; public routes need opt-out
- **Reversibility**: Medium — mechanical but touches every route file
```

## Proceed

The decision is justified, stress-tested, and recorded. Implement it.
