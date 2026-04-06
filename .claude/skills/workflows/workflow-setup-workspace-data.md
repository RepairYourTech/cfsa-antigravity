---
name: setup-workspace-data
description: Provision database infrastructure, initialize migration framework, configure environments, and verify connectivity/migration gates
parameters:
  - name: phase
    type: string
    required: false
    description: Optional explicit phase identifier override
---

## Overview

Parity source:
- `.agent/workflows/setup-workspace-data.md`

Port of `.agent/workflows/setup-workspace-data.md` to Claude Code skill format.

## Prerequisites

1. Hosting shard completed
2. Stack map Databases and ORMs values are populated

## Step-by-Step

### Step 1 — Load database/ORM/migration skills

1. Load database and ORM skills from stack map.
2. Load migration-management skill when available.
3. Load schema-design guidance.

### Step 2 — Determine DB architecture

1. Resolve instance strategy by architecture pattern (single/shared/per-service).
2. Determine managed vs self-hosted provisioning path.
3. Read data-placement strategy when available.

### Step 3 — Provision database instance(s)

1. Create required database instance(s).
2. Create least-privilege application users.
3. Record connection details and enforce transport security.

### Step 4 — Configure connection strings and environments

1. Document local connection template in `.env.example`.
2. Configure CI/CD and staging environment variable names.
3. Document production secret requirement (without setting live value).

### Step 5 — Initialize migrations and test DB

1. Initialize ORM/migration tooling.
2. Create/apply initial migration from documented data strategy.
3. Configure isolated test database and test migration behavior.

### Step 6 — Verification gate

1. Verify local DB connectivity.
2. Verify migration status clean.
3. Verify ORM connectivity checks.
4. Verify staging connectivity where provisioned.

## Completion Checklist

- [ ] DB instances provisioned
- [ ] env connection templates configured
- [ ] migration framework initialized
- [ ] initial migration applied
- [ ] test DB configured
- [ ] connectivity and migration gates pass

## Next Steps

- Run `/verify-infrastructure` (trigger: workspace)
