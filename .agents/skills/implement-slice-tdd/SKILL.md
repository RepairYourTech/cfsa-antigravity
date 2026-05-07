---
description: TDD Red→Green→Refactor cycle, validation, synthesis, and progress tracking for the implement-slice workflow
parent: implement-slice
shard: tdd
standalone: true
position: 2
pipeline:
  position: 7.2
  stage: implementation
  predecessors: [implement-slice-setup]
  successors: [validate-phase]
  skills: [clean-code, code-review-pro, parallel-debugging, session-continuity, systematic-debugging, tdd-workflow, verification-before-completion]
  calls-bootstrap: false
---

# Implement Slice — TDD & Progress

Execute the TDD cycle (Red → Green → Refactor), run validation, handle synthesis, and update all progress tracking files.

**Prerequisite**: Contract ({{CONTRACT_LIBRARY}} schema) must be written (from `/implement-slice-setup` or equivalent). If in parallel mode, QA-RED and BE/FE/QA-GREEN dispatch should be completed during setup.

---

## 3. Write failing tests (RED)

Read .agents/skills/tdd-workflow/SKILL.md and follow its methodology.
Read .agents/skills/clean-code/SKILL.md and follow its methodology.
Read .agents/skills/systematic-debugging/SKILL.md and follow its methodology.
Determine which surface this slice belongs to from the phase plan or slice path. Read the surface stack map from `.agents/instructions/tech-stack.md`.

Load the Languages, Unit Tests, and E2E Tests skill(s) from this slice's surface row per the skill loading protocol (`.agents/skills/prd-templates/references/skill-loading-protocol.md`).

Cross-reference **all three** sources — acceptance criteria from the phase plan, the {{CONTRACT_LIBRARY}} contract from step 2, AND IA edge cases traced through the BE Source Map:
1. Write a test for each acceptance criterion
2. Write a test for each contract field, error type, and validation rule not already covered by criteria
3. For each endpoint, read the IA shard section(s) cited in the BE spec `## Source Map`. Extract every relevant `## Edge Cases` item. Write a failing test for each, tagged `// IA-EDGE: [IA §X.Y — description]`
4. Run all tests — they MUST fail
5. Commit the failing tests

Read `.agents/skills/prd-templates/references/tdd-testing-policy.md` and apply its **Assertion Depth Rule** and **Anti-Mock-Abuse Rules** to all tests written above.

> **In parallel mode**, this step is handled by the `QA` agent dispatch in step 1.5.

Run the Test Cmd from this slice's surface row in the surface stack map to verify tests fail.

**RED test count validation**: Count the failing tests. Compare against the acceptance criteria count from the phase plan.
- If failing tests **< acceptance criteria count** → missing coverage. Review which criteria lack tests and add them before proceeding to GREEN.
- If failing tests **= 0** → **STOP**: "No tests are failing. Either tests were not written or they are incorrectly passing. Review test logic."

## 4. Implement (GREEN)

Load the Languages skill(s) from this slice's surface row per the skill loading protocol.

Write the simplest *correct* implementation to make all tests pass. "Minimal" means no unnecessary abstractions — it does **NOT** mean skipping error handling, input validation, logging, or edge cases that the spec defines:
1. Database schema/migration
2. API endpoint handler
3. Business logic
4. UI component

**If in parallel mode**: Each agent claims its task via the **Parallel Claim Protocol** (`.agents/skills/session-continuity/protocols/09-parallel-claim.md`).

**Before using any stub or placeholder**, apply the three-part test from the `boundary-not-placeholder` rule. Only missing information is a valid boundary — amount of work, scope, and complexity are never reasons to stub.

**Spec traceability**: Annotate any implementation decision not covered by the spec with `// DECISION: [what was decided and why]`. QA will audit these.

> **Decision recording**: For decisions with ripple effects (touching other components, changing contracts, setting precedent), read `.agents/skills/session-continuity/protocols/06-decision-analysis.md` and follow the **Decision Effect Analysis Protocol**. Isolated decisions don't need this — only decisions where changing it later requires editing more than the current file.

Run the Test Cmd to verify tests pass.

## 4.1. Debug cycle (if tests fail)

Read `.agents/skills/systematic-debugging/SKILL.md` and follow its ACH methodology. Read `.agents/skills/parallel-debugging/SKILL.md` if failures span multiple subsystems.

