---
description: Directory structure, shard skeletons, and layer index creation for the decompose-architecture workflow
parent: decompose-architecture
shard: structure
standalone: true
position: 1
pipeline:
  position: 3.1
  stage: architecture
  predecessors: [create-prd]
  successors: [decompose-architecture-validate]
  skills: [prd-templates]
  calls-bootstrap: false
---

// turbo-all

# Decompose Architecture — Structure

Create directory structure, shard skeleton files, and all layer indexes.

**Prerequisite**: Read the approved domain boundaries from `docs/plans/ia/decomposition-plan.md`.

- If this file does not exist → **STOP**: "Decomposition plan missing. Run `/decompose-architecture` Steps 3-4.5 first."
- If the file exists but contains no `## Domain Boundary Table` → **STOP**: "Decomposition plan is incomplete — no domain boundary table found. Run `/decompose-architecture` Step 3 to generate domain boundaries."

---

## 5. Create directory structure and shard skeletons

> **Note**: The standard directories (`docs/plans/ia/deep-dives/`, `docs/plans/be/`, `docs/plans/fe/`, `docs/plans/phases/`, `docs/audits/`) are pre-scaffolded. No directory creation needed for single-surface projects.

### Multi-surface projects

IA shards are **shared across all surfaces** — they live in the flat `docs/plans/ia/` directory regardless of project type. IA describes domains, not surfaces.

For each surface identified in the architecture design, plus a `shared/` surface, create per-surface BE and FE subdirectories only (e.g., `docs/plans/shared/be/`, `docs/plans/web/be/`, `docs/plans/web/fe/`, `docs/plans/mobile/fe/`, etc.). Each new directory must include a `.gitkeep` file and a `README.md`.

Per-surface BE/FE directories hold surface-specific backend and frontend specs. The `shared/` surface contains cross-surface contracts that multiple surfaces depend on.

### Mandatory: 00-infrastructure shard (all project types)

This shard is **always** created for every project, regardless of what the architecture design says. It must be numbered `00` and created before any feature shards.

The `00-infrastructure` skeleton must contain these five items:

1. CI/CD pipeline setup — load the CI/CD skill(s) from the cross-cutting section per the skill loading protocol (`.agent/skills/prd-templates/references/skill-loading-protocol.md`)
2. Environment configuration (`.env.example`, environment variable documentation)
3. Deployment pipeline — load the Hosting skill(s) from the cross-cutting section per the skill loading protocol
4. Project scaffolding (directory structure, base configuration files)
5. Database initialization (schema creation, migration tooling setup)

> _"This shard must be the first slice in Phase 1 — it is the foundation everything else builds on."_

### Shard skeletons (all project types)

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **Shard Skeleton** template. For each shard, create a skeleton file at `docs/plans/ia/[NN-domain-name].md` using the template.

Read `.agent/skills/prd-templates/SKILL.md` and follow its Shard Seeding Procedure for Level-1 sub-feature extraction. The procedure reads `ideation-index.md` to find the correct domain path — the ideation folder uses a fractal structure where each domain is a folder (with `{slug}-index.md`, `{slug}-cx.md`, and child features/sub-domains) rather than a flat file. For multi-product projects, domains may be in `surfaces/{name}/` (surface-exclusive or hub-owned) or `shared/` (peer mode).

Fallback for domains not covered in the ideation domain folders is defined in the skill's Shard Seeding Procedure.

**Post-creation verification**: After all skeletons are created, list the `docs/plans/ia/` directory. Verify:
- Every shard in the decomposition plan has a corresponding `.md` file
- `00-infrastructure.md` exists regardless of domain decomposition
- No empty files (0 bytes)
- **Total shard count** is within acceptable range — read `.agent/skills/prd-templates/references/shard-boundary-analysis.md` → "Total Count Thresholds" and apply the ≤20/21-25/>25 gate

If any skeleton is missing → create it now. Do not proceed to index creation with missing skeletons.

### Domain coverage check

Read `docs/plans/ideation/ideation-index.md` → Domain Map. For each domain marked as having **Must Have** features:
- Verify at least one shard skeleton references this domain
- If a domain has no corresponding shard → **STOP**: "Ideation domain `[name]` with Must Have features has no IA shard. Add it to the decomposition plan or explain why it's excluded."

## 6. Create IA index

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **IA Index** template. Create `docs/plans/ia/index.md` using the template, populating the shards table with all shards created in Step 5.

## 7. Create BE index skeleton

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **BE Index Skeleton** template. Create `docs/plans/be/index.md` using the template.

## 8. Create FE index skeleton

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **FE Index Skeleton** template. Create `docs/plans/fe/index.md` using the template.

## 9. Create master index

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **Master Index** template (single-surface or multi-surface variant as appropriate). Create or update `docs/plans/index.md` using the template.

For multi-surface projects, each surface's own `index.md` contains BE/FE tables scoped to that surface. IA shards are referenced from the shared `ia/index.md` — filtered by Surface Applicability.

## 9.5. Completion Gate (MANDATORY)

1. Scan this conversation for memory-capture triggers (see rule: `memory-capture`):
   - Patterns observed → write to `memory/patterns.md`
   - Non-trivial decisions made → write to `memory/decisions.md`
   - Blockers hit → write to `memory/blockers.md`
2. If no triggers found → confirm: "No new patterns, decisions, or blockers to log"

> **This step is not skippable.** Do not call `notify_user` until all items above are complete.

### Next step

**STOP** — do NOT proceed to any other workflow. The only valid next step is `/decompose-architecture-validate`.

> If invoked standalone, surface via `notify_user` and wait for user confirmation.
