# Contributing to CFSA Antigravity

Thanks for your interest in contributing! This project uses an **issue-first workflow** — every change starts with an approved issue.

## The Process

```
1. Open an Issue  →  2. Wait for Approval  →  3. Fork & Branch  →  4. PR (closes issue)
```

**PRs without a linked issue will be closed.**

## 1. Open an Issue First

Every PR must have a linked, maintainer-approved issue. No exceptions.

- 🐛 **Bug?** → [Bug Report](https://github.com/RepairYourTech/cfsa-antigravity/issues/new?template=bug_report.yml)
- ✨ **Feature?** → [Feature Request](https://github.com/RepairYourTech/cfsa-antigravity/issues/new?template=feature_request.yml)
- 🧩 **New skill?** → [New Skill Proposal](https://github.com/RepairYourTech/cfsa-antigravity/issues/new?template=new_skill.yml)

**Wait for a maintainer to approve** before starting work. This prevents wasted effort on changes that won't be accepted.

## 2. Fork and Branch

```bash
git clone https://github.com/YOUR-USERNAME/cfsa-antigravity.git
cd cfsa-antigravity
npm install
git checkout -b issue-123-short-description
```

### Branch Naming

- `feat/issue-123-new-skill-name` — new skills or features
- `fix/issue-456-workflow-correction` — bug fixes
- `docs/issue-789-improve-readme` — documentation

## 3. Make Your Changes

### What You Can Contribute

| Area | Examples |
|------|----------|
| **Skills** | New skills in `.agent/skills/` or `.agent/skill-library/` |
| **Workflows** | Improvements to pipeline workflows in `.agent/workflows/` |
| **Rules** | Refinements to agent rules in `.agent/rules/` |
| **Documentation** | Better explanations, examples, typo fixes |
| **CLI** | Improvements to `bin/cli.mjs` |

### Constraints

- Workflows must be under **12,000 characters**
- Skills must follow the `SKILL.md` format with YAML frontmatter
- Shared content goes in `prd-templates/references/`, not inlined in workflows
- Don't modify `.agent/instructions/` templates unless you understand the `{{PLACEHOLDER}}` system
- Don't add npm dependencies — the CLI is zero-dependency by design
- Run `npm run build` to verify template integrity before submitting

## 4. Open a Pull Request

1. Include a **changeset** (see below)
2. Use `Closes #123` in the PR body to auto-close the linked issue
3. Fill out the PR template completely
4. Wait for maintainer review — **all PRs require approval**

### Changesets (Required)

Every PR with user-facing changes must include a changeset:

```bash
npx changeset
```

Select the change type:
- `patch` — bug fixes, doc corrections, minor improvements
- `minor` — new skills, new workflows, new features
- `major` — breaking changes (renamed files, changed steps, removed features)

Commit the generated `.changeset/*.md` file with your PR.

**When a changeset is NOT needed:** dev-only files (CI config), root `README.md`, `.changeset/` config.

### PR Checklist

- [ ] I opened an issue **before** this PR and it was approved
- [ ] This PR uses `Closes #NNN` to link the issue
- [ ] Changeset file included (if user-facing changes)
- [ ] `npm run build` passes
- [ ] New workflows are under 12,000 characters
- [ ] `AGENTS.md` and `GEMINI.md` updated if adding workflows/skills
- [ ] No `{{PLACEHOLDER}}` values were hardcoded

## Release Process (Maintainers)

When changesets accumulate on `main`, the Changesets GitHub Action opens a "Version Packages" PR. Merging it bumps the version, updates `CHANGELOG.md`, and triggers npm publish.

## Code of Conduct

Be respectful. Be constructive. Bad faith contributions, spam, and hostile behavior result in an immediate ban.

## Questions?

Open a [Discussion](https://github.com/RepairYourTech/cfsa-antigravity/discussions) — issues are for actionable work items.
