---
description: TDD vertical slice — Red→Green→Refactor across all four surfaces
pipeline:
  position: 7
  stage: implementation
  predecessors: [plan-phase]
  successors: [validate-phase]
  loop: true # repeats per slice within a phase
  skills: [tdd-workflow, error-handling-patterns, git-workflow, code-review-pro, testing-strategist, clean-code, logging-best-practices, minimalist-surgical-development, systematic-debugging]
  calls-bootstrap: true # may discover new dependencies during implementation
---

# Implement Slice

Implement a single vertical slice using strict TDD: Red → Green → Refactor.

**Input**: A slice from the phase plan with acceptance criteria
**Output**: Working code across all surfaces with passing tests

---

## 0. Check progress state

Read `.agent/skills/session-continuity/protocols/01-session-resumption.md` and follow the **Session Resumption Protocol** to confirm this slice is next and load context from previous sessions.

Also read `.agent/skills/session-continuity/SKILL.md` for cross-session tracking patterns — if this slice spans multiple sessions, the skill ensures no context is lost between sessions.

**Precondition Check**: Look at `.agent/progress/index.md` and the relevant phase file. Verify that the *previous* slice was fully marked as complete before starting this one. If the previous slice's code is done but its progress tracking wasn't updated, **you must update the previous slice's tracking files first**.

## 0.5. Load bundled skills

Read these skill files for the TDD implementation methodology:
1. `.agent/skills/tdd-workflow/SKILL.md` — Red→Green→Refactor methodology
2. `.agent/skills/error-handling-patterns/SKILL.md` — Error handling conventions
3. `.agent/skills/git-workflow/SKILL.md` — Branch, commit, and PR conventions
4. `.agent/skills/code-review-pro/SKILL.md` — Self-review before presenting
5. `.agent/skills/testing-strategist/SKILL.md` — Test strategy and coverage decisions
6. `.agent/skills/clean-code/SKILL.md` — Architecture and code quality principles
7. `.agent/skills/logging-best-practices/SKILL.md` — Structured logging patterns
8. `.agent/skills/minimalist-surgical-development/SKILL.md` — Precision edits, avoiding massive rewrites
9. `.agent/skills/systematic-debugging/SKILL.md` — Evidence-based root cause analysis

Use **find-skills** to discover a test framework skill if needed. Read `.agent/skills/find-skills/SKILL.md` and search for your project's test framework (e.g., "vitest", "jest", "pytest").

If this slice introduces a significant new dependency not already in the project's tech stack:

1. Identify the new dependency and its stack category
2. Read `.agent/workflows/bootstrap-agents.md` and execute its utility instructions immediately with the new value
3. Bootstrap will install any matching skills from the library

---

## 1. Read the slice

Read the slice's acceptance criteria from the phase plan.

## 1.5. Check for parallel mode

Scan the slice's tasks for surface tags (`BE`, `FE`, `QA`):

- **No tags found** → proceed sequentially (steps 2–7 as normal)
- **Tags found** → enter parallel mode:

### Parallel mode dispatch (TDD order)

| Phase | Agent | Responsibility | Depends On |
|-------|-------|---------------|------------|
| 0 | Orchestrator | Contracts/schemas (untagged tasks) | — |
| 1 | QA (RED) | Write comprehensive failing tests | Phase 0 |
| 2 | BE + FE (parallel) | Write code to make tests pass | Phase 1 |
| 3 | QA (GREEN) | Verify all tests pass, anti-cheat audit | Phase 2 |
| 4 | Orchestrator | Iterative correction loop if needed | Phase 3 |

> **Tests are the rock. Code is malleable.** Comprehensive tests encode the
> acceptance criteria. If tests fail, the code changes — never the tests.

1. **Handle untagged tasks first** — Contract/schema work runs sequentially by the orchestrator (step 2)
2. **Dispatch `QA` agent (QA-RED)** — Write comprehensive failing tests for ALL acceptance criteria:
   - Read `.agent/skills/session-continuity/protocols/09-parallel-claim.md` — Parallel Claim Protocol
   - QA agent claims its tasks, writes test files covering every criterion
   - Tests MUST fail (Red phase) — verify with `{{TEST_COMMAND}}`
   - **Depth matters**: unit tests, integration tests, edge cases, error paths, boundary conditions
   - No shallow test suites — every acceptance criterion gets thorough coverage
   - **Contract cross-reference**: QA agent verifies every field, error type, and permission boundary in the Zod contract has at least one test — not just what the phase plan acceptance criteria mention
3. **Dispatch `BE` + `FE` agents in parallel (GREEN)** — Write code to make QA's tests pass:
   - Read `parallel-agents/SKILL.md` for dispatch protocol
   - Read `parallel-feature-development/SKILL.md` for file ownership
   - Each agent claims tasks via Protocol 9, works through subtasks
   - Agents code against the **tests and contracts**, not assumptions
   - **Spec traceability**: any implementation decision not explicitly in the spec or contract (enum values, defaults, timeouts, error messages, spacing, retry logic) MUST be annotated with `// DECISION: [what was decided and why]`
4. **Dispatch `QA` agent again (QA-GREEN)** — Second pass validation:
   - Run full test suite — all tests must pass
   - **Anti-cheating check**: verify tests haven't been weakened, removed, or simplified
   - **Decision audit**: scan for `// DECISION:` comments — flag any that indicate a spec gap that should be resolved upstream rather than decided by the implementer
   - Add integration/E2E tests that exercise BE+FE together
   - Report any failures to orchestrator
5. **Iterative correction loop** — If QA-GREEN reports failures:
   - Re-dispatch `BE` and/or `FE` agents to fix failing code
   - Re-dispatch `QA` agent (QA-GREEN) to re-verify
   - Repeat until all tests pass — **only the orchestrator may end the loop**
