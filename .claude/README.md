# CFSA Pipeline for Claude Code

This directory contains the CFSA (Constraint-First Specification Architecture) pipeline adapted for Claude Code.

## Directory Structure

```
.claude/
├── skills/              # Pipeline workflow skills and utilities
│   ├── workflows/       # Main pipeline workflows (ideate, create-prd, etc.)
│   ├── setup/           # Setup and bootstrap skills
│   └── utilities/       # Helper skills (resolution, templates, etc.)
├── rules/               # Always-active rules that apply to every task
├── instructions/        # Core directives (workflow, tech-stack, patterns)
├── skill-library/       # Claude-owned skill library
└── memory/              # CFSA-specific memory protocols
    ├── decisions.md     # Locked decisions log
    ├── patterns.md      # Reusable patterns with confidence scores
    ├── blockers.md      # Active and resolved blockers
    └── sessions/        # Session logs for continuity
```

## Parallel Structure

This directory is the standalone Claude Code runtime for the CFSA pipeline. It sits alongside the Antigravity runtime in this repository, but `.claude/` owns its Claude execution assets locally.

## Key Differences from Antigravity Version

1. **Skills vs Workflows**: Claude Code uses skills instead of passive workflow markdown files
2. **Task System**: Uses Claude Code's built-in Tasks system for progress tracking
3. **Progress + Memory**: Uses `.claude/progress/` for pipeline state and `.claude/memory/` for CFSA memory
4. **Invocation**: Workflows are invoked as skills rather than slash commands in markdown

## Installation

To install the Claude Code version:

```bash
npx cfsa-antigravity init --agent claude
```

For the Antigravity version (default):

```bash
npx cfsa-antigravity init
# or
npx cfsa-antigravity init --agent antigravity
```

## Pipeline Stages

The CFSA pipeline follows these stages regardless of the agent system:

1. **Discovery** (`/ideate`) — Raw idea → structured ideation
2. **Design** (`/create-prd`) → Architecture, tech stack, security model
3. **Specification** (`/write-*-spec`) → Detailed specs per layer
4. **Planning** (`/plan-phase`) → Dependency-ordered TDD slices
5. **Setup** (`/setup-workspace`) → Project scaffold, CI/CD, infrastructure
6. **Implementation** (`/implement-slice`) → TDD vertical slices
7. **Validation** (`/validate-phase`) → Quality gates and readiness checks

## Getting Started

After installation, start the pipeline with the ideate workflow to begin your project.

## Documentation

See the main project documentation in `docs/` for complete pipeline guides.
