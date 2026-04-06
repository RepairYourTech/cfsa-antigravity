# BE Spec Classification Guide

Use when classifying an IA shard during `/write-be-spec-classify` Step 2.

## Classification Types

| Classification | Description | BE Spec Output | Detection Criteria |
|---------------|-------------|----------------|-------------------|
| **Feature domain** | Defines user interactions, data models, and API-facing behavior for a single cohesive domain | 1 BE spec | Has data model + user flows + access model that imply API endpoints |
| **Multi-domain** | Covers multiple distinct backend sub-systems with independent APIs | N BE specs (split along sub-feature boundaries) | Section headers map to independent API surfaces; data models don't overlap; could be developed by different teams |
| **Cross-cutting** | Defines shared patterns consumed by all feature specs (auth, API conventions, error handling) | 1 cross-cutting BE spec (`00-*`) | Content is about "how all endpoints work" not "what this feature does" |
| **Structural reference** | Maps structure, naming, or routing without defining API behavior | 0 BE specs | No data model, no user flows, no endpoints — just reference tables |
| **Composite** | Contains both a structural reference section AND feature behavior | Depends — feature portion may belong in another shard's BE spec | Look for cross-references pointing feature content to its owning domain |

## Multi-Domain Split Heuristic

Before classifying as multi-domain, build a **sub-feature endpoint inventory**:

| Sub-feature | Expected endpoints | Data model(s) | Independent? |
|-------------|-------------------|---------------|-------------|
| [sub-feature] | `POST /api/...`, `GET /api/...` | [table/collection names] | [Yes/No] |

**Split criterion**: Two or more independent groups each have their own data model and could be assigned to a different developer without coordination → split. Section header count alone is NOT the criterion — independence of data models and API surfaces is.

## Endpoint Completeness Reconciliation Table

Use during `/write-be-spec-write` Step 7 before writing spec sections:

| Sub-feature | Expected endpoints | Specced? | Notes |
|-------------|-------------------|----------|-------|
| [sub-feature] | `POST /api/...` | ✅ | — |
| [sub-feature] | `GET /api/...` | ❌ | [Deferred to Phase N — reason] |

**Rule**: For every unspecced expected endpoint, either add it to the spec or add an explicit `[Deferred to Phase N — reason]` note. An empty Notes column for an unspecced endpoint is a spec failure.

## Naming Convention

- Same number prefix as the IA shard source
- Kebab-case feature name
- Multi-domain splits: append letter suffix (e.g., `09a-chat-api.md`, `09b-agent-flow-api.md`)
- Cross-cutting specs: `00-` prefix (e.g., `00-api-conventions.md`)
