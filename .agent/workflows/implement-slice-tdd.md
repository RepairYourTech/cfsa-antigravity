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

**Prerequisite**: Contract (Zod schema) must be written (from `/implement-slice-setup` or equivalent). If in parallel mode, QA-RED and BE/FE/QA-GREEN dispatch should be completed during setup.

---

## 3. Write failing tests (RED)

Read .agent/skills/tdd-workflow/SKILL.md and follow its methodology.
Read .agent/skills/clean-code/SKILL.md and follow its methodology.
Read .agent/skills/systematic-debugging/SKILL.md and follow its methodology.
Read .agent/skills/{{LANGUAGE_SKILL}}/SKILL.md and follow its language conventions.
Read .agent/skills/{{UNIT_TESTING_SKILL}}/SKILL.md and follow its test writing conventions.
Read .agent/skills/{{E2E_TESTING_SKILL}}/SKILL.md and follow its E2E test conventions.

Cross-reference **all three** sources — acceptance criteria from the phase plan, the Zod contract from step 2, AND IA edge cases traced through the BE Source Map:
1. Write a test for each acceptance criterion
2. Write a test for each contract field, error type, and validation rule not already covered by criteria
3. For each endpoint in this slice, read the IA shard section(s) cited in that endpoint's BE spec `## Source Map`. Extract every item from the IA shard's `## Edge Cases` section that is relevant to the endpoint(s) under test. Write a failing test for each uncovered edge case. Tag these tests with `// IA-EDGE: [IA §X.Y — description]` so QA-GREEN can audit traceability.
4. Run all tests — they MUST fail
5. Commit the failing tests

**Test order**: Unit → Integration → E2E (if applicable)

> **In parallel mode**, this step is handled by the `QA` agent dispatch in step 1.5.
> In sequential mode, the orchestrator handles it directly.

Run `{{TEST_COMMAND}}` to verify tests fail.

## 4. Implement (GREEN)

Read .agent/skills/{{LANGUAGE_SKILL}}/SKILL.md and follow its language conventions.

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

## 4.1. Debug cycle (if tests fail after initial implementation)

If `{{TEST_COMMAND}}` shows failures after completing Step 4:

Read .agent/skills/systematic-debugging/SKILL.md and follow its ACH methodology.
Read .agent/skills/parallel-debugging/SKILL.md if failures span multiple subsystems.

1. Classify failures: contract mismatch vs logic error vs integration issue
2. For contract mismatches: re-read the BE spec — is the contract wrong or the implementation?
3. For logic errors: apply ACH (Analysis of Competing Hypotheses) per the debugging skill
4. For integration issues: check cross-surface wiring, env vars, service connectivity
5. Maximum 3 debug iterations before escalating to user with findings

Run `{{TEST_COMMAND}}` after each debug iteration to verify progress.

## 4.5. New dependency check

After making all tests pass (GREEN), scan the new imports introduced in the implementation files.

If any package or module was introduced that does **not** have a corresponding skill directory in `.agent/skills/`:
1. Identify the stack category (e.g., `QUEUE`, `CACHE`, `SEARCH`, `STORAGE`, `REALTIME`)
2. Read `.agent/workflows/bootstrap-agents.md` and fire bootstrap with `PIPELINE_STAGE=implement-slice` + the key-value pair (e.g., `NEW_DEPENDENCY=[package-name]`)
3. Confirm the matching skill is installed before proceeding to REFACTOR

If no new unregistered dependencies were introduced, skip and proceed to Step 5.

## 5. Refactor

With tests green, improve code quality:
- Extract shared logic
- Improve naming
- Remove duplication
- Add documentation

Read `.agent/skills/code-review-pro/SKILL.md` and apply its adversarial review: "How would a senior engineer reject this in a PR review?" Fix issues before running tests.

**Spec traceability check**: Re-read the BE spec and IA shard sections for this slice. Verify every Zod contract field maps to a BE spec field. Verify every `// IA-EDGE:` tagged test's edge case is covered by the implementation, not just tested. Fix any spec drift before proceeding.

