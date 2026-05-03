# {Node Name} — Index

> **Level**: {surface | domain | sub-domain}
> **Parent**: [{parent-name}](../{parent}-index.md)
> **Status**: [SURFACE] / [BREADTH] / [DEEP] / [EXHAUSTED]
> **Last updated**: {timestamp}

## Overview

_What this node contains and why it exists. 2-3 sentences describing the domain or sub-domain's purpose and scope._

## Children

| # | Name | Type | Path | Status | Deep Think |
|---|------|------|------|--------|------------|
| 01 | _{child-name}_ | domain / sub-domain / feature | [01-slug](./01-slug/) or [01.01-slug.md](./01.01-slug.md) | [SURFACE] | _N hypotheses_ |
| 02 | ... | ... | ... | ... | ... |

> **Type column values:**
> - `domain` — a top-level grouping within a surface (folder with index + CX)
> - `sub-domain` — a grouping within a domain that has 2+ interacting capabilities (folder with index + CX)
> - `feature` — a leaf node describing a single capability (.md file)

## Role Matrix

| Child | {Persona 1} | {Persona 2} | {Persona 3} | {Persona 4} |
|-------|-------------|-------------|-------------|-------------|
| 01-child | ✅ Full | ⚙️ Config | 👁️ View | ❌ None |
| 02-child | ✅ Full | ✅ Full | ❌ None | ❌ None |

> **Legend**: ✅ Full access · ⚙️ Configuration only · 👁️ Read-only · 📊 Reports only · ❌ No access
>
> **Rules:**
> - Persona names come from `meta/personas.md` — use short names (e.g., "Tech", "Owner", "CSR", "Consumer")
> - NEVER redefine a persona here — reference only
> - Only list children that exist — the matrix grows as children are added
> - Access icons are shorthand; detailed per-role behavior lives in each feature file's **Role Lens**

## Decision Log

| # | Decision | Context | Source |
|---|----------|---------|--------|
| D-01 | _what was decided_ | _why this was the right call_ | _conversation / document / user directive_ |

## Open Questions

| # | Question | Owner | Deferred To |
|---|----------|-------|-------------|
| Q-01 | _question_ | User / Agent / /create-prd | _pipeline stage_ |

> **Notes for agents:**
> - This template is used at EVERY folder level in the fractal structure (surface, domain, sub-domain)
> - The content differs by level — a surface index lists domains, a domain index lists sub-domains/features
> - Status propagates upward: all children `[EXHAUSTED]` → node is `[EXHAUSTED]`; all `[DEEP]`+ → node is `[DEEP]`
> - When adding a new child, update BOTH the Children table AND the Role Matrix
