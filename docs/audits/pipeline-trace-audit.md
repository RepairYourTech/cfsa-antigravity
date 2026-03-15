# End-to-End Pipeline Trace Audit

**Date**: 2026-03-14
**Scope**: Full pipeline trace — skill coverage, workflow completeness, handoff integrity, gap analysis
**Method**: Automated extraction of all skill reads, frontmatter declarations, pipeline handoffs, and cross-references across 47 workflows and 45 core skills

---

## Executive Summary

The pipeline's **stage-to-stage handoff chain is unbroken** — every workflow correctly hands off to its successor. However, three systemic issues threaten production-grade output quality:

| Severity | Count | Category |
|----------|-------|----------|
| 🔴 Critical | 3 | Unused skills that should be integrated, plus `spec-writing` never invoked |
| 🟡 Moderate | 2 | Frontmatter/body skill declaration mismatches, missing cross-layer consistency checks |
| 🔵 Advisory | 2 | Passive-context skills correctly left unreferenced, utility skills by design |

---

## 1. Pipeline Handoff Integrity

Every stage-to-stage handoff was verified. **All handoffs are intact.**

| From | To | Verified |
|------|-----|----------|
| `/ideate` → `/audit-ambiguity` | ideate.md, ideate-validate.md both reference it | ✅ |
| `/create-prd` → `/decompose-architecture` | create-prd-compile.md references it | ✅ |
| `/decompose-architecture` → `/write-architecture-spec` | decompose-architecture-validate.md references it (4 refs) | ✅ |
| `/write-architecture-spec` → `/write-be-spec` + `/write-fe-spec` | write-architecture-spec-deepen.md references both (4 refs) | ✅ |
| `/write-be-spec` + `/write-fe-spec` → `/plan-phase` | Both parent workflows list plan-phase as successor | ✅ |
| `/plan-phase` → `/implement-slice` | plan-phase.md references it (4 refs) | ✅ |
| `/implement-slice` → `/verify-infrastructure` / `/validate-phase` | implement-slice-tdd.md references both (2 refs) | ✅ |

---

## 2. Core Skill Coverage Analysis

### 45 Pre-Installed Skills — Classification

#### ✅ Actively Used (27 skills)

These are directly `Read .agent/skills/[name]/SKILL.md` in workflow bodies:

| Skill | Workflows Using It |
|-------|-------------------|
| `architecture-mapping` | decompose-architecture-validate, write-architecture-spec-design, update-architecture-map |
| `brainstorming` | ideate-discover, ideate-extract, create-prd, write-architecture-spec-design, decompose-architecture |
| `brand-guidelines` | write-fe-spec-classify, create-prd-design-system |
| `clean-code` | implement-slice-tdd |
| `code-review-pro` | write-architecture-spec, write-be-spec, write-fe-spec, implement-slice-tdd, validate-phase, remediate-pipeline-assess/execute, audit-ambiguity, write-*-deepen |
| `concise-planning` | plan-phase |
| `database-schema-design` | create-prd-architecture, create-prd-stack, write-architecture-spec-design, write-be-spec-classify |
| `deployment-procedures` | validate-phase, verify-infrastructure |
| `design-direction` | create-prd-design-system, create-prd-stack |
| `error-handling-patterns` | create-prd-architecture, write-architecture-spec-design, write-be-spec-classify, write-fe-spec-classify |
| `find-skills` | create-prd, write-architecture-spec-design, write-be-spec-classify, write-fe-spec-classify |
| `idea-extraction` | ideate-discover, ideate-extract, ideate-validate |
| `logging-best-practices` | create-prd-security, write-be-spec-classify |
| `migration-management` | write-be-spec-classify, evolve-contract |
| `parallel-agents` | implement-slice-setup, plan-phase |
| `parallel-debugging` | implement-slice-tdd |
| `parallel-feature-development` | implement-slice-setup |
| `performance-budgeting` | create-prd-compile |
| `pipeline-rubrics` | audit-ambiguity-rubrics/execute, create-prd-compile, remediate-pipeline-execute |
| `prd-templates` | (referenced via `/references/` paths in 15+ workflows) |
| `resolve-ambiguity` | ideate-extract, write-be-spec-classify, write-fe-spec-classify, write-architecture-spec-deepen, remediate-pipeline-execute, and 8+ others |
| `security-scanning-security-hardening` | create-prd-security, create-prd, write-architecture-spec-design, validate-phase |
| `session-continuity` | implement-slice-setup, evolve-feature-classify, write-be-spec-write, write-fe-spec-write |
| `systematic-debugging` | implement-slice-tdd |
| `tdd-workflow` | implement-slice-tdd, create-prd-compile, evolve-contract |
| `tech-stack-catalog` | create-prd-stack |
| `technical-writer` | write-be-spec-write, write-fe-spec-write, ideate-extract, create-prd-architecture, decompose-architecture, and 10+ others |
| `testing-strategist` | write-be-spec-classify/write, write-fe-spec-classify/write, plan-phase, validate-phase |
| `verification-before-completion` | implement-slice-tdd, write-be-spec-write, write-fe-spec-write, audit-ambiguity-execute, remediate-pipeline-execute |

