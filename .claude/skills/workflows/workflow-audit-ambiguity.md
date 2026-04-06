---
name: audit-ambiguity
description: Orchestrate ambiguity auditing across selected layers with rubric-driven scoring, remediation flow, and next-step gating
parameters:
  - name: scope
    type: string
    required: false
    description: Optional scope override (vision|architecture|ia|be|fe|all)
---

## Overview

Runs ambiguity auditing in two shards: rubrics → execute.

Parity source:
- `.agent/workflows/audit-ambiguity.md`
- `.agent/workflows/audit-ambiguity-rubrics.md`
- `.agent/workflows/audit-ambiguity-execute.md`

## Prerequisites

1. At least one target-layer document exists
2. Audit report directory `docs/audits/` is available

## Step-by-Step

### Step 1 — Run rubrics shard

Call skill: `audit-ambiguity-rubrics`

Expected outputs:
- selected audit scope
- enumerated document list per layer
- persisted `docs/audits/audit-scope.md` with rubric file paths

### Step 2 — Run execute shard

Call skill: `audit-ambiguity-execute`

Expected outputs:
- per-document scored audit report(s)
- cross-layer consistency findings
- remediation actions (as applicable)
- verdict + constrained next step

## Completion Checklist

- [ ] audit scope determined and persisted
- [ ] all scoped documents processed
- [ ] report compiled with evidence-backed scores
- [ ] remediation flow completed when gaps found
- [ ] final verdict and next-step recommendation emitted

## Next Steps

Depends on scope/verdict:
- if gaps found: rerun `/audit-ambiguity [layer]` as a fresh invocation after remediation
- if 0% ambiguity and fresh-run conditions pass: advance to layer-specific next command
