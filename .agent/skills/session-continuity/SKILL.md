---
name: session-continuity
description: >
  Cross-session progress tracking, pattern extraction, and session resumption.
  Gives agents memory across sessions using markdown files in `.agent/progress/`.
  Subsumes self-improving-agent — handles both implementation tracking AND
  experiential learning in one skill. Workflows invoke specific protocols by name.
triggers:
  - session start (via workflow.md instruction)
  - plan-phase step 7 (Progress Generation Protocol)
  - implement-slice step 0.5 and step 7 (Session Resumption + Progress Update)
  - end of any workflow (Pattern Extraction Protocol)
---

# Session Continuity

Cross-session memory and spec-driven implementation tracking. This skill replaces
`self-improving-agent` by combining progress tracking with pattern extraction
in a single, workflow-driven system.

## Overview

Without this skill, agents lose all context between sessions. Work restarts from
scratch, implementations drift without spec accountability, and hard-won patterns
evaporate. This skill fixes that with five protocols that workflows invoke by name.

### What This Skill Does

| Capability | What | When |
|------------|------|------|
| Progress tracking | Checkboxes mirroring spec depth | `/plan-phase`, `/implement-slice` |
| Session resumption | Read state, summarize, pick up where you left off | Any workflow start |
| Pattern extraction | Record what worked, what didn't, update patterns | Any workflow end |
| Blocker tracking | Log blockers, track resolution | During implementation |
| Decision analysis | Philosopher + Devil's Advocate deliberation | During design/architecture decisions |
| Spec pipeline tracking | Per-shard IA/BE/FE spec completion | `/decompose-architecture`, `write-*-spec` |
| Ambiguity gates | Micro + macro ambiguity checks | End of every spec workflow |

### Architecture

```
Workflows  = WHAT to do (ordered steps — invoke protocols by name)
This Skill = HOW to do it (protocols — detailed step-by-step)
```

Workflows say: "Read `.agent/skills/session-continuity/protocols/NN-protocol-name.md` and follow the **X Protocol**."
This skill defines each protocol with exact steps, file formats, and rules.

---

## Directory Structure

All progress state lives in `.agent/progress/`:

```
.agent/progress/
├── index.md                      # Master checklist — phases + overall %
├── spec-pipeline.md              # Spec completion tracker (IA/BE/FE per shard)
├── phases/
│   ├── phase-01.md               # Per-phase slice checklist
│   └── phase-02.md
├── slices/
│   ├── phase-01-slice-01.md      # Per-slice implementation log
│   └── phase-01-slice-02.md      # (only if slice has ≥3 criteria)
├── sessions/
│   ├── 2026-02-15.md             # What happened this session
│   └── 2026-02-16.md
└── memory/
    ├── patterns.md               # Reusable patterns + confidence
    ├── blockers.md               # Active + resolved blockers
    └── decisions.md              # Key decisions + rationale
```

### Adaptive Granularity Rule

**A slice gets its own file only when it has ≥3 acceptance criteria.**

- Slice with 1-2 criteria → tracked inline in the phase file
- Slice with 3+ criteria → gets `slices/phase-NN-slice-NN.md`

This prevents file explosion for simple specs while giving granular tracking
for complex ones.

---

## Protocol 1: Session Resumption

**Invoked by**: Any workflow start, or `instructions/workflow.md` step 1

**Purpose**: Load cross-session context so the agent knows where to resume.

### Steps

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

---

## Protocol 2: Progress Generation

**Invoked by**: `/plan-phase` step 7

**Purpose**: Create progress tracking files from a newly planned phase.

### Steps

1. **Read the phase plan** that was just created (the output of `/plan-phase`).

2. **Create or update `index.md`**:
   ```markdown
   # Implementation Progress

   **Project**: {{PROJECT_NAME}}
   **Last updated**: {{DATE}}
   **Overall**: 0/{{TOTAL}} slices (0%)

   ## Phases

   | Phase | Status | Progress | Link |
   |-------|--------|----------|------|
   | Phase 1: {{NAME}} | not-started | 0/{{N}} | [→](phases/phase-01.md) |
   ```

