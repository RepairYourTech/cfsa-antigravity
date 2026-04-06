---
name: setup-workspace-hosting
description: Provision hosting targets, configure domains/environments, integrate deployment pipeline, and verify staging access
parameters:
  - name: phase
    type: string
    required: false
    description: Optional explicit phase identifier override
---

## Overview

Parity source:
- `.agent/workflows/setup-workspace-hosting.md`

Port of `.agent/workflows/setup-workspace-hosting.md` to Claude Code skill format.

## Prerequisites

1. CI/CD shard completed
2. Hosting stack map category is populated

## Step-by-Step

### Step 1 — Load hosting + deployment skills

1. Load hosting skill from cross-cutting map.
2. Load deployment-procedures guidance.

### Step 2 — Determine hosting topology

1. Resolve deployment strategy for monolith/monorepo/multi-repo/hub-spoke patterns.
2. Define public/internal service exposure and routing expectations.

### Step 3 — Provision hosting projects/environments

1. Create deploy target(s) for each deployable service.
2. Configure build/install/runtime settings.
3. Configure staging + production environments (and additional ones if specified).
4. Set non-secret env vars and document secret placeholders via platform secret manager.

### Step 4 — Domain/DNS and deploy pipeline integration

1. Configure custom domains or platform defaults.
2. Wire deploy stage into CI/CD with post-deploy health checks and rollback handling.

### Step 5 — First staging deploy verification

1. Trigger first deployment.
2. Verify staging URL returns HTTP 200 and serves expected app output.
3. Stop/fix before proceeding if deploy gate fails.

## Completion Checklist

- [ ] hosting targets provisioned
- [ ] environments configured
- [ ] domain/DNS configuration complete
- [ ] CI/CD deploy integration complete
- [ ] first staging deploy gate passes

## Next Steps

- Run `setup-workspace-data`
