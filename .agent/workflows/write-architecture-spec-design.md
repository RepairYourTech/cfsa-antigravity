---
description: Explore requirements, map interactions, and design contracts/data models/access control for the write-architecture-spec workflow
parent: write-architecture-spec
shard: design
standalone: true
position: 1
pipeline:
  position: 4.1
  stage: specification
  predecessors: [decompose-architecture]
  successors: [write-architecture-spec-deepen]
  skills: [accessibility, adversarial-review, architecture-mapping, brainstorming, database-schema-design, error-handling-patterns, find-skills, prd-templates, resolve-ambiguity, security-scanning-security-hardening, spec-writing, technical-writer]
  calls-bootstrap: false
requires_placeholders: [DATABASE_SKILLS, SECURITY_SKILLS, SURFACES]
---

// turbo-all

# Write Architecture Spec — Design

Explore requirements, map all interactions, and define contracts, data models, access control, event schemas, and edge cases.

**Prerequisite**: Skeleton IA shard must exist in `docs/plans/ia/`. If it does not, tell the user to run `/decompose-architecture` first.

## 0. Pipeline State Check

1. Read `.agent/progress/spec-pipeline.md`.
   - If the file does not exist → **STOP**: "No pipeline tracker found. Run `/decompose-architecture` first."
2. Identify all shards where the IA column = `not-started`.
   - If none → **STOP**: "All IA shards are already complete. Next step: `/write-be-spec`."
3. Auto-select the lowest-numbered `not-started` shard.
4. Present: "Pipeline tracker shows **shard [NN — name]** is the next incomplete IA shard. Proceeding with this shard. Say 'override' to pick a different one."
5. Use the selected shard as the target for all subsequent steps.

---

## 0.1. Map guard

Read the surface stack map from `.agent/instructions/tech-stack.md`. Verify that the following have filled values:
- **Databases** column (per-surface, any row)
- **Security** category (cross-cutting)
- **Global Settings → Surfaces** list

If any are empty → **HARD STOP**: tell the user to run `/create-prd` first.

---

## 0.6. Re-run check

Before loading skills, check whether the shard file at `docs/plans/ia/[shard-name].md` already has content beyond skeleton placeholders (look for filled-in sections vs empty `<!-- TODO -->` markers).

- **If sections are already filled**: Present current state and ask: "Some sections are already written. **Continue** (skip filled sections) or **redo specific sections** (which ones)?" Wait for the user.
- **If the file is still a skeleton**: Proceed normally.

---

## 1. Explore requirements

### 1a. Read authoritative sources

Build a **reconciliation table** comparing sources. Ideation domain feature files are **primary source of truth** — architecture design is secondary. Use `ideation-index.md` Structure Map for domain folder path.

1. Ideation domain folder (path from Structure Map):
   - `*-index.md` (children table + Role Matrix), each child feature `.md`, `*-cx.md`
   - If sub-domain folders exist, recurse and aggregate all descendant feature files
2. Shard's `## Features` section
3. `docs/plans/ideation/ideation-index.md` — Must Have features

Read `.agent/skills/spec-writing/SKILL.md` and `.agent/skills/architecture-mapping/SKILL.md`. Follow the Sub-Feature Reconciliation Protocol.

### 1b. Scope confirmation

Present reconciled features with counts of added (`[N]`) and architecture-only (`[M]`) sub-features. Ask: "Does this match your intent? Any to add, remove, or re-scope?" **Wait for confirmation.** Update shard file immediately on changes.

**Post-reconciliation**: If **≥ 10** sub-features → follow Sub-Feature Complexity Split Protocol (`.agent/skills/architecture-mapping/SKILL.md`), redirect to `/decompose-architecture-validate`. **After any split**: run `/remediate-shard-split` before restarting.

If the sub-feature count is **< 10**, proceed directly to Step 1c.

### 1c. Load brainstorming skill

Read `.agent/skills/brainstorming/SKILL.md` and use it to explore any remaining ambiguous sub-features — those marked `[Architecture-only]` that the user hasn't explicitly confirmed, or any sub-feature whose scope boundary (what's in, what's out) is still unclear after 1b.

> **Authoring pattern for Steps 2–7**: (1) Present each section with review questions, (2) follow decision confirmation protocol (`.agent/skills/prd-templates/references/decision-confirmation-protocol.md`), (3) write to `docs/plans/ia/[shard-name].md` immediately per write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`). Write-as-you-go is mandatory — never batch writes.

## 2. Map all interactions

For each feature in the shard, document:
- User action → API call → data mutation → response
- Which surfaces are involved (public, dashboard, admin, API)
- What events are emitted
- Error states and edge cases

**Review questions**: "All ways a user touches this domain?" / "Admin/system-initiated actions missing?" / "What happens in each failure case?"

Write `## Interactions` to shard file immediately after confirmation. Follow write verification protocol.

## 3. Define contracts

Read `.agent/skills/prd-templates/references/skill-loading-protocol.md` and load the API Design skill(s) from the cross-cutting section.

