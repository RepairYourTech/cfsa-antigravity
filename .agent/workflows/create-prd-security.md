---
description: Security model and integration points for the create-prd workflow
parent: create-prd
shard: security
standalone: true
position: 3
pipeline:
  position: 2.3
  stage: architecture
  predecessors: [create-prd-architecture]
  successors: [create-prd-compile]
  skills: [logging-best-practices, prd-templates, resolve-ambiguity, security-scanning-security-hardening]
  calls-bootstrap: true
requires_map_columns: [Security, Auth]
---

// turbo-all

# Create PRD — Security & Integrations

Define the security model with full compliance escalation, and document all integration points with failure modes and fallbacks.

**Prerequisite**: System architecture and data strategy must be designed (from `/create-prd-architecture`). The agent should have component diagrams, data placement, and PII boundaries established.

---

## 0. Map guard

Follow the map guard protocol (`.agent/skills/prd-templates/references/map-guard-protocol.md`). Required cells for this shard:

| Map Location | Category | Why this matters |
|---|---|---|
| Cross-Cutting | Security | Security model (Step 6) needs stack-specific threat analysis patterns. |
| Cross-Cutting | Auth | Authentication design (Step 6.1) needs provider-specific auth flow patterns. |

**HARD GATE** — If ANY required cell is empty → STOP. No timing fallbacks. No conversation-confirmed values. See map guard protocol for recovery.

Read the engagement tier protocol (`.agent/skills/prd-templates/references/engagement-tier-protocol.md`) — apply the tier behavior for security decisions.

---

## 0.5. Ideation context reload

> **This step is mandatory.** Shards run in separate conversations — ideation context from the orchestrator is lost.

1. Read `docs/plans/ideation/ideation-index.md` — extract: persona list (all roles), MoSCoW Summary, Engagement Tier
2. Read `docs/plans/ideation/meta/constraints.md` — extract: compliance constraints (COPPA/PCI/HIPAA triggers), regulatory requirements, age-related constraints
3. Read domain-level index files for **every domain that has Must Have features** — extract the **Role Matrix** from each. The role matrix shows which personas access which domain at which permission level (Full / Config / Read-only / None). This is the primary input for access control design in Step 6.
4. Read CX files (`ideation-cx.md` + domain-level `{domain}-cx.md`) — extract trust boundaries: which domains share data across different permission levels, cross-domain escalation paths

**How this context feeds downstream steps:**
- Auth design (6.1-2) ← persona list + role matrices determine RBAC scope
- Compliance escalation (6) ← constraints.md compliance flags trigger mandatory sections
- Trust boundaries (6.5) ← CX cross-domain dependencies reveal attack surface
- Integration security (7) ← ideation integration references inform threat model

> ❌ Do NOT proceed to Step 6 until ideation context is loaded. "Scan the ideation output" is NOT sufficient — read the specific files listed above.

---

## 6. Security model

Read .agent/skills/security-scanning-security-hardening/SKILL.md and follow its defense-in-depth methodology.

Load the Auth and Security skill(s) from the cross-cutting section per the skill loading protocol (`.agent/skills/prd-templates/references/skill-loading-protocol.md`).

1. **Authentication** — How do users prove identity?

**No-auth project detection**: If the ideation output indicates no user accounts, no login, and no personalized data (e.g., a static content site, CLI tool, or public API) → skip items 1-2 and 5. Write a `## Security Model` section that documents WHY auth is not needed, and cover only items 3-4 and 6-8. If the project has partial auth (e.g., admin-only auth, API keys but no user accounts), scope items 1-2 to the applicable auth surface only.

2. **Authorization** — RBAC vs ABAC? Permission model?
3. **Data protection** — PII handling, encryption at rest/transit
4. **Input validation** — Where and how? (Zod recommended for TypeScript)
5. **Age restrictions** — If applicable: age verification model
6. **Rate limiting** — Per-route? Per-user? Per-IP?
7. **CSP/CORS** — Content Security Policy, allowed origins (web surfaces)
8. **Code signing** — App signing certificates, notarization (desktop/mobile surfaces)

### Compliance escalation

If any compliance constraint from `docs/plans/ideation/meta/constraints.md` involves **minors, payments, health data, or government-regulated domains**, it is NOT a sub-bullet — it becomes its own top-level section in the architecture document with the same depth as System Architecture. For example:

