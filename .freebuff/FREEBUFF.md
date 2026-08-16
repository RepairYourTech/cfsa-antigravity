# Freebuff — CFSA pipeline runtime

This directory is the standalone Freebuff runtime for the CFSA (Constraint-First Specification Architecture) pipeline.

## What to read first

1. `.freebuff/instructions/workflow.md` — mandatory execution sequence
2. `.freebuff/instructions/commands.md` — build, test, and validation commands
3. `.freebuff/rules/` — always-active rules

## Conventions

- **Root instructions**: `AGENTS.md` at the project root (installed by `cfsa-antigravity init`)
- **Skills**: `.freebuff/skills/<name>/SKILL.md`
- **Slash commands**: `.freebuff/commands/`
- **Shared memory**: `.memory/` (see `.freebuff/README.md`)
