---
name: update-architecture-map
description: Generate or refresh docs/ARCHITECTURE.md from current codebase state with evidence-backed component and data-flow mapping
parameters:
  - name: mode
    type: string
    required: false
    description: Optional mode override (create|update)
---

## Overview

Parity source:
- `.agent/workflows/update-architecture-map.md`

Port of `.agent/workflows/update-architecture-map.md`.

## Step-by-Step

1. Verify latest phase validation report passed.
2. Load architecture-mapping skill.
3. Perform filesystem reconnaissance and deep file reads.
4. Extract components, schemas, data flows, and key patterns with citations.
5. Create/update `docs/ARCHITECTURE.md` holistically and refresh timestamp.
6. Evaluate phase completion gate and emit phase-aware next-step guidance.
