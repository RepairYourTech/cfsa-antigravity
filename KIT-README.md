# Vibe to Production
### the anti-MVP spec pipeline

> Designed for Antigravity — adaptable to other agents

---

## What This Is

This is a **Constraint-First Specification Architecture (CFSA)** pipeline — a reusable workflow toolkit that builds production-grade software from line one. It turns a raw idea into exhaustively specified, test-driven, production-quality code through a series of progressive gates.

Five principles define the architecture:

1. **Constraints before decisions.** Every tech stack choice, every design direction, every architecture decision begins by mapping the constraints that already exist — compliance requirements, team expertise, budget, surfaces, existing infrastructure. Constraints narrow the option space before options are even presented. Some decisions become obvious. Others get a filtered set of viable choices scored against the constraints. No open-ended debates. No decision without context.

2. **Exhaustive iteration over shallow speed.** The pipeline refuses to move forward with ambiguity. Each stage has quality gates that measure specification depth — not just "is something written" but "does it answer every question an implementer would ask." Ambiguity audits score documents on a rubric. If gaps exist, they're filled before the next stage begins. The output quality bar is constant regardless of input quality — a one-liner idea gets an exhaustive interview; a 50KB spec gets proportional extraction. Both produce the same depth.

3. **Work shifted left, not deferred right.** Decisions that would normally be made during implementation — data placement, access control, error handling, edge cases — are made during specification. By the time code is written, the spec has already answered every question the developer would ask. Implementation becomes mechanical: translate the spec into code, write the failing test, make it pass. No design decisions remain.

4. **Progressive decision locking.** Each pipeline stage locks decisions. Downstream stages build on locked decisions and may not contradict them. Vision locks the problem and personas. Architecture locks the tech stack and system design. Specifications lock the contracts and data models. Implementation locks the code. To change a locked decision, re-run the originating stage and cascade changes downstream. This prevents the "refactor everything" problem.

5. **TDD as the implementation contract.** Tests are not an afterthought — they are the implementation specification. The contract (Zod schema) defines the shape. The test asserts the behavior. The implementation satisfies both. Red → Green → Refactor, never reversed. Every vertical slice touches all four surfaces: contract, test, backend, frontend. Nothing ships partially.

**The core guarantee**: regardless of how you start — a 50KB detailed spec, a thin bullet list, a chat transcript, or a one-liner in the terminal — the pipeline produces the same output quality. Only the interview work differs. The output depth is constant.

This is not an MVP toolkit. There is no "fix it later" because there is nothing to fix.

---

## How to Use It (Pipeline Walkthrough)

The pipeline is a linear sequence of commands. Each step tells you what to run next.

    Step 1: /ideate
      You describe your idea (or point to a document with @file).
      The pipeline interviews you until every domain is explored.
      Output: docs/plans/vision.md

    Step 2: /audit-ambiguity vision    ── MANDATORY ──
      Scores the vision document against a rubric.
      Agent auto-remediates any gaps found, then requires a fresh re-run.
      Not optional — /ideate will not propose /create-prd until this passes.
      Output: docs/audits/vision-audit.md

