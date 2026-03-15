# Tech Stack

<!-- 
  THIS FILE IS A TEMPLATE.
  The /bootstrap-agents workflow fills the Surface Stack Map and Global Settings below.
  Empty cells are marked with — (not applicable) or ⚠️ (not yet resolved).
-->

## Surface Stack Map

The surface stack map is the **single source of truth** for all per-surface stack decisions and cross-cutting project-wide skills. Every workflow that needs to load skills or run commands resolves them from this map — NOT from scattered placeholders.

### How Workflows Use This Map

**Surface-aware workflows** (spec-writing, implementation):
1. Determine the shard/slice's surface from its directory path or surface tag
2. Look up the row for that surface in the Per-Surface table below
3. Load all skills listed in the required column(s) — cells are comma-separated lists
4. Skip cells marked `—` (not applicable for this surface)

**Cross-cutting workflows** (validation, infrastructure verification):
1. Read the Cross-Cutting Skills table below
2. Load all skills listed in the required category

**Single-surface projects**: The Per-Surface table has exactly one row. All lookups resolve identically to a flat scalar model. No conditional logic needed.

### Per-Surface Skills

Each cell is a comma-separated list of skill directory names from `.agent/skills/`. Use `—` for "not applicable."

<!-- Bootstrap fills this table. One row per confirmed surface + a `shared` row for cross-surface backend. -->

| Surface | Languages | BE Frameworks | FE Frameworks | FE Design | ORMs | State Mgmt | Databases | Unit Tests | E2E Tests | Test Cmd | Validation Cmd | Lint Cmd | Build Cmd | Dev Cmd | Package Mgr |
|---------|-----------|---------------|---------------|-----------|------|------------|-----------|------------|-----------|----------|----------------|----------|-----------|---------|-------------|
| {{SURFACE_ROW}} |

> **Multi-value cells**: A surface can list multiple skills per column (e.g., `tailwind, vanilla-css` or `supabase, surrealdb, pglite`). Workflows iterate and load ALL listed skills.

> **Shared row**: The `shared` surface represents cross-surface backend infrastructure (API layer, shared database, etc.). Shards in `docs/plans/shared/` resolve against this row.

### Cross-Cutting Skills

Project-wide skills that don't vary per surface. Each value column is also comma-separated.

<!-- Bootstrap fills this table from project-wide tech stack decisions. -->

| Category | Skills |
|----------|--------|
| Auth | {{AUTH}} |
| CI/CD | {{CI_CD}} |
| Hosting | {{HOSTING}} |
| Security | {{SECURITY}} |
| API Design | {{API_DESIGN}} |
| Accessibility | {{ACCESSIBILITY}} |
| Contract Library | {{CONTRACT_LIBRARY}} |

### Map Verification

A valid surface stack map must satisfy:
1. **At least one row** in the Per-Surface table (even single-surface projects)
2. **Languages column is never empty** — every surface has at least one language
3. **Test Cmd column is never empty** — every surface must be testable
4. **No `⚠️` cells** — all skill resolution must be complete before implementation begins

Verification gates in `plan-phase` and `implement-slice` check these conditions. See `.agent/skills/session-continuity/protocols/10-placeholder-verification-gate.md` for the full verification procedure.

---

## Global Settings

<!-- These are project-wide values, not per-surface. Bootstrap fills them. -->

| Setting | Value |
|---------|-------|
| Project Name | {{PROJECT_NAME}} |
| Description | {{DESCRIPTION}} |
| Stack Summary | {{TECH_STACK_SUMMARY}} |
| Surfaces | {{SURFACES}} |
| Architecture Doc | {{ARCHITECTURE_DOC}} |

---

## Installed Skills

<!-- Updated by /bootstrap-agents-provision after skill discovery and provisioning -->
{{INSTALLED_SKILLS}}

## Reference

- [Architecture Design](../../{{ARCHITECTURE_DOC}}) — full system design with rationale
- [Engineering Standards](../../docs/plans/ENGINEERING-STANDARDS.md) — Quality thresholds
