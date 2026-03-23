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

## 2.4. Checkpoint resumption

Read `.agent/skills/prd-templates/references/workflow-checkpoint-protocol.md`. Check if `docs/plans/prd-working/workflow-state.md` exists. If it exists and `active_shard` matches this file → follow the resumption procedure in the protocol (re-read this workflow, skip completed items, resume from `next_action`). If it does not exist → initialize a fresh checkpoint for this shard.

---

## 2.5. Constraint-first discovery

Before any tech stack decision, read `docs/plans/ideation/meta/constraints.md` to build the **decision constraints map**.

- **If `meta/constraints.md` does not exist** → **STOP**: "Constraints file missing. Run `/ideate` to completion — constraint exploration is required before tech stack decisions."
- **If it exists but has no `## Project Surfaces` section** → **STOP**: "Constraints file is missing Project Surfaces. Run `/ideate-validate` to complete constraint exploration."

Also read `docs/plans/ideation/ideation-index.md` — specifically `## Structural Classification` (authoritative surface list and project shape) and `## Engagement Tier` (gate behavior for this session).

Read the engagement tier protocol (`.agent/skills/prd-templates/references/engagement-tier-protocol.md`) — apply the tier behavior for tech stack decisions.

Build the constraints map:

1. **Hard constraints** — decisions already locked by compliance, team, or budget
2. **Surface constraints** — the project surfaces (from structural classification) constrain framework choices. For multi-product projects, some axes may need separate decisions per surface.
3. **Soft constraints** — preferences that should bias decisions but aren't hard rules

Present the constraints map to the user before starting tech decisions *(Interactive/Hybrid)* or auto-confirm with Deep Think reasoning *(Auto)*. Constraints narrow the option space — some decisions may be obvious. Skip those with a brief rationale.

Read `.agent/skills/tech-stack-catalog/references/constraint-questions.md` for the per-axis constraint questions to ask before presenting options.

## 2.7. Build Ideation Relevance Index

> **This step is mandatory.** Reading `ideation-index.md` + `constraints.md` gives feature names, not feature architecture. Tech stack decisions require understanding *what the features actually do*. A MoSCoW summary line is **never** sufficient context for a tech stack decision.

Create directory `docs/plans/prd-working/` if it does not exist.

Build an **Ideation Relevance Index** — a lookup table mapping each decision axis to the specific ideation files that inform it. This index is consulted PER-AXIS to guarantee no axis skips its relevant source material.

**Write the completed index to `docs/plans/prd-working/ideation-relevance-index.md`.**

### How to build the index

1. Read the `## Structure Map` in `ideation-index.md` — identify all domain folders and their statuses (`[DEEP]`, `[EXHAUSTED]`, etc.)
2. For each **Must Have domain**: read `{domain}/{domain}-index.md` — extract: Children table (sub-features, depth), key entity types, technology-relevant patterns (AI, real-time, search, graph, offline)
3. For domains with deep dives (`[DEEP]` or `[EXHAUSTED]`): read EVERY deep dive file — extract architectural detail (multi-agent patterns, graph engines, sync protocols, embedded databases, complex query patterns)
4. Read CX files (`ideation-cx.md` + domain-level CX files) — extract: cross-domain data dependencies, trigger chains, shared entity ownership, trust boundaries

### Index structure

For each applicable tech decision axis, record a row:

| Axis | Relevant Domain Files | Key Findings (summary) |
|------|----------------------|------------------------|
| {axis} | [every file read for this axis] | [1-line summary per file] |

> ❌ **STOP gate**: If any axis has **zero** relevant domain files listed, you have not read deeply enough. Go back and read the domain indexes and deep dives — every axis is informed by at least one domain.

This index is your working checklist. Before each axis, consult it and read the listed files if you haven't already. Context evaporates between axes — **re-read** when needed.

## 3. Tech stack decisions

Read the **Project Surfaces** section from `docs/plans/ideation/meta/constraints.md` to determine which decision axes apply.

