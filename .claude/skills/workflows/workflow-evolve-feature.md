---
name: evolve-feature
description: Introduce genuinely new scope into the pipeline by classifying change type and cascading updates through downstream layers
parameters:
  - name: input
    type: string
    required: false
    description: Optional inline description or @file source for new scope
---

## Overview


## Step-by-Step

1. Run `evolve-feature-classify`.
2. Run `evolve-feature-cascade`.
3. Produce evolution record and require ambiguity audit on affected layers.
