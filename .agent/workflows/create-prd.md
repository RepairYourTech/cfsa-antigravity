---
description: Expand vision into full architecture design document — tech stack decisions, system design, data strategy, security model
pipeline:
  position: 2
  stage: architecture
  predecessors: [ideate]
  successors: [audit-ambiguity, decompose-architecture] # audit-ambiguity recommended before decompose
  skills: [api-design-principles, brainstorming, brand-guidelines, clean-code, database-schema-design, design-anti-cliche, design-direction, error-handling-patterns, find-skills, logging-best-practices, performance-budgeting, pipeline-rubrics, prd-templates, resolve-ambiguity, security-scanning-security-hardening, tdd-workflow, tech-stack-catalog, technical-writer]
  calls-bootstrap: true # tech stack decisions trigger skill provisioning
shards: [create-prd-stack, create-prd-design-system, create-prd-architecture, create-prd-security, create-prd-compile]
---

// turbo-all

# Create PRD / Architecture Design

Transform the ideation output into a production-grade architecture design document with explicit decisions on every axis.

**Input**: `docs/plans/ideation/ideation-index.md` (must exist and be approved)
**Output**: `docs/plans/YYYY-MM-DD-architecture-design.md` + `docs/plans/ENGINEERING-STANDARDS.md` + `docs/plans/data-placement-strategy.md`

> **Depth standard**: Every section must be specified to the point where a developer cannot misinterpret it. The specificity-standards rule (`.agent/rules/specificity-standards.md`) applies to every word of the output.

---

## 1. Read ideation output

Read `docs/plans/ideation/ideation-index.md`.

If the file doesn't exist → **STOP**: tell the user to run `/ideate` first.

**Completeness validation**: If the file exists, verify it contains these required sections:
- `## Structural Classification`
- `## Engagement Tier`
- `## MoSCoW Summary` (with at least 1 Must Have feature)

If any required section is missing → **STOP**: "ideation-index.md is incomplete — missing `[section]`. Run `/ideate` to complete ideation before proceeding."

Use the **Structure Map** in `ideation-index.md` to locate: constraints, personas, domain details (fractal tree), cross-cutting concerns, and role coverage.

Pay special attention to **Project Surfaces** in `meta/constraints.md` — it determines which tech stack axes apply.

Read `## Engagement Tier` from `ideation-index.md`. If not set, ask the user and write immediately.

Read `.agent/skills/prd-templates/references/engagement-tier-protocol.md` — each shard reads the tier and adapts gates.

---

## 2. Load skills

Read each skill SKILL.md listed in the frontmatter `skills` array.

Check `.agent/skills/` for stack-specific skills. Read `.agent/skills/find-skills/SKILL.md` for community skill discovery.

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`create-prd-stack`](.agent/workflows/create-prd-stack.md) | Constraint-first discovery, tech stack decisions with bootstrap firing |
| 1.5 | [`create-prd-design-system`](.agent/workflows/create-prd-design-system.md) | Navigation paradigm, layout grid, page archetypes, component hierarchy, motion, state design language → `docs/plans/design-system.md` |
| 2 | [`create-prd-architecture`](.agent/workflows/create-prd-architecture.md) | System architecture, data strategy, data placement strategy document |
| 3 | [`create-prd-security`](.agent/workflows/create-prd-security.md) | Security model, compliance escalation, integration points |
| 4 | [`create-prd-compile`](.agent/workflows/create-prd-compile.md) | Development methodology, phasing, compile architecture-design.md + ENGINEERING-STANDARDS.md |

> **Progressive working artifact**: `docs/plans/architecture-draft.md` is written incrementally by shards 1–3 and read by shard 4 to compile the final dated `architecture-design.md`.

---

## Orchestration

### Step A — Run `.agent/workflows/create-prd-stack.md`
### Step A.5 — Run `.agent/workflows/create-prd-design-system.md`
### Step B — Run `.agent/workflows/create-prd-architecture.md`
### Step C — Run `.agent/workflows/create-prd-security.md`
### Step D — Run `.agent/workflows/create-prd-compile.md`

---

## Step E — Quality gate

### Self-check against Architecture rubric

Read `.agent/skills/pipeline-rubrics/references/architecture-rubric.md` and apply all 15 dimensions as the self-check.

Read `.agent/skills/prd-templates/references/architecture-completeness-checklist.md` and verify all items.

For any dimension that scores ⚠️ or ❌ → resolve it NOW. Loop back to the relevant shard.

**Remediation loop guard**: Track remediation attempts per dimension. After **3 failed attempts** on the same dimension → **STOP**: present the dimension to the user as a known gap with context on what was tried. Include it in the review presentation as an unresolved item for user decision.

> ❌ STOP — do not call notify_user until all dimensions score ✅ and all checklist items pass.

### Depth audit

Re-read the entire architecture document and for EACH section ask: "Could a developer implement this without asking a single clarifying question?"

If no → identify what's missing, add the detail NOW, re-check.

> **Note**: This is an internal self-check. For a rigorous independent audit, run `/audit-ambiguity architecture` after this workflow completes.

## Step F — Request review and next steps

Use `notify_user` to present both documents with self-check results.

**STOP** — do NOT proceed until the user explicitly approves.

### Next step

**STOP** — do NOT propose `/decompose-architecture` or any other pipeline workflow. The only valid next step is:

- `/audit-ambiguity architecture` — unconditionally mandatory. The self-check above cannot replace an independent audit. After the audit passes, the next step is `/decompose-architecture`.
