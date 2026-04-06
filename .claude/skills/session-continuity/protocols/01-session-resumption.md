> **Framework context required**: This is a protocol excerpt. Before following these steps, read `.agent/skills/session-continuity/SKILL.md` for the complete framework — including the Adaptive Granularity Rule, Level Hierarchy Reference, Frozen Files concept, and Parallel Claim protocol. Protocol files are reference documents for specific steps, not standalone instructions.

# Protocol 1: Session Resumption

> Part of [Session Continuity](../SKILL.md) — read the index for overview, directory structure, and integration points.

**Invoked by**: Any workflow start, or `instructions/workflow.md` step 1

**Purpose**: Load cross-session context so the agent knows where to resume.

## Steps

1. **Check if `.agent/progress/index.md` exists**
   - If no: this is a fresh project with no tracked progress. Skip resumption.
   - If yes: continue.

2. **Read `index.md`** — get overall status, phase progress percentages.

3. **Find in-progress items** — scan for `[/]` markers (in-progress) in phase files.
   - If found: this is the resumption point.
   - If none: find the next unchecked `[ ]` item.

4. **Read the latest session log** — `sessions/` directory, most recent file.
   - What was accomplished last session?
   - What was deferred and why?
   - What's the recommended starting point?

5. **Read `memory/blockers.md`** — are there unresolved blockers?

6. **Read `memory/decisions.md`** — load key decisions for context.

7. **Summarize for the current task**:
   ```
   Status: Phase 2 in progress — 3/7 slices complete (43%)
   Last session: Completed auth middleware slice, deferred rate limiting (blocked on Redis)
   Blockers: 1 active — Redis connection config needed
   Resume at: Phase 2, Slice 4 — Rate limiting middleware
   ```
