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
---

// turbo-all

# Write Architecture Spec — Design

Explore requirements, map all interactions, and define contracts, data models, access control, event schemas, and edge cases.

**Prerequisite**: Skeleton IA shard must exist in `docs/plans/ia/`. If it does not, tell the user to run `/decompose-architecture` first.

---

## 1. Explore requirements

Use the **brainstorming** skill (`.agent/skills/brainstorming/SKILL.md`) to clarify the scope of this shard:
- What user interactions exist?
- What data flows between surfaces?
- What permissions model is needed?

## 2. Map all interactions

For each feature in the shard, document:
- User action → API call → data mutation → response
- Which surfaces are involved (public, dashboard, admin, API)
- What events are emitted
- Error states and edge cases

**Present to user**: Show the interaction map and ask:
- "Does this capture all the ways a user touches this domain?"
- "Are there admin/system-initiated actions I'm missing?"
- "What happens in each failure case?"

Refine based on discussion before proceeding.

## 3. Define contracts

For each interaction, define the contract shape:
- Request shape (params, query, body)
- Response shape (all fields typed)
- Error shape (specific error codes)
- Note: actual Zod schemas written in BE spec phase

**Present to user**: Show the contract shapes and ask:
- "Are there fields I'm missing from these requests/responses?"
- "Are these error codes specific enough?"

Refine based on discussion before proceeding.

## 4. Design data models

Using `{{DATABASE_SKILL}}`, and loading these community skills for guidance:
- `.agent/skills/database-schema-design/SKILL.md` — Schema design principles
- `.agent/skills/error-handling-patterns/SKILL.md` — Error categories for contracts
- `.agent/skills/technical-writer/SKILL.md` — Specification clarity
- Tables/collections, fields, types
- Relationships (graph edges, foreign keys, etc.)
- Indexes for query patterns
- Constraints and validation rules

**Present to user**: Show the data model and ask:
- "Does this schema capture everything this domain needs to store?"
- "Are the relationships and cardinalities correct?"
- "Are there derived/computed fields I should account for?"

Refine based on discussion before proceeding.

## 5. Design access control

- Permission matrix (who can read/write/delete what)
- Role-based restrictions
- Age restrictions (if applicable)
- Escalation paths (Guardian, Admin)
- Admin-only operations

**Present to user**: Show the permission matrix and ask:
- "Can you think of a scenario where a user should be blocked that this matrix allows?"
- "Can you think of a scenario where a user should be allowed that this matrix blocks?"

Refine based on discussion before proceeding.

## 6. Design event schemas (if applicable)

- Event name, payload shape, emitter, consumers
- Async vs sync processing
- Retry semantics

## 7. Document edge cases

- Rate limits and abuse scenarios
- Concurrent access handling
- Deletion cascades
- State transition conflicts
- Empty/null states

**Present to user**: Show the edge cases and ask:
- "What's the worst thing a malicious user could try in this domain?"
- "What happens if two users do the same thing at the same time?"
- "What happens when related data is deleted?"

Refine based on discussion before proceeding.

## 8. Present all sections and request approval

Call `notify_user` presenting a summary of all designed sections:
- Interaction map (Step 2)
- Contracts (Step 3)
- Data models (Step 4)
- Access control (Step 5)
- Event schemas if applicable (Step 6)
- Edge cases (Step 7)

> **Do NOT proceed to `/write-architecture-spec-deepen` until the user approves all sections. Proposing next steps is not the same as receiving approval.**

Once approved, run `/write-architecture-spec-deepen`.

> **Note**: The deepen shard will run iterative passes over the approved content — the user does not need to re-approve individual sections during deepening.

