---
description: Recursive breadth-before-depth domain exploration with Deep Think protocol for the ideate workflow
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

Explore domains through recursive breadth-before-depth with the Deep Think protocol. Write directly to domain files — no monolithic intermediary.

**Prerequisite**: If invoked standalone, verify `docs/plans/ideation/ideation-index.md` exists with at least the folder structure seeded. If not, prompt the user to run `/ideate-extract` first.

---

## 3. Domain Exploration — Recursive Model

Read `.agent/skills/idea-extraction/SKILL.md` and follow its Recursive Domain Exhaustion Protocol and Deep Think Protocol.

Read the `## Expansion Mode` section from `docs/plans/ideation/ideation-index.md` and route accordingly. All findings are written to the appropriate files in `docs/plans/ideation/` in real time — not held in context.

### Full Mode (recommended for 3+ domains)

#### Level 0 — Global Domain Map

1. Read `ideation-index.md` for currently identified domains
2. Apply the idea-extraction skill's Deep Think Protocol:
   - "Based on this product type and industry, what domains would I expect to see that haven't been mentioned?"
   - Present hypotheses to user for confirmation or rejection
3. For each confirmed domain, create a domain file in `domains/` using the `ideation-domain-template.md`
4. Note preliminary cross-cuts: "Domain A might touch Domain B because [reason]" → add to `cross-cuts/cross-cut-ledger.md` as **Level 0** entries
5. Update `ideation-index.md` with the complete domain map
6. **Gate**: Present complete domain map to user. Get confirmation before Level 1.

#### Level 1 — Domain Breadth Sweep

For each domain (dependency order — foundational first):

1. List all sub-areas/capabilities within the domain
2. **Deep Think**: "Based on this domain in this industry, what sub-areas would an expert expect that haven't been mentioned?" Present hypotheses.
3. Write the breadth map to the domain file. Mark each sub-area as `[SURFACE]`.
4. Note cross-cuts at sub-area level → add to ledger as **Level 1** entries
5. **NEW DOMAINS DISCOVERED?** → Create domain file, update index, loop back to Level 0 for the new domain. Do NOT proceed until domain map is stable.
6. Mark domain status as `[BREADTH]` in the index
7. **Gate**: Pause after EACH domain's breadth map. "Here's what I mapped for [Domain]. Anything missing?" Then after ALL domains: "All domains are at BREADTH. Ready to drill?"

#### Level 2+ — Vertical Drilling

For each domain (dependency order), for each sub-area:

1. Apply the idea-extraction skill's Exhaustion Questions (entity, feature, user, integration)
2. **Deep Think** per sub-area:
   - "Based on this feature in this product, what edge cases, interactions, and failure modes would a production system need?"
   - "Based on cross-domain knowledge already captured, does this sub-area need something because of how it connects to other domains?"
   - Present hypotheses to user
3. Write drill results to the domain file under the appropriate sub-area section
4. Record Deep Think outcomes in the domain file's Deep Think Annotations table
5. Cross-cuts with evidence → add to ledger as **Level 2+** entries with specific evidence
6. **NEW SUB-AREAS DISCOVERED?** → Add to domain file breadth map as `[SURFACE]`, complete breadth mapping first, THEN drill
7. **NEW DOMAINS DISCOVERED?** → Create domain file, update index, loop back to Level 0
8. When Deep Think yields zero new hypotheses AND user confirms → mark sub-area `[EXHAUSTED]`
9. When all sub-areas are `[DEEP]` or `[EXHAUSTED]` → mark domain `[DEEP]` or `[EXHAUSTED]` in index
10. **Gate**: Pause after each domain is drilled. "Here's what I captured for [Domain]. Anything missing?"

#### Cross-Cut Synthesis (Continuous)

Cross-cuts are NOT a separate pass. They are identified and synthesized continuously. However, after all domains reach `[DEEP]`, do a final review:

1. Read `cross-cuts/cross-cut-ledger.md` for all accumulated entries
2. For any pairs still at `pending` status, ask the five synthesis questions:
   - Shared state conflict — who owns the entity? merge strategy?
   - Trigger chain — does A trigger B? rollback if B fails? sync/async?
   - Permission intersection — does permission in A affect B?
   - Notification fan-out — does event in A notify actors in B?
   - State transition conflict — can A and B race? consistency impact?
3. Document confirmed interactions with outcomes in the ledger
4. Discard rejected pairs with a one-line reason
5. Check for **second-order cross-cuts**: "Now that we've confirmed these interactions, do any of the CONFIRMED pairs themselves cross-cut each other?"

### Vertical Mode

Focus on existing domains. Identify shallowest sub-areas. Drive to Level 2+ depth with Deep Think active. Cross-cut watch active — surface candidates in ledger. Do not introduce new domains unless user requests.

