---
description: Deep dive identification, shard type annotation, dependency validation, and review for the decompose-architecture workflow
parent: decompose-architecture
shard: validate
standalone: true
position: 2
pipeline:
  position: 3.2
  stage: architecture
  predecessors: [decompose-architecture-structure]
  successors: [write-architecture-spec]
  skills: [architecture-mapping, session-continuity]
  calls-bootstrap: false
---

// turbo-all

# Decompose Architecture — Validate

Identify deep dive candidates, annotate shard document types, validate the dependency graph, generate the spec pipeline tracker, and request review.

**Prerequisite**: Directory structure, shard skeletons, and layer indexes must exist (from `/decompose-architecture-structure`).

---

## 9.5. Proactive shard load pre-check (ideation signal)

Read `.agent/skills/prd-templates/references/shard-boundary-analysis.md` → **Shard Load Thresholds** table.

For each shard skeleton:
1. Read the corresponding ideation domain folder via `ideation-index.md` Structure Map
2. Count child feature files and sub-domain folders in the domain index
3. Compare against the load thresholds table and take the specified action

## 10. Identify deep dive candidates

Read `.agent/skills/architecture-mapping/SKILL.md` and follow its methodology.

For each shard marked "Needs Deep Dive" in the domain boundary table:
1. Create empty deep dive skeleton at `docs/plans/ia/deep-dives/[feature-name].md`
2. Add reference in parent shard's "Deep Dives Needed" section
3. Add to IA index deep dives column

## 11. Annotate expected shard types

Read `.agent/skills/prd-templates/references/shard-boundary-analysis.md` → **Shard Document Type Classification** table. Add preliminary Document Type annotation to each shard skeleton.

## 12. Dependency graph validation

Read `.agent/skills/architecture-mapping/SKILL.md` and follow its dependency graph validation methodology.

Read `.agent/skills/prd-templates/references/shard-boundary-analysis.md` → **Sub-feature Count Thresholds** and **Split Proposal Format**.

- **Must Have coverage gate**: Read `ideation-index.md` MoSCoW Summary. Every Must Have feature must appear in at least one shard. If any missing → **STOP**.

- **Shard load calibration gate**: Count sub-features in each shard using the bullet/named-item rule (defined in the analysis reference). If Step 9.5 pre-flagged shards, review first. Apply the thresholds. For ≥10, use the split proposal format from the reference.

  **After any split**: Update `docs/plans/ia/decomposition-plan.md` and re-run Must Have coverage gate.

  **Split loop guard**: Track how many times the same shard has been split.
  - **1st split** → normal. Apply the split.
  - **2nd split on the same shard** → warn: "Shard `[name]` has been split twice. This may indicate the domain boundary is wrong. Present to user: re-split, or merge back and redraw the domain boundary?"
  - If the total number of shards exceeds 20 → warn: "Shard count is [N]. Projects with 20+ shards are unusually large. Verify this is correct with the user."

Verify structural integrity:
- [ ] No circular dependencies between shards
- [ ] Cross-cutting shards (00-*) don't depend on feature shards
- [ ] Every shard has a preliminary Document Type annotation
- [ ] Deep dive candidates are referenced from parent shards
- [ ] BE/FE indexes exist with conventions templates
- [ ] Multi-surface: shared shards have lower numbers; cross-surface deps point to shared/

## 13. Generate spec pipeline tracker

Read `.agent/skills/session-continuity/protocols/07-spec-pipeline-generation.md` and follow the Spec Pipeline Generation Protocol.

## 14. Request review and propose next steps

Use `notify_user` to present: IA directory, BE index, FE index, master index, spec pipeline tracker.

**STOP** — do NOT proceed until the user explicitly approves.

### Next step

**STOP** — do NOT proceed to any other workflow. The only valid next step is `/write-architecture-spec` starting with the lowest-numbered shard per `.agent/progress/spec-pipeline.md`.
