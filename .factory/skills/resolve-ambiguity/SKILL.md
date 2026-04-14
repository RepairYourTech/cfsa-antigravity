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


## Step-by-Step

1. Determine target scope (layer or direct file path).
2. Load resolve-ambiguity skill methodology.
3. Read target documents in full.
4. Classify gaps into technical/factual vs intent/choice.
5. Resolve and apply approved fixes.
6. Append Resolution Log and Changelog updates to modified specs.
7. If Step 5/6 changed spec files under `.memory/wiki/specs/`, call `memory_compile` and verify the compile succeeded before reporting completion.
8. Propose fresh ambiguity-audit rerun for verification.
