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
  skills: [idea-extraction, resolve-ambiguity, prd-templates, pipeline-rubrics]
  calls-bootstrap: false
---

// turbo-all

# Ideate — Validate

Explore constraints, success metrics, and competitive positioning. Run domain exhaustion and vision deepening passes. Compile the vision document.

**Prerequisite**: If invoked standalone, verify that domain mapping and feature inventory have been completed (from `/ideate-discover` or equivalent context).

---

## 6. Constraints and non-functionals

Explore constraints through targeted questions:

1. **Budget** — Self-funded? VC-backed? Impacts hosting and infra decisions
2. **Timeline** — Production launch target? Phased rollout?
3. **Team** — Solo dev? Small team? Impacts architecture complexity
4. **Compliance** — Age restrictions? GDPR? PCI? COPPA? HIPAA?
5. **Performance** — Expected scale? Latency requirements?

### Project surface classification

Classify the project surfaces. Ask explicitly:

1. **What surfaces does this project have?** — Web app, desktop app, mobile app, CLI tool, API service, or multi-surface
2. **For desktop/mobile: cross-platform?**
3. **For multi-surface: how are they connected?**

> **Why this matters**: The surface classification drives folder structure in
> `/decompose-architecture`, tech stack decisions in `/create-prd`, and the
> shape of every spec downstream.

Record the classification in the Constraints section of vision.md.

## 7. Success metrics

Define measurable success criteria:

1. **Launch criteria** — What must be true to ship?
2. **Growth metrics** — DAU, retention, conversion targets
3. **Technical metrics** — Platform-appropriate performance targets (web: Core Web Vitals; desktop: cold start, memory; mobile: launch time, battery; CLI: execution time; API: p50/p95/p99)

## 8. Competitive positioning

1. **Who are the top 3 competitors?**
2. **What's the unique angle?**
3. **What's the moat?**

## 9. Domain exhaustion check

1. Display the coverage map to the user
2. Flag under-explored domains (any domain with <3 explored sub-topics)
3. For each, ask: "Should we explore it now, or is it intentionally minimal?"
4. Continue until all domains reach ≥3 sub-topics OR user confirms intentionally minimal

Only proceed when: overall coverage ≥80%, every Must Have explored to ≥Level 2, user has confirmed.

## 10. Vision deepening pass

One deepening pass across all captured material:

1. **Persona gaps** — scenarios where personas conflict
2. **Feature completeness** — implicit sub-features (e.g., "user accounts" implies signup, login, reset, profile, deletion)
3. **Constraint interactions** — conflicting constraints
4. **Surface completeness** — does every surface have clear feature ownership?
5. **Missing "Won't Have"** — obvious features to explicitly exclude

Present findings. Refine based on discussion.

## 11. Compile vision document

Read `.agent/skills/prd-templates/references/vision-template.md` for the document structure. Compile `docs/plans/vision.md` from `docs/plans/ideation.md`. The ideation document is the authoritative source — do not add or drop material.

Create domain appendices for domains with extensive material (>100 lines, technical artifacts, enumeration-heavy content) at `docs/plans/vision-appendix-{domain-slug}.md`.

## 12. Request review and propose next steps

Run a pre-flight self-check. Read `.agent/skills/pipeline-rubrics/references/vision-rubric.md` and apply each of the 7 dimensions. Also check:

- **Input-Output Fidelity** — Two-layer check: (1) every major section of the original source maps to `ideation.md`; (2) every section in `ideation.md` maps to `vision.md` — nothing dropped.

For any dimension scoring ⚠️ or ❌, resolve it before presenting.

Call `notify_user` presenting:
- `docs/plans/vision.md` and any appendices
- The self-check summary (all dimensions with ✅/⚠️/❌ scores)
- Any gaps resolved during the self-check
- The final domain coverage map

> **Do NOT proceed until the user sends a message explicitly approving this output.**

### Proposed next steps

**Hard gate**: Do NOT propose `/create-prd` until `/audit-ambiguity vision` has run as a fresh invocation and scored 0% ambiguity.
