---
name: architecture-mapping
description: Analyzes codebase structure, data flow, module relationships, and key patterns to generate and maintain a living architecture document (ARCHITECTURE.md).
---

# Architecture Mapping Skill

You are an expert software architect acting as a cartographer for the codebase. Your job is to analyze the current state of a repository and produce a "living map" of its architecture.

## Core Responsibilities

When invoked, you must:

1.  **Analyze structural layout at a granular level:** Identify exactly where specific functionality lives, listing out key files (e.g., `src/api/worker.ts`, specific domain schemas, core components). **Do not just list directories; list the critical files within them**.
2.  **Trace data flow explicitly:** Determine how information moves through the system down to the exact environment bindings, database connections (e.g., SurrealDB KV bindings, Worker `Env` interfaces), and request interceptors.
3.  **Map relationships & contracts:** Detail the actual contract/validation schemas and API routes present in the codebase. If an API worker exists, document its exposed routes, rate limiting, and exact CORS configurations.
4.  **Extract key patterns:** Identify the architectural decisions and conventions in use, providing exact file references where these patterns are implemented (e.g., CFPA, React Islands).
5.  **Generate/Update Document:** Write these highly granular findings into a structured `docs/ARCHITECTURE.md` file. Avoid generic boilerplate; if the project only has 3 files, document precisely what those 3 files do.

## Execution Strategy

Follow these strictly granular steps to perform an architecture mapping:

### Step 1: Deep Codebase Reconnaissance
- **Do not just list directories.** Use your file exploration tools (`list_dir`, `view_file_outline`, `grep_search`) to survey the repository, but immediately follow up by reading the *contents* of key files (`view_file`).
- Identify exact entry points (`src/api/worker.ts`, `src/pages/index.astro`), configuration files (`astro.config.mjs`, `wrangler.toml`), and trace their imports.
- Locate exact schemas (contract library schemas, type interfaces, or data models) defining the data models.

### Step 2: Component & Contract Analysis
- Group files logically, but identify the specific files governing these components.
- For each component, trace its exact validation schemas, API routes, or component props.
- Document exact environment variables and secrets expected by the code.

### Step 3: Granular Dependency Tracing
- Trace exactly how components interact (e.g., "The `login` Astro page fetches data directly from SurrealDB using the `surrealdb.js` client in `src/lib/db.ts`").
- Explicitly catalog external integrations down to the binding name (e.g., "KVNamespace RATE_LIMITS").

### Step 4: Pattern Extraction
- Read the implementation details of representative files to prove use of architectural patterns.
- If the project uses CFPA, locate the schema, the test, and the implementation file as proof.

## 5. Document Generation
Create or update `docs/ARCHITECTURE.md` using the following structure:

```markdown
# [Project Name] - Living Architecture Map

**Last Updated:** [Current Date]
**Purpose:** Deep, granular code context, environmental bindings, and exact architectural tracing.

---

## 1. Codebase Topography & Critical Files

### Directory Tree
(You MUST include a full, comprehensive file/folder tree of the `src/` directory and any other relevant project directories. Do not summarize this; show the actual files.)
```text
/
├── src/
│   ├── api/
│   │   └── worker.ts
│   └── ...
```

### Critical Files
(Identify exactly where specific functionality lives, listing out key files defined in the tree above. Do not just list directories; explain what the critical files within them do.)

## 2. Infrastructure & Explicit Data Flow
(Determine how information moves through the system down to the exact environment bindings, database connections, and request interceptors.)

## 3. Module Relationships & Contracts
(Detail the actual contract/validation schemas and API routes present. Document exposed routes, rate limiting, and exact CORS configurations.)

## 4. Key Patterns & Implementation Evidence
(Identify architectural decisions, providing exact file references where these patterns are implemented.)
```

## Best Practices

*   **Granularity is Mandatory:** Do not describe the system abstractly. Use exact file paths, exact schema names, and exact environment binding names.
*   **Trace the Code:** Never guess architectural boundaries. Use `grep_search` and `view_file` to trace imports and confirm how modules interact before documenting them.
*   **Be Explicit:** Avoid boilerplate. If an API has 3 endpoints, list the 3 endpoints and their exact validation schemas.
*   **Living Document:** If updating an *existing* `ARCHITECTURE.md`, do not simply append. Integrate new, granular findings holistically into the existing structure. Update the "Last Updated" date.

## Domain Boundary Protocol

### Purpose

Run this protocol before proposing domain boundaries. Uses a domain inventory record to evaluate every candidate domain.

### Domain Inventory Record Format

For each candidate domain, build a record in the following format:

```
Domain: [name]
Architecture description: [one-line summary from architecture design]
Ideation sub-features:
  1. [Actor] can [goal] → primary data: [entity/table]
  2. [Actor] can [goal] → primary data: [entity/table]
  ...
Split trigger: [none | review | mandatory-split]
```

Read the relevant ideation domain folders (use `ideation-index.md` Structure Map for correct paths — folders may be under `domains/` or `surfaces/{name}/`). For each domain, read the `*-index.md` for the children table, then each child feature file for sub-feature details. Use the architecture design as secondary context to build each record.

