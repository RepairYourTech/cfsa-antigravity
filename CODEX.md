# CODEX.md

This file provides guidance to Codex when working with code in this repository.

## Project Overview

**CFSA Antigravity** is a Constraint-First Specification Architecture pipeline that transforms raw ideas into exhaustively specified, test-driven, production-quality code through progressive gates. This repository is the kit source, not a destination product.

- **Entry Point**: `npx cfsa-antigravity init`
- **Codex support model**: Codex uses `CODEX.md` for repo guidance and the shared `.agent/` runtime for workflows, rules, instructions, and skills
- **Core Philosophy**: production-grade from line one, no throwaway code, no deferred quality

## Essential Commands

```bash
npm run build
npm run check
npm run changeset
```

## Runtime Model

Codex is a first-class supported agent target, but it does not use a standalone runtime tree in this repository.

Instead:

- `cfsa-antigravity init --agent codex` installs the shared `.agent/` runtime
- `CODEX.md` provides Codex-specific repository guidance
- `AGENTS.md` remains the generic pipeline config shipped to installed projects

## What To Read First

1. `AGENTS.md`
2. `.agent/instructions/workflow.md`
3. `.agent/instructions/commands.md`
4. `docs/README.md`
5. `docs/kit-architecture.md`

## Contribution Notes

- Do not edit `template/` directly
- Update source files first, then run `npm run build`
- Run `npm run check` before considering the task complete
- Preserve `{{PLACEHOLDER}}` markers in kit source files

## Codex Alignment

If you change Codex support, keep these aligned:

- CLI help and argument parsing in `bin/cli.mjs`
- Root documentation (`README.md`, `docs/README.md`, `docs/kit-architecture.md`)
- Root config sync (`CODEX.md` copied into `template/`)
- Template integrity checks in `scripts/check-template-integrity.sh`
