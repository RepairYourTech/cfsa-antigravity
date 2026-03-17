---
description: Cascade new content through downstream layers, assess implementation impact, run consistency check, and write evolution record
parent: evolve-feature
shard: cascade
standalone: true
position: 2
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [evolve-feature-classify]
  successors: []
  skills: [prd-templates, resolve-ambiguity, technical-writer]
  calls-bootstrap: true
---

# Evolve Feature — Cascade

Cascade the new content from the entry point through all downstream layers with existing content, assess implementation impact, run a consistency check, and write the evolution record.

> **Prerequisite**: Entry point document must contain the new content (from `/evolve-feature-classify` Step 4). Cascade scope must be determined (Step 5 output).

**Locked decision conflict check**: Before cascading, scan the new content against locked decisions in upstream layers:
1. Read the architecture design document (`docs/plans/*-architecture-design.md`) for locked constraints
2. Compare each element of the new feature against: tech stack decisions, data placement strategy, security model, performance budgets
3. **If conflict detected** → **STOP**: "New feature '[name]' conflicts with locked decision: [decision]. Options: (1) Modify the feature to work within the constraint, (2) Use `/propagate-decision` to change the locked decision first, then re-run `/evolve-feature`."
4. **If no conflicts** → proceed to Step 1.

---

## 1. Cascade through each downstream layer

Read `.agent/skills/technical-writer/SKILL.md` for writing standards.

Read `.agent/skills/prd-templates/references/evolution-layer-guidance.md` → **Cascade Layer Guidance** table.

For each downstream layer with existing content (in order: architecture → IA → BE → FE → phase plan):

1. Read existing documents in the layer
2. Determine what the new feature means for this layer — consult the guidance table for what to add
3. Write the additions at the same depth and quality as existing content
4. Present additions to user

**STOP at each layer** — do not cascade to next until user approves.

> After writing to any spec document, append a `## Changelog` row: date, `'Evolution: [description]'`, workflow, updated sections. If no `## Changelog` exists, add one from the template in `.agent/skills/prd-templates/references/be-spec-template.md`.

---

## 2. Assess implementation impact

If `docs/plans/phases/` exists and contains phase plans:

1. Check in-progress slices for affected acceptance criteria
2. Check completed slices that may need revisiting (flag regression risk)
3. Determine if new slices are needed
4. Determine if phase plan update is required

Read `.agent/skills/prd-templates/references/evolution-layer-guidance.md` → **Impact Assessment Format** and use it to present.

If no phase plans exist: "No phase plans yet — impact assessed during `/plan-phase`."

---

## 3. Run consistency check

Read `.agent/skills/resolve-ambiguity/SKILL.md` and follow its methodology.

For every document that received additions:
1. Re-read full document — verify additions integrate correctly
2. Check for internal contradictions
3. Check cross-references between changed documents
4. Check against locked decisions

Report issues. **Do not auto-fix** — present to user.

---

## 4. Write evolution record

Write `docs/audits/evolve-feature-[name]-[date].md` recording: feature name, change type, entry point, new content summary, layers updated, per-layer additions, implementation impact, consistency check results, timestamp.

---

## 4.5. Bootstrap gate — new dependency check

Scan updated documents for technologies without corresponding skill directories.

For each missing skill: read `.agent/workflows/bootstrap-agents.md` and invoke. **HARD GATE**: follow bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`).

---

## 5. Propose next steps

Read `.agent/skills/prd-templates/references/evolution-layer-guidance.md` → **Completion Summary Format** and present.

❗ **Mandatory next step**: Run `/audit-ambiguity` on affected layers before any implementation work. List the layers updated during Step 1.
