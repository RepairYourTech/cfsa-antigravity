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
  successors: [create-prd-design-system]
  skills: [database-schema-design, design-direction, session-continuity, tech-stack-catalog]
  calls-bootstrap: true
---

// turbo-all

# Create PRD — Stack Decisions

Build the decision constraints map from the ideation output, then walk through each tech stack axis with the user.

**Prerequisite**: `docs/plans/ideation/ideation-index.md` must exist. If it does not, tell the user to run `/ideate` first.

---

## 2.5. Constraint-first discovery

Before any tech stack decision, read `docs/plans/ideation/meta/constraints.md` to build the **decision constraints map**.

- **If `meta/constraints.md` does not exist** → **STOP**: "Constraints file missing. Run `/ideate` to completion — constraint exploration is required before tech stack decisions."
- **If it exists but has no `## Project Surfaces` section** → **STOP**: "Constraints file is missing Project Surfaces. Run `/ideate-validate` to complete constraint exploration."

Also read `docs/plans/ideation/ideation-index.md` — specifically `## Structural Classification` (authoritative surface list and project shape) and `## Engagement Tier` (gate behavior for this session).

Read the engagement tier protocol (`.agent/skills/prd-templates/references/engagement-tier-protocol.md`) — apply the tier behavior for tech stack decisions.

Build the constraints map:

1. **Hard constraints** — decisions already locked by compliance, team, or budget
2. **Surface constraints** — the project surfaces (from structural classification) constrain framework choices. For multi-product projects, some axes may need separate decisions per surface (e.g., different frontend frameworks for web vs desktop vs mobile).
3. **Soft constraints** — preferences that should bias decisions but aren't hard rules

Present the constraints map to the user before starting tech decisions *(Interactive/Hybrid)* or auto-confirm with Deep Think reasoning *(Auto)*. Constraints narrow the option space — some decisions may be obvious. Skip those with a brief rationale.

Read `.agent/skills/tech-stack-catalog/references/constraint-questions.md` for the per-axis constraint questions to ask before presenting options.

## 2.7. Domain context loading for tech decisions

> **This step is mandatory.** Reading `ideation-index.md` + `constraints.md` gives feature names, not feature architecture. Tech stack decisions require understanding *what the features actually do*.

Before starting tech decisions, load domain context:

1. Read the `## Structure Map` in `ideation-index.md` — identify all domain folders
2. For each **Must Have domain**: read `{domain}/{domain}-index.md` to extract the Children table (sub-features, depth, complexity)
3. For domains with **deep dives** (status `[DEEP]` or `[EXHAUSTED]`): read the deep dive files. These contain the architectural detail (multi-agent patterns, graph engines, sync protocols, embedded databases) that determines which tech stack is appropriate
4. Read CX files (`ideation-cx.md` + domain CX files) — extract cross-domain dependencies that affect framework choices (e.g., shared AI orchestration across surfaces)

**Per-axis context rule**: Before presenting tech options for any axis, identify which domain deep dives are relevant to that axis and confirm you have read them. Example: before an AI/ML framework decision, you must have read every domain file that describes AI-powered features — not just the MoSCoW bullet saying "AI diagnostics."

> ❌ If a tech axis involves features with deep dives that you haven't read → **STOP** and read them before presenting options. A MoSCoW summary line is never sufficient context for a tech stack decision.

## 3. Tech stack decisions

Read the **Project Surfaces** section from `docs/plans/ideation/meta/constraints.md` to determine which decision axes apply.

Read `.agent/skills/tech-stack-catalog/references/surface-decision-tables.md` and present only the tables for applicable surfaces. For each axis, use the option presentation format from `.agent/skills/tech-stack-catalog/SKILL.md`.
Read .agent/skills/tech-stack-catalog/SKILL.md and follow its per-axis constraint-first selection methodology.

> ⚠️ **Skip the `Database` axis** from the surface decision tables during this generic per-axis loop. All persistence decisions (primary, vector, graph, cache, time-series) are handled exclusively by the **Database: Persistence Map Interview** section below. Do not present a single DATABASE option here — this avoids duplicate/conflicting bootstrap calls.

Score Fit from 1–5 based on how well the option matches the constraints map. If constraints eliminate all but 1-2 options, present only those with a note explaining why others were eliminated.

