---
name: sync-kit
description: Semantically merge upstream kit changes while preserving project-specific values and recording sync state
parameters:
  - name: upstream
    type: string
    required: false
    description: Optional upstream repository URL override
---

## Overview


## Step-by-Step

1. Read `.memory/pipeline/kit-sync.md` state and validate baseline.
2. Fetch upstream and diff changed files since last synced commit.
3. Classify changes (net-new, overwrite-safe, semantic-merge required, project-only).
4. Apply semantic merges for placeholder/value-bearing files.
5. Copy net-new files and run ideation-structure migration checks.
6. Audit project-only files for integration gaps.
7. Validate, review diff, and scan for unresolved placeholders.
8. Update `.memory/pipeline/kit-sync.md` with new commit/version/timestamp.
