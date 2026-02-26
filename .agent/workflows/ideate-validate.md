---
description: Constraints, metrics, competitive positioning, domain exhaustion, and vision compilation for the ideate workflow
parent: ideate
shard: validate
standalone: true
position: 3
pipeline:
  position: 1.3
  stage: vision
  predecessors: [ideate-discover]
  successors: [create-prd]
  skills: [idea-extraction, resolve-ambiguity]
  calls-bootstrap: false
---

// turbo-all

# Ideate — Validate

Explore constraints, success metrics, and competitive positioning. Run domain exhaustion and vision deepening passes. Compile the vision document.

**Prerequisite**: If invoked standalone, verify that domain mapping and feature inventory have been completed (from `/ideate-discover` or equivalent context). The agent should have a domain coverage map and MoSCoW feature inventory available.

---

## 6. Constraints and non-functionals

Explore constraints through targeted questions:

1. **Budget** — Self-funded? VC-backed? Impacts hosting and infra decisions
2. **Timeline** — Production launch target? Phased rollout?
3. **Team** — Solo dev? Small team? Impacts architecture complexity
4. **Compliance** — Age restrictions? GDPR? PCI? COPPA? HIPAA?
5. **Performance** — Expected scale? Latency requirements?

### Project surface classification

This is one of the most important architectural inputs. Classify the project:

| Surface Type | Description | Examples |
|-------------|-------------|---------|
| **Web app** | Browser-based application | SaaS dashboard, marketing site, customer portal |
| **Desktop app** | Native or hybrid desktop application | POS system, IDE, media editor, CAD tool |
| **Mobile app** | Native or hybrid mobile application | iOS/Android app, field service tool |
| **CLI tool** | Command-line interface | Build tool, dev utility, automation script |
| **API service** | Backend-only, consumed by other systems | Payment gateway, data pipeline, integration layer |
| **Multi-surface** | Multiple connected applications | Desktop POS + web portal, mobile app + web dashboard + API |

Ask explicitly:

1. **What surfaces does this project have?** — It may be more than one
2. **For desktop/mobile: cross-platform?**
   - Desktop: Windows + macOS + Linux? Or single OS?
   - Mobile: iOS + Android? Or single platform?
   - Desktop + Mobile shared: Same codebase across desktop AND mobile? (Flutter, Kotlin Multiplatform, .NET MAUI)
3. **For multi-surface: how are they connected?**
   - What data/functionality is shared between surfaces?
   - Does any surface need to work offline?
   - Are they one product or separate products that integrate?

> **Why this matters**: The surface classification drives folder structure in
> `/decompose-architecture`, tech stack decisions in `/create-prd`, and the
> shape of every spec downstream. Getting it right here prevents rework later.

Record the classification in the Constraints section of vision.md with enough detail for `/create-prd` to act on it.

## 7. Success metrics

Define measurable success criteria:

1. **Launch criteria** — What must be true to ship? (Every item must be production-grade)
2. **Growth metrics** — DAU, retention, conversion targets (even rough estimates)
3. **Technical metrics** — Platform-appropriate performance targets:
   - Web: Core Web Vitals (LCP, FID, CLS), bundle size, uptime SLA
   - Desktop: Cold start time, memory footprint, installer size
   - Mobile: App launch time, battery impact, app download size
   - CLI: Execution time, binary size, startup latency
   - API: Response time (p50/p95/p99), throughput, error budget
   - Multi-surface: Per-surface targets + sync latency between surfaces

## 8. Competitive positioning

Ask the user:

1. **Who are the top 3 competitors?** — Or search the web to find them
2. **What's the unique angle?** — Why would someone choose this over alternatives?
3. **What's the moat?** — What's defensible long-term?

## 9. Domain exhaustion check

Before compiling the vision document, check the domain coverage map:

1. **Display the coverage map** to the user: "Here's where we are across all domains."
2. **Flag under-explored domains** — any domain with <3 explored sub-topics
3. **For each under-explored domain, ask:** "We haven't gone deep on [domain]. Should we explore it now, or is it intentionally minimal?"
4. **Continue exploring** until all domains reach ≥3 sub-topics explored OR the user explicitly confirms the domain is intentionally minimal

Only proceed to compilation when:
- Overall coverage ≥80%
- Every Must Have feature explored to ≥Level 2
- User has confirmed the coverage map

## 10. Vision deepening pass

Before compiling, do one deepening pass across the entire captured material:

