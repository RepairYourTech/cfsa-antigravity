---
name: audit-ambiguity-rubrics
description: Determine ambiguity audit scope, enumerate source documents from filesystem, and persist rubric file bindings
parameters:
  - name: scope
    type: string
    required: false
    description: Optional scope override (vision|architecture|ia|be|fe|all)
---

## Overview

Parity source:
- `.agent/workflows/audit-ambiguity-rubrics.md`

Port of `.agent/workflows/audit-ambiguity-rubrics.md` to Claude Code skill format.

## Prerequisites

1. Target layer(s) have discoverable documents

## Step-by-Step

### Step 1 — Determine audit scope

1. Select one of: vision, architecture, ia, be, fe, all.
2. If no scope input is provided, collect it before continuing.

### Step 2 — Enumerate documents from filesystem

1. Load document-to-layer mapping rules from scoring reference.
2. Discover all matching files recursively via filesystem enumeration.
3. Enforce document enumeration gate:
   - report count by layer
   - re-scan when below expected threshold
   - explain low-count exceptions when still below threshold

### Step 3 — Persist audit scope and rubric file map

Write `docs/audits/audit-scope.md` including:
- layers to audit
- complete document list
- per-layer document count
- exact rubric file paths
- status marker

### Step 4 — Load rubric skill context

1. Load pipeline-rubrics scoring methodology.
2. Prepare execution handoff using persisted rubric paths.

## Completion Checklist

- [ ] scope selected
- [ ] documents enumerated from filesystem
- [ ] enumeration gate passed
- [ ] audit-scope.md persisted with rubric paths
- [ ] execution handoff prepared

## Next Steps

- Run `audit-ambiguity-execute`
