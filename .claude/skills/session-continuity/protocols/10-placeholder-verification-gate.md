# Protocol 10: Surface Stack Map Verification Gate

## Purpose

Specification and implementation workflows must verify the surface stack map is populated **before** any skill reads. This prevents spec authoring from running with empty map cells, which would produce patterns incompatible with the chosen tech stack.

> **Note**: As of v3, workflows no longer use `{{PLACEHOLDER}}` values for skill paths. Instead, they read skill names from the surface stack map in `.agent/instructions/tech-stack.md`. This gate verifies map completeness.

## How to Apply

Add a **Step 0 — Map guard** to any specification or implementation workflow that reads skills from the surface stack map. The guard runs before all other steps, including re-run checks and prerequisite validations.

## Guard Logic

### 1. Read the surface stack map

Read `.agent/instructions/tech-stack.md` and parse both tables:
- **Per-Surface Skills** — One row per surface
- **Cross-Cutting Skills** — Project-wide categories

### 2. Determine required cells

Based on the workflow type, identify which columns/categories must have filled values:

| Workflow Type | Required Per-Surface Columns | Required Cross-Cutting Categories |
|---|---|---|
| **IA spec** (`write-architecture-spec-*`) | Databases | Security, Surfaces |
| **BE spec** (`write-be-spec-*`) | Languages, Databases, BE Frameworks, ORMs, Unit Tests | Auth |
| **FE spec** (`write-fe-spec-*`) | Languages, FE Frameworks, FE Design, State Mgmt | Accessibility |
| **Implementation** (`implement-slice-*`) | Languages, Unit Tests, E2E Tests + surface-specific | All |
| **Validation** (`validate-phase`) | All | All |
| **Architecture** (`create-prd-architecture`) | Databases, ORMs | Hosting |
| **Security** (`create-prd-security`) | — | Security, Auth |
| **Compile** (`create-prd-compile`) | Unit Tests, E2E Tests | CI/CD |

### 3. Check for empty cells

For each required cell, verify it contains at least one skill name (not `—`, not empty, not a `{{` literal).

### 4. Hard stop on empty cells

When ANY required cell is empty, emit this message for **each** empty cell:

> **Empty map cell:** `{column}` for surface `{surface}`
> **Filled by:** `/create-prd-stack` when the {component} is confirmed
> **Recovery:** Run `/create-prd-stack` first to make tech stack decisions, then `/bootstrap-agents` to populate the map.
> **Impact:** Without this skill, {downstream impact description}.

Then emit:

> ⛔ **HARD STOP** — {N} map cell(s) are empty. This workflow cannot proceed without populated stack data. See recovery steps above.

### 5. Timing fallback (create-prd context)

During `/create-prd`, the map is being built incrementally. If a cell is empty but the value was just confirmed in the current conversation (from `/create-prd-stack`), the workflow may proceed using the conversation-confirmed value. Bootstrap will fill the map after `/create-prd` completes.

This fallback **only** applies to workflows invoked within the `/create-prd` orchestrator. Standalone invocations must have the map populated.

## Recovery Table

| Empty Cell (Per-Surface) | Recovery Command |
|---|---|
| Languages | `/create-prd-stack` → confirm language |
| Databases | `/create-prd-stack` → confirm database(s) |
| BE Frameworks | `/create-prd-stack` → confirm backend framework |
| FE Frameworks | `/create-prd-stack` → confirm frontend framework |
| ORMs | `/create-prd-stack` → confirm ORM |
| Unit Tests | `/create-prd-stack` → confirm unit testing framework |
| E2E Tests | `/create-prd-stack` → confirm E2E testing framework |
| FE Design | `/create-prd-stack` → confirm frontend design approach |
| State Mgmt | `/create-prd-stack` → confirm state management library |

| Empty Cell (Cross-Cutting) | Recovery Command |
|---|---|
| Auth | `/create-prd-stack` → confirm auth provider |
| Security | `/create-prd-stack` → confirm security framework |
| CI/CD | `/create-prd-stack` → confirm CI/CD platform |
| Hosting | `/create-prd-stack` → confirm hosting provider |
| Accessibility | `/create-prd-stack` → confirm accessibility tooling |

## Commands verification

Additionally verify that `.agent/instructions/commands.md` has non-template values. If the commands section still contains `{{COMMAND_SECTIONS}}`, run `/bootstrap-agents` to fill it.
