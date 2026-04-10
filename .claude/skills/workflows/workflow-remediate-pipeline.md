---
name: remediate-pipeline
description: Layer-by-layer remediation loop using adversarial audits, targeted fixes, and fresh-run verification enforcement
parameters:
  - name: layer
    type: string
    required: false
    description: Optional starting layer override
---

## Overview


## Step-by-Step

1. Run `remediate-pipeline-assess`.
2. Run `remediate-pipeline-execute`.
3. Enforce fresh-run confirmation rule before layer advancement.
