---
description: Constraint-first discovery and tech stack decisions for the create-prd workflow
parent: create-prd
shard: stack
standalone: true
position: 1
pipeline:
  position: 2.1
  stage: architecture
  predecessors: [ideate]
  successors: [create-prd-architecture]
  skills: [brainstorming, resolve-ambiguity, tech-stack-catalog, design-direction]
  calls-bootstrap: true
---

// turbo-all

# Create PRD — Stack Decisions

Build the decision constraints map from vision.md, then walk through each tech stack axis with the user.

**Prerequisite**: `docs/plans/vision.md` must exist. If it does not, tell the user to run `/ideate` first.

---

## 2.5. Constraint-first discovery

Before any tech stack decision, read `vision.md` constraints and surface classification to build the **decision constraints map**:

1. **Hard constraints** — decisions already locked by compliance, team, or budget
2. **Surface constraints** — the project surfaces constrain framework choices
3. **Soft constraints** — preferences that should bias decisions but aren't hard rules

Present the constraints map to the user before starting tech decisions. Constraints narrow the option space — some decisions may be obvious. Skip those with a brief rationale.

Read `.agent/skills/tech-stack-catalog/references/constraint-questions.md` for the per-axis constraint questions to ask before presenting options.

## 3. Tech stack decisions

Read the **Project Surfaces** section from `vision.md` to determine which decision axes apply.

Read `.agent/skills/tech-stack-catalog/references/surface-decision-tables.md` and present only the tables for applicable surfaces. For each axis, use the option presentation format from `.agent/skills/tech-stack-catalog/SKILL.md`.
Read .agent/skills/tech-stack-catalog/SKILL.md and follow its per-axis constraint-first selection methodology.

> ⚠️ **Skip the `Database` axis** from the surface decision tables during this generic per-axis loop. All persistence decisions (primary, vector, graph, cache, time-series) are handled exclusively by the **Database: Persistence Map Interview** section below. Do not present a single DATABASE option here — this avoids duplicate/conflicting bootstrap calls.

Score Fit from 1–5 based on how well the option matches the constraints map. If constraints eliminate all but 1-2 options, present only those with a note explaining why others were eliminated.

**Per-axis flow**:
1. Ask the constraint questions for this axis
2. Filter options based on answers
3. Present the filtered option table with recommendation
4. Wait for user confirmation
5. Fire bootstrap with only that key: read `.agent/workflows/bootstrap-agents.md` and call with `PIPELINE_STAGE=create-prd` + the confirmed key
6. Move to next axis

Get explicit user decisions — no "TBD" allowed. Use the brainstorming skill's approach — one decision at a time.

### Database: Persistence Map Interview

Instead of a single DATABASE decision pass, use the following structured persistence map interview to identify all required stores.

Read .agent/skills/database-schema-design/SKILL.md and follow its Persistence Map Interview methodology (Sub-steps A–E). Fire bootstrap per the skill's instructions for each confirmed store.

### Design Direction

Read `.agent/skills/design-direction/SKILL.md` and follow its interview methodology to determine the project's visual direction. After confirmation, fire bootstrap with `DESIGN_DIRECTION=[confirmed direction]`.

### Development tooling

Read `.agent/skills/tech-stack-catalog/references/dev-tooling-decisions.md` for the tooling axes and bootstrap keys. After the user confirms all development tooling, fire bootstrap immediately with all keys listed in that reference file.

### After each tech decision

Read each installed skill's SKILL.md before proceeding. Append the confirmed decision to `docs/plans/architecture-draft.md`.

### Fill kit templates (progressive bootstrap)

Read `.agent/workflows/bootstrap-agents.md` and call it with `PIPELINE_STAGE=create-prd` plus only the keys just decided. Bootstrap runs after **each confirmed decision**, not in a batch at the end. At the end of all tech decisions, call bootstrap once more with `ARCHITECTURE_DOC` set to the dated filename.

### Propose next step

All tech stack decisions are locked. Next: Run `/create-prd-architecture` to design the system architecture and data strategy.

> If invoked standalone, surface via `notify_user`.
