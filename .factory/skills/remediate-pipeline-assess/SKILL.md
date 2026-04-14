---
name: remediate-pipeline-assess
description: Assess pipeline layer state, detect prerequisite blockers, classify audit status, and persist remediation plan
parameters:
  - name: layer
    type: string
    required: false
    description: Optional preferred start layer
---

## Overview


## Step-by-Step

1. Run instruction placeholder pre-check and propagation/evolution prerequisite checks.
2. Scan layers for content and document counts.
3. Classify each layer status (confirmed-clean / unverified-clean / needs-audit / no-content).
4. Determine starting layer (respecting upstream-clean requirement).
5. Present remediation plan and require user approval.
6. Persist `.memory/wiki/specs/audits/remediation-state.md`.