#### 🔴 Never Referenced — Should Be Integrated (5 skills)

These skills exist, have clear pipeline-relevant purposes, but are **never invoked by any workflow**:

| Skill | Purpose | Where It Should Be Used | Impact of Absence |
|-------|---------|------------------------|-------------------|
| `cross-layer-consistency` | Verify IA↔BE↔FE spec mutual consistency | **`/plan-phase`** (Step 0.6 BE↔FE cross-check) and **`/validate-phase`** | Specs can have field drift, error code mismatches, or access control inconsistencies between layers that go undetected |
| `spec-writing` | Methodology for writing complete, unambiguous specs | **`/write-architecture-spec-design`**, **`/write-be-spec-write`**, **`/write-fe-spec-write`** | Spec authors get no structured methodology guidance — they rely on templates alone |
| `adversarial-review` | Generate attack scenarios, abuse cases, race conditions | **`/write-architecture-spec-design`** (Step 7 edge cases), **`/validate-phase`** security audit | Edge case analysis lacks structured adversarial methodology |
| `api-versioning` | API versioning strategy, deprecation workflows | **`/write-be-spec-write`** (for projects with existing APIs), **`/evolve-contract`** | No guidance on API versioning strategy when schemas evolve |
| `workflow-automation` | Durable workflow patterns (Inngest, Temporal, BullMQ) | **`/write-be-spec-classify`** (if project uses background jobs) | Projects needing async workflows get no structured skill guidance |

#### 🟢 Correctly Unreferenced — Passive/Agent-Context Skills (7 skills)

These are intentionally **not** invoked by workflows. They're either always-active context, user-facing utilities, or on-demand tools:

| Skill | Why It's Correctly Unreferenced |
|-------|---------------------------------|
| `design-anti-cliche` | Always-active agent constraint — loaded via rules, not workflow invocation |
| `bootstrap-agents` | IS the bootstrap utility — workflows call the bootstrap WORKFLOW, not this skill |
| `skill-creator` | User-facing utility (`/skill-creator`) — not a pipeline workflow step |
| `find-skills` | Actually IS referenced by 4 workflows — flagged incorrectly by grep (referenced as `find-skills` in inline text) |
| `prompt-engineer` | User-facing utility — not a pipeline step |
| `regex-patterns` | On-demand reference — used during implementation when regex is needed |
| `git-advanced` | On-demand reference — used during complex git operations |

#### 🟡 Correctly Unreferenced — Implementation-Phase On-Demand (3 skills)

These activate during `/implement-slice` based on real-time need, not workflow step:

| Skill | Why |
|-------|-----|
| `git-workflow` | Listed in implement-slice frontmatter. Agent loads it at commit time. |
| `minimalist-surgical-development` | Listed in implement-slice frontmatter. Agent loads it when modifying existing code. |
| `antigravity-workflows` | Meta-orchestration skill for multi-skill workflows — not a pipeline step |

