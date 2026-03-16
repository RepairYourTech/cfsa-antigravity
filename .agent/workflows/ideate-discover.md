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

Explore domains through recursive breadth-before-depth with the Deep Think protocol. Write to the fractal folder structure — every node gets an index, CX file, and children.

**Prerequisite**: If invoked standalone, verify `docs/plans/ideation/ideation-index.md` exists with the fractal folder structure seeded. If this file does not exist → **STOP**: "Extraction output missing — the fractal folder structure has not been seeded. Run `/ideate-extract` first before proceeding to discovery." Do not proceed without this output.

---

## 3. Domain Exploration — Recursive Model

Read `.agent/skills/idea-extraction/SKILL.md` — follow the Recursive Domain Exhaustion Protocol, Deep Think Protocol, Node Classification Gate, and Reactive Depth Protocol.

Read `## Expansion Mode` and `## Structural Classification` from `docs/plans/ideation/ideation-index.md`.

### Full Mode (recommended for 3+ domains)

#### Level 0 — Global Domain Map

1. Read `ideation-index.md` for currently identified domains and structural classification
2. Apply Deep Think: "What domains would I expect for this product type?"
3. For each confirmed domain, run the **Node Classification Gate** (from skill):
   - Determine placement (surface folder, hub, shared, or top-level)
   - Create domain folder: `{NN}-{slug}/` + `{slug}-index.md` + `{slug}-cx.md`
4. Note preliminary cross-cuts:
   - In the relevant parent's CX file (surface CX or global CX)
   - In `ideation-cx.md` if cross-surface
5. Update `ideation-index.md` structure map with paths
6. **Gate**: Present domain map. User confirms before Level 1.

#### Level 1 — Domain Breadth Sweep

For each domain (dependency order — foundational first):

1. List all sub-areas/capabilities within the domain
2. **Deep Think**: "What sub-areas would an expert expect?"
3. Run **Node Classification Gate** for each:
   - 2+ interacting capabilities → **sub-domain** (create folder + index + CX)
   - Single capability → **feature** (create `.md` file from `fractal-feature-template.md`)
4. Update domain index (Children table + **Role Matrix**)
5. Note cross-cuts in the domain's CX file
6. **NEW DOMAINS DISCOVERED?** → Classify, create, update index, loop to Level 0
7. Mark domain status as `[BREADTH]`
8. **Gate**: Pause after EACH domain. "Here's what I mapped for [Domain]. Missing anything?" After ALL: "All domains at BREADTH. Ready to drill?"

#### Level 2+ — Vertical Drilling

For each domain (dependency order), for each child:

1. Apply Exhaustion Questions (entity, feature, user, integration)
2. **Deep Think** per child — edge cases, interactions, failure modes
3. For **feature files**: fill all sections (Behavior, Edge Cases, States, **Role Lens**)
4. For **sub-domains**: drill their child features recursively
5. Record Deep Think outcomes in each feature file's Deep Think Annotations table
6. Cross-cuts with evidence → add to parent's CX file with synthesis questions
7. **Feature reveals 2+ interacting capabilities?** → Run **Promotion Protocol** (convert .md to folder)
8. **NEW DOMAINS DISCOVERED?** → Loop to Level 0
9. When Deep Think yields zero hypotheses AND user confirms → mark `[EXHAUSTED]`
10. Status propagation: all children `[EXHAUSTED]` → node is `[EXHAUSTED]`
11. **Gate**: Pause after each domain is drilled.

#### Cross-Cut Synthesis (Continuous)

Cross-cuts are identified continuously, but after all domains reach `[DEEP]`, do a final review:

1. Read ALL CX files at every level (global, surface, domain, sub-domain)
2. For any entries at Medium/Low confidence, ask the five synthesis questions (per `fractal-cx-template.md`)
3. Document confirmed interactions with role scoping
4. Record rejected pairs with reasoning
5. Check second-order cross-cuts: "Do any CONFIRMED pairs cross-cut each other?"

### Vertical Mode

Identify shallowest leaf nodes. Drive to `[DEEP]`/`[EXHAUSTED]` with Deep Think. Fill Role Lens in all feature files. Cross-cut watch active — log to appropriate CX files. Do not introduce new domains unless user requests.

### Horizontal Mode

Audit for missing domains with Deep Think. Create domain folders (with Classification Gate) for confirmed new domains. Level 1 breadth sweep on each. Offer vertical drilling after.

### Cross-cutting Mode (standalone)

Read all CX files + feature files' cross-cut notes. Identify interaction points. Run synthesis questions on unresolved pairs. Document in appropriate CX files.

### Combination / As-is Mode

Combination: user specifies sequence. As-is: skip expansion, run exhaustion check, but still scan for obvious CX candidates.

---

## 4. Problem exploration

Read `.agent/skills/brainstorming/SKILL.md` and follow its methodology.

1. **What problem are we solving?** → Write to `meta/problem-statement.md`
2. **Who has this problem?** → Write to `meta/personas.md`
3. **How are they solving it today?** → Write to `meta/competitive-landscape.md`
4. **Why now?** → Write to `meta/problem-statement.md` under "Why Now"

**Persona completeness gate (Ideation Rubric Dimension 2):** For each persona, verify all 6 fields:
1. Name + specific role
2. Specific pain point
3. Current workaround
4. Success criteria
5. Switching trigger
6. At least one edge case or constraint unique to this persona

If any field absent → probe before proceeding. Reference: `.agent/skills/pipeline-rubrics/references/ideation-rubric.md` Dimension 2.

---

## 5. Feature inventory — deep exploration

### 5a. Feature collection (MoSCoW)

Read `.agent/skills/brainstorming/SKILL.md`.

For each persona, brainstorm features across all 4 MoSCoW tiers. **Deep Think** for missing Must Haves.

Write MoSCoW matrix to `ideation-index.md`. Each feature references its **fractal path** (e.g., `web/01.02.03`) and links to its feature file.

### 5b. Feature deepening — Must Haves

For each Must Have feature, use the recursive model:

1. **Level 1: Sub-features.** Component parts. Run Classification Gate — sub-domain or feature?
2. **Level 2: Edge cases and failure modes.** Fill feature file sections: Behavior (happy path, edge cases, states), **Role Lens**.
3. **Level 3 (complex features): Interactions.** Cross-cuts with evidence → parent CX file.

**Deep Think at each level.** Write results to feature files using `fractal-feature-template.md`.

### 5c. Feature deepening — Should Haves (lighter touch)

Level 1 (sub-features) only with Deep Think. Full treatment deferred to `/create-prd`.

---

### Propose next step

Proceed to `/ideate-validate` for exhaustion check, constraint exploration, and vision compilation.

> If standalone, surface via `notify_user`. If from parent `/ideate`, natural handoff.
