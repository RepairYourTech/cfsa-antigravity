---
name: evolve-feature-cascade
description: Cascade approved evolution changes through downstream layers, assess impact, run consistency checks, and write evolution audit record
parameters:
  - name: entry_point
    type: string
    required: false
    description: Optional explicit entry-point document override
---

## Overview


## Step-by-Step

1. Run locked-decision conflict check.
2. Cascade updates layer-by-layer with stop/approval at each layer.
3. Append changelog entries to modified specs.
4. Assess implementation/phase impact.
5. Run consistency checks.
6. Write evolution record.
7. Run bootstrap check for newly introduced dependencies.
8. Propose mandatory ambiguity-audit rerun for affected layers.
