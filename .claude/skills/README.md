# Claude Code Skills

This directory contains all skills for the CFSA pipeline in Claude Code.

## Subdirectories

### `workflows/`
Main pipeline workflow skills that correspond to Antigravity's workflow markdown files. Each workflow skill implements a complete pipeline stage:

- `workflow-ideate.md` — Ideation parent orchestrator
- `workflow-ideate-extract.md` — Input classification and ideation folder seeding
- `workflow-ideate-discover.md` — Recursive domain and feature exploration
- `workflow-ideate-validate.md` — Constraints, exhaustion, rubric checks, and vision compilation
- `workflow-create-prd.md` — Architecture-design parent orchestrator
- `workflow-create-prd-stack.md` — Constraint-first tech stack decisions
- `workflow-create-prd-design-system.md` — Design-system decision workflow
- `workflow-create-prd-architecture.md` — System/error/data architecture workflow
- `workflow-create-prd-security.md` — Security/compliance/integration workflow
- `workflow-create-prd-compile.md` — Final architecture and standards compilation
- `workflow-decompose-architecture.md` — Decomposition parent orchestrator
- `workflow-decompose-architecture-structure.md` — IA/BE/FE structure and skeleton generation
- `workflow-decompose-architecture-validate.md` — Dependency/deep-dive/tracker validation
- `workflow-write-architecture-spec.md` — IA spec parent orchestrator
- `workflow-write-architecture-spec-design.md` — IA design draft workflow
- `workflow-write-architecture-spec-deepen.md` — IA deepening and ambiguity gate workflow
- `workflow-write-be-spec.md` — BE spec parent orchestrator
- `workflow-write-be-spec-classify.md` — BE classification and source ingestion workflow
- `workflow-write-be-spec-write.md` — BE drafting, validation, and handoff workflow
- `workflow-write-fe-spec.md` — FE spec parent orchestrator
- `workflow-write-fe-spec-classify.md` — FE classification and source ingestion workflow
- `workflow-write-fe-spec-write.md` — FE drafting, validation, and handoff workflow
- `workflow-plan-phase.md` — Phase planning parent orchestrator
- `workflow-plan-phase-preflight.md` — Planning preflight and consistency gates
- `workflow-plan-phase-write.md` — Slice planning and progress generation workflow
- `workflow-implement-slice.md` — Implement-slice parent orchestrator
- `workflow-implement-slice-setup.md` — Implement-slice setup and contract workflow
- `workflow-implement-slice-tdd.md` — Implement-slice TDD and progress workflow
- `workflow-validate-phase.md` — Validate-phase parent orchestrator
- `workflow-validate-phase-quality.md` — Validate-phase code-quality gates workflow
- `workflow-validate-phase-readiness.md` — Validate-phase readiness and verdict workflow
- `workflow-audit-ambiguity.md` — Ambiguity-audit parent orchestrator
- `workflow-audit-ambiguity-rubrics.md` — Ambiguity scope/rubric preparation workflow
- `workflow-audit-ambiguity-execute.md` — Ambiguity execution/remediation workflow
- `workflow-setup-workspace.md` — Setup-workspace parent orchestrator
- `workflow-setup-workspace-scaffold.md` — Setup-workspace scaffold workflow
- `workflow-setup-workspace-cicd.md` — Setup-workspace CI/CD workflow
- `workflow-setup-workspace-hosting.md` — Setup-workspace hosting workflow
- `workflow-setup-workspace-data.md` — Setup-workspace data workflow
- `workflow-bootstrap-agents.md` — Bootstrap parent orchestrator
- `workflow-bootstrap-agents-fill.md` — Bootstrap fill workflow
- `workflow-bootstrap-agents-provision.md` — Bootstrap provision workflow
- `workflow-propagate-decision.md` — Decision propagation parent workflow
- `workflow-propagate-decision-scan.md` — Decision propagation scan workflow
- `workflow-propagate-decision-apply.md` — Decision propagation apply workflow
- `workflow-remediate-pipeline.md` — Remediation parent workflow
- `workflow-remediate-pipeline-assess.md` — Remediation assessment workflow
- `workflow-remediate-pipeline-execute.md` — Remediation execution workflow
- `workflow-remediate-shard-split.md` — Shard split remediation workflow
- `workflow-resolve-ambiguity.md` — Ambiguity resolution workflow
- `workflow-evolve-feature.md` — Feature evolution parent workflow
- `workflow-evolve-feature-classify.md` — Feature evolution classify workflow
- `workflow-evolve-feature-cascade.md` — Feature evolution cascade workflow
- `workflow-evolve-contract.md` — Contract evolution workflow
- `workflow-sync-kit.md` — Kit sync workflow
- `workflow-update-architecture-map.md` — Architecture map update workflow
- `workflow-verify-infrastructure.md` — Infrastructure verification workflow

### `setup/`
Setup and bootstrap skills for initializing the CFSA pipeline:

- `setup-cfsa.md` — Main setup skill (equivalent to `/bootstrap-agents`)
- `setup-fill-placeholders.md` — Fill tech stack and placeholder values
- `setup-provision-skills.md` — Install skills from skill library
- `setup-verify.md` — Verify installation and readiness

### `utilities/`
Helper skills used throughout the pipeline:

- `resolve-skill.md` — Dynamic skill resolution with 4-tier chain

## Skill Structure

Each skill follows this format:

```yaml
---
name: skill-name
description: Human-readable description
parameters:
  - name: input
    type: string
    required: true
---

## Overview
[Brief description]

## Prerequisites
[Required conditions]

## Step-by-Step
### Step 1 — [Name]
[Detailed instructions]

## Completion Checklist
- [ ] Verification steps

## Next Steps
[Recommended next actions]
```

## Invocation

Skills are invoked by Claude Code based on context, user request, or orchestration by other skills.

## Difference from Antigravity Workflows

Antigravity workflows are passive markdown files that agents read and follow. Claude Code skills are active, executable units that:

1. Accept parameters and return structured outputs
2. Can call other skills (composition)
3. Integrate with Claude Code's Tasks system
4. Maintain state across sessions via memory protocols

## See Also

- `.claude/instructions/workflow.md` — Mandatory execution sequence
- `.claude/rules/` — Always-active rules
- `.claude/memory/` — State management and session continuity
