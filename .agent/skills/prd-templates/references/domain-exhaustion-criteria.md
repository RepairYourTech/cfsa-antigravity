# Domain Exhaustion Criteria

Final validation gate before vision compilation. All criteria must pass.

| Check | Criteria | Action if Fail |
|-------|----------|----------------|
| All leaf nodes ≥ `[DEEP]` | Every feature file in the tree is `[DEEP]` or `[EXHAUSTED]` | Drill remaining feature files |
| Status propagation correct | Parent nodes reflect their children's status | Update parent indexes |
| All Must Have features ≥ Level 2 | Every Must Have has sub-features AND edge cases AND Role Lens | Deep Think + drill |
| Deep Think zero hypotheses | Final Deep Think pass across ALL leaf nodes yields no new hypotheses | Present any new hypotheses, drill if confirmed |
| All CX files clean | No Medium/Low confidence entries remain at any level — all are High or rejected | Run synthesis questions on pending pairs |
| Role Lens complete | Every feature file has a populated Role Lens table | Fill missing Role Lens entries |
| User confirmation | User explicitly confirms "nothing else" for each domain | Ask for each under-explored domain |

## Execution Procedure

1. Walk the fractal tree. For each leaf node below `[DEEP]`:
   - "Feature [X] in [domain] is still at [status]. Drill deeper or intentionally minimal?"
   - If "drill" → return to `/ideate-discover`
   - If "intentionally minimal" → note in feature file and proceed

2. Run **final Deep Think pass**: For each `[DEEP]` leaf node, apply the four Deep Think questions. Present any new hypotheses.
   - If confirmed → drill, update feature files
   - If zero hypotheses → mark `[EXHAUSTED]`, propagate status upward

3. Walk ALL CX files at every level. Resolve any Medium/Low confidence entries.

4. Verify all feature files have populated Role Lens tables.

5. Update `ideation-index.md` progress summary with final counts (total leaf nodes, exhausted count, CX entries confirmed).

## Proportionality Check

- **Rich inputs**: Total domain file content (all files combined) should be at least 30% of the original source document's line count. If short, identify what was lost.
- **All inputs**: Each domain with `[DEEP]` or `[EXHAUSTED]` status should have at least 3 sub-areas drilled with edge cases.

If proportionality fails, return to `/ideate-discover` for the under-explored areas.
