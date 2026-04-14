---
name: propagate-decision
description: Scan downstream specs for contradictions with locked decisions and apply approved fixes with consistency checks
parameters:
  - name: decision_type
    type: string
    required: false
    description: Optional direct type override (skips selection menu)
---

## Overview


## Step-by-Step

1. Run `propagate-decision-scan`.
2. Run `propagate-decision-apply` after user confirmation.
3. Return completion summary and next-step guidance.
