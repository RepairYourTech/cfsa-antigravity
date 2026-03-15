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

**Prerequisite**: Read the approved domain boundaries from `docs/plans/ia/decomposition-plan.md`. If this file does not exist, the boundaries have not been approved — tell the user to run `/decompose-architecture` Steps 3-4.5 first.

---

## 5. Create directory structure and shard skeletons

> **Note**: The standard directories (`docs/plans/ia/deep-dives/`, `docs/plans/be/`, `docs/plans/fe/`, `docs/plans/phases/`, `docs/audits/`) are pre-scaffolded. No directory creation needed for single-surface projects.

### Multi-surface projects

For each surface identified in the architecture design, plus a `shared/` surface, create the per-surface subdirectories (e.g., `docs/plans/shared/ia/deep-dives/`, `docs/plans/desktop/fe/`, `docs/plans/web/be/`, etc.). Each new directory must include a `.gitkeep` file and a `README.md`.

Each surface gets its own independent spec pipeline. The `shared/` surface contains cross-surface domain models and API contracts that both surfaces depend on.

### Mandatory: 00-infrastructure shard (all project types)

This shard is **always** created for every project, regardless of what the architecture design says. It must be numbered `00` and created before any feature shards.

The `00-infrastructure` skeleton must contain these five items:

1. CI/CD pipeline setup (using the confirmed CI/CD skill from bootstrap)
   Read .agent/skills/{{CI_CD_SKILL}}/SKILL.md and follow its pipeline configuration conventions.
2. Environment configuration (`.env.example`, environment variable documentation)
3. Deployment pipeline (using the confirmed hosting skill)
   Read .agent/skills/{{HOSTING_SKILL}}/SKILL.md and follow its deployment conventions.
4. Project scaffolding (directory structure, base configuration files)
5. Database initialization (schema creation, migration tooling setup)

> _"This shard must be the first slice in Phase 1 — it is the foundation everything else builds on."_

### Shard skeletons (all project types)

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **Shard Skeleton** template. For each shard, create a skeleton file at `docs/plans/ia/[NN-domain-name].md` using the template.

Read .agent/skills/prd-templates/SKILL.md and follow its Shard Seeding Procedure for Level-1 sub-feature extraction from the relevant domain files in `docs/plans/ideation/domains/` into shard ## Features sections.

Fallback for domains not covered in the ideation domain files is defined in the skill's Shard Seeding Procedure.

## 6. Create IA index

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **IA Index** template. Create `docs/plans/ia/index.md` using the template, populating the shards table with all shards created in Step 5.

## 7. Create BE index skeleton

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **BE Index Skeleton** template. Create `docs/plans/be/index.md` using the template.

## 8. Create FE index skeleton

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **FE Index Skeleton** template. Create `docs/plans/fe/index.md` using the template.

## 9. Create master index

Read `.agent/skills/prd-templates/references/decomposition-templates.md` for the **Master Index** template (single-surface or multi-surface variant as appropriate). Create or update `docs/plans/index.md` using the template.

For multi-surface projects, each surface's own `index.md` contains the standard three-layer table (IA/BE/FE) scoped to that surface, following the same format as the single-surface master index.

### Propose next step

Directory structure, shard skeletons, and all layer indexes are created. Next: Run `/decompose-architecture-validate` to identify deep dive candidates, annotate shard types, validate the dependency graph, and generate the spec pipeline tracker.

> If this shard was invoked standalone (not from `/decompose-architecture`), surface this via `notify_user`.
