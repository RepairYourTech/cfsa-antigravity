# Decision Propagation Reference

Templates, formats, and scan procedures for `/propagate-decision` workflows.

## Decision Type Sources

| Decision Type | Source Document | Downstream Scope |
|--------------|-----------------|-------------------|
| **structure** | `.agent/instructions/structure.md` | All IA shards, BE specs, FE specs |
| **tech-stack** | `.agent/instructions/tech-stack.md` + architecture doc | All IA shards, BE specs, FE specs |
| **auth-model** | Architecture doc (auth/security section) | All BE specs with middleware, all FE specs with auth flows |
| **data-placement** | `docs/plans/data-placement-strategy.md` | All IA shards with data models, all BE specs with storage |
| **patterns** | `.agent/instructions/patterns.md` | All IA shards, BE specs with implementation patterns, FE specs with component patterns |
| **error-architecture** | Architecture doc `## Error Architecture` (5 sub-sections) | All BE specs, all FE specs |

## Selection Menu Format

```
Decision propagation pre-scan:

[1] structure — structure.md — inconsistencies detected in X documents
[2] tech-stack — tech-stack.md — inconsistencies detected in X documents
[3] auth-model — architecture doc — inconsistencies detected in X documents
[4] data-placement — data-placement-strategy.md — inconsistencies detected in X documents
[5] patterns — patterns.md — inconsistencies detected in X documents
[6] error-architecture — architecture doc ## Error Architecture — inconsistencies detected in X documents

[A] All with inconsistencies
[Q] Quit — no propagation needed
```

## Error-Architecture Scan Procedure

**Source extraction:**
- Locate `docs/plans/*-architecture-design.md` using glob
- Read `## Error Architecture` and extract locked decisions from: `### Global Error Envelope`, `### Error Propagation Chain`, `### Unhandled Exception Strategy`, `### Client Fallback Contract`, `### Error Boundary Strategy`

**BE spec conformance** (scan `docs/plans/be/`):
- Check error envelope by locked name and canonical field names
- Check propagation chain rules
- Classify: explicit contradiction / implicit assumption / consistent

**FE spec conformance** (scan `docs/plans/fe/`):
- Check client fallback contract for surface type
- Check error boundary placement
- Same classification

## Contradiction Display Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Contradiction N of X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document: [path]
Section:  [section name]
Current:  [current text]
Locked:   [locked value]
Fix to:   [proposed fix]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Y] Apply fix and move to next
[n] Skip this item
[skip] Skip entire document
[stop-and-save] Save progress and stop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Assumption Display Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assumption N of X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document: [path]
Section:  [section name]
Current:  [current text]
Issue:    [ambiguity description]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Y] Flag for /resolve-ambiguity
[n] Ignore
[skip] Skip entire document
[stop-and-save] Save progress and stop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Impact Report Format

### Explicit Contradictions

| Document | Line | Current Text | Locked Value | Decision Type |
|----------|------|--------------|--------------|---------------|
| [path] | [N] | [text] | [value] | [type] |

### Implicit Assumptions

| Document | Line | Current Text | Concern | Decision Type |
|----------|------|--------------|---------|---------------|
| [path] | [N] | [text] | [concern] | [type] |

### Summary

- **Explicit contradictions**: X items across Y documents
- **Implicit assumptions**: X items across Y documents
- **Consistent references**: X items (no action needed)

## Completion Summary Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Propagation Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fixed:   X contradictions across Y documents
Flagged: X implicit assumptions for /resolve-ambiguity
Skipped: X items
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recommended next steps:
1. Run `/resolve-ambiguity` to address the X flagged assumptions
   (see docs/audits/propagation-ambiguity-[date].md)
2. Run `/remediate-pipeline` to audit all layers with the corrected specs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
