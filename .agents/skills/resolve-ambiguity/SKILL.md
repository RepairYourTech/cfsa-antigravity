---
description: Targeted ambiguity resolution for any pipeline document or layer
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [] # callable from any stage
  successors: [] # returns to caller
  skills: [resolve-ambiguity]
  calls-bootstrap: false
---

# Resolve Ambiguity

Targeted ambiguity resolution for any pipeline document or layer. Uses the `resolve-ambiguity` skill to classify gaps and systematically resolve them.

## Invocation patterns

| Invocation | Behavior |
|---|---|
| `/resolve-ambiguity` | Interactive — asks which document or layer to resolve |
| `/resolve-ambiguity ideation` | Targets `ideation-index.md` + `ideation-cx.md` + all fractal tree files |
| `/resolve-ambiguity architecture` | Targets the architecture design documents |
| `/resolve-ambiguity @path/to/spec.md` | Targets a specific file |

---

## 1. Determine target

If no argument was provided, ask the user which document or layer to resolve. Accept a layer name (`vision`, `architecture`, `ia`, `be`, `fe`) or a direct `@file` path.

For layer names, resolve to the canonical document(s):
- `ideation` → `.memory/wiki/specs/ideation/ideation-index.md` + `ideation-cx.md` + all `*-index.md`, `*-cx.md`, and feature `.md` files recursively under `domains/` (and `surfaces/` for multi-product projects)
- `architecture` → `.memory/wiki/specs/YYYY-MM-DD-architecture-design.md` + `.memory/wiki/specs/ENGINEERING-STANDARDS.md` + `.memory/wiki/specs/data-placement-strategy.md`
- `ia` → all files in `.memory/wiki/specs/ia/` (excluding `index.md`)
- `be` → all files in `.memory/wiki/specs/be/` (excluding `index.md`)
- `fe` → all files in `.memory/wiki/specs/fe/` (excluding `index.md`)

## 2. Load skill

Read `.agents/skills/resolve-ambiguity/SKILL.md`. The skill contains the full methodology — this workflow orchestrates it.

## 3. Load source document(s)

Read the target document(s) in full based on the layer or file path determined in Step 1.

## 4. Classify and resolve

Apply the two-path classification model from the resolve-ambiguity skill:

For each gap or ambiguity found, follow the skill's two-path classification:

- **Technical/Factual gaps** → tiered lookup (Tiers 1–5): project docs, architecture files, upstream specs, official documentation, web search
- **Intent/Choice gaps** → user clarification: present smart options ordered by recommendation, wait for user decision

Resolve judgment calls first — they may change what mechanical fixes are needed.

Present findings organized by type: judgment calls first, mechanical fixes second.

## 5. Apply fixes

Update the relevant spec documents with resolved content. Record each resolution so future readers don't hit the same ambiguity (per the skill's "Record" step).

> **Resolution log**: After applying each fix, append a `## Resolution Log` entry to the target document:
>
> ```markdown
> ## Resolution Log
> | Date | Gap | Resolution | Source |
> |------|-----|------------|--------|
> | [date] | [gap description] | [what was changed] | [source that resolved it — project doc / user decision / upstream spec] |
> ```
>
> If a `## Resolution Log` section already exists, append a new row to the table. This makes `/resolve-ambiguity` leave an audit trail so future readers know what was changed and why.

> In addition to the Resolution Log, append a row to each modified spec's `## Changelog` table recording: today's date, `'Ambiguity resolution: [brief description]'`, `/resolve-ambiguity`, and the sections updated. If the spec does not yet have a `## Changelog` section, add one before appending.

## 5.5. Refresh graph if spec files changed

If Step 5 modified any spec document under `.memory/wiki/specs/`:
1. Call `memory_compile` to rebuild derived memory artifacts from current spec truth.
2. Confirm the compile succeeded and reported graph outputs.
3. Do not proceed to Step 6 until the compile succeeds.

If no spec files were changed, skip this step.

## 6. Propose next step

Use `notify_user` to summarize what was resolved, including graph refresh confirmation when Step 5.5 ran.

### Proposed next step

Ambiguity resolution complete. Next: Re-run `/audit-ambiguity [layer]` as a fresh invocation to verify the fixes. The session that fixed gaps cannot be the session that passes them.
