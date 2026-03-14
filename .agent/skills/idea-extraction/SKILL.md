---
name: idea-extraction
description: "Exhaustive idea extraction through recursive breadth-before-depth exploration with Deep Think protocol. Use during /ideate to transform raw ideas — whether richly documented, lightly sketched, or entirely in the user's head — into comprehensive, structured ideation output. Writes directly to the ideation/ folder structure — one domain file per domain, no monolithic intermediary."
---

# Idea Extraction — Exhaustion Engine

## Philosophy

> This pipeline does not build MVPs. It does not produce shallow specs. It does not
> create technical debt by rushing past the ideation phase. The ideation phase is where
> the entire downstream pipeline gets its DNA — if the ideation is shallow, every spec,
> every architecture decision, every line of code downstream will be shallow too.

This skill is an **exhaustion engine** designed to extract every ounce of product vision
from the user. Your job is not to collect answers. Your job is to **generate new thinking**
in the user by asking questions they haven't considered, exploring edges they haven't
mapped, and helping them make decisions they haven't faced yet.

The **Deep Think Protocol** is the core mechanism: at every step, you actively reason
about what *should* exist based on domain knowledge, industry patterns, and cross-domain
interactions — then present hypotheses to the user for confirmation or rejection.

---

## Output Structure

This skill writes directly to the `docs/plans/ideation/` folder. No monolithic
intermediary file.

```
docs/plans/ideation/
├── ideation-index.md              ← Pipeline key file — domain map + document map
├── meta/
│   ├── problem-statement.md
│   ├── personas.md
│   ├── competitive-landscape.md
│   └── constraints.md
├── domains/
│   ├── 01-domain-slug.md          ← One file per domain
│   └── ...
└── cross-cuts/
    └── cross-cut-ledger.md        ← Running ledger accumulated at every level
```

Templates for each file type are in `.agent/skills/prd-templates/references/ideation-*.md`.

---

## Input-Adaptive Modes

Before starting, classify what the user has provided and select the right mode.

### Extraction Mode — Rich Input

**Trigger:** User provides substantial existing material (>5KB, detailed docs, chat logs,
design conversations, competitor analysis, previous specs, old ideation.md files).

**The job:** Don't lose information. The user has already done deep thinking — your job is
to organize it, validate it, and fill gaps.

**Process:**
1. Read/ingest every document provided
2. Identify natural domain boundaries in the content
3. Create the `ideation/` folder structure: one domain file per identified domain
4. Seed each domain file with the relevant content from the source
5. Present the organized inventory: "Here's what I extracted, organized by domain: [list]. Is anything missing?"
6. Identify gaps — domains or sub-topics not covered by the existing material
7. For each gap, switch to Interview Mode for that topic
8. Run Deep Think: "Based on the content you provided, I would also expect to see [X] and [Y]. Are those relevant?"
9. Validate completeness against the domain map in `ideation-index.md`

**Anti-patterns:**
- ❌ Summarizing 738KB into 70 lines (lossy compression)
- ❌ Ignoring details because they don't fit the template
- ❌ Re-asking questions the material already answers
- ❌ Writing everything to one file then reorganizing later
- ✅ Preserving depth, writing to domain files as you go, filling gaps

### Expansion Mode — Thin Input

**Trigger:** User provides brief notes, a rough sketch, a short PRD (<5KB, structured but shallow).

**The job:** Take what's there and systematically deepen it. Every bullet point in their
input should spawn 3-5 follow-up questions that drive toward implementation depth.

**Process:**
1. Read the input and identify domain boundaries
2. Create domain files for each identified area
3. For each domain, identify the depth level (surface → detailed → implementation-ready)
4. Start with the shallowest domains first
5. For each shallow domain, ask targeted deepening questions
6. Run Deep Think at each level to identify gaps
7. Update domain files and index as you go

**Deepening questions by section type:**
- **Feature mentioned without detail:** "You listed [feature]. Help me understand: What does the user see? What happens when they interact with it? What happens when it fails? What data does it need?"
- **User type without specifics:** "You mentioned [user type]. What's their primary workflow? What frustrates them about existing solutions? What would make them switch?"
- **Constraint without numbers:** "You noted [constraint]. Can we put a number on that? For latency — what's the threshold? For budget — what's the monthly ceiling?"

