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
  skills: [brainstorming, resolve-ambiguity, database-schema-design]
  calls-bootstrap: false
requires_placeholders: [DATABASE_SKILLS, SECURITY_SKILLS]
---

// turbo-all

# Write Architecture Spec — Design

Explore requirements, map all interactions, and define contracts, data models, access control, event schemas, and edge cases.

**Prerequisite**: Skeleton IA shard must exist in `docs/plans/ia/`. If it does not, tell the user to run `/decompose-architecture` first.

## 0. Placeholder guard

Before any skill reads, verify that the following placeholder values have been filled by `/bootstrap-agents`. For each placeholder, check whether the literal characters `{{` still appear in the value. If **any** are unfilled, emit a **HARD STOP** and do not proceed to Step 0.5.

| Placeholder | Filled by | Recovery | Why this matters |
|---|---|---|---|
| `{{DATABASE_SKILLS}}` | `/create-prd-stack` when database technology is confirmed | If `docs/plans/*-architecture-design.md` exists, read it and extract the confirmed database, then run `/bootstrap-agents DATABASE=<confirmed-db>`. Otherwise run `/create-prd-stack` first. | Data model design (Step 4) would produce schema patterns incompatible with the chosen database. |
| `{{SECURITY_SKILLS}}` | `/create-prd-stack` when security tooling is confirmed | If `docs/plans/*-architecture-design.md` exists, read it and extract the confirmed security framework, then run `/bootstrap-agents SECURITY=<confirmed-framework>`. Otherwise run `/create-prd-stack` first. | Edge case and attack surface analysis (Step 7) would run without the project's security skill, missing stack-specific threat vectors. |

For the hard stop message format and recovery instructions, see `.agent/skills/prd-templates/references/placeholder-guard-template.md`.

Only proceed to Step 0.5 when both placeholders report no literal `{{` characters.

---

## 0.5. Re-run check

Before loading skills, check whether the shard file at `docs/plans/ia/[shard-name].md` already has content beyond skeleton placeholders (look for filled-in sections vs empty `<!-- TODO -->` markers).

- **If sections are already filled**: Present the current state of the file and ask: "Some sections are already written. Do you want to **continue from where you left off** (skip filled sections), or **redo specific sections** (tell me which ones)?" Wait for the user's answer before proceeding.
- **If the file is still a skeleton**: Proceed normally.

---

## 1. Explore requirements

### 1a. Read the authoritative sources

Read the following files and build a **reconciliation table** comparing what each source says about this shard's features. The relevant domain file in `docs/plans/ideation/domains/` is the **primary source of truth** for sub-features — the architecture design is secondary context.

1. The relevant domain file in `docs/plans/ideation/domains/` — the primary sub-feature inventory for this shard's domain
2. The shard's `## Features` section (seeded during `/decompose-architecture-structure`)
3. `docs/plans/ideation/ideation-index.md` — Must Have features relevant to this domain

Read .agent/skills/architecture-mapping/SKILL.md and follow its Sub-Feature Reconciliation Protocol. Build the reconciliation table comparing the ideation domain file against the shard skeleton and apply mismatch handling rules before proceeding to Step 1b.

### 1b. Scope confirmation

Present the reconciled `## Features` list to the user, including a count of newly added sub-features:

> **Reconciled features for [Shard NN — Domain Name]:**
> 
> [bullet list of all sub-features, with `[Architecture-only]` markers where applicable]
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

Read .agent/skills/rest-api-design/SKILL.md and follow its methodology.

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

**If surfaces include `web`, `mobile`, or `desktop`:**

Read `.agent/skills/accessibility/SKILL.md` and apply its WCAG 2.1 AA methodology.

For each user interaction documented in Step 2 (`## User Interactions`), identify and document:
- **Keyboard navigation path** — tab order and focus management for this interaction
- **Screen reader semantics** — ARIA roles, labels, and live regions required
- **Color contrast** — requirements for any new visual states (loading, error, empty, disabled)
- **Motion/animation** — `prefers-reduced-motion` implications for any transitions or animations
- **Touch target sizes** — minimum 44×44 px (mobile surfaces only)

**Review questions**: "Are there any interactions in this domain that could be problematic for keyboard-only users?" / "Are there any visual states (loading, error, empty, disabled) that need specific ARIA announcements?" / For mobile: "Do any touch targets fall below 44×44px minimum?"

**If surfaces are `api`, `cli`, or `extension` only:** Write `"Not applicable — no visual surfaces"` in the `## Accessibility` section.

## 6. Design event schemas (if applicable)

- Event name, payload shape, emitter, consumers
- Async vs sync processing
- Retry semantics

## 7. Document edge cases

Read .agent/skills/resolve-ambiguity/SKILL.md and follow its methodology.

Read each skill listed in `{{SECURITY_SKILLS}}` (comma-separated). For each skill directory name, read `.agent/skills/[skill]/SKILL.md` before proceeding.
For each skill in {{SECURITY_SKILLS}}, follow its attack surface methodology for edge case identification.

- Rate limits and abuse scenarios
- Concurrent access handling
- Deletion cascades
- State transition conflicts
- Empty/null states

**Review questions**: "What's the worst thing a malicious user could try in this domain?" / "What happens if two users do the same thing at the same time?" / "What happens when related data is deleted?"

## 7.5. Write deep dive files (if applicable)

Check whether the current shard references any deep dive candidates. To do this:
1. Read the shard file at `docs/plans/ia/[shard-name].md` and look for any links to `docs/plans/ia/deep-dives/` files in the "Deep Dives Needed" section or anywhere in the document.
2. List the files in `docs/plans/ia/deep-dives/` and identify which ones are referenced by this shard.

**If no deep dives are referenced**: Skip this step entirely.

**If deep dives are referenced**: For each referenced deep dive file:

1. Read the current content of `docs/plans/ia/deep-dives/[feature-name].md` to check if it is still a skeleton (empty or contains only placeholder comments).
2. **If already has full content**: Skip — do not overwrite.
3. **If still a skeleton**: Write exhaustive subsystem detail — algorithms/state machines, technology choices with rationale, phasing strategy, detailed data schemas, failure modes and recovery, integration contracts, performance characteristics, and security considerations.

   The parent shard's "Deep Dives Needed" section should already contain a summary + link. Do not duplicate the full content in the parent shard — the deep dive file IS the content.

> **Write now**: Write the completed deep dive content to `docs/plans/ia/deep-dives/[feature-name].md`. Do not wait until Step 8.

## 8. Present all sections and request approval

All sections are now written to `docs/plans/ia/[shard-name].md`. Please review the file directly and confirm it's ready for deepening passes.

> **Do NOT proceed to `/write-architecture-spec-deepen` until the user approves all sections. Proposing next steps is not the same as receiving approval.**

Once approved, run `/write-architecture-spec-deepen`.

> **Note**: The deepen shard will run iterative passes over the approved content — the user does not need to re-approve individual sections during deepening.

