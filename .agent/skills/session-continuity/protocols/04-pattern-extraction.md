# Protocol 4: Pattern Extraction

> Part of [Session Continuity](../SKILL.md) — read the index for overview, directory structure, and integration points.

**Invoked by**: End of any workflow (replaces `self-improving-agent` step)

**Purpose**: Extract reusable patterns from what just happened.

## Steps

1. **Reflect on the task**:
   - What happened? (summary)
   - What worked well? (repeat this)
   - What didn't work? (avoid this)
   - Was there a surprise or insight?

2. **Classify the pattern**:

   | Classification | Criteria | Action |
   |---------------|----------|--------|
   | Best practice | Worked well, likely reusable | Add to patterns.md |
   | Anti-pattern | Caused problems, should avoid | Add to patterns.md as "avoid" |
   | Context-specific | Only applies to this situation | Log in session but don't generalize |
   | Not significant | Routine, nothing new learned | Skip |

3. **Write to `memory/patterns.md`** (only for best-practice or anti-pattern):
   ```markdown
   ### PAT-007: Zod schema coercion for URL params (2026-02-15)
   - **Type**: best-practice
   - **Confidence**: 0.7 (applied 1 time)
   - **Context**: Astro API routes receive all params as strings
   - **Pattern**: Use `z.coerce.number()` instead of `z.number()` for URL params
   - **Source**: Phase 2, Slice 3 implementation
   ```

4. **Update confidence on existing patterns** if reapplied:
   - Increment `applied` count
   - Increase confidence: `new_confidence = min(0.95, old + 0.1)`

5. **Post-decision pushback** — for each decision made during this workflow
   (logged via Protocol 6 or made implicitly), challenge it with hindsight:

   - **Did it hold up?** — Did implementation confirm or undermine the reasoning?
   - **Surprises?** — Did anything unexpected happen because of this choice?
   - **Would you choose differently now?** — With what you learned during impl, same call?
   - **Scope creep?** — Did the decision force unplanned work or workarounds?

   If the answer to "would you choose differently" is **yes**, log it as a
   revision candidate in `memory/decisions.md` with the original decision ID:
   ```markdown
   ### DEC-004-REVIEW: Middleware decision revisited (2026-02-16)
   - **Original**: DEC-004 — middleware over per-route auth
   - **What changed**: Discovered 3 public routes need explicit exclusions, increasing complexity
   - **Verdict**: Still correct, but add route-level override capability
   - **Action**: Create follow-up slice for route exclusion config
   ```

   If no significant decisions were made during this workflow, skip this step.
