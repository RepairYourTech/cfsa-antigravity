---
description: Safely evolve a Zod schema — identify all consumers, write migration tests, update across all four surfaces
pipeline:
  position: utility
  stage: maintenance
  predecessors: [] # callable from any stage
  successors: [] # returns to caller
  skills: [tdd-workflow, migration-management, testing-strategist, error-handling-patterns, api-versioning]
  calls-bootstrap: true
---

# Evolve Contract

Safely modify a Zod schema without breaking existing consumers.

**Input**: The contract to change and the desired modification
**Output**: Updated contract, migration tests, and all consumers updated

### When to use `/evolve-contract`

| Use `/evolve-contract` | Just edit the schema directly |
|---|---|
| The schema has **2+ consumers** across different surfaces | The schema is used in only one place |
| The change is **breaking** (rename, remove, type change) | The change is purely additive (new optional field, no consumers affected) |
| The schema is a **shared contract** (API request/response boundary) | The schema is an internal type with no cross-surface consumers |
| You need a **migration path** for existing data | No stored data uses this schema |

### When NOT to use it

- **During initial implementation** (first time writing the contract) — contracts evolve only after they exist
- **For test-only types** — internal test fixtures don't need migration safeguards
- **When `/propagate-decision` is more appropriate** — if the change originates from a locked pipeline decision (architecture, spec), use `/propagate-decision` first, then `/evolve-contract` for the schema specifically

---

## 0. Load contract evolution skills

Read these skills for safe schema migration:
1. `.agent/skills/migration-management/SKILL.md` — Migration strategy and versioning
2. `.agent/skills/testing-strategist/SKILL.md` — Migration test coverage
3. `.agent/skills/error-handling-patterns/SKILL.md` — follow its methodology for schema change error handling

---

## 1. Identify the contract

Read .agent/skills/{{LANGUAGE_SKILL}}/SKILL.md and follow its language conventions.

Determine which Zod schema needs to change and what the change is:
- **Additive** (new optional field) — Low risk
- **Narrowing** (tighter validation) — Medium risk
- **Breaking** (rename, remove, type change) — High risk

## 2. Find all consumers

Search for all usages of `SchemaName` in the source directory (see `.agent/instructions/structure.md` for the root — typically `src/`).

Document all consumers:
- API endpoint handlers
- Frontend components
- Test files
- Other contracts that reference this one

### 2.5. API versioning check (conditional)

If any consumer is a **public-facing API endpoint** (i.e., called by external clients, not just internal frontend):

Read .agent/skills/api-versioning/SKILL.md and follow its breaking change classification methodology.

Determine whether the schema change requires:
1. **In-place migration** — additive or narrowing change, no version bump needed
2. **New API version** — breaking change to a public contract, requires versioning strategy

If a new API version is needed, document the versioning approach (URL prefix, header, or query param) before proceeding to Step 3. The migration tests must validate both the old and new versions.

## 3. Write migration tests

Read .agent/skills/tdd-workflow/SKILL.md and follow its Red→Green→Refactor cycle for contract evolution.

Read .agent/skills/{{UNIT_TESTING_SKILL}}/SKILL.md and follow its test writing conventions.

Before changing anything, write tests that validate:
- Existing data still passes the new schema (backward compatibility)
- New data shape is accepted
- Invalid data is rejected

Run `{{TEST_COMMAND}}` — tests should FAIL until the schema is updated.

## 4. Update the contract

Read .agent/skills/{{LANGUAGE_SKILL}}/SKILL.md and follow its language conventions.

Modify the Zod schema. For breaking changes:
- Consider versioning (v1 → v2)
- Add runtime migration helpers if needed

## 4.5. New dependency check

If the contract change introduces a dependency not currently in the skill set — for example, a new Zod plugin, a Pydantic extension, a binary serialization library, or a new validation pattern — read `.agent/workflows/bootstrap-agents.md` and invoke `/bootstrap-agents NEW_DEPENDENCY=[package]` before updating consumers in Step 5.

Confirm the matching skill is installed (or no new dependency was introduced) before proceeding to Step 5.

## 5. Update all consumers

Read .agent/skills/{{LANGUAGE_SKILL}}/SKILL.md and follow its language conventions.

For each consumer found in Step 2:
- Update the code to use the new schema shape
- Verify types resolve correctly

## 6. Validate

Run `{{VALIDATION_COMMAND}}` (see `.agent/instructions/commands.md` for the configured validation command).

All must pass.

## 6.5 — Spec cascade check

For each consumer updated in Step 5, identify which BE spec and FE spec reference this contract. Check whether the change (additive/narrowing/breaking) requires updating those specs. For breaking changes, the BE spec and FE spec MUST be updated before proceeding. For additive changes, update the spec if the new field is user-visible or API-facing. Update the IA Source Map in the BE spec to reflect the change.

## 7. Document the change and next steps

Add an entry to the decisions log in `docs/plans/*-architecture-design.md` explaining why the contract changed.

**Proposed next step**: Re-run `/validate-phase` for the affected phase to ensure no regressions were introduced by the contract evolution.