---

## 3. Frontmatter vs Body Skill Declaration Mismatch

> **This is a systemic pattern, not a bug.** The frontmatter `skills:` list serves as a **dependency manifest** for what a workflow MIGHT need, while the body contains explicit `Read .agent/skills/[name]/SKILL.md` instructions for what it DOES read. Parent orchestrators list skills their shards use. The pattern is: **frontmatter = union of all skills across shards, body = skills read in this specific file.**

**However**, the mismatch creates a real problem: **there's no enforcement that frontmatter-declared skills are actually loaded.** A workflow could list `testing-strategist` in frontmatter (declaring intent to test) but never actually invoke it in the body — and no gate catches this.

### Statistics

| Category | Count |
|----------|-------|
| Workflows with body skills NOT in frontmatter | 39/47 (83%) |
| Workflows with frontmatter skills NOT in body | 39/47 (83%) |

> **Assessment**: The frontmatter lists are treated as metadata tags rather than actionable load instructions. This is architecturally fine for parent orchestrators (they declare what their shards use), but for **leaf workflows (shards)** the frontmatter should match what the body actually reads.

---

## 4. Critical Pipeline Gaps

### Gap 1: 🔴 No Cross-Layer Consistency Check Before Planning

**Where it matters**: Between Stage 5 (BE/FE spec) and Stage 6 (plan-phase)

