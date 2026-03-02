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

#### Sub-step A — Feature-to-query table

Walk through every major feature listed in `vision.md`. For each feature, ask: "What does this feature need to *find*, *store*, *relate*, and *rank/search*?" Build a table before naming any technology:

| Feature | Find | Store | Relate | Rank/Search |
|---------|------|-------|--------|-------------|
| (from vision.md) | … | … | … | … |

Present the completed table to the user and confirm before proceeding.

#### Sub-step B — Registry-first skill search

Before presenting any store options, read `.agent/skills/find-skills/SKILL.md` and, for each query type that appeared in the table above, run `npx skills find [query type or store name]` via the find-skills skill. If the registry returns a skill for a store type, install it from the registry first. The bundled skill library is a fallback only.

#### Sub-step C — Store selection per query type (constraint-first)

Present store options **only** for query types that appeared in the table. If no feature had a "Rank/Search" requirement, skip `DATABASE_VECTOR` entirely. If no feature had a "Relate" requirement, skip `DATABASE_GRAPH` entirely. Use the per-axis flow from step 3 (constraint questions → filter → present → confirm).

#### Sub-step D — Bootstrap per confirmed store

For each confirmed store, fire bootstrap with its specific sub-key (e.g., `DATABASE_PRIMARY=PostgreSQL`, `DATABASE_VECTOR=Qdrant`). One bootstrap call per sub-key, following the same pattern as all other stack axes. Each confirmation appends to `{{DATABASE_SKILLS}}`.

#### Sub-step E — Write persistence map to `architecture-draft.md`

After all stores are confirmed, write the output to `docs/plans/architecture-draft.md` as a locked section titled `## Persistence Map`. The section must include the feature-to-query table and a mapping of each query type to its canonical store with rationale.

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
