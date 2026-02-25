---
description: Expand vision into full architecture design document — tech stack decisions, system design, data strategy, security model
pipeline:
  position: 2
  stage: architecture
  predecessors: [ideate]
  successors: [decompose-architecture]
  skills: [brainstorming, resolve-ambiguity, technical-writer, database-schema-design]
  calls-bootstrap: true # tech stack decisions trigger skill provisioning
---

// turbo-all

# Create PRD / Architecture Design

Transform `vision.md` into a production-grade architecture design document with explicit decisions on every axis.

**Input**: `docs/plans/vision.md` (must exist and be approved)
**Output**: `docs/plans/YYYY-MM-DD-architecture-design.md` + `docs/plans/ENGINEERING-STANDARDS.md` + `docs/plans/data-placement-strategy.md`

> **Depth standard**: Every section of the architecture document must be specified
> to the point where a developer cannot misinterpret it. If you can write a
> one-paragraph section summary, it's not detailed enough. Each section should
> define every field, every flow, every error case, every permission boundary.
> The depth-standards rule (`.agent/rules/depth-standards.md`) applies to every
> word of the output. One-line placeholders like `[Auth, authorization, rate limits]`
> are not architecture — they are headings waiting for content.

---

## 1. Read vision document

Read `docs/plans/vision.md`.

If the file doesn't exist, tell the user to run `/ideate` first. Do not proceed without an approved vision.

Pay special attention to the **Project Surfaces** section — it determines which tech stack axes apply and whether this is a single-surface or multi-surface project.

---

## 2. Load skills

### Bundled skills

These skills are included in the kit — read each SKILL.md:
1. `.agent/skills/rest-api-design/SKILL.md` — API conventions
2. `.agent/skills/api-design-principles/SKILL.md` — API design principles
3. `.agent/skills/security-scanning-security-hardening/SKILL.md` — Security model
4. `.agent/skills/clean-code/SKILL.md` — Architecture principles
5. `.agent/skills/brainstorming/SKILL.md` — For collaborative decisions

### Stack-specific skill discovery

Check `.agent/skills/` for relevant skills. Read `.agent/skills/find-skills/SKILL.md` for guidance on discovering community skills for your chosen stack.

---

## 2.5. Constraint-first discovery

Before any tech stack decision, read `vision.md` constraints and surface classification to build the **decision constraints map**:

1. **Hard constraints** — decisions already locked by compliance, team, or budget:
   - Compliance (COPPA, PCI, HIPAA, etc.) may eliminate certain providers
   - Team size/expertise may rule out unfamiliar stacks
   - Budget may eliminate paid services
   - Existing infrastructure may dictate hosting/provider choices

2. **Surface constraints** — the project surfaces from vision.md constrain framework choices:
   - Desktop surface → eliminates pure-web frameworks, adds distribution decisions
   - Mobile surface → eliminates desktop-only frameworks, adds app store decisions
   - Multi-surface → adds shared contract layer, sync strategy decisions

3. **Soft constraints** — preferences that should bias decisions but aren't hard rules:
   - Performance requirements may favor certain runtimes
   - Developer experience preferences from the user

Present the constraints map to the user before starting tech decisions. Constraints narrow the option space — some decisions may now be obvious or have only one viable option. Skip those decisions with a brief rationale instead of presenting unnecessary choices.

### Constraint question table

For each applicable axis, ask these constraint questions first to filter the option space:

| Axis | Constraint Questions |
|------|---------------------|
| **Hosting** | Is there an existing cloud provider? Budget ceiling per month? Compliance requirements (data residency, SOC2)? Team familiarity? |
| **Database** | Expected data volume? Read/write ratio? Need for graph/document/relational? Existing database expertise? Multi-tenancy requirements? |
| **Auth** | Social login required? SSO/SAML needed? Age verification? Compliance (COPPA, GDPR)? Budget for auth provider? |
| **Frontend framework** | SSR required for SEO? Static site sufficient? Interactive app needs? Team framework experience? |
| **Backend runtime** | Latency requirements? Cold start tolerance? Existing language expertise? Deployment target (edge, server, serverless)? |
| **CI/CD** | Existing CI provider? Monorepo or polyrepo? Deployment frequency? Manual approval gates needed? |

