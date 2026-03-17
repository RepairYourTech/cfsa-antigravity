---
description: Constraints, metrics, competitive positioning, domain exhaustion, and vision compilation for the ideate workflow
parent: ideate
shard: validate
standalone: true
position: 3
pipeline:
  position: 1.3
  stage: vision
  predecessors: [ideate-discover]
  successors: [create-prd]
  skills: [idea-extraction, pipeline-rubrics, prd-templates, technical-writer]
  calls-bootstrap: false
---

// turbo-all

# Ideate — Validate

Explore constraints, verify domain exhaustion, and compile the vision summary.

**Prerequisite**: If invoked standalone, verify `docs/plans/ideation/ideation-index.md` exists with leaf nodes at `[DEEP]` or `[EXHAUSTED]` level. If not → **STOP**: "Run `/ideate-discover` first."

---

## 7.5. Read Engagement Tier

Read `## Engagement Tier` from `docs/plans/ideation/ideation-index.md`.

Read `.agent/skills/prd-templates/references/engagement-tier-protocol.md` — apply the tier's gate behavior for this shard.

## 8. Constraints and metrics

Read `.agent/skills/idea-extraction/SKILL.md` → Deep Think Protocol.

Read `.agent/skills/prd-templates/references/constraint-exploration.md` — follow the constraint questions, tier-specific behavior, success metrics, and competitive positioning procedures.

**Showstopper detection**: If any constraint is classified as a fundamental viability blocker (e.g., regulatory impossibility, technical impossibility with current tech, market size < viable threshold) → **STOP**. Present to the user:

> ⚠️ **Potential showstopper identified**: [constraint description]
>
> Options:
> 1. **Pivot** — modify the idea to avoid this constraint
> 2. **Accept risk** — proceed knowing this constraint exists
> 3. **Abandon** — this idea is not viable

Wait for user decision. If pivot → update problem statement and loop back to re-explore affected domains. If accept risk → document in `meta/constraints.md` as accepted risk and continue. If abandon → end the workflow.

If the surface classification changed during constraint exploration, update `ideation-index.md` `## Structural Classification` section.

---

## 9. Domain exhaustion check

Read `.agent/skills/prd-templates/references/domain-exhaustion-criteria.md` — apply all criteria and follow the execution procedure.

If any criterion fails → take the specified action. If proportionality fails → return to `/ideate-discover` for under-explored areas.

### 9.5. Domain Gap Reasoning (missing domain detection)

After verifying existing domains are deep enough, reason about whether **entire domains are missing**:

1. **Product archetype analysis**: Identify the product archetype (e.g., marketplace, SaaS tool, social platform, developer tool). List the standard domain categories for this archetype.
2. **Gap identification**: Compare the standard domain list against the actual domain folders in `docs/plans/ideation/domains/`. List any standard domains with no corresponding folder.
3. **Cross-feature gap detection**: Read all CX files. For each unresolved cross-cut, ask: "Does this cross-cut imply a domain that doesn't exist yet?" (Example: if multiple features reference "notifications" but no notifications domain exists, that's a structural gap.)
4. **Present missing domains**:

> 🏗️ **Potential missing domains:**
>
> Given this is a [product archetype], these domains are standard but not present:
> - **[Domain A]** — [why it's expected: most [archetype] apps have this because...]
> - **[Domain B]** — [why it's expected: cross-cuts between features X and Y imply this]
>
> These are suggestions. You may have intentionally excluded them. Want to add any?

**STOP** — wait for user response. For each accepted domain:
1. Create the domain folder with index and CX files
2. Run a quick Level 1 breadth sweep (from idea-extraction skill)
3. Re-run the exhaustion check on the expanded domain set

For rejected domains: add to `ideation-index.md` `## Considered & Rejected` section.

**Loop guard**: Track how many times this shard has returned to `/ideate-discover` for exhaustion remediation.
- **1st return** → normal. Run discover again on the flagged areas.
- **2nd return** → warn: "This is the second remediation loop. Remaining gaps: [list]. Resolve these specifically or they will be escalated."
- **3rd return** → **STOP**: "Exhaustion check has failed 3 times. Remaining gaps: [list]. Present these to the user as known gaps and ask: accept as-is, or manually provide the missing content?"

---

## 10.5. Auto Tier Review Checkpoint (Auto tier only)

If engagement tier is **Auto**:

1. List all auto-confirmed decisions with their Deep Think reasoning
2. Highlight any `[AUTO-CONFIRMED]` entries in `meta/constraints.md`, `meta/personas.md`, `meta/competitive-landscape.md`
3. Present: "I explored your idea independently. Here's everything I decided and why. Override anything before I compile the vision."
4. **Wait for user response.** Apply any overrides. Write corrections immediately.

For **Hybrid** and **Interactive** tiers → skip this step.

---

## 11. Compile vision document

Read `.agent/skills/prd-templates/references/vision-template.md` for the output template and required sections.

Read `.agent/skills/technical-writer/SKILL.md` and follow its methodology.

Compile `docs/plans/vision.md` as a human-readable executive summary. This is NOT consumed by the pipeline — the pipeline reads `ideation-index.md` directly.

### Fidelity check

Verify every domain in `ideation-index.md` appears in `vision.md`. Nothing dropped during compilation.

---

## 12. Request review

### Self-check against Ideation rubric

Read `.agent/skills/pipeline-rubrics/references/ideation-rubric.md` and apply all 12 dimensions as the self-check.

For any dimension that scores ⚠️ or ❌ → resolve it NOW. Loop back to the relevant step. Do not present a document with known gaps.

**Remediation loop guard**: Track remediation attempts per dimension.
- After **3 failed attempts** on the same dimension → **STOP**: "Dimension '[name]' has failed remediation 3 times. Presenting to user as a known gap with context: [what was tried, why it failed]." Include it in the review presentation as an unresolved item for user decision.

### Present for review

Use `notify_user` to request review of:
- `docs/plans/ideation/ideation-index.md` — the pipeline key file
- `docs/plans/vision.md` — the human summary

Include: self-check results (all 12 dimensions), any resolved gaps, final domain coverage map, Deep Think hypothesis counts.

**STOP** — do NOT proceed until the user explicitly approves.

### Next step

**STOP** — do NOT propose `/create-prd` or any other pipeline workflow. The only valid next step is:

- `/audit-ambiguity ideation` — mandatory coverage verification before `/create-prd` can begin.
