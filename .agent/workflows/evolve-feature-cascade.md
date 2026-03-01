---
description: Cascade new content through downstream layers, assess implementation impact, run consistency check, and write evolution record
parent: evolve-feature
shard: cascade
standalone: true
position: 2
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [evolve-feature-classify]
  successors: []
  skills: [resolve-ambiguity, technical-writer]
  calls-bootstrap: false
---

# Evolve Feature — Cascade

Cascade the new content from the entry point through all downstream layers with existing content, assess implementation impact, run a consistency check, and write the evolution record.

> **Prerequisite**: The entry point document must already contain the new content (written by `/evolve-feature-classify` Step 4). The cascade scope must be determined (Step 5 output).

---

## 1. Cascade through each downstream layer

For each downstream layer with existing content (in order: architecture → IA → BE → FE → phase plan):

1. **Read existing documents** in the layer
2. **Determine what the new feature means for this layer** — what sections need additions, what contracts change, what new components are needed
3. **Write the additions** — new sections, new entries in existing tables, new acceptance criteria, new contracts. Write at the same depth and quality as the existing content in the layer.
4. **Present additions to user** — show exactly what was added and where

**STOP at each layer** — do not cascade to the next layer until the user approves the current layer's additions.

Layer-specific guidance:

- **Architecture layer**: Add new components, update system diagrams references, add NFRs, update integration points
- **IA layer**: Add new domain interactions, update contracts, add data model changes, update access control
- **BE layer**: Add new API endpoints, update schemas, add middleware requirements, update validation rules
- **FE layer**: Add new components, update state management, add new routes, update accessibility requirements
- **Phase plan**: Add new slices or update existing slice acceptance criteria (see Step 2)

---

## 2. Assess implementation impact

If `docs/plans/phases/` exists and contains phase plans:

1. **Check in-progress slices** — do any currently in-progress slices need their acceptance criteria updated? List the affected criteria.
2. **Check completed slices** — do any completed slices that may need revisiting? (This is a red flag — document it clearly with regression risk assessment)
3. **Determine if new slices are needed** — does the new feature require new implementation slices in the current phase? If yes, draft the slice names and acceptance criteria.
4. **Determine if phase plan update is required** — does the scope require changes to the phase plan structure?

Present the impact assessment:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implementation Impact
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
In-progress slices affected:              [list or "none"]
Completed slices that may need revisiting: [list or "none"]
New slices needed:                        [list or "none"]
Phase plan update required:               [yes/no]

Recommended action: [specific next step]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If no phase plans exist, skip this step and note: "No phase plans exist yet — implementation impact will be assessed during `/plan-phase`."

---

## 3. Run consistency check

For every document that received additions in Step 1:

1. **Re-read the full document** — verify the additions integrate correctly with existing content
2. **Check for internal contradictions** — do the additions conflict with anything else in the same document?
3. **Check cross-references between changed documents** — if multiple documents were updated, verify they are consistent with each other
4. **Check against locked decisions** — do the additions contradict any locked architectural decisions?

Report any issues found. **Do not auto-fix** — present them to the user for review.

---

## 4. Write evolution record

Write `docs/audits/evolve-feature-[name]-[date].md` recording:

- **Feature name** — short identifier for the evolution
- **Change type** — classification from Step 2 of `/evolve-feature-classify`
- **Entry point** — which document received the initial content
- **New content written** — summary of what was added at the entry point
- **Layers updated** — list of downstream layers that received additions
- **Per-layer additions** — what was added at each layer (summary, not full content)
- **Implementation impact** — assessment from Step 2 (if applicable)
- **Consistency check results** — pass/fail with details
- **Timestamp** of the evolution run

---

## 5. Propose next steps

Display the completion summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature Evolution Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Entry point:       [document]
Layers updated:    [list]
New content:       [summary]
Implementation:    [impact summary]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recommended next steps:
1. Run `/audit-ambiguity [lowest updated layer]` to verify the new content meets the quality bar
2. If phase plan updated: Run `/implement-slice [new slice]`
3. Run `/remediate-pipeline` if multiple layers were updated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
