---
description: Iterative deepening passes, spec writing, index updates, and ambiguity gate for the write-architecture-spec workflow
parent: write-architecture-spec
shard: deepen
standalone: true
position: 2
pipeline:
  position: 4.2
  stage: specification
  predecessors: [write-architecture-spec-design]
  successors: [write-be-spec, write-fe-spec]
  skills: [technical-writer, resolve-ambiguity]
  calls-bootstrap: true
---

// turbo-all

# Write Architecture Spec — Deepen & Finalize

Run iterative deepening passes, write the completed spec, update indexes, run the ambiguity gate, and present for review.

**Prerequisite**: All sections must be drafted (from `/write-architecture-spec-design` or equivalent). The agent should have interaction maps, contracts, data models, access control, events, and edge cases designed and user-approved.

---

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

Do NOT proceed to the next step until the user sends a message explicitly approving this output. Proposing next steps is not the same as receiving approval. Wait for explicit approval before continuing.

Read `.agent/progress/spec-pipeline.md` to determine the pipeline state, then propose the appropriate next step:

- **More skeleton shards remain** → "Next: Run `/write-architecture-spec` for shard [next-shard-number]"
- **All IA shards complete** → "Next: Run `/audit-ambiguity ia` to validate the full IA layer before moving to BE specs"
- **Self-audit found unresolvable issues** → Present the issues for discussion before proposing next step
