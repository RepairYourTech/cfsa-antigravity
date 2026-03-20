---
description: Pre-code operational workspace setup — project scaffolding, CI/CD, hosting, and database provisioning before any implementation slices
pipeline:
  position: 8.5
  stage: setup
  predecessors: [plan-phase]
  successors: [verify-infrastructure, implement-slice]
  skills: [deployment-procedures, git-workflow, workflow-automation]
  calls-bootstrap: false
shards: [setup-workspace-scaffold, setup-workspace-cicd, setup-workspace-hosting, setup-workspace-data]
---

// turbo-all

# Setup Workspace

Operational setup of the project workspace, CI/CD pipeline, hosting platform, and database infrastructure. Runs after `/plan-phase` and before any `/implement-slice`. These are operational tasks — not TDD-able code.

**Prerequisite**: Phase plan must exist and be approved. If no phase plan exists → **STOP**: run `/plan-phase` first.

---

## 0. Pre-flight

1. Read `.agent/skills/session-continuity/SKILL.md` and follow its session-open protocol. Check `.agent/progress/sessions/` for any previous session working on `setup-workspace`. If found → read the session close log to determine which shards completed and resume from the next incomplete shard.
2. Read the approved phase plan from `docs/plans/phases/phase-N.md`
3. Read `docs/plans/*-architecture-design.md` for the architecture pattern

**Architecture pattern detection** — determines iteration strategy:

| Pattern | How to Detect | Iteration |
|---------|--------------|-----------|
| Monolith | Single service in architecture doc | Single pass through all shards |
| Monorepo | Multiple packages/workspaces listed | Iterate per package in scaffold; shared platform |
| Multi-repo | Separate repositories listed | Full pass per repo |

If the architecture pattern is not documented → **HARD STOP**: "Architecture pattern (monolith / monorepo / multi-repo) must be decided in `/create-prd-architecture`. Run it first."

3. Read the surface stack map from `.agent/instructions/tech-stack.md`
4. Verify cross-cutting categories (CI/CD, Hosting, Security) have filled values

**If any cross-cutting cell is empty** → **STOP**: run `/bootstrap-agents` first.

---

## 1. Run shards in sequence

Execute each shard in order. Each shard has its own verification gate — do not proceed to the next shard until the current one passes.

| Order | Shard | What It Does | Gate |
|-------|-------|-------------|------|
| 1 | `/setup-workspace-scaffold` | Project init, structure, deps, configs | Dev server starts |
| 2 | `/setup-workspace-cicd` | CI/CD pipeline configuration | Pipeline runs (even if tests fail — no code yet) |
| 3 | `/setup-workspace-hosting` | Hosting provisioning + first deploy | Staging URL accessible |
| 4 | `/setup-workspace-data` | Database provisioning + migration setup | DB connectable + migration framework initialized |

For **monorepo** projects: scaffold iterates per workspace, then CI/CD creates one pipeline with per-workspace jobs, hosting creates per-service deploy targets, data creates per-service databases (or shared if architecture specifies).

For **multi-repo** projects: run the entire 4-shard sequence per repository.

---

## 2. Run verification

After all 4 shards complete, run `/verify-infrastructure` with trigger `workspace`.

**HARD GATE**: Do not proceed to `/implement-slice` until `/verify-infrastructure` produces a `✅ PASS` report.

---

## 2.5. Completion Gate (MANDATORY)

1. Update `.agent/progress/` — mark workspace setup as complete
2. Scan this conversation for memory-capture triggers (see rule: `memory-capture`):
   - Patterns observed → write to `memory/patterns.md`
   - Non-trivial decisions made → write to `memory/decisions.md`
   - Blockers hit → write to `memory/blockers.md`
3. If no triggers found → confirm: "No new patterns, decisions, or blockers to log"
4. Read `.agent/skills/session-continuity/protocols/05-session-close.md` and write a session close log

> **This step is not skippable.** Do not call `notify_user` until all items above are complete.

## 3. Completion

Use `notify_user` to present results:

- **All shards + verification pass**: "✅ Workspace operational. Next: `/implement-slice` for the first slice (00-infrastructure code layer)."
- **Any shard or verification fails**: "❌ Workspace setup incomplete. [list failures]. Fix and re-run the failing shard."
