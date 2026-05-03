---
name: bootstrap-agents-provision
description: Resolve all map-referenced skills through 4-tier chain and provision installs with idempotent updates
parameters:
  - name: strict
    type: boolean
    required: false
    description: If true, fail when unresolved skills remain
---

## Overview


## Step-by-Step

1. Read stack map and manifest.
2. Resolve each referenced skill name using: exact → partial+adequacy → external discovery → human escalation.
3. Install resolved skills idempotently into `.codex/skills/`.
4. Update installed-skills sections in stack map and root config files.
5. Compose `FRAMEWORK_PATTERNS` when frontend-capable frameworks are present and route back through fill.
6. Resolve and fill `CONTRACT_LIBRARY` per language set.
7. Emit final provisioning report with unresolved items and actions.
