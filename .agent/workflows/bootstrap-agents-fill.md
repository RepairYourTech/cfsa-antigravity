---
description: Receive template values and fill surface stack map + instruction/rule/AGENTS.md templates for the bootstrap-agents workflow
parent: bootstrap-agents
shard: fill
standalone: true
position: 1
pipeline:
  position: infrastructure
  stage: provisioning
  predecessors: []
  successors: [bootstrap-agents-provision]
  skills: []
  calls-bootstrap: false
---

// turbo-all

# Bootstrap Agents — Fill Templates

Receive template values from the calling workflow and fill the surface stack map in `tech-stack.md`, plus global/structural/infrastructure values across instruction, rule, and root-level templates.

**Prerequisite**: If invoked standalone, the caller must provide at least one template key-value pair. If no values are provided, there is nothing to fill — report and exit.

> [!IMPORTANT]
> This workflow fills the surface stack map and global template values. It does **NOT** provision skills from the library — that is handled exclusively by `.agent/workflows/bootstrap-agents-provision.md`. Running this workflow standalone will populate map cells but not install the corresponding skill directories.

---

## 1. Receive values

Accept values in the categories defined in `.agent/skills/bootstrap-agents/SKILL.md` (Section 1):
- **Surface-keyed values** → Per-Surface Skills table
- **Cross-cutting values** → Cross-Cutting Skills table
- **Global values** → Global Settings table + root configs
- **Structural values** → instruction templates
- **Infrastructure values** → instruction templates
- **Pipeline context** → `PIPELINE_STAGE` for validation

If any values are missing, leave those cells/placeholders in place — they'll be filled on a future invocation.

---

## 2. Fill the surface stack map

Open `.agent/instructions/tech-stack.md`.

### 2a. Per-Surface Skills table

For each `SURFACE=<name>` received:

1. **Row exists** → update only the cells for provided column keys. Do NOT overwrite cells that already have values unless the caller explicitly re-provides a value.
2. **Row doesn't exist** → add a new row. Fill provided columns, use `—` for all unprovided columns.
3. **Appending to existing cells** → if a column already has a value and the caller provides additional values, append with comma separation. Example: existing `supabase` + new `surrealdb` → `supabase, surrealdb`. Skip duplicates.

### 2b. Cross-Cutting Skills table

For each cross-cutting key received:
1. **Category exists with value** → append to comma-separated list (skip duplicates)
2. **Category exists, empty** → set the value
3. **Accumulated values** (e.g., `DATABASE_*` sub-keys like `DATABASE_PRIMARY`, `DATABASE_VECTOR`) → each sub-key appends to the Databases column of the relevant surface AND to the cross-cutting Databases row if applicable

### 2c. Global Settings table

Fill `PROJECT_NAME`, `DESCRIPTION`, `TECH_STACK_SUMMARY`, `SURFACES`, `ARCHITECTURE_DOC` as provided.

---

## 3. Fill instruction templates

### `.agent/instructions/commands.md`

Write per-surface command sections. For each surface in the map:

```markdown
## <Surface> Commands

| Command | Value |
|---------|-------|
| Package Manager | <from map> |
| Dev | <from map> |
| Test | <from map> |
| Lint | <from map> |
| Build | <from map> |
| Validation | <from map> |
```

If single-surface, omit the surface header — just write a flat commands table.

### `.agent/instructions/workflow.md`
Fill `{{VALIDATION_COMMAND}}` with the primary surface's validation command (first non-`shared` row in the map, or `shared` if only one row exists).

### `.agent/instructions/patterns.md`
Replace `{{FRAMEWORK_PATTERNS}}` if provided.

### `.agent/instructions/structure.md`
Replace `{{PROJECT_STRUCTURE}}`, `{{ARCHITECTURE_TABLE}}` if provided.

---

## 4. Fill root agent config files (AGENTS.md and GEMINI.md)

Replace in **both** `AGENTS.md` and `GEMINI.md`:
- `{{PROJECT_NAME}}`
- `{{DESCRIPTION}}`
- `{{TECH_STACK_SUMMARY}}`
- `{{VALIDATION_COMMAND}}` — primary surface's validation command
- `{{ARCHITECTURE_DOC}}`
- `{{CONTRACT_LIBRARY}}`
- `{{INSTALLED_SKILLS}}` (if provided at this invocation; otherwise leave for `bootstrap-agents-provision` Step 8)

> **Note**: Both files serve as root agent config. Both must be kept in sync.

---

## 5. Fill operational skill and rule templates

Scan all `.agent/skills/*/SKILL.md` files for `{{PLACEHOLDER}}` values and fill any that match:

- `{{VALIDATION_COMMAND}}` — in `fix-bug`, `main-workflow`, `deploy`, `refactor`
- `{{PACKAGE_MANAGER}}` — in `refactor`, `security-audit`
- `{{TEST_COVERAGE_COMMAND}}` — in `refactor`
- `{{BUILD_COMMAND}}` — in `deploy`
- `{{DEPLOY_COMMAND}}` — in `deploy`
- `{{BUILD_OUTPUT_DIR}}` — in `deploy`
- `{{SSH_HOST}}` — in `setup-session`
- `{{DB_PORT}}` — in `setup-session`
- `{{CREDENTIAL_TOOL}}` — in `setup-session`

Also scan `.agent/rules/*.md`: `{{CONTRACT_LIBRARY}}` in `tdd-contract-first.md`.

---

## 6. Report and proceed

Report:
- Which map cells were filled (and their values)
- Which map cells remain empty
- Which instruction template placeholders were filled
- Any errors encountered

If invoked standalone, the next step is `/bootstrap-agents-provision` to provision skills using the 4-tier resolution chain.

If invoked by another workflow (e.g., `/create-prd`), return this report to the calling workflow.