## 3. Tech stack decisions

Read the **Project Surfaces** section from `vision.md` to determine which decision axes apply.

For each applicable axis, filter options using the constraints from Step 2.5, then present up to 5 viable options plus a Hybrid in the following format:

| # | Option | Strengths | Risks | Fit |
|---|--------|-----------|-------|-----|
| 1 | [Option A] | ... | ... | [score /5] |
| 2 | [Option B] | ... | ... | [score /5] |
| 3 | [Option C] | ... | ... | [score /5] |
| 4 | [Option D] | ... | ... | [score /5] |
| 5 | [Option E] | ... | ... | [score /5] |
| H | **Hybrid** | [Combine elements from above] | ... | [score /5] |

> **Recommendation**: Based on constraints [list matched constraints], **Option [N]** scores highest because [rationale]. Confirm or choose differently.

Score Fit from 1–5 based on how well the option matches the constraints map from Step 2.5. If constraints eliminate all but 1-2 options, present only those with a note explaining why others were eliminated.

Always include a Hybrid option where it meaningfully differs from the pure options. Omit it when the Hybrid would be identical to one of the pure options.

**Per-axis flow**:
1. Ask the constraint questions for this axis
2. Filter options based on answers
3. Present the filtered option table with recommendation
4. Wait for user confirmation
5. Fire bootstrap with only that key: read `.agent/workflows/bootstrap-agents.md` and call with `PIPELINE_STAGE=create-prd` + the confirmed key (e.g., `DATABASE=SurrealDB`)
6. Move to next axis

Get explicit user decisions — no "TBD" allowed.

Use the brainstorming skill's approach — one decision at a time, present trade-offs, get confirmation.

### Universal decisions (all project types)

| Axis | Decision Needed |
|------|----------------|
| **Primary language(s)** | TypeScript, Rust, Go, Python, Swift, Kotlin, C++, etc. |
| **Database** | SQL vs NoSQL vs multi-model vs embedded (SQLite), hosted vs self-managed |
| **Auth provider** | Firebase vs Auth0 vs Clerk vs custom vs OS-level keychain |
| **CI/CD** | GitHub Actions vs GitLab CI vs custom |
| **Monitoring** | Sentry vs Datadog vs custom |

### Web surface decisions (if project has web surfaces)

| Axis | Decision Needed |
|------|----------------|
| **Frontend framework** | SSR vs SSG vs hybrid, which framework (Next.js, Astro, SvelteKit, etc.) |
| **Backend runtime** | Edge workers vs traditional server vs serverless |
| **Hosting** | Cloudflare vs Vercel vs AWS vs self-hosted |
| **CDN/Assets** | Provider-native vs S3 vs Cloudinary |

### Desktop surface decisions (if project has desktop surfaces)

| Axis | Decision Needed |
|------|----------------|
| **UI framework** | Tauri vs Electron vs native (GTK, Qt, SwiftUI, WPF, WinUI) |
| **Cross-platform strategy** | Single OS, cross-platform with shared UI (Tauri, Electron, Flutter Desktop), or cross-platform with native UI per OS |
| **Local data storage** | SQLite vs LevelDB vs filesystem vs embedded DB (RocksDB, etc.) |
| **Distribution** | Installer type (MSI, DMG, AppImage, Flatpak), auto-updater strategy (Sparkle, squirrel, custom) |
| **OS targets** | Windows, macOS, Linux — which combinations and minimum versions? |

### Mobile surface decisions (if project has mobile surfaces)

| Axis | Decision Needed |
|------|----------------|
| **Framework** | Native per-platform (Swift/Kotlin) vs cross-platform (React Native, Flutter, .NET MAUI, Kotlin Multiplatform) |
| **Cross-platform strategy** | iOS-only, Android-only, or both? Shared codebase or separate? |
| **Local data storage** | SQLite, Realm, Core Data, Room |
| **Distribution** | App Store, Play Store, enterprise sideload, TestFlight/Firebase App Distribution |
| **OS targets** | iOS minimum version, Android minimum API level |

### Desktop + Mobile shared decisions (if surfaces share a codebase)

Some frameworks support building for **both** desktop and mobile from one codebase. If the vision indicates this is desired:

| Axis | Decision Needed |
|------|----------------|
| **Shared framework** | Flutter (desktop + mobile + web), Kotlin Multiplatform, .NET MAUI, Compose Multiplatform |
| **Shared vs platform-specific UI** | Fully shared UI, shared logic with native UI per platform, or hybrid? |
| **Platform-specific features** | What functionality requires native code per platform? (file system, notifications, hardware access) |

### CLI surface decisions (if project has CLI surfaces)

| Axis | Decision Needed |
|------|----------------|
| **Language** | Rust (clap), Go (cobra), Python (click/typer), Node (commander/yargs) |
| **Distribution** | npm, cargo, homebrew, apt, binary releases (goreleaser, cross) |
| **Shell integration** | Tab completions, man pages, config file format (TOML, YAML, JSON) |

### Multi-surface connection decisions (if project has 2+ connected surfaces)

| Axis | Decision Needed |
|------|----------------|
| **Shared API protocol** | REST vs gRPC vs GraphQL vs WebSocket between surfaces |
| **Sync strategy** | Real-time (WebSocket/SSE), eventual consistency (message queue), batch (cron), offline-first (CRDT/merge) |
| **Shared contract layer** | How are data shapes shared? Monorepo with shared package? Published npm/crate package? Code generation from OpenAPI/protobuf? |
| **Auth federation** | Shared auth server with SSO? OAuth2 token exchange? Separate auth per surface? |
| **Conflict resolution** | Last-write-wins, operational transform, CRDT, manual resolution, server-authoritative |
| **Offline support** | Which surfaces work offline? What data is cached locally? How are conflicts resolved on reconnect? |

### Development tooling

As part of tech stack decisions, also confirm:

| Tool | Question |
|------|----------|
| **Package manager / build system** | pnpm, npm, yarn, bun, cargo, go modules, pip/poetry? |
| **Test runner** | Vitest, Jest, pytest, cargo test, go test, XCTest? |
| **Linter** | ESLint, Biome, Ruff, clippy, golangci-lint? |
| **Type checker** | TypeScript (tsc), mypy, Rust compiler, Go compiler? |
| **Build command** | What builds the project for production? |

Derive the validation command from these answers:
```
{{BUILD_TOOL}} test && {{BUILD_TOOL}} lint && {{BUILD_TOOL}} type-check && {{BUILD_TOOL}} build
```

### After each tech decision

Read each installed skill's SKILL.md before proceeding. At minimum, load:
- API design skill (REST or GraphQL patterns)
- Security skill (if installed)
- Any framework-specific skills (if already known)

### Fill kit templates (progressive bootstrap)

Read `.agent/workflows/bootstrap-agents.md` and call it with `PIPELINE_STAGE=create-prd` plus only the keys just decided. Bootstrap runs after **each confirmed decision**, not in a batch at the end. This means:

- After confirming `DATABASE=SurrealDB`, call bootstrap with just that key
- After confirming `FRONTEND_FRAMEWORK=Astro`, call bootstrap with just that key
- Each invocation fills the relevant placeholders and provisions the matching skills
- At the end of all tech decisions, call bootstrap once more with `ARCHITECTURE_DOC` set to the dated filename

## 4. System architecture

Design the high-level system. Each sub-item requires full exploration, not a summary sentence:

1. **Component diagram** — What services exist? How do they communicate? What protocols? What happens if one is down?
2. **Data flow** — Request lifecycle from client to database and back. Every hop, every transformation, every auth check along the way. Draw the full sequence.
3. **Deployment topology** — What runs where? Edge? Origin? External? Local machine? App Store? What are the latency implications? What are the cost implications?
4. **API surface** — REST? GraphQL? RPC? Versioning strategy? Error format? Pagination? Rate limit headers?

For multi-surface projects, additionally define:
5. **Surface interconnection** — How do surfaces communicate? What is the source of truth for shared data? What happens when a surface is offline?
6. **Shared domain boundary** — Which entities/models are shared across surfaces vs surface-specific?

For each component, also define:
- What it owns (data, logic, auth decisions)
- What it delegates (to other components or external services)
- What happens when it fails (graceful degradation, circuit breakers, fallbacks)

