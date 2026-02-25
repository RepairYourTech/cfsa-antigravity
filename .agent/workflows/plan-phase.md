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

## 0. Load planning skills

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
4. Project scaffolding (directory structure, base configuration files)
5. Database initialization (schema creation, migration tooling setup)

If any of these five items are missing from the infrastructure slice, add them before proceeding to feature slices.

- Core entity CRUD second
- Dependent features next
- Cross-cutting concerns (logging, monitoring, error handling) woven throughout

**Note:** This ordering is about dependencies, not about deferring quality.
Every slice — including the first infrastructure slice — is fully tested,
fully specified, and production-ready.

## 4. Write acceptance criteria

For each slice, define testable acceptance criteria **and assign surface tags**:

```markdown
### Slice N: [Name]
**Size**: S/M/L
**Surfaces**: Contract, API, DB, UI

#### Tasks
- [ ] Contract: Zod schema for [entity] ← no tag (orchestrator handles sequentially)
- [ ] `BE` API endpoints for [entity] ← backend agent
- [ ] `FE` [entity] page and components ← frontend agent
- [ ] `QA` Integration tests for [entity] ← QA agent (runs FIRST to write failing tests, AND after BE+FE to verify)

#### Acceptance Criteria
- [ ] Given [context], when [action], then [result]
- [ ] Given [context], when [error condition], then [error response]
- [ ] [Performance/security criteria if applicable]

#### Dependencies
- Requires: Slice M
- Enables: Slice P
```

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

## 5. Create phase plan

Write to `docs/plans/phases/phase-N.md`:

```markdown
# Phase N — [Name]

## Slices (in order)
[Ordered list of slices with acceptance criteria]

## Dependencies
[External dependencies, third-party services]

## Definition of Done
- [ ] All slices implemented
- [ ] All acceptance criteria pass
- [ ] /validate-phase passes
```

## 6. Generate progress files

Read `.agent/skills/session-continuity/protocols/02-progress-generation.md` and follow the **Progress Generation Protocol** to create tracking files for this phase in `.agent/progress/`.

## 6.5. Bootstrap Testing Skills

Read `.agent/workflows/bootstrap-agents.md` and execute its utility instructions immediately to fill placeholders and provision testing framework skills based on the strategies defined for this phase.

## 7. Request review and next steps

Use `notify_user` to request review of the phase plan and generated progress files.

**Proposed next step**: Once approved, run `/implement-slice` for the first slice in the phase plan. Read `.agent/progress/` to identify which slice to start with.
