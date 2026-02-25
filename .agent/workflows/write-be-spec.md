---
description: Write a backend specification — classifies IA shard, resolves cross-references, reads deep dives, produces BE spec(s)
pipeline:
  position: 5a
  stage: specification
  predecessors: [write-architecture-spec]
  successors: [plan-phase]
  parallel-with: [write-fe-spec] # can run in parallel
  skills: [resolve-ambiguity, error-handling-patterns, database-schema-design, migration-management, testing-strategist, logging-best-practices]
  calls-bootstrap: true # may discover new backend dependencies
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
```

---

## 1. Identify the target IA shard

Determine which IA shard to process. Read it in full before proceeding.

## 2. Classify the shard

Not every IA shard produces the same output. Before writing anything, classify the shard:

| Classification | Description | BE Spec Output | How to Detect |
|---------------|-------------|----------------|---------------|
| **Feature domain** | Defines user interactions, data models, and API-facing behavior for a single cohesive domain | 1 BE spec | Has data model + user flows + access model that imply API endpoints |
| **Multi-domain** | Covers multiple distinct backend sub-systems that share a product surface but have independent APIs | N BE specs (split along sub-feature boundaries) | Section headers map to independent API surfaces; data models don't overlap between sections; could be developed by different teams |
| **Cross-cutting** | Defines shared patterns consumed by all feature specs (auth, API conventions, error handling) | 1 cross-cutting BE spec (`00-*`) | Content is about "how all endpoints work" not "what this feature does" |
| **Structural reference** | Maps structure, naming, or routing without defining API behavior | 0 BE specs | No data model, no user flows, no endpoints — just reference tables |
| **Composite** | Contains both a structural reference section AND feature behavior (e.g., URL mapping + vanity URL lifecycle) | Depends — feature portion may belong in another shard's BE spec | Look for cross-references pointing the feature content to its owning domain |

**Multi-domain split heuristic:** If an IA shard has 3+ section headers that each define independent data models, independent API surfaces, and could be built/deployed/tested without the others, split into separate BE specs. Use the shard's own section headers as the natural split boundaries.

**Present the classification to the user before proceeding.** Include:
- The classification and reasoning
- How many BE specs will be produced
- For multi-domain: the proposed split boundaries
- For structural reference: confirmation that no BE spec is needed

## 3. Load skill bundle

Load skill bundle: [`{{DATABASE_SKILL}}`, `{{AUTH_SKILL}}`, `{{BACKEND_FRAMEWORK_SKILL}}`, `.agent/skills/rest-api-design/SKILL.md`, `.agent/skills/api-design-principles/SKILL.md`, `.agent/skills/error-handling-patterns/SKILL.md`, `.agent/skills/database-schema-design/SKILL.md`, `.agent/skills/migration-management/SKILL.md`, `.agent/skills/testing-strategist/SKILL.md`, `.agent/skills/logging-best-practices/SKILL.md`] — read each SKILL.md before proceeding.

### Ambiguity resolution

When writing the BE spec, if any requirement cannot be resolved from `vision.md`, `architecture-design.md`, `data-placement-strategy.md`, or upstream IA specs, **do not guess**. Instead, load and follow `.agent/skills/resolve-ambiguity/SKILL.md` to systematically resolve the ambiguity before proceeding.

## 4. Read reference documents

Read the file at `docs/plans/be/index.md` (conventions template) and the file at `docs/plans/index.md` (master index, tech stack).

Also read `docs/plans/data-placement-strategy.md` if it exists — this document specifies which entities live in which store and defines PII boundaries. Every BE spec must place data consistently with this strategy.

## 5. Read the IA source material

This is the most critical step. Read **all** of the following:

### 5a. Primary shard
Read the file at `docs/plans/ia/[NN-shard-name].md` (the full IA shard).

### 5b. Resolve cross-shard references
Scan the primary shard for all cross-references to other shards (look for `See [shard NN](...)`, `defined in [shard NN](...)`, or `Related shards:` headers). For each reference:
1. Read the referenced section (not the entire shard — just the relevant section)
2. Note what content is being borrowed (data model? access rules? edge cases?)
3. Record the reference as: `Source: [shard-file.md] § [section-name] (lines N–M)`

Build a **Referenced Material Inventory**:
```
Primary: 09-playground.md (full shard)
Cross-refs:
  - 02-account-architecture.md § Junior Account Controls (lines 680–706)
  - 03-rbac-policies.md § Permission Taxonomy: playground.* (lines 45–52)
  - 12-resources-settings.md § Credentials Management (lines 93–174)
