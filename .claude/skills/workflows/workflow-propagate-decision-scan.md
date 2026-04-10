---
name: propagate-decision-scan
description: Pre-scan decision types, collect downstream references, classify contradictions, and write propagation scan report
parameters:
  - name: decision_type
    type: string
    required: false
    description: Optional direct decision type to scan
---

## Overview


## Step-by-Step

1. Pre-scan all supported decision types and count downstream references.
2. Present selection menu (or honor direct argument).
3. Run full scan on selected types; classify references as explicit contradiction / implicit assumption / consistent.
4. Write `docs/audits/propagation-scan-[date].md`.
5. Stop for user confirmation before apply shard.
