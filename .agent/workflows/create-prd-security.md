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

Read the surface stack map from `.agent/instructions/tech-stack.md`. Check the following cross-cutting categories for filled values:

| Map Location | Category | Recovery | Why this matters |
|---|---|---|---|
| Cross-Cutting | Security | Run `/create-prd-stack` to confirm security framework, then bootstrap. | Security model (Step 6) needs stack-specific threat analysis patterns. |
| Cross-Cutting | Auth | Run `/create-prd-stack` to confirm auth provider, then bootstrap. | Authentication design (Step 6.1) needs provider-specific auth flow patterns. |

> **Timing fallback**: During `/create-prd`, the map may be partially populated. If a cell is empty but the value was just confirmed in the current conversation (from `/create-prd-stack`), proceed using the conversation-confirmed value. Bootstrap will fill the map after `/create-prd` completes.

If cells are empty AND the value hasn't been confirmed in conversation → **HARD STOP**: tell the user to run `/create-prd-stack` first.

---

## 6. Security model

Read .agent/skills/security-scanning-security-hardening/SKILL.md and follow its defense-in-depth methodology.

Load the Auth and Security skill(s) from the cross-cutting section per the skill loading protocol (`.agent/skills/prd-templates/references/skill-loading-protocol.md`).

1. **Authentication** — How do users prove identity?
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

Refine based on discussion before proceeding.

**Bootstrap fire — security decision confirmed**

If the security model confirmed a specific security framework or compliance approach (e.g., crypto patterns, custom HSM approach), read `.agent/workflows/bootstrap-agents.md` and invoke `/bootstrap-agents SECURITY=[confirmed value]` to provision additional skills. Note: surface-triggered security skills (`owasp-web-security`, `csp-cors-headers`, `input-sanitization`, `api-security-checklist`, `dependency-auditing`, `desktop-security-sandboxing`) are provisioned automatically by bootstrap when surfaces are confirmed in `/create-prd-stack` — no manual fire needed for those.

## 6.5. Attack Surface Review

Read .agent/skills/security-scanning-security-hardening/SKILL.md and follow its Attack Surface Review Protocol for each surface confirmed in /create-prd-stack. Apply Universal checks to all projects, then surface-specific checks conditionally.

**Present to user**: Show the attack surface review findings. Ask:
- "Are there any attack vectors I've missed for your specific domain?"
- "Do the OWASP mechanisms look correct, or are any of them actually handled differently?"

## 7. Integration points

For each external service:

1. **What it provides** — Specific features used
2. **Failure mode** — What happens when it's down?
3. **Fallback strategy** — Graceful degradation plan
4. **Cost model** — Pricing tier, expected usage

## 7.5. Observability Architecture

Read .agent/skills/logging-best-practices/SKILL.md and follow its Observability Architecture Interview — all 5 decisions (logging, tracing, alerting, dashboards, retention) must be confirmed. Fire bootstrap per the skill's instructions for each confirmed tool.

**Present to user**: Show the observability architecture decisions. Ask:
- "Are these logging levels and PII exclusions correct for your compliance requirements?"
- "Are the alerting thresholds appropriate for your expected traffic?"

After the security model (Step 6) is completed and confirmed, write the `## Security Model` section to `docs/plans/architecture-draft.md`. After the attack surface review (Step 6.5) is completed and confirmed, write the `## Security — Attack Surface` section to `docs/plans/architecture-draft.md`. After the integration points (Step 7) are completed and confirmed, write the `## Integration Points` section to `docs/plans/architecture-draft.md`. After the observability architecture (Step 7.5) is completed and confirmed, write the `## Observability Architecture` section to `docs/plans/architecture-draft.md`. Do not wait until the end — write each section as it is completed.

### Propose next step

Security model and integration points are defined. Next: Run `/create-prd-compile` to document the development methodology, phasing strategy, and compile the final architecture design document and Engineering Standards.

> If this shard was invoked standalone (not from `/create-prd`), surface this via `notify_user`.

