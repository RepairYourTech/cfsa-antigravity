# CFSA Antigravity - Architecture

**Purpose:** Provide a high-level map of the agentic machinery that powers CFSA Antigravity.

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
*   **Rules:** Preemptively loaded constraints that apply to *every* task. Includes security best practices (`security-first.md`), TDD mandates (`tdd-contract-first.md`), and vertical-slice enforcement (`vertical-slices.md`).
*   **Skills:** Modular capabilities (e.g., `technical-writer`, `brainstorming`). Agents load these explicitly when a task requires them, preventing context bloat.
*   **Workflows:** Step-by-step markdown checklists invoked via `/slash-commands` (e.g., `/create-prd`, `/implement-slice`). They chain skills together to achieve complex, multi-stage goals.

---

## 2. Ideation Architecture

The ideation layer is the pipeline's first output and the source of truth for all downstream specification work. It replaces the former monolithic `vision.md` approach with a sharded folder structure that scales with project complexity.

### Pipeline Key File

`docs/plans/ideation/ideation-index.md` is the **pipeline key file** — the primary entry point for all downstream workflows. When `/create-prd`, `/decompose-architecture`, or any specification workflow needs to understand the product, it reads `ideation-index.md` first, then follows links to relevant domain files for detail.

`docs/plans/vision.md` still exists but is a **human-readable executive summary** only — a sales pitch compiled from the ideation folder. No downstream workflow reads it as a data source.

### Folder Structure

```text
docs/plans/ideation/
├── ideation-index.md          # Pipeline key file — domain map, MoSCoW summary, coverage
├── domains/                   # One file per product domain
│   ├── user-management.md
│   ├── billing.md
│   └── ...
├── meta/                      # Structured metadata
│   ├── problem-statement.md
│   ├── personas.md
│   ├── constraints.md
│   └── competitive-landscape.md
└── cross-cuts/                # Cross-cutting concern tracking
    └── cross-cut-ledger.md
```

**Key properties:**
- **Shard-as-you-go**: Domain files are created the moment a domain is identified during exploration, not batched after all exploration is complete
- **Living documents**: Domain files and the index are updated in place as exploration deepens — they are never dated (see Dated File Convention below)
- **Downstream consumers**: `/create-prd` reads `ideation-index.md` + `meta/constraints.md`; `/decompose-architecture` reads `ideation-index.md` + domain files; specification workflows reference domain files for sub-feature detail

### Exploration Model

The `/ideate` workflow uses **recursive breadth-before-depth exploration**:

| Level | Scope | What happens |
|---|---|---|
| **Level 0** | Global domain map | Identify all top-level domains in the product. Each gets a file in `domains/`. |
| **Level 1** | Sub-area sweep per domain | For each domain, identify all sub-areas. Mark each with a depth status marker. |
| **Level 2+** | Vertical drilling | Drill into each sub-area until no new information emerges. Recursion: new domains discovered during drilling loop back to Level 0. |

Each domain file tracks its sub-areas with status markers:

| Marker | Meaning |
|---|---|
| `[SURFACE]` | Identified but unexplored |
| `[BREADTH]` | Sub-areas listed, not detailed |
| `[DEEP]` | Core logic, edge cases, interactions documented |
| `[EXHAUSTED]` | Deep Think yielded nothing new — domain complete |

A domain reaches `[EXHAUSTED]` only when the Deep Think protocol generates no new hypotheses.

### Deep Think Protocol

At every exploration level, the agent actively generates hypotheses:

> *"Based on [industry knowledge / domain patterns / cross-domain interaction], I'd expect [feature/concern/edge case]. Is that relevant to your product?"*

Hypotheses are tracked in domain files with resolution status (confirmed/rejected/deferred). This prevents shallow exploration — the agent doesn't just record what the user says, it actively probes for what the user hasn't mentioned yet.

### Cross-Cut Ledger