6. **After all tests pass** → proceed to step 6.5 (Synthesis)

---

## 2. Write the contract (Zod schema)

Define the request/response shapes as Zod schemas in the project's contracts directory (see `.agent/instructions/structure.md` for the exact path — typically `src/contracts/`). This is the source of truth.

## 3. Write failing tests (RED)

Cross-reference **both** sources — acceptance criteria from the phase plan AND the Zod contract from step 2:
1. Write a test for each acceptance criterion
2. Write a test for each contract field, error type, and validation rule not already covered by criteria
3. Run all tests — they MUST fail
4. Commit the failing tests

**Test order**: Unit → Integration → E2E (if applicable)

> **In parallel mode**, this step is handled by the `QA` agent dispatch in step 1.5.
> In sequential mode, the orchestrator handles it directly.

Run `{{TEST_COMMAND}}` to verify tests fail.

## 4. Implement (GREEN)

Write the minimum code to make all tests pass:
1. Database schema/migration
2. API endpoint handler
3. Business logic
4. UI component

**If in parallel mode**: Each agent claims its task via the **Parallel Claim Protocol** (`.agent/skills/session-continuity/protocols/09-parallel-claim.md`) — marking `[!]`, writing `files:` list, and working through subtasks. Agents release claims on completion.

**Before using any stub or placeholder**, apply the three-part test from the
`boundary-not-placeholder` rule:
- Does the spec exist? → Implement it. No stub.
- Could you write the spec now? → Write the spec first, then implement.
- Information genuinely doesn't exist? → `BOUNDARY:` stub with typed interface, tracking issue, and sentinel test.

> **"This is a lot of work" is not a valid boundary.** Amount of work, task
> scope, and complexity are never reasons to stub. Only missing information is.

**Spec traceability**: if you make any implementation decision not explicitly covered by the spec or contract (e.g., choosing enum values, default behaviors, retry counts, timeout durations, error messages), annotate it with `// DECISION: [what was decided and why]`. QA will audit these.

Run `{{TEST_COMMAND}}` to verify tests pass.

## 5. Refactor

With tests green, improve code quality:
- Extract shared logic
- Improve naming
- Remove duplication
- Add documentation

Run `{{TEST_COMMAND}}` to verify tests still pass after refactor.

## 6. Validate

Run the full validation suite: `{{VALIDATION_COMMAND}}`.

All must pass before the slice is complete.

## 6.5. Synthesis (parallel mode only)

**Skip this step if not in parallel mode.**

After all parallel agents have completed and QA-GREEN has passed:

1. **Verify no file conflicts** — confirm no file was modified by multiple agents
2. **Resolve `// BOUNDARY:` stubs** — agents may have created boundary stubs for frozen files (contracts, config). Resolve these now:
   - Update shared contracts if needed
   - Install any new dependencies
   - Wire cross-surface integrations
3. **Run full validation** — the validation from step 6 runs again after synthesis
4. **Create synthesis report** per the `parallel-agents` skill (Synthesize step)

Run `{{VALIDATION_COMMAND}}` for post-synthesis validation.

## 7. Update progress (Mandatory)

**CRITICAL ANTI-HALLUCINATION RULE**: You MUST NOT skip the progress update. Agents routinely skip this step after validation passes. You must physically open and edit **each** of the following files using your file editing tools. Protocol reference: `.agent/skills/session-continuity/protocols/03-progress-update.md`.

### 7a. Update the slice file: `.agent/progress/slices/phase-NN-slice-NN.md`

Open the slice file matching the slice you just implemented (e.g., `phase-02-slice-05.md`).

1. Set `**Status**:` to `complete`.
2. Change every `[ ]` in **Acceptance Criteria** to `[x]`.
3. Add an **Implementation Notes** section describing the approach taken.
4. Add a **Files Changed** section listing every file you created or modified.

### 7b. Update the phase file: `.agent/progress/phases/phase-NN.md`

1. Find the slice's entry (e.g., `- [ ] **Slice 05**: ...`) and change it to `- [x] **Slice 05**: ... ✅ YYYY-MM-DD`.
2. Mark each sub-task under it `[x]`.
3. Update the `**Progress**:` header fraction (e.g., `4/13 slices` → `5/13 slices`).
4. Release any `[!]` claim flags and remove `files:` lock blocks.

### 7c. Update the index: `.agent/progress/index.md`

1. Recalculate the **Overall** line: increment the slice count and recompute the percentage (e.g., `23/32 slices (71%)` → `24/32 slices (75%)`).
2. Update the phase row in the table: increment its progress count.
3. If the phase is now complete, change its status to `complete` and add ✅.

### 7d. Log to memory

1. Record any learned patterns to `.agent/progress/memory/patterns.md`.
2. Record any blockers encountered to `.agent/progress/memory/blockers.md`.

## 8. Completion Gate

You may not call `notify_user` until you have physically edited **all four** file targets above (7a–7d).

Verify your edits by reading each of the following files:
- Read `.agent/progress/slices/phase-NN-slice-NN.md` — must show Status: complete and [x] criteria
- Read `.agent/progress/phases/phase-NN.md` — search for "Progress" and verify it shows the incremented fraction
- Read `.agent/progress/index.md` — search for "Overall" and verify it shows the new overall percentage

Replace `NN` with the actual phase and slice numbers you just completed.

Your `notify_user` payload **MUST** include:
1. The raw output from the three commands above.
2. The updated overall progress (e.g., "Overall progress is now 75% (24/32 slices)").
3. The name of the next slice to be implemented.

If any command output shows unchecked criteria, a stale fraction, or a missing file, you have failed the workflow.