1. Classify: contract mismatch vs logic error vs integration issue
2. Contract mismatch → re-read BE spec — contract wrong or implementation?
3. Logic error → ACH per debugging skill
4. Integration issue → check cross-surface wiring, env vars, service connectivity
5. Maximum 3 iterations before escalating to user with:
   - Summary of each iteration's hypothesis and result
   - Current failing test output
   - Files modified during debug attempts
   - Recommended next steps (e.g., "may need manual env inspection" or "possible spec error in BE spec §X")

Run the Test Cmd after each iteration.

## 4.5. New dependency check

After GREEN, scan new imports. If any package lacks a corresponding skill directory in `.agents/skills/`:
1. Identify the technology or library
2. Read `.agents/skills/bootstrap-agents/SKILL.md` and invoke `/bootstrap-agents PIPELINE_STAGE=implement-slice` + the new dependency key
3. **HARD GATE**: Follow the bootstrap verification protocol (`.agents/skills/prd-templates/references/bootstrap-verification-protocol.md`). Confirm the matching skill is installed before proceeding to REFACTOR.

No new unregistered dependencies → skip to Step 4.9.

## 4.9. Slice depth ratio gate (mandatory — derived from spec)

Read `.agents/skills/prd-templates/references/slice-depth-floor.md` in full. The slice's planned `phase-N.md` entry should already include a computed depth floor and breakdown (added by `/plan-phase-write` § 4.4). If it does not, compute it now from the slice's referenced spec sections.

1. **Count delivered tests** for this slice. A "delivered test" is a test function that:
   - Lives in this slice's test files (or shared test files with explicit slice-tag comments), AND
   - Asserts a concrete behavior tied to a specific spec item (a field, a validation rule, an error code, a role, a state, an edge case)
   - Smoke tests, snapshot tests with no assertions, and "test that it renders" tests do NOT count.
