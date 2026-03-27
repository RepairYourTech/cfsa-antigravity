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
  skills: [code-review-pro, resolve-ambiguity, session-continuity, technical-writer]
  calls-bootstrap: true
---

// turbo-all

# Write Architecture Spec — Deepen & Finalize

Run iterative deepening passes, write the completed spec, update indexes, run the ambiguity gate, and present for review.

**Prerequisite**: Read the shard file at `docs/plans/ia/[shard-name].md`. Sections should be filled in from the design shard (not skeleton placeholders).

**Skeleton detection**: If the file contains `<!-- TODO -->` markers, `[TBD]` placeholders, or sections with only a heading and no body text → the design shard has not completed. **STOP**: run `/write-architecture-spec-design` first.

---

## 8. Iterative deepening passes

Read .agent/skills/resolve-ambiguity/SKILL.md for the adversarial and "what if" passes.
Read .agent/skills/code-review-pro/SKILL.md and follow its adversarial review methodology.

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
- **Event consumer cross-references**: For each event's listed consumers, verify the consumer shard exists in `docs/plans/ia/index.md` and its `## Interactions` or `## Event Schemas` section references this event. If a consumer shard doesn't reference the event → add a cross-reference link in both directions. If a consumer shard doesn't exist → **STOP**.

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

Read .agent/skills/code-review-pro/SKILL.md and follow its adversarial review methodology for this pass.

- How could someone abuse this feature? (Rate limiting, data scraping, privilege escalation)
- How could someone bypass the access control? (Direct API calls, parameter tampering, timing attacks)
- How could someone use this to access another user's data?
- How could a junior account bypass age restrictions through this domain?

Add any new security edge cases or access rules. Present findings to the user.

### Additional passes

If any pass produces significant new content, do another pass — the new content
may reveal further edge cases. Stop when a pass produces no meaningful additions.

**Pass loop guard**: Track total pass count.
- Passes 4-5 → normal. Continue if producing meaningful additions.
- **After pass 5** → **STOP**: "5 deepening passes completed. Still producing new content. Present remaining gaps to user: continue deepening or accept current spec depth?"

## 9. Write the spec to `docs/plans/ia/[shard-name].md`

Read .agent/skills/technical-writer/SKILL.md for the spec writing step.

Replace the skeleton sections in `docs/plans/ia/[shard-name].md` with the full content from all passes. Ensure all cross-shard dependencies are bidirectional.

### 9.5. Spec complexity gate

Count the total lines in the written spec file.

| Lines | Action |
|-------|--------|
| **≤ 400** | ✅ Pass — proceed to Step 10 |
| **401–500** | ⚠️ Warning — present to user: "This IA spec is [N] lines. Downstream BE/FE specs will expand further. Consider splitting if sections are independently testable." Proceed after acknowledgment. |
| **> 500** | 🛑 **Hard stop** — "This IA spec is [N] lines and will likely exceed agent context capacity during BE/FE spec writing. Split this shard into two IA specs via `/decompose-architecture-validate` before proceeding." Present the largest sections with their line counts as split candidates. |

> **Why these thresholds**: A 500-line IA spec typically expands to 800-1200 lines per BE/FE spec (contracts, schemas, validation rules, component details). Agent context windows degrade at > 1000 lines of spec content plus the workflow instructions.

### 9.1. Post-write verification

Re-read `docs/plans/ia/[shard-name].md` and verify:
1. All required sections contain non-empty content (not just headers or `<!-- TODO -->` markers)
2. File size is > 0 bytes
3. No `<!-- TODO -->` markers remain (outside of intentional `[N/A]` sections)
4. If any check fails → the write was incomplete. Retry the write operation.

## 10. Update IA index

Change the shard's status from 🔲 to ✅ in `docs/plans/ia/index.md`.

## 11. Update spec pipeline

Read `.agent/skills/session-continuity/protocols/08-spec-pipeline-update.md` and follow the **Spec Pipeline Update Protocol**
to mark this shard's IA column as complete in `.agent/progress/spec-pipeline.md`.

## 11.5. Bootstrap Tech Stack Skills (if applicable)