- **Minors/COPPA/age-gating** → requires: account type hierarchy, consent flows, content filtering architecture, Guardian oversight model, age verification mechanism, blocked content categories, notification system for filter triggers
- **Payments/PCI** → requires: token handling architecture, PCI scope boundaries, payment name verification, refund flows, dispute handling
- **Health data/HIPAA** → requires: PHI isolation boundaries, audit logging, access controls, breach notification procedures

Each of these must be specified with the same depth as any other architectural component — field-level detail, flow diagrams, error cases, and permission boundaries. A single bullet saying "age verification model" is not architecture.

Read .agent/skills/resolve-ambiguity/SKILL.md and follow its methodology.

**Present to user**: Show the security model and any compliance sections. Walk through each flow step by step. Ask:
- "Can you think of a way to bypass any of these controls?"
- "Are there edge cases in the age/payment/compliance flows I haven't covered?"

Follow the decision confirmation protocol (`.agent/skills/prd-templates/references/decision-confirmation-protocol.md`) — do not write until explicitly confirmed.

**Bootstrap fire — security decision confirmed**

If the security model confirmed a specific security framework or compliance approach (e.g., crypto patterns, custom HSM approach), read `.agent/workflows/bootstrap-agents.md` and invoke `/bootstrap-agents SECURITY=[confirmed value]` to provision additional skills. **HARD GATE**: Follow the bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`). Note: surface-triggered security skills (`owasp-web-security`, `csp-cors-headers`, `input-sanitization`, `api-security-checklist`, `dependency-auditing`, `desktop-security-sandboxing`) are provisioned automatically by bootstrap when surfaces are confirmed in `/create-prd-stack` — no manual fire needed for those.

Write the completed `## Security Model` section to `docs/plans/architecture-draft.md` immediately after user confirmation. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`). Do not wait for later steps.

## 6.5. Attack Surface Review

Read .agent/skills/security-scanning-security-hardening/SKILL.md and follow its Attack Surface Review Protocol for each surface confirmed in /create-prd-stack. Apply Universal checks to all projects, then surface-specific checks conditionally.

**Present to user**: Show the attack surface review findings. Ask:
- "Are there any attack vectors I've missed for your specific domain?"
- "Do the OWASP mechanisms look correct, or are any of them actually handled differently?"

Write the completed `## Security — Attack Surface` section to `docs/plans/architecture-draft.md` immediately after user confirmation. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`).

## 7. Integration points

**0-integrations check**: Scan the ideation output and architecture for external service dependencies. If there are genuinely 0 external integrations (no auth provider, no email service, no payment processor, no analytics, no CDN) → write a brief `## Integration Points` section stating: "No external service integrations identified. All functionality is self-contained." Skip the per-service framework below.

For each external service:

1. **What it provides** — Specific features used
2. **Failure mode** — What happens when it's down?
3. **Fallback strategy** — Graceful degradation plan
4. **Cost model** — Pricing tier, expected usage

Write the completed `## Integration Points` section to `docs/plans/architecture-draft.md` immediately after user confirmation. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`).

## 7.5. Observability Architecture

Read .agent/skills/logging-best-practices/SKILL.md and follow its Observability Architecture Interview — all 5 decisions (logging, tracing, alerting, dashboards, retention) must be confirmed. Fire bootstrap per the skill's instructions for each confirmed tool. **HARD GATE**: Follow the bootstrap verification protocol (`.agent/skills/prd-templates/references/bootstrap-verification-protocol.md`).

**Present to user**: Show the observability architecture decisions. Ask:
- "Are these logging levels and PII exclusions correct for your compliance requirements?"
- "Are the alerting thresholds appropriate for your expected traffic?"

Write the completed `## Observability Architecture` section to `docs/plans/architecture-draft.md` immediately after user confirmation. Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`).

## Completion Gate (MANDATORY)

Before reporting completion or proceeding to next shard:

1. **Memory check** — Apply rule `memory-capture`. Write any patterns, decisions, or blockers from this shard to `.agent/progress/memory/`. Security model decisions are high-impact — every confirmed decision should have a `DEC-NNN` entry. If nothing to write, confirm: "No new patterns/decisions/blockers."
2. **Progress update** — Update `.agent/progress/` tracking files if they exist.
3. **Session log** — Write session entry to `.agent/progress/sessions/`.

---

### Next step

**STOP** — do NOT proceed to any other workflow. The only valid next step is `/create-prd-compile`.

> If invoked standalone, surface via `notify_user` and wait for user confirmation.