2. **Compute ratio**: `delivered_tests / depth_floor`.
3. **Hard gate**:
   - `ratio >= 1.0` → proceed to Step 5.
   - `ratio < 1.0` → **STOP**. List every uncovered spec item (per the floor's breakdown). Return to Step 3 (RED), write failing tests for each uncovered item, then proceed through GREEN again. Do not weaken the floor; do not skip uncovered items by claiming they are "implicit." Every floor item must have an explicit test.
4. **Anti-cheat**: A test that asserts only `expect(result).toBeTruthy()` or `expect(response.status).toBe(200)` does not satisfy a floor item that requires verifying a specific field, error message, role denial, or state transition. Each floor item must be matched to at least one assertion that exercises that item's specific behavior.

Record the ratio and the matched item count in the slice progress file (`.memory/pipeline/progress/slices/<slice-id>.md`) under a `## Depth Ratio` section before proceeding.

## 5. Refactor

With tests green, improve code quality: extract shared logic, improve naming, remove duplication, add documentation.

Read `.agents/skills/code-review-pro/SKILL.md` and apply its adversarial review: "How would a senior engineer reject this in a PR review?"

**Structured spec completeness check**: Re-read the full BE spec section and FE spec section for this slice (loaded in setup Step 1.25). For each element, verify implementation coverage:

1. **Field coverage**: For every field in the BE spec's request/response schemas, verify it appears in the implementation. Flag any spec field with no corresponding code.
2. **Validation coverage**: For every validation rule in the BE spec (required fields, format constraints, range limits), verify it's enforced in the implementation. Flag any unimplemented validation.
3. **Error code coverage**: For every error code specified, verify the implementation can produce it and the test suite asserts it.
4. **Edge case coverage**: For every `// IA-EDGE:` test, verify the implementation handles it (not just that the test passes — the handling must be correct per the spec).
5. **Access control coverage**: For every role mentioned in the spec's access control, verify the implementation enforces it.

For any gap found: fix the implementation (not the spec). If the gap suggests the spec is wrong, flag it: "Spec may need update: [what was found]. Fix implementation to match spec, or update spec via `/propagate-decision`?"

Run the Test Cmd to verify tests still pass.

### 5.5. Query optimization check

For each database query introduced or modified in this slice:

1. **N+1 detection**: Review all data-fetching code for loop-based queries. If a query inside a loop fetches related data that could be eagerly loaded or batched, flag as an N+1 pattern and fix using the installed ORM/DB skill's recommended approach (e.g., `include` for Prisma, `with` for Drizzle, JOIN for raw SQL, graph traversal for SurrealDB)
2. **Index coverage**: For each new WHERE clause, ORDER BY, or JOIN condition, verify a supporting index exists in the migration/schema. If no index exists and the table is expected to exceed 10,000 rows, add one
3. **Query plan verification** (if test DB is available): Run EXPLAIN ANALYZE (or equivalent) on queries targeting tables with >1,000 rows in seed data. Flag any sequential scan on a table expected to grow beyond 10,000 rows

If `.memory/wiki/specs/ENGINEERING-STANDARDS.md` defines `### DB Query Time` budgets, annotate each new query with its expected tier in a code comment: `// DB-TIER-2: uncached read, p95 target < 50ms`

### 5.6. Resource cleanup verification

Review all new code in this slice for resource acquisition patterns. For each resource acquired, verify matching cleanup exists:

| Resource Type | Required Cleanup | Example |
|--------------|-----------------|---------|
| DB connection/client | `disconnect()`/`close()` in `finally` | Prisma `$disconnect()`, pg `pool.end()` |
| Event listener | `removeEventListener()` or equivalent on unmount/destroy | React `useEffect` cleanup return |
| Subscription | `unsubscribe()`/`kill()` on unmount/destroy | RxJS, SurrealDB live queries, WebSocket |
| Timer (interval/timeout) | `clearInterval()`/`clearTimeout()` | Polling loops, debounce timers |
| File handle/stream | `close()`/`destroy()` | fs reads, HTTP response streams |
| Worker thread | `terminate()` | Web Workers, Node Worker Threads |

If any cleanup is missing, add it before proceeding. Run the Test Cmd after adding cleanup to verify tests still pass.

## 6. Validate

Read `.agents/skills/verification-before-completion/SKILL.md` and apply its evidence-before-claims discipline.

Run the Validation Cmd from this slice's surface row. At least one integration test per BE endpoint must hit a real test server + real test database and assert the full response body.

All must pass before the slice is complete.

## 6.5. Synthesis (parallel mode only)

**Skip if not in parallel mode.**

Read `.agents/skills/session-continuity/protocols/11-parallel-synthesis.md` and follow its full procedure.

## 7. Update progress (Mandatory)

**CRITICAL**: You MUST NOT skip progress updates. Read `.agents/skills/session-continuity/protocols/03-progress-update.md` and follow **every step** — including the new step 8 (read-back verification), step 9 (cross-file consistency check), and step 10 (Completion Signature stamp). Physically edit all four file targets (slice, phase, index, memory) and run `node scripts/check-progress-consistency.mjs` before exiting this step.

## 8. Completion Gate

Read `.agents/skills/verification-before-completion/SKILL.md` and apply its discipline.

Read `.agents/skills/prd-templates/references/slice-completion-gates.md` and verify every applicable checklist passes:
- **UI Completeness Check** — FE slices only
- **Spec Traceability Gate** — all slices
- **Spec Depth Floor Gate** — all slices

Read `.agents/skills/prd-templates/references/tdd-testing-policy.md` and run the **QA Anti-Cheat Audit** checklist.

**Cross-runtime progress gate (HARD STOP)**: Run `node scripts/check-progress-consistency.mjs`. If exit code is non-zero, you MAY NOT call `notify_user`. Fix every drift item the script reports, then re-run until exit 0. This gate exists because different agent runtimes (Claude, Antigravity, Codex, Factory) share the same `.memory/pipeline/progress/` tree — a silent partial update here means the next session in any runtime resumes from stale state and may redo or skip work.

You may not call `notify_user` until:
1. All four progress file targets have been edited (Protocol 3 steps 1–7).
2. Read-back verification passed for each (Protocol 3 step 8).
3. `node scripts/check-progress-consistency.mjs` returned exit 0 (Protocol 3 step 9).
4. Slice file has a `## Completion Signature` block stamped with date, runtime, verifier exit, and depth ratio (Protocol 3 step 10).

Verify your edits by reading:
- `.memory/pipeline/progress/slices/phase-NN-slice-NN.md` — Status: complete, [x] criteria, Depth Ratio >= 1.0, Completion Signature present
- `.memory/pipeline/progress/phases/phase-NN.md` — incremented progress fraction
- `.memory/pipeline/progress/index.md` — updated overall percentage

Your `notify_user` payload **MUST** include:
1. Raw output from the three reads above
2. Verifier exit code (must be `0`)
3. Updated overall progress (e.g., "Overall progress is now 75% (24/32 slices)")
4. Explicit next command: Run `/implement-slice` for [next slice name]

**Infrastructure/Auth slice gate**: If this was the `00-infrastructure` or auth slice, the next command is `/verify-infrastructure`, not `/implement-slice`.
