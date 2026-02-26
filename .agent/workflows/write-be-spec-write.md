---
description: Write BE spec, update indexes, run ambiguity gate, and check for new dependencies for the write-be-spec workflow
parent: write-be-spec
shard: write
standalone: true
position: 2
pipeline:
  position: 5a.2
  stage: specification
  predecessors: [write-be-spec-classify]
  successors: [plan-phase]
  skills: [technical-writer, testing-strategist]
  calls-bootstrap: true
---

// turbo-all

# Write BE Spec — Write & Validate

Write the BE spec(s) to `docs/plans/be/`, update indexes, run quality checks, and present for review.

**Prerequisite**: IA shard must be classified and all source material read (from `/write-be-spec-classify` or equivalent). The agent should have the classification, referenced material inventory, and cross-cutting specs available.

---

## 7. Write the spec to `docs/plans/be/[NN-feature-name].md`

**Naming convention**: Use the same number prefix as the IA shard that sources it, followed by a kebab-case feature name. For multi-domain splits from the same shard, append a letter suffix (e.g., `09a-chat-api.md`, `09b-agent-flow-api.md`). For cross-cutting specs, use the `00-` prefix (e.g., `00-api-conventions.md`).

Write the new API specification. Follow the conventions template from `be/index.md`. Every BE spec MUST include:

```markdown
# [Feature] — Backend Specification

> **IA Source**: [link to IA shard]
> **Deep Dives**: [links to consumed deep dives, if any]
> **Status**: Draft | Review | Complete

## IA Source Map

[Which IA shard sections, deep dives, and cross-shard references
inform each part of this BE spec. This is the traceability record
that lets a reviewer verify nothing was missed or invented.]

| BE Spec Section | IA Source | Section/Lines |
|-----------------|----------|---------------|
| API Endpoints | [primary-shard.md] | § User Flows |
| Database Schema | [primary-shard.md] | § Data Model |
| Middleware | [cross-ref-shard.md] | § Access Control (lines N–M) |
| Error Handling | [primary-shard.md] | § Edge Cases |
| [specific subsystem] | [deep-dive.md] | § Key Decisions |

## API Endpoints
## Request/Response Contracts (Zod schemas)
## Database Schema
## Middleware & Policies
## Data Flow
## Error Handling
## Open Questions
```

### Quality gates:
- [ ] Every endpoint has a Zod request AND response schema
- [ ] Every database table has defined fields, indexes, and permissions
- [ ] Security constraints from IA shard reflected in middleware section
- [ ] Error codes are specific (not generic 500s)
- [ ] Rate limits specified per endpoint
- [ ] Access control requirements mapped to middleware checks
- [ ] Every deep dive key decision is reflected in the spec (not ignored)
- [ ] Every cross-shard reference has been resolved (no dangling pointers)
- [ ] IA Source Map is complete — no BE spec section lacks a traceable IA source
- [ ] Testability criteria from IA shard reflected as performance targets

## 8. Update the BE index

Add or update the spec entry in `docs/plans/be/index.md`. For multi-domain splits, add one row per BE spec with the shared IA source.

If a shard was classified as **structural reference** with 0 BE specs, add a row with `—` status and a note explaining why (e.g., "Structural reference — no API surface").

## 9. Update spec pipeline

Read `.agent/skills/session-continuity/protocols/08-spec-pipeline-update.md` and follow the **Spec Pipeline Update Protocol**
to mark this shard's BE column as complete in `.agent/progress/spec-pipeline.md`.

## 10. Cross-reference check

Verify:
- [ ] New spec links back to its IA source shard
- [ ] Related BE specs are cross-referenced (especially for multi-domain splits from the same shard)
- [ ] Cross-shard referenced material is cited with file + section + line numbers
- [ ] IA source shard links forward to the new BE spec

## 11. Ambiguity gate

Read `.agent/skills/session-continuity/protocols/ambiguity-gates.md` and run the **Ambiguity Gates**:

- **Micro**: Walk each endpoint, request/response field, error code, schema constraint,
  and middleware rule. Would an implementer need to guess about any of them? If yes — fix it now.
- **Macro**: Would the FE spec writer need to guess anything from this BE spec?
  If yes — fix it now. The spec is not done until the downstream phase can work
  from it without assumptions.

## 12. Full ambiguity audit (mandatory when this is the last BE spec)

1. Read `docs/plans/be/index.md`
2. Check if all BE specs show ✅

**More specs remain**: Proceed to the next spec. Do not propose `/write-fe-spec` yet — the BE layer is not complete.

**This is the last BE spec** (all specs show ✅): Run `/audit-ambiguity be` now. This is **not optional** — it is a mandatory gate before any FE spec work begins.

**Hard gate**: Do NOT propose `/write-fe-spec` until `/audit-ambiguity be` scores 0% ambiguity.

## 13. Check for new dependencies

If this BE spec introduces a technology not already in the project's tech stack:

1. Scan the spec for any new technology, library, or service not already in the tech stack
2. Identify the stack category (e.g., QUEUE, CACHE, SEARCH, STORAGE)
3. Read `.agent/workflows/bootstrap-agents.md` and fire bootstrap with:
   - `PIPELINE_STAGE=write-be-spec`
   - The specific key-value pair (e.g., `QUEUE=BullMQ`, `CACHE=Redis`)
4. Confirm the matching skill was installed (if one exists in the skill library)

## 14. Request review and propose next steps

You may only notify the user of completion if you have completed the Cross-Reference check and the Ambiguity gate.

Use `notify_user` to present the new BE spec(s) and updated index for review. Your message MUST include:
1. **The spec created** (link to the file)
2. **Cross-reference verification** (confirmation that links are bidirectional)
3. **Ambiguity Gate confirmation** (confirmation that no implementer would need to guess)
4. **The Pipeline State** (propose the next task from the options below)

Read `.agent/progress/spec-pipeline.md` to determine the pipeline state, then propose the appropriate next step:

- **More IA shards need BE specs** → "Next: Run `/write-be-spec` for shard [next-shard-number]"
- **All BE specs complete** → "All BE specs complete and /audit-ambiguity be has already run (mandatory Step 12 above). If it scored 0%, proceed to /write-fe-spec. If it found gaps, resolve them and re-run /audit-ambiguity be as a fresh invocation before proceeding."
- **Classification decision needed** → Present the classification question for discussion before proceeding
