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
  skills: [security-scanning-security-hardening]
  calls-bootstrap: false
---

// turbo-all

# Create PRD — Security & Integrations

Define the security model with full compliance escalation, and document all integration points with failure modes and fallbacks.

**Prerequisite**: System architecture and data strategy must be designed (from `/create-prd-architecture`). The agent should have component diagrams, data placement, and PII boundaries established.

---

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