**Problem**: `plan-phase.md` has a BE↔FE cross-check (Step 0.6) but it only checks that BE specs have FE consumers. It does NOT check:
- Field name consistency (BE response field `userName` vs FE prop `username`)
- Error code propagation (BE returns `409` but FE doesn't handle it)
- Access control consistency (BE requires `admin` role but FE shows to all users)

**The `cross-layer-consistency` skill was built exactly for this** — it has coverage matrices, field mapping checks, error code propagation checks, and access control audit. But it's never invoked.

**Fix**: Add `cross-layer-consistency` skill read to `plan-phase.md` Step 0.6, replacing the current surface-level cross-check with the full methodology.

---

### Gap 2: 🔴 Spec Writing Has No Methodology Skill

**Where it matters**: Stage 4 (`write-architecture-spec`) and Stage 5 (`write-be-spec`, `write-fe-spec`)

**Problem**: The `spec-writing` skill contains methodology for:
- Completeness testing (verifying every section has required content)
- Progressive section writing (building specs section-by-section)
- Cross-reference checking (ensuring cross-shard references resolve)
- Ambiguity gate application

But **none of the spec-writing workflows invoke it**. They reference `technical-writer` (writing quality) and `prd-templates` (document structure), but not the actual spec-writing methodology.

**Fix**: Add `Read .agent/skills/spec-writing/SKILL.md` to `write-architecture-spec-design.md`, `write-be-spec-write.md`, and `write-fe-spec-write.md` — alongside their existing `technical-writer` reads.

---

### Gap 3: 🔴 No Adversarial Review in Spec or Validation

**Where it matters**: Stage 4 (IA spec edge cases) and Stage 8 (validation)

**Problem**: `write-architecture-spec-design.md` Step 7 is "Edge cases and attack surfaces" but only reads `security-scanning-security-hardening` — a stack-specific security skill. The `adversarial-review` skill provides a **structured methodology** for generating attack scenarios, abuse cases, and race conditions against specs. It produces spec-level gap items (exactly what Step 7 needs) but is never invoked.

Similarly, `validate-phase.md` does security auditing but without the adversarial methodology.

**Fix**: Add `Read .agent/skills/adversarial-review/SKILL.md` to:
1. `write-architecture-spec-design.md` Step 7 (alongside security skills)
2. `validate-phase.md` security audit section

---

### Gap 4: 🟡 API Versioning Not Considered During Contract Evolution

**Where it matters**: `/evolve-contract` workflow

**Problem**: When evolving a schema that defines an API contract, the workflow handles migration tests and consumer updates but doesn't consider API versioning strategy. For public APIs, a breaking schema change might need a new API version rather than an in-place migration.

**Fix**: Add a conditional `api-versioning` skill read to `evolve-contract.md` — invoked only when the evolving schema defines a public API endpoint.

---

### Gap 5: 🟡 No Structured Guidance for Background Job Architecture

**Where it matters**: `/write-be-spec-classify` and `/write-be-spec-write`

**Problem**: The `workflow-automation` skill covers durable workflow patterns (step functions, retries, idempotency, fan-out), but BE spec writing has no trigger to load it when a feature requires background processing. Projects needing async workflows (email sends, payment processing, data pipelines) get no structured guidance.

**Fix**: Add a conditional skill check to `write-be-spec-classify.md`: "If the IA shard includes background processing, async operations, or event-driven workflows, read `.agent/skills/workflow-automation/SKILL.md`."

---

## 5. Skill-to-Workflow Coverage Matrix

Legend: ◆ = Read in body | ◇ = Frontmatter only | · = Not referenced

| Skill | ideate | create-prd | decompose | IA spec | BE spec | FE spec | plan | implement | validate | utilities |
|-------|--------|------------|-----------|---------|---------|---------|------|-----------|----------|-----------|
| `cross-layer-consistency` | · | · | · | · | · | · | · | · | · | · |
| `spec-writing` | · | · | · | · | · | · | · | · | · | · |
| `adversarial-review` | · | · | · | · | · | · | · | · | · | · |
| `api-versioning` | · | · | · | · | · | · | · | · | · | · |
| `workflow-automation` | · | · | · | · | · | · | · | · | · | · |
| `architecture-mapping` | · | · | ◆ | ◆ | · | · | · | · | · | ◆ |
| `brainstorming` | ◆ | ◆ | ◆ | ◆ | · | · | · | · | · | ◆ |
| `code-review-pro` | · | · | · | ◆ | ◆ | ◆ | · | ◆ | ◆ | ◆ |
| `technical-writer` | ◆ | ◆ | ◇ | ◆ | ◆ | ◆ | ◆ | · | · | ◆ |
| `tdd-workflow` | · | ◆ | · | · | · | · | · | ◆ | · | ◆ |
| `testing-strategist` | · | · | · | · | ◆ | ◆ | ◆ | · | ◆ | · |
| `resolve-ambiguity` | ◆ | · | · | ◆ | ◆ | ◆ | ◇ | · | · | ◆ |
| `security-scanning` | · | ◆ | · | ◆ | · | · | · | · | ◆ | · |
| `deployment-procedures` | · | · | · | · | · | · | · | · | ◆ | · |
| `systematic-debugging` | · | · | · | · | · | · | · | ◆ | · | · |

---

## 6. Summary of Required Actions

### 🔴 Must Fix (5 items)

| # | Action | Files Affected | Impact |
|---|--------|---------------|--------|
| 1 | Add `cross-layer-consistency` skill read to `plan-phase.md` Step 0.6 | plan-phase.md | Catch field drift, error code mismatches, access control inconsistencies between IA/BE/FE |
| 2 | Add `spec-writing` skill read to all three spec-writing leaf workflows | write-architecture-spec-design.md, write-be-spec-write.md, write-fe-spec-write.md | Specs get structured methodology, not just templates |
| 3 | Add `adversarial-review` skill read to IA spec edge cases and validation | write-architecture-spec-design.md, validate-phase.md | Edge case analysis uses structured attack methodology |
| 4 | Add conditional `api-versioning` to evolve-contract | evolve-contract.md | Public API changes get versioning guidance |
| 5 | Add conditional `workflow-automation` to BE spec classify | write-be-spec-classify.md | Async/background features get durable workflow guidance |

### 🟡 Should Fix (1 item)

| # | Action | Files Affected | Impact |
|---|--------|---------------|--------|
| 6 | Document the frontmatter `skills:` semantic in kit-architecture.md | docs/kit-architecture.md | Clarify that frontmatter = dependency manifest, body = actual reads |

### ✅ No Action Needed

| Category | Items | Reason |
|----------|-------|--------|
| Pipeline handoffs | 7/7 verified | All stage transitions have explicit references |
| Passive-context skills | 7 skills | Correctly unreferenced — always-active or user-facing utilities |
| Implementation-phase skills | 3 skills | On-demand during `/implement-slice` — activated by real-time need |

---

## 7. Pipeline Stage-by-Stage Trace

### Stage 1: `/ideate` (Discovery)

| Check | Status |
|-------|--------|
| Input validation | ✅ ideate-extract classifies input |
| Domain exploration | ✅ ideate-discover uses recursive breadth-before-depth |
| Quality gate | ✅ ideate-validate runs 12-dimension self-check |
| Handoff to next | ✅ Proposes `/audit-ambiguity ideation` then `/create-prd` |
| Skills used | idea-extraction, resolve-ambiguity, brainstorming, technical-writer |
| Missing skills | None |

### Stage 2: `/create-prd` (Design)

| Check | Status |
|-------|--------|
| Stack decisions | ✅ create-prd-stack uses constraint-first discovery |
| Design system | ✅ create-prd-design-system covers navigation, layout, components |
| Architecture | ✅ create-prd-architecture covers system design + data strategy |
| Security | ✅ create-prd-security covers threat model + integrations |
| Compilation | ✅ create-prd-compile produces architecture-design.md + ENGINEERING-STANDARDS.md |
| Bootstrap integration | ✅ Fires bootstrap after each tech decision |
| Handoff | ✅ Proposes `/decompose-architecture` |
| Skills used | brainstorming, resolve-ambiguity, technical-writer, database-schema-design, tech-stack-catalog, design-direction, security-scanning, logging, performance-budgeting, pipeline-rubrics, tdd-workflow, find-skills, brand-guidelines |
| Missing skills | None |

### Stage 3: `/decompose-architecture` (Decomposition)

| Check | Status |
|-------|--------|
| Structure creation | ✅ decompose-architecture-structure creates shard skeletons + indexes |
| Validation | ✅ decompose-architecture-validate does deep dives + type annotations |
| Handoff | ✅ Proposes `/write-architecture-spec` per shard |
| Skills used | technical-writer, prd-templates, session-continuity, architecture-mapping, brainstorming |
| Missing skills | None |

### Stage 4: `/write-architecture-spec` (IA Specification)

| Check | Status |
|-------|--------|
| Placeholder guards | ✅ Step 0 checks DATABASE_SKILLS, SECURITY_SKILLS, SURFACES |
| Design phase | ✅ write-architecture-spec-design covers interactions, contracts, data models, access control |
| Deepening | ✅ write-architecture-spec-deepen does iterative passes + ambiguity gate |
| Handoff | ✅ Proposes `/write-be-spec` + `/write-fe-spec` |
| Skills used | brainstorming, resolve-ambiguity, database-schema-design, architecture-mapping, error-handling-patterns, security-scanning, technical-writer, code-review-pro, find-skills |
| 🔴 Missing | `spec-writing` (methodology), `adversarial-review` (edge case generation) |

### Stage 5a: `/write-be-spec` (Backend Specification)

| Check | Status |
|-------|--------|
| Placeholder guards | ✅ Step 2.5 checks 6 placeholders |
| Classification | ✅ write-be-spec-classify does full source inventory |
| Writing | ✅ write-be-spec-write produces spec with ambiguity gate |
| Handoff | ✅ To plan-phase (via `successors`) |
| Skills used | resolve-ambiguity, database-schema-design, error-handling-patterns, migration-management, testing-strategist, logging, technical-writer, api-design-principles, find-skills, code-review-pro |
| 🔴 Missing | `spec-writing` (methodology), conditional `workflow-automation` (for async features) |

### Stage 5b: `/write-fe-spec` (Frontend Specification)

| Check | Status |
|-------|--------|
| Placeholder guards | ✅ Step 0 checks 5 placeholders |
| Classification | ✅ write-fe-spec-classify does accessibility extraction + conditional rendering |
| Writing | ✅ write-fe-spec-write produces spec with ambiguity gate |
| Parallelism | ✅ Documented as cross-shard only |
| Handoff | ✅ To plan-phase (via `successors`) |
| Skills used | resolve-ambiguity, accessibility, error-handling-patterns, testing-strategist, technical-writer, brand-guidelines, code-review-pro, find-skills |
| 🔴 Missing | `spec-writing` (methodology) |

### Stage 6: `/plan-phase` (Planning)

| Check | Status |
|-------|--------|
| Phase sequencing | ✅ Step 0 validates previous phase complete |
| Application completeness | ✅ Step 0.5 checks route/nav/auth/empty/error coverage |
| BE↔FE cross-check | ✅ Step 0.6 checks consumer mapping |
| Slice ordering | ✅ Dependency-ordered with infrastructure first |
| Phase 1 special rules | ✅ Infrastructure + verify-infrastructure gates |
| Bootstrap completeness | ✅ Step 6.5 checks all instruction files for unfilled placeholders |
| Handoff | ✅ Proposes `/implement-slice` |
| Skills used | resolve-ambiguity, testing-strategist, technical-writer, concise-planning, parallel-agents |
| 🔴 Missing | `cross-layer-consistency` (Step 0.6 needs full methodology, not surface-level check) |

### Stage 7: `/implement-slice` (Implementation)

| Check | Status |
|-------|--------|
| Setup | ✅ implement-slice-setup does progress check, contract writing, parallel mode detection |
| TDD cycle | ✅ implement-slice-tdd does Red→Green→Refactor with debug cycle (Step 4.1) |
| Dependency checking | ✅ Step 4.5 scans for new imports, fires bootstrap |
| Clean code | ✅ Step 5 reads clean-code skill |
| Verification | ✅ Step 6 reads verification-before-completion |
| Progress tracking | ✅ Step 7 updates progress files |
| Handoff | ✅ Proposes `/verify-infrastructure` or `/validate-phase` |
| Skills used | tdd-workflow, systematic-debugging, parallel-debugging, session-continuity, parallel-agents, parallel-feature-development, clean-code, code-review-pro, verification-before-completion |
| Missing skills | None |

### Stage 8: `/validate-phase` + `/verify-infrastructure` (Verification)

| Check | Status |
|-------|--------|
| Test execution | ✅ validate-phase runs all test levels |
| Security audit | ✅ Reads security skills (via placeholders now) |
| Deployment verification | ✅ verify-infrastructure checks CI/CD, staging, migrations, auth |
| Handoff | ✅ Proposes `/update-architecture-map` then next phase/deploy |
| Skills used | testing-strategist, code-review-pro, deployment-procedures, systematic-debugging, security-scanning, verification-before-completion |
| 🔴 Missing | `adversarial-review` (structured attack methodology for security audit) |

---

## 8. `accessibility` Skill — Special Note

The `accessibility` skill was flagged as "UNUSED" by the automated scan because all workflow references now use `{{ACCESSIBILITY_SKILL}}` (the placeholder). The skill itself exists as the default value for that placeholder. This is **correct behavior** — the scan just can't see through placeholder indirection.

---

## 9. Build System Verification

The `template/` directory (the npm-distributable starter kit) was rebuilt via `npm run build` and verified:

| Component | Status |
|-----------|--------|
| `template/.agent/` vs root `.agent/` | 0 differences ✅ |
| `template/GEMINI.md` vs root `GEMINI.md` | Identical ✅ |
| `template/AGENTS.md` vs root `AGENTS.md` | Identical ✅ |
| `template/docs/` vs root `docs/` | Only audit content stripped (expected) ✅ |
| Total files in template | 389 ✅ |