Run `{{TEST_COMMAND}}` to verify tests still pass after refactor.

## 6. Validate

Read .agent/skills/verification-before-completion/SKILL.md and apply its evidence-before-claims discipline.

Run the full validation suite: `{{VALIDATION_COMMAND}}`.

All must pass before the slice is complete.

## 6.5. Synthesis (parallel mode only)

**Skip this step if not in parallel mode.**

Read `.agent/skills/session-continuity/protocols/11-parallel-synthesis.md` and follow its full procedure — write synthesis plan, resolve stubs, wire integrations, run `{{VALIDATION_COMMAND}}`.

## 7. Update progress (Mandatory)

**CRITICAL ANTI-HALLUCINATION RULE**: You MUST NOT skip the progress update. Agents routinely skip this step after validation passes.

Read `.agent/skills/session-continuity/protocols/03-progress-update.md` and follow **every step** in the protocol. You must physically open and edit each of the four file targets (slice file, phase file, index, memory) using your file editing tools.

The protocol covers:
- **7a**: Slice file — status, criteria, implementation notes, files changed
- **7b**: Phase file — slice entry, sub-tasks, progress fraction, claim releases
- **7c**: Index — overall percentage, phase row
- **7d**: Memory — patterns and blockers

## 8. Completion Gate

Read .agent/skills/verification-before-completion/SKILL.md and apply its evidence-before-claims discipline.

### UI Completeness Check (FE slices only)

- [ ] (FE slices only) Every acceptance criterion mentioning "user sees", "user can", "displays", or "shows" has a rendered implementation — not just a passing test
- [ ] (FE slices only) Every new route in this slice is wired into the app's navigation (not just exported as a component)
- [ ] (FE slices only) Loading, error, and empty states are rendered in the UI — not just covered by tests
- [ ] (FE slices only) The feature is reachable from the app's entry point via normal user navigation

These items apply only when the slice is tagged `FE`. Non-FE slices skip this block.

### Spec Traceability Gate (all slices)

Before calling `notify_user`, verify:

- [ ] Re-read the BE spec section(s) for every endpoint in this slice — every response field, error code, and validation rule has a corresponding test tagged with the spec reference
- [ ] Re-read the IA shard's `## Edge Cases` section for this slice's domain — every edge case relevant to this slice has a `// IA-EDGE:` tagged test
- [ ] No `// DECISION:` annotations exist for behaviors that are actually specified in the BE spec or IA shard (i.e., no spec-defined behavior was treated as an undocumented implementation decision)
- [ ] The Zod contract written in Step 2 matches the delivered implementation field-for-field — no fields added, removed, or renamed during implementation without a corresponding contract update

> ❌ STOP — Do not call `notify_user` if any of the above are unchecked. Fix the gap and re-run `{{TEST_COMMAND}}`.

You may not call `notify_user` until you have edited all four file targets above (7a–7d).

Verify your edits by reading each of the following files:
- Read `.agent/progress/slices/phase-NN-slice-NN.md` — must show Status: complete and [x] criteria
- Read `.agent/progress/phases/phase-NN.md` — search for "Progress" and verify it shows the incremented fraction
- Read `.agent/progress/index.md` — search for "Overall" and verify it shows the new overall percentage

Replace `NN` with the actual phase and slice numbers you just completed.

Your `notify_user` payload **MUST** include:
1. The raw output from the three commands above.
2. The updated overall progress (e.g., "Overall progress is now 75% (24/32 slices)").
3. The explicit next command: Run `/implement-slice` for [next slice name].

If any command output shows unchecked criteria, a stale fraction, or a missing file, you have failed the workflow.

**Infrastructure/Auth slice gate**: After completing progress tracking, check the slice name against the phase plan. If this was the `00-infrastructure` slice or the auth slice, the next command to run is `/verify-infrastructure`, not `/implement-slice`. Do not propose the next feature slice until `/verify-infrastructure` passes and produces a green report in `docs/audits/`.
