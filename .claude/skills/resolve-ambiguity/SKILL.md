---
name: resolve-ambiguity
description: "Systematic ambiguity resolution through tiered information gathering. Use when facing unclear requirements, unknown context, uncertain implementation choices, or any situation where guessing would be risky."
version: 1.0.0
---

# Resolve Ambiguity

Resolve ambiguity through a systematic process that prioritizes accurate information over guessing. This skill determines the best source for missing information and retrieves it efficiently.

**Core principle**: Rather ask than guess. Wrong assumptions waste more time than clarifying questions.

**Usage**: Invoke this skill reactively — whenever an agent encounters something it doesn't know during any pipeline step.

---

## Quick Start

When you encounter ambiguity, classify it:

1. **Technical/Factual** — "How does X work?" "What is the correct syntax?" "What did the architecture doc decide?"
   - Likely found in project or online sources
   - Follow the tiered lookup process

2. **Intent/Choice** — "Which approach should I use?" "What does the user want?" "Should we prioritize X or Y?"
   - Requires user input
   - Go directly to User Clarification (skip lookup)

---

## Tiered Lookup (for Technical/Factual ambiguity)

Check sources in this order. **Stop as soon as you find authoritative information.**

### Tier 1: Project Context Files

**Check first — fastest and most relevant**

Look for project-specific context that may already answer the question:
- `AGENTS.md` or `GEMINI.md` — Agent instructions, tech stack, validation commands
- `.agent/instructions/tech-stack.md` — Technology decisions
- `.agent/instructions/patterns.md` — Code conventions
- `.agent/instructions/structure.md` — Directory layout
- `.agent/instructions/commands.md` — Dev, test, lint, build

If these files contain `{{PLACEHOLDER}}` values, the information hasn't been decided yet — move to the next tier.

### Tier 2: Upstream Spec Documents

**Check second — the pipeline's own output**

The answer may already exist in a document written by an earlier pipeline stage:
- `docs/plans/ideation/ideation-index.md` + fractal domain tree (folder `*-index.md`, `*-cx.md`, and feature files) — Problem, personas, features, constraints, domain map
- `docs/plans/*-architecture-design.md` — Tech stack, system design, security model
- `docs/plans/ENGINEERING-STANDARDS.md` — Quality thresholds, performance budgets
- `docs/plans/ia/*.md` — IA shards (features, data models, access control, edge cases)
- `docs/plans/ia/deep-dives/*.md` — Detailed architectural decisions
- `docs/plans/be/*.md` — BE specs (endpoints, contracts, schemas)
- `docs/plans/fe/*.md` — FE specs (components, routing, state, a11y)

**Read the specific section, not the entire document.** Use the IA/BE/FE index files to locate the relevant shard or spec.

### Tier 3: Architectural & Config Files

**Check third — project-specific patterns**

Look within the codebase for answers embedded in configuration or existing code:
- `package.json`, `tsconfig.json` — Dependencies, TypeScript config
- `pyproject.toml`, `setup.py` — Python config
- `Cargo.toml` — Rust config
- `.env.example` — Environment variables
- `README.md` — Project overview and setup
- `ARCHITECTURE.md` or `docs/architecture.md` — Design decisions

Also check existing code for established patterns:
- Search for files matching the pattern you're trying to follow
- Search for similar implementations in the codebase

### Tier 4: MCP Documentation Tools

**Check fourth — if MCP documentation tools are available**

If MCP tools are available for documentation lookup, use them:
- Context7, Firecrawl, or other documentation-specific MCP tools
- These provide structured access to official library and framework documentation

### Tier 5: Web Search Official Sources

**Check fifth — for external APIs, libraries, standards**

Search the web for:
- Official documentation sites
- GitHub repositories of libraries
- API reference documentation
- RFC or specification documents

**Search strategy**:
1. Search with specific query: `"{library/API name} documentation {specific topic}"`
2. Fetch the most authoritative result (official docs preferred)
3. Extract only the relevant information

Prefer sources in this order:
1. Official documentation (*.dev, *.io, readthedocs)
2. GitHub repository README/docs
3. Stack Overflow with high votes (for edge cases)

### When to Stop

Stop the tiered lookup when:
- You find authoritative information that resolves the ambiguity
- You've checked all relevant tiers without finding information
- The information found indicates this is actually a choice/intent question

If all tiers exhausted without answer, proceed to User Clarification.

---

## User Clarification (for Intent/Choice ambiguity)

For intent/choice questions, or when tiered lookup fails, ask the user directly. **Never guess when user input is available.**

### Principles

1. **Explain what you need** — Tell the user what information is missing
2. **Explain why you need it** — Describe how the answer affects the outcome
3. **Offer smart choices** — If you can infer likely options, present them
4. **Best practice first** — Order choices with recommended approach at top
5. **Bad ideas last** — If including risky options, put them at the bottom
6. **Always allow custom input** — User can always provide their own answer
7. **When uncertain, don't guess choices** — Better to ask open-ended than offer wrong options

