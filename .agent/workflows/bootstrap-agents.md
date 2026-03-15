---
description: Utility — fill {{PLACEHOLDER}} values and provision skills from `.agent/skill-library/`. Called by pipeline workflows when tech stack info changes.
pipeline:
  position: infrastructure
  stage: provisioning
  predecessors: [] # called inline by other workflows
  successors: [] # returns to caller
  skills: [] # this IS the skill provisioner
  calls-bootstrap: false # is bootstrap
shards: [bootstrap-agents-fill, bootstrap-agents-provision]
---

// turbo-all

# Bootstrap Agents

**This is a utility workflow, not an entry point.** It gets called by other pipeline workflows (like `/create-prd`, `/iterate-plan`, `/write-be-spec`, `/write-fe-spec`, `/add-feature`, `/implement-slice`) whenever they make tech stack decisions or introduce new dependencies.

> Bootstrap is a **surgical, additive, idempotent provisioner**. Each invocation fills ONLY the placeholders for the decisions just confirmed and provisions ONLY the skills triggered by those decisions. It never touches placeholders that haven't been decided yet and never re-fills placeholders that are already filled.

Bootstrap does two things:
1. **Fill `{{PLACEHOLDER}}` values** in kit instruction templates
2. **Provision skills** from `.agent/skill-library/` based on stack and surface triggers

## Invocation Points

| Workflow | When Bootstrap Fires | Keys Passed |
|---|---|---|
| `/create-prd` Step 3 | After each confirmed tech decision | The specific key just decided (e.g., `DATABASE=SurrealDB`) |
| `/create-prd` Step 10 | After architecture doc is written | `ARCHITECTURE_DOC` (the dated filename) |
| `/write-be-spec` | If spec introduces new backend dependency | New key only (e.g., `QUEUE=BullMQ`) |
| `/write-fe-spec` | If spec introduces new frontend dependency | New key only (e.g., `CHARTS=Chart.js`) |
| `/implement-slice` | If implementation adds significant new dependency | New key only |

**Input**: Template values (package manager, framework, database, etc.) + optional stack/surface triggers
**Output**: Filled templates + newly installed skills in `.agent/skills/`

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`bootstrap-agents-fill`](.agent/workflows/bootstrap-agents-fill.md) | Receives template values, fills instruction/rule/AGENTS.md templates |
| 2 | [`bootstrap-agents-provision`](.agent/workflows/bootstrap-agents-provision.md) | Reads skill library manifest, provisions skills, fills workflow placeholders, reports results |

---

## Orchestration

### Step A — Run `.agent/workflows/bootstrap-agents-fill.md`

Receives template values from the calling workflow and fills `{{PLACEHOLDER}}` values across instruction templates, rule templates, skill templates, and `AGENTS.md`.

### Step B — Run `.agent/workflows/bootstrap-agents-provision.md`

Reads the skill library manifest, provisions matching skills based on stack/surface triggers, updates the installed skills list, fills workflow command/skill placeholders, and reports results.

---

## Idempotency

Bootstrap is safe to call multiple times:

- **Already-filled placeholders**: If a `{{PLACEHOLDER}}` has already been replaced with a value, it is NOT re-filled unless the calling workflow explicitly provides a new value for that key
- **Already-installed skills**: Skills that already exist in `.agent/skills/` are not re-copied from the library
- **New values**: New stack/surface values trigger new skill installations without affecting existing ones
- **Partial invocation**: Bootstrap can be called with just one or two new values — it only fills what's provided
