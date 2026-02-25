---
description: Domain mapping, problem exploration, and feature inventory for the ideate workflow
parent: ideate
shard: discover
standalone: true
position: 2
pipeline:
  position: 1.2
  stage: vision
  predecessors: [ideate-extract]
  successors: [ideate-validate]
  skills: [idea-extraction, resolve-ambiguity]
  calls-bootstrap: false
---

// turbo-all

# Ideate — Discover

Map domains, explore the problem space, and build the feature inventory.

**Prerequisite**: If invoked standalone, verify the user has already classified their input type (via `/ideate-extract` or by providing context). If not, prompt the user to run `/ideate-extract` first or describe what they want to build.

---

## 3. Domain mapping

Before diving into features, enumerate the **domains** of the project. This creates the
coverage map that drives the exhaustion protocol.

**How to identify domains:**
- Parse the user's input (or initial description) for key nouns and concepts
- Group related concepts into domains
- Present the domain list to the user: "Based on what you've described, I see these domains: [list]. Is anything missing?"

**Examples by project type:**
- **Trading platform:** Strategies, Risk Management, Execution, Market Data, AI/ML, Analytics, Portfolio, UI/UX, Infrastructure, Security, Compliance
- **MOBA game:** Heroes, Abilities, Maps, Items, Matchmaking, Progression, Monetization, Social, Anti-cheat, Spectating
- **SaaS platform:** User Management, Billing, Core Product, Integrations, Analytics, Support, Admin/Ops, Security, Compliance

The domain list becomes the coverage map. Track exploration depth for each domain throughout
the conversation.

## 4. Problem exploration

Using the idea-extraction skill's approach for the selected mode, explore:

1. **What problem are we solving?** — Get the user to articulate the core pain point in one sentence. If they can't, help them sharpen it.
2. **Who has this problem?** — Identify 2-4 distinct user personas with different needs. For each persona, explore:
   - Name and role
   - Their primary pain point
   - How they solve it today (workarounds)
   - What success looks like for them
   - What would make them switch from their current solution
3. **How are they solving it today?** — Understand the competitive landscape and current workarounds
4. **Why now?** — What has changed that makes this solvable/valuable now

After each answer, summarize what you've captured and ask the user to confirm before moving on.

**Depth check:** If any persona description is less than 3 sentences, it's too shallow. Probe deeper.

## 5. Feature inventory — deep exploration

This is where most ideation workflows fail. They collect a feature list and move on.
This workflow explores each feature to multiple levels of depth.

### 5a. Feature collection (MoSCoW)

For each persona identified in Step 4, brainstorm features:

1. **Must-have features** — What features are launch-blocking?
2. **Should-have features** — What features are expected but not day-one critical?
3. **Could-have features** — What features would delight but can be deferred?
4. **Won't-have (now)** — What is explicitly out of scope?

Present the MoSCoW matrix to the user for validation.

> **Note:** Deferred ≠ lower quality. Every feature that makes the cut will be
> built to production standard. The categories control *what* ships, not *how well*
> it's built.

### 5b. Feature deepening — Must Haves

For each **Must Have** feature, use the idea-extraction skill's Domain Exhaustion Protocol
to explore at least 2 levels deep:

**Level 1: Sub-features.** What are the component parts of this feature?
- "User authentication" → signup, login, password reset, profile management, account deletion, session management, OAuth providers

**Level 2: Edge cases and failure modes.** For each sub-feature:
- What happens on failure? What error does the user see?
- What happens on partial failure? (network drops mid-operation)
- What permissions are required?
- What are the states? (loading, empty, populated, error)

**Level 3 (for complex features): Interactions and conflicts.**
- How does this feature interact with other Must Haves?
- What if two features trigger simultaneously?
- Are there any conflicts between features?

**Decision routing:** When feature decisions arise, use the decision classification rule:
- Feature inclusion/exclusion → product decision → ask the user
- How to implement the feature → defer to `/create-prd`
- Detailed technical choice → note for later, don't burden the user

### 5c. Feature deepening — Should Haves (lighter touch)

For Should Have features, explore Level 1 (sub-features) only. Note that these will get
full Level 2-3 treatment in `/create-prd` when they enter scope.
