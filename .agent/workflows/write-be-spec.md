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

If a needed skill is missing, check if a matching entry exists in `.agent/skill-library/MANIFEST.md`. Read `.agent/workflows/bootstrap-agents.md` and execute its utility instructions immediately with the appropriate stack key to install it.

---

## Shard Overview

| # | Shard | What It Does |
|---|-------|-------------|
| 1 | [`write-be-spec-classify`](.agent/workflows/write-be-spec-classify.md) | Classifies IA shard, loads skills, reads source material + cross-references + deep dives |
| 2 | [`write-be-spec-write`](.agent/workflows/write-be-spec-write.md) | Writes the BE spec, updates indexes, runs ambiguity gate, checks for new dependencies |

---

## Orchestration

### Step A — Run `.agent/workflows/write-be-spec-classify.md`

Identifies the target IA shard, classifies it (feature domain / multi-domain / cross-cutting / structural reference / composite), loads the skill bundle, reads all source material (primary shard, cross-shard references, deep dives, testability section), and reads cross-cutting specs.

### Step B — Run `.agent/workflows/write-be-spec-write.md`

Writes the BE spec(s) to `docs/plans/be/`, updates the BE index, runs cross-reference checks and the ambiguity gate, checks for new dependencies (firing bootstrap if needed), and presents for review.

---

## Quality Gate

Before presenting to the user, verify:

Read .agent/skills/code-review-pro/SKILL.md and apply its adversarial review discipline to each checklist item.

- [ ] Every endpoint has a {{CONTRACT_LIBRARY}} request AND response schema
- [ ] Every database table has defined fields, indexes, and permissions
- [ ] Security constraints from IA shard reflected in middleware section
- [ ] Error codes are specific (not generic 500s)
- [ ] Rate limits specified per endpoint
- [ ] Every deep dive key decision is reflected in the spec
- [ ] Every cross-shard reference has been resolved
- [ ] IA Source Map is complete — no BE spec section lacks a traceable IA source
