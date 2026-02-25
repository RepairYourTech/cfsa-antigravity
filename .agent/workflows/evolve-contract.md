---
description: Safely evolve a Zod schema — identify all consumers, write migration tests, update across all four surfaces
pipeline:
  position: utility
  stage: maintenance
  predecessors: [] # callable from any stage
  successors: [] # returns to caller
  skills: [tdd-workflow, migration-management, testing-strategist, error-handling-patterns]
  calls-bootstrap: false
---

# Evolve Contract

Safely modify a Zod schema without breaking existing consumers.

**Input**: The contract to change and the desired modification
**Output**: Updated contract, migration tests, and all consumers updated

---

## 0. Load contract evolution skills

Read these skills for safe schema migration:
1. `.agent/skills/migration-management/SKILL.md` — Migration strategy and versioning
2. `.agent/skills/testing-strategist/SKILL.md` — Migration test coverage
3. `.agent/skills/error-handling-patterns/SKILL.md` — Error handling for schema changes

---

## 1. Identify the contract

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

## 3. Write migration tests

Before changing anything, write tests that validate:
- Existing data still passes the new schema (backward compatibility)
- New data shape is accepted
- Invalid data is rejected

Run `{{TEST_COMMAND}}` — tests should FAIL until the schema is updated.

## 4. Update the contract

Modify the Zod schema. For breaking changes:
- Consider versioning (v1 → v2)
- Add runtime migration helpers if needed

## 5. Update all consumers

For each consumer found in Step 2:
- Update the code to use the new schema shape
- Verify types resolve correctly

## 6. Validate

Run `{{VALIDATION_COMMAND}}` (see `.agent/instructions/commands.md` for the configured validation command).

All must pass.

## 7. Document the change and next steps

Add an entry to the decisions log in `docs/plans/*-architecture-design.md` explaining why the contract changed.

**Proposed next step**: Re-run `/validate-phase` for the affected phase to ensure no regressions were introduced by the contract evolution.
