# Slice Completion Gates

Checklists that must pass before a slice can be marked complete. Every unchecked item is a hard stop.

## UI Completeness Check (FE slices only)

- [ ] Every acceptance criterion mentioning "user sees", "user can", "displays", or "shows" has a rendered implementation — not just a passing test
- [ ] Every new route in this slice is wired into the app's navigation (not just exported as a component)
- [ ] Loading, error, and empty states are rendered in the UI — not just covered by tests
- [ ] The feature is reachable from the app's entry point via normal user navigation

Non-FE slices skip this block.

## Spec Traceability Gate (all slices)

- [ ] Re-read the BE spec section(s) for every endpoint in this slice — every response field, error code, and validation rule has a corresponding test tagged with the spec reference
- [ ] Re-read the IA shard's `## Edge Cases` section for this slice's domain — every edge case relevant to this slice has a `// IA-EDGE:` tagged test
- [ ] No `// DECISION:` annotations exist for behaviors that are actually specified in the BE spec or IA shard (i.e., no spec-defined behavior was treated as an undocumented implementation decision)
- [ ] The {{CONTRACT_LIBRARY}} contract written in Step 2 matches the delivered implementation field-for-field — no fields added, removed, or renamed during implementation without a corresponding contract update

## Resource Cleanup Gate (all slices)

- [ ] Every database client or connection created in this slice has a corresponding cleanup call (`disconnect`, `close`, `end`, `dispose`) in a `finally` block or lifecycle hook
- [ ] Every event listener or subscription registered in UI components has a corresponding cleanup in the component's unmount/destroy lifecycle
- [ ] Every `setInterval` or `setTimeout` with a stored reference has a corresponding `clearInterval`/`clearTimeout` on cleanup
- [ ] No file handles or streams are opened without corresponding `close`/`destroy` calls
- [ ] If using connection pools — pool size is configured (not left at framework default) and documented via code comment: `// POOL: max=N, reason=...`

> ❌ STOP — Do not call `notify_user` if any of the above are unchecked. Fix the gap and re-run the Test Cmd from the surface stack map.