3. **Create `phases/phase-NN.md`**:
   ```markdown
   # Phase {{N}}: {{NAME}}

   **Status**: not-started
   **Progress**: 0/{{TOTAL}} slices

   ## Slices

   - [ ] **Slice 1**: {{DESCRIPTION}} ({{S|M|L}})
     - [ ] Contract: Zod schema for {{entity}}
     - [ ] `BE` API endpoints for {{entity}}
       - [ ] Subtask 1
       - [ ] Subtask 2
     - [ ] `FE` {{entity}} page and components
       - [ ] Subtask 1
       - [ ] Subtask 2
     - [ ] `QA` Integration tests for {{entity}}
       - [ ] Subtask 1
     → [log](../slices/phase-01-slice-01.md)

   - [ ] **Slice 2**: {{DESCRIPTION}} ({{S}})
     - [ ] Criterion 1
   ```

   **Surface tag rules for Progress Generation:**
   - Tag tasks (Level 3) with `BE`, `FE`, or `QA` as a backtick-wrapped prefix
   - Untagged tasks are sequential (handled by orchestrator before parallel dispatch)
   - `files:` blocks are NOT written during generation — only during claim (Protocol 9)
   - Subtasks under tagged tasks inherit the parent's surface ownership

4. **Create `slices/phase-NN-slice-NN.md`** for each slice with ≥3 criteria:
   ```markdown
   # Phase {{P}} / Slice {{S}}: {{NAME}}

   **Status**: not-started
   **Complexity**: {{S|M|L}}

   ## Acceptance Criteria
   - [ ] Criterion 1
   - [ ] Criterion 2
   - [ ] Criterion 3

   ## Implementation Notes
   <!-- Filled during /implement-slice -->

   ## Files Changed
   <!-- List of files created/modified -->
   ```

