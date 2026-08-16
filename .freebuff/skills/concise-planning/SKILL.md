---
name: concise-planning
description: "Use when a user asks for a plan for a coding task, to generate a clear, actionable, and atomic checklist."
version: 2.0.0
source: self
date_added: "2026-02-27"
date_rewritten: "2026-03-14"
---

# Concise Planning

Generate focused, actionable implementation plans that eliminate ambiguity and prevent scope creep.

## When to Use

- User asks "how should I approach this?" or "can you make a plan for X?"
- Task involves multiple files or components
- Work spans more than ~3 logical steps
- You need to communicate a proposed sequence before executing

## When NOT to Use

- Task is a single-step operation (just do it)
- User gave an explicit command with clear intent (just execute)
- During `/plan-phase` or `/implement-slice` (those have their own planning structure)

## Workflow

### 1. Scan Context (30 seconds, not 5 minutes)

Read only what's necessary:
- **Project structure** — `ls` the relevant directories
- **Existing patterns** — check one similar file for conventions
- **Constraints** — look for test frameworks, linters, type systems in use

Do NOT read every file in the project. Do NOT generate a 500-line analysis. Scan, not study.

### 2. Ask or Assume

- **0 questions** if the task is clear and you have enough context
- **1 question max** if there's a genuinely blocking ambiguity
- **Never more than 2** — if you need more, you don't understand the codebase well enough. Go read more code instead of asking.

For non-blocking unknowns, state your assumption:
> "Assuming we want this as a new utility in `lib/` rather than inline — will adjust if you prefer otherwise."

### 3. Generate Plan

Use this exact structure:

```markdown
## Approach

[1-3 sentences: what you'll do and why this approach over alternatives]

## Scope

**In:**
- [Specific deliverable 1]
- [Specific deliverable 2]

**Out:**
- [Explicitly excluded item — prevents scope creep]

## Steps

1. [Verb] [specific target] — [why, if non-obvious]
2. [Verb] [specific target]
3. [Verb] [specific target]
4. [Verb] [specific target]
5. Validate: [specific validation command or check]

## Assumptions

- [Assumption 1 — what you decided without asking]
```

### Plan Quality Rules

| Rule | Why |
|------|-----|
| **6-10 steps** | Fewer = too vague. More = over-planned. |
| **Verb-first steps** | "Add", "Create", "Refactor", "Test" — not "The component should..." |
| **Name files and functions** | "Add `validateEmail()` to `lib/validators.ts`" not "add validation" |
| **One validation step minimum** | Every plan ends with proof it works |
| **Explicit "Out" scope** | Prevents the plan from growing mid-execution |
| **No nested sub-plans** | If a step needs sub-steps, it's too big — split it |

### Anti-Patterns

| Don't | Do |
|-------|-----|
| "Research best practices for X" | Just apply the best practice directly in a step |
| "Consider whether to use A or B" | Pick one, state why, move on |
| "Set up the project structure" | "Create `src/validators/` with `index.ts` and `email.ts`" |
| "Write tests" | "Add tests for `validateEmail`: valid input, empty string, missing @, >254 chars" |
| 20-step plan | 8-step plan with clear scope boundaries |
| Plan that describes what might happen | Plan that describes what WILL happen |

## Output Format

Always present the plan in a markdown code block or as structured markdown. Never as prose paragraphs.

After presenting the plan, ask one question:
> "Ready to execute, or want to adjust anything?"

Then execute on confirmation — don't re-plan.
