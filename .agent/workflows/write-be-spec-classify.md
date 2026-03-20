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
  skills: [api-design-principles, database-schema-design, error-handling-patterns, find-skills, logging-best-practices, migration-management, prd-templates, resolve-ambiguity, testing-strategist, workflow-automation]
  calls-bootstrap: false
requires_placeholders: [DATABASE_SKILLS, SECURITY_SKILLS, SURFACES]
---

// turbo-all

# Write BE Spec — Classify & Read Sources

Identify the target IA shard, classify it, load skills, and read all source material including cross-references and deep dives.

**Prerequisite**: IA shard must be complete (status ✅ in `docs/plans/ia/index.md`). If not → **STOP**: run `/write-architecture-spec` first.

---

## 1. Verify IA layer is complete, then identify the target shard

1. Read `docs/plans/ia/index.md`
2. Check every shard's status column
3. If any shard is not ✅ → **STOP**: list incomplete shards and redirect to `/write-architecture-spec`

Determine which IA shard to process. Read it in full before proceeding.

## 2. Classify the shard

Read `.agent/skills/prd-templates/references/be-spec-classification.md` — follow the classification types, multi-domain split heuristic, and detection criteria.

Present the classification to the user before proceeding. Include: classification type + reasoning, expected BE spec count, split boundaries (if multi-domain), Referenced Material Inventory.

**STOP** — do NOT proceed until the user explicitly confirms the classification.

## 2.5. Verify surface stack map is populated

Read the surface stack map from `.agent/instructions/tech-stack.md`. Determine this shard's surface from its directory path.

Required map cells: Languages, Databases, BE Frameworks, ORMs, Unit Tests (all per-surface), Auth (cross-cutting).

If any required cells are empty → **STOP**: run `/create-prd` first.

## 3. Load skill bundle

Read `.agent/skills/prd-templates/references/skill-loading-protocol.md` and follow the Skill Loading Protocol for `write-be-spec-classify`.

Also read bundled skills: `api-design-principles`, `error-handling-patterns`, `database-schema-design`, `migration-management`, `testing-strategist`, `logging-best-practices`.

**Conditional**: If IA shard includes async/background/queue processing → also read `workflow-automation`.

When any requirement is unresolvable → load and follow `.agent/skills/resolve-ambiguity/SKILL.md`.

## 4. Read reference documents

Read `docs/plans/be/index.md` (conventions), `docs/plans/index.md` (master index), and `docs/plans/data-placement-strategy.md` (entity placement + PII boundaries).

## 5. Read the IA source material

### 5a. Primary shard
Read `docs/plans/ia/[NN-shard-name].md` in full.

### 5b. Resolve cross-shard references
Scan for cross-references. For each: read the referenced section, note borrowed content, record as: `Source: [file] § [section] (lines N–M)`.

Build a **Referenced Material Inventory**.

### 5c. Read deep dives
List `docs/plans/ia/deep-dives/`. Read each referenced deep dive in full. Extract key decisions, architectural constraints, data schemas.

**Deep dive completeness check**: For each deep dive file referenced by the IA shard:
- If the file contains `<!-- TODO -->`, `[TBD]`, or sections with only headers and no content → **STOP**: "Deep dive `[filename]` is still a skeleton. Run `/write-architecture-spec-design` Step 7.5 to fill it before proceeding with BE spec writing."
- If the file does not exist → **STOP**: "Deep dive `[filename]` is referenced but missing. Create it via `/write-architecture-spec-design` Step 7.5."

### 5d. Read testability section
If the shard has testability/acceptance criteria → read for performance targets and test requirements.

## 6. Check cross-cutting specs

Read any completed cross-cutting specs at `docs/plans/be/00-*.md`.

## 6.5. Completion Gate (MANDATORY)

1. Scan this conversation for memory-capture triggers (see rule: `memory-capture`):
   - Patterns observed → write to `memory/patterns.md`
   - Non-trivial decisions made → write to `memory/decisions.md`
   - Blockers hit → write to `memory/blockers.md`
2. If no triggers found → confirm: "No new patterns, decisions, or blockers to log"

> **This step is not skippable.** Do not call `notify_user` until all items above are complete.

## 7. Present classification and request approval

Use `notify_user` presenting: classification, expected spec count, Referenced Material Inventory, split boundaries (if applicable).

**STOP** — do NOT proceed until the user confirms.

After approval: read `.agent/skills/prd-templates/references/be-spec-template.md` → create spec file stub at `docs/plans/be/[NN-feature-name].md`.

For structural reference (0 BE specs): confirm no write shard needed, propose next IA shard.

> ❌ **NEXT STEP RESTRICTION**: Do NOT begin writing the BE spec (`/write-be-spec-write`) until the user has explicitly approved the classification and material inventory. If deep dive completeness issues were flagged in Step 5c, they must be resolved before proceeding.