Read `.agent/skills/tech-stack-catalog/references/surface-decision-tables.md` and present only the tables for applicable surfaces. For each axis, use the option presentation format from `.agent/skills/tech-stack-catalog/SKILL.md`.
Read .agent/skills/tech-stack-catalog/SKILL.md and follow its per-axis constraint-first selection methodology.

> ⚠️ **Skip the `Database` axis** from the surface decision tables during this generic per-axis loop. All persistence decisions are handled exclusively by the **Database: Persistence Map Interview** section below.

Score Fit from 1–5 based on how well the option matches the constraints map. If constraints eliminate all but 1-2 options, present only those with a note explaining why others were eliminated.

**Per-axis flow**:
1. **Consult Ideation Relevance Index**: Look up this axis in the index built in Step 2.7. Read EVERY file listed for this axis — not optional, not "skim", not "check if relevant". Read them.
2. **Read constraint questions**: Read `.agent/skills/tech-stack-catalog/references/constraint-questions.md` for this axis. Answer all **Tier 1 (self-answer from ideation)** questions using what you just read. These are questions YOU answer — do not ask the user.
3. **Write Ideation Synthesis**: Before talking to the user, write a 3-5 bullet synthesis of project-specific findings relevant to this axis. Each bullet must cite a specific file (e.g., "From `diagnostics/diagnostics-deep-dive.md`: multi-agent orchestration with persistent task queues requires..."). **Append this synthesis as a `## {Axis Name}` section to `docs/plans/prd-working/stack-synthesis.md`.**
4. **Cite-or-Stop Gate**: Your Ideation Synthesis must contain **≥ 2 project-specific findings with file citations**. If you cannot produce 2 citations → you have not read deeply enough → **STOP** and re-read the deep dives and CX files listed in the index. Generic findings like "the app needs a database" do not count.
5. **Synthesis verification gate (HARD)**: Read `docs/plans/prd-working/workflow-state.md` and verify `synthesis_written: true` for this axis. If `false` → **STOP** — you skipped step 3. Write synthesis first.
6. **Ask Tier 2 questions**: Present your Ideation Synthesis alongside the **Tier 2 (user-facing)** constraint questions from `constraint-questions.md` for this axis.
7. **Filter and present options**: Combine ideation synthesis + user answers to filter options. Present the filtered option table with recommendation. Every strength/risk must reference a concrete project requirement — no generic "good ecosystem" or "scalable" without tying it to an ideation finding.
8. Follow the decision confirmation protocol (`.agent/skills/prd-templates/references/decision-confirmation-protocol.md`) — tier-aware.
9. Fire bootstrap with only that key: read `.agent/workflows/bootstrap-agents.md` and call with `PIPELINE_STAGE=create-prd` + the confirmed key. **HARD GATE**: Follow the bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`). If bootstrap verification fails: 1st failure → retry once. 2nd failure → **STOP**: ask user "Retry, skip, or abort?"
10. **Update checkpoint**: Write current progress to `docs/plans/prd-working/workflow-state.md` — mark this axis complete, set next axis, reset `synthesis_written: false`, populate `pending_reads` from the Ideation Relevance Index for the next axis. Move to next axis.

> **Backend bootstrap keys**: `BACKEND_FRAMEWORK` and `API_LAYER` are distinct keys — fire each separately. Database axis (Persistence Map Interview) is also independent.

Get explicit user decisions *(Interactive/Hybrid)* or auto-select with Deep Think reasoning *(Auto)* — no "TBD" allowed. One decision at a time.

**User indecision**: Uncertain → present recommendation with reasoning. Still uncertain → apply `.agent/skills/resolve-ambiguity/SKILL.md`. Still undecided → lock as "[Agent-recommended, user deferred]" (revisitable via `/propagate-decision`).

> **Decision recording**: For each confirmed decision, follow `.agent/skills/session-continuity/protocols/06-decision-analysis.md` — record to `memory/decisions.md` with upstream/downstream effects.

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