1. **Persona gaps** — For each persona: "Is there a scenario where this persona's needs conflict with another's?" Add any conflicts found.
2. **Feature completeness** — For each Must Have: "What implicit sub-features does this require?" (e.g., "user accounts" implies signup, login, password reset, profile management, account deletion). Surface the implicit features and confirm with the user.
3. **Constraint interactions** — Do any constraints conflict? (e.g., "launch in 3 months" vs "COPPA compliance" may be in tension). Surface conflicts for the user to resolve.
4. **Surface completeness** — For multi-surface projects: does every surface have clear ownership of its features? Are there features that span surfaces without a clear primary owner?
5. **Missing "Won't Have"** — Are there obvious features the user hasn't explicitly excluded that might creep in? Add them to Won't Have for clarity.

Present findings to the user. Refine based on discussion.

## 11. Compile vision document

Create `docs/plans/vision.md` with this structure:

```markdown
# [Project Name] — Vision

> One-sentence pitch: [from Step 4]

## Problem Statement
[From Step 4, refined]

## User Personas
[2-4 personas with name, role, pain point, success criteria, switching trigger]

## Feature Inventory (MoSCoW)
### Must Have (Phase 1)
[Each feature with sub-features and key edge cases — Level 2 depth minimum]
### Should Have (Phase 2)
[Each feature with sub-features identified]
### Could Have (Phase 3+)
### Won't Have (explicitly excluded)

## Constraints
[Budget, timeline, team, compliance, performance]

### Project Surfaces
[Surface classification — which surfaces, cross-platform decisions,
multi-surface connections. This section drives /create-prd tech stack decisions.]

## Success Metrics
[Launch criteria, growth targets, platform-appropriate technical targets]

## Competitive Landscape
[Competitors, unique angle, defensible moat]

## Domain Coverage Summary
[Summary of all explored domains with depth indicators.
References to appendices for domain-rich topics.]

## Open Questions
[Anything unresolved that needs answers before architecture — with owners and deadlines]
```

### Domain appendices (for complex projects)

If any domain has extensive material that doesn't fit the vision template
(hero rosters, order system state machines, algorithm specifications, detailed interaction
flows), create domain appendix files:

- Path: `docs/plans/vision-appendix-{domain-slug}.md`
- Reference from the main vision.md: `See [Domain Name Appendix](vision-appendix-{domain-slug}.md)`
- Examples: `vision-appendix-hero-roster.md`, `vision-appendix-order-systems.md`, `vision-appendix-ai-orchestration.md`

These appendices are consumed by downstream workflows (`/create-prd`, `/decompose-architecture`)
as additional context alongside the main vision document.

**When to create appendices:**
- A domain section in vision.md would exceed ~100 lines of detail
- The domain has specific technical artifacts (state machines, algorithms, formulas)
- The domain has enumeration-heavy content (lists of items, types, categories)

## 12. Request review and propose next steps

Before presenting to the user, run a **self-check against the Vision rubric** (all 10 dimensions):

1. Problem clarity — Is the problem statement specific and testable?
2. Persona depth — Do all personas have name, role, pain point, success criteria, switching trigger?
3. Feature completeness — Are all Must Haves explored to ≥Level 2 depth?
4. MoSCoW accuracy — Is every feature categorized with clear rationale?
5. Constraint specificity — Are budget, timeline, team, compliance, performance all addressed?
6. Surface classification — Are all project surfaces identified with cross-platform decisions?
7. Success metrics — Are launch criteria, growth targets, and technical targets defined?
8. Competitive positioning — Are competitors, unique angle, and moat identified?
9. Domain coverage — Is overall coverage ≥80% with every Must Have at ≥Level 2?
10. Open questions — Are unresolved items listed with owners and deadlines?

For any dimension scoring ⚠️ or ❌, resolve it before presenting. Do not present a vision document with known gaps.

Call `notify_user` presenting:
- `docs/plans/vision.md` and any appendices (`docs/plans/vision-appendix-*.md`)
- The self-check summary (all 10 dimensions with their ✅/⚠️/❌ scores)
- Any gaps that were resolved during the self-check (what was found and how it was fixed)
- The final domain coverage map

> **Do NOT proceed until the user sends a message explicitly approving this output. Proposing next steps is not the same as receiving approval.**

### Proposed next steps

Mandatory next step: Run `/audit-ambiguity vision` for all inputs, regardless of input type. Even a rich document can have gaps the agent missed. The audit is cheap; the cost of a gap propagating to architecture is high. Do not propose `/create-prd` until `/audit-ambiguity vision` has run.
