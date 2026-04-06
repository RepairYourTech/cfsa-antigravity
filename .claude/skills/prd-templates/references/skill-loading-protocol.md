# Skill Loading Protocol

Standard procedure for loading skills from the surface stack map before beginning spec or implementation work.

## How to Load Skills from the Surface Stack Map

1. **Determine the surface**: Identify which surface this work belongs to from the directory path or phase plan (e.g., `docs/plans/be/web/` → surface `web`; flat `docs/plans/be/` → surface `shared`).

2. **Read the surface stack map**: Open `.agent/instructions/tech-stack.md` and locate this surface's row.

3. **For each skill category** relevant to your workflow (Languages, Databases, BE Frameworks, FE Frameworks, FE Design, ORMs, Auth, Unit Tests, E2E Tests, State Mgmt, Accessibility, CI/CD, Hosting, Security):
   - Read the skill name(s) listed in that cell
   - For each skill directory name, read `.agent/skills/[skill]/SKILL.md`
   - Follow its conventions (language, testing, framework, design, etc.)

4. **Cross-cutting skills**: Some categories (Auth, Security, CI/CD, Hosting, Accessibility) are in the cross-cutting section — not per-surface. Read those from the cross-cutting rows.

5. **Missing skill fallback**: If any skill in the bundle is not installed in `.agent/skills/` and is not in `.agent/skill-library/MANIFEST.md`, read `.agent/skills/find-skills/SKILL.md` and follow its discovery methodology to search for a community equivalent before proceeding without it.

## Which Categories to Load Per Workflow

| Workflow | Required Categories |
|----------|-------------------|
| `write-be-spec-classify` | Languages, Databases, Auth, BE Frameworks, ORMs, Unit Tests |
| `write-fe-spec-classify` | Languages, FE Frameworks, FE Design, Accessibility, State Mgmt |
| `write-architecture-spec-design` | Databases, Security, API Design |
| `setup-workspace-scaffold` | Languages, BE Frameworks, FE Frameworks |
| `setup-workspace-cicd` | CI/CD, Languages |
| `setup-workspace-hosting` | Hosting, CI/CD |
| `setup-workspace-data` | Databases, ORMs |
| `implement-slice-tdd` | Languages, Unit Tests, E2E Tests |
| `validate-phase` | Unit Tests, E2E Tests, CI/CD, Hosting, Accessibility, Security |

## Surface Stack Map Verification

Before loading, verify the required cells have filled values. If any required cell is empty → **HARD STOP**: tell the user to run `/create-prd` first to make tech stack decisions.
