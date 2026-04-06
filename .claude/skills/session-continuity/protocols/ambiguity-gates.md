> **Framework context required**: This is a protocol excerpt. Before following these steps, read `.agent/skills/session-continuity/SKILL.md` for the complete framework — including the Adaptive Granularity Rule, Level Hierarchy Reference, Frozen Files concept, and Parallel Claim protocol. Protocol files are reference documents for specific steps, not standalone instructions.

# Ambiguity Gates (Micro + Macro)

> Part of [Session Continuity](../SKILL.md) — read the index for overview, directory structure, and integration points.

**Invoked by**: Every `write-*-spec` workflow, before "Request review"

**Purpose**: Ensure no guesses pass downstream. Two levels:

## Micro Ambiguity Check

Walk **each individual element** in the spec and ask:
> "Would an implementer need to guess about this?"

| Workflow | What to check |
|----------|---------------|
| `/write-architecture-spec` | Each feature, interaction, data model field, access rule, edge case |
| `/write-be-spec` | Each endpoint, request/response field, error code, schema constraint, middleware rule |
| `/write-fe-spec` | Each component, prop, interaction, state transition, responsive breakpoint, a11y rule |

For every element where the answer is "yes" → **fix it now**. Add the missing
detail, type, behavior, or constraint. Don't flag it — resolve it.

For every element where the answer is "no" — apply the **two-implementer test**: *"Would two different developers, reading only this spec with no other context, make the same implementation decision for this element?"* If the answer is "probably not" or "maybe not" — fix it now. The bar is not "text exists" — it is "unambiguous to any implementer reading cold."

## Macro Ambiguity Check

Step back and ask about the **entire spec**:
> "Does the next downstream phase have everything it needs?"

| Workflow | Downstream question |
|----------|---------------------|
| `/write-architecture-spec` | Would the BE spec writer need to guess anything from this IA shard? |
| `/write-be-spec` | Would the FE spec writer need to guess anything from this BE spec? |
| `/write-fe-spec` | Would an implementer running `/implement-slice` need to guess anything? |

If the answer is "yes" → **fix it now**. The spec is not complete until the
downstream phase can work from it without assumptions.

## Relationship to `/audit-ambiguity`

The ambiguity gates are **inline, lightweight, fix-it-now** checks. The
`/audit-ambiguity` workflow is a **standalone, scored, report-generating**
audit you run across multiple documents at once. They complement each other:

- Gates: prevent ambiguity from entering (at write time)
- Audit: detect ambiguity that slipped through (after the fact)
