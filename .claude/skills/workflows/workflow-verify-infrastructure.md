---
name: verify-infrastructure
description: Run operational infrastructure verification gates for workspace/infrastructure/auth checkpoints and emit pass/fail audit report
parameters:
  - name: trigger
    type: string
    required: false
    description: Optional trigger override (workspace|infrastructure|auth)
---

## Overview

Parity source:
- `.agent/workflows/verify-infrastructure.md`

Port of `.agent/workflows/verify-infrastructure.md`.

## Step-by-Step

1. Run placeholder/map completeness audit.
2. Determine trigger and initialize report filename.
3. Verify CI/CD config and latest pipeline green status.
4. Run environment/secrets audit.
5. Verify migrations and rollback readiness.
6. Verify staging deployment + health checks.
7. Run conditional auth smoke test.
8. Run logging and error-tracking gates.
9. Run spec-pipeline integrity check.
10. Finalize report with verdict and next-step guidance.
