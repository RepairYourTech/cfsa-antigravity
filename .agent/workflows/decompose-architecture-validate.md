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
  skills: [session-continuity]
  calls-bootstrap: false
---

// turbo-all

# Decompose Architecture — Validate

Identify deep dive candidates, annotate shard document types, validate the dependency graph, generate the spec pipeline tracker, and request review.

**Prerequisite**: Directory structure, shard skeletons, and layer indexes must exist (from `/decompose-architecture-structure` or equivalent). The IA index at `docs/plans/ia/index.md` and shard files must be in place.

---

## 10. Identify deep dive candidates

For each shard marked "Needs Deep Dive" in the domain boundary table:

1. Create an empty deep dive skeleton at `docs/plans/ia/deep-dives/[feature-name].md`
   - **Naming convention**: Use kebab-case derived from the feature name (e.g., `chat-orchestration.md`, `age-verification-flow.md`, `order-state-machine.md`)
2. Add a reference to it in the parent shard's "Deep Dives Needed" section
3. Add it to the IA index deep dives column

## 11. Annotate expected shard types

Based on domain boundary analysis, add a **preliminary** `Document Type`
annotation to each shard skeleton. `/write-architecture-spec` confirms or reclassifies.

| Classification | Expected BE Specs |
|---------------|-------------------|
| **Feature domain** | 1 |
| **Multi-domain** | N (split along sub-feature boundaries) |
| **Cross-cutting** | 1 (`00-*`) |
| **Structural reference** | 0 |

```markdown
> **Document Type** (preliminary): Feature domain | Multi-domain | Cross-cutting | Structural reference
```

> **Note**: Classification is based on domain analysis, not shard content (which doesn't
> exist yet). `/write-be-spec` uses the confirmed type to determine spec count.

## 12. Dependency graph validation

Verify the decomposition (structural checks only — content doesn't exist yet):

- [ ] Every "Must Have" feature from `vision.md` appears in at least one shard
- [ ] No circular dependencies between shards
- [ ] Cross-cutting shards (00-*) don't depend on feature shards
- [ ] Every shard has a preliminary Document Type annotation
- [ ] Deep dive candidates are referenced from their parent shards
- [ ] BE/FE indexes exist with conventions templates (mapping tables will be populated later)
- [ ] For multi-surface: shared surface shards have lower numbers than surface-specific shards that depend on them
- [ ] For multi-surface: each surface has its own index.md with IA/BE/FE layer table
- [ ] For multi-surface: cross-surface dependencies point to shared/ shards, not directly to another surface's shards

## 13. Generate spec pipeline tracker

Read `.agent/skills/session-continuity/protocols/07-spec-pipeline-generation.md` and follow the **Spec Pipeline Generation Protocol**
to create `.agent/progress/spec-pipeline.md` tracking IA/BE/FE completion per shard.

## 14. Request review and propose next steps

Use `notify_user` to present:
- The full `docs/plans/ia/` directory (shard skeletons + index)
- `docs/plans/be/index.md`
- `docs/plans/fe/index.md`
- `docs/plans/index.md`
- `.agent/progress/spec-pipeline.md`

The decomposition must be approved before filling in shards with `/write-architecture-spec`.

**Proposed next step**: Once approved, run `/write-architecture-spec` starting with the lowest-numbered skeleton shard. Read `.agent/progress/spec-pipeline.md` to identify which shard to start with.
