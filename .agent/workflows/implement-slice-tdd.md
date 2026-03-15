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

Read .agent/skills/tdd-workflow/SKILL.md and follow its methodology.
Read .agent/skills/clean-code/SKILL.md and follow its methodology.
Read .agent/skills/systematic-debugging/SKILL.md and follow its methodology.
Determine which surface this slice belongs to from the phase plan or slice path. Read the surface stack map from `.agent/instructions/tech-stack.md`.

Load the Languages, Unit Tests, and E2E Tests skill(s) from this slice's surface row per the skill loading protocol (`.agent/skills/prd-templates/references/skill-loading-protocol.md`).

Cross-reference **all three** sources — acceptance criteria from the phase plan, the {{CONTRACT_LIBRARY}} contract from step 2, AND IA edge cases traced through the BE Source Map:
1. Write a test for each acceptance criterion
2. Write a test for each contract field, error type, and validation rule not already covered by criteria
3. For each endpoint, read the IA shard section(s) cited in the BE spec `## Source Map`. Extract every relevant `## Edge Cases` item. Write a failing test for each, tagged `// IA-EDGE: [IA §X.Y — description]`
4. Run all tests — they MUST fail
5. Commit the failing tests

Read `.agent/skills/prd-templates/references/tdd-testing-policy.md` and apply its **Assertion Depth Rule** and **Anti-Mock-Abuse Rules** to all tests written above.

> **In parallel mode**, this step is handled by the `QA` agent dispatch in step 1.5.

Run the Test Cmd from this slice's surface row in the surface stack map to verify tests fail.

## 4. Implement (GREEN)

Load the Languages skill(s) from this slice's surface row per the skill loading protocol.

Write the simplest *correct* implementation to make all tests pass. "Minimal" means no unnecessary abstractions — it does **NOT** mean skipping error handling, input validation, logging, or edge cases that the spec defines:
1. Database schema/migration
2. API endpoint handler
3. Business logic
4. UI component

**If in parallel mode**: Each agent claims its task via the **Parallel Claim Protocol** (`.agent/skills/session-continuity/protocols/09-parallel-claim.md`).

**Before using any stub or placeholder**, apply the three-part test from the `boundary-not-placeholder` rule. Only missing information is a valid boundary — amount of work, scope, and complexity are never reasons to stub.

**Spec traceability**: Annotate any implementation decision not covered by the spec with `// DECISION: [what was decided and why]`. QA will audit these.

> **Decision recording**: For decisions with ripple effects (touching other components, changing contracts, setting precedent), read `.agent/skills/session-continuity/protocols/06-decision-analysis.md` and follow the **Decision Effect Analysis Protocol**. Isolated decisions don't need this — only decisions where changing it later requires editing more than the current file.

Run the Test Cmd to verify tests pass.

## 4.1. Debug cycle (if tests fail)

Read `.agent/skills/systematic-debugging/SKILL.md` and follow its ACH methodology. Read `.agent/skills/parallel-debugging/SKILL.md` if failures span multiple subsystems.

1. Classify: contract mismatch vs logic error vs integration issue
2. Contract mismatch → re-read BE spec — contract wrong or implementation?
3. Logic error → ACH per debugging skill
4. Integration issue → check cross-surface wiring, env vars, service connectivity
5. Maximum 3 iterations before escalating to user

Run the Test Cmd after each iteration.

## 4.5. New dependency check

After GREEN, scan new imports. If any package lacks a corresponding skill directory in `.agent/skills/`:
1. Identify the stack category (e.g., `QUEUE`, `CACHE`, `SEARCH`)
2. Read `.agent/workflows/bootstrap-agents.md` and fire bootstrap with `PIPELINE_STAGE=implement-slice` + the key-value pair
3. Confirm skill installed before proceeding to REFACTOR

No new unregistered dependencies → skip to Step 5.

## 5. Refactor

With tests green, improve code quality: extract shared logic, improve naming, remove duplication, add documentation.

Read `.agent/skills/code-review-pro/SKILL.md` and apply its adversarial review: "How would a senior engineer reject this in a PR review?"

**Spec traceability check**: Re-read the BE spec and IA shard for this slice. Verify every contract field maps to a BE spec field and every `// IA-EDGE:` test's edge case is covered by the implementation. Fix spec drift before proceeding.

Run the Test Cmd to verify tests still pass.

## 6. Validate

Read `.agent/skills/verification-before-completion/SKILL.md` and apply its evidence-before-claims discipline.

Run the Validation Cmd from this slice's surface row. At least one integration test per BE endpoint must hit a real test server + real test database and assert the full response body.

All must pass before the slice is complete.

## 6.5. Synthesis (parallel mode only)

**Skip if not in parallel mode.**

Read `.agent/skills/session-continuity/protocols/11-parallel-synthesis.md` and follow its full procedure.

## 7. Update progress (Mandatory)

**CRITICAL**: You MUST NOT skip progress updates. Read `.agent/skills/session-continuity/protocols/03-progress-update.md` and follow **every step** — physically edit all four file targets (slice, phase, index, memory).

## 8. Completion Gate

Read `.agent/skills/verification-before-completion/SKILL.md` and apply its discipline.

Read `.agent/skills/prd-templates/references/slice-completion-gates.md` and verify every applicable checklist passes:
- **UI Completeness Check** — FE slices only
- **Spec Traceability Gate** — all slices

Read `.agent/skills/prd-templates/references/tdd-testing-policy.md` and run the **QA Anti-Cheat Audit** checklist.

You may not call `notify_user` until you have edited all four progress file targets (7a–7d).

Verify your edits by reading:
- `.agent/progress/slices/phase-NN-slice-NN.md` — Status: complete, [x] criteria
- `.agent/progress/phases/phase-NN.md` — incremented progress fraction
- `.agent/progress/index.md` — updated overall percentage

Your `notify_user` payload **MUST** include:
1. Raw output from the three reads above
2. Updated overall progress (e.g., "Overall progress is now 75% (24/32 slices)")
3. Explicit next command: Run `/implement-slice` for [next slice name]

**Infrastructure/Auth slice gate**: If this was the `00-infrastructure` or auth slice, the next command is `/verify-infrastructure`, not `/implement-slice`.
