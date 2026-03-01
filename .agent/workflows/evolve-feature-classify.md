---
description: Capture the new feature/requirement, classify the change type, identify the entry point document, write new content, and determine cascade scope
parent: evolve-feature
shard: classify
standalone: true
position: 1
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [] # callable standalone
  successors: [evolve-feature-cascade]
  skills: [technical-writer, brainstorming]
  calls-bootstrap: false
---

# Evolve Feature — Classify

Capture the user's new feature, requirement, or constraint. Classify it, identify the correct entry point document, write the new content at proper spec depth, and determine which downstream layers need updating.

> **Prerequisite**: At least `docs/plans/vision.md` must exist. If the pipeline hasn't started, run `/ideate` first — there's nothing to evolve yet.

---

## 1. Capture the new thing

Ask the user to describe what they want to add. Accept free-form input or `@file`.

If the user provides an `@file` reference, read the file and extract the key additions. If free-form, engage briefly to ensure the addition is clear — but this is NOT a full `/ideate` interview. The goal is to understand what's being added, not to explore the entire problem space.

---

## 2. Classify the change

Present the classification menu:

```
What type of change is this?

[1] New feature — an entirely new capability that doesn't exist in the current specs
[2] New requirement on an existing feature — additional constraint, behavior, or acceptance criteria for something already specified
[3] New technical constraint — a non-functional requirement that affects architecture (performance, compliance, infrastructure)
[4] Scope correction — something was misunderstood or underspecified in existing specs and needs to be fixed
```

**Do not proceed until the user selects.**

---

## 3. Identify the entry point document

Based on the classification, determine where the new content enters the pipeline:

| Classification | Entry Point Document | Rationale |
|---------------|---------------------|-----------|
| **[1] New feature** | `docs/plans/vision.md` | New features start at the vision layer — they affect everything downstream |
| **[2] New requirement** | The IA shard that owns the affected domain | Requirements on existing features enter at the domain interaction level |
| **[3] New technical constraint** | `docs/plans/[dated]-architecture-design.md` | Technical constraints affect the architecture and everything below it |
| **[4] Scope correction** | Ask the user which document contains the misunderstanding | Corrections enter wherever the original misunderstanding lives |

For classification [2], identify which IA shard owns the affected domain by reading `docs/plans/ia/index.md` and matching the feature to a domain.

---

## 4. Write new content at the entry point

This is a real spec-writing step — not a placeholder. Write the new content at the appropriate depth for the entry point layer:

**If entry point is vision layer** (`docs/plans/vision.md`):
- Feature description (what it does, why it matters)
- Affected personas (who uses this)
- Success criteria (how we know it works)
- Constraints (what limits apply)

**If entry point is architecture layer** (`architecture-design.md`):
- Technical constraint description
- Affected components (which parts of the system this touches)
- Non-functional requirements (performance, scalability, compliance)
- Integration points (how this relates to existing architecture decisions)

**If entry point is IA layer** (specific IA shard):
- Domain interactions (new user flows or modifications to existing flows)
- Contracts (new or modified API contracts)
- Data models (new entities, fields, or relationships)
- Access control (RBAC implications)

Present the written content to the user.

**STOP — do not proceed until the user approves the new content.**

---

## 5. Determine cascade scope

Based on the entry point, determine which downstream layers have existing content that needs updating:

| Entry Point | Cascade Layers (in order) |
|-------------|---------------------------|
| Vision | Architecture → IA → BE → FE → Phase plan |
| Architecture | IA → BE → FE → Phase plan |
| IA shard | BE spec for that shard → FE spec for that shard → Phase plan |
| BE spec | FE → Phase plan |
| Scope correction | Depends on the document — all layers below the corrected document |

**Important**: When the entry point is an IA shard, the downstream cascade remains scoped to the affected domain shard's corresponding BE and FE specs. Do not cascade into unrelated domain shards unless the user explicitly broadens scope.

For each downstream layer, check whether content exists (using the same file checks as `/remediate-pipeline-assess` Step 1). Only layers with existing content need updating — layers that haven't been started yet will naturally incorporate the new content when they are written.

Report: "These layers have existing content that will need updating: [list]."

If no downstream layers have content, report: "No downstream layers have existing content — the new content will be incorporated when those layers are written. Evolution complete."
