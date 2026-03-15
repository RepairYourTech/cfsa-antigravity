> **Framework context required**: This is a protocol excerpt. Before following these steps, read `.agent/skills/session-continuity/SKILL.md` for the complete framework — including the Adaptive Granularity Rule, Level Hierarchy Reference, Frozen Files concept, and Parallel Claim protocol. Protocol files are reference documents for specific steps, not standalone instructions.

# Protocol 5: Session Close

> Part of [Session Continuity](../SKILL.md) — read the index for overview, directory structure, and integration points.

**Invoked by**: End of session (agent should do this before signing off)

**Purpose**: Write a session log so the next session can resume cleanly.

## Steps

1. **Create `sessions/YYYY-MM-DD.md`**:
   ```markdown
   # Session: 2026-02-15

   ## Context
   - Resumed from: Phase 2, Slice 3
   - Goal for session: Implement auth middleware + rate limiting

   ## Accomplished
   - [x] Phase 2, Slice 3 — Auth middleware (complete)
   - [x] Phase 2, Slice 3a — Token refresh logic (complete)

   ## Deferred
   - [ ] Phase 2, Slice 4 — Rate limiting (blocked on Redis config)

   ## Patterns Learned
   - PAT-007: Schema coercion for URL params

   ## Next Session
   - Resolve BLK-003 (Redis config)
   - Start Phase 2, Slice 4 if unblocked
   - Otherwise skip to Phase 2, Slice 5
   ```

2. **If a session log for today already exists**, append to it (don't overwrite).