### With Known Choices

When you can confidently identify the options, present them to the user:
- Question: Clear, specific question explaining context
- Options ordered by preference (2-4 max):
  1. Best practice / Most common / Recommended
  2. Good alternative
  3. Another valid option
  4. Least recommended / Has drawbacks
- Each option includes description explaining implications
- User can always provide custom input

### Without Known Choices

When you cannot confidently identify the options:

**DO NOT GUESS.** Ask an open-ended question instead:
- Explain what you need to know and why
- Keep options minimal or omit entirely
- Allow free-form input as primary response method

### Formatting Rules

1. **Single question at a time** — Don't overwhelm with multiple questions
2. **2-4 options maximum** — More becomes confusing
3. **Descriptions are required** — Every option needs context
4. **No yes/no when options exist** — Offer the actual choices instead
5. **Acknowledge uncertainty** — "I'm not sure which applies, so..."

---

## Ambiguity Categories

### Technical Implementation
**Examples**: "How do I call this API?" "What's the correct syntax?"

**Resolution path**:
1. Check project context files → upstream specs
2. Check architectural docs and existing code
3. Search official documentation
4. If still unclear → ask user for clarification

### Project Conventions
**Examples**: "What naming convention?" "Where should this file go?"

**Resolution path**:
1. Check agent instructions and patterns for explicit conventions
2. Check existing code for patterns
3. Check README/contributing guide
4. If no clear pattern → ask user preference

### Spec Interpretation
**Examples**: "Does the IA shard mean X or Y?" "Is this edge case in scope?"

**Resolution path**:
1. Re-read the specific section of the upstream spec
2. Check cross-shard references for clarification
3. Check deep dives for architectural decisions
4. If genuinely ambiguous → ask user (this is a spec gap that should be fixed)

### User Intent
**Examples**: "Which feature first?" "Should I also refactor X?"

**Resolution path**:
1. Skip lookup — this requires user input
2. Ask user immediately
3. Present inferred options if confident
4. Allow open-ended response if uncertain

### External Dependencies
**Examples**: "Which version of X?" "What's the API for Y?"

**Resolution path**:
1. Check package.json/pyproject.toml for versions
2. Search for current documentation
3. Fetch official docs
4. If version-specific behavior → confirm with user

### Architectural Decisions
**Examples**: "Monolith or microservices?" "Which pattern to use?"

**Resolution path**:
1. Check architecture-design.md for prior decisions
2. Check ENGINEERING-STANDARDS.md for constraints
3. This is usually a choice → ask user
4. Present trade-offs clearly in options

---

## Relationship to `/audit-ambiguity`

This skill and the audit workflow are complementary:

| Aspect | `resolve-ambiguity` | `/audit-ambiguity` |
|--------|---------------------|---------------------|
| **When** | During any step, at any time | Between pipeline stages |
| **Trigger** | Agent encounters something it doesn't know | User invokes as a gate |
| **Scope** | Single question or decision | Entire spec layer |
| **Output** | Answer or user decision | Scored report with punch list |
| **Purpose** | Prevent guessing during execution | Verify completeness after writing |

**Composition**: After `/audit-ambiguity` produces a punch list, it invokes this skill on each gap:
- **Technical gaps** → tiered lookup finds the answer → **mechanical fix** with source citation
- **Intent gaps** → no source has the answer → **judgment call** presented to user
- This powers the audit's remediation phase with structured, source-backed resolution

---

## Anti-Patterns

### Guessing and Hoping
**Wrong**: Making assumptions and proceeding without verification
**Instead**: Take 30 seconds to check or ask

### Too Many Questions
**Wrong**: Asking 5 questions before doing anything
**Instead**: Ask only what's blocking immediate progress

### Vague Questions
**Wrong**: "How should I proceed?"
**Instead**: "Should I use approach A (benefit) or B (benefit)?"

### Assuming User Expertise
**Wrong**: "Should I use the factory pattern or strategy pattern?"
**Instead**: Explain the options in plain terms with trade-offs

### Hiding Behind Defaults
**Wrong**: Silently using a default without mentioning alternatives
**Instead**: "I'll use X (the standard approach). Let me know if you'd prefer Y."

### Skipping Upstream Specs
**Wrong**: Searching the web for an answer that's already in the architecture doc
**Instead**: Check Tier 1 and 2 (project docs and upstream specs) before going external

### Not Recording the Resolution
**Wrong**: Resolving ambiguity verbally but not updating the spec
**Instead**: When a gap is resolved, update the relevant spec document so future readers don't hit the same ambiguity

---

## Process Summary

1. **Detect**: Identify what information is missing
2. **Classify**: Technical/Factual → Tiered lookup | Intent/Choice → User clarification
3. **Resolve**: Execute the appropriate resolution path
4. **Apply**: Use the information to proceed with the task
5. **Record**: Update relevant documents so the resolution persists
