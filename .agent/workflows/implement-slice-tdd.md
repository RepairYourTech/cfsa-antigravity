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
  skills: [tdd-workflow, systematic-debugging, session-continuity]
  calls-bootstrap: false
---

# Implement Slice — TDD & Progress

Execute the TDD cycle (Red → Green → Refactor), run validation, handle synthesis, and update all progress tracking files.

**Prerequisite**: Contract (Zod schema) must be written (from `/implement-slice-setup` or equivalent). If in parallel mode, QA-RED and BE/FE/QA-GREEN dispatch should be completed during setup.

---

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

### UI Completeness Check (FE slices only)

- [ ] (FE slices only) Every acceptance criterion mentioning "user sees", "user can", "displays", or "shows" has a rendered implementation — not just a passing test
- [ ] (FE slices only) Every new route in this slice is wired into the app's navigation (not just exported as a component)
- [ ] (FE slices only) Loading, error, and empty states are rendered in the UI — not just covered by tests
- [ ] (FE slices only) The feature is reachable from the app's entry point via normal user navigation

These items apply only when the slice is tagged `FE`. Non-FE slices skip this block.

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

**Infrastructure/Auth slice gate**: After completing progress tracking, check the slice name against the phase plan. If this was the `00-infrastructure` slice or the auth slice, the next step is NOT the next feature slice — it is `/verify-infrastructure`. Do not propose the next feature slice until `/verify-infrastructure` passes and produces a green report in `docs/audits/`.
