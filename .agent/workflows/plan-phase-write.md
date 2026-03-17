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

**L-slice enforcement**: Any slice marked **L** MUST be reviewed for splitting before Step 3. Present L slices to user: "These slices are estimated Large. Split each into 2-3 smaller slices, or confirm L is acceptable?" Wait for confirmation. Do not proceed to ordering with unreviewed L slices.

**Slice count sanity check**: After splitting, count total slices.
- **1-15 slices** → normal.
- **16-25 slices** → warn: "Phase has [N] slices. Consider splitting into two phases if unrelated domains are grouped together."
- **>25 slices** → **STOP**: "Phase has [N] slices — this is too many for one phase. Split into Phase N and Phase N+1, keeping dependency order intact."

**Good slice**: "User can submit an entity claim form" (one named user flow from the FE interaction spec)
**Bad slice**: "Implement entity management" (domain name, not a spec-derived user flow)

## 2.5. Spec coverage verification

After all slices are identified, verify that the slices collectively cover ALL spec content for this phase:

1. **BE endpoint coverage**: List every endpoint in every BE spec included in this phase's scope. For each endpoint, identify which slice covers it. Build a table:

| BE Endpoint | Slice | Status |
|---|---|---|
| `POST /api/entities` | Slice 3: Create entity | ✅ Covered |
| `GET /api/entities/:id` | — | ❌ Uncovered |

2. **FE component coverage**: List every named component in every FE spec included in this phase's scope. For each, identify which slice covers it.

3. **Resolution**: For each uncovered item:
   - Add it to an existing slice (if it's a natural fit)
   - Create a new slice for it
   - Document it as explicitly deferred to Phase N+1 with reason

**BLOCKING GATE**: Do NOT proceed to Step 3 until every BE endpoint and FE component is either assigned to a slice or explicitly deferred.

## 3. Order by dependency

Read .agent/skills/concise-planning/SKILL.md and follow its methodology.

Sort slices so each builds on the last:
- Infrastructure slices first (DB schema, auth middleware)

**Phase 1 special rule**: Before applying this rule, read the surface stack map from `.agent/instructions/tech-stack.md` and verify that the **CI/CD** and **Hosting** cross-cutting categories have filled values. If empty, emit a **HARD STOP**: these are filled by `/create-prd-stack` — run it first.

The `00-infrastructure` shard is always the first slice. Verify it covers: (1) CI/CD pipeline setup — read the CI/CD skill(s) from the cross-cutting section of the surface stack map, (2) environment configuration (`.env.example`), (3) deployment pipeline — read the Hosting skill(s) from the cross-cutting section of the surface stack map, (4) project scaffolding from `.agent/instructions/structure.md` (directories, `README.md` files, base configs), (5) database initialization. Add missing items before proceeding.

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

**Spec citation requirement**: Every acceptance criterion MUST include a spec source citation. Format: `[BE §section.subsection]`, `[FE §ComponentName]`, or `[IA §NN.EdgeCase.N]`. This ensures no criterion is invented without a traceable spec source. If a criterion cannot be traced to a spec → either the spec is incomplete (fix the spec first) or the criterion is speculative (remove it).

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

> **Note**: As of v3, these files no longer contain literal `{{` placeholders — they reference the surface stack map. This gate now verifies that the surface stack map itself is fully populated for all surfaces involved in this phase.

Read the surface stack map from `.agent/instructions/tech-stack.md`. Verify all per-surface and cross-cutting cells are filled. Verify `.agent/instructions/commands.md` has non-template values.

> ❌ STOP — Only proceed to Step 7 when the map is fully populated. If any cells are empty after bootstrap, tell the user which cells could not be provisioned.

## 7. Request review and next steps

Use `notify_user` to request review of the phase plan and generated progress files.

**STOP** — do NOT proceed until the user explicitly approves the phase plan. The only valid next step after approval is `/implement-slice` for the first slice. Read `.agent/progress/` to identify which slice to start with.
