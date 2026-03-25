---
description: Context-aware cross-reference remediation after a parent shard is split into sub-shards — updates all downstream Depends on, Consumed by, and dependency table references
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [] # callable from any stage after a split
  successors: [] # returns to caller
  skills: [resolve-ambiguity, technical-writer, spec-writing]
  calls-bootstrap: false
---

// turbo-all

# Remediate Shard Split

Update all downstream cross-references after a parent shard is split into sub-shards. This is **not** a simple find-and-replace — the same parent shard maps to different sub-shards depending on what the downstream file actually depends on.

**Usage**: Called automatically as a mandatory post-split gate from `/decompose-architecture-validate` or `/write-architecture-spec-design`, or invoked standalone:

```
/remediate-shard-split
```

**When to use**: After any shard split operation creates sub-shards (e.g., `00` → `00a, 00b, 00c, 00d`).

**When NOT to use**: For non-split changes to shard content, use `/propagate-decision` instead.

---

## 1. Build sub-shard mapping table

### 1a. Identify the split

If invoked by a parent workflow, the parent shard number and sub-shard list are already known. If invoked standalone:

1. Scan `docs/plans/ia/` for parent stubs containing `SPLIT →` markers
2. For each split parent, list its sub-shards by reading files matching the `[NN][a-z]-*.md` pattern
3. Present findings to user and ask which split to remediate (if multiple)

### 1b. Build the mapping table

Read `.agent/skills/prd-templates/references/shard-split-remediation.md` → **Sub-Shard Mapping Table Format**.

For each sub-shard file, extract:
- Sub-shard identifier (e.g., `00a`)
- Domain name (from the shard header, e.g., "Consumer Identity")
- Key feature keywords (from `## Features` section — used for context matching)

Build the mapping table:

```
Parent shard: 00 (Infrastructure)

Sub-shard mapping:
  00a — Consumer Identity     → keywords: auth, identity, login, registration, session, token
  00b — AI Gateway            → keywords: AI, gateway, LLM, model, inference, prompt
  00c — File Storage          → keywords: file, storage, upload, media, blob, asset
  00d — Taxonomy              → keywords: taxonomy, category, classification, tag, hierarchy
```

Present to user for confirmation. **Wait for approval before proceeding.**

---

## 2. Scan for stale parent references

Read `.agent/skills/prd-templates/references/shard-split-remediation.md` → **Cross-Reference Scan Patterns**.

Grep `docs/plans/` recursively for all references to the parent shard number. The scan must cover:

| Reference Pattern | Example |
|------------------|---------|
| `Depends on:` lines | `Depends on: 00 (Infrastructure)` |
| `Consumed by:` lines | `Consumed by: 00 (Infrastructure)` |
| Dependency table rows | `\| 00 \| Infrastructure \| ... \|` |
| Upstream/downstream markers | `| Upstream | 00 — Infrastructure |` |
| Parenthetical inline refs | `(see shard 00)` |
| Cross-shard links | `[00-infrastructure.md]` |

**Scope**: All directories under `docs/plans/` — `ia/`, `be/`, `fe/`, and any per-surface BE/FE directories (e.g., `shared/be/`, `web/fe/`, `desktop/be/`).

**Exclusion**: Skip the parent stub file itself (it's already marked SPLIT).

Record each hit with: file path, line number, full line content, and the parenthetical context clue.

---

## 3. Context-aware classification

For each stale reference found:

1. **Extract the context clue** — the parenthetical description or surrounding text that reveals what the downstream shard actually depends on (e.g., "auth", "file storage", "AI gateway")
2. **Match against the sub-shard mapping table** — find the sub-shard whose keywords best match the context clue
3. **Classify the match**:
   - **Clear match**: Context clue maps unambiguously to one sub-shard → auto-propose the fix
   - **Ambiguous match**: Context clue could map to multiple sub-shards → flag for user resolution
   - **No match**: Context clue doesn't match any sub-shard keywords → flag for user resolution
   - **Multiple dependencies**: Downstream shard may depend on more than one sub-shard → propose expanding the reference to list all relevant sub-shards

---

## 4. Present proposed changes

Read `.agent/skills/prd-templates/references/shard-split-remediation.md` → **Remediation Display Format**.

Present each proposed change one at a time:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reference N of X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document: [path]
Line:     [line number]
Current:  [current text with stale reference]
Context:  [extracted context clue]
Maps to:  [proposed sub-shard] — [confidence: clear/ambiguous]
Fix to:   [proposed replacement text]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Y] Apply fix and move to next
[n] Skip this item
[e] Edit — provide custom replacement
[skip] Skip entire document
[stop-and-save] Save progress and stop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

For **ambiguous matches**, present the candidate sub-shards and ask the user to choose:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reference N of X — AMBIGUOUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document: [path]
Line:     [line number]
Current:  [current text with stale reference]
Context:  [extracted context clue]
Candidates:
  [1] 00a — Consumer Identity (keyword match: "auth")
  [2] 00b — AI Gateway (keyword match: "gateway")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Which sub-shard? [1/2/skip/stop-and-save]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 5. Apply fixes

After user confirmation: apply each fix to the target file immediately. After applying a fix:
- If the file has a `## Changelog` section → append a row
- If no `## Changelog` → add one from the template in `.agent/skills/prd-templates/references/be-spec-template.md`

---

## 6. Verification grep (BLOCKING GATE)

After all fixes are applied, run a verification grep for the parent shard number across the entire `docs/plans/` tree.

**Pass condition**: Zero stale references remain (excluding the parent stub itself).

If stale references are found:
1. Present the remaining references
2. Return to Step 4 for the remaining items
3. Do NOT exit the workflow until zero stale references remain

---

## 7. Write remediation record

Read `.agent/skills/technical-writer/SKILL.md` for writing standards.

Write `docs/audits/shard-split-remediation-[parent]-[date].md` recording:
- Parent shard identifier and name
- Sub-shard mapping table used
- Total references scanned
- References updated (with before/after for each)
- References skipped (with reason)
- Ambiguous references resolved
- Verification result (pass/fail)
- Timestamp

---

## 8. Report and return

Present completion summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Shard Split Remediation Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Parent:   [NN] — [domain name]
Sub-shards: [NNa], [NNb], [NNc], [NNd]
Updated:  X references across Y documents
Skipped:  X references
Stale:    0 remaining ✅
Record:   docs/audits/shard-split-remediation-[parent]-[date].md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Return control to the calling workflow.
