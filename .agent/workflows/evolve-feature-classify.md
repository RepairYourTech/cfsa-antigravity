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
  skills: [brainstorming, session-continuity, technical-writer]
  calls-bootstrap: false
---

# Evolve Feature — Classify

Capture the user's new feature, requirement, or constraint. Classify it, identify the correct entry point document, write the new content at proper spec depth, and determine which downstream layers need updating.

> **Prerequisite**: `docs/plans/ideation/ideation-index.md` must exist. If not → **STOP**: run `/ideate` first.

---

## 1. Capture the new thing

Ask the user to describe what they want to add. Accept free-form input or `@file`.

If `@file` → read and extract key additions. If free-form → brief clarifying questions only (NOT a full `/ideate` interview).

---

## 2. Classify the change

Read `.agent/skills/brainstorming/SKILL.md` and follow its methodology.

Present the classification menu:

```
What type of change is this?

[1] New feature — entirely new capability
[2] New requirement on existing feature — additional constraint/behavior/criteria
[3] New technical constraint — non-functional requirement affecting architecture
[4] Scope correction — misunderstanding or underspecification that needs fixing
```

**STOP** — do not proceed until the user selects.

---

## 3. Identify the entry point document

| Classification | Entry Point Document |
|---------------|---------------------|
| **[1] New feature** | `docs/plans/ideation/ideation-index.md` + fractal tree placement (Step 4) |
| **[2] New requirement** | The IA shard that owns the affected domain (read `docs/plans/ia/index.md` to find it) |
| **[3] New technical constraint** | `docs/plans/[dated]-architecture-design.md` |
| **[4] Scope correction** | Ask the user which document contains the misunderstanding |

---

## 4. Write new content at the entry point

Read `.agent/skills/technical-writer/SKILL.md` for clarity standards.

Read `.agent/skills/prd-templates/references/evolution-layer-guidance.md` → **Entry Point Writing Depth** section for the entry point layer. Follow its writing checklist for the identified layer.

**Inline ambiguity check**: Before presenting to user, apply Micro Ambiguity Check from `.agent/skills/session-continuity/SKILL.md` — walk each element, fix any gaps where an implementer would need to guess.

Present the written content to the user.

**STOP** — do not proceed until the user approves.

---

## 5. Determine cascade scope

| Entry Point | Cascade Layers (in order) |
|-------------|---------------------------|
| Vision | Architecture → IA → BE → FE → Phase plan |
| Architecture | IA → BE → FE → Phase plan |
| IA shard | BE spec → FE spec → Phase plan |
| BE spec | FE → Phase plan |
| Scope correction | All layers below the corrected document |

Check each downstream layer for existing content. Only layers with existing content need updating.

Report: "These layers have existing content that will need updating: [list]."

If no downstream layers have content: "No downstream layers have existing content — incorporated when written. Evolution complete."
