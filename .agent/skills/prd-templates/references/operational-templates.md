# Operational Templates

Templates for operational artifacts produced during planning, assessment, and provisioning workflows.

---

## Slice Acceptance Criteria

Use when writing slice entries during `/plan-phase` Step 4:

```markdown
### Slice N: [Name]
**Size**: S/M/L
**Surfaces**: Contract, API, DB, UI

#### Tasks
- [ ] Contract: Zod schema for [entity] ← no tag (orchestrator handles sequentially)
- [ ] `BE` API endpoints for [entity] ← backend agent
- [ ] `FE` [entity] page and components ← frontend agent
- [ ] `QA` Integration tests for [entity] ← QA agent (runs FIRST to write failing tests, AND after BE+FE to verify)

#### Acceptance Criteria
- [ ] Given [context], when [action], then [result]
- [ ] Given [context], when [error condition], then [error response]
- [ ] [Performance/security criteria if applicable]

#### Dependencies
- Requires: Slice M
- Enables: Slice P
```

---

## Remediation State

Use when writing `docs/audits/remediation-state.md` during `/remediate-pipeline-assess`:

```markdown
# Remediation State

> Generated: [ISO 8601 date]

## Layer Status

- vision: [confirmed-clean | unverified-clean | needs-audit | no-content]
- architecture: [confirmed-clean | unverified-clean | needs-audit | no-content]
- ia: [confirmed-clean | unverified-clean | needs-audit | no-content]
- be: [confirmed-clean | unverified-clean | needs-audit | no-content]
- fe: [confirmed-clean | unverified-clean | needs-audit | no-content]

## Current Layer

[layer — the layer to process next]

## Layers Confirmed Clean This Session

(none yet)

## Notes

[Any relevant context]
```

---

## Installed Skills List

Use when updating `{{INSTALLED_SKILLS}}` during `/bootstrap-agents-provision` Step 8:

```markdown
### Default Skills
- fix-bug — TDD bug fix workflow
- refactor — Safe refactoring with test verification
- add-feature — Add feature to existing architecture
- deploy — Full deployment pipeline
- pr-review — Structured PR review
- security-audit — Security review across all layers
- main-workflow — General development workflow
- iterate-plan — Tech stack gap analysis
- setup-session — Session initialization
- using-git-worktrees — Isolated workspace management
- github-workflow-automation — GitHub CI/CD patterns
- audit-context-building — Deep code analysis
- context7-auto-research — Auto documentation lookup
- self-improving-agent — Learning from experiences

### Stack Skills
- [skill-name] — [description] (installed for [STACK_KEY]=[value])
- ...

### Surface Skills
- [skill-name] — [description] (installed for [surface] surface)
- ...
```

---

## Sync Integration Inventory

Use when building the integration inventory during `/sync-kit` Step 5a:

```markdown
## New Kit Content Since Last Sync

### New Rules
- [list new rules, e.g. boundary-not-placeholder]

### New Skills
- [list new skills, e.g. parallel-agents, parallel-debugging]

### Changed Rules/Instructions
- [list what changed, e.g. tdd-always now references BOUNDARY stubs]

### New Concepts
- [list new concepts, e.g. boundary stubs, file ownership, synthesis protocol]
```
