---
description: System architecture and data strategy for the create-prd workflow
parent: create-prd
shard: architecture
standalone: true
position: 2
pipeline:
  position: 2.2
  stage: architecture
  predecessors: [create-prd-stack]
  successors: [create-prd-security]
  skills: [api-design-principles, database-schema-design, error-handling-patterns, prd-templates, technical-writer]
  calls-bootstrap: false
requires_placeholders: [HOSTING_SKILL, ORM_SKILL, DATABASE_SKILLS]
---

// turbo-all

# Create PRD — Architecture & Data Strategy

Design the high-level system architecture and data strategy. Create the data placement strategy document.

---

## 0. Placeholder guard

Before any skill reads, verify that the following placeholder values have been filled by `/bootstrap-agents`. For each placeholder, check whether the literal characters `{{` still appear in the value. If **any** are unfilled, emit a **HARD STOP** and do not proceed to Step 4.

| Placeholder | Filled by | Recovery | Why this matters |
|---|---|---|---|
| `{{HOSTING_SKILL}}` | `/create-prd-stack` when hosting provider is confirmed | If `docs/plans/*-architecture-design.md` exists, read it and extract the confirmed hosting provider, then run `/bootstrap-agents HOSTING=<confirmed-provider>`. Otherwise run `/create-prd-stack` first. | Data strategy and schema design steps (Steps 4 and 5) cannot run without the hosting skill — deployment topology decisions will lack provider-specific conventions. |
| `{{ORM_SKILL}}` | `/create-prd-stack` when ORM is confirmed | If `docs/plans/*-architecture-design.md` exists, read it and extract the confirmed ORM, then run `/bootstrap-agents ORM=<confirmed-orm>`. Otherwise run `/create-prd-stack` first. | Migration strategy (Step 5.4) cannot run without the ORM skill — schema conventions and migration patterns will be generic instead of stack-specific. |
| `{{DATABASE_SKILLS}}` | `/create-prd-stack` when database technology is confirmed | If `docs/plans/*-architecture-design.md` exists, read it and extract the confirmed database, then run `/bootstrap-agents DATABASE=<confirmed-db>`. Otherwise run `/create-prd-stack` first. | Data strategy (Step 5) cannot run without the database skill — schema design patterns will be incompatible with the chosen database. |

For the hard stop message format and recovery instructions, see `.agent/skills/prd-templates/references/placeholder-guard-template.md`.

Only proceed to Step 4 when all three placeholders report no literal `{{` characters.

---

## 4. System architecture

Read .agent/skills/{{API_DESIGN_SKILL}}/SKILL.md and .agent/skills/api-design-principles/SKILL.md for API surface design.

Design the high-level system. Each sub-item requires full exploration, not a summary sentence:

1. **Component diagram** — What services exist? How do they communicate? What protocols? What happens if one is down?
2. **Data flow** — Request lifecycle from client to database and back. Every hop, every transformation, every auth check along the way. Draw the full sequence.
3. **Deployment topology** — What runs where? Edge? Origin? External? Local machine? App Store? What are the latency implications? What are the cost implications?
   Read .agent/skills/{{HOSTING_SKILL}}/SKILL.md and follow its deployment conventions.
   Read .agent/skills/technical-writer/SKILL.md and follow its methodology.
4. **API surface** — REST? GraphQL? RPC? Versioning strategy? Error format? Pagination? Rate limit headers?

For multi-surface projects, additionally define:
5. **Surface interconnection** — How do surfaces communicate? What is the source of truth for shared data? What happens when a surface is offline?
6. **Shared domain boundary** — Which entities/models are shared across surfaces vs surface-specific?

For each component, also define:
- What it owns (data, logic, auth decisions)
- What it delegates (to other components or external services)
- What happens when it fails (graceful degradation, circuit breakers, fallbacks)

**Present to user**: Show the system architecture section and walk through each component. Ask:
- "Does this component diagram capture every service in the system?"
- "Are there failure modes I haven't accounted for?"
- For multi-surface: "What happens if the sync layer goes down? Can each surface degrade gracefully?"

Refine based on discussion before proceeding.

Write the completed `## System Architecture` section to `docs/plans/architecture-draft.md` (create the file if it does not exist). Do not wait until the end — write this section as soon as it is completed and confirmed by the user.

## 4.5. Error architecture

> **Hard gate.** This step is mandatory for every project. All five decisions below must be confirmed by the user before `## 5. Data strategy` begins. Do not proceed to Data Strategy until every decision is explicitly approved.

Read `.agent/skills/error-handling-patterns/SKILL.md` and follow its Error Architecture Interview methodology. All 5 decisions must receive explicit user confirmation before proceeding to Data Strategy. This step is a hard gate — do not proceed until all five decisions are confirmed.

Write the completed decisions to `docs/plans/architecture-draft.md` under a new top-level `## Error Architecture` section (between `## System Architecture` and `## Data Strategy`). The section must contain five sub-sections matching the five decisions above (`### Global Error Envelope`, `### Error Propagation Chain`, `### Unhandled Exception Strategy`, `### Client Fallback Contract`, `### Error Boundary Strategy`), with the locked canonical JSON example included verbatim under `### Global Error Envelope`.

## 5. Data strategy

Read .agent/skills/database-schema-design/SKILL.md and follow its schema design methodology.

Read each skill listed in `{{DATABASE_SKILLS}}` (comma-separated). For each skill directory name, read `.agent/skills/[skill]/SKILL.md` before proceeding. Each sub-item must be explored to field-level depth:

1. **Data placement** — What lives in the database vs cache vs object storage vs external service vs local device storage? For each entity: which service owns it and why
2. **Schema approach** — Strict schema vs schemaless vs hybrid? Field types, constraints, indexes, relations with cardinality
3. **Query patterns** — Read-heavy? Write-heavy? What are the hot paths? What needs caching? What are the N+1 risks?
4. **Migration strategy** — How will schema evolve? Backward compatibility approach? Zero-downtime migration plan?
   Read .agent/skills/{{ORM_SKILL}}/SKILL.md and follow its migration and schema conventions.
5. **PII boundaries** — Which fields contain PII? Where is PII stored vs where is it NOT stored? How is PII isolated from AI/analytics pipelines?

For multi-surface projects, additionally define:
6. **Data ownership** — Which surface is the source of truth for each entity? How are conflicts resolved?
7. **Sync protocol** — What data syncs between surfaces? How frequently? What happens during network partition?

**Present to user**: Show the data strategy section and walk through placement decisions. Ask:
- "Does every entity have a clear owner?"
- "Are there query patterns I'm missing that could become hot paths?"

Refine based on discussion before proceeding.

Write the completed `## Data Strategy` section to `docs/plans/architecture-draft.md`.

### 5.5. Cross-Store Entity Consistency

Read .agent/skills/database-schema-design/SKILL.md and follow its Cross-Store Entity Consistency Protocol for every entity that spans more than one store.

Write the completed cross-store consistency table to `docs/plans/architecture-draft.md` as part of the `## Data Strategy` section.

### Data placement strategy document

Read `.agent/skills/prd-templates/references/data-placement-template.md` for the template structure. Create `docs/plans/data-placement-strategy.md` using the template, filling each section with the data decisions confirmed above.

### Propose next step

System architecture and data placement strategy are complete. Next: Run `/create-prd-security` to define the security model, compliance escalation, and integration points.

> If this shard was invoked standalone (not from `/create-prd`), surface this via `notify_user`.
