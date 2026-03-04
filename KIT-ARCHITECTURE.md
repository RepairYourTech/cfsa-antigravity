# Spec Pipeline Starter Kit - Architecture

**Purpose:** Provide a high-level map of the agentic machinery that powers the Spec Pipeline Starter Kit.

This document serves as a guide to understanding how the various components within the `.agent/` directory interlock to provide a robust, agent-agnostic development environment.

---

## 1. Code Organization

The intelligence of the kit lives entirely within the `.agent/` directory.

```text
.agent/
├── instructions/    # Core directives (the "brainstem")
├── progress/        # State and memory (the "hippocampus")
├── rules/           # Non-negotiable constraints (the "laws")
├── skills/          # Reusable capabilities (the "tools")
└── workflows/       # Structured processes (the "playbooks")
```

### Core Components

*   **Instructions:** (`workflow.md`, `tech-stack.md`, `structure.md`, `patterns.md`, etc.) Baseline knowledge the agent needs to operate in the specific environment. These files ship as templates with `{{PLACEHOLDER}}` markers — they are not static files. The bootstrap system fills them progressively as tech decisions are confirmed during `/create-prd`. An instruction file with unfilled placeholders is a broken agent context. `workflow.md` enforces the mandatory execution sequence: Understand Context -> Check Skills -> Execute -> Validate.
*   **Rules:** Preemptively loaded constraints that apply to *every* task. Includes security best practices, TDD mandates (`tdd-contract-first.md`), and platform-specific laws (e.g., `child-safety.md`).
*   **Skills:** Modular capabilities (e.g., `technical-writer`, `surrealdb-expert`). Agents load these explicitly when a task requires them, preventing context bloat.
*   **Workflows:** Step-by-step markdown checklists invoked via `/slash-commands` (e.g., `/create-prd`, `/implement-slice`). They chain skills together to achieve complex, multi-stage goals.

---

## 2. Data Flow & State Management

Agents are inherently stateless across conversations. The kit uses the **Session Continuity** protocol to provide a persistent memory system.

### The `.agent/progress/` Directory

This directory acts as the agent's long-term and working memory.

```text
.agent/progress/
├── active-phase.md     # Current phase/sprint tracking
├── memory/
│   ├── blockers.md     # Resolved issues to prevent regression
│   ├── decisions.md    # Architectural choices and their rationale
│   └── patterns.md     # Recurring semantic patterns/idioms
└── sessions/           # State checkpoints for resuming work across chats
```

### Flow

1.  **Read:** Upon initialization, workflows frequently instruct agents to read `.agent/progress/active-phase.md` to understand current goals.
2.  **Act:** The agent executes the workflow.
3.  **Persist:** At defined checkpoints (or via the `/sync-progress` protocol), the agent distills learnings into `patterns.md`, `decisions.md`, and `blockers.md`.
4.  **Resume:** When a new chat starts, the `/resume-session` step in workflows points the agent back to the recent session files to pick up where it left off.

### Dated File Convention

A document is dated (prefixed with `YYYY-MM-DD-`) if and only if it is a **compiled artifact** — one that can be superseded by a newer version and both versions might need to coexist temporarily. Living documents that are updated in place are never dated.

| Document | Dated? | Rationale |
|---|---|---|
| `architecture-design.md` | ✅ Yes | Can be re-run with new stack; old version referenced during migration |
| `vision.md` | ✅ Yes | Evolution creates a new version; audit trail needed |
| `data-placement-strategy.md` | ✅ Yes | Same pattern |
| `ENGINEERING-STANDARDS.md` | ✅ Yes | Standards are versioned |
| Audit reports (`docs/audits/`) | ✅ Yes | Versioned snapshots by definition |
| Propagation scan reports | ✅ Yes | Same |
| IA shards (`docs/plans/ia/`) | ❌ No | Living documents; updated in place by `/evolve-feature` |
| BE specs (`docs/plans/be/`) | ❌ No | Living documents |
| FE specs (`docs/plans/fe/`) | ❌ No | Living documents |
| Phase plans (`docs/plans/phases/`) | ❌ No | Operational; history lives in progress tracking files |

Any workflow that reads a compiled artifact must use a glob pattern (e.g., `docs/plans/*-architecture-design.md`), never a hardcoded non-dated path. The agent does not know the date the file was created, so the glob is the only reliable way to locate it.

---

## 3. Module Relationships

The power of the kit comes from how these modules interact:

*   **Workflows call Skills:** A workflow like `/create-prd` will explicitly instruct the agent to use the `technical-writer` and `brainstorming` skills.
*   **Rules constrain Workflows:** While a workflow dictates the *steps*, the rules dictate *how* those steps are performed (e.g., `/implement-slice` must obey `tdd-contract-first.md`).
*   **State informs Execution:** Workflows read from `.agent/progress/` to contextualize their execution based on past decisions and current active phases.

---

## 3.5. Bootstrap System

The bootstrap system transforms the kit from a generic template into a project-specific configuration. It runs as a utility workflow called by other pipeline workflows — never directly by the user.

### Components