Cross-cutting concerns (security, notifications, analytics, error handling, etc.) are tracked continuously in `cross-cuts/cross-cut-ledger.md` as they're discovered at any level, not batched into a separate pass. Each entry includes:
- Which domains are involved
- Confidence level (increases as exploration deepens)
- Resolution status

---

## 3. Data Flow & State Management

Agents are inherently stateless across conversations. The kit uses the **Session Continuity** protocol to provide a persistent memory system.

### The `.agent/progress/` Directory

This directory acts as the agent's long-term and working memory.

```text
.agent/progress/
├── index.md                      # Master checklist — phases + overall %
├── spec-pipeline.md              # Spec completion tracker (IA/BE/FE per shard)
├── phases/
│   └── phase-NN.md               # Per-phase slice checklist
├── slices/
│   └── phase-NN-slice-NN.md      # Per-slice log (only if ≥3 acceptance criteria)
├── sessions/
│   └── YYYY-MM-DD.md             # Session log for resumption
└── memory/
    ├── patterns.md
    ├── blockers.md
    └── decisions.md
```

> **Adaptive Granularity Rule**: A slice gets its own file in `slices/` only when it has ≥3 acceptance criteria. Slices with 1–2 criteria are tracked inline in the phase file. This prevents file explosion for simple specs while giving granular tracking for complex ones.

> **Runtime vs. pre-shipped files**: The `phases/`, `slices/`, and `sessions/` directories and their contents are created at runtime by `/plan-phase` (Protocol 2: Progress Generation) and `/implement-slice` (Protocol 3: Progress Update). They do not ship pre-created. The only files that ship as part of the kit in `memory/` are the three empty seed files (`patterns.md`, `blockers.md`, `decisions.md`).

### Flow

1.  **Resume**: On session start, workflows invoke Session Resumption (Protocol 1) — read `index.md` for overall status, find the latest `sessions/YYYY-MM-DD.md` log, check `memory/blockers.md` for unresolved blockers.
2.  **Act**: The agent executes the workflow against the phase plan in `phases/phase-NN.md`.
3.  **Persist**: At implementation checkpoints (Protocol 3: Progress Update via `/implement-slice`), the agent marks criteria `[x]`, updates phase progress, and logs findings into `memory/patterns.md`, `decisions.md`, and `blockers.md`.
4.  **Close**: At session end, the agent writes `sessions/YYYY-MM-DD.md` (Protocol 5: Session Close) to enable clean resumption next session.

### Cross-references

- **Dated File Convention** — See below in this section (Section 2) — governs which artifact paths use glob patterns vs. hardcoded names.
- **Placeholder Verification Gate Protocol** — See Section 4.5 — governs the Step 0 guard that prevents workflows from reading `{{PLACEHOLDER}}`-dependent skills before bootstrap has run.
- **Kit Maintenance Checklist** — See Section 6 — governs what must be updated when new workflows or skills are added.
- **Surface Model** — `.agent/skills/prd-templates/references/surface-model.md` — The authoritative reference for surface types (web/mobile/cli/etc.) and implementation layers, and how the two models relate.

### Dated File Convention

A document is dated (prefixed with `YYYY-MM-DD-`) if and only if it is a **compiled artifact** — one that can be superseded by a newer version and both versions might need to coexist temporarily. Living documents that are updated in place are never dated.

| Document | Dated? | Rationale |
|---|---|---|
| `architecture-design.md` | ✅ Yes | Can be re-run with new stack; old version referenced during migration |
| `ideation-index.md` | ❌ No | Living document — updated throughout ideation, not a dated compilation |
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

## 4. Module Relationships

The power of the kit comes from how these modules interact:

*   **Workflows call Skills:** A workflow like `/create-prd` will explicitly instruct the agent to use the `technical-writer` and `brainstorming` skills.
*   **Rules constrain Workflows:** While a workflow dictates the *steps*, the rules dictate *how* those steps are performed (e.g., `/implement-slice` must obey `tdd-contract-first.md`).
*   **State informs Execution:** Workflows read from `.agent/progress/` to contextualize their execution based on past decisions and current active phases.

---

## 4.5. Bootstrap System

