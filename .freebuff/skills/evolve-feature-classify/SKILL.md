---
name: evolve-feature-classify
description: Capture and classify new scope, write entry-point updates, and determine downstream cascade scope
parameters:
  - name: input
    type: string
    required: false
    description: Optional inline description or @file source for change request
---

## Overview


## Step-by-Step

1. Capture change request details.
2. Classify change type (new feature / new requirement / technical constraint / scope correction).
3. Identify entry-point document by classification.
4. Author entry-point additions with layer-appropriate depth.
5. Require user approval before cascading.
6. Determine cascade layer scope based on existing downstream content.
