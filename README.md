# CFSA Antigravity

> Constraint-First Specification Architecture — production-grade from line one

A pipeline that turns a raw idea into exhaustively specified, test-driven, production-quality code through progressive gates. Stack-agnostic. Built for Antigravity on Linux/WSL. Every line of code is production-grade from the moment it's written.

## Quick Install

```bash
npx cfsa-antigravity init
```

This launches an interactive picker where you select which agent runtimes to install. Pick one or many -- each runtime is fully standalone.

For CI/CD or non-interactive use, specify runtimes directly:

```bash
npx cfsa-antigravity init --agent claude,factory
```

## CLI

| Command | Description |
|---------|-------------|
| `cfsa-antigravity init` | Interactive multi-select runtime installer |
| `cfsa-antigravity init --agent claude,factory` | Non-interactive install of specific runtimes |
| `cfsa-antigravity status` | Check all installed runtimes + unfilled placeholders |
| `cfsa-antigravity init --force` | Overwrite existing installation |
| `cfsa-antigravity init --dry-run` | Preview what would be installed |
| `cfsa-antigravity init --path ./dir` | Install into specific directory |

### Available runtimes

Runtimes are auto-detected from the template. Currently shipped:

- **Antigravity** (`.agent/`) -- Antigravity, Cursor, Codex, Gemini CLI
- **Claude Code** (`.claude/`) -- Standalone Claude Code runtime
- **Factory Droid** (`.factory/`) -- Standalone Factory Droid runtime

Each runtime is fully standalone with no cross-references. Install any combination side-by-side.

If you are using an editor that indexes agent files for slash commands, do not hide the runtime directory you actually installed.

**Recommended Solution:**
Keep the installed runtime directory out of shared `.gitignore` rules when your tool needs to index it. Prefer `.git/info/exclude` for local-only exclusions.

Examples:
1. Antigravity install → keep `.agent/` out of `.gitignore`
2. Codex install → keep `.agent/` out of `.gitignore`
3. Claude install → keep `.claude/` out of `.gitignore`
4. Factory install → keep `.factory/` out of `.gitignore`
5. Use `.git/info/exclude` for local exclusions instead of changing shared ignore rules
   
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
- Tracks sync state in the installed agent runtime (`.agent/kit-sync.md`, `.claude/kit-sync.md`, or `.factory/kit-sync.md`) so it knows what changed since last update
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
