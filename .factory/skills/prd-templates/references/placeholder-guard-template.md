# Placeholder Guard — Hard Stop Template

Use this template in any workflow `## 0. Placeholder guard` step to emit a hard stop when required placeholders are unfilled.

## Hard Stop Message Format

Emit one block per unfilled placeholder:

> ❌ **Bootstrap incomplete — cannot proceed.**
>
> **Unfilled placeholder:** `{{PLACEHOLDER_NAME}}`
>
> **Recovery:** If `docs/plans/*-architecture-design.md` exists, read it and extract the confirmed [tech decision] value, then run `/bootstrap-agents` with `KEY=<confirmed-value>`. If no architecture design document exists, run `/create-prd-stack` first to confirm tech stack decisions.
>
> **Why this matters:** [specific step] cannot produce correct output without this skill — [concrete consequence of proceeding without it].

## Guard Procedure

1. For each placeholder listed in the workflow's `requires_placeholders` frontmatter, check whether the literal characters `{{` still appear in the value.
2. If **any** are unfilled, emit the hard stop message above (one block per unfilled placeholder) and **do not proceed** to the next step.
3. Only proceed when **all** required placeholders report no literal `{{` characters.