### Interview Mode — No Input / One-Liner

**Trigger:** User has no file input. They describe the idea verbally or provide a
one-liner like "I want to build a repair shop management platform."

**The job:** Be the relentless interviewer. Extract everything from the user's head through
persistent, deep questioning.

**Process:**
1. Start: "In one sentence, what problem does this solve and for whom?"
2. From that sentence, identify key nouns — these become initial domains
3. Create domain files for each identified domain
4. Run the Recursive Domain Exhaustion Protocol (below)
5. Use the decision classification rule to route questions appropriately
6. Don't stop until the deep think protocol generates zero new hypotheses

**Interview techniques:**
- **Challenge weak answers:** "You mentioned risk management — what happens when a user hits their position limit? What's the escalation path?"
- **Generate new thinking:** "You've described [A] and [B] — what happens when they interact? If A triggers while B is active, what should the system do?"
- **Make them think about failures:** "What's the worst thing a user could do with [feature]?"
- **Help them decide:** When the user says "I'm not sure," present 2-3 options with trade-offs.

---

## Deep Think Protocol

> **This is the core behavioral change.** At every step of ideation, you actively reason
> about what should exist — you don't just record what the user says.

### The Protocol

At **every step** — domain discovery, breadth mapping, vertical drilling — pause and
ask yourself these four questions before moving on:

1. **What have I captured so far in this domain/sub-area?**
   Quick inventory of what's been discussed.

2. **What would a domain expert expect to see here that hasn't been surfaced?**
   Based on the product type, industry, and user personas — what's standard in this
   space that we haven't discussed? What would a competitor's feature list include?

3. **What should exist here because of interactions with other domains?**
   Based on cross-domain knowledge already captured — does this domain need something
   because of how it connects to other domains?

4. **What common failure modes or edge cases are missing?**
   Based on production systems in similar industries — what breaks? What do users
   complain about? What do post-mortems reveal?

### Presenting Hypotheses

For each hypothesis generated, present it to the user:

> "Based on [reasoning], I think [X] might be relevant here. For example, in similar
> systems, [concrete example]. Is this something your product needs?"

**Outcomes:**
- **CONFIRMED** → Add to the domain file. Drill into it.
- **REJECTED** → Note the rejection with reason in the domain file's Deep Think table. Move on.
- **DEFERRED** → Note as an open question with owner and target stage.

### Tracking

Record all hypotheses in each domain file's Deep Think Annotations table:

```
| Hypothesis | Source | Outcome |
|-----------|--------|---------|
| "Purgatory queue needed for diagnostics not yet tied to a ticket" | Industry pattern | ✅ CONFIRMED |
| "Customer loyalty program integration" | Competitor analysis | ❌ REJECTED: out of scope |
```

### Exhaustion Signal

**The ideation process is considered complete for a domain when:**
1. Deep Think generates **zero new hypotheses** after a full pass
2. The user confirms "nothing else" for that domain
3. Both conditions must be true simultaneously

This replaces the old "completed N passes" model. Exhaustion is evidence-based,
not count-based.

---

## Recursive Domain Exhaustion Protocol

> **This protocol replaces the old fixed-pass model.** Exploration is recursive:
> breadth is always mapped before depth, and new discoveries at any level can trigger
> re-exploration of higher levels.

### Level 0 — Global Domain Map

**Goal:** Identify ALL domains before exploring ANY of them.

1. List all domains from the user's input
2. **Deep Think:** "Based on this product type and industry, what domains would I expect to see that haven't been mentioned?" Present hypotheses to user.
3. Create a domain file for each confirmed domain (using the ideation-domain-template)
4. Update `ideation-index.md` with the complete domain map
5. Note preliminary cross-cuts: "Domain A might touch Domain B because [reason]" → add to ledger as Level 0 entries
6. **Gate:** User confirms the domain list before proceeding

### Level 1 — Domain Breadth Sweep

**Goal:** For each domain, map ALL sub-areas before drilling into ANY of them.

