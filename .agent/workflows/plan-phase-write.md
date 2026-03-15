---
description: Slice identification, ordering, acceptance criteria, progress generation, and bootstrap gate for the plan-phase workflow
parent: plan-phase
shard: write
standalone: true
position: 2
pipeline:
  position: 6.2
  stage: planning
  predecessors: [plan-phase-preflight]
  successors: [implement-slice]
  skills: [concise-planning, parallel-agents, prd-templates, session-continuity]
  calls-bootstrap: true
requires_placeholders: [CI_CD_SKILL, HOSTING_SKILL]
---

// turbo-all

# Plan Phase — Write

Identify slices from specs, order by dependency, write acceptance criteria, generate progress files, and verify bootstrap completeness.

**Prerequisite**: Pre-flight checks must pass (from `/plan-phase-preflight` or equivalent).

---

## 1. Read phase scope

Read the file at `docs/plans/*-architecture-design.md` (phasing section) and the file at `docs/plans/be/index.md` (which specs to include).

## 2. Identify slices (spec-anchored derivation)

For each FE spec in the phase scope:
1. Open the FE spec's `## Interaction Specification` section
2. Enumerate every distinct named user flow (e.g., "Submit entity claim form", "Search directory with filters", "View entity detail page")
3. For each user flow, identify its primary BE endpoint from the FE spec's `## Source Map`
4. Group flows into one slice only when:
   a. They share the exact same DB write (true dependency, not just same domain), OR
   b. They are a required sequence (flow B cannot be tested without flow A existing)
5. Flows that do not meet criteria (a) or (b) become individual slices

The resulting list of slices is derived from the spec, not estimated from feature names. Do not aggregate slices by domain name or by "it feels like one feature."

Estimate complexity (S/M/L) per derived slice. Flag any slice estimated L — these are candidates for further splitting before ordering begins.

**Good slice**: "User can submit an entity claim form" (one named user flow from the FE interaction spec)
**Bad slice**: "Implement entity management" (domain name, not a spec-derived user flow)

## 3. Order by dependency

Read .agent/skills/concise-planning/SKILL.md and follow its methodology.

Sort slices so each builds on the last:
- Infrastructure slices first (DB schema, auth middleware)

**Phase 1 special rule**: Before applying this rule, verify that `{{CI_CD_SKILL}}` and `{{HOSTING_SKILL}}` contain filled values (no literal `{{` characters). If unfilled, emit a **HARD STOP**: these placeholders are filled by `/create-prd-stack` — run it first.

The `00-infrastructure` shard is always the first slice. Verify it covers: (1) CI/CD pipeline setup — read `.agent/skills/{{CI_CD_SKILL}}/SKILL.md`, (2) environment configuration (`.env.example`), (3) deployment pipeline — read `.agent/skills/{{HOSTING_SKILL}}/SKILL.md`, (4) project scaffolding from `.agent/instructions/structure.md` (directories, `README.md` files, base configs), (5) database initialization. Add missing items before proceeding.

**Verification gates** (hard gates — add explicitly to the phase plan):
- `/verify-infrastructure` MUST pass after the infrastructure slice, before any feature slice.
- `/verify-infrastructure` MUST pass again after the auth slice (with auth smoke test), before any auth-dependent feature slice.

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

Read `.agent/skills/parallel-agents/SKILL.md` and follow its TDD-Order Dispatch methodology for parallel groups and execution order. Flag any tasks that can't be parallelized (shared file dependencies) in the plan.

## 5. Finalize phase plan

Read `docs/plans/phases/phase-N-draft.md` (which was built progressively in Step 4) and write the final formatted phase plan to `docs/plans/phases/phase-N.md`. The draft is the authoritative source — do not add or drop slices during finalization.

## 6. Generate progress files

Read `.agent/skills/session-continuity/protocols/02-progress-generation.md` and follow the **Progress Generation Protocol** to create tracking files for this phase in `.agent/progress/`.

## 6.5. Bootstrap Completeness Gate

Scan these four files for literal `{{` occurrences of `LANGUAGE_SKILL`, `HOSTING_SKILL`, `CI_CD_SKILL`, `ORM_SKILL`, `UNIT_TESTING_SKILL`, `E2E_TESTING_SKILL`:
- `.agent/workflows/implement-slice-setup.md`
- `.agent/workflows/implement-slice-tdd.md`
- `.agent/workflows/verify-infrastructure.md`
- `.agent/workflows/validate-phase.md`

For each unfilled placeholder, read `docs/plans/*-architecture-design.md` to extract the confirmed value, then run `/bootstrap-agents` (see `.agent/workflows/bootstrap-agents.md`) with the corresponding key.

> ❌ STOP — Re-scan the four files. Only proceed to Step 7 when zero `{{` patterns remain. If any remain unfilled after bootstrap, tell the user which placeholders could not be provisioned.

## 7. Request review and next steps

Use `notify_user` to request review of the phase plan and generated progress files.

**Proposed next step**: Once approved, run `/implement-slice` for the first slice in the phase plan. Read `.agent/progress/` to identify which slice to start with.
