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

## 0. Placeholder guard

Verify `{{DATABASE_SKILLS}}`, `{{SECURITY_SKILLS}}`, and `{{SURFACES}}` are filled (no literal `{{` characters). If any are unfilled → **HARD STOP**. For format and recovery mappings, see `.agent/skills/prd-templates/references/placeholder-guard-template.md` and `.agent/skills/session-continuity/protocols/10-placeholder-verification-gate.md`.

---

## 0.5. Re-run check

Before loading skills, check whether the shard file at `docs/plans/ia/[shard-name].md` already has content beyond skeleton placeholders (look for filled-in sections vs empty `<!-- TODO -->` markers).

- **If sections are already filled**: Present current state and ask: "Some sections are already written. **Continue** (skip filled sections) or **redo specific sections** (which ones)?" Wait for the user.
- **If the file is still a skeleton**: Proceed normally.

---

## 1. Explore requirements

### 1a. Read the authoritative sources

Read the following files and build a **reconciliation table** comparing what each source says about this shard's features. The relevant domain file in `docs/plans/ideation/domains/` is the **primary source of truth** for sub-features — the architecture design is secondary context.

1. The relevant domain file in `docs/plans/ideation/domains/`
2. The shard's `## Features` section (from `/decompose-architecture-structure`)
3. `docs/plans/ideation/ideation-index.md` — Must Have features for this domain

Read `.agent/skills/spec-writing/SKILL.md` and `.agent/skills/architecture-mapping/SKILL.md`. Follow the architecture-mapping skill's Sub-Feature Reconciliation Protocol to build the reconciliation table and apply mismatch handling rules.

### 1b. Scope confirmation

Present the reconciled `## Features` list to the user, including a count of newly added sub-features:

> **Reconciled features for [Shard NN — Domain Name]:**
> [bullet list of all sub-features, with `[Architecture-only]` markers]
> 
> **[N] sub-features added from ideation domain file** that were missing from the shard skeleton.
> **[M] sub-features marked `[Architecture-only]`** — not found in ideation domain file, added during decomposition.
> 
> "Does this feature list match your intent for this domain? Any sub-features to add, remove, or re-scope?"

**Wait for explicit user confirmation before proceeding.** If the user modifies the list, update the shard's `## Features` section in `docs/plans/ia/[shard-name].md` immediately.

**Post-reconciliation calibration check**: Count the total confirmed sub-features. If the count is **≥ 10**, follow the **Sub-Feature Complexity Split Protocol** in `.agent/skills/architecture-mapping/SKILL.md` — present the split proposal, wait for approval, and redirect to `/decompose-architecture-validate` before continuing. Do NOT proceed to Step 2 with an oversized shard.

If the sub-feature count is **< 10**, proceed directly to Step 1c.

### 1c. Load brainstorming skill

Read `.agent/skills/brainstorming/SKILL.md` and use it to explore any remaining ambiguous sub-features — those marked `[Architecture-only]` that the user hasn't explicitly confirmed, or any sub-feature whose scope boundary (what's in, what's out) is still unclear after 1b.

> **Authoring pattern for Steps 2–7**: After designing each section, (1) present it to the user with the targeted review questions listed below, (2) refine based on their feedback, (3) write the completed section to `docs/plans/ia/[shard-name].md` immediately — do not batch writes until Step 8.

## 2. Map all interactions

For each feature in the shard, document:
- User action → API call → data mutation → response
- Which surfaces are involved (public, dashboard, admin, API)
- What events are emitted
- Error states and edge cases

**Review questions**: "Does this capture all the ways a user touches this domain?" / "Are there admin/system-initiated actions I'm missing?" / "What happens in each failure case?"

## 3. Define contracts

Read .agent/skills/{{API_DESIGN_SKILL}}/SKILL.md and follow its methodology.

For each interaction, define the contract shape:
- Request shape (params, query, body)
- Response shape (all fields typed)
- Error shape (specific error codes)
- Note: actual Zod schemas written in BE spec phase

