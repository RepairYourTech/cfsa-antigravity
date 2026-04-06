---
name: skill-creator
description: "Create new CFSA Antigravity skills following the kit's skill format. Handles brainstorming, SKILL.md generation, references, and MANIFEST.md registration."
version: 2.0.0
source: self
date_added: "2026-02-27"
date_rewritten: "2026-03-14"
---

# Skill Creator

Create new skills for the CFSA Antigravity kit that follow the established format and quality standards.

## When to Use

- User wants to create a new skill for the kit
- User wants to package domain knowledge into a reusable skill
- User asks "create a skill for X" or "make a skill that does Y"
- Extending the `.agent/skills/` or `.agent/skill-library/` directories

## When NOT to Use

- User wants to use an existing skill (just load the SKILL.md)
- User wants to find a skill (use `find-skills` skill instead)

---

## Skill Anatomy

Every skill lives in a directory under `.agent/skills/` (installed, always available) or `.agent/skill-library/` (catalog, provisioned per-project):

```
skill-name/
├── SKILL.md          # Required — the skill definition
├── references/       # Optional — supporting docs, templates, data
│   ├── patterns.md
│   └── examples.md
└── scripts/          # Optional — executable utilities
    └── validate.sh
```

### SKILL.md Structure

```markdown
---
name: skill-name
description: "One-line description of what the skill does and when to use it"
version: 1.0.0
source: self
date_added: "YYYY-MM-DD"
---

# Skill Title

[1-2 sentence overview of the skill's purpose and philosophy]

## When to Use
[Specific triggers — what user requests or situations activate this skill]

## When NOT to Use
[Explicit boundaries — prevents misapplication]

## [Core Content Sections]
[The actual skill knowledge, patterns, rules, examples]

## Anti-Patterns
[Common mistakes to avoid]
```

---

## Creation Workflow

### 1. Define the Skill

Ask these questions (most can be inferred — only ask if genuinely ambiguous):

| Question | Why |
|----------|-----|
| What domain does this cover? | Determines skill-library placement (stack/surface/meta) |
| What triggers it? | Defines the "When to Use" section |
| What should it NOT do? | Defines boundaries — prevents scope creep |
| Is this installed or library? | `.agent/skills/` (always active) vs `.agent/skill-library/` (provisioned) |

**Decision rules:**
- Cross-cutting concerns (planning, debugging, testing) → `.agent/skills/`
- Tech-specific (React, PostgreSQL, Docker) → `.agent/skill-library/stack/`
- Surface-specific (web perf, mobile UX, API design) → `.agent/skill-library/surface/`
- Meta/tooling (git, MCP builders, tmux) → `.agent/skill-library/meta/`

### 2. Research the Domain

Before writing, gather authoritative reference material:

1. **Context7** — pull latest docs for relevant libraries/frameworks
2. **Official documentation** — language specs, framework guides
3. **Established patterns** — well-known architectural patterns, design principles
4. **Anti-patterns** — common mistakes documented in the community

Do NOT copy content. Synthesize what you learn into original guidance.

### 3. Write the SKILL.md

**Quality standards:**

| Criterion | Requirement |
|-----------|-------------|
| Length | 100-500 lines (ideal: 200-300) |
| Code examples | Real, runnable, with context |
| Anti-patterns table | Show "Don't" / "Do" side by side |
| Specificity | Named functions, typed examples, concrete values |
| Self-contained | Skill works without reading external docs |
| Frontmatter | All required fields filled, `source: self` |

**Writing rules:**
- Imperative voice ("Use X", "Avoid Y") — not passive ("X should be used")
- Concrete over abstract ("P95 < 200ms" not "fast responses")
- Show code, not just describe it
- Anti-patterns are as important as patterns — include both
- One concept per section — if a section needs sub-sections, it's too big

### 4. Add References (If Needed)

Create `references/` files when the skill needs:
- Large lookup tables (error codes, status codes, patterns)
- Template files that the skill references
- Extended examples that would bloat the SKILL.md
- Data files (JSON schemas, regex collections)

Keep `references/` files focused — one topic per file, not a catchall.

### 5. Register in MANIFEST

If the skill goes in `.agent/skill-library/`, add it to `MANIFEST.md`:

```markdown
| Category | Skill | Description | When to Provision |
|----------|-------|-------------|-------------------|
| stack/databases | postgresql | PostgreSQL patterns... | When project uses PostgreSQL |
```

If the skill goes in `.agent/skills/`, no registration needed — it's always active.

### 6. Validate

Before committing, verify:

- [ ] SKILL.md has valid YAML frontmatter with all required fields
- [ ] `source: self` is set (we own this content)
- [ ] `version: 1.0.0` is set
- [ ] "When to Use" and "When NOT to Use" sections exist
- [ ] Code examples are syntactically correct
- [ ] No `TODO`, `FIXME`, or placeholder content
- [ ] File is under 500 lines (move overflow to `references/`)
- [ ] Skill name matches directory name (kebab-case)

---

## Skill Placement Guide

### `.agent/skills/` (Installed Skills)

These load automatically for every project. Reserved for:
- Pipeline workflow skills (ideation, spec-writing, planning)
- Cross-cutting engineering skills (TDD, debugging, clean code)
- Agent behavior skills (verification, planning, brainstorming)
- Meta skills (skill-creator, find-skills, session-continuity)

### `.agent/skill-library/` (Library Skills)

Provisioned per-project based on tech stack. Organized by:

```
skill-library/
├── meta/           # Agent tooling (git, tmux, MCP builders)
├── stack/          # Tech-specific
│   ├── ai/         # AI/ML tools (langchain, openai)
│   ├── auth/       # Auth providers (clerk, authjs)
│   ├── databases/  # Databases (postgresql, redis, mongodb)
│   ├── frameworks/ # Frameworks (nextjs, sveltekit, fastapi)
│   ├── languages/  # Languages (typescript, python, rust)
│   └── ...
└── surface/        # Surface-specific
    ├── api/        # API design, versioning, caching
    ├── web/        # Web performance, SEO, accessibility
    ├── mobile/     # Mobile patterns, push notifications
    └── ...
```

---

## Skill Quality Anti-Patterns

| Don't | Do |
|-------|-----|
| Generic advice ("write clean code") | Specific rules with examples |
| Wall of text with no structure | Tables, code blocks, clear sections |
| Copy-paste from external docs | Synthesize into original guidance |
| 1000-line SKILL.md | 200-300 line SKILL.md + references/ |
| "See [external link] for details" | Include the essential info inline |
| Describe patterns without showing code | Every pattern gets a code example |
| Skip anti-patterns | Anti-patterns are 50% of the value |
| Leave source as "community" or "unknown" | Always set `source: self` for original work |