> [!IMPORTANT]
> **Fresh-run rule:** The session that fixed gaps cannot be the session that passes.
> Re-run `/audit-ambiguity [layer]` as a new invocation so the agent re-reads the
> updated source document from disk. The audit only passes when a clean session scores 0%.

      /resolve-ambiguity [layer or @file]  ── UTILITY — callable at any stage ──
        Targeted ambiguity resolution for any pipeline document or layer.
        Use when a specific section needs clarification without a full audit cycle.
        After resolving, re-run the relevant audit as a fresh invocation to confirm the fix.

        Examples:
          /resolve-ambiguity vision
          /resolve-ambiguity architecture
          /resolve-ambiguity @docs/plans/ia/auth.md

    Step 3: /create-prd
      Reads vision.md. Walks you through tech stack decisions one at a time.
      Each confirmed decision fires bootstrap to fill templates and install skills.
      Output: docs/plans/architecture-design.md
              docs/plans/ENGINEERING-STANDARDS.md
              docs/plans/data-placement-strategy.md

    Step 4: /audit-ambiguity architecture (recommended)
      Scores the architecture document on a rubric. Fills gaps before decomposition.
      Output: docs/audits/architecture-audit.md
      If gaps are found: agent auto-remediates, then re-run as a fresh invocation (see fresh-run rule above).

    Step 5: /decompose-architecture
      Breaks architecture into numbered domain shards.
      Output: docs/plans/ia/ (shard index + skeleton shards)

    Step 6: /write-architecture-spec       ← repeat for EVERY shard
      Takes one skeleton shard. Writes full interaction spec — contracts, data models, RBAC, events.
      Output: docs/plans/ia/[shard-name].md (filled)

    ► /audit-ambiguity ia                  [MANDATORY — 0% before Step 7]
      Runs after ALL IA shards are complete. Hard gate — no BE specs until this passes.
      Output: docs/audits/ia-audit.md
      If gaps are found: agent auto-remediates, then re-run as a fresh invocation (see fresh-run rule above).

    Step 7: /write-be-spec                 ← repeat for EVERY shard
      Reads IA shard. Writes backend spec — endpoints, schemas, middleware, DAL.
      Output: docs/plans/be/[shard-name].md

    ► /audit-ambiguity be                  [MANDATORY — 0% before Step 8]
      Runs after ALL BE specs are complete. Hard gate — no FE specs until this passes.
      Output: docs/audits/be-audit.md
      If gaps are found: agent auto-remediates, then re-run as a fresh invocation (see fresh-run rule above).

    Step 8: /write-fe-spec                 ← repeat for EVERY shard
      Reads BE spec + IA shard. Writes frontend spec — components, state, interactions.
      Output: docs/plans/fe/[shard-name].md

    ► /audit-ambiguity fe                  [MANDATORY — 0% before Step 9]
      Runs after ALL FE specs are complete. Hard gate — no planning until this passes.
      Output: docs/audits/fe-audit.md
      If gaps are found: agent auto-remediates, then re-run as a fresh invocation (see fresh-run rule above).

    ─── ALL specs (IA + BE + FE) must be complete before Step 9 ───

    Step 9: /plan-phase
      Reads architecture + specs. Creates dependency-ordered TDD vertical slices.
      Only runs after Phase N-1 is complete (skipped for Phase 1).
      Output: docs/plans/phases/phase-[n].md

    Step 10: /implement-slice (infrastructure slice)
      First slice — CI/CD, environment, deployment, scaffolding, database.
      Output: Working infrastructure + passing tests

    Step 10.5: /verify-infrastructure      ── HARD GATE ──
      Verifies CI/CD green, staging live, migrations clean. Must pass before feature slices.
      Output: docs/audits/verify-infrastructure-[date].md

    Step 11: /implement-slice (auth slice)
      Auth middleware, registration, login, token management.
      Output: Working auth + passing tests

    Step 11.5: /verify-infrastructure      ── HARD GATE (auth pass) ──
      Re-runs with auth smoke test enabled. Must pass before auth-dependent feature slices.
      Output: docs/audits/verify-infrastructure-[date].md

    Step 12: /implement-slice (remaining feature slices)
      Takes one slice at a time. Red → Green → Refactor across all four surfaces.
      Output: Working code + passing tests per slice

    Step 13: /validate-phase
      Full validation gate — tests, coverage, lint, type-check, build,
      CI/CD verification, staging deployment, migration check.
      Output: Pass/fail with details

    ─── Repeat Steps 9–13 for each phase ───

---

## Getting Started

### Prerequisites

- Antigravity IDE (or any compatible agent that can read files, write files, and execute commands)

### Installation

Copy the `.agent/` and `docs/` directories into your target project:

**Windows:**
```cmd
xcopy /E /I spec-pipeline-starter\.agent your-project\.agent
xcopy /E /I spec-pipeline-starter\docs your-project\docs
```

**macOS / Linux:**
```bash
cp -r spec-pipeline-starter/.agent /path/to/your-project/
cp -r spec-pipeline-starter/docs /path/to/your-project/
```

### Agent Setup

| Agent | What to Do |
|-------|------------|
| **Antigravity** | Copy `GEMINI.md` to your project root — it's the system prompt |
| **Claude Code** | Copy rules/instructions into `.claude/` using Claude's format |
| **Cursor** | Reference from `.cursorrules` or your Cursor config |
| **Windsurf** | Reference from `.windsurfrules` or equivalent |
| **Other** | Follow your agent's convention for loading system instructions |

### Start

```
/ideate
```

The pipeline tells you what to run next at every step. You never have to guess.

---

## The Skill System

**Bundled skills** ship with the kit in `.agent/skills/`. These are universal capabilities every project needs regardless of tech stack — things like TDD workflow, clean code principles, accessibility auditing, brainstorming, and systematic debugging. They're always present, always loaded.

**Skill library** lives in `.agent/skill-library/`. These are stack-specific and surface-specific skills that get provisioned by bootstrap as tech decisions are confirmed during `/create-prd`. They're never loaded directly — bootstrap copies the relevant ones into `.agent/skills/` and fills any placeholders with your project's confirmed values.

Bootstrap fires once per confirmed decision — it fills only what was just decided and leaves everything else untouched.
