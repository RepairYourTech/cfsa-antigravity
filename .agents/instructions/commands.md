# Development Commands

<!-- 
  THIS FILE IS A TEMPLATE.
  The /bootstrap-agents workflow fills per-surface command sections below.
  For single-surface projects, one flat section is written.
  For multi-surface projects, one section per surface.
-->

<!-- Bootstrap writes command sections here. Each surface from the map gets its own section. -->
<!-- Single-surface projects get a flat layout (no surface header). -->

{{COMMAND_SECTIONS}}

## Validation (run after every code change)

The validation command runs all checks for the primary surface. For multi-surface projects, run each surface's validation command.

// turbo
```bash
{{VALIDATION_COMMAND}}
```

All checks must pass before marking any task complete.
