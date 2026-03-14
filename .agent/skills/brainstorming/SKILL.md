---
name: brainstorming
description: "Use before any creative work — creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements, and design before implementation."
version: 2.0.0
source: self
date_added: "2026-02-27"
date_rewritten: "2026-03-14"
---

# Brainstorming Ideas Into Designs

Turn raw ideas into **clear, validated designs** through structured dialogue **before any implementation begins**.

## When to Use

- User describes a new feature, component, or behavior change
- Task involves creative decisions (not just execution of a clear spec)
- Requirements are ambiguous or incomplete
- Work could go in multiple valid directions

## When NOT to Use

- Task has a clear spec with acceptance criteria (just implement it)
- Fixing a bug with obvious cause (just fix it)
- During `/plan-phase` or `/implement-slice` (those have their own structure)
- Trivial changes (rename a variable, fix a typo)

## Operating Mode

You are a **design facilitator**, not a builder. While this skill is active:

- No coding, no file modifications
- No speculative features — only design what's been discussed
- No silent assumptions — every assumption gets stated explicitly
- No skipping ahead — each gate must be passed before proceeding

---

## The Process

### 1. Scan Context (Before Asking Anything)

Read the relevant project state:
- Existing code in the affected area
- Related specs, plans, or prior decisions
- Recent changes that might affect the design

Note what already exists vs. what's proposed. Identify implicit constraints.

**Do not design yet.**

### 2. Understand the Idea

**One question at a time.** Do not dump a list of 10 questions.

Prefer multiple-choice when possible:
> "Should this component handle errors inline or delegate to a parent error boundary?
> A) Inline (self-contained)
> B) Delegate (parent handles)
> C) Hybrid (catch critical, delegate non-critical)"

Focus on understanding:
- **Purpose** — what problem does this solve?
- **Users** — who uses it and how?
- **Constraints** — performance, security, compatibility limits
- **Success criteria** — how do we know it's working?
- **Non-goals** — what is explicitly out of scope?

### 3. Non-Functional Requirements

Before any design, clarify or propose defaults for:

| Requirement | If User Is Unsure |
|-------------|-------------------|
| Performance | Propose: "P95 < 200ms for API, <3s for page load" |
| Scale | Propose: "Support 1K concurrent users initially" |
| Security | Default: input validation, auth required, no PII in logs |
| Reliability | Propose: "99.5% uptime, graceful degradation" |
| Maintenance | "Maintained by your team, or handed off?" |

Mark all proposals as **assumptions** that the user can override.

### 4. Understanding Lock (Hard Gate)

**Before proposing any design**, present:

```markdown
## Understanding Summary
- **Building**: [what]
- **Purpose**: [why]
- **Users**: [who]
- **Key constraints**: [limits]
- **Non-goals**: [explicitly excluded]

## Assumptions
- [Each assumption stated clearly]

## Open Questions
- [Any unresolved items]
```

Then ask: *"Does this accurately reflect your intent? Please confirm or correct before we move to design."*

**Do NOT proceed until confirmed.**

### 5. Explore Design Approaches

Present **2-3 viable approaches**:

1. **Recommended** — lead with this, explain why
2. **Alternative** — different tradeoff (simpler but less extensible, etc.)
3. **Alternative** — if genuinely different from #2

For each approach, cover:
- Complexity estimate (low/medium/high)
- Extensibility (how easy to evolve later)
- Risk (what could go wrong)
- Implementation effort (rough scope)

Apply **YAGNI ruthlessly** — remove unnecessary features from all approaches.

### 6. Present Design (Incrementally)

Break the design into sections of **200-300 words max**. After each section:

> "Does this look right so far?"

Cover as relevant:
- Architecture / component structure
- Data flow and state management
- Error handling and edge cases
- Testing strategy
- Integration points

### 7. Decision Log

Maintain a running log:

```markdown
| Decision | Alternatives | Rationale |
|----------|-------------|-----------|
| Use event-driven sync | Polling, webhooks | Lower latency, less server load |
| SQLite over PostgreSQL | PostgreSQL | Single-user app, simpler deployment |
```

This log survives into the final design document.

---

## Exit Criteria

You may exit brainstorming **only when ALL are true**:

- [ ] Understanding Lock confirmed by user
- [ ] At least one design approach explicitly accepted
- [ ] Assumptions documented and acknowledged
- [ ] Key risks identified
- [ ] Decision Log complete

If any criterion is unmet → continue refinement. Do NOT proceed to implementation.

## After Brainstorming

1. Write the design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
2. Include: understanding summary, assumptions, decision log, final design
3. Ask: "Ready to set up for implementation?"
4. If yes, hand off to the appropriate pipeline command (`/plan-phase`, `/implement-slice`, etc.)

## Key Principles

1. **One question at a time** — never overwhelm
2. **Multiple choice preferred** — easier to answer
3. **Assumptions must be explicit** — never silently assume
4. **YAGNI ruthlessly** — remove unnecessary features
5. **Explore alternatives** — always 2-3 approaches
6. **Incremental validation** — present in sections, validate each
7. **Clarity over cleverness** — simple > smart
