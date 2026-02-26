---
description: A mid-level developer must be able to add a feature by reading READMEs alone
alwaysApply: true
---

# Extensibility

## The Rule

**A mid-level developer must be able to onboard, understand, and extend any part of the codebase without the AI that generated it.** If they can't add a feature by reading the READMEs in the relevant directories, we've failed.

## File Size Limits

| File Type | Max Lines | Reasoning |
|-----------|-----------|-----------|
| Components (`.tsx`) | 200 | Extract sub-components if larger |
| Utilities / lib (`.ts`) | 300 | Split into focused modules |
| Schema files (`.schema.ts`) | 150 | One domain per schema file |
| Test files (`.test.ts`) | 400 | Group by feature, split if needed |
| Config files | 100 | Keep flat and readable |

## Directory Documentation

**Every directory that contains more than 2 files MUST have a `README.md`** explaining:

1. What this directory contains
2. How to add more of the same (the extension pattern)
3. What conventions to follow
4. Links to related directories

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Schema files | `[feature].schema.ts` | `model-config.schema.ts` |
| Components | PascalCase directory + `index.tsx` | `ModelSelector/index.tsx` |
| Utilities | `[feature].ts` in `lib/` | `lib/rate-limiter.ts` |
| API routes | `[resource]/[action].ts` | `api/models/list.ts` |
| Test files | `[source-file].test.ts(x)` | `ModelSelector.test.tsx` |

## Anti-Spaghetti Rules

- No `any` types — use `unknown` and narrow with type guards
- No circular imports — dependency graph must be a DAG
- No business logic in components — components render, lib/ computes
- No copy-paste patterns — if you wrote it twice, extract it
- Same pattern everywhere — if existing code does X one way, new code does X the same way
