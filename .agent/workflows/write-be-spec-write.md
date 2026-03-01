---
description: Write BE spec, update indexes, run ambiguity gate, and check for new dependencies for the write-be-spec workflow
parent: write-be-spec
shard: write
standalone: true
position: 2
pipeline:
  position: 5a.2
  stage: specification
  predecessors: [write-be-spec-classify]
  successors: [plan-phase]
  skills: [technical-writer, testing-strategist, prd-templates]
  calls-bootstrap: true
---

// turbo-all

# Write BE Spec — Write & Validate

Write the BE spec(s) to `docs/plans/be/`, update indexes, run quality checks, and present for review.

**Prerequisite**: Read the spec file at `docs/plans/be/[NN-feature-name].md`. The `## Classification` section and Referenced Material Inventory should be present from the classify shard. If the file does not exist or lacks a `## Classification` section, run `/write-be-spec-classify` first.

---

## 7. Write the spec to `docs/plans/be/[NN-feature-name].md`

**Naming convention**: Use the same number prefix as the IA shard that sources it, followed by a kebab-case feature name. For multi-domain splits from the same shard, append a letter suffix (e.g., `09a-chat-api.md`, `09b-agent-flow-api.md`). For cross-cutting specs, use the `00-` prefix (e.g., `00-api-conventions.md`).

Read `.agent/skills/prd-templates/references/be-spec-template.md` for the document structure and quality gates checklist. Follow the conventions template from `be/index.md`.

## 8. Update the BE index

Add or update the spec entry in `docs/plans/be/index.md`. For multi-domain splits, add one row per BE spec with the shared IA source.

If a shard was classified as **structural reference** with 0 BE specs, add a row with `—` status and a note explaining why (e.g., "Structural reference — no API surface").

## 9. Update spec pipeline

Read `.agent/skills/session-continuity/protocols/08-spec-pipeline-update.md` and follow the **Spec Pipeline Update Protocol** to mark this shard's BE column as complete in `.agent/progress/spec-pipeline.md`.

## 10. Cross-reference check

Verify:
- [ ] New spec links back to its IA source shard
- [ ] Related BE specs are cross-referenced (especially for multi-domain splits from the same shard)
- [ ] Cross-shard referenced material is cited with file + section + line numbers
- [ ] IA source shard links forward to the new BE spec

## 11. Ambiguity gate

Read `.agent/skills/session-continuity/protocols/ambiguity-gates.md` and run:

- **Micro**: Walk each endpoint, request/response field, error code, schema constraint, and middleware rule. Would an implementer need to guess? Fix it now.
- **Macro**: Would the FE spec writer need to guess anything from this BE spec? Fix it now.
- **Two-implementer test**: Would two developers reading only this spec make the same decision? If not — fix it now.
- **Devil's advocate pass**: "What would a junior developer get wrong?" Fix any revealed gaps.

## 12. Full ambiguity audit (mandatory when last BE spec)

1. Read `docs/plans/be/index.md`
2. Check if all BE specs show ✅

**More specs remain**: Proceed to the next spec.

**This is the last BE spec**: Run `/audit-ambiguity be` now. **Hard gate**: Do NOT propose `/write-fe-spec` until `/audit-ambiguity be` scores 0%.

## 13. Check for new dependencies

If this BE spec introduces a technology not already in the project's tech stack:
1. Identify the stack category (e.g., QUEUE, CACHE, SEARCH, STORAGE)
2. Read `.agent/workflows/bootstrap-agents.md` and fire bootstrap with `PIPELINE_STAGE=write-be-spec` + the key-value pair
3. Confirm matching skill installed

## 14. Request review and propose next steps

Use `notify_user` presenting:
1. **Spec created** (link)
2. **Cross-reference verification**
3. **Ambiguity Gate confirmation**
4. **Pipeline State** — read `.agent/progress/spec-pipeline.md` and propose next step
