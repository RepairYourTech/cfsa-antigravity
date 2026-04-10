---
name: bootstrap-agents
description: Fill template placeholders and provision stack-triggered skills via two-step additive bootstrap flow
parameters:
  - name: values
    type: object
    required: false
    description: Key-value updates for stack, structural, and global placeholders
---

## Overview

Utility orchestrator for surgical, idempotent bootstrap updates.


## Step-by-Step

1. Run `bootstrap-agents-fill` to apply only provided values.
2. Run `bootstrap-agents-provision` to resolve and install referenced skills.
3. Return a merged report of filled cells, resolved/provisioned skills, and unresolved warnings.

## Hard Gate

Do not return after fill-only. Provision step is mandatory on every invocation.
