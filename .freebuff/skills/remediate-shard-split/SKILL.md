---
name: remediate-shard-split
description: Context-aware remapping of stale parent shard references to new sub-shard targets after shard split operations
parameters:
  - name: parent_shard
    type: string
    required: false
    description: Optional explicit parent shard identifier
---

## Overview


## Step-by-Step

1. Build/confirm sub-shard mapping table with keywords.
2. Scan docs/plans for stale parent references across all patterns.
3. Classify each hit by context and propose target replacement.
4. Apply fixes one-by-one with user confirmation controls.
5. Run verification grep hard gate until zero stale references remain.
6. Write remediation record and return summary.
