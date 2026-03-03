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
  skills: [database-schema-design, technical-writer, prd-templates, error-handling-patterns]
  calls-bootstrap: false
---

// turbo-all

# Create PRD — Architecture & Data Strategy

Design the high-level system architecture and data strategy. Create the data placement strategy document.

**Prerequisite**: Tech stack decisions must be locked — verify that `{{PLACEHOLDER}}` values for tech stack axes have been filled (by `/create-prd-stack` or `/bootstrap-agents`). If placeholders remain unfilled, tell the user to complete tech stack decisions first.

---

## 4. System architecture

Read .agent/skills/rest-api-design/SKILL.md and .agent/skills/api-design-principles/SKILL.md for API surface design.

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

Read `.agent/skills/error-handling-patterns/SKILL.md` and follow its methodology.

Design the global error handling contract for the entire system. This section locks decisions that every downstream spec must conform to:

1. **Global error envelope** — Define a single error response shape that every API endpoint must return. The canonical envelope uses exactly four fields:
   - `code` — Application-level error enum string (e.g., `"VALIDATION_FAILED"`, `"NOT_FOUND"`).
   - `message` — User-safe, human-readable string. Never contains stack traces or internal details.
   - `requestId` — Per-request UUID string for tracing and support correlation.
   - `details` — `object | null`. Structured additional context (e.g., field-level validation errors) or `null` when no extra detail applies.

   The locked canonical example is:
   ```json
   {
     "code": "VALIDATION_FAILED",
     "message": "Email address is not valid.",
     "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
     "details": { "field": "email", "reason": "must contain @" }
   }
   ```
   No other top-level fields (e.g., `status`, `error`, `timestamp`) may appear in the envelope. HTTP status codes are conveyed via the HTTP response status line, not inside the body.

2. **Error propagation chain** — For each layer in the stack (database → service layer → API handler → transport → client), define: what errors are caught, what is logged (and at what level), and what is exposed to the next layer. No layer may expose raw upstream errors to the client.
3. **Unhandled exception strategy** — Name the process-level catch mechanism (e.g., Express error middleware, global `uncaughtException` handler). Define: what fields are logged, what the client receives (must conform to the global envelope), and the alerting timeline (e.g., "PagerDuty within 5 minutes for >10 unhandled exceptions/minute").
4. **Client fallback contract** — For each surface (web, mobile, CLI, etc.), define: whether offline mode is supported, what the UI shows on network failure, retry strategy (exponential backoff? user-initiated?), and timeout thresholds.
5. **Error boundary strategy** — For each applicable surface (e.g., React error boundaries, mobile crash reporters), define: where boundaries are placed in the component tree, what the fallback UI renders, and whether errors are reported to a telemetry service.

**Present to user**: Show the error architecture section. Ask:
- "Does the global error envelope cover every field your clients need?"
- "Are there surfaces where the fallback contract needs to differ?"
- "Is the alerting timeline appropriate for your operational maturity?"

Refine based on discussion. All five decisions must receive explicit user confirmation before proceeding.

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

After per-entity placement decisions are made, for every entity that spans more than one store, document all four of the following:

1. **Canonical ID** — What single identifier ties this entity's representations together across all stores? (Must be the primary store's UUID stored as a property in every other store — never the graph store's or vector store's internal ID.)
2. **Creation sequence** — Which store is written first? If a later write fails (e.g., Neo4j node creation fails after PostgreSQL row is committed), what is the recovery mechanism? (Saga pattern? Compensating transaction? Async retry queue?)
3. **Deletion cascade** — What gets cleaned up when this entity is deleted, in what order, and by what mechanism? (Application-layer sequential deletes? DB-level triggers? Background job?)
4. **Read strategy** — Does a read of this entity require data from multiple stores? Name the application-layer join pattern explicitly.

Read all skills in `{{DATABASE_SKILLS}}` for advice on each store's transaction semantics and consistency guarantees before completing this sub-step.

Write the completed cross-store consistency table to `docs/plans/architecture-draft.md` as part of the `## Data Strategy` section.

### Data placement strategy document

Read `.agent/skills/prd-templates/references/data-placement-template.md` for the template structure. Create `docs/plans/data-placement-strategy.md` using the template, filling each section with the data decisions confirmed above.

### Propose next step

System architecture and data placement strategy are complete. Next: Run `/create-prd-security` to define the security model, compliance escalation, and integration points.

> If this shard was invoked standalone (not from `/create-prd`), surface this via `notify_user`.
