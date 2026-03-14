---
description: Classify IA shard, load skills, and read all source material for the write-be-spec workflow
parent: write-be-spec
shard: classify
standalone: true
position: 1
pipeline:
  position: 5a.1
  stage: specification
  predecessors: [write-architecture-spec]
  successors: [write-be-spec-write]
  skills: [resolve-ambiguity, database-schema-design]
  calls-bootstrap: false
requires_placeholders: [LANGUAGE_SKILL, DATABASE_SKILLS, AUTH_SKILL, BACKEND_FRAMEWORK_SKILL, ORM_SKILL, UNIT_TESTING_SKILL]
---

// turbo-all

# Write BE Spec — Classify & Read Sources

Identify the target IA shard, classify it, load skills, and read all source material including cross-references and deep dives.

**Prerequisite**: IA shard must be complete (status ✅ in `docs/plans/ia/index.md`). If not, tell the user to run `/write-architecture-spec` first.

---

## 1. Verify IA layer is complete, then identify the target shard

Before identifying the target shard, verify the entire IA layer is ready:

1. Read `docs/plans/ia/index.md`
2. Check every shard's status column
3. **Hard stop** if any shard is not ✅:

> ❌ **Cannot write BE spec — IA layer is incomplete.**
> The following shards are not yet complete:
> - [shard-name]: [status]
>
> Run `/write-architecture-spec` for each incomplete shard before proceeding to `/write-be-spec`.

**Why**: BE specs resolve cross-shard IA references. If referenced shards are still skeletons, the BE spec will contain gaps or guesses that cascade into FE specs and implementation. The cost of waiting for IA completion is hours; the cost of writing BE specs against incomplete IA is days of rework.

---

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

**Multi-domain split heuristic — sub-feature endpoint inventory:**

Before classifying a shard as multi-domain, build a **sub-feature endpoint inventory**:

| Sub-feature | Expected endpoints | Data model(s) | Independent? |
|-------------|-------------------|---------------|-------------|
| [sub-feature] | `POST /api/...`, `GET /api/...` | [table/collection names] | [Yes/No] |
| [sub-feature] | `PUT /api/...`, `DELETE /api/...` | [table/collection names] | [Yes/No] |

**Split criterion**: Two or more independent groups each have their own data model and could be assigned to a different developer without coordination → split into separate BE specs. Section header count alone is **NOT** the criterion — independence of data models and API surfaces is.

**Present the classification to the user before proceeding.** Include:
- The classification and reasoning
- How many BE specs will be produced
- For multi-domain: the proposed split boundaries
- For structural reference: confirmation that no BE spec is needed

## 2.5. Verify tech stack skills are provisioned

Before loading the skill bundle, scan the skill bundle list in Step 3 for any values still containing literal `{{` characters.

If `{{LANGUAGE_SKILL}}`, `{{DATABASE_SKILLS}}`, `{{AUTH_SKILL}}`, `{{BACKEND_FRAMEWORK_SKILL}}`, `{{ORM_SKILL}}`, or `{{UNIT_TESTING_SKILL}}` are still unfilled → **stop** and tell the user: *"Tech stack skills haven't been provisioned yet. The skill bundle placeholders are still unfilled. Run `/create-prd` first to make tech stack decisions and trigger bootstrap provisioning, then return to `/write-be-spec`."*

Only proceed to Step 3 when all skill bundle placeholders are filled with actual skill directory names.

## 3. Load skill bundle

Read .agent/skills/{{LANGUAGE_SKILL}}/SKILL.md and follow its language conventions.
Read each skill listed in `{{DATABASE_SKILLS}}` (comma-separated). For each skill directory name, read `.agent/skills/[skill]/SKILL.md` before proceeding.
Read .agent/skills/{{AUTH_SKILL}}/SKILL.md
Read .agent/skills/{{BACKEND_FRAMEWORK_SKILL}}/SKILL.md
Read .agent/skills/rest-api-design/SKILL.md
Read .agent/skills/api-design-principles/SKILL.md
Read .agent/skills/error-handling-patterns/SKILL.md
Read .agent/skills/database-schema-design/SKILL.md
Read .agent/skills/migration-management/SKILL.md
Read .agent/skills/{{ORM_SKILL}}/SKILL.md and follow its migration and schema conventions.
Read .agent/skills/{{UNIT_TESTING_SKILL}}/SKILL.md and follow its test writing conventions.
Read .agent/skills/testing-strategist/SKILL.md
Read .agent/skills/logging-best-practices/SKILL.md

**Missing skill fallback**: If any skill in the bundle above is not installed in `.agent/skills/` and is not in `.agent/skill-library/MANIFEST.md`, read `.agent/skills/find-skills/SKILL.md` and follow its discovery methodology to search for a community equivalent before proceeding without it.

### Ambiguity resolution

When writing the BE spec, if any requirement cannot be resolved from `ideation-index.md`, `architecture-design.md`, `data-placement-strategy.md`, or upstream IA specs, **do not guess**. Instead, load and follow `.agent/skills/resolve-ambiguity/SKILL.md` to systematically resolve the ambiguity before proceeding.

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

## 7. Present classification and request approval

Include the expected endpoint inventory in the classification presentation. The user must verify split boundaries align with the actual API surface before approving.

Call `notify_user` presenting:
- The classification type and reasoning (from Step 2)
- The number of BE specs to be produced
- The Referenced Material Inventory (from Step 5)
- For multi-domain splits: the proposed split boundaries

> **Do NOT proceed to `/write-be-spec-write` until the user confirms the classification is correct. For multi-domain splits, the user must confirm the split boundaries.**

Once approved, run `/write-be-spec-write`.

> **Seed the spec file**: After classification is approved, read `.agent/skills/prd-templates/references/be-spec-template.md` for the **BE Spec Seed Stub** template. Create the spec file at `docs/plans/be/[NN-feature-name].md` using the stub, filling in the classification details and Referenced Material Inventory from above.

For structural reference classification (0 BE specs): confirm no write shard is needed and propose moving to the next IA shard instead.