**Review questions**: "Are there fields I'm missing from these requests/responses?" / "Are these error codes specific enough?"

## 4. Design data models

Read each skill listed in `{{DATABASE_SKILLS}}` (comma-separated). For each skill directory name, read `.agent/skills/[skill]/SKILL.md` before proceeding. Also load these community skills for guidance:
- `.agent/skills/database-schema-design/SKILL.md` — Schema design principles
- `.agent/skills/error-handling-patterns/SKILL.md` — Error categories for contracts
- `.agent/skills/technical-writer/SKILL.md` — Specification clarity
- Tables/collections, fields, types
- Relationships (graph edges, foreign keys, etc.)
- Indexes for query patterns
- Constraints and validation rules

**Review questions**: "Does this schema capture everything this domain needs to store?" / "Are the relationships and cardinalities correct?" / "Are there derived/computed fields I should account for?"

**Missing skill fallback**: If any database or security skill listed above is not installed and not in the MANIFEST, read `.agent/skills/find-skills/SKILL.md` and follow its discovery methodology before proceeding.

## 5. Design access control

Read .agent/skills/security-scanning-security-hardening/SKILL.md and apply its access control and authorization design methodology.

- Permission matrix (who can read/write/delete what)
- Role-based restrictions
- Age restrictions (if applicable)
- Escalation paths (Guardian, Admin)
- Admin-only operations

**Review questions**: "Can you think of a scenario where a user should be blocked that this matrix allows?" / "Can you think of a scenario where a user should be allowed that this matrix blocks?"

## 5.5. Accessibility specifications

Read `{{SURFACES}}` to determine the project's target surfaces.

Read `.agent/skills/accessibility/references/ia-spec-checklist.md` and follow its per-interaction checklist and review questions. The checklist covers keyboard navigation, screen reader semantics, color contrast, motion, and touch targets.

**If surfaces are `api`, `cli`, or `extension` only:** Write `"Not applicable — no visual surfaces"` in the `## Accessibility` section.

## 6. Design event schemas (if applicable)

- Event name, payload shape, emitter, consumers
- Async vs sync processing
- Retry semantics

## 7. Document edge cases

Read .agent/skills/resolve-ambiguity/SKILL.md and follow its methodology.

Read .agent/skills/adversarial-review/SKILL.md and follow its structured methodology for generating attack scenarios, abuse cases, race conditions, and security edge cases against this shard's interactions. Produce spec-level gap items for any identified risks.

Read each skill listed in `{{SECURITY_SKILLS}}` (comma-separated). For each skill directory name, read `.agent/skills/[skill]/SKILL.md` before proceeding.
For each skill in {{SECURITY_SKILLS}}, follow its attack surface methodology for edge case identification.

- Rate limits and abuse scenarios
- Concurrent access handling
- Deletion cascades
- State transition conflicts
- Empty/null states

**Review questions**: "What's the worst thing a malicious user could try in this domain?" / "What happens if two users do the same thing at the same time?" / "What happens when related data is deleted?"

## 7.5. Write deep dive files (if applicable)

Scan the shard for links to `docs/plans/ia/deep-dives/` files. **If none** → skip.

For each referenced deep dive:
1. Read `docs/plans/ia/deep-dives/[feature-name].md` — if already has full content, skip.
2. If still a skeleton → write exhaustive subsystem detail: algorithms/state machines, technology choices with rationale, phasing strategy, data schemas, failure modes, integration contracts, performance, and security.
3. Write immediately — do not wait until Step 8. The parent shard's summary + link is sufficient; the deep dive file IS the content.

## 8. Present all sections and request approval

All sections are now written to `docs/plans/ia/[shard-name].md`. Please review the file directly and confirm it's ready for deepening passes.

> **Do NOT proceed to `/write-architecture-spec-deepen` until the user approves all sections. Proposing next steps is not the same as receiving approval.**

Once approved, run `/write-architecture-spec-deepen`.

> **Note**: The deepen shard will run iterative passes over the approved content — the user does not need to re-approve individual sections during deepening.

