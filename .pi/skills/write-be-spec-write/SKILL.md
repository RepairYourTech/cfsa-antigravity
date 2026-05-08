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
  skills: [prd-templates, session-continuity, spec-writing, technical-writer, testing-strategist, verification-before-completion]
  calls-bootstrap: true
---

// turbo-all

# Write BE Spec — Write & Validate

Write the BE spec(s) to `.memory/wiki/specs/be/`, update indexes, run quality checks, and present for review.

**Prerequisite**: Read the spec file at `.memory/wiki/specs/be/[NN-feature-name].md`. The `## Classification` section and Referenced Material Inventory should be present from the classify shard. If the file does not exist or lacks a `## Classification` section, run `/write-be-spec-classify` first.

**Re-run detection**: If the spec file already has content beyond the classification stub (filled endpoint sections, schema definitions, middleware rules):
- Present current state and ask: "This BE spec has existing content. **Continue** (skip filled sections) or **redo specific sections** (which ones)?"
- Wait for user response before proceeding.

---

## 7. Write the spec to `.memory/wiki/specs/be/[NN-feature-name].md`

**Endpoint completeness reconciliation**: Before writing any section, build a reconciliation table from the sub-feature endpoint inventory (produced during `/write-be-spec-classify`):

| Sub-feature | Expected endpoints | Specced? | Notes |
|-------------|-------------------|----------|-------|
| [sub-feature] | `POST /api/...` | ✅ | — |
| [sub-feature] | `GET /api/...` | ❌ | [Deferred to Phase N — reason] |
| [sub-feature] | `PUT /api/...` | ❌ | — |

**Rule**: For every unspecced expected endpoint, either add it to the spec immediately or add an explicit `[Deferred to Phase N — reason]` note in the Notes column. An empty Notes column for an unspecced endpoint is a spec failure.

**BLOCKING GATE**: Do NOT write the spec sections until every expected endpoint is either specced or explicitly deferred. This reconciliation table becomes the first section of the spec file after `## Classification`.

Read .agents/skills/technical-writer/SKILL.md and follow its methodology.
Read .agents/skills/spec-writing/SKILL.md and follow its completeness testing and cross-reference checking methodology.
Read .agents/skills/testing-strategist/SKILL.md and follow its methodology.

**Naming convention**: Use the same number prefix as the IA shard that sources it, followed by a kebab-case feature name. For multi-domain splits from the same shard, append a letter suffix (e.g., `09a-chat-api.md`, `09b-agent-flow-api.md`). For cross-cutting specs, use the `00-` prefix (e.g., `00-api-conventions.md`).

**Split group tracking**: If this spec results from a split shard (letter suffix in filename), populate the `## Split Group` section in the spec with the split origin shard, companion spec filenames, and shared entity names. This is mandatory for split specs — it enables downstream implementation to discover sibling context.

Read `.agents/skills/prd-templates/references/be-spec-template.md` for the document structure and quality gates checklist. Follow the conventions template from `be/index.md`.

Write decision to disk. Continue below.

### 7.5. Spec content completeness floor

Spec depth is enforced by **content completeness**, not line count. A short spec that omits validation rules, error codes, or auth coverage is broken; a long spec that enumerates them is correct. There is no upper bound on length.

For **every endpoint** in this spec, verify all of the following are explicitly present:

| Required item | What "present" means |
|---------------|---------------------|
| Request schema | Every field with type, constraints (required/optional, min/max, format, enum), and example |
| Response schema (success) | Full body shape including envelope, pagination metadata, and computed fields |
| Response schema (each error class) | Body shape for every error code listed below |
| Validation rules | One row per (field × constraint) with the exact rejection error code and message |
| Error codes | At minimum: any `4xx` produced by validation, any `4xx` produced by auth/authz, `404` if resource is addressable, `409` if uniqueness or version conflicts apply, `429` if rate-limited, `5xx` for downstream failure cascades |
| Authorization | One row per role × this endpoint, with allow/deny outcome and any ownership/scoping rule |
| Idempotency | Explicit statement of behavior on duplicate submission (idempotent / safe-to-retry / not-idempotent + dedupe strategy) |
| Rate limit | Per-role limit (or "inherits global default" pointing at api-conventions) |
| Observability | Log fields emitted, metric names incremented, audit-trail entries written |

**Hard gate**: If any cell above is missing for any endpoint, the spec is incomplete. Fill it in. Do **not** count missing items as "implicit," "obvious," or "covered by conventions" — every endpoint must surface its full table even when it inherits from a shared convention.

**Length is informational**: Report the line count for the spec in the index entry as metadata only. Do not stop, warn, or split based on length. Splitting is justified only by domain boundaries (e.g., two unrelated entity groups in one shard) — not by size.

## 8. Update the BE index

