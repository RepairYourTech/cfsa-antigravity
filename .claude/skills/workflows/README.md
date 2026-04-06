# Workflow Skills

This directory contains Claude Code workflow skills that port Antigravity pipeline workflows.

## Files

- `workflow-ideate.md` — Parent ideation orchestrator (entrypoint)
- `workflow-ideate-extract.md` — Input classification, structural classification, seeding, engagement/expansion selection
- `workflow-ideate-discover.md` — Recursive domain and feature exploration with Deep Think + CX gate behavior
- `workflow-ideate-validate.md` — Constraints, exhaustion checks, quality review, vision + feature ledger compilation
- `workflow-create-prd.md` — Parent architecture-design orchestrator
- `workflow-create-prd-stack.md` — Constraint-first stack decisions with per-axis synthesis
- `workflow-create-prd-design-system.md` — Seven design system decisions and progressive document writes
- `workflow-create-prd-architecture.md` — System architecture, error architecture, and data strategy
- `workflow-create-prd-security.md` — Security/compliance model, attack surface, integrations, observability
- `workflow-create-prd-compile.md` — Compile dated architecture design and engineering standards
- `workflow-decompose-architecture.md` — Parent decomposition orchestrator for IA/BE/FE structure
- `workflow-decompose-architecture-structure.md` — Create shard skeletons and layer indexes
- `workflow-decompose-architecture-validate.md` — Validate dependency graph, deep dives, and tracker outputs
- `workflow-write-architecture-spec.md` — Parent IA authoring orchestrator
- `workflow-write-architecture-spec-design.md` — IA section design pass with write-as-you-go locking
- `workflow-write-architecture-spec-deepen.md` — Iterative deepening, ambiguity gates, and final IA handoff
- `workflow-write-be-spec.md` — Parent BE authoring orchestrator
- `workflow-write-be-spec-classify.md` — IA shard classification and source inventory for BE specs
- `workflow-write-be-spec-write.md` — BE spec writing, deepening passes, and ambiguity/quality gates
- `workflow-write-fe-spec.md` — Parent FE authoring orchestrator
- `workflow-write-fe-spec-classify.md` — FE classification and source ingestion workflow
- `workflow-write-fe-spec-write.md` — FE drafting, validation, and plan-phase handoff gating
- `workflow-plan-phase.md` — Parent phase-planning orchestrator
- `workflow-plan-phase-preflight.md` — Sequencing and cross-layer preflight checks
- `workflow-plan-phase-write.md` — Slice derivation, ordering, and phase plan/progress generation
- `workflow-implement-slice.md` — Parent implementation orchestrator for a single vertical slice
- `workflow-implement-slice-setup.md` — Preconditions, context loading, and contract setup
- `workflow-implement-slice-tdd.md` — RED→GREEN→REFACTOR execution with validation/progress gates
- `workflow-validate-phase.md` — Parent phase validation orchestrator
- `workflow-validate-phase-quality.md` — Code-quality gate execution for a completed phase
- `workflow-validate-phase-readiness.md` — Production-readiness gates and final validation verdict
- `workflow-audit-ambiguity.md` — Parent ambiguity-audit orchestrator
- `workflow-audit-ambiguity-rubrics.md` — Scope/rubric preparation and document enumeration
- `workflow-audit-ambiguity-execute.md` — Per-document scoring, remediation, and verdict workflow
- `workflow-setup-workspace.md` — Parent operational workspace-setup orchestrator
- `workflow-setup-workspace-scaffold.md` — Project/workspace scaffolding and base config setup
- `workflow-setup-workspace-cicd.md` — CI/CD pipeline setup and execution verification
- `workflow-setup-workspace-hosting.md` — Hosting provisioning and staging deployment setup
- `workflow-setup-workspace-data.md` — Database provisioning and migration framework setup
- `workflow-bootstrap-agents.md` — Parent bootstrap orchestrator (fill + provision)
- `workflow-bootstrap-agents-fill.md` — Placeholder/map fill workflow
- `workflow-bootstrap-agents-provision.md` — Skill provisioning workflow with 4-tier resolution
- `workflow-propagate-decision.md` — Parent decision-propagation orchestrator
- `workflow-propagate-decision-scan.md` — Contradiction/assumption scan workflow
- `workflow-propagate-decision-apply.md` — One-by-one contradiction apply workflow
- `workflow-remediate-pipeline.md` — Parent layer-by-layer remediation orchestrator
- `workflow-remediate-pipeline-assess.md` — Remediation state assessment workflow
- `workflow-remediate-pipeline-execute.md` — Remediation execution/fresh-run loop workflow
- `workflow-remediate-shard-split.md` — Post-split cross-reference remediation workflow
- `workflow-resolve-ambiguity.md` — Targeted ambiguity resolution workflow
- `workflow-evolve-feature.md` — Parent feature-evolution orchestrator
- `workflow-evolve-feature-classify.md` — Feature evolution classification workflow
- `workflow-evolve-feature-cascade.md` — Feature evolution cascade workflow
- `workflow-evolve-contract.md` — Contract evolution workflow
- `workflow-sync-kit.md` — Upstream kit sync workflow
- `workflow-update-architecture-map.md` — Living architecture map update workflow
- `workflow-verify-infrastructure.md` — Infrastructure verification workflow

## Extension Pattern

When adding a new workflow skill:
1. Use `workflow-<name>.md` for parent workflows
2. Use `workflow-<name>-<shard>.md` for shard skills
3. Include frontmatter: `name`, `description`, `parameters`
4. Keep deterministic step order and explicit stop gates
5. Add parity links to source `.agent/workflows/*.md`

## Conventions

- Parent workflow orchestrates shards only; shard-level quality gates stay in shards
- Every gate that writes artifacts must write immediately to disk
- If a gate requires user confirmation, stop and wait
- Recommend the next valid pipeline command at the end