**Per-axis flow**:
1. Ask the constraint questions for this axis
2. Filter options based on answers
3. Present the filtered option table with recommendation
4. Follow the decision confirmation protocol (`.agent/skills/prd-templates/references/decision-confirmation-protocol.md`) — tier-aware.
5. Fire bootstrap with only that key: read `.agent/workflows/bootstrap-agents.md` and call with `PIPELINE_STAGE=create-prd` + the confirmed key. **HARD GATE**: Follow the bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`). If bootstrap verification fails:
   - **1st failure** → retry bootstrap once with the same key
   - **2nd failure** → **STOP**: tell the user which key failed verification and ask: "Retry, skip this skill provisioning, or abort?"
6. Move to next axis

> **Note on backend axis bootstrap keys**: `BACKEND_FRAMEWORK` and `API_LAYER` are distinct bootstrap keys and must each fire as a separate `/bootstrap-agents` call — do not combine them.
> - `BACKEND_FRAMEWORK` (e.g., `Hono`, `FastAPI`, `NestJS`) → provisions the backend framework skill
> - `API_LAYER` (e.g., `tRPC`, `GraphQL`) → provisions the API layer skill
>
> These are independent MANIFEST entries. Firing bootstrap with `BACKEND_FRAMEWORK=Hono` does **not** provision the tRPC skill — `API_LAYER=tRPC` must be fired separately. Similarly, skipping the `Database` axis (handled by the Persistence Map Interview) does not affect backend framework or API layer keys — those must still fire individually.

Get explicit user decisions *(Interactive/Hybrid)* or auto-select with Deep Think reasoning *(Auto)* — no "TBD" allowed. Use the brainstorming skill's approach — one decision at a time.

**User indecision handling**: If the user expresses uncertainty ("I don't know", "not sure", "you pick") on any decision:
- Present your recommendation with clear reasoning
- If user accepts → proceed with it
- If user remains uncertain → read `.agent/skills/resolve-ambiguity/SKILL.md` and apply its methodology to narrow the decision space
- If after ambiguity resolution the user still can't decide → lock your recommendation with a note: "[Agent-recommended, user deferred]" — this can be revisited later via `/propagate-decision`

> **Decision recording**: For each confirmed tech stack decision, read `.agent/skills/session-continuity/protocols/06-decision-analysis.md` and follow the **Decision Effect Analysis Protocol**. Tech stack choices have high downstream impact (they constrain frameworks, skills, deployment, and testing). Record each decision to `memory/decisions.md` with upstream/downstream effects.

### Database: Persistence Map Interview

Instead of a single DATABASE decision pass, use the following structured persistence map interview to identify all required stores.

Read .agent/skills/database-schema-design/SKILL.md and follow its Persistence Map Interview methodology (Sub-steps A–E). Fire bootstrap per the skill's instructions for each confirmed store. **HARD GATE**: Follow the bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`) after each store is confirmed.

### Design Direction

Read `.agent/skills/design-direction/SKILL.md` and follow its interview methodology to determine the project's visual direction. After confirmation, fire bootstrap with `DESIGN_DIRECTION=[confirmed direction]`. **HARD GATE**: Follow the bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`).

### Development tooling

Read `.agent/skills/tech-stack-catalog/references/dev-tooling-decisions.md` for the tooling axes and bootstrap keys. After the user confirms all development tooling, fire bootstrap immediately with all keys listed in that reference file. **HARD GATE**: Follow the bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`) — verify every key.

### After each tech decision

Read each installed skill's SKILL.md before proceeding. Append the confirmed decision to `docs/plans/architecture-draft.md`.

### Fill kit templates (progressive bootstrap)

Read `.agent/workflows/bootstrap-agents.md` and call it with `PIPELINE_STAGE=create-prd` plus only the keys just decided. Bootstrap runs after **each confirmed decision**, not in a batch at the end. At the end of all tech decisions, call bootstrap once more with `ARCHITECTURE_DOC` set to the dated filename.

## Completion Gate (MANDATORY)

Before reporting completion or proceeding to next shard:

1. **Memory check** — Apply rule `memory-capture`. Write any patterns, decisions, or blockers from this shard to `.agent/progress/memory/`. Tech stack decisions are high-impact — every confirmed decision should have a `DEC-NNN` entry. If nothing to write, confirm: "No new patterns/decisions/blockers."
2. **Progress update** — Update `.agent/progress/` tracking files if they exist.
3. **Session log** — Write session entry to `.agent/progress/sessions/`.

---

### Next step

**STOP** — do NOT proceed to any other workflow. The only valid next step is `/create-prd-architecture`.

> If invoked standalone, surface via `notify_user` and wait for user confirmation.
