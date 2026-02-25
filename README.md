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

    Step 2: /audit-ambiguity vision (recommended)
      Scores the vision document on a rubric. Fills gaps before architecture.
      Output: docs/audits/vision-audit.md

    Step 3: /create-prd
      Reads vision.md. Walks you through tech stack decisions one at a time.
      Each confirmed decision fires bootstrap to fill templates and install skills.
      Output: docs/plans/architecture-design.md
              docs/plans/ENGINEERING-STANDARDS.md
              docs/plans/data-placement-strategy.md

    Step 4: /audit-ambiguity architecture (recommended)
      Scores the architecture document on a rubric. Fills gaps before decomposition.
      Output: docs/audits/architecture-audit.md

    Step 5: /decompose-architecture
      Breaks architecture into numbered domain shards.
      Output: docs/plans/ia/ (shard index + shards)

    Step 6: /write-architecture-spec
      Takes one skeleton shard. Writes full interaction spec — contracts, data models, RBAC, events.
      Output: docs/plans/ia/[shard-name].md (filled)

    Step 7: /write-be-spec
      Reads IA shard. Writes backend spec — endpoints, schemas, middleware, DAL.
      Output: docs/plans/be/[shard-name].md

    Step 8: /write-fe-spec
      Reads BE spec + IA shard. Writes frontend spec — components, state, interactions.
      Output: docs/plans/fe/[shard-name].md

    Step 9: /audit-ambiguity all
      Cascade audit across all layers. Final quality gate before implementation.
      Output: Full ambiguity report + remediation

    Step 10: /plan-phase
      Reads architecture + specs. Creates dependency-ordered TDD vertical slices.
      Output: docs/plans/phases/phase-[n].md

    Step 11: /implement-slice
      Takes one slice. Red → Green → Refactor across all four surfaces.
      Output: Working code + passing tests

    Step 12: /validate-phase
      Full validation gate — tests, coverage, lint, type-check, build.
      Output: Pass/fail with details

    Repeat Steps 10–12 for each slice in the phase, then repeat from Step 10 for the next phase.

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