**Present to user**: Show the system architecture section and walk through each component. Ask:
- "Does this component diagram capture every service in the system?"
- "Are there failure modes I haven't accounted for?"
- For multi-surface: "What happens if the sync layer goes down? Can each surface degrade gracefully?"

Refine based on discussion before proceeding.

## 5. Data strategy

Using `{{DATABASE_SKILL}}`. Each sub-item must be explored to field-level depth:

1. **Data placement** — What lives in the database vs cache vs object storage vs external service vs local device storage? For each entity: which service owns it and why
2. **Schema approach** — Strict schema vs schemaless vs hybrid? Field types, constraints, indexes, relations with cardinality
3. **Query patterns** — Read-heavy? Write-heavy? What are the hot paths? What needs caching? What are the N+1 risks?
4. **Migration strategy** — How will schema evolve? Backward compatibility approach? Zero-downtime migration plan?
5. **PII boundaries** — Which fields contain PII? Where is PII stored vs where is it NOT stored? How is PII isolated from AI/analytics pipelines?

For multi-surface projects, additionally define:
6. **Data ownership** — Which surface is the source of truth for each entity? How are conflicts resolved?
7. **Sync protocol** — What data syncs between surfaces? How frequently? What happens during network partition?

**Present to user**: Show the data strategy section and walk through placement decisions. Ask:
- "Does every entity have a clear owner?"
- "Are there query patterns I'm missing that could become hot paths?"

Refine based on discussion before proceeding.

### Data placement strategy document

Extract the data placement decisions into a standalone reference:

Create `docs/plans/data-placement-strategy.md` with the following required sections:

```markdown
# Data Placement Strategy

## N-Tier Model Responsibilities

Define each tier in the system and what it is responsible for:

| Tier | Responsibility | Examples |
|------|---------------|----------|
| [Client / Edge / API / Database / Cache / Object Storage / External Service] | [What this tier owns and manages] | [Specific technologies] |

## Complete Data Placement Map

For every data type in the system, specify its canonical owner:

| Data Type | Canonical Owner | Stored Content | Encryption | Rationale |
|-----------|----------------|----------------|------------|-----------|
| [e.g., User profile] | [e.g., Database] | [Fields stored] | [at-rest / in-transit / both / none] | [Why this placement] |
| [e.g., Session tokens] | [e.g., Cache] | [Token data] | [encryption approach] | [Why this placement] |
| [e.g., Uploaded files] | [e.g., Object storage] | [File content + metadata] | [encryption approach] | [Why this placement] |

## Security Boundaries

For each tier, explicitly state what it stores AND what it does NOT store:

| Tier | Stores | Does NOT Store |
|------|--------|---------------|
| [Client] | [e.g., UI state, cached display data] | [e.g., raw PII, API secrets, decryption keys] |
| [Edge/CDN] | [e.g., static assets, cached public responses] | [e.g., user-specific data, PII] |
| [API Server] | [e.g., request context, short-lived auth tokens] | [e.g., persistent user data, raw credentials] |
| [Database] | [e.g., user records, PII (encrypted)] | [e.g., API secrets, session tokens] |
| [Cache] | [e.g., computed values, session data] | [e.g., PII, source-of-truth records] |

## PII Boundaries

- Which fields contain PII (enumerate every one)
- Where PII is stored vs where it is NOT stored
- How PII is isolated from AI/analytics pipelines
- PII access logging requirements

## GDPR/Compliance Data Lifecycle

| Data Category | Retention Period | Deletion Trigger | Deletion Responsibility | Verification |
|--------------|-----------------|-----------------|------------------------|-------------|
| [e.g., Account data] | [e.g., Account lifetime + 30 days] | [e.g., Account deletion request] | [e.g., API server → database cascade] | [How deletion is verified] |
| [e.g., Usage analytics] | [e.g., 90 days] | [e.g., TTL expiry] | [e.g., Database auto-purge] | [How deletion is verified] |

## Tenancy Model

[Single-tenant / Multi-tenant / Hybrid]
- Isolation mechanism: [e.g., row-level security, schema-per-tenant, database-per-tenant]
- Data co-mingling rules: [What data is shared vs isolated]
- Cross-tenant query prevention: [How enforced]

## Sync Protocol (multi-surface only)

- What data syncs between surfaces
- Sync frequency and mechanism
- Conflict resolution strategy
- Network partition behavior

## Summary Table

| Layer | Stores | Does NOT Store |
|-------|--------|---------------|
| [Layer 1] | [List] | [List] |
| [Layer 2] | [List] | [List] |
```

