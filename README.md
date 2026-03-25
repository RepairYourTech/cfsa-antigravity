# CFSA Antigravity

> Constraint-First Specification Architecture — production-grade from line one

A pipeline that turns a raw idea into exhaustively specified, test-driven, production-quality code through progressive gates. Stack-agnostic. Built for Antigravity on Linux/WSL. Every line of code is production-grade from the moment it's written.

## Quick Install

```bash
npx cfsa-antigravity init
```

This installs the `.agent/` folder, `docs/` structure, and agent config files into your project.

## CLI

| Command | Description |
|---------|-------------|
| `cfsa-antigravity init` | Install the pipeline into your project |
| `cfsa-antigravity status` | Check installation + unfilled placeholders |
| `cfsa-antigravity init --force` | Overwrite existing installation |
| `cfsa-antigravity init --dry-run` | Preview what would be installed |
| `cfsa-antigravity init --path ./dir` | Install into specific directory |

### ⚠️ Important Note on `.gitignore`
If you are using AI-powered editors like **Cursor** or **Windsurf**, adding the `.agent/` folder to your `.gitignore` may prevent the IDE from indexing the workflows. This results in slash commands (like `/ideate`, `/create-prd`) not appearing in the chat suggestion dropdown.

**Recommended Solution:**
To keep the `.agent/` folder local (not tracked by Git) while maintaining AI functionality:
1. Ensure `.agent/` is **NOT** in your project's `.gitignore`.
2. Instead, add it to your local exclude file: `.git/info/exclude`
   
## Get Started

```
/ideate
```

The pipeline tells you what to run next at every step. You never have to guess.

## Keeping Up to Date

The kit evolves independently of your project. To pull improvements into an existing project:

```
/sync-kit
```

This performs a **semantic merge** — it applies new workflows, skills, and rules from the upstream kit while preserving your project-specific values (tech stack, validation commands, filled placeholders). It will never overwrite your project decisions.

- First sync does a full comparison; subsequent syncs are incremental (commit-scoped)
- Tracks sync state in `.agent/kit-sync.md` so it knows what changed since last update
- Flags any structural migrations needed (e.g., ideation format changes)

## Documentation

| Document | Contents |
|----------|----------|
| [Pipeline Guide](docs/README.md) | Full walkthrough — every command, every stage |
| [Kit Architecture](docs/kit-architecture.md) | How the kit's internals work |

## Five Principles

1. **Constraints before decisions** — map what's decided before presenting options
2. **Exhaustive iteration over shallow speed** — no ambiguity moves forward
3. **Work shifted left** — design decisions made in spec, not in code
4. **Progressive decision locking** — each stage locks decisions for downstream
5. **TDD as the implementation contract** — Red → Green → Refactor, every slice

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to set up, make changes, and submit PRs.

## License

[MIT](LICENSE)
