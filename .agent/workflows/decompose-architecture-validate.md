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

**Prerequisite**: Directory structure, shard skeletons, and layer indexes must exist (from `/decompose-architecture-structure` or equivalent). The IA index at `docs/plans/ia/index.md` and shard files must be in place.

---

## 9.5. Proactive shard load pre-check (ideation signal)

Before identifying deep dives, read the ideation domain files that fed each shard. The sub-area count from ideation is a **leading indicator** of shard complexity.

For each shard skeleton:
1. Read the corresponding ideation domain file (use the path from `ideation-index.md` Domain Documents table — may be in `domains/` or `surfaces/{name}/`)
2. Count the sub-areas listed in the domain file's `## Sub-Areas` or breadth map section
3. Compare against the shard load thresholds:

| Ideation Sub-Areas | Pre-Check Action |
|---|---|
| ≤6 | ✅ No concern — proceed to skeleton validation |
| 7–9 | ⚠️ **Pre-flag for split review** — note in the shard skeleton: `> ⚠️ Ideation source has [N] sub-areas — likely split candidate. Review at calibration gate.` |
| ≥10 | 🚩 **Proactive split proposal** — present a split proposal to the user NOW, before the calibration gate. Use the same split format as Step 12. If the user approves, create the split shards immediately and update the decomposition plan. |

> **Why proactive?** The reactive calibration gate (Step 12) catches overloaded shards, but only after skeletons are fully seeded. By reading ideation sub-area counts first, we avoid creating a massive skeleton only to immediately split it. For multi-product projects where a single surface domain (e.g., "Operations" in a desktop shop app) might have 15+ sub-areas, this saves significant rework.

## 10. Identify deep dive candidates

Read .agent/skills/architecture-mapping/SKILL.md and follow its methodology.

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

Read .agent/skills/architecture-mapping/SKILL.md and follow its methodology for dependency graph validation.

- **Must Have coverage gate**: Read `docs/plans/ideation/ideation-index.md` and extract every feature listed under "Must Have" in the MoSCoW Summary. For each Must Have feature, verify it appears in at least one shard's Features section. If any Must Have feature is not covered by any shard → **STOP**: "The following Must Have features from ideation-index.md are not covered by any shard: [list]. Add them to the appropriate shards before proceeding."

- **Shard load calibration gate**: After the Must Have coverage gate passes, count the sub-features in each shard's `## Features` section using the **bullet/named-item rule**: count every bullet point or named item under `## Features`, **excluding** group headers (lines that introduce a group of sub-features but are not themselves a concrete capability). If Step 9.5 pre-flagged any shards, they should be reviewed first. Compare against the following thresholds:

  | Sub-feature Count | Action |
  |-------------------|--------|
  | **≤6** | ✅ OK — proceed |
  | **7–9** | ⚠️ Flag for user review — present the sub-feature list and ask: "This shard has [N] sub-features. Keep as-is, or split?" |
  | **≥10** | 🛑 **Hard stop** — do NOT proceed. Present a mandatory split proposal and **wait for the user to approve the split** before continuing. No shard may exit this gate with ≥10 sub-features. |

  > **What counts as a sub-feature**: Count each bullet or named item under `## Features`. Group headers (e.g., "Content Management:") that introduce a cluster of sub-features are **not** counted — only the items beneath them. If a bullet contains sub-bullets, count each sub-bullet independently. When in doubt, ask: "Would a product manager list this as a separate line item in a release note?"

  **Split proposal format:**
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
  ```

  **After any split**: Update `docs/plans/ia/decomposition-plan.md` with the revised domain boundary table and re-run the Must Have coverage gate to confirm no features were lost in the split.

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

The decomposition must be approved before filling in shards with `/write-architecture-spec`. Do NOT proceed to the next step until the user sends a message explicitly approving this output. Proposing next steps is not the same as receiving approval. Wait for explicit approval before continuing.

**Proposed next step**: Once approved, run `/write-architecture-spec` starting with the lowest-numbered skeleton shard. Read `.agent/progress/spec-pipeline.md` to identify which shard to start with.
