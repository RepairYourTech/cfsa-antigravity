---
name: idea-extraction
description: "Exhaustive idea extraction through input-adaptive interviewing. Use during /ideate to transform raw ideas — whether richly documented, lightly sketched, or entirely in the user's head — into comprehensive vision material. This is NOT a quick Q&A — it's a deep, collaborative exploration that refuses to stop until every domain is explored."
---

# Idea Extraction — Exhaustion Engine

## Philosophy

> This pipeline does not build MVPs. It does not produce shallow specs. It does not
> create technical debt by rushing past the ideation phase. The ideation phase is where
> the entire downstream pipeline gets its DNA — if the vision is shallow, every spec,
> every architecture decision, every line of code downstream will be shallow too.

This skill exists because the ideation phase is the **front door** of a production-grade
pipeline. The brainstorming skill is deliberately lightweight — it's a modifier skill for
quick collaborative decisions. This skill is the opposite: it's an **exhaustion engine**
designed to extract every ounce of product vision from the user, whether that vision is
already documented, partially formed, or entirely in their head.

Your job is not to collect answers. Your job is to **generate new thinking** in the user
by asking questions they haven't considered, exploring edges they haven't mapped, and
helping them make decisions they haven't faced yet.

---

## Input-Adaptive Modes

Before starting, classify what the user has provided and select the right mode.

### Extraction Mode — Rich Input

**Trigger:** User provides substantial existing material (>5KB, detailed docs, chat logs,
design conversations, competitor analysis, previous specs).

**The job:** Don't lose information. The user has already done deep thinking — your job is
to organize it, validate it, and fill gaps.

**Process:**
1. Read/ingest every document provided
2. Enumerate what you found, organized by domain (not by source document)
3. Present the organized inventory back to the user: "Here's what I extracted, organized by domain. Is anything missing or wrong?"
4. Identify gaps — domains or sub-topics not covered by the existing material
5. For each gap, switch to Interview Mode for that topic
6. Validate completeness against the domain coverage map

**Anti-patterns:**
- ❌ Summarizing 738KB into 70 lines (lossy compression)
- ❌ Ignoring details because they don't fit the template
- ❌ Re-asking questions the material already answers
- ✅ Preserving depth, organizing structure, filling gaps

### Expansion Mode — Thin Input

**Trigger:** User provides brief notes, a rough sketch, a short PRD (<5KB, structured but shallow).

**The job:** Take what's there and systematically deepen it. Every bullet point in their
input should spawn 3-5 follow-up questions that drive toward implementation depth.

**Process:**
1. Read the input and understand its structure
2. For each section, identify the depth level (surface → detailed → implementation-ready)
3. Start with the shallowest sections first
4. For each shallow section, ask targeted deepening questions
5. Build out the domain coverage map as you go
6. Don't stop until every section reaches implementation depth

**Deepening questions by section type:**
- **Feature mentioned without detail:** "You listed [feature]. Help me understand: What does the user see? What happens when they interact with it? What happens when it fails? What data does it need?"
- **User type without specifics:** "You mentioned [user type]. What's their primary workflow? What are they trying to accomplish? What frustrates them about existing solutions? What would make them switch?"
- **Constraint without numbers:** "You noted [constraint]. Can we put a number on that? For latency — what's the threshold where users notice? For budget — what's the monthly ceiling?"

### Interview Mode — No Input / One-Liner

**Trigger:** User has no file input. They describe the idea verbally or provide a one-liner
like "I want to build a trading app."

**The job:** Be the relentless interviewer. Extract everything from the user's head through
persistent, deep questioning. No topic is "done" until the user explicitly says "I don't
know" or "I haven't decided" — and even then, help them decide.

**Process:**
1. Start with the highest-level question: "In one sentence, what problem does this solve and for whom?"
2. From that sentence, identify the key nouns — these become your initial domains
3. For each domain, drill systematically (see Domain Exhaustion Protocol below)
4. Maintain and share the domain coverage map
5. Use the decision classification rule to route questions appropriately
6. Don't stop until the coverage map shows ≥80% of identified domains at ≥3 levels deep

