# Shard Split Remediation Reference

Templates, formats, and scan patterns for `/remediate-shard-split` workflow.

## Sub-Shard Mapping Table Format

```markdown
| Parent | Sub-Shard | Domain Name | Keywords |
|--------|-----------|-------------|----------|
| 00 | 00a | Consumer Identity | auth, identity, login, registration, session, token, OAuth, password |
| 00 | 00b | AI Gateway | AI, gateway, LLM, model, inference, prompt, embedding, agent |
| 00 | 00c | File Storage | file, storage, upload, media, blob, asset, image, document |
| 00 | 00d | Taxonomy | taxonomy, category, classification, tag, hierarchy, label |
```

### Keyword Extraction Rules

1. Read each sub-shard's `## Features` section
2. Extract nouns and domain terms from each feature bullet
3. Include the sub-shard's domain name words as keywords
4. Include obvious synonyms (e.g., "auth" → also "authentication", "login", "session")
5. Aim for 5–10 keywords per sub-shard — enough for matching, not so many they overlap

## Cross-Reference Scan Patterns

Grep the entire `docs/plans/` tree for the parent shard number using these patterns. The `NN` below represents the parent number (e.g., `00`, `01`, `02`).

### Primary Patterns (always scan)

| Pattern | Matches |
|---------|---------|
| `Depends on:.*NN` | Depends-on header lines |
| `Consumed by:.*NN` | Consumed-by header lines |
| `\| *NN *\|` | Dependency table cells containing the shard number |
| `NN — ` or `NN —` | Shard references with em-dash (e.g., "00 — Infrastructure") |
| `NN - ` or `NN -` | Shard references with hyphen |
| `(NN` followed by space or `)` | Parenthetical shard references |
| `shard NN` (case-insensitive) | Inline text references |
| `NN-[a-z]*.md` parent filename refs | Links to the parent file (e.g., `00-infrastructure.md`) |

### Scope

| Directory | Required |
|-----------|----------|
| `docs/plans/ia/` | Always |
| `docs/plans/be/` | If exists |
| `docs/plans/fe/` | If exists |
| `docs/plans/web/be/` | If exists |
| `docs/plans/web/fe/` | If exists |
| `docs/plans/desktop/be/` | If exists |
| `docs/plans/desktop/fe/` | If exists |
| `docs/plans/mobile/be/` | If exists |
| `docs/plans/mobile/fe/` | If exists |

### Exclusions

- The parent stub file itself (already marked SPLIT)
- `docs/audits/` (audit records, not active specs)
- `docs/plans/ideation/` (upstream of decomposition — doesn't use shard numbers)

## Context Matching Heuristics

When a stale reference includes a parenthetical description, match it against sub-shard keywords:

### Matching Algorithm

1. **Exact keyword match**: If the parenthetical contains a word that appears in exactly one sub-shard's keyword list → **clear match**
2. **Strongest keyword match**: If the parenthetical contains words that appear in multiple sub-shards' keyword lists, pick the sub-shard with the most keyword hits → **clear match** if gap ≥ 2 hits, **ambiguous** otherwise
3. **Contextual read**: If keyword matching is inconclusive, read the surrounding 5 lines in the downstream file for additional context clues (e.g., what feature is being described in that section)
4. **No match**: If the parenthetical is generic (e.g., just "Infrastructure" with no specifics) → **flag for user resolution**

### Multiple Dependency Detection

A downstream shard may legitimately depend on more than one sub-shard. Detect this when:

- The `Depends on:` section lists the parent *and* the downstream shard's features span multiple sub-shard domains
- The downstream shard's data model references entities owned by different sub-shards

In this case, propose expanding the single reference into multiple references:
```
Before: Depends on: 00 (Infrastructure)
After:  Depends on: 00a (Consumer Identity), 00c (File Storage)
```

## Remediation Display Format

### Clear Match

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reference N of X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document: [path]
Line:     [line number]
Current:  [current text with stale reference]
Context:  [extracted context clue]
Maps to:  [proposed sub-shard] — [confidence: clear]
Fix to:   [proposed replacement text]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Y] Apply fix and move to next
[n] Skip this item
[e] Edit — provide custom replacement
[skip] Skip entire document
[stop-and-save] Save progress and stop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Ambiguous Match

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reference N of X — AMBIGUOUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document: [path]
Line:     [line number]
Current:  [current text with stale reference]
Context:  [extracted context clue]
Candidates:
  [1] [sub-shard] — [domain] (keyword match: "[matched words]")
  [2] [sub-shard] — [domain] (keyword match: "[matched words]")
  [M] Multiple — expand to: [sub-shard1], [sub-shard2]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Which sub-shard? [1/2/M/skip/stop-and-save]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Remediation Record Template

```markdown
# Shard Split Remediation — [Parent NN] → [Sub-shards]

**Date**: [YYYY-MM-DD]
**Parent shard**: [NN] — [domain name]
**Sub-shards**: [list with domain names]

## Mapping Table Used

[copy of the confirmed mapping table]

## Changes Applied

| # | Document | Line | Before | After | Confidence |
|---|----------|------|--------|-------|------------|
| 1 | [path] | [N] | [old text] | [new text] | clear/user-resolved |

## Skipped References

| # | Document | Line | Text | Reason |
|---|----------|------|------|--------|
| 1 | [path] | [N] | [text] | [reason] |

## Verification

- **Final grep result**: 0 stale references remaining ✅
- **Documents scanned**: [N]
- **Documents modified**: [N]
```
