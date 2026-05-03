# Setup Skills

This directory contains Codex setup/bootstrap skills for the CFSA pipeline.

## Files

- `setup-cfsa.md` — Orchestrates full bootstrap flow
- `setup-fill-placeholders.md` — Fills placeholders and stack map values
- `setup-provision-skills.md` — Provisions skills from skill library via resolver
- `setup-verify.md` — Verifies installation and readiness

## Extension Pattern

When adding a setup skill:
1. Use `setup-<name>.md`
2. Add frontmatter: `name`, `description`, `parameters`
3. Define deterministic step order and completion checklist
4. Link from `setup-cfsa.md` orchestration and this README

## Conventions

- Keep setup skills idempotent
- Do not overwrite existing user values without confirmation
- Use `.codex/instructions/tech-stack.md` as the source of truth