For each domain (dependency order — foundational first):
1. List all sub-areas/capabilities within the domain
2. **Deep Think:** "Based on this domain in this industry, what sub-areas would an expert expect?" Present hypotheses.
3. Write the breadth map to the domain file with `[SURFACE]` markers
4. Note cross-cuts at sub-area level → add to ledger as Level 1 entries
5. **NEW DOMAINS DISCOVERED?** → Loop back to Level 0. Do NOT proceed until domain map is stable.
6. **Gate:** User confirms the breadth maps before proceeding to drilling
7. Mark domain status as `[BREADTH]` in the index

### Level 2+ — Vertical Drilling

**Goal:** Drill each sub-area to implementation depth. Deep Think at every step.

For each sub-area:
1. Apply the entity/feature/user/integration questions (see Exhaustion Questions below)
2. **Deep Think** per sub-area: "Based on this feature in this product, what edge cases, interactions, and failure modes would a production system need?"
3. Write drill results to the domain file
4. Cross-cuts with evidence → add to ledger as Level 2+ entries with evidence
5. **NEW SUB-AREAS DISCOVERED?** → Loop back to Level 1 for this domain. Map the new sub-area's breadth before drilling it.
6. **NEW DOMAINS DISCOVERED?** → Loop back to Level 0. Stabilize the domain map first.
7. When Deep Think yields zero new hypotheses AND user confirms → mark sub-area as `[EXHAUSTED]`
8. When all sub-areas are `[DEEP]` or `[EXHAUSTED]` → mark domain as `[DEEP]` or `[EXHAUSTED]`

### Status Markers

| Marker | Meaning |
|--------|---------|
| `[SURFACE]` | Identified, not yet explored |
| `[BREADTH]` | All sub-areas mapped, none drilled |
| `[DEEP]` | Sub-areas drilled, some may still have open questions |
| `[EXHAUSTED]` | Deep Think yields zero hypotheses, user confirms complete |

---

## Exhaustion Questions

### For Every Entity

- What are its attributes/fields?
- What are its possible states?
- What transitions between states? What triggers each transition?
- What's the full lifecycle (creation → active use → archival/deletion)?
- Who can create, read, update, delete it?
- What happens when it's referenced by other entities and gets deleted?

### For Every Feature

- What does the user see when they first encounter this feature?
- What's the happy path interaction flow (step by step)?
- What happens when it fails? What error does the user see?
- What happens on partial failure (e.g., network drops mid-operation)?
- What permissions are required? What happens without them?
- Does it have different states (loading, empty, populated, error)?
- How does it interact with other features?
- What edge cases exist? (concurrent edits, duplicate submissions, boundary values)

### For Every User Type

- What's their primary workflow through the product?
- What's the worst thing they could intentionally do? How is it prevented?
- What's the worst thing they could accidentally do? How is it recovered?
- What do they see that other user types don't?
- What can they do that other user types can't?
- What's their tolerance for complexity? (progressive disclosure implications)

### For Every Integration / External System

- What happens when it's unavailable? (retry? fallback? degrade gracefully?)
- What's the expected latency? What if it's 10x slower than expected?
- What data format does it use? How does the product transform it?
- What rate limits exist? How does the product handle hitting them?
- What happens when the external system changes its API?

---

## Cross-Cut Watch Protocol

Cross-cut detection is **always-on** regardless of mode or level. During all active
exploration, maintain awareness:

- After each sub-feature: "Does this behavior depend on or affect any other domain?"
- After each edge case: "Which other parts of the system need to know about this failure mode?"
- After each state transition: "Does this state change trigger anything in another domain?"

When a cross-cut is identified, immediately log it to `cross-cuts/cross-cut-ledger.md`
at the appropriate level:

- **Level 0** (during domain map): surface guesses, low confidence
- **Level 1** (during breadth sweep): sub-domain connections, medium confidence
- **Level 2+** (during drilling): evidence-backed, high confidence

### Cross-Cut Synthesis Questions

For each confirmed cross-cut pair, ask all five questions:

