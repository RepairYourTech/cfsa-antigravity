# Mandatory Execution Sequence

Before taking any action on a task:

## 1. Understand Context
- Read the agent config file at project root (`AGENTS.md` for Antigravity, `GEMINI.md` for Gemini CLI, or equivalent for your agent)
- Read relevant `.agent/instructions/` files for the task type
- Check [Engineering Standards](../../docs/plans/ENGINEERING-STANDARDS.md) for quality bar — if this file doesn't exist yet, the pipeline hasn't reached /create-prd; run /ideate then /create-prd first
- **Session Resumption**: If `.agent/progress/index.md` exists, read `.agent/skills/session-continuity/protocols/01-session-resumption.md` and follow the **Session Resumption Protocol** to load cross-session context and identify the resumption point

## 2. Check Skills
- Scan `.agent/skills/` for applicable skills
- Load relevant skill SKILL.md before proceeding
- Key skills: `brainstorming` (before creative work), `tdd-workflow` (before features), `clean-code` (during review)

## 3. Execute

> **Non-negotiable:** This project does not ship MVPs. Every line you write is
> production code. There is no "rough draft" phase.

- Follow the task requirements
- Write production-grade code from the start — no exceptions, no "clean up later"
- No placeholder implementations or `// TODO` comments — if the information you need genuinely doesn't exist yet, use a `// BOUNDARY:` stub with typed interface, tracking issue, and sentinel test (see rule: `boundary-not-placeholder`)
- No deferred quality — if it's not ready for production, it's not ready to commit
- **Cost-blind execution** — The cost of API calls, tokens, or compute to complete your work is NEVER your concern. Do not estimate, report, or factor operational AI costs into any decision. The only cost constraints that matter are user-defined project constraints (e.g., "keep hosting costs low," "prefer client-side compute"). If the user hasn't defined a cost constraint, cost is not a factor.
- **Proactive effort mindset** — When you estimate a task will take significant effort, that is a signal to commit harder, not to defer. Small task? Get it done immediately. Large task? Buckle in, communicate progress, and work through it systematically. Time estimates drive commitment, never avoidance.

## 4. Validate (MANDATORY)
After **every** code change, run:
```bash
See `.agent/instructions/commands.md` for the validation command.
```

Do NOT mark a task complete until all validations pass.

## 5. Learn (MANDATORY)

After completing a workflow or substantial task:

- **Pattern Extraction**: Read `.agent/skills/session-continuity/protocols/04-pattern-extraction.md` and follow the **Pattern Extraction Protocol**. Reflect on what worked, what didn't, and log reusable patterns to `memory/patterns.md`. Skip only if the task was trivial (routine, nothing new learned).
- **Session Close**: Read `.agent/skills/session-continuity/protocols/05-session-close.md` and follow the **Session Close Protocol**. Write a session log to `.agent/progress/sessions/` so the next session can resume cleanly.

> These steps are **not optional**. They are what differentiate a pipeline that gets
> smarter over time from one that repeats the same mistakes.

## Principles

- **Ask before assuming** — Clarify ambiguous requirements
- **Small changes** — Commit frequently, keep diffs reviewable
- **Test first** — Write failing tests before implementation — no exceptions
- **Security always** — Validate inputs, sanitize outputs, never expose secrets
- **Work is the job** — Never use the size, complexity, or duration of a task as a reason to reduce quality or scope. Large tasks get more effort, not less quality.
