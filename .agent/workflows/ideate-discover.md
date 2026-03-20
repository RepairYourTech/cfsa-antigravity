---
description: Recursive breadth-before-depth domain exploration with Deep Think protocol and fractal structure for the ideate workflow
parent: ideate
shard: discover
standalone: true
position: 2
pipeline:
  position: 1.2
  stage: vision
  predecessors: [ideate-extract]
  successors: [ideate-validate]
  skills: [brainstorming, idea-extraction, pipeline-rubrics]
  calls-bootstrap: false
---

// turbo-all

# Ideate — Discover

Explore domains through recursive breadth-before-depth with the Deep Think protocol. Write to the fractal folder structure.

**Prerequisite**: If invoked standalone, verify `docs/plans/ideation/ideation-index.md` exists with the fractal folder structure seeded. If missing → **STOP**: "Run `/ideate-extract` first."

---

## 2.4. Mid-shard resumption check

Scan `docs/plans/ideation/` for existing domain folders and feature files.

- **If 0 domain folders exist** → fresh exploration. Proceed to Step 2.5.
- **If domain folders exist but ideation-index.md `## Domain Map` is incomplete** (some domains listed but not all have `[DEEP]`/`[EXHAUSTED]`) → this is a resumed session. Log: "Resuming exploration. [N] of [M] domains already explored." Skip already-completed domains and continue from the first incomplete one.
- **If all domains are marked `[DEEP]` or `[EXHAUSTED]`** → exploration is complete. Skip to Step 4 (problem exploration) if not yet done, otherwise skip to `/ideate-validate`.

## 2.5. Read Engagement Tier

Read `## Engagement Tier` from `docs/plans/ideation/ideation-index.md`.

- **If the section exists** → apply the specified tier.
- **If the section is missing** → default to **Hybrid** tier. Warn: "Engagement tier not found in ideation-index.md. Defaulting to Hybrid. Override now or continue?"
- **If the value is not one of Auto/Hybrid/Interactive** → **STOP**: "Invalid engagement tier '[value]' in ideation-index.md. Expected: Auto, Hybrid, or Interactive."

Read `.agent/skills/prd-templates/references/engagement-tier-protocol.md` — apply the tier's gate behavior for structural gates and product gates throughout this shard.

> [!IMPORTANT]
> **Auto-confirmed gates must still write.** When a gate is auto-confirmed, the agent writes the Deep Think reasoning and decision to the relevant file immediately. The file trail must be identical regardless of tier.

## 3. Domain Exploration — Recursive Model

Read `.agent/skills/idea-extraction/SKILL.md` — follow the **Recursive Domain Exhaustion Protocol**, **Deep Think Protocol**, **Node Classification Gate**, **Reactive Depth Protocol**, and **CX Decision Gate**.

> [!IMPORTANT]
> **CX Decision Gate is mandatory at every level.** After resolving ANY open question, confirming ANY Deep Think hypothesis, or receiving ANY product decision from the user → STOP and run the CX Decision Gate from `idea-extraction/SKILL.md` before proceeding. This is the #1 enforcement gap — decisions silently drop cross-domain connections without this gate.

Read `## Expansion Mode` and `## Structural Classification` from `docs/plans/ideation/ideation-index.md`.

Route to the correct exploration mode based on what was selected in `ideate-extract` Step 1.6.5:

- **Full exploration** → Run Level 0 → Level 1 → Level 2+ as defined in `idea-extraction/SKILL.md` → `## Recursive Domain Exhaustion Protocol`. Apply tier-appropriate gate behavior at each level.
- **Vertical** → Identify shallowest leaf nodes. Drive to `[DEEP]`/`[EXHAUSTED]` with Deep Think. Do not introduce new domains unless user requests.
- **Horizontal** → Audit for missing domains with Deep Think. Create domain folders (with Classification Gate). Level 1 breadth sweep on each. Offer vertical drilling after.
- **Cross-cutting** → Read all CX files + feature files. Identify interaction points. Run synthesis questions on unresolved pairs.
- **Combination** → User specifies sequence.
- **As-is** → Skip expansion, run exhaustion check, but still scan for obvious CX candidates.
- **Audit ambiguity first** → Run inline ambiguity check, then select expansion mode based on results.

---

## 4. Problem exploration

Read `.agent/skills/brainstorming/SKILL.md` and follow its methodology.

1. **What problem are we solving?** → Write to `meta/problem-statement.md`
2. **Who has this problem?** → Write to `meta/personas.md`
3. **How are they solving it today?** → Write to `meta/competitive-landscape.md`
4. **Why now?** → Write to `meta/problem-statement.md` under "Why Now"

**Persona completeness gate**: Read `.agent/skills/prd-templates/references/persona-completeness-gate.md`. Verify all 6 fields for every persona. If any field absent → probe before proceeding.

**Meta files gate**: After completing problem exploration, verify ALL of the following files exist and are non-empty:
- `docs/plans/ideation/meta/problem-statement.md` (must contain a "Why Now" section)
- `docs/plans/ideation/meta/personas.md`
- `docs/plans/ideation/meta/competitive-landscape.md`