This document is consumed by `/write-be-spec` and `/write-architecture-spec` to ensure every spec places data consistently.

## 6. Security model

Using `{{AUTH_SKILL}}`:

1. **Authentication** — How do users prove identity?
2. **Authorization** — RBAC vs ABAC? Permission model?
3. **Data protection** — PII handling, encryption at rest/transit
4. **Input validation** — Where and how? (Zod recommended for TypeScript)
5. **Age restrictions** — If applicable: age verification model
6. **Rate limiting** — Per-route? Per-user? Per-IP?
7. **CSP/CORS** — Content Security Policy, allowed origins (web surfaces)
8. **Code signing** — App signing certificates, notarization (desktop/mobile surfaces)

### Compliance escalation

If any compliance constraint from `vision.md` involves **minors, payments, health data, or government-regulated domains**, it is NOT a sub-bullet — it becomes its own top-level section in the architecture document with the same depth as System Architecture. For example:

- **Minors/COPPA/age-gating** → requires: account type hierarchy, consent flows, content filtering architecture, Guardian oversight model, age verification mechanism, blocked content categories, notification system for filter triggers
- **Payments/PCI** → requires: token handling architecture, PCI scope boundaries, payment name verification, refund flows, dispute handling
- **Health data/HIPAA** → requires: PHI isolation boundaries, audit logging, access controls, breach notification procedures

Each of these must be specified with the same depth as any other architectural component — field-level detail, flow diagrams, error cases, and permission boundaries. A single bullet saying "age verification model" is not architecture.

**Present to user**: Show the security model and any compliance sections. Walk through each flow step by step. Ask:
- "Can you think of a way to bypass any of these controls?"
- "Are there edge cases in the age/payment/compliance flows I haven't covered?"

Refine based on discussion before proceeding.

## 7. Integration points

For each external service:

1. **What it provides** — Specific features used
2. **Failure mode** — What happens when it's down?
3. **Fallback strategy** — Graceful degradation plan
4. **Cost model** — Pricing tier, expected usage

## 8. Development methodology

Document the agreed approach:

1. **Contract-first** — Zod schemas (or equivalent) before implementation
2. **TDD** — Failing tests before code
3. **Vertical slices** — All surfaces per feature
4. **Spec layers** — IA → BE → FE pipeline
5. **Quality gates** — What must pass before merge

## 9. Phasing strategy

Break the feature inventory from `vision.md` into dependency-ordered phases.

> **This kit does not build MVPs.** Every phase ships production-grade code —
> fully tested, fully specified, fully accessible. Phases exist to manage
> dependency order and incremental delivery, not to defer quality.

1. **Phase 1 (Foundation)** — Infrastructure + core entities. Must-haves that
   everything else depends on. Production-grade from day one.
2. **Phase 2 (Core Experience)** — Primary user flows built on the foundation.
   No shortcuts — same quality bar as Phase 1.
3. **Phase 3+ (Expansion)** — Additional features, integrations, scale.
   Same standards. Never "clean up later."

For multi-surface projects, consider whether phases are **per-surface** (build desktop first, then web) or **cross-surface** (build shared auth across both, then features across both). The decision depends on whether surfaces have independent value.

Each phase should have a rough timeline estimate. Every phase must pass the
full validation suite before the next phase begins.

**Present to user**: Show the phasing breakdown. Walk through the dependency order. Ask:
- "Are there features in Phase 2 that actually depend on something not in Phase 1?"
- "Is the Phase 1 scope achievable without cutting quality?"

Refine based on discussion before proceeding.

## 10. Compile architecture design document