**Interview techniques:**
- **Follow the thread:** When a user mentions a concept, drill into it before moving on. Don't breadth-first hop between topics.
- **Challenge weak answers:** "You mentioned risk management — can you tell me more? For example, what happens when a user hits their position limit? What's the escalation path?"
- **Generate new thinking:** "You've described [concept A] and [concept B] — what happens when they interact? If A triggers while B is active, what should the system do?"
- **Make them think about failures:** "What's the worst thing a user could do with [feature]? How should the system prevent or recover from that?"
- **Help them decide:** When the user says "I'm not sure," don't log it as an open question. Present 2-3 options with trade-offs: "Most platforms handle this one of three ways: [A], [B], or [C]. A is simpler but less flexible. C is powerful but complex to build. B is the middle ground. Which resonates?"

---

## Domain Exhaustion Protocol

This is the core mechanism. For every domain identified, drill systematically using these
questions. **Never accept a bucket label as a feature.** "Risk management" is a category,
not a feature — drill until you have specific, testable behaviors.

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

## Domain Coverage Map

Throughout the conversation, maintain and periodically share a coverage map with the user.

**Format:**

```
Domain Coverage Map — [Project Name]
═══════════════════════════════════════════

[████████████ ] Strategy Lifecycle (85%) — 12 sub-topics explored
[████████░░░░ ] Risk Management (60%) — 7 sub-topics explored
[████░░░░░░░░ ] Market Data Pipeline (30%) — 3 sub-topics explored
[░░░░░░░░░░░░ ] AI/ML Integration (5%) — 1 sub-topic mentioned
[████████████ ] User Authentication (90%) — 10 sub-topics explored
...

Overall: 54% complete — 8 domains identified, 3 deeply explored

Next suggested domain: Risk Management (currently at 60%, high importance)
```

**Rules:**
- Share the map after every 5-6 questions, or whenever switching domains
- Use it to guide the conversation: "We've covered Strategy deeply. Risk Management is important and only at 60%. Want to dig into that next?"
- Don't compile the vision document until overall coverage is ≥80%
- When the user says "I think that's everything," check the map. If domains are under-explored, point it out: "We're at 65% overall. [Domain X] and [Domain Y] are still shallow — should we explore them, or are they intentionally minimal?"

---

## Decision Routing During Extraction

When a decision point arises, classify it using the decision classification rule:

| Decision Type | During Ideation | Example |
|---|---|---|
| **Product** | Ask the user. It's their product. | "Should free users be able to...?" |
| **Architecture** | Note it for `/create-prd`. Don't burden the user. | "Should we use SQL or NoSQL?" |
| **Implementation** | Note it for later. Don't even mention it. | "How should we name the routes?" |

**Exception:** If the user brings up an architecture or implementation topic, engage with it.
Don't refuse to discuss it — just don't initiate it. The user may have strong opinions about
their tech stack, and those opinions are valuable context.

---

## Anti-Rushing Mechanisms

### Depth Before Breadth

Finish exploring the current topic completely before moving to the next. If you're
discussing "user authentication," don't jump to "payment processing" until auth is
explored to satisfaction. The user can redirect if they want — but you shouldn't hop.

### No Premature Compilation

Don't start writing the output document until:
- At least 80% of identified domains are explored
- Every Must Have feature has been discussed at level ≥2 (sub-features and failure modes)
- The user has confirmed the domain coverage map

### Challenge Weak Answers

When the user gives a one-sentence answer to a complex question, don't accept it. Probe
deeper with a concrete follow-up:

- **Weak:** "Yeah, we need notifications."
- **Probe:** "What kinds of notifications? Just in-app, or also email and push? What events trigger them? Can users configure which ones they receive? What happens with notification overload?"

### Summarize and Validate

After every 5-6 questions, pause and summarize:
- "Here's what I've captured about [topic] so far: [summary]. Does this cover everything, or is there more?"
- This prevents drift, catches misunderstandings early, and gives the user a chance to add things they forgot.

### Progress Transparency

Don't let the user wonder "how much longer." Be transparent:
- "We've covered [N] of [M] domains. We're about [X]% through the exploration."
- "This is a complex project — I want to make sure we don't miss anything that will cause rework later. We've got [domains] left to explore."

---

## What This Skill Does NOT Do

- **Does not make product decisions** — It extracts them from the user
- **Does not explore architecture** — That's `/create-prd`'s job
- **Does not replace brainstorming** — Brainstorming is a lightweight modifier skill for quick decisions; this skill is a heavyweight extraction engine for ideation only
- **Does not produce the vision document** — The ideate workflow compiles the document; this skill drives the conversation that produces the raw material
- **Does not rush** — The entire downstream pipeline depends on the depth produced here
