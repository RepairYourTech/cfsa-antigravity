---
description: Create TDD vertical slices for one phase, with acceptance criteria per item
pipeline:
  position: 6
  stage: planning
  predecessors: [write-be-spec, write-fe-spec] # join point — waits for both
  successors: [implement-slice]
  skills: [resolve-ambiguity, testing-strategist, technical-writer]
  calls-bootstrap: true
---

// turbo-all

# Plan Phase

Break a phase into TDD vertical slices, each spanning all four surfaces (contract, test, implementation, UI).

> **Every slice ships production-grade code.** Slices are ordered by dependency,
> not by quality tier. The first slice and the last slice meet the same bar.

**Input**: Approved specs (IA + BE + FE) and the phasing section from architecture design
**Output**: Phase plan with ordered slices and acceptance criteria

---

## 0. Phase sequencing gate

Read `.agent/progress/index.md` to identify the current phase number N.

- **If N = 1** → this is the first phase. Skip this gate.
- **If N > 1** → read `.agent/progress/phases/phase-[N-1].md` and verify its status is `complete` with a passing `/validate-phase`. **Hard stop** if the previous phase is not complete: "Phase [N-1] must be complete with a passing `/validate-phase` before planning Phase [N]. Run `/validate-phase` for Phase [N-1] first."

---

## 0.1. Load planning skills

Read these skills for slice planning guidance:
1. `.agent/skills/testing-strategist/SKILL.md` — Test strategy per slice
2. `.agent/skills/technical-writer/SKILL.md` — Acceptance criteria clarity

---

## 0.5. Application Completeness Audit

Read all FE specs in `docs/plans/fe/` and check the following table. **If ANY check fails → stop and tell the user exactly which FE specs need to be updated. Do NOT proceed to create a phase plan.**

| Check | What It Verifies |
|---|---|
| **Route coverage** | Every route in the app is specced in at least one FE spec |
| **Navigation coverage** | Every route is reachable from at least one navigation element |
| **Auth state coverage** | Every auth state (logged out, logged in, insufficient permissions) has a UI |
| **Empty state coverage** | Every data-fetching view has an empty state spec |
| **Error state coverage** | Every data-fetching view has an error state spec |
| **Onboarding coverage** | If the app has accounts, an onboarding/first-run flow is specced |
| **404/error pages** | Global error pages (404, 500, offline) are specced |

Only when all checks pass does the workflow continue to the next step.

---

## 0.8. Draft continuity check

Check whether `docs/plans/phases/phase-N-draft.md` already exists (where N is the current phase number).

- **If it exists**: Read it and identify which slices are already drafted (have acceptance criteria written) vs which are missing. Present the current state: "A draft exists for Phase N with [X] slices already written. Do you want to **continue from where you left off** (add missing slices only), or **start fresh** (overwrite the draft)?" Wait for the user's answer.
- **If it does not exist**: Proceed normally.

## 1. Read phase scope

Read the file at `docs/plans/*-architecture-design.md` (phasing section) and the file at `docs/plans/be/index.md` (which specs to include).

## 2. Identify slices

For each feature in the phase:
1. Find the thinnest possible vertical slice (one user-visible behavior)
2. Define what surfaces it touches (contract, API, DB, UI)
3. Estimate complexity (S/M/L)

**Good slice**: "User can create an account with email/password"
**Bad slice**: "Implement auth" (too broad)

## 3. Order by dependency

Sort slices so each builds on the last:
- Infrastructure slices first (DB schema, auth middleware)

**Phase 1 special rule**: The `00-infrastructure` shard is always the first slice in Phase 1. Before any feature slices, verify that the infrastructure slice covers all five items:
1. CI/CD pipeline setup (using the confirmed CI/CD skill)
2. Environment configuration (`.env.example` with all required variables documented)
3. Deployment pipeline (using the confirmed hosting skill)
4. Project scaffolding (scaffold the approved directory structure from `.agent/instructions/structure.md` — the structure is already locked by `/create-prd-compile` Step 9.5; this slice creates the directories, `README.md` files per the extensibility rule, and base configuration files)
5. Database initialization (schema creation, migration tooling setup)

If any of these five items are missing from the infrastructure slice, add them before proceeding to feature slices.

**Infrastructure verification gate**: `/verify-infrastructure` MUST pass after the infrastructure slice completes, before any feature slice begins. This is a hard gate — not a recommendation. Add `/verify-infrastructure` explicitly to the phase plan as a gate between the infrastructure slice and the first feature slice.

**Auth verification gate**: `/verify-infrastructure` MUST pass again after the auth slice completes (with the auth smoke test enabled), before any auth-dependent feature slice begins. Add `/verify-infrastructure` explicitly to the phase plan as a gate between the auth slice and the first auth-dependent feature slice.

- Core entity CRUD second
- Dependent features next
- Cross-cutting concerns (logging, monitoring, error handling) woven throughout

**Note:** This ordering is about dependencies, not about deferring quality.
Every slice — including the first infrastructure slice — is fully tested,
fully specified, and production-ready.

## 4. Write acceptance criteria

Read `.agent/skills/prd-templates/references/operational-templates.md` for the **Slice Acceptance Criteria** template. For each slice, use the template to define testable acceptance criteria with surface tags:

> **Write as you go**: After completing acceptance criteria for each slice, immediately append that slice's entry to `docs/plans/phases/phase-N-draft.md` (create the file if it doesn't exist). Do not accumulate all slices in context and write them all at once in Step 5.

**Surface tag rules:**
- `BE`: API routes, DB queries, middleware, business logic, server-side validation
- `FE`: Pages, components, styling, interactions, client-side logic
- `QA`: Test writing (RED phase — runs FIRST), test verification (GREEN phase — runs LAST)
- No tag: Contract/schema work, shared infra — handled sequentially by orchestrator

## 4.5. Identify parallel groups (TDD order)

For each slice, determine the execution order following TDD:

> **Tests are the rock. Code is malleable.** Tests encode the acceptance criteria
> and must be comprehensive. Code adapts to pass tests, never the reverse.

1. **Contract first**: Untagged tasks (contract, infra) must complete before any tagged dispatch
2. **QA-RED second**: `QA` agent writes comprehensive failing tests from acceptance criteria
3. **BE + FE parallel third**: Both implement simultaneously to make tests pass
4. **QA-GREEN fourth**: `QA` agent re-verifies all tests pass, checks for cheating, adds integration tests
5. **Iterative loop**: If QA-GREEN fails → re-dispatch BE/FE → QA-GREEN again → repeat until pass
6. **File independence**: Verify no two tagged tasks touch the same files

Flag any tasks that can't be parallelized (shared file dependencies) in the plan.

## 5. Finalize phase plan

Read `docs/plans/phases/phase-N-draft.md` (which was built progressively in Step 4) and write the final formatted phase plan to `docs/plans/phases/phase-N.md`. The draft is the authoritative source — do not add or drop slices during finalization.

## 6. Generate progress files

Read `.agent/skills/session-continuity/protocols/02-progress-generation.md` and follow the **Progress Generation Protocol** to create tracking files for this phase in `.agent/progress/`.

## 6.5. Bootstrap Testing Skills

Read `.agent/workflows/bootstrap-agents.md` and execute its utility instructions immediately to fill placeholders and provision testing framework skills based on the strategies defined for this phase.

## 7. Request review and next steps

Use `notify_user` to request review of the phase plan and generated progress files.

**Proposed next step**: Once approved, run `/implement-slice` for the first slice in the phase plan. Read `.agent/progress/` to identify which slice to start with.
