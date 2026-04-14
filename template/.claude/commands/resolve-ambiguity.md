Run resolve-ambiguity workflow.

Use skill: `resolve-ambiguity`.
Reference: `.claude/skills/resolve-ambiguity/SKILL.md`.

If arguments are provided, apply them as workflow context: $ARGUMENTS

If this workflow updates any spec file under `.memory/wiki/specs/`, it must call `memory_compile` before reporting completion so the graph reflects the resolved spec truth. If no spec files changed, skip the compile.
