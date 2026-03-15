---
description: Write FE spec, update indexes, run ambiguity gate, and check for new dependencies for the write-fe-spec workflow
parent: write-fe-spec
shard: write
standalone: true
position: 2
pipeline:
  position: 5b.2
  stage: specification
  predecessors: [write-fe-spec-classify]
  successors: [plan-phase]
  skills: [prd-templates, session-continuity, spec-writing, technical-writer, testing-strategist, verification-before-completion]
  calls-bootstrap: true
---

// turbo-all

# Write FE Spec — Write & Validate

Write the FE spec to `docs/plans/fe/`, update indexes, run quality checks, and present for review.

**Prerequisite**: Read the spec file at `docs/plans/fe/[NN-feature-name].md`. The `## Classification` section, Referenced Material Inventory, and Design Requirements should be present from the classify shard. If the file lacks a `## Classification` section, run `/write-fe-spec-classify` first.

---

## 6. Write the spec to `docs/plans/fe/[NN-feature-name].md`

Read .agent/skills/technical-writer/SKILL.md and follow its methodology.
Read .agent/skills/spec-writing/SKILL.md and follow its completeness testing and cross-reference checking methodology.
Read .agent/skills/{{ACCESSIBILITY_SKILL}}/SKILL.md and follow its methodology.
Read .agent/skills/testing-strategist/SKILL.md and follow its methodology.

**Naming convention**: Numbered prefix matching feature position + kebab-case name (e.g., `01-auth-ui.md`). Cross-cutting: `00-` prefix.

Read `.agent/skills/prd-templates/references/fe-spec-template.md` for the document structure and quality gates checklist. Follow the conventions from `fe/index.md`.

## 7. Update the FE index

Change the spec's status from 🔲 to ✅ in `docs/plans/fe/index.md`.

## 8. Update spec pipeline

Read `.agent/skills/session-continuity/protocols/08-spec-pipeline-update.md` and follow the **Spec Pipeline Update Protocol** (skip for cross-cutting specs).

## 9. Cross-reference check

Verify:
- [ ] New spec links back to its BE source spec(s) (if applicable)
- [ ] New spec links back to its IA source shard (if applicable)
- [ ] Related FE specs are cross-referenced
- [ ] Cross-shard referenced material is cited with file + section + line numbers

## 10. Ambiguity gate

Read `.agent/skills/session-continuity/protocols/ambiguity-gates.md` and run:

- **Micro**: Walk each component, prop, interaction, state transition, responsive breakpoint, and a11y rule. Would an implementer need to guess? Fix it now.
- **Macro**: Would an implementer running `/implement-slice` need to guess anything from this spec? Fix it now.
- **Two-implementer test**: Would two developers reading only this spec make the same decision? If not — fix it now.
- **Devil's advocate pass**: "What would a junior developer get wrong?" Fix any revealed gaps.

## 11. Full ambiguity audit (mandatory when last FE spec)

1. Read `docs/plans/fe/index.md`
2. Check if all FE specs show ✅

**More specs remain**: Proceed to the next spec.

**This is the last FE spec**: Run `/audit-ambiguity fe` now. **Hard gate**: Do NOT propose `/plan-phase` until `/audit-ambiguity fe` scores 0%.

## 12. Check for new dependencies

If this FE spec introduces a new technology:
1. Identify the stack category (e.g., CHARTS, ANIMATION)
2. Read `.agent/workflows/bootstrap-agents.md` and fire bootstrap with `PIPELINE_STAGE=write-fe-spec` + the key-value pair
3. Confirm matching skill installed

## 13. Request review and propose next steps

Read .agent/skills/verification-before-completion/SKILL.md and follow its methodology.

Use `notify_user` presenting:
1. **Spec created** (link)
2. **Cross-reference verification**
3. **Ambiguity Gate confirmation**
4. **Pipeline State** — read `.agent/progress/spec-pipeline.md` and propose next step

## 14. Navigation Completeness Check

> Runs only when ALL FE shards for the current phase are complete (all ✅ in index).

1. Collect every route across all FE specs
2. Verify each is reachable from at least one navigation element
3. Verify navigation structure itself is specced
4. Flag orphan routes (specced but unreachable) — these block `/plan-phase`
