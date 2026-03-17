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

For each surface identified in the architecture design, plus a `shared/` surface, create the per-surface subdirectories (e.g., `docs/plans/shared/ia/deep-dives/`, `docs/plans/desktop/fe/`, `docs/plans/web/be/`, etc.). Each new directory must include a `.gitkeep` file and a `README.md`.

Each surface gets its own independent spec pipeline. The `shared/` surface contains cross-surface domain models and API contracts that both surfaces depend on.

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

If any skeleton is missing → create it now. Do not proceed to index creation with missing skeletons.

## 6. Create IA index

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **IA Index** template. Create `docs/plans/ia/index.md` using the template, populating the shards table with all shards created in Step 5.

## 7. Create BE index skeleton

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **BE Index Skeleton** template. Create `docs/plans/be/index.md` using the template.

## 8. Create FE index skeleton

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **FE Index Skeleton** template. Create `docs/plans/fe/index.md` using the template.

## 9. Create master index

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **Master Index** template (single-surface or multi-surface variant as appropriate). Create or update `docs/plans/index.md` using the template.

For multi-surface projects, each surface's own `index.md` contains the standard three-layer table (IA/BE/FE) scoped to that surface, following the same format as the single-surface master index.

### Next step

**STOP** — do NOT proceed to any other workflow. The only valid next step is `/decompose-architecture-validate`.

> If invoked standalone, surface via `notify_user` and wait for user confirmation.