Add or update the spec entry in `.memory/wiki/specs/be/index.md`. For multi-domain splits, add one row per BE spec with the shared IA source.

If a shard was classified as **structural reference** with 0 BE specs, add a row with `—` status and a note explaining why (e.g., "Structural reference — no API surface").

## 9. Update spec pipeline

Read `.agents/skills/session-continuity/protocols/08-spec-pipeline-update.md` and follow the **Spec Pipeline Update Protocol** to mark this shard's BE column as complete in `.memory/pipeline/progress/spec-pipeline.md`.

## 9.5. Iterative deepening passes

Re-read the complete BE spec draft and run the following passes. Each pass may produce new content that reveals further gaps — repeat until a pass produces no meaningful additions.

### Pass 1: Cross-endpoint consistency

Read all endpoints in this spec together as a set:
- Do endpoints touching the same entity use consistent field names, casing, and types?
- Do error codes follow the same pattern across all endpoints? (e.g., if `POST` returns `409` for duplicates, does `PUT` also?)
- Do paginated endpoints use the same pagination shape (cursor vs offset, page size defaults)?
- Do all endpoints that create/update the same entity validate the same required fields?

Fix every inconsistency found.

### Pass 2: Sequencing and concurrency scenarios

For each write endpoint (POST, PUT, PATCH, DELETE):
- What happens if a client calls this endpoint twice in rapid succession with the same payload?
- What happens if two different users call this endpoint simultaneously for the same resource?
- What happens if a client calls endpoint A then endpoint B before A's response returns?
- What happens if the resource is deleted between when the client last read it and when they submit an update?

Add any new error codes, race condition handling, or idempotency requirements discovered.

### Pass 3: Failure cascade analysis

For each endpoint that mutates data:
- If this endpoint fails mid-transaction, what state is the database left in?
- Which other endpoints return stale or inconsistent data after this failure?
- Does the spec define rollback behavior or is it assumed?
- If this endpoint creates a resource that other endpoints depend on, what happens to those endpoints if creation fails silently?

Add any new transaction boundary requirements, rollback specifications, or consistency guarantees.

**Pass loop guard**: Track total pass count.
- Passes 1-7 → mandatory.
- Passes 8+ → optional, run if prior pass produced significant additions.
- **After pass 10** → **STOP**: "10 deepening passes completed. Present remaining gaps to user: continue deepening or accept current spec depth?"

### Pass 4: Authorization completeness

Build a role × endpoint matrix for this spec. Every cell must be one of: `allow`, `allow-own-only`, `allow-team-only`, `deny`, or `deny-with-reason-code`. No empty cells, no "tbd," no "see other doc."

For every `allow-*-only` cell, the spec must define:
- The exact ownership predicate (e.g., `record.created_by == auth.user_id`)
- The error code returned when the predicate fails
- Whether the predicate is enforced in the application layer, the database layer (RLS / policies), or both

For every `deny` cell, the spec must define the error code returned. `404` vs `403` for unauthorized reads of existing records must be an explicit decision, not an oversight.

### Pass 5: Observability and audit trail

For every endpoint, enumerate:
- **Structured log entries** emitted on success, on each error class, and on slow-path / degraded-mode execution
- **Metrics** incremented: counters (request count, error count per class), histograms (latency, payload size), gauges (in-flight requests if relevant)
- **Audit-trail entries** for any state-changing endpoint: actor, action verb, target entity ID, timestamp, before/after diff (or pointer to it), correlation ID
- **Trace span attributes** added to the request span beyond defaults (e.g., `entity.id`, `tenant.id`, `feature.flag.X`)

Add any missing observability hook to the endpoint spec, or to the api-conventions spec if it should be cross-cutting.

### Pass 6: Rate-limit and abuse-protection edge cases

For every endpoint:
- Anonymous-vs-authenticated rate limits (anonymous must always be stricter; if endpoint is auth-only, state explicitly that anonymous receives `401` before rate-limit logic runs)
- Per-IP vs per-user vs per-tenant limit boundaries
- Burst behavior (token-bucket vs fixed-window)
- Behavior when limit is exceeded: `429` with `Retry-After` header, log event, metric increment
- Abuse pattern handling: brute-force detection on auth endpoints, enumeration protection (return same response for "user not found" and "wrong password"), mass-assignment protection (whitelist allowed fields explicitly per endpoint)

### Pass 7: Failure-mode partial-state hygiene

For every multi-step endpoint (e.g., create-then-link-then-notify):
- Identify each external dependency (database, queue, email, third-party API)
- For each, specify behavior when that dependency fails: rollback, compensate, queue-for-retry, fail-and-surface-to-user
- Identify which combinations of partial failures are possible
- Specify the user-facing error code and message for each combination

If the endpoint cannot guarantee atomicity, the spec must say so explicitly and define the reconciliation strategy.