For each interaction, define the contract shape:
- Request shape (params, query, body)
- Response shape (all fields typed)
- Error shape (specific error codes)
- Note: actual {{CONTRACT_LIBRARY}} schemas written in BE spec phase

**Review questions**: "Fields missing from requests/responses?" / "Error codes specific enough?"

Write `## Contracts` to shard file immediately after confirmation. Follow write verification protocol.

## 4. Design data models

Read `.agent/skills/prd-templates/references/skill-loading-protocol.md` and load the Databases skill(s) for this shard's surface. Also load:
- `.agent/skills/database-schema-design/SKILL.md` — Schema design principles
- `.agent/skills/error-handling-patterns/SKILL.md` — Error categories for contracts
- `.agent/skills/technical-writer/SKILL.md` — Specification clarity

Define for each entity: tables/collections, fields, types, relationships, indexes, constraints and validation rules.

**Review questions**: "Schema captures everything?" / "Relationships and cardinalities correct?" / "Derived/computed fields to account for?"

Write `## Data Models` to shard file immediately after confirmation. Follow write verification protocol.

> **Decision recording**: For non-trivial data model or access control decisions, follow `.agent/skills/session-continuity/protocols/06-decision-analysis.md`.

## 5. Design access control

Read .agent/skills/security-scanning-security-hardening/SKILL.md and apply its access control and authorization design methodology.

- Permission matrix (who can read/write/delete what)
- Role-based restrictions
- Age restrictions (if applicable)
- Escalation paths (Guardian, Admin)
- Admin-only operations

**Review questions**: "Scenario where a blocked user gets through?" / "Scenario where an allowed user is blocked?"

Write `## Access Control` to shard file immediately after confirmation. Follow write verification protocol.

## 5.5. Accessibility specifications

Read `{{SURFACES}}` to determine the project's target surfaces.

Read `.agent/skills/accessibility/references/ia-spec-checklist.md` and follow its per-interaction checklist and review questions. The checklist covers keyboard navigation, screen reader semantics, color contrast, motion, and touch targets.

**If surfaces are `api`, `cli`, or `extension` only:** Write `"Not applicable — no visual surfaces"` in the `## Accessibility` section.

Write `## Accessibility` to shard file immediately after confirmation. Follow write verification protocol.

## 6. Design event schemas (if applicable)

- Event name, payload shape, emitter, consumers
- Async vs sync processing
- Retry semantics

Write `## Event Schemas` to shard file immediately after confirmation (if applicable). Follow write verification protocol.

### 6b. Event consumer cross-reference (if events defined)

For each event's listed consumers: verify consumer shard exists in `docs/plans/ia/index.md` and references this event. If consumer shard missing → **STOP**. Full cross-ref verification runs in the deepen shard.

## 7. Document edge cases

Read and follow `.agent/skills/resolve-ambiguity/SKILL.md` and `.agent/skills/adversarial-review/SKILL.md` (attack scenarios, abuse cases, race conditions). Read each `{{SECURITY_SKILLS}}` skill and apply its attack surface methodology.

Cover: rate limits/abuse, concurrent access, deletion cascades, state conflicts, empty/null states.

**Review questions**: "Worst thing a malicious user could try?" / "Two users do the same thing simultaneously?" / "What happens when related data is deleted?"

## 7.5. Write deep dive files (if applicable)

Scan the shard for links to `docs/plans/ia/deep-dives/` files. **If none** → skip.

For each referenced deep dive:
1. Read `docs/plans/ia/deep-dives/[feature-name].md` — if already has full content, skip.
2. If still a skeleton → write exhaustive subsystem detail: algorithms/state machines, technology choices with rationale, phasing strategy, data schemas, failure modes, integration contracts, performance, and security.
3. Write immediately — do not wait until Step 8. The parent shard's summary + link is sufficient; the deep dive file IS the content.

## 7.7. Completion Gate (MANDATORY)

Scan for memory-capture triggers (rule: `memory-capture`). Write patterns/decisions/blockers to `memory/`. If none → confirm "No new entries." **Not skippable** — complete before `notify_user`.

## 8. Present all sections and request approval

**Section completeness gate**: Before requesting approval, verify the spec file at `docs/plans/ia/[shard-name].md` contains ALL of the following sections with non-empty content (not just headers or `<!-- TODO -->` markers):
- `## Interactions`
- `## Contracts`
- `## Data Models`
- `## Access Control`
- `## Accessibility`
- `## Edge Cases`
- `## Event Schemas` (may be marked N/A — that's valid, but the section must exist with an explicit statement)

If any required section is missing or contains only headers → **STOP**: "Section `[name]` is empty or missing in the spec file. Complete all sections before requesting user approval."

All sections are now written to `docs/plans/ia/[shard-name].md`. Please review the file directly and confirm it's ready for deepening passes.

> **Do NOT proceed to `/write-architecture-spec-deepen` until the user approves all sections. Proposing next steps is not the same as receiving approval.**

Once approved, run `/write-architecture-spec-deepen`.

> **Note**: The deepen shard will run iterative passes over the approved content — the user does not need to re-approve individual sections during deepening.