5. **Initialize memory files** (only if they don't already exist):
   - `memory/patterns.md` — empty with header
   - `memory/blockers.md` — empty with header
   - `memory/decisions.md` — empty with header

---

## Protocol 3: Progress Update

**Invoked by**: `/implement-slice` step 7

**Purpose**: Mark completed work, release claims, and propagate status changes upward.

### Steps

1. **Mark acceptance criteria `[x]`** in the slice's tracking location:
   - If slice has its own file: update `slices/phase-NN-slice-NN.md`
   - If inline: update `phases/phase-NN.md`

2. **Release any claimed tasks** — if the completed task had `[!]`:
   - Change status from `[/]` to `[x]`
   - Remove the `[!]` flag from the task line
   - Remove the `files:` block under the task (lock released)
   ```markdown
   # Before (during parallel work)
   - [/] `BE` API endpoints for user profile [!]
     - files: src/api/users/[id].ts, src/db/queries/user.ts
     - [x] GET endpoint
     - [x] PUT endpoint

   # After (task complete)
   - [x] `BE` API endpoints for user profile
     - [x] GET endpoint
     - [x] PUT endpoint
   ```

3. **Mark the slice itself `[x]`** in the phase file (only when ALL tasks are `[x]`):
   ```markdown
   - [x] **Slice 3**: Auth middleware (M) ✅ 2026-02-15
   ```

4. **Update phase progress** in the phase file header:
   ```markdown
   **Status**: in-progress
   **Progress**: 4/7 slices
   ```

5. **Update `index.md`** — recalculate overall progress:
   ```markdown
   **Overall**: 12/20 slices (60%)
   ```
   Update the phase row's status and progress count.

6. **Log implementation notes** (if slice file exists):
   - What approach was taken
   - Key files changed
   - Any deviations from the plan

7. **Log blockers** encountered during implementation to `memory/blockers.md`:
   ```markdown
   ## Active Blockers

   ### BLK-003: Redis config missing (2026-02-15)
   - **Slice**: Phase 2, Slice 4 — Rate limiting
   - **Impact**: Cannot implement rate limiter without Redis connection
   - **Needs**: VPS Redis setup or config from user

   ## Resolved Blockers

   ### BLK-002: Firebase admin SDK version conflict (2026-02-14)
   - **Resolution**: Pinned to v12.0.0, added to package.json overrides
   - **Resolved**: 2026-02-14
   ```

---

## Protocol 4: Pattern Extraction

**Invoked by**: End of any workflow (replaces `self-improving-agent` step)

**Purpose**: Extract reusable patterns from what just happened.

### Steps

1. **Reflect on the task**:
   - What happened? (summary)
   - What worked well? (repeat this)
   - What didn't work? (avoid this)
   - Was there a surprise or insight?

2. **Classify the pattern**:

   | Classification | Criteria | Action |
   |---------------|----------|--------|
   | Best practice | Worked well, likely reusable | Add to patterns.md |
   | Anti-pattern | Caused problems, should avoid | Add to patterns.md as "avoid" |
   | Context-specific | Only applies to this situation | Log in session but don't generalize |
   | Not significant | Routine, nothing new learned | Skip |

3. **Write to `memory/patterns.md`** (only for best-practice or anti-pattern):
   ```markdown
   ### PAT-007: Zod schema coercion for URL params (2026-02-15)
   - **Type**: best-practice
   - **Confidence**: 0.7 (applied 1 time)
   - **Context**: Astro API routes receive all params as strings
   - **Pattern**: Use `z.coerce.number()` instead of `z.number()` for URL params
   - **Source**: Phase 2, Slice 3 implementation
   ```

4. **Update confidence on existing patterns** if reapplied:
   - Increment `applied` count
   - Increase confidence: `new_confidence = min(0.95, old + 0.1)`

5. **Post-decision pushback** — for each decision made during this workflow
   (logged via Protocol 6 or made implicitly), challenge it with hindsight:

   - **Did it hold up?** — Did implementation confirm or undermine the reasoning?
   - **Surprises?** — Did anything unexpected happen because of this choice?
   - **Would you choose differently now?** — With what you learned during impl, same call?
   - **Scope creep?** — Did the decision force unplanned work or workarounds?

   If the answer to "would you choose differently" is **yes**, log it as a
   revision candidate in `memory/decisions.md` with the original decision ID:
   ```markdown
   ### DEC-004-REVIEW: Middleware decision revisited (2026-02-16)
   - **Original**: DEC-004 — middleware over per-route auth
   - **What changed**: Discovered 3 public routes need explicit exclusions, increasing complexity
   - **Verdict**: Still correct, but add route-level override capability
   - **Action**: Create follow-up slice for route exclusion config
   ```

   If no significant decisions were made during this workflow, skip this step.

---

## Protocol 5: Session Close

**Invoked by**: End of session (agent should do this before signing off)

**Purpose**: Write a session log so the next session can resume cleanly.

### Steps

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
   - PAT-007: Zod coercion for URL params

   ## Next Session
   - Resolve BLK-003 (Redis config)
   - Start Phase 2, Slice 4 if unblocked
   - Otherwise skip to Phase 2, Slice 5
   ```

2. **If a session log for today already exists**, append to it (don't overwrite).

---

## Protocol 6: Decision Effect Analysis

**Invoked by**: Any moment a non-trivial decision needs to be made

**Purpose**: Two-pass deliberation — the Philosopher explores, the Analyst
stress-tests. Same questions, different lenses. They loop until they agree.
No code is written until convergence.

### Triage: Should This Protocol Be Invoked?

**Does this decision have upstream or downstream effects?**

- **Isolated** (UI element shape, variable name, test structure) → **Skip**. Just decide.
- **Has ripple effects** (touches other components, changes contracts, affects data
  flow, sets precedent) → **Invoke**.

Rule of thumb: if changing this later requires editing more than the current file,
it has ripple effects.

### Pass 1: The Philosopher

1. **What are the project's established guidelines and protocols for this?**
   Read the relevant rules, instructions, specs, and existing patterns.

2. **What are the different ways to accomplish this within those guidelines?**
   List at least 3 viable approaches (forcing function against first-idea bias).

3. **What are the pros and cons of each?**
   Be specific — name concrete trade-offs, not vague qualities.

4. **Which one is the clear winner and why?**
   State the recommendation with reasoning.

### Pass 2: The Devil's Advocate

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

### Convergence Loop

If the Devil's Advocate disagrees, the Philosopher reviews those findings and
re-evaluates. The Devil's Advocate then scrutinizes again. **Repeat until both
agree.**

They are twins with different jobs — the Philosopher explores and proposes,
the Devil's Advocate stress-tests and finds flaws. Together they catch blind spots.

### Record

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

### Proceed

The decision is justified, stress-tested, and recorded. Implement it.

---

## Protocol 7: Spec Pipeline Generation

**Invoked by**: `/decompose-architecture` (after creating indexes)

**Purpose**: Create a spec pipeline tracker so you always know which shards
have IA specs, BE specs, and FE specs completed.

### Steps

1. **Read the IA index** — `docs/plans/ia/index.md` — to get the list of shards.

2. **Create `.agent/progress/spec-pipeline.md`**:
   ```markdown
   # Spec Pipeline Progress

   **Project**: {{PROJECT_NAME}}
   **Last updated**: {{DATE}}
   **Overall**: 0/{{N×3}} specs (0%)

   ## Shard Spec Status

   | # | Shard | IA Spec | BE Spec | FE Spec |
   |---|-------|---------|---------|---------|
   | 00 | {{shard-name}} | ❌ | ❌ | ❌ |
   | 01 | {{shard-name}} | ❌ | ❌ | ❌ |
   | ... | ... | ... | ... | ... |

   ## Spec Completion Tracking

   Shards with all three specs complete (tracking only — /plan-phase requires ALL shards to be complete, not just individual ones):
   - (none yet)
   ```

3. **Initialize memory files** if they don't exist (same as Protocol 2, step 5).

---

## Protocol 8: Spec Pipeline Update

**Invoked by**: `/write-architecture-spec`, `/write-be-spec`, `/write-fe-spec`
(after updating the layer index)

**Purpose**: Mark a spec column done and report pipeline progress.

### Steps

1. **Identify the shard and layer** — which shard just got its spec completed,
   and which layer (IA, BE, or FE)?

2. **Update `spec-pipeline.md`** — change the relevant ❌ to ✅:
   ```markdown
   | 03 | user-profiles | ✅ | ✅ | ❌ |
   ```

3. **Recalculate overall progress**:
   ```markdown
   **Overall**: 8/45 specs (18%)
   ```

4. **Update "Spec Completion Tracking"** — if a shard now has all three specs
   complete (IA ✅ + BE ✅ + FE ✅), add it to the completion tracking list. Note: /plan-phase requires ALL shards to be complete, not just this one.
   ```markdown
   ## Spec Completion Tracking

   Shards with all three specs complete (tracking only — /plan-phase requires ALL shards to be complete, not just individual ones):
   - ✅ Shard 00: API conventions
   - ✅ Shard 01: Authentication
   ```

5. **Report status** — log what was completed and what's next.

---

## Ambiguity Gates (Micro + Macro)

**Invoked by**: Every `write-*-spec` workflow, before "Request review"

**Purpose**: Ensure no guesses pass downstream. Two levels:

### Micro Ambiguity Check

Walk **each individual element** in the spec and ask:
> "Would an implementer need to guess about this?"

| Workflow | What to check |
|----------|---------------|
| `/write-architecture-spec` | Each feature, interaction, data model field, access rule, edge case |
| `/write-be-spec` | Each endpoint, request/response field, error code, schema constraint, middleware rule |
| `/write-fe-spec` | Each component, prop, interaction, state transition, responsive breakpoint, a11y rule |

For every element where the answer is "yes" → **fix it now**. Add the missing
detail, type, behavior, or constraint. Don't flag it — resolve it.

### Macro Ambiguity Check

Step back and ask about the **entire spec**:
> "Does the next downstream phase have everything it needs?"

| Workflow | Downstream question |
|----------|--------------------|
| `/write-architecture-spec` | Would the BE spec writer need to guess anything from this IA shard? |
| `/write-be-spec` | Would the FE spec writer need to guess anything from this BE spec? |
| `/write-fe-spec` | Would an implementer running `/implement-slice` need to guess anything? |

If the answer is "yes" → **fix it now**. The spec is not complete until the
downstream phase can work from it without assumptions.

### Relationship to `/audit-ambiguity`

The ambiguity gates are **inline, lightweight, fix-it-now** checks. The
`/audit-ambiguity` workflow is a **standalone, scored, report-generating**
audit you run across multiple documents at once. They complement each other:

- Gates: prevent ambiguity from entering (at write time)
- Audit: detect ambiguity that slipped through (after the fact)

---

## Protocol 9: Parallel Claim

**Invoked by**: `/implement-slice` step 1.5 (parallel dispatch)

**Purpose**: Coordinate parallel agent ownership of tasks using claim markers
and file-level locks. Prevents two agents from modifying the same files.

### Concepts

| Concept | Description |
|---------|-------------|
| **Surface tag** | `BE`, `FE`, or `QA` prefix on a task, determines which agent type handles it |
| **Claim flag `[!]`** | Appended to a task line — means an agent owns this task and all subtasks |
| **`files:` block** | Listed directly under a claimed task — hard lock on those files |
| **Frozen files** | Files no parallel agent may touch: `package.json`, `pnpm-lock.yaml`, `astro.config.mjs`, `src/contracts/*`, `tsconfig.json`, `.env` |

### Claiming a Task

When an agent is dispatched to a surface-tagged task:

1. **Change status** from `[ ]` to `[/]`
2. **Append `[!]`** to the end of the task line
3. **Write `files:` block** directly under the task line, listing every file the agent will modify:
   ```markdown
   - [/] `BE` API endpoints for user profile [!]
     - files: src/api/users/[id].ts, src/db/queries/user.ts
     - [ ] GET /api/users/:id
     - [ ] PUT /api/users/:id
   ```
4. **Subtasks inherit the claim** — the agent owns all nested items under the claimed task

### Collision Check

Before dispatching agents, the orchestrator must verify no file overlap:

1. **Collect `files:` lists** from all tasks about to be claimed
2. **Check intersection** — if any file appears in more than one list:
   - **Same tag** → merge tasks (shouldn't happen if planned well)
   - **Different tags** → cannot parallelize. Run sequentially, assign to
     whichever tag owns the majority of files
3. **Check frozen files** — if any agent's `files:` list includes a frozen file,
   reject the claim and require a `// BOUNDARY:` stub approach instead
4. **Empty intersection** → ✅ safe to dispatch in parallel

### Releasing a Task

When an agent completes all subtasks under a claimed task:

1. **Change status** from `[/]` to `[x]`
2. **Remove `[!]`** from the task line
3. **Remove the `files:` block** (lock released)
4. All subtasks should be `[x]`

See Protocol 3 (Progress Update) step 2 for the exact format.

### Dependency Rules (TDD Order)

> **Tests are the rock. Code is malleable.** If tests fail, the code changes —
> never the tests. Shallow or simplified tests that force passing results are
> the single greatest failure mode. Comprehensive tests are non-negotiable.

The dependency chain follows strict TDD: Red → Green → Verify.

| Phase | Tag | What Happens | Depends On |
|-------|-----|-------------|------------|
| 1. Contract | (untagged) | Orchestrator writes Zod schemas | Nothing |
| 2. QA-RED | `QA` | Write comprehensive failing tests from acceptance criteria | Contract `[x]` |
| 3. BE + FE | `BE`, `FE` | Implement in parallel to make tests pass | QA-RED `[x]` |
| 4. QA-GREEN | `QA` | Second pass — verify all tests pass, check for cheating, add integration/E2E | BE `[x]` + FE `[x]` |

### Iterative Correction Loop

If QA-GREEN finds failures:

1. **Never weaken or simplify tests** — tests encode the acceptance criteria
2. **Report failures** to orchestrator with specific test names and error output
3. **Orchestrator re-dispatches** `BE` and/or `FE` agents to fix failing code
4. **QA-GREEN runs again** — repeat until all tests pass
5. **Only the orchestrator may terminate the loop** — agents cannot declare "good enough"

```
Contract → QA-RED → BE+FE (parallel) → QA-GREEN
                                           ↓
                                     Tests pass? ──Yes──→ Slice complete
                                           ↓ No
                                     Re-dispatch BE/FE → QA-GREEN (repeat)
```

### Stale Lock Recovery

If an agent crashes mid-task (leaving `[!]` without completing):

1. **Manual cleanup**: User or orchestrator resets the task from `[/]` to `[ ]`,
   removes `[!]` and `files:` block
2. **Subtask state preserved**: Any subtasks already marked `[x]` remain — the
   new agent picks up from the first `[ ]` subtask
3. **Prevention**: Agents should update subtask status incrementally, not batch
   at the end

### Level Hierarchy Reference

```
Level 1: Phase       [ ] [/] [x]         — no tags, no [!]
Level 2: Slice       [ ] [/] [x]         — no tags, no [!]
Level 3: Task        [ ] [/] [x] + [!]   — has BE/FE/QA tag, claimable
Level 4+: Subtask    [ ] [/] [x]         — no [!], owned by parent task's agent
```

---

## Integration Points

Workflows reference this skill's protocols, not its internals:

| Workflow | Step | Protocol |
|----------|------|----------|
| `instructions/workflow.md` | Step 1 (context) | Session Resumption |
| `/decompose-architecture` | After creating indexes | Spec Pipeline Generation |
| `/write-architecture-spec` | After updating IA index | Spec Pipeline Update |
| `/write-architecture-spec` | Before request review | Ambiguity Gates (micro + macro) |
| `/write-architecture-spec` | During design choices | Decision Effect Analysis |
| `/write-be-spec` | After updating BE index | Spec Pipeline Update |
| `/write-be-spec` | Before request review | Ambiguity Gates (micro + macro) |
| `/write-fe-spec` | After updating FE index | Spec Pipeline Update |
| `/write-fe-spec` | Before request review | Ambiguity Gates (micro + macro) |
| `/plan-phase` | Step 7 | Progress Generation |
| `/create-prd` | During design choices | Decision Effect Analysis |
| `/implement-slice` | Step 0 | Session Resumption |
| `/implement-slice` | Step 1.5 | Parallel Claim |
| `/implement-slice` | Step 4 (during impl) | Decision Effect Analysis |
| `/implement-slice` | Step 7 | Progress Update (incl. claim release) |
| `/fix-bug` | End | Pattern Extraction |
| `/refactor` | End | Pattern Extraction |
| Any workflow | End | Pattern Extraction + Session Close |

## DO / DON'T

### DO
- ✅ Create progress files that mirror spec depth exactly
- ✅ Mark items immediately when complete (never defer check-offs)
- ✅ Log blockers the moment they're encountered
- ✅ Write session close log before ending any session
- ✅ Only add patterns with genuine reuse value

### DON'T
- ❌ Over-generalize from a single experience (set confidence low)
- ❌ Create slice files for trivial slices (< 3 criteria)
- ❌ Skip session resumption at workflow start
- ❌ Let progress files drift from actual state
- ❌ Log every minor observation as a "pattern"
