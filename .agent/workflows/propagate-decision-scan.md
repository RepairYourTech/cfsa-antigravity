---
description: Pre-scan all decision types, present selection menu, run full scan on selected types, and build impact report
parent: propagate-decision
shard: scan
standalone: true
position: 1
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [] # callable standalone
  successors: [propagate-decision-apply]
  skills: [technical-writer]
  calls-bootstrap: false
---

# Propagate Decision — Scan

Pre-scan all 5 decision types for downstream contradictions, present a selection menu, run a full scan on the selected types, and write the impact report.

> **Prerequisite**: At least one instruction file must be filled (not `{{PLACEHOLDER}}`). If all instruction files are still template placeholders, there are no locked decisions to propagate — run `/bootstrap-agents` first.

---

## 1. Pre-scan all decision types

Read all five decision sources and do a quick surface scan of downstream documents:

| Decision Type | Source Document | Downstream Scope |
|--------------|-----------------|-------------------|
| **structure** | `.agent/instructions/structure.md` | All IA shards, BE specs, FE specs |
| **tech-stack** | `.agent/instructions/tech-stack.md` + architecture doc | All IA shards, BE specs, FE specs |
| **auth-model** | Architecture doc (auth/security section) | All BE specs with middleware, all FE specs with auth flows |
| **data-placement** | `docs/plans/data-placement-strategy.md` | All IA shards with data models, all BE specs with storage |
| **patterns** | `.agent/instructions/patterns.md` | All IA shards, BE specs with implementation patterns, FE specs with component patterns |

For each decision type:
1. Read the source document to extract the current locked value
2. Quick-scan downstream documents for any reference to that decision topic
3. Note the count of downstream references found (matches + mismatches — the full scan in Step 3 will determine which are conflicts)

---

## 2. Present selection menu

Show the pre-scan findings per decision type:

```
Decision propagation pre-scan:

[1] structure — structure.md — inconsistencies detected in X documents
[2] tech-stack — tech-stack.md — inconsistencies detected in X documents
[3] auth-model — architecture doc — inconsistencies detected in X documents
[4] data-placement — data-placement-strategy.md — inconsistencies detected in X documents
[5] patterns — patterns.md — inconsistencies detected in X documents

[A] All with inconsistencies
[Q] Quit — no propagation needed
```

If the user selects `[A]`, run the full scan (Step 3) on all 5 types first, then filter to only those with at least one explicit contradiction or implicit assumption.

If called with a specific argument (e.g., `/propagate-decision structure`), skip the menu and proceed directly with that decision type.

**Do not proceed until the user selects.**

---

## 3. Full scan on selected types

For each selected decision type, scan every downstream document in the scope defined by the table in Step 1:

1. **Read the locked value** from the source document
2. **Search each downstream document** for references to the decision topic
3. **For each reference found**, record the line number and classify it as one of:
   - **Explicit contradiction** — The document states a value that directly conflicts with the locked decision (e.g., document says "PostgreSQL" but tech stack locks "MySQL")
   - **Implicit assumption** — The document references the topic but uses vague or underspecified language that neither confirms nor contradicts the locked decision (e.g., says "the database" without naming it)
   - **Consistent** — The document correctly uses the locked value

Record all explicit contradictions and implicit assumptions with their document path, line number, current text, and the locked value they should reflect.

---

## 4. Build and write impact report

Write `docs/audits/propagation-scan-[date].md` with:

### Explicit Contradictions

| Document | Line | Current Text | Locked Value | Decision Type |
|----------|------|--------------|--------------|---------------|
| `src/auth/tokens.ts` | 47 | `jwt.sign(payload, secret)` | Supabase Auth (no custom JWT) | auth-model |
| ... | ... | ... | ... | ... |

### Implicit Assumptions

| Document | Line | Current Text | Concern | Decision Type |
|----------|------|--------------|---------|---------------|
| `docs/plans/be/auth-spec.md` | 23 | "the auth provider" | Does not name the locked auth provider | auth-model |
| ... | ... | ... | ... | ... |

### Summary

- **Explicit contradictions**: X items across Y documents
- **Implicit assumptions**: X items across Y documents
- **Consistent references**: X items (no action needed)

---

## 5. Present summary and confirm

Present the summary counts to the user:

> **Propagation scan complete.**
>
> - **X explicit contradictions** found — these directly conflict with locked decisions and should be fixed
> - **Y implicit assumptions** found — these are vague references that could be flagged for `/resolve-ambiguity`
>
> Review the full report at `docs/audits/propagation-scan-[date].md`.
>
> Run `/propagate-decision-apply` to review and apply fixes one at a time.

**STOP — do not proceed to apply until the user explicitly confirms.**
