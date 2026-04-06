---
name: evolve-contract
description: Safely evolve shared contracts with consumer discovery, migration tests, versioning checks, and downstream spec cascade validation
parameters:
  - name: contract
    type: string
    required: false
    description: Optional contract/schema identifier to evolve
---

## Overview

Parity source:
- `.agent/workflows/evolve-contract.md`

Port of `.agent/workflows/evolve-contract.md`.

## Step-by-Step

1. Load migration/testing/error-handling skills.
2. Identify contract and classify change risk (additive/narrowing/breaking).
3. Discover all consumers.
4. Run API versioning check when public API consumers are affected.
5. Write migration tests (RED first).
6. Update contract and consumers.
7. Validate with project commands.
8. Run spec cascade check for BE/FE/IA references.
9. Record decision/update notes and propose validation rerun.
