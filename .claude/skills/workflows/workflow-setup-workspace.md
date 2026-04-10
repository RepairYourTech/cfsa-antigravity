---
name: setup-workspace
description: Orchestrate operational workspace setup before implementation slices across scaffold, CI/CD, hosting, and data provisioning shards
parameters:
  - name: phase
    type: string
    required: false
    description: Optional explicit phase identifier override
---

## Overview

Runs workspace setup in four ordered shards: scaffold → cicd → hosting → data.


## Prerequisites

1. Approved phase plan exists
2. Architecture pattern is documented
3. Cross-cutting stack map cells (CI/CD, Hosting, Security) are populated

## Step-by-Step

### Step 0 — Preflight and resume detection

1. Load session continuity context.
2. Detect monolith/monorepo/multi-repo architecture pattern.
3. Verify required cross-cutting map cells are populated.
4. Resume from next incomplete setup shard when prior session exists.

### Step 1 — Run scaffold shard

Call skill: `setup-workspace-scaffold`

Expected outputs:
- project(s) scaffolded
- base structure/config/env template prepared
- dev server gate passing

### Step 2 — Run CI/CD shard

Call skill: `setup-workspace-cicd`

Expected outputs:
- CI/CD pipeline config created
- required stages wired
- pipeline execution gate passing

### Step 3 — Run hosting shard

Call skill: `setup-workspace-hosting`

Expected outputs:
- hosting target(s) provisioned
- env/domain/deploy pipeline configured
- staging deployment gate passing

### Step 4 — Run data shard

Call skill: `setup-workspace-data`

Expected outputs:
- database instance(s) provisioned
- migrations initialized and applied
- database connectivity gate passing

### Step 5 — Infrastructure verification handoff

Run `/verify-infrastructure` with trigger `workspace` and block implementation until PASS.

## Completion Checklist

- [ ] setup preflight completed
- [ ] scaffold shard completed
- [ ] cicd shard completed
- [ ] hosting shard completed
- [ ] data shard completed
- [ ] verify-infrastructure PASS confirmed

## Next Steps

- if all pass: `/implement-slice` (first slice)
- if verification fails: fix failing setup shard and rerun `/verify-infrastructure`
