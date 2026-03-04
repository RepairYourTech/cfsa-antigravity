---
name: performance-budgeting
description: "Axis-by-axis interview methodology for establishing engineering performance budgets during architecture PRD compilation. Use when conducting the Step 10.5 performance budget interview in /create-prd-compile."
category: product
risk: none
source: self
date_added: "2026-03-03"
---

# Performance Budgeting

## Purpose

This skill owns the interview methodology for establishing concrete, enforceable performance thresholds across all applicable surfaces.

## When to Use This Skill

- During `/create-prd-compile` Step 10.5 — the performance budget interview
- Any time engineering performance standards need to be established from scratch
- When updating `ENGINEERING-STANDARDS.md` for an existing project

## Write-As-You-Go Rule

Performance budgets are written **as you go** — each axis is discussed, decided, and immediately written to the corresponding subsection of `docs/plans/ENGINEERING-STANDARDS.md`. Do not batch them.

## Surface Conditioning

> **Surface conditioning**: Only present axes that apply to the confirmed tech stack surfaces. A CLI-only project skips Web Vitals and bundle-size axes. A web-only project skips Desktop and CLI axes. Always present API and DB axes.

## Interview Protocol

### Axis 0 — Target device tier and network baseline

Before any threshold is chosen, anchor all budgets to an explicit operating context. Require named choices — no vague defaults.

| Decision | Options (examples) |
|----------|---------------------|
| Target device tier | Low-end Android (Moto G Power), Mid-range (Pixel 7a), High-end (iPhone 15) |
| Target network condition | Slow 3G (400 Kbps, 400 ms RTT), Fast 3G (1.6 Mbps, 150 ms RTT), 4G (9 Mbps, 50 ms RTT), Wi-Fi |

Ask: "What is the lowest-spec device and slowest network your users will realistically use? All budgets will be validated against this baseline."

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `## Performance Budgets` baseline note — fill in the `[device tier]` and `[network condition]` placeholders.

### Axis 1 — Web Vitals per page type (web/desktop surfaces only)

Define LCP, INP, and CLS targets **per page type** (e.g., landing, dashboard, detail). Different page types have different acceptable thresholds.

| Page Type | LCP | INP | CLS | Notes |
|-----------|-----|-----|-----|-------|
| Landing / marketing | ≤ 2.0 s | ≤ 150 ms | ≤ 0.05 | First-impression page; tightest targets |
| Dashboard / data-heavy | ≤ 2.5 s | ≤ 200 ms | ≤ 0.1 | Streaming data acceptable |
| Detail / form | ≤ 2.0 s | ≤ 100 ms | ≤ 0.05 | Interaction-heavy; INP matters most |

Ask: "Which page types does your app have, and do these starting points fit?"

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `### Web Vitals per page type`

### Axis 2 — JS bundle size per page type (web/desktop surfaces only)

Define initial and total JS budgets **per page type**, gzipped.

| Page Type | Initial JS (gzipped) | Total JS (gzipped) | Notes |
|-----------|---------------------|--------------------|-------|
| Landing / marketing | ≤ 80 KB | ≤ 150 KB | Must load fast on first visit |
| Dashboard / data-heavy | ≤ 150 KB | ≤ 300 KB | Lazy-load heavy components |

Ask: "Are there pages that pull in large libraries (maps, charts, editors)? Those need their own row."

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `### JS Bundle Size per page type`

### Axis 3 — API response time per tier

Define p50, p95, and p99 targets **per tier**, not a single number for the whole API.

| Tier | Description | p50 | p95 | p99 |
|------|-------------|-----|-----|-----|
| Tier 1 — Cached read | Response served from cache (Redis, CDN, in-memory) | ≤ 10 ms | ≤ 30 ms | ≤ 50 ms |
| Tier 2 — Uncached read | Single-entity DB fetch or simple join | ≤ 30 ms | ≤ 80 ms | ≤ 150 ms |
| Tier 3 — Write | Create, update, delete with validation | ≤ 80 ms | ≤ 200 ms | ≤ 400 ms |
| Tier 4 — Background | Async jobs, batch processing, external calls | Best-effort | ≤ 1000 ms | ≤ 3000 ms |

Ask: "Do any endpoints call external services? Those belong in Tier 4. Are there any endpoints that don't fit these four tiers?"

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `### API Response Time per tier`

### Axis 4 — DB query time per tier

Define p50 and p95 targets **per query tier**.

| Tier | Description | p50 | p95 |
|------|-------------|-----|-----|
| Tier 1 — Indexed point lookup | Primary-key or unique-index fetch | ≤ 5 ms | ≤ 15 ms |
| Tier 2 — Indexed range scan | Range or list query on indexed column | ≤ 15 ms | ≤ 50 ms |
| Tier 3 — Aggregation | COUNT, SUM, GROUP BY, window functions | ≤ 50 ms | ≤ 150 ms |
| Tier 4 — Full-text / vector / analytical | Search, similarity, or reporting queries | ≤ 100 ms | ≤ 300 ms |

Ask: "Are there any known heavy queries (reports, analytics)? Those belong in Tier 4. Any queries that don't fit these four tiers?"

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `### DB Query Time per tier`

### Axis 5 — Desktop / mobile surface budgets (if applicable)

Define surface-specific budgets using the reference table:

**Desktop**:
| Metric | Starting point |
|--------|---------------|
| Cold start | ≤ 2 s |
| Memory (idle / active) | ≤ 200 MB / ≤ 500 MB |
| Installer size | ≤ 100 MB |
| Window resize repaint | ≤ 16 ms (60 fps) |

**Mobile**:
| Metric | Starting point |
|--------|---------------|
| Cold launch | ≤ 1.5 s |
| Warm launch | ≤ 0.5 s |
| Battery drain (active) | ≤ 5 %/hr |
| Download size | ≤ 50 MB |

Ask: "Do these match your target devices and user expectations?"

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `### Desktop surfaces` and/or `### Mobile surfaces`

### Axis 6 — CI enforcement mapping

For **every budget defined in axes 0–5**, name the enforcement tool and fail condition.

| Budget Category | Enforcement Tool | Fail Condition | Fail vs. Warn |
|----------------|-----------------|----------------|---------------|
| Web Vitals | Lighthouse CI | Score below threshold | Fail |
| Bundle size | size-limit | Exceeds per-page-type cap | Fail |
| API response time | k6 / autocannon | p95 exceeds tier target | Warn (fail after baseline) |
| DB query time | pgbench / query timer | p95 exceeds tier target | Warn (fail after baseline) |
| Desktop/mobile | Platform profiler | Any metric exceeds threshold | Warn |

Ask: "For API and DB budgets, should CI fail immediately or warn-then-fail after a baseline run?"

**Write immediately** → `docs/plans/ENGINEERING-STANDARDS.md` § `### CI Enforcement`

## Closing Summary

Summarise all confirmed performance budgets. Ask: "Any axis you want to tighten, loosen, or add?"