The bootstrap system transforms the kit from a generic template into a project-specific configuration. It runs as a utility workflow called by other pipeline workflows — never directly by the user.

### Components

*   **`bootstrap-agents-fill`**: Receives template key-value pairs and fills `{{PLACEHOLDER}}` markers across all instruction files and root agent config files (`AGENTS.md`, `GEMINI.md`). Idempotent — only fills what's provided, leaves other placeholders untouched.
*   **`bootstrap-agents-provision`**: Reads the skill library manifest, copies matching skills from `.agent/skill-library/` into `.agent/skills/`, fills skill-specific placeholders, composes `FRAMEWORK_PATTERNS` from the installed frontend framework skill, and updates the installed skills list in all root config files.

### Invocation Model

Bootstrap fires **progressively** — once per confirmed tech decision during `/create-prd-stack`, not in a batch at the end:

1. **Database confirmed** → fills DB placeholders (`DATABASE`, `ORM`, etc.) + provisions database skill from `.agent/skill-library/` (e.g., `stack/databases/surrealdb-expert`, `stack/databases/postgresql-patterns`)
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

## 5. Key Patterns

### Test-Driven Contract-First (CFPA)

The defining architectural pattern of the code produced by this kit.

1.  **Contract (Zod):** Define the schema first.
2.  **Tests (Failing):** Write tests that assert against the contract.
3.  **Implementation:** Write the code to make the tests pass.

*Never reverse this order.*

### Explicit Handoffs

Workflows are designed to end with explicit NEXT STEPS. An agent shouldn't guess what happens after `/ideate`; the workflow tells it to propose `/create-prd`. This ensures continuous, unbroken pipeline progression.

---

## 6. Kit Maintenance Checklist

**When a new workflow or shard is added to `.agent/workflows/`:**

- [ ] Add a row to the `AGENTS.md` Pipeline Workflow Table
- [ ] Add a matching row to the `GEMINI.md` Pipeline Workflow Table (must stay in sync with `AGENTS.md`)
- [ ] If the workflow introduces a new system component or new convention, update the relevant section of `docs/kit-architecture.md`
- [ ] If the workflow uses new prd-template reference files, add them to `prd-templates/SKILL.md`
- [ ] If the workflow introduces a new skill, add it to `.agent/skill-library/MANIFEST.md`

**When adding a `{{PLACEHOLDER}}` to any `.agent/rules/*.md`**

- [ ] Add the placeholder name and the rule file it lives in to the "Currently applicable" note in `bootstrap-agents-fill.md` Step 3 (the rules scan step)
- [ ] Add the corresponding bootstrap key to the `bootstrap-agents-fill.md` Step 1 key table if it doesn't already exist

**When `bootstrap-agents-fill.md` fills a placeholder in `AGENTS.md` or `GEMINI.md`:**

- Bootstrap handles project-specific value substitution automatically
- Kit-level structural changes (new rows, new sections) require manual update per this checklist

**Note**: Both `AGENTS.md` and `GEMINI.md` are co-maintained: project-specific sections by `bootstrap-agents-fill.md` Step 4, and structural/workflow sections by this checklist.

---

## 7. Git Integration

### Excluding `.agent/` from Git Without `.gitignore`

The `.agent/` directory should be indexed by the IDE (for agent context loading) but excluded from version control. Instead of adding it to `.gitignore` (which affects all contributors and may conflict with other entries), use the repository-local exclude file:

```bash
echo '.agent/' >> .git/info/exclude
```

**Why this matters:**
- `.git/info/exclude` is local to your clone — it won't appear in diffs or affect collaborators
- The IDE still sees and indexes `.agent/` for full agent functionality
- No `.gitignore` pollution or merge conflicts from differing agent setups
- Each developer can manage their own agent directory independently

> **Note:** If the project *ships* with `.agent/` as part of the kit (like this starter), you may want `.agent/` tracked in Git. In that case, use `.git/info/exclude` only for runtime-generated files like `.agent/progress/sessions/` and `.agent/progress/slices/`.
