---
description: Phase sequencing gate, planning skills, completeness audit, cross-layer consistency, and draft continuity for the plan-phase workflow
parent: plan-phase
shard: preflight
standalone: true
position: 1
pipeline:
  position: 6.1
  stage: planning
  predecessors: [write-be-spec, write-fe-spec]
  successors: [plan-phase-write]
  skills: [cross-layer-consistency, testing-strategist, technical-writer]
  calls-bootstrap: false
---

// turbo-all

# Plan Phase — Preflight

Pre-flight checks before slice planning: phase sequencing, skill loading, completeness audit, cross-layer consistency, and draft continuity.

**Prerequisite**: Approved specs (IA + BE + FE) must exist.

---

## 0. Phase sequencing gate

Read `.agent/progress/index.md` to identify the current phase number N.

- **If N = 1** → this is the first phase. Skip this gate.
- **If N > 1** → read `.agent/progress/phases/phase-[N-1].md` and verify its status is `complete` with a passing `/validate-phase`. **Hard stop** if the previous phase is not complete: "Phase [N-1] must be complete with a passing `/validate-phase` before planning Phase [N]. Run `/validate-phase` for Phase [N-1] first."

  **Architecture map freshness check (N > 1 only)** — warning, not a hard stop.

  If `docs/ARCHITECTURE.md` exists, compare its "Last updated" date against Phase N-1 completion. If **older**:

  > ⚠️ `docs/ARCHITECTURE.md` may be stale. Run `/update-architecture-map` or reply `"confirmed"`.

  **Wait** for user resolution. If dates are equal/newer, or file doesn't exist, proceed silently.

---

## 0.1. Load planning skills

Read these skills for slice planning guidance:
1. `.agent/skills/testing-strategist/SKILL.md` — Test strategy per slice
2. `.agent/skills/technical-writer/SKILL.md` — Acceptance criteria clarity

---

## 0.5. Application Completeness Audit

Read the **Surfaces** list from the Global Settings section of `.agent/instructions/tech-stack.md`. For each row below, only run the check if "Applies To" matches the project's confirmed surfaces. Skip inapplicable rows.

Read all FE specs in `docs/plans/fe/` and check the following table.

| Check | Applies To | What It Verifies |
|---|---|---|
| **Route coverage** | web, mobile, desktop | Every route in the app is specced in at least one FE spec |
| **Navigation coverage** | web, mobile, desktop | Every route is reachable from at least one navigation element |
| **Auth state coverage** | all surfaces (if auth exists) | Every auth state (logged out, logged in, insufficient permissions) has a defined UI or response |
| **Empty state coverage** | web, mobile, desktop | Every data-fetching view has an empty state spec |
| **Error state coverage** | all surfaces | Every data-fetching operation has an error response or error state spec |
| **Onboarding coverage** | all surfaces (if accounts exist) | First-run or onboarding flow is specced |
| **404/error pages** | web, desktop | Global error pages (404, 500, offline) are specced |
| **Help/usage output** | cli | `--help` flag output is specced and documents all commands |
| **Exit codes** | cli | All error exit codes and their meanings are documented in a spec |
| **Command discovery** | cli | Command listing or autocomplete behavior is specced |

**If ANY applicable check fails → stop and tell the user exactly which FE specs need to be updated. Do NOT proceed to create a phase plan.**

Only when all **applicable** checks pass does the workflow continue to the next step.

---

## 0.6. Cross-Layer Consistency Check

Read `.agent/skills/cross-layer-consistency/SKILL.md` and follow its full cross-layer audit methodology.

Read `docs/plans/be/index.md` and `docs/plans/fe/index.md`.

### 0.6a. BE↔FE Coverage

For every BE spec listed in `docs/plans/be/index.md`, check whether at least one FE spec's `## Source Map` section references it. Apply the following rules:

1. **Covered**: The BE spec appears in at least one FE `## Source Map` → pass.
2. **Internal-only exception**: If the BE spec is annotated `[internal-only — no UI]` in the BE index, it is exempt from FE coverage → pass.
3. **Uncovered**: The BE spec is neither covered by an FE Source Map nor marked `[internal-only — no UI]` → collect it in the uncovered list.

**If the uncovered list is empty** → proceed to 0.6b.

**If any uncovered non-internal BE specs exist** → **hard stop**. Present the uncovered list and ask:

> "The following BE specs have no FE coverage and are not marked `[internal-only — no UI]`:
>
> - `[be-spec-filename-1]`
> - `[be-spec-filename-2]`
>
> For each, either:
> 1. Add FE coverage via `/write-fe-spec`
> 2. Mark the BE spec as `[internal-only — no UI]` in `docs/plans/be/index.md` if it has no user-facing surface
>
> Confirm when resolved."

Do not proceed until the user confirms all uncovered specs are resolved.

### 0.6b. Cross-Layer Field and Contract Consistency

Using the `cross-layer-consistency` skill's methodology as a guide, verify the following **minimum checks** regardless of skill depth:

1. **Field mapping**: For every BE response field consumed by an FE component, verify the field name, type, and nullability match exactly between the BE spec and FE spec.
2. **Error code propagation**: For every error code defined in a BE spec, verify the corresponding FE spec documents how that error is displayed to the user.
3. **Access control consistency**: For every RBAC role referenced in a BE spec's access control, verify the FE spec's conditional rendering matrix includes that role.
4. **Data contract drift**: For every IA shard entity, verify that the BE spec's request/response schemas contain all fields defined in the IA shard's data model — no fields silently dropped or renamed.
5. **State management consistency**: For every FE component that manages optimistic updates, verify the corresponding BE endpoint's error response is specified well enough for the FE to roll back.

Collect all mismatches into a consistency report. If any exist → **hard stop** and present them to the user for resolution before proceeding.

> These 5 checks are **non-negotiable minimums**. The `cross-layer-consistency` skill may define additional checks — run those too, but never skip these 5 even if the skill doesn't mention them.

---

## 0.8. Draft continuity check

Check whether `docs/plans/phases/phase-N-draft.md` already exists (where N is the current phase number).

- **If it exists**: Read it and identify which slices are already drafted vs missing. Present: "A draft exists for Phase N with [X] slices. **Continue** (add missing only) or **start fresh** (overwrite)?" Wait for the user.
- **If it does not exist**: Proceed normally.