### Split Trigger Rules

Apply all three rules to every domain:

1. **Child-count proxy** — If the ideation domain folder contains ≥6 direct child feature files (or the fractal tree has depth ≥3 levels below this domain), flag as `mandatory-split`.

2. **3-table rule** — If the domain's sub-features touch ≥3 independent database tables with no shared queries, flag as `mandatory-split`.

3. **No-shared-query test** — If two sub-feature groups within a domain could each be assigned to a different developer without coordination (no shared API endpoints, no shared data mutations), flag as `review`.

### Domain Boundary Table Template

| # | Domain | Features Included | Sub-feature Count | Complexity | Split Candidate? | Needs Deep Dive? |
|---|--------|-------------------|-------------------|------------|-----------------|------------------|
| 00 | Cross-cutting | Auth, API conventions, error handling | — | Medium | — | No |
| 01 | [Domain] | [Features] | [N] | [Low/Med/High] | [Yes/No — reason] | [Yes/No] |

### User Approval Protocol

Present split candidates to the user before finalising the domain boundary table. For each candidate show:

- Domain name
- Sub-feature list
- Proposed split boundary
- Rationale

User must approve or reject each split before the table is locked.

### Shard Numbering Convention

- `00-*` for cross-cutting concerns (may be multiple)
- `01-*` through `NN-*` for feature domains ordered by dependency (dependencies first)

## Sub-Feature Reconciliation Protocol

### Purpose

Run this protocol when beginning any architecture spec shard. The ideation domain's feature files (within the fractal tree) are the primary source of truth for sub-features — the architecture design is secondary context.

### Sources to Read

1. The relevant ideation domain folder for this shard (path from `ideation-index.md` Structure Map) — read the `*-index.md` then each child feature file
2. The shard's `## Features` section
3. `docs/plans/ideation/ideation-index.md` Must Have features for this domain

### Reconciliation Table

| Sub-feature | Ideation domain tree | Shard ## Features | Must Have? | Decision |
|-------------|-------------|-------------------|------------|----------|
| [name] | ✅ Listed | ✅ Listed | Yes/No | Keep |
| [name] | ✅ Listed | ❌ Missing | Yes | **Add to shard immediately** |
| [name] | ✅ Listed | ❌ Missing | No | Add to shard — ideation is authoritative |
| [name] | ❌ Not listed | ✅ Listed | — | `[Architecture-only — not in ideation]` — keep but audit |

### Mismatch Handling Rules

1. If a sub-feature appears in the ideation domain tree but not in the shard's `## Features` → **add it to the shard's `## Features` section immediately** before proceeding. Do not wait for user confirmation to add ideation-sourced sub-features.

2. If a sub-feature appears in the shard's `## Features` but not in the ideation domain tree → **keep it** but mark it with `[Architecture-only — not in ideation]` as an audit trail. These items need explicit user confirmation.

### Scope Confirmation Presentation Format

Present the reconciled scope to the user in the following format:

> **Reconciled features for [Shard NN — Domain Name]:**
>
> [bullet list of all sub-features, with `[Architecture-only]` markers where applicable]
>
> **[N] sub-features added from ideation** that were missing from the shard skeleton.
> **[M] sub-features marked `[Architecture-only]`** — not found in ideation domain tree, added during decomposition.
>
> "Does this feature list match your intent for this domain? Any sub-features to add, remove, or re-scope?"

Wait for explicit user confirmation before proceeding. If the user modifies the list, update the shard file immediately.

## Sub-Feature Complexity Split Protocol

### Purpose

Run this protocol after reconciliation when the confirmed sub-feature count is **≥ 10**. This threshold indicates the shard is too complex for a single spec pass and must be split before writing proceeds.

### Counting Rule

Count every bullet or named item under the confirmed feature list, excluding group headers. Use the same counting rule as `/decompose-architecture-validate` Step 12.

### Split Proposal Format

Present to the user:

```
Shard [NN] — [domain name] has [N] sub-features (threshold: ≥10 → mandatory split)

Current sub-features:
  1. [sub-feature]
  2. [sub-feature]
  ...

Proposed split:
  [NN]a — [new domain name] → file: docs/plans/ia/[NN]a-[domain].md
    Sub-features: 1, 3, 5
  [NN]b — [new domain name] → file: docs/plans/ia/[NN]b-[domain].md
    Sub-features: 2, 4, 6

Split rationale: [why these groups are independent]

Does this split make sense, or would you prefer a different boundary?
```

### Approval Gate

**Wait for explicit user approval of the split before proceeding.** Do NOT continue spec writing with an oversized shard.

If the user approves: stop the current workflow and run `/decompose-architecture-validate` to formally register the new shards (it will re-run the Must Have coverage gate and update the decomposition plan). Then run `/remediate-shard-split` to update all downstream cross-references — do NOT restart spec work until zero stale parent references remain. Then restart the spec workflow for each new shard individually.