If ANY file is missing or empty → **STOP**: "Meta file `[filename]` was not written during problem exploration. Write it now before proceeding to feature inventory."

---

## 5. Feature inventory — deep exploration

### 5a. Feature collection (MoSCoW)

Read `.agent/skills/brainstorming/SKILL.md`. For each persona, brainstorm features across all 4 MoSCoW tiers. **Deep Think** for missing Must Haves.

Write MoSCoW matrix to `ideation-index.md`. Each feature references its fractal path and links to its feature file.

**0 Must Haves guard**: If the MoSCoW matrix contains 0 Must Have features → **STOP**: "No Must Have features identified. This indicates the problem statement or personas need refinement. Return to Step 4 and re-examine 'What problem are we solving?' with deeper probing before continuing."

### 5a.5. Adjacent Feature Analysis (gap surfacing)

After the MoSCoW matrix is populated, reason about what's **conspicuously absent** given everything known about the product:

1. **Domain reasoning**: Given the product type (e.g., e-commerce, SaaS, marketplace), enumerate the standard feature categories expected in this space. Compare against the MoSCoW matrix. List any standard categories with zero features.
2. **Persona reasoning**: For each persona, ask: "What does this persona need to accomplish their goal that isn't covered by any feature?" List unmet persona needs.
3. **Workflow reasoning**: Trace each persona's end-to-end workflow. Identify any step where the user would need to leave the product to accomplish something — each gap is a potential missing feature.
4. **Competitive reasoning**: Read `meta/competitive-landscape.md`. For each competitor capability listed, verify a corresponding feature exists. List competitive gaps.

**Present findings as suggestions, not mandates**:

> 🔍 **Features you might not have thought of:**
>
> Based on [product type] and your personas:
> - [Feature A] — [why it fits: persona X needs this for workflow step Y]
> - [Feature B] — [why it fits: standard in this space, competitors X and Y have it]
> - [Feature C] — [why it fits: gap in persona Z's end-to-end workflow]
>
> Want to add any of these? They'd enter the MoSCoW matrix for prioritization.

**STOP** — wait for user response. For each accepted feature:
1. Add to the MoSCoW matrix at the user's chosen priority
2. Create a feature file in the appropriate domain folder
3. Continue to Step 5b with the expanded feature set

For rejected features: note in `ideation-index.md` under a `## Considered & Rejected` section with the reason, so future sessions don't re-suggest them.

### 5b. Feature deepening — Must Haves

For each Must Have feature, use the recursive model from `idea-extraction/SKILL.md`:
1. **Level 1**: Sub-features. Run Classification Gate — sub-domain or feature?
2. **Level 2**: Edge cases and failure modes. Fill feature file sections per `fractal-feature-template.md`.
3. **Level 3** (complex features): Full cross-cut synthesis per `fractal-cx-template.md`.

**At EVERY level**: Deep Think + **CX Decision Gate**. After each decision, OQ resolution, or confirmed hypothesis → run CX Decision Gate → write CX entries immediately → then proceed.

### 5c. Feature deepening — Should Haves (lighter touch)

Level 1 (sub-features) only with Deep Think. Full treatment deferred to `/create-prd`.

### 5d. Cross-Cut Synthesis Sweep (mandatory)

After all features are deepened, systematically identify emergent capabilities that arise when features **combine**:

1. **Build a feature interaction matrix**: List all Must Have and Should Have features on both axes. For each pair, ask: "When a user has both of these, does something new become possible that neither feature provides alone?"
2. **Identify emergent capabilities**: For each interesting pair (or triplet), describe the emergent capability.
   - Example: Feature "AI diagnostics" + Feature "Supplier catalog" → emergent: "AI-recommended parts ordering" — the diagnostic identifies the failed part AND the catalog knows who sells it, enabling one-click ordering.
3. **Classify each emergent capability**:
   - **Already captured** → a feature or sub-feature already covers this. Note the link.
   - **New cross-cut** → write to the parent domain's CX file. Flag for user review.
   - **New feature entirely** → present to user for MoSCoW placement.
4. **Present all findings**:

> 🔗 **Cross-cutting opportunities discovered:**
>
> | Features Combined | Emergent Capability | Status |
> |---|---|---|
> | [A] + [B] | [What becomes possible] | New cross-cut / New feature / Already captured |
>
> These emerged from how your features interact — they're capabilities you get "for free" if you build them with this interaction in mind.

**STOP** — wait for user response. Write accepted cross-cuts to CX files immediately. Add accepted new features to MoSCoW matrix.

> **Minimum coverage**: The sweep must evaluate at least every Must Have × Must Have pair and every Must Have × Should Have pair. Should Have × Should Have pairs are optional but recommended for complex products.

**CX coverage check**: Count the total CX entries across all domain CX files (`*-cx.md`). If the total is **0** and there are **2 or more domains** with Must Have features → **STOP**: "Zero CX entries found despite multiple active domains. This indicates the CX Decision Gate was not applied during exploration. Review each domain pair for cross-cutting concerns before proceeding."

---

### Next step

**STOP** — do NOT proceed to any other workflow. The only valid next step is `/ideate-validate`.

> If invoked standalone, surface this via `notify_user` and wait for user confirmation before running `/ideate-validate`.