Create `docs/plans/YYYY-MM-DD-architecture-design.md` (use today's date) with:

> **Template depth rule**: The section descriptions below are MINIMUM headings, not
> maximum content. Each section must contain the full detail gathered during steps
> 3-9 — every decision with rationale, every flow with steps, every error case
> with handling. If a section is under 200 words, it's almost certainly too shallow.
> The depth-standards rule applies: could a developer interpret this two different
> ways? If yes, add more detail.

```markdown
# [Project Name] — Architecture Design

> **Vision**: [link to vision.md]
> **Date**: YYYY-MM-DD
> **Status**: Draft | Review | Approved
> **Project Type**: [Single-surface: web/desktop/mobile/CLI/API | Multi-surface: list surfaces]

## Tech Stack
[Explicit decision for each applicable axis with rationale — not just the choice,
but WHY this choice over alternatives, what trade-offs were accepted, and what
constraints drove the decision. For multi-surface projects, organized by surface.]

## System Architecture
[Component diagram, data flow, deployment topology — every service named, every
communication path documented, every failure mode identified. For multi-surface:
include surface interconnection diagram and shared domain boundary.]

## Data Strategy
[Placement, schema design, query patterns, migrations — which data lives where
and why, what the hot paths are, how schema evolves. For multi-surface: data
ownership, sync protocol, conflict resolution.]

## Security Model
[Auth, authorization, validation, rate limits — every flow specified step-by-step,
every permission rule scoped, every error case handled]

## Compliance & Safety
[If applicable — full depth on minors/payments/health/regulated domains.
This section may be the largest in the document if compliance constraints
are significant. Every account type, every consent flow, every content filter,
every notification trigger, every audit requirement.]

## API Design
[Surface type, versioning, conventions — endpoint naming, request/response shapes,
error format, pagination strategy. For multi-surface: shared API contract format.]

## Integration Points
[External services, failure modes, fallbacks, cost models — for each: what it
provides, what happens when it's down, what the fallback is]

## Development Methodology
[Contract-first, TDD, vertical slices, spec layers, quality gates — the full
process, not just labels]

## Phasing
[Phase breakdown with feature allocation, dependency order, and timeline estimates.
Each phase has explicit entry/exit criteria. For multi-surface: per-surface or
cross-surface phasing strategy.]

## Installed Skills
[List of skills installed during this workflow with versions]

## Decisions Log
[Every decision made during this workflow with rationale — not just what was
decided, but what alternatives were considered and why they were rejected]

## Open Questions
[Anything needing resolution before decomposition — with owner and deadline]
```

## 11. Compile Engineering Standards

Create `docs/plans/ENGINEERING-STANDARDS.md` — the non-negotiable quality bar for the project.

This document codifies every quality decision from the architecture design into enforceable thresholds. It is referenced by `AGENTS.md`, `.agent/instructions/workflow.md`, and `.agent/instructions/structure.md` — agents will refuse to mark work complete if it violates these standards.

```markdown
# [Project Name] — Engineering Standards

> **Architecture**: [link to architecture-design.md]
> **Date**: YYYY-MM-DD
> **Status**: Draft | Review | Approved

## Test Coverage
- Minimum unit test coverage: [e.g., 80%]
- Integration test requirement: [e.g., every API endpoint]
- E2E test requirement: [e.g., every critical user flow]
- Coverage tool: [e.g., vitest coverage-v8]

## Linting & Formatting
- Linter: [e.g., ESLint with strict config]
- Formatter: [e.g., Prettier]
- Type checker: [e.g., TypeScript strict mode]
- Pre-commit hooks: [yes/no, tool]

## Performance Budgets

### Web surfaces (if applicable)
- LCP target: [e.g., < 2.5s]
- FID target: [e.g., < 100ms]
- CLS target: [e.g., < 0.1]
- Bundle size limit: [e.g., < 200KB initial JS]

### Desktop surfaces (if applicable)
- Cold start target: [e.g., < 2s]
- Memory ceiling: [e.g., < 200MB idle, < 500MB active]
- Installer size: [e.g., < 100MB]

### Mobile surfaces (if applicable)
- App launch target: [e.g., < 1.5s cold, < 0.5s warm]
- Battery impact: [e.g., < 5% per hour active use]
- App download size: [e.g., < 50MB]

### API / shared services
- API response time: [e.g., p95 < 500ms]
- Throughput target: [e.g., 1000 req/s]

### CLI surfaces (if applicable)
- Execution time: [e.g., < 500ms for common operations]
- Binary size: [e.g., < 20MB]
- Startup latency: [e.g., < 100ms]

## Accessibility
- WCAG level: [e.g., 2.1 AA] (web/mobile)
- Screen reader testing: [required/optional]
- Keyboard navigation: [all interactive elements]
- Platform accessibility APIs: [e.g., UIAccessibility for iOS, AccessibilityNodeInfo for Android]

## Security
- Dependency audit: [e.g., npm audit on every CI run]
- Secret scanning: [tool/approach]
- CSP policy: [strict/relaxed + details] (web surfaces)
- Code signing: [signing certificate strategy] (desktop/mobile surfaces)

## Code Quality
- Max file length: [e.g., 300 lines]
- Max function length: [e.g., 50 lines]
- Max cyclomatic complexity: [e.g., 10]
- Required documentation: [public APIs / all exports / none]

## CI/CD Gates
- Tests must pass: [yes]
- Lint must pass: [yes]
- Type-check must pass: [yes]
- Build must succeed: [yes]
- Coverage threshold met: [yes]

## Validation Command
[The single command that enforces all of the above]
```

Fill in concrete values based on the tech stack decisions from step 3 and the methodology from step 8. **No TBDs allowed** — every threshold must be a specific number or explicit decision.

## 12. Quality gate

### Self-check against Architecture rubric

Before presenting to the user, self-check both documents against the **Architecture Rubric** (9 dimensions) from `/audit-ambiguity`:

| # | Dimension | Check |
|---|-----------|-------|
| 1 | Tech Stack Decisiveness | Is every applicable axis decided with rationale? No TBDs? |
| 2 | System Architecture | Are all components, flows, and failure modes documented? |
| 3 | Data Strategy | Are placement, schema, queries, migrations, and PII boundaries defined? |
| 4 | Security Model | Are auth, authz, validation, rate limits, and CSP fully specified? |
| 5 | Compliance Depth | Are regulated domains (minors, payments, health) given full-depth sections? |
| 6 | API Design | Are surface, versioning, conventions, errors, and pagination defined? |
| 7 | Integration Robustness | Do all externals have failure + fallback plans? |
| 8 | Phasing Clarity | Are phases dependency-ordered with entry/exit criteria? |
| 9 | Engineering Standards | Are all thresholds concrete? No TBDs in ENGINEERING-STANDARDS.md? |

Also verify completeness:

- [ ] Every "Must Have" feature from vision.md has a home in the architecture
- [ ] Security model addresses all compliance constraints from vision.md
- [ ] Compliance-heavy domains have their own top-level sections (not buried as sub-bullets)
- [ ] All relevant skills installed for chosen stack
- [ ] Validation command in Engineering Standards matches `AGENTS.md` validation command
- [ ] For multi-surface: sync strategy defined, data ownership clear, conflict resolution specified
- [ ] For cross-platform: platform-specific considerations documented for each target OS

For any dimension that scores ⚠️ or ❌, resolve it NOW. Loop back to the relevant step and resolve with the user.

### Depth audit

Before presenting to the user, re-read the entire architecture document and for EACH section ask:

> "Could a developer implement this without asking a single clarifying question?"

If the answer is no for ANY section:
1. Identify what's missing (field types? flow steps? error cases? permission rules?)
2. Add the missing detail NOW — do not flag it, resolve it
3. Re-check the section

This is the single most important step. The difference between a useful architecture document and a useless one is whether this audit is done honestly. A 2,000-word architecture doc is almost certainly too shallow for any non-trivial project.

If gaps are found, loop back to the relevant step and resolve with the user.

> **Note**: This is an internal self-check, not a formal audit. For a rigorous,
> independent audit with evidence citations, run `/audit-ambiguity architecture` as a
> separate step after this workflow completes.

## 13. Request review and next steps

Use `notify_user` to present to the user:
- **Both** the architecture design document and the Engineering Standards document
- Summary of the self-check results (all 9 dimensions + completeness checklist)
- Any areas where you resolved gaps during the self-check

Both documents must be approved before proceeding.

### Proposed next steps

Once approved, present the user with the appropriate next step:

- **Default recommendation**: Run `/audit-ambiguity architecture` — recommended for all projects, especially those with compliance constraints
- **Skip condition**: Only skip `/audit-ambiguity architecture` if all 9 dimensions scored ✅ AND the project has zero compliance constraints. In that case, recommend `/decompose-architecture` directly.
