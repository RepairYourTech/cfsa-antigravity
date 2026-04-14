---
name: bootstrap-agents-fill
description: Fill surface stack map, instruction templates, and root config placeholders from provided key-value updates
parameters:
  - name: values
    type: object
    required: true
    description: Placeholder values and surface/cross-cutting map updates
---

## Overview


## Step-by-Step

1. Apply per-surface updates in `.claude/instructions/tech-stack.md` without clobbering unrelated filled cells.
2. Apply cross-cutting and global settings updates.
3. Fill instruction templates (`commands.md`, `workflow.md`, `patterns.md`, `structure.md`) where values are provided.
4. Sync root config placeholders in `AGENTS.md` and `GEMINI.md`.
5. Fill operational skill/rule placeholders where mappings exist.
6. Emit fill report and hand off to provisioning shard.

## Rule

If no values are provided, report no-op and exit.