1. **Shared state conflict**: If both features write to the same entity, who wins? Merge/override strategy? Canonical owner?
2. **Trigger chain**: Does A automatically trigger B? Rollback semantics if B fails? Sync or async?
3. **Permission intersection**: Does permission in Domain A affect what's possible in Domain B?
4. **Notification fan-out**: Does an event in A need to notify actors in B? Who owns the notification contract?
5. **State transition conflict**: Can A and B be triggered simultaneously? Data consistency if they race?

Record synthesis outcomes in the cross-cut ledger. Never clear entries — the ledger is the audit trail.

---

## Domain Coverage Map

Throughout the conversation, maintain and periodically share a coverage map. The format
uses level-based status with sub-area counts:

```
Domain Coverage Map — [Project Name]
═══════════════════════════════════════

Domain 01: Consumer Platform [DEEP]
  ├── Intake Flow [EXHAUSTED] — 12 sub-topics, 4 hypotheses confirmed
  ├── Customer Portal [DEEP] — 8 sub-topics, 2 hypotheses confirmed
  └── Payments [BREADTH] — 5 sub-areas mapped, not yet drilled

Domain 02: Shop Software [BREADTH]
  ├── Counter Mode [DEEP] — 8 sub-topics, 3 hypotheses confirmed
  ├── Tech Mode [SURFACE] — 2 sub-topics noted
  ├── Inventory [EXHAUSTED] — 15 sub-topics, 0 new hypotheses
  └── Multi-Location [SURFACE] — 1 sub-topic noted

Overall: 7 domains | 2 EXHAUSTED, 3 DEEP, 1 BREADTH, 1 SURFACE
Deep Think: 23 hypotheses presented, 18 confirmed, 5 rejected
Cross-cuts: 12 confirmed, 4 pending, 3 rejected
```

**Rules:**
- Share the map after every domain or every 3-4 drilling sequences
- Use it to guide: "Domain 02 has 2 sub-areas still at SURFACE. Should we drill those?"
- Write the coverage map to `ideation-index.md` after each update
- Don't compile the vision summary until all domains are at least `[DEEP]`

---

## Decision Routing During Extraction

| Decision Type | During Ideation | Example |
|---|---|---|
| **Product** | Ask the user. It's their product. | "Should free users be able to...?" |
| **Architecture** | Note for `/create-prd`. Don't burden the user. | "Should we use SQL or NoSQL?" |
| **Implementation** | Note for later. Don't even mention it. | "How should we name the routes?" |

**Exception:** If the user brings up architecture or implementation, engage with it.
Don't refuse to discuss it — just don't initiate it.

---

## Breadth Before Depth

### No Premature Drilling

Complete the breadth map of all sub-areas within a domain **before drilling any
single sub-area**. This ensures no sub-area is missed because you went deep too early.

### No Premature Compilation

Don't start writing the vision summary until:
- All domains are at least `[DEEP]`
- Every Must Have feature explored to ≥Level 2 (sub-features and failure modes)
- Deep Think yields zero new hypotheses across ALL domains
- User has confirmed the domain coverage map

### Challenge Weak Answers

When the user gives a one-sentence answer to a complex question, don't accept it. Probe:

- **Weak:** "Yeah, we need notifications."
- **Probe:** "What kinds of notifications? Just in-app, or also email and push? What events trigger them? Can users configure which ones they receive? What happens with notification overload?"

### Summarize and Validate

After every 5-6 questions, pause and summarize:
- "Here's what I've captured about [topic] so far: [summary]. Does this cover everything?"
- This prevents drift, catches misunderstandings, and creates natural checkpoints.

### Progress Transparency

Be transparent about where you are:
- "We've explored [N] of [M] domains to DEEP level. [Domain X] is still at BREADTH."
- "Deep Think is still generating hypotheses for this domain — we're not done yet."

---

## What This Skill Does NOT Do

- **Does not make product decisions** — It extracts them from the user
- **Does not explore architecture** — That's `/create-prd`'s job
- **Does not replace brainstorming** — Brainstorming is a lightweight modifier for quick decisions; this is a heavyweight extraction engine
- **Does not produce the vision document** — The ideate-validate workflow compiles the summary; this skill drives the conversation that fills the domain files
- **Does not rush** — The entire downstream pipeline depends on the depth produced here
- **Does not write to a monolithic file** — Each domain gets its own file from the moment it's discovered