If the shard you just completed is `00-architecture-design.md` (which definitively chooses the project's tech stack):
Read `.agent/workflows/bootstrap-agents.md` and execute its utility instructions immediately to fill placeholders and provision skills based on the finalized tech stack. **HARD GATE**: Follow the bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`). Confirm all tech stack placeholders are filled and all triggered skills are installed before proceeding.

## 12. Ambiguity gate

Read `.agent/skills/session-continuity/protocols/ambiguity-gates.md` and run the **Ambiguity Gates**:

- **Micro**: Walk each feature, interaction, data model field, access rule, and edge case.
  Would an implementer need to guess about any of them? If yes — fix it now.
- **Macro**: Would the BE spec writer need to guess anything from this IA shard?
  If yes — fix it now. The shard is not done until the downstream phase can work
  from it without assumptions.

**Two-implementer test**: For each element that passes the micro check, apply the two-implementer test: *"Would two different developers, reading only this IA shard with no other context, make the same implementation decision?"* If the answer is "probably not" — fix it now.

**Devil's advocate pass**: After the gates pass, run a devil's advocate pass: for each feature, interaction, data model field, and access rule, ask "What would a junior developer get wrong about this?" Any element that reveals a gap gets fixed before presenting.

## 13. Full ambiguity audit (mandatory when this is the last IA shard)

1. Read `docs/plans/ia/index.md`
2. Check if all shards show ✅

**More shards remain**: Proceed to the next shard. Do not propose `/write-be-spec` yet — the IA layer is not complete.

**This is the last shard** (all shards show ✅): Run `/audit-ambiguity ia` now. This is **not optional** — it is a mandatory gate before any BE spec work begins.

> **Why**: Catching ambiguity across the full IA layer costs minutes. Discovering it during BE spec writing — or worse, during implementation — costs days of rework across multiple specs and slices.

**Hard gate**: Do NOT propose `/write-be-spec` until `/audit-ambiguity ia` scores 0% ambiguity.

## 13.5. Completion Gate (MANDATORY)

1. **Verify pipeline tracker** — Read `.agent/progress/spec-pipeline.md` and confirm the IA column for this shard shows `complete`. If it does not → **STOP**: "Pipeline tracker was not updated in Step 11. Go back and run Protocol 08 now before proceeding."
2. Scan this conversation for memory-capture triggers (see rule: `memory-capture`):
   - Patterns observed → write to `memory/patterns.md`
   - Non-trivial decisions made → write to `memory/decisions.md`
   - Blockers hit → write to `memory/blockers.md`
3. If no triggers found → confirm: "No new patterns, decisions, or blockers to log"
4. Read `.agent/skills/session-continuity/protocols/05-session-close.md` and write a session close log

> **This step is not skippable.** Do not call `notify_user` until all items above are complete.

## 14. Request review and propose next steps

> [!CAUTION]
> **FORBIDDEN next steps from this workflow**: You may ONLY propose `/write-architecture-spec` (next shard) or `/write-be-spec` as the next step. Proposing `/plan-phase`, `/implement-slice`, or any workflow that comes after BE/FE specs is **strictly forbidden** from this point in the pipeline. The IA layer feeds into the BE and FE spec layers — those layers MUST be completed before planning or implementation can begin, regardless of project type (web app, CLI tool, bash script, API-only, etc.). Every project has backend contracts and interface specifications, even if the "frontend" is a terminal or a CLI `--help` output.

You may only notify the user of completion if you have completed the Cross-Reference check, the Dependency Graph validation, and the Ambiguity gate.

Use `notify_user` to present the completed IA shard for review. Your message MUST include:
1. **The shard created** (link to the file)
2. **Cross-reference verification** (confirmation that links are bidirectional)
3. **Ambiguity Gate confirmation** (confirmation that no implementer would need to guess)
4. **The Pipeline State** (propose the next task from the **ONLY** permitted options below)

Do NOT proceed to the next step until the user sends a message explicitly approving this output. Proposing next steps is not the same as receiving approval. Wait for explicit approval before continuing.

Read `.agent/progress/spec-pipeline.md` to determine the pipeline state, then propose the appropriate next step:

- **More skeleton shards remain** → "Next: Run `/write-architecture-spec` for shard [next-shard-number]"
- **All IA shards complete** → "All IA shards complete and /audit-ambiguity ia has already run (mandatory Step 13 above). If it scored 0%, proceed to `/write-be-spec`. If it found gaps, resolve them and re-run /audit-ambiguity ia as a fresh invocation before proceeding."
- **Self-audit found unresolvable issues** → Present the issues for discussion before proposing next step

> [!IMPORTANT]
> **No other next steps are valid.** If you believe this project does not need BE or FE specs, you are wrong. Every project type maps to the pipeline's spec layers — CLI tools have command contracts (BE) and terminal output specs (FE), bash scripts have function contracts (BE) and usage/help specs (FE), API-only services have endpoint contracts (BE) and client SDK/docs specs (FE). The pipeline does not skip layers.
