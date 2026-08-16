---
name: audit-ambiguity-execute
description: Execute ambiguity audit document-by-document with implementer simulation, rubric scoring, cross-layer checks, remediation, and verdicting
parameters:
  - name: layer
    type: string
    required: false
    description: Optional explicit layer override from persisted audit scope
---

## Overview


## Prerequisites

1. `.memory/wiki/specs/audits/audit-scope.md` exists and includes `## Rubric Files`

## Step-by-Step

### Step 0 — Scope and rubric load

1. Read `.memory/wiki/specs/audits/audit-scope.md`.
2. Load only rubric files listed in `## Rubric Files`.
3. Enforce freshness/session-independence gate for remediated runs.

### Step 1 — Coverage counter initialization

1. Extract complete document list and declared counts.
2. Announce total N and initialize processed count to 0/N.

### Step 2 — Per-document execution loop (mandatory 3a→3b→3c)

For every scoped document:
1. Implementer simulation (read full doc, attempt stub, enumerate forced decisions).
2. Rubric scoring with evidence and two-implementer assertions.
3. Devil's-advocate pass and score downgrades when warranted.
4. Immediately append findings to layer report.
5. Increment processed counter and report X/N.

### Step 3 — Coverage completeness gate

1. Compare processed documents to scoped list.
2. If any skipped docs exist, stop and process them before continuing.

### Step 4 — Cross-layer consistency checks (when applicable)

Run mandatory checks for BE/FE/all scope:
- IA→BE flow/endpoint coverage
- BE→FE field mapping
- IA→FE access control consistency
- BE error code FE-state mapping

Append all failures as blocking report items.

### Step 5 — Compile summary and remediate gaps

1. Compile ambiguity percentage + prioritized punch list.
2. Execute remediation flow automatically:
   - classify judgment vs mechanical gaps
   - request decisions where needed
   - apply approved fixes
3. Persist `## Gaps Fixed` metadata in audit-scope file.

### Step 6 — Graph refresh, final verdict, and next-step recommendation

1. If remediation changed scoped specs, call `memory_compile` before presenting the verdict so the graph reflects current source truth.
2. Present report + verdict.
3. If gaps found, require fresh rerun.
4. If 0% ambiguity and fresh-run criteria pass, recommend layer-appropriate next pipeline command.

## Completion Checklist

- [ ] scope/rubrics loaded from persisted file
- [ ] all documents processed through full loop
- [ ] coverage completeness gate passed
- [ ] cross-layer checks executed when applicable
- [ ] summary compiled
- [ ] remediation flow executed for gaps
- [ ] gaps-fixed metadata persisted
- [ ] spec graph refreshed when remediation changed scoped specs
- [ ] verdict + constrained next step presented

## Next Steps

- gaps remain: rerun `/audit-ambiguity [layer]` in fresh invocation
- no gaps and pass criteria met: advance to layer-specific next command