```

### 5c. Read deep dives
List the files in `docs/plans/ia/deep-dives/`.
Identify which deep dives are referenced by the primary shard. **Read each referenced deep dive in full** — these contain architectural decisions (technology choices, protocol designs, phasing strategies) that the BE spec must implement. Extract and record:
- Key decisions (what was decided and why)
- Architectural constraints (what the BE spec must conform to)
- Data schemas or contracts defined in the deep dive

### 5d. Read the IA shard's testability section
If the shard has a testability/acceptance criteria section, read it — these become the BE spec's performance targets and test requirements.

## 6. Check cross-cutting specs

Read any completed cross-cutting specs — feature specs must follow their patterns. List the files matching `docs/plans/be/00-*.md` (cross-cutting specs).

## 7. Write the spec to `docs/plans/be/[NN-feature-name].md`

**Naming convention**: Use the same number prefix as the IA shard that sources it, followed by a kebab-case feature name. For multi-domain splits from the same shard, append a letter suffix (e.g., `09a-chat-api.md`, `09b-agent-flow-api.md`). For cross-cutting specs, use the `00-` prefix (e.g., `00-api-conventions.md`).

Write the new API specification. Follow the conventions template from `be/index.md`. Every BE spec MUST include:

```markdown
# [Feature] — Backend Specification

> **IA Source**: [link to IA shard]
> **Deep Dives**: [links to consumed deep dives, if any]
> **Status**: Draft | Review | Complete

## IA Source Map

[Which IA shard sections, deep dives, and cross-shard references
inform each part of this BE spec. This is the traceability record
that lets a reviewer verify nothing was missed or invented.]

| BE Spec Section | IA Source | Section/Lines |
|-----------------|----------|---------------|
| API Endpoints | [primary-shard.md] | § User Flows |
| Database Schema | [primary-shard.md] | § Data Model |
| Middleware | [cross-ref-shard.md] | § Access Control (lines N–M) |
| Error Handling | [primary-shard.md] | § Edge Cases |
| [specific subsystem] | [deep-dive.md] | § Key Decisions |

## API Endpoints
## Request/Response Contracts (Zod schemas)
## Database Schema
## Middleware & Policies
## Data Flow
## Error Handling
## Open Questions
```

### Quality gates:
- [ ] Every endpoint has a Zod request AND response schema
- [ ] Every database table has defined fields, indexes, and permissions
- [ ] Security constraints from IA shard reflected in middleware section
- [ ] Error codes are specific (not generic 500s)
- [ ] Rate limits specified per endpoint
- [ ] Access control requirements mapped to middleware checks
- [ ] Every deep dive key decision is reflected in the spec (not ignored)
- [ ] Every cross-shard reference has been resolved (no dangling pointers)
- [ ] IA Source Map is complete — no BE spec section lacks a traceable IA source
- [ ] Testability criteria from IA shard reflected as performance targets

## 8. Update the BE index

Add or update the spec entry in `docs/plans/be/index.md`. For multi-domain splits, add one row per BE spec with the shared IA source.

If a shard was classified as **structural reference** with 0 BE specs, add a row with `—` status and a note explaining why (e.g., "Structural reference — no API surface").

## 9. Update spec pipeline

Read `.agent/skills/session-continuity/protocols/08-spec-pipeline-update.md` and follow the **Spec Pipeline Update Protocol**
to mark this shard's BE column as complete in `.agent/progress/spec-pipeline.md`.

## 10. Cross-reference check

Verify:
- [ ] New spec links back to its IA source shard
- [ ] Related BE specs are cross-referenced (especially for multi-domain splits from the same shard)
- [ ] Cross-shard referenced material is cited with file + section + line numbers
- [ ] IA source shard links forward to the new BE spec

## 11. Ambiguity gate

Read `.agent/skills/session-continuity/protocols/ambiguity-gates.md` and run the **Ambiguity Gates**:

- **Micro**: Walk each endpoint, request/response field, error code, schema constraint,
  and middleware rule. Would an implementer need to guess about any of them? If yes — fix it now.
- **Macro**: Would the FE spec writer need to guess anything from this BE spec?
  If yes — fix it now. The spec is not done until the downstream phase can work
  from it without assumptions.

## 12. Optional: Full ambiguity audit

For a comprehensive scored report across the completed BE layer, run `/audit-ambiguity`.
This is optional but recommended before moving to FE specs.

## 13. Check for new dependencies

If this BE spec introduces a technology not already in the project's tech stack:

1. Scan the spec for any new technology, library, or service not already in the tech stack
2. Identify the stack category (e.g., QUEUE, CACHE, SEARCH, STORAGE)
3. Read `.agent/workflows/bootstrap-agents.md` and fire bootstrap with:
   - `PIPELINE_STAGE=write-be-spec`
   - The specific key-value pair (e.g., `QUEUE=BullMQ`, `CACHE=Redis`)
4. Confirm the matching skill was installed (if one exists in the skill library)

## 14. Request review and propose next steps

You may only notify the user of completion if you have completed the Cross-Reference check and the Ambiguity gate.

Use `notify_user` to present the new BE spec(s) and updated index for review. Your message MUST include:
1. **The spec created** (link to the file)
2. **Cross-reference verification** (confirmation that links are bidirectional)
3. **Ambiguity Gate confirmation** (confirmation that no implementer would need to guess)
4. **The Pipeline State** (propose the next task from the options below)

Read `.agent/progress/spec-pipeline.md` to determine the pipeline state, then propose the appropriate next step:

- **More IA shards need BE specs** → "Next: Run `/write-be-spec` for shard [next-shard-number]"
- **All BE specs complete** → "Next: Run `/audit-ambiguity be` to validate the full BE layer before moving to FE specs"
- **Classification decision needed** → Present the classification question for discussion before proceeding
