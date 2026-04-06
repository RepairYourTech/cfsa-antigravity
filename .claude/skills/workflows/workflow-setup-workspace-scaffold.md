---
name: setup-workspace-scaffold
description: Scaffold project/workspaces, apply base structure and configs, and verify dev server startup gate
parameters:
  - name: phase
    type: string
    required: false
    description: Optional explicit phase identifier override
---

## Overview

Parity source:
- `.agent/workflows/setup-workspace-scaffold.md`

Port of `.agent/workflows/setup-workspace-scaffold.md` to Claude Code skill format.

## Prerequisites

1. Phase plan + architecture design exist
2. Surface stack map language/framework rows are populated

## Step-by-Step

### Step 0 — Feature ledger preflight (conditional)

1. If feature ledger exists, verify all Must Have features are assigned to phases.
2. Stop when unassigned Must Have features are present.

### Step 1 — Read architecture pattern and service list

1. Detect monolith/monorepo/multi-repo pattern.
2. Enumerate services/workspaces and language/framework per service.
3. Require user confirmation for multi-service list before scaffolding.

### Step 2 — Load scaffold skills

1. Load language and framework skills per service surface.
2. Load git-workflow patterns.

### Step 3 — Initialize project(s)

1. Use official framework scaffolding commands (no manual package bootstrap).
2. Verify scaffold command success and expected file creation.
3. For monorepo, initialize workspace root before package scaffolds.

### Step 4 — Create/merge directory structure and dependencies

1. Merge scaffold output with required project structure.
2. Add README files for directories requiring extension docs.
3. Install runtime/dev dependencies from architecture/commands requirements.

### Step 5 — Base configurations + env templates + git init

1. Create linter/formatter/type-check/editor/gitignore configs from pattern sources.
2. Create `.env.example` with grouped documented placeholders.
3. Initialize git (if needed) and commit scaffold baseline.

### Step 6 — Dev server verification gate

1. Run dev command and verify startup readiness.
2. Verify baseline endpoint/page responds.
3. Stop/fix before proceeding if startup fails.

## Completion Checklist

- [ ] architecture/service list confirmed
- [ ] project/workspace scaffold initialized
- [ ] structure merged and dependencies installed
- [ ] base configs + env template created
- [ ] git initialized/committed
- [ ] dev server gate passes

## Next Steps

- Run `setup-workspace-cicd`
