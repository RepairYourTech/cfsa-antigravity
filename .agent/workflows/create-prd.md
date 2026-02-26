---
description: Expand vision into full architecture design document — tech stack decisions, system design, data strategy, security model
pipeline:
  position: 2
  stage: architecture
  predecessors: [ideate]
  successors: [decompose-architecture]
  skills: [brainstorming, resolve-ambiguity, technical-writer, database-schema-design]
  calls-bootstrap: true # tech stack decisions trigger skill provisioning
shards: [create-prd-stack, create-prd-architecture, create-prd-security, create-prd-compile]
---

// turbo-all

# Create PRD / Architecture Design

Transform `vision.md` into a production-grade architecture design document with explicit decisions on every axis.

**Input**: `docs/plans/vision.md` (must exist and be approved)
**Output**: `docs/plans/YYYY-MM-DD-architecture-design.md` + `docs/plans/ENGINEERING-STANDARDS.md` + `docs/plans/data-placement-strategy.md`

> **Depth standard**: Every section of the architecture document must be specified
> to the point where a developer cannot misinterpret it. If you can write a
> one-paragraph section summary, it's not detailed enough. Each section should
> define every field, every flow, every error case, every permission boundary.
> The depth-standards rule (`.agent/rules/depth-standards.md`) applies to every
> word of the output. One-line placeholders like `[Auth, authorization, rate limits]`
> are not architecture — they are headings waiting for content.

---

## 1. Read vision document

Read `docs/plans/vision.md`.

If the file doesn't exist, tell the user to run `/ideate` first. Do not proceed without an approved vision.

Pay special attention to the **Project Surfaces** section — it determines which tech stack axes apply and whether this is a single-surface or multi-surface project.

---

## 2. Load skills

### Bundled skills

These skills are included in the kit — read each SKILL.md:
1. `.agent/skills/rest-api-design/SKILL.md` — API conventions
2. `.agent/skills/api-design-principles/SKILL.md` — API design principles
3. `.agent/skills/security-scanning-security-hardening/SKILL.md` — Security model
4. `.agent/skills/clean-code/SKILL.md` — Architecture principles
5. `.agent/skills/brainstorming/SKILL.md` — For collaborative decisions

### Stack-specific skill discovery

Check `.agent/skills/` for relevant skills. Read `.agent/skills/find-skills/SKILL.md` for guidance on discovering community skills for your chosen stack.

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`create-prd-stack`](create-prd-stack.md) | Constraint-first discovery, tech stack decisions with bootstrap firing |
| 2 | [`create-prd-architecture`](create-prd-architecture.md) | System architecture, data strategy, data placement strategy document |
| 3 | [`create-prd-security`](create-prd-security.md) | Security model, compliance escalation, integration points |
| 4 | [`create-prd-compile`](create-prd-compile.md) | Development methodology, phasing, compile architecture-design.md + ENGINEERING-STANDARDS.md |

---

## Orchestration

### Step A — Run `.agent/workflows/create-prd-stack.md`

Builds the constraints map from vision.md, presents tech stack options per axis, gets user decisions, fires bootstrap after each confirmation.

### Step B — Run `.agent/workflows/create-prd-architecture.md`

Designs system architecture (components, data flow, deployment topology, API surface) and data strategy (placement, schema, queries, migrations, PII boundaries). Creates `docs/plans/data-placement-strategy.md`.

### Step C — Run `.agent/workflows/create-prd-security.md`

Defines the security model (auth, authorization, validation, rate limits). Escalates compliance-heavy domains to full-depth sections. Documents integration points with failure modes and fallbacks.

### Step D — Run `.agent/workflows/create-prd-compile.md`

Documents development methodology and phasing strategy. Compiles `docs/plans/YYYY-MM-DD-architecture-design.md` and `docs/plans/ENGINEERING-STANDARDS.md`.

---

## 12. Quality gate

### Self-check against Architecture rubric

Before presenting to the user, self-check both documents against the **Architecture Rubric** (9 dimensions) from `/audit-ambiguity`:

| # | Dimension | Check |
|---|-----------|-------|
| 1 | Tech Stack Decisiveness | Is every applicable axis decided with rationale? No TBDs? |
| 2 | System Architecture | Are all components, flows, and failure modes documented? |
| 3 | Data Strategy | Are placement, schema, queries, migrations, and PII boundaries defined? |
| 4 | Security Model | Are auth, authz, validation, rate limits, and CSP fully specified? |
| 5 | Compliance Depth | Are regulated domains (minors, payments, health) given full-depth sections? |
| 6 | API Design | Are surface, versioning, conventions, errors, and pagination defined? |
| 7 | Integration Robustness | Do all externals have failure + fallback plans? |
| 8 | Phasing Clarity | Are phases dependency-ordered with entry/exit criteria? |
| 9 | Engineering Standards | Are all thresholds concrete? No TBDs in ENGINEERING-STANDARDS.md? |

Also verify completeness:

- [ ] Every "Must Have" feature from vision.md has a home in the architecture
- [ ] Security model addresses all compliance constraints from vision.md
- [ ] Compliance-heavy domains have their own top-level sections (not buried as sub-bullets)
- [ ] All relevant skills installed for chosen stack
- [ ] Validation command in Engineering Standards matches `AGENTS.md` validation command
- [ ] For multi-surface: sync strategy defined, data ownership clear, conflict resolution specified
- [ ] For cross-platform: platform-specific considerations documented for each target OS

For any dimension that scores ⚠️ or ❌, resolve it NOW. Loop back to the relevant step and resolve with the user.

### Depth audit

Before presenting to the user, re-read the entire architecture document and for EACH section ask:

> "Could a developer implement this without asking a single clarifying question?"

If the answer is no for ANY section:
1. Identify what's missing (field types? flow steps? error cases? permission rules?)
2. Add the missing detail NOW — do not flag it, resolve it
3. Re-check the section

This is the single most important step. The difference between a useful architecture document and a useless one is whether this audit is done honestly. A 2,000-word architecture doc is almost certainly too shallow for any non-trivial project.

If gaps are found, loop back to the relevant step and resolve with the user.

> **Note**: This is an internal self-check, not a formal audit. For a rigorous,
> independent audit with evidence citations, run `/audit-ambiguity architecture` as a
> separate step after this workflow completes.

## 13. Request review and next steps

Use `notify_user` to present to the user:
- **Both** the architecture design document and the Engineering Standards document
- Summary of the self-check results (all 9 dimensions + completeness checklist)
- Any areas where you resolved gaps during the self-check

Both documents must be approved before proceeding. Do NOT proceed to the next step until the user sends a message explicitly approving this output. Proposing next steps is not the same as receiving approval. Wait for explicit approval before continuing.

### Proposed next steps

Once approved, present the user with the appropriate next step:

- **Default recommendation**: Run `/audit-ambiguity architecture` — recommended for all projects, especially those with compliance constraints
- **Skip condition**: Only skip `/audit-ambiguity architecture` if all 9 dimensions scored ✅ AND the project has zero compliance constraints. In that case, recommend `/decompose-architecture` directly.
