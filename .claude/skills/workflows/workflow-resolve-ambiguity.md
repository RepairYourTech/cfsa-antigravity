---
name: resolve-ambiguity
description: Resolve ambiguity for a target file or layer using two-path classification and recorded spec updates
parameters:
  - name: target
    type: string
    required: false
    description: Optional layer name or @file path
---

## Overview

Parity source:
- `.agent/workflows/resolve-ambiguity.md`

Port of `.agent/workflows/resolve-ambiguity.md`.

## Step-by-Step

1. Determine target scope (layer or direct file path).
2. Load resolve-ambiguity skill methodology.
3. Read target documents in full.
4. Classify gaps into technical/factual vs intent/choice.
5. Resolve and apply approved fixes.
6. Append Resolution Log and Changelog updates to modified specs.
7. Propose fresh ambiguity-audit rerun for verification.
