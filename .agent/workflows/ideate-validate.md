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

**Prerequisite**: If invoked standalone, verify `docs/plans/ideation/ideation-index.md` exists with leaf nodes at `[DEEP]` or `[EXHAUSTED]` level. If not, prompt the user to run `/ideate-discover` first.

---

## 7.5. Read Engagement Tier

Read `## Engagement Tier` from `docs/plans/ideation/ideation-index.md`. Apply to gates in this shard:

- **Auto**: Steps 8 (constraints, metrics, competitive positioning) → agent self-interviews using Deep Think, writes answers to files. Step 10.5 (below) provides a review checkpoint before compilation.
- **Hybrid**: Steps 8 product decisions → pause for user. Structural checks → auto.
- **Interactive**: All steps pause for user confirmation.

## 8. Constraints and metrics

Read `.agent/skills/idea-extraction/SKILL.md` and follow its Deep Think Protocol.

Read `.agent/skills/prd-templates/references/ideation-meta-template.md` for the constraints template.

Explore constraints with the user. Write to `docs/plans/ideation/meta/constraints.md`:

1. **Budget** — Self-funded? VC-backed? Monthly infrastructure ceiling?
2. **Timeline** — Launch target? Phased rollout?
3. **Team** — Solo dev? Small team? Skill gaps?
4. **Compliance** — GDPR, PCI, COPPA, HIPAA, SOC 2? Age restrictions?
5. **Performance** — Expected scale (users, requests, data)? Latency requirements?
6. **Surface classification validation** — Verify the structural classification from `ideation-index.md` (set in `ideate-extract` Step 1.3) still holds. Have any new surfaces been discovered during exploration? Has the project shape changed (e.g., what started as single-surface now has a mobile app too)? If the classification needs updating, update it now and note any domain files that need to be relocated.

**Deep Think**: "Based on the product type and user personas, what constraints would I expect that haven't been mentioned? For example, does this product handle payments (PCI)? Does it serve minors (COPPA)? Does it store health data (HIPAA)?"

**Interactive/Hybrid**: Present each constraint question to user, wait for answers. Write each confirmed constraint to `meta/constraints.md` immediately.

**Auto**: Self-interview using Deep Think. Write all answers with reasoning to `meta/constraints.md` immediately. Mark each answer as `[AUTO-CONFIRMED]` for traceability.

If the surface classification changed, update `ideation-index.md` `## Structural Classification` section.

### Success metrics

For each persona, define concrete success metrics. Write to `ideation-index.md` (or link to domain files where the metric applies):

- What metric proves this product solves the persona's problem?
- What's the target number? (specific — not "good response times")
- What's the measurement method?

### Competitive positioning

If not already explored in `/ideate-discover` Step 4, explore competitive landscape now. Write to `docs/plans/ideation/meta/competitive-landscape.md`:

- Name 2-4 direct competitors
- For each: what they do well, where they fail, how we differentiate
- What's the moat? (network effects, data, expertise, switching costs)

---

## 9. Domain exhaustion check

This is the final validation gate before compilation.

### Read the fractal tree

Read `docs/plans/ideation/ideation-index.md` and recursively review:
- Every node's status marker (surface → domain → sub-domain → feature)
- All leaf feature files' status markers
- All CX files at every level for pending entries

### Exhaustion criteria

| Check | Criteria | Action if Fail |
|-------|----------|----------------|
| All leaf nodes ≥ `[DEEP]` | Every feature file in the tree is `[DEEP]` or `[EXHAUSTED]` | Drill remaining feature files |
| Status propagation correct | Parent nodes reflect their children's status | Update parent indexes |
| All Must Have features ≥ Level 2 | Every Must Have has sub-features AND edge cases AND Role Lens | Deep Think + drill |
| Deep Think zero hypotheses | Final Deep Think pass across ALL leaf nodes yields no new hypotheses | Present any new hypotheses, drill if confirmed |
| All CX files clean | No Medium/Low confidence entries remain at any level — all are High or rejected | Run synthesis questions on pending pairs |
| Role Lens complete | Every feature file has a populated Role Lens table | Fill missing Role Lens entries |
| User confirmation | User explicitly confirms "nothing else" for each domain | Ask for each under-explored domain |

### Execute exhaustion check

1. Walk the fractal tree. For each leaf node below `[DEEP]`:
   - "Feature [X] in [domain] is still at [status]. Drill deeper or intentionally minimal?"
   - If "drill" → return to `/ideate-discover`
   - If "intentionally minimal" → note in feature file and proceed

2. Run **final Deep Think pass**: For each `[DEEP]` leaf node, apply the four Deep Think questions. Present any new hypotheses.
   - If confirmed → drill, update feature files
   - If zero hypotheses → mark `[EXHAUSTED]`, propagate status upward

3. Walk ALL CX files at every level. Resolve any Medium/Low confidence entries.

4. Verify all feature files have populated Role Lens tables.

5. Update `ideation-index.md` progress summary with final counts (total leaf nodes, exhausted count, CX entries confirmed).

---

## 10. Vision deepening (if needed)

After the exhaustion check, verify proportionality:

- **Rich inputs**: Total domain file content (all files combined) should be at least 30% of the original source document's line count. If short, identify what was lost.
- **All inputs**: Each domain with `[DEEP]` or `[EXHAUSTED]` status should have at least 3 sub-areas drilled with edge cases.

If proportionality fails, return to `/ideate-discover` for the under-explored areas.

---

## 10.5. Auto Tier Review Checkpoint (Auto tier only)

If engagement tier is **Auto**, present a comprehensive review before compilation:

1. **List all auto-confirmed decisions** with their Deep Think reasoning — from domain classification, feature drilling, constraints, personas, competitive positioning
2. **Highlight any `[AUTO-CONFIRMED]` entries** in `meta/constraints.md`, `meta/personas.md`, and `meta/competitive-landscape.md`
3. **Present for review**: "I explored your idea independently. Here's everything I decided and why. Override anything before I compile the vision."
4. **Wait for user response.** Apply any overrides. Write corrections to files immediately.

For **Hybrid** and **Interactive** tiers, skip this step — the user already confirmed during exploration.

---

## 11. Compile vision document

Read `.agent/skills/prd-templates/references/vision-template.md` for the output template.

Read `.agent/skills/technical-writer/SKILL.md` and follow its methodology.

Compile `docs/plans/vision.md` as a **human-readable executive summary** of the ideation output. This is the "sales pitch" — it is NOT consumed by the pipeline. The pipeline reads `ideation-index.md` directly.

**Vision.md contents (Option B — Executive Summary):**

1. **Problem Statement** — Condensed from `meta/problem-statement.md`
2. **Target Users** — Condensed persona summaries from `meta/personas.md` (name + role + pain point + success criteria — not the full 6-field exploration)
3. **Solution Overview** — 2-3 paragraphs describing what the product does
4. **Domain Map** — One paragraph per domain (condensed from domain files, not the full exploration)
5. **MoSCoW Feature Matrix** — Feature names + domain links (not the drill-down details)
6. **Key Differentiators + Competitive Landscape** — From `meta/competitive-landscape.md`
7. **Constraints Summary** — From `meta/constraints.md`
8. **Key Decisions** — Numbered list from `ideation-index.md` decision log

Add a header note:

```markdown
> **This is a human-readable project summary.** For pipeline-grade detail, see
> [ideation-index.md](ideation/ideation-index.md) and the domain files it references.
```

### Fidelity check

Verify that every domain in `ideation-index.md` appears in `vision.md`. Nothing dropped during compilation. This is a summary, not a filter.

---

## 12. Request review

### Self-check against Ideation rubric

Before presenting to the user, self-check the ideation output:

Read `.agent/skills/pipeline-rubrics/references/ideation-rubric.md` before applying the self-check dimensions.

| # | Dimension | Check |
|---|-----------|-------|
| 1 | Problem Clarity | Is the problem one sentence, specific, and testable? |
| 2 | Persona Specificity | Are personas named with all 6 fields? |
| 3 | Feature Completeness | Is MoSCoW complete? Are Must Haves at ≥Level 2 depth? |
| 4 | Constraint Explicitness | Are all axes (budget, timeline, team, compliance, performance) addressed? |
| 5 | Success Measurability | Are there concrete numbers/thresholds? |
| 6 | Competitive Positioning | Are competitors named with differentiation? |
| 7 | Open Question Resolution | Do all open questions have owners + deadlines? |
| 8 | **Input-Output Proportionality** | Is the ideation output proportional to input richness? |
| 9 | **Domain Coverage** | Are all domains at `[DEEP]` or `[EXHAUSTED]`? |
| 10 | **Deep Think Coverage** | Were hypotheses tracked? Are all resolved (confirmed/rejected)? |
| 11 | **Cross-Cut Completeness** | Is the ledger clean? No pending entries? |
| 12 | **Fractal Structure Compliance** | Does every folder have an index + CX file? Do leaf nodes use the feature template? Does hub-and-spoke placement match classification? Are Role Matrix and Role Lens populated? |

For any dimension that scores ⚠️ or ❌, resolve it NOW — don't present a document with known gaps. Loop back to the relevant step and work through it with the user.

> **Note**: This is an internal self-check, not a formal audit. For a rigorous,
> independent audit with evidence citations, run `/audit-ambiguity ideation` as a
> separate step after this workflow completes.

### Present for review

Use `notify_user` to request review of:
- `docs/plans/ideation/ideation-index.md` — the pipeline key file
- `docs/plans/vision.md` — the human summary

Include:
- Summary of the self-check results (all 12 dimensions)
- Any areas where you resolved gaps during the self-check
- The final domain coverage map
- Count of Deep Think hypotheses: N presented, N confirmed, N rejected

The ideation must be approved before proceeding. Do NOT proceed until the user sends a message explicitly approving. Wait for explicit approval.

### Proposed next steps

**Mandatory next step**: Run `/audit-ambiguity ideation` for all inputs, regardless of input type. Even a rich document can have gaps the agent missed. The audit is cheap; the cost of a gap propagating to architecture is high. Do not propose `/create-prd` until `/audit-ambiguity ideation` has run.
