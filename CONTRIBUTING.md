# Contributing to CFSA Antigravity

Thanks for your interest in contributing! This guide covers the process from fork to merge.

## Getting Started

1. **Fork** the repo on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/cfsa-antigravity.git
   cd cfsa-antigravity
   ```
3. **Install** dev dependencies:
   ```bash
   npm install
   ```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feat/new-skill-name` — new skills or features
- `fix/workflow-step-correction` — bug fixes
- `docs/improve-readme` — documentation changes

### What You Can Contribute

| Area | Examples |
|------|----------|
| **Skills** | New skills in `.agent/skills/` or `.agent/skill-library/` |
| **Workflows** | Improvements to pipeline workflows in `.agent/workflows/` |
| **Rules** | Refinements to agent rules in `.agent/rules/` |
| **Documentation** | Better explanations, examples, typo fixes |
| **CLI** | Improvements to the `bin/cli.mjs` installer |
| **Bug Fixes** | Anything that's broken |

### What to Avoid

- Don't modify `.agent/instructions/` template files unless you understand the `{{PLACEHOLDER}}` system
- Don't add project-specific content — this is a generic kit
- Don't add dependencies to the npm package (the CLI is zero-dependency by design)

## Changesets (Required for PRs)

Every PR that changes user-facing behavior must include a changeset. This powers our automated changelog and versioning.

1. **After making your changes**, run:
   ```bash
   npx changeset
   ```
2. **Select the change type:**
   - `patch` — bug fixes, doc corrections, minor improvements
   - `minor` — new skills, new workflows, new CLI features
   - `major` — breaking changes (renamed files, changed workflow steps, removed features)
3. **Write a summary** — this becomes the CHANGELOG entry. Be concise but descriptive.
4. **Commit** the generated `.changeset/*.md` file with your PR.

### When a Changeset is NOT Needed

- Changes to dev-only files (CI config, test setup)
- Changes to `README.md` at repo root (GitHub landing page only)
- Changes to `.changeset/` config itself

## Pull Request Process

1. **Create your PR** against `main`
2. **Ensure** your changeset file is included
3. **Describe** what changed and why in the PR body
4. **Wait for review** — maintainers will review and may request changes

### PR Checklist

- [ ] Changes follow existing patterns and conventions
- [ ] New skills include a `SKILL.md` with proper frontmatter
- [ ] New workflows include a description in the YAML frontmatter
- [ ] Changeset file is included (if user-facing changes)
- [ ] No `{{PLACEHOLDER}}` values were hardcoded

## Release Process (Maintainers)

When changesets accumulate on `main`, the Changesets GitHub Action opens a "Version Packages" PR that:
- Bumps `package.json` version
- Updates `CHANGELOG.md`
- Aggregates all pending changesets

Merging that PR + pushing a version tag triggers npm publish.

## Code of Conduct

Be respectful. Be constructive. We're building tools that make AI-assisted development better for everyone. Bad faith contributions, spam, and hostile behavior result in an immediate ban.

## Questions?

Open an issue with the `question` label. We're happy to help.
