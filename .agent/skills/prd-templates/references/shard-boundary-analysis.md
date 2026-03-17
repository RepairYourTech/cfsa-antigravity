# Shard Boundary Analysis

Reference data for the decompose-architecture workflow — shard boundary heuristics, load thresholds, classification types, and split proposal format.

## Fractal Tree Signals for Shard Boundaries

| Signal | What It Means for Sharding |
|--------|---------------------------|
| Deep fractal tree (3+ levels) | Domain is complex enough for its own shard |
| Many children (5+ features) | Consider splitting into multiple shards |
| Dense CX file (5+ cross-cuts) | High coupling — keep together in one shard, or isolate carefully |
| Rich Role Matrix (3+ roles with access) | Shard needs multi-role IA spec coverage |
| Hub-and-spoke shared domains | Shared domains often become `00-*` cross-cutting shards |
| Leaf features marked `[EXHAUSTED]` | Most confident for shard scoping — behavior is fully defined |

## Standard Boundary Heuristics

- Features that share the same data models belong together
- Features that can be developed/deployed independently are candidates for separation
- Features that share the same access control model may belong together
- Cross-cutting concerns (auth, API conventions, error handling) become `00-*` shards

## Shard Load Thresholds (Pre-check from Ideation)

| Ideation Sub-Areas | Pre-Check Action |
|---|---|
| ≤6 | ✅ No concern — proceed |
| 7–9 | ⚠️ **Pre-flag for split review** — note in the shard skeleton |
| ≥10 | 🚩 **Proactive split proposal** — present to user NOW before calibration gate |

## Sub-feature Count Thresholds (Calibration Gate)

Count sub-features using the **bullet/named-item rule**: count every bullet or named item under `## Features`, excluding group headers that introduce a group but are not themselves a concrete capability. Sub-bullets count independently. Test: "Would a product manager list this as a separate line item in a release note?"

| Sub-feature Count | Action |
|-------------------|--------|
| **≤6** | ✅ OK — proceed |
| **7–9** | ⚠️ Flag for user review — present sub-feature list and ask: "Keep as-is, or split?" |
| **≥10** | 🛑 **Hard stop** — present mandatory split proposal. No shard may exit with ≥10 sub-features. |

## Shard Document Type Classification

| Classification | Expected BE Specs |
|---------------|-------------------|
| **Feature domain** | 1 |
| **Multi-domain** | N (split along sub-feature boundaries) |
| **Cross-cutting** | 1 (`00-*`) |
| **Structural reference** | 0 |

Annotation format for shard skeletons:
```markdown
> **Document Type** (preliminary): Feature domain | Multi-domain | Cross-cutting | Structural reference
```

## Split Proposal Format

When a shard exceeds the ≥10 threshold:

```
Shard [NN] — [domain name] has [N] sub-features (threshold: ≥10 → mandatory split)

Current sub-features:
  1. [sub-feature]
  2. [sub-feature]
  ...

Proposed split:
  [NN]a — [new domain name] → file: docs/plans/ia/[NN]a-[domain].md
    Sub-features: 1, 3, 5
  [NN]b — [new domain name] → file: docs/plans/ia/[NN]b-[domain].md
    Sub-features: 2, 4, 6

Split rationale: [why these groups are independent]
```

**After any split**: Update `docs/plans/ia/decomposition-plan.md` with the revised table and re-run the Must Have coverage gate.
