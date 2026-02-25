---
description: Create or update Layer 1 architecture spec — interactions, contracts, data models, RBAC, event schemas
pipeline:
  position: 4
  stage: specification
  predecessors: [decompose-architecture]
  successors: [write-be-spec, write-fe-spec] # parallel fork
  skills: [resolve-ambiguity, database-schema-design, error-handling-patterns, technical-writer]
  calls-bootstrap: true # may introduce new contracts/patterns
---

// turbo-all

# Write Architecture Spec (IA Shard)

Fill in a skeleton IA shard with full interaction details, data models, access control, and edge cases.

**Input**: A skeleton IA shard from `/decompose-architecture`
**Output**: Complete IA shard ready for BE spec writing

> **Process model**: This workflow is collaborative and iterative. Each section
> is drafted, presented to the user for discussion, and refined before moving on.
> After all sections are drafted, multiple deepening passes catch edge cases that
> only become visible in the context of the complete picture. The shard is not done
> until both the agent and the user agree it's deep enough for a developer to
> implement without asking a single clarifying question.

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

## 8. Iterative deepening passes

> **Why multiple passes**: Each pass reveals edge cases that are only visible in
> the context of the complete draft. The first pass catches obvious gaps. The second
> catches interactions between sections that create new edge cases. The third catches
> the subtle "what if" scenarios that only emerge after you've been staring at the
> full picture. Every pass makes the subsequent pass more productive.

### Pass 1: Cross-section consistency

Re-read the complete draft (interactions + contracts + data model + access control + edge cases together) and look for:
- Interactions that reference data fields not in the schema
- Access rules that don't cover all interaction types
- Edge cases that imply missing error codes in contracts
- Event schemas that carry fields not in the data model

Fix every inconsistency found. Present findings to the user.

### Pass 2: "What if" scenarios

For each interaction, ask:
- What if the user does this twice?
- What if the user does this and then immediately does that?
- What if the input is technically valid but semantically nonsensical?
- What if the dependent service is slow/down/returns unexpected data?
- What if the user's role changes mid-operation?

Add any new edge cases, error codes, or access rules discovered. Present findings to the user.

### Pass 3: Adversarial thinking

Put on the attacker hat:
- How could someone abuse this feature? (Rate limiting, data scraping, privilege escalation)
- How could someone bypass the access control? (Direct API calls, parameter tampering, timing attacks)
- How could someone use this to access another user's data?
- How could a junior account bypass age restrictions through this domain?

Add any new security edge cases or access rules. Present findings to the user.

### Additional passes

If any pass produces significant new content, do another pass — the new content
may reveal further edge cases. Stop when a pass produces no meaningful additions.

## 9. Write the spec to `docs/plans/ia/[shard-name].md`

Replace the skeleton sections in `docs/plans/ia/[shard-name].md` with the full content from all passes. Ensure all cross-shard dependencies are bidirectional.

## 10. Update IA index

Change the shard's status from 🔲 to ✅ in `docs/plans/ia/index.md`.

## 11. Update spec pipeline

Read `.agent/skills/session-continuity/protocols/08-spec-pipeline-update.md` and follow the **Spec Pipeline Update Protocol**
to mark this shard's IA column as complete in `.agent/progress/spec-pipeline.md`.

## 11.5. Bootstrap Tech Stack Skills (if applicable)

If the shard you just completed is `00-architecture-design.md` (which definitively chooses the project's tech stack):
Read `.agent/workflows/bootstrap-agents.md` and execute its utility instructions immediately to fill placeholders and provision skills based on the finalized tech stack.

## 12. Ambiguity gate

Read `.agent/skills/session-continuity/protocols/ambiguity-gates.md` and run the **Ambiguity Gates**:

- **Micro**: Walk each feature, interaction, data model field, access rule, and edge case.
  Would an implementer need to guess about any of them? If yes — fix it now.
- **Macro**: Would the BE spec writer need to guess anything from this IA shard?
  If yes — fix it now. The shard is not done until the downstream phase can work
  from it without assumptions.

## 13. Optional: Full ambiguity audit

For a comprehensive scored report across the completed IA layer, run `/audit-ambiguity`.
This is optional but recommended before moving to BE specs.

## 14. Request review and propose next steps

You may only notify the user of completion if you have completed the Cross-Reference check, the Dependency Graph validation, and the Ambiguity gate.

Use `notify_user` to present the completed IA shard for review. Your message MUST include:
1. **The shard created** (link to the file)
2. **Cross-reference verification** (confirmation that links are bidirectional)
3. **Ambiguity Gate confirmation** (confirmation that no implementer would need to guess)
4. **The Pipeline State** (propose the next task from the options below)

Read `.agent/progress/spec-pipeline.md` to determine the pipeline state, then propose the appropriate next step:

- **More skeleton shards remain** → "Next: Run `/write-architecture-spec` for shard [next-shard-number]"
- **All IA shards complete** → "Next: Run `/audit-ambiguity ia` to validate the full IA layer before moving to BE specs"
- **Self-audit found unresolvable issues** → Present the issues for discussion before proposing next step
