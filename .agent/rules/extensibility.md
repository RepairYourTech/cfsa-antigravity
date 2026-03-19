---
description: A mid-level developer must be able to add a feature by reading READMEs alone
trigger: always_on
---

# Extensibility

## The Rule

**A mid-level developer must be able to onboard, understand, and extend any part of the codebase without the AI that generated it.** If they can't add a feature by reading the READMEs in the relevant directories, we've failed.

## File Size Limits

| File Type | Max Lines | Reasoning |
|-----------|-----------|-----------|
| Components | 200 | Extract sub-components if larger |
| Utilities / lib | 300 | Split into focused modules |
| Schema files | 150 | One domain per schema file |
| Test files | 400 | Group by feature, split if needed |
| Config files | 100 | Keep flat and readable |

## Directory Documentation

**Every directory that contains more than 2 files MUST have a `README.md`** explaining:

1. What this directory contains
2. How to add more of the same (the extension pattern)
3. What conventions to follow
4. Links to related directories

## Naming Conventions

Follow the project's established conventions in `.agent/instructions/patterns.md`. When no convention exists yet, use the stack's community standard.

## Anti-Spaghetti Rules

- No `any` types — use `unknown` and narrow with type guards
- No circular imports — dependency graph must be a DAG
- No business logic in components — components render, lib/ computes
- No copy-paste patterns — if you wrote it twice, extract it
- Same pattern everywhere — if existing code does X one way, new code does X the same way

## What Gets Flagged

| Pattern | Verdict |
|---------|---------|
| Component file over 200 lines | ❌ Rejected. Extract sub-components. |
| Directory with 3+ files and no README.md | ❌ Rejected. Add one. |
| Circular import detected | ❌ Rejected. Restructure dependencies. |
| Copy-pasted logic in two files | ❌ Rejected. Extract to shared module. |
| New code uses different pattern than existing code for same thing | ❌ Rejected. Match existing conventions. |
| Clean, focused modules with README documentation | ✅ Correct. |
