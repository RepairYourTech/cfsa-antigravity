---
description: Write a backend specification — classifies IA shard, resolves cross-references, reads deep dives, produces BE spec(s)
pipeline:
  position: 5a
  stage: specification
  predecessors: [write-architecture-spec]
  successors: [plan-phase]
  parallel-with: [write-fe-spec] # cross-shard only — see Parallelism Note in write-fe-spec.md
  skills: [api-design-principles, code-review-pro, database-schema-design, error-handling-patterns, find-skills, logging-best-practices, migration-management, prd-templates, resolve-ambiguity, session-continuity, spec-writing, technical-writer, testing-strategist, verification-before-completion, workflow-automation]
  calls-bootstrap: true # may discover new backend dependencies
shards: [write-be-spec-classify, write-be-spec-write]
---

// turbo-all

# Write Backend Specification

**Input**: A complete IA shard (or set of related shards)
**Output**: One or more BE specs with endpoints, contracts, schemas, middleware, error handling

---

## Skill Bootstrap

Check installed skills for stack-appropriate coverage:
- Database expert skill (schema design)
- Hosting/deployment skill (runtime/worker patterns)
- HTTP router/framework skill (middleware)
- REST API design skill (API conventions)
- Auth skill (JWT/session patterns)

Conditionally look for:
- Payment provider integration skill (if billing-related spec)
- Rate limiting / abuse protection skill
- TypeScript advanced patterns skill (for complex contract types)
- Security hardening skill (for auth/RBAC specs)

If a needed skill is missing, check if a matching entry exists in `.agent/skill-library/MANIFEST.md`. Read `.agent/workflows/bootstrap-agents.md` and execute its utility instructions immediately with the appropriate stack key to install it. **HARD GATE**: Follow the bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`). Confirm the matching skill is installed before proceeding.

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`write-be-spec-classify`](.agent/workflows/write-be-spec-classify.md) | Classifies IA shard, loads skills, reads source material + cross-references + deep dives |
| 2 | [`write-be-spec-write`](.agent/workflows/write-be-spec-write.md) | Writes the BE spec, updates indexes, runs ambiguity gate, checks for new dependencies |

---

## Orchestration

### Step 0 — Pipeline State Check

1. Read `.agent/progress/spec-pipeline.md`.
   - If the file does not exist → **STOP**: "No pipeline tracker found. Run `/decompose-architecture` first."
2. Identify all shards where the BE column = `not-started` AND the IA column = `complete`.
   - If no shards have IA `complete` → **STOP**: "IA layer not complete — run `/write-architecture-spec` first."
   - If all eligible shards already have BE `complete` → **STOP**: "All BE specs are complete. Next step: `/write-fe-spec`."
3. Auto-select the lowest-numbered eligible shard.
4. Present: "Pipeline tracker shows **shard [NN — name]** is the next shard needing a BE spec. Proceeding. Say 'override' to pick a different one."
5. Pass the selected shard to Step A.

### Step A — Run `.agent/workflows/write-be-spec-classify.md`

Identifies the target IA shard, classifies it (feature domain / multi-domain / cross-cutting / structural reference / composite), loads the skill bundle, reads all source material (primary shard, cross-shard references, deep dives, testability section), and reads cross-cutting specs.

### Step B — Run `.agent/workflows/write-be-spec-write.md`

Writes the BE spec(s) to `docs/plans/be/`, updates the BE index, runs cross-reference checks and the ambiguity gate, checks for new dependencies (firing bootstrap if needed), and presents for review.

---

## Quality Gate

**BLOCKING GATE** — Do NOT call `notify_user` or proceed to the next step until ALL items pass:

Read .agent/skills/code-review-pro/SKILL.md and apply its adversarial review discipline to each checklist item.

- [ ] Every endpoint has a {{CONTRACT_LIBRARY}} request AND response schema
- [ ] Every database table has defined fields, indexes, and permissions
- [ ] Security constraints from IA shard reflected in middleware section
- [ ] Error codes are specific (not generic 500s)
- [ ] Rate limits specified per endpoint
- [ ] Every deep dive key decision is reflected in the spec
- [ ] Every cross-shard reference has been resolved
- [ ] IA Source Map is complete — no BE spec section lacks a traceable IA source

## Completion Gate (MANDATORY)

Before reporting completion to the user:

1. **Memory check** — Apply rule `memory-capture`. Write any patterns, decisions, or blockers from this workflow to `.agent/progress/memory/`. If nothing to write, confirm: "No new patterns/decisions/blockers."
2. **Progress update** — Update `.agent/progress/` tracking files if they exist.
3. **Session log** — Write session entry to `.agent/progress/sessions/`.

