# Skill Library

> [!WARNING]
> **Do not load skills from this directory directly.** Skills in this library are
> templates — they contain `{{PLACEHOLDER}}` values that must be filled by
> `/bootstrap-agents` before use. Always install skills through the pipeline.

## How It Works

1. A pipeline workflow (e.g., `/create-prd`) makes a tech stack decision
2. It calls `/bootstrap-agents` with the new stack key=value
3. Bootstrap reads `.agent/skill-library/MANIFEST.md` and finds matching skills
4. Matching skills are copied from `.agent/skill-library/` → `.agent/skills/`
5. Any `{{PLACEHOLDER}}`s inside the copied skills are filled with current values

## Installing Skills

### Automatic

Run any pipeline workflow that makes tech decisions (e.g., `/create-prd`). Skills
matching your stack are installed automatically via `/bootstrap-agents`.

### Manual

Use `/find-skills` to search the library and install matching skills interactively.

### Direct

Copy a skill directory from `.agent/skill-library/[path]/` to `.agent/skills/[name]/`
and manually replace any `{{PLACEHOLDER}}` values.

## Library Structure

| Directory | Contents |
|-----------|----------|
| `stack/` | Stack-specific skills — triggered by tech stack decisions (database, framework, etc.) |
| `surface/` | Surface-specific skills — triggered by project surface type (web, api, mobile, etc.) |
| `meta/` | Meta skills — manual install only, for agent/plugin development |