*   **`bootstrap-agents-fill`**: Receives template key-value pairs and fills `{{PLACEHOLDER}}` markers across all instruction files and root agent config files (`AGENTS.md`, `GEMINI.md`). Idempotent — only fills what's provided, leaves other placeholders untouched.
*   **`bootstrap-agents-provision`**: Reads the skill library manifest, copies matching skills from `.agent/skill-library/` into `.agent/skills/`, fills skill-specific placeholders, composes `FRAMEWORK_PATTERNS` from the installed frontend framework skill, and updates the installed skills list in all root config files.

### Invocation Model

Bootstrap fires **progressively** — once per confirmed tech decision during `/create-prd-stack`, not in a batch at the end:

1. **Database confirmed** → fills DB placeholders (`DATABASE`, `ORM`, etc.) + provisions database skill (e.g., `surrealdb-expert`, `postgresql-patterns`)
2. **Frontend framework confirmed** → fills framework placeholders + provisions framework skill + composes `FRAMEWORK_PATTERNS` for `patterns.md`
3. **Step 9.5 of `/create-prd-compile`** → fills `PROJECT_STRUCTURE` and `ARCHITECTURE_TABLE` in `structure.md`

### Auto-filled vs. "If Provided" Keys

| Key | Auto-filled? | Generated by |
|-----|-------------|--------------|
| `VALIDATION_COMMAND`, `TEST_COMMAND`, etc. | Yes | Derived from confirmed dev tooling |
| `DATABASE`, `AUTH_PROVIDER`, etc. | Yes | Confirmed tech decisions |
| `INSTALLED_SKILLS` | Yes | After skill provisioning |
| `PROJECT_STRUCTURE`, `ARCHITECTURE_TABLE` | **No — requires Step 9.5** | `/create-prd-compile` Step 9.5 |
| `FRAMEWORK_PATTERNS` | **No — requires framework skill** | `bootstrap-agents-provision` after framework provisioning |

### Placeholder Verification Gate Protocol

Workflows that read `{{PLACEHOLDER}}`-dependent skill paths declare their dependencies in frontmatter via the `requires_placeholders:` key — a machine-readable list of which placeholder values must be filled before the workflow can run.

```yaml
requires_placeholders: [DATABASE_SKILLS, SECURITY_SKILLS]
```

Two distinct gate types enforce placeholder readiness at different pipeline stages:

| Gate type | Where it runs | When | Purpose |
|---|---|---|---|
| **Spec-phase gate** | Step 0 of specification workflows (`create-prd-architecture`, `write-architecture-spec-design`, `write-fe-spec-classify`) | Before any skill reads | Guard spec authoring from unfilled stack placeholders |
| **Implementation-phase gate** | `/implement-slice-setup` Step -1 | Before any code is written | Guard code generation from broken agent context across all seven instruction files |

Both gates emit a **four-part hard stop message** per unfilled placeholder:

1. **Which exact `{{PLACEHOLDER}}` is unfilled** — the literal placeholder name
2. **Which pipeline stage fills it** — the `/create-prd-stack` decision that triggers bootstrap
3. **The exact recovery command** — e.g., `/bootstrap-agents` with `DATABASE=<your-db-choice>`
4. **The consequence of proceeding without it** — what downstream step would produce incorrect output

**Key constraint:** No auto-refire of bootstrap. The agent stops and tells the user exactly what to run.

For detailed per-workflow placeholder mappings and recovery commands, see `.agent/skills/session-continuity/protocols/10-placeholder-verification-gate.md`.

**Reference implementation:** `write-be-spec-classify.md` Step 2.5 is the canonical example of a correctly implemented placeholder guard.

### Implementation-Phase Placeholder Gate

Before any implementation begins, `/implement-slice-setup` (Step -1) scans all seven instruction files for unfilled `{{` patterns. If any are found, implementation stops with a specific remediation path per file. This gate is the last line of defense against broken agent context reaching the implementation phase.

---

## 4. Key Patterns

### Test-Driven Contract-First (CFPA)

The defining architectural pattern of the code produced by this kit.

1.  **Contract (Zod):** Define the schema first.
2.  **Tests (Failing):** Write tests that assert against the contract.
3.  **Implementation:** Write the code to make the tests pass.

*Never reverse this order.*

### Explicit Handoffs

Workflows are designed to end with explicit NEXT STEPS. An agent shouldn't guess what happens after `/ideate`; the workflow tells it to propose `/create-prd`. This ensures continuous, unbroken pipeline progression.

---

## 5. Kit Maintenance Checklist

**When a new workflow or shard is added to `.agent/workflows/`:**

- [ ] Add a row to the `AGENTS.md` Pipeline Workflow Table
- [ ] Add a matching row to the `GEMINI.md` Pipeline Workflow Table (must stay in sync with `AGENTS.md`)
- [ ] If the workflow introduces a new system component or new convention, update the relevant section of `KIT-ARCHITECTURE.md`
- [ ] If the workflow uses new prd-template reference files, add them to `prd-templates/SKILL.md`
- [ ] If the workflow introduces a new skill, add it to `.agent/skill-library/MANIFEST.md`

**When `bootstrap-agents-fill.md` fills a placeholder in `AGENTS.md` or `GEMINI.md`:**

- Bootstrap handles project-specific value substitution automatically
- Kit-level structural changes (new rows, new sections) require manual update per this checklist

**Note**: Both `AGENTS.md` and `GEMINI.md` are co-maintained: project-specific sections by `bootstrap-agents-fill.md` Step 4, and structural/workflow sections by this checklist.