### Horizontal Mode

Audit for missing domains with Deep Think. Present gap list. Create domain files for confirmed new domains with Level 1 exploration. Cross-cut watch active for new domains vs existing. Offer to continue with vertical drilling after.

### Cross-cutting Mode (standalone)

Read all domain files, identify interaction points. For each significant pair, ask the five synthesis questions. Document confirmed interactions in ledger. Note: works best after vertical drilling.

### Combination Mode

User specifies sequence. Apply each mode in order. Cross-cut detection always active.

### As-is Mode

Skip active expansion. Proceed to exhaustion check. Cross-cut watch still active — scan domain files for obvious interaction points and surface candidates in ledger before proceeding.

> **Mid-session mode switching**: If you want to change expansion direction, update the `Expansion Mode` in `ideation-index.md` and re-run `/ideate-discover`.

---

## 4. Problem exploration

Read `.agent/skills/brainstorming/SKILL.md` and follow its structured facilitation methodology.

Using the idea-extraction skill's approach for the selected mode, explore:

1. **What problem are we solving?** — Get the user to articulate the core pain point in one sentence. If they can't, help them sharpen it. Write to `meta/problem-statement.md`.
2. **Who has this problem?** — Identify 2-4 distinct user personas with different needs. For each persona, explore all 6 required fields. Write to `meta/personas.md`.
3. **How are they solving it today?** — Understand the competitive landscape and current workarounds. Write to `meta/competitive-landscape.md`.
4. **Why now?** — What has changed that makes this solvable/valuable now. Write to `meta/problem-statement.md` under the "Why Now" section.

After each answer, summarize what you've captured and ask the user to confirm before moving on.

**Persona completeness gate (Ideation Rubric Dimension 2):** For each persona, verify all 6 fields are explicitly present before moving on:
1. **Name + specific role** — not "a user" or "customers"; a named role with context
2. **Specific pain point** — one sentence naming the exact friction
3. **Current workaround** — how they solve this today: the specific tool, process, or coping mechanism
4. **Success criteria** — what "solved" concretely looks like for this persona; measurable if possible
5. **Switching trigger** — what would make them switch from their current approach
6. **At least one edge case or constraint unique to this persona**

If any field is absent → probe for it before proceeding. Do not move to feature collection until all personas have all 6 fields. Reference: `.agent/skills/pipeline-rubrics/references/ideation-rubric.md` Dimension 2.

---

## 5. Feature inventory — deep exploration

This is where most ideation workflows fail. They collect a feature list and move on. This workflow explores each feature using the recursive model and Deep Think.

### 5a. Feature collection (MoSCoW)

Read `.agent/skills/brainstorming/SKILL.md` and follow its methodology.

For each persona identified in Step 4, brainstorm features:

1. **Must-have features** — What features are launch-blocking?
2. **Should-have features** — What features are expected but not day-one critical?
3. **Could-have features** — What features would delight but can be deferred?
4. **Won't-have (now)** — What is explicitly out of scope?

**Deep Think**: "Based on the personas and problem statement, what features would I expect to see in the Must Have list that haven't been mentioned? For example, in similar products, [examples]."

Write the MoSCoW matrix to `ideation-index.md` under the MoSCoW Summary section. Each feature links to its domain file.

> **Note:** Deferred ≠ lower quality. Every feature that makes the cut will be built to production standard.

### 5b. Feature deepening — Must Haves

For each **Must Have** feature, use the recursive model:

1. **Level 1: Sub-features.** What are the component parts of this feature?
   - "User authentication" → signup, login, password reset, profile management, account deletion, session management, OAuth providers

2. **Level 2: Edge cases and failure modes.** For each sub-feature:
   - What happens on failure? What error does the user see?
   - What happens on partial failure? (network drops mid-operation)
   - What permissions are required?
   - What are the states? (loading, empty, populated, error)

3. **Level 3 (complex features): Interactions and conflicts.**
   - How does this feature interact with other Must Haves?
   - What if two features trigger simultaneously?
   - Are there any conflicts between features?

**Deep Think at each level**: "Based on this feature in production systems, what am I missing? What breaks in the real world?"

Write all drilling results to the appropriate domain files.

### 5c. Feature deepening — Should Haves (lighter touch)

For Should Have features, explore Level 1 (sub-features) only with Deep Think. Note that these will get full Level 2-3 treatment in `/create-prd` when they enter scope.

---

### Propose next step

Once the feature inventory is complete and the user has confirmed the MoSCoW matrix, proceed to `/ideate-validate` to check exhaustion, explore constraints, and compile the vision summary.

> If this shard was invoked standalone (not from `/ideate`), surface this via `notify_user`. If invoked by the parent `/ideate`, this is a natural handoff — the parent orchestrates the transition.