## 10. Cross-reference check

Verify:
- [ ] New spec links back to its IA source shard
- [ ] Related BE specs are cross-referenced (especially for multi-domain splits from the same shard)
- [ ] Cross-shard referenced material is cited with file + section + line numbers
- [ ] IA source shard links forward to the new BE spec

## 11. Ambiguity gate

Read `.agents/skills/session-continuity/protocols/ambiguity-gates.md` and run:

- **Micro**: Walk each endpoint, request/response field, error code, schema constraint, and middleware rule. Would an implementer need to guess? Fix it now.
- **Macro**: Would the FE spec writer need to guess anything from this BE spec? Fix it now.
- **Two-implementer test**: Would two developers reading only this spec make the same decision? If not — fix it now.
- **Devil's advocate pass**: "What would a junior developer get wrong?" Fix any revealed gaps.

## 12. Full ambiguity audit (mandatory when last BE spec)

1. Read `.memory/wiki/specs/be/index.md`
2. Check if all BE specs show ✅

**More specs remain**: Proceed to the next spec.

**This is the last BE spec**: Run `/audit-ambiguity be` now. **Hard gate**: Do NOT propose `/write-fe-spec` until `/audit-ambiguity be` scores 0%.

## 13. Check for new dependencies

If this BE spec introduces a technology not already in the project's tech stack:
1. Identify the technology (e.g., WebSocket, S3 storage, Stripe, Redis)
2. Read `.agents/skills/bootstrap-agents/SKILL.md` and invoke `/bootstrap-agents PIPELINE_STAGE=write-be-spec` + the new dependency key
3. **HARD GATE**: Follow the bootstrap verification protocol (`.agents/skills/prd-templates/references/bootstrap-verification-protocol.md`). If bootstrap fails:
   - **1st failure** → retry once
   - **2nd failure** → **STOP**: tell the user which dependency failed and ask: "Install manually, skip, or abort?"
4. Confirm the matching skill is installed before proceeding.

## 13.5. Update feature tracking ledger

If `.memory/wiki/specs/feature-ledger.md` exists, read `.agents/skills/prd-templates/references/feature-ledger-protocol.md` and follow **Step 3 — BE Coverage**. Match the endpoints in this spec to Feature IDs and populate the BE Spec and BE Status columns.

## 13.7. Completion Gate (MANDATORY)

1. **Verify pipeline tracker** — Read `.memory/pipeline/progress/spec-pipeline.md` and confirm the BE column for this shard shows `complete`. If it does not → **STOP**: "Pipeline tracker was not updated in Step 9. Go back and run Protocol 08 now before proceeding."
2. **Verify spec graph refresh** — Confirm Protocol 08 called `memory_compile` and that the compile succeeded. If graph refresh did not run → **STOP**: "Spec graph was not refreshed after tracker update. Run `memory_compile` before proceeding."
3. Scan this conversation for memory-capture triggers (see rule: `memory-capture`):
   - Patterns observed → write to `.memory/wiki/patterns.md`
   - Non-trivial decisions made → write to `.memory/wiki/decisions.md`
   - Blockers hit → write to `.memory/wiki/blockers.md`
4. If no triggers found → confirm: "No new patterns, decisions, or blockers to log"
5. Read `.agents/skills/session-continuity/protocols/05-session-close.md` and write a session close log

> **This step is not skippable.** Do not call `notify_user` until all items above are complete.

## 14. Request review and propose next steps

> [!CAUTION]
> **FORBIDDEN next steps from this workflow**: You may ONLY propose `/write-be-spec` (next shard) or `/write-fe-spec` as the next step. Proposing `/plan-phase` or `/implement-slice` from this workflow is **strictly forbidden** — those require completed FE specs. This applies to ALL project types including CLI tools, bash scripts, and API-only services.

Read .agents/skills/verification-before-completion/SKILL.md and follow its methodology.

Use `notify_user` presenting:
1. **Spec created** (link)
2. **Cross-reference verification**
3. **Ambiguity Gate confirmation**
4. **Pipeline State** — read `.memory/pipeline/progress/spec-pipeline.md` and propose the next step from the **ONLY** permitted options below:

- **More BE specs remain** → "Next: Run `/write-be-spec` for shard [next-shard-number]"
- **All BE specs complete** → "All BE specs complete and `/audit-ambiguity be` has already run (mandatory Step 12 above). If it scored 0%, proceed to `/write-fe-spec`. If it found gaps, resolve them and re-run `/audit-ambiguity be` before proceeding."
- **Self-audit found unresolvable issues** → Present the issues for discussion before proposing next step

> [!IMPORTANT]
> **No other next steps are valid.** `/plan-phase` requires both BE AND FE specs to be complete. After all BE specs pass audit, the mandatory next workflow is `/write-fe-spec`.
