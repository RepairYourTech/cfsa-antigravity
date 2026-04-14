---
name: remediate-pipeline-execute
description: Execute per-layer adversarial audit/remediation loop, persist fixes metadata, and manage fresh-run advancement
parameters:
  - name: layer
    type: string
    required: false
    description: Optional explicit current layer override
---

## Overview


## Step-by-Step

1. Read remediation state and detect re-invocation/fresh-run status.
2. Audit current layer inline document-by-document with implementer simulation + rubric scoring + devil's advocate pass.
3. Run cross-layer consistency checks when applicable.
4. Classify and remediate gaps (judgment calls first, mechanical fixes second).
5. Persist `## Gaps Fixed` metadata.
6. Call `memory_compile` so fixed/removed relationships are reconciled in the graph before the fresh rerun.
7. Stop and instruct fresh `/audit-ambiguity [layer]` run.
8. On confirmed-clean re-invocation, advance to next layer or complete.
