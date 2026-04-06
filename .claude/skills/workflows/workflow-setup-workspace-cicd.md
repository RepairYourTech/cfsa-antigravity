---
name: setup-workspace-cicd
description: Configure CI/CD stages, secrets model, and service-aware pipeline strategy with execution verification gate
parameters:
  - name: phase
    type: string
    required: false
    description: Optional explicit phase identifier override
---

## Overview

Parity source:
- `.agent/workflows/setup-workspace-cicd.md`

Port of `.agent/workflows/setup-workspace-cicd.md` to Claude Code skill format.

## Prerequisites

1. Scaffold shard passed dev-server gate
2. CI/CD stack map category is populated

## Step-by-Step

### Step 1 — Load CI/CD skill and strategy

1. Load CI/CD skill from cross-cutting map.
2. Determine monolith/monorepo/multi-repo pipeline strategy.

### Step 2 — Create pipeline configuration

1. Configure required stages: install, lint, type-check, test, build.
2. Wire triggers for push/PR.
3. Configure runtime pinning, caching, timeouts, artifact handling.
4. Add workspace matrix/change-detection logic where applicable.

### Step 3 — Configure secrets model

1. Enumerate required secret names from env/example + architecture integrations.
2. Reference only secret names in pipeline config (no values).
3. Present required-secret list for platform configuration.

### Step 4 — Verification gate

1. Commit/push pipeline config.
2. Verify pipeline executes all stages.
3. Require install/lint/type/build stages to pass.
4. Allow test stage to be empty/no-tests at scaffold stage per policy.

## Completion Checklist

- [ ] CI/CD skill loaded
- [ ] pipeline config created
- [ ] secrets model documented
- [ ] monorepo/multi-service strategy applied when applicable
- [ ] pipeline execution gate passes

## Next Steps

- Run `setup-workspace-hosting`
