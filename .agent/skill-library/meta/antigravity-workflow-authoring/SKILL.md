---
name: antigravity-workflow-authoring
description: Create, edit, and validate Antigravity workflows (.agent/workflows/*.md). Use when asked to "create a workflow", "add a slash command", "automate a process", "make a workflow for X", or when you need to define repeatable multi-step procedures that agents can invoke via /slash-command. Covers format specification, turbo annotations, conditional branching, skill chaining, and validation.
---

# Antigravity Workflow Authoring

Create production-grade workflows for the Antigravity IDE agent system.

## Workflow Format

Workflows are Markdown files stored in `.agent/workflows/`. The filename becomes the slash command:

```
.agent/workflows/deploy-staging.md  →  invoked via /deploy-staging
```

### Required Structure

Every workflow file has **YAML frontmatter** + **Markdown body**:

```markdown
---
description: What this workflow does (one line)
---

[Numbered steps with clear, specific instructions]
```

The `description` field is the **only** frontmatter field. Keep it under 100 characters.

## Turbo Annotations

Turbo annotations control automatic command execution without user approval.

### Per-Step Turbo

Place `// turbo` on the line **immediately above** a step to auto-run that step's command:

```markdown
1. Check current branch status
// turbo
2. Run the linter
3. Review results and fix issues
```

Step 2 auto-runs, steps 1 and 3 require normal approval.

### Global Turbo

Place `// turbo-all` **anywhere** in the workflow to auto-run **every** step that uses `run_command`:

```markdown
---
description: Run full CI pipeline locally
---

// turbo-all

1. Run lint checks
2. Run unit tests  
3. Run integration tests
4. Generate coverage report
```

### Turbo Safety Rules

- `// turbo` applies ONLY to the single step immediately following it
- `// turbo-all` applies to EVERY `run_command` step in the workflow
- Only use turbo for safe, non-destructive commands (lint, test, build, status)
- NEVER turbo: `rm`, `git push --force`, `sudo`, database mutations, deploy commands

## Writing Effective Steps

Each step must be **numbered**, **imperative**, **specific**, and **self-contained**.

### Good vs Bad

```markdown
# GOOD
1. Run the test suite and verify all tests pass:
   bun test

# BAD  
1. Test everything  ← vague
2. Make sure it works  ← no action
3. Deploy  ← no details
```

## Workflow Patterns

### Sequential Pipeline
For linear processes. See [references/templates.md](references/templates.md) for full template.

### Conditional Branching
For workflows with decision points — branch to labeled sections.

### Skill-Chaining
Invoke installed skills as steps: "Use the **tdd-workflow** skill to write failing tests first."

### Interactive
Steps that pause for user input before continuing.

See [references/examples.md](references/examples.md) for complete examples of each pattern.

## Naming Conventions

- Use lowercase kebab-case: `deploy-staging.md`
- Keep under 4 words: `/create-api-route`
- Make slash commands intuitive

## Validation Checklist

- [ ] YAML frontmatter with `description` under 100 chars
- [ ] Steps numbered sequentially with specific actions
- [ ] Commands include exact syntax (not pseudocode)
- [ ] `// turbo` only on safe, non-destructive steps
- [ ] Saved in `.agent/workflows/` with kebab-case filename
- [ ] Ends with a verification step

## Anti-Patterns

- **Mega-workflows**: Split 20+ step workflows into sub-workflows
- **Vague steps**: "Fix any issues" — be specific about what issues
- **Turbo everything**: Never turbo destructive commands
- **No verification**: Always end with a validation step
