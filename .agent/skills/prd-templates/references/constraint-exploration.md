# Constraint Exploration Questions

Use during `/ideate-validate` Step 8 to explore constraints with the user. Write answers to `docs/plans/ideation/meta/constraints.md`.

## Core Constraint Categories

1. **Budget** — Self-funded? VC-backed? Monthly infrastructure ceiling?
2. **Timeline** — Launch target? Phased rollout?
3. **Team** — Solo dev? Small team? Skill gaps?
4. **Compliance** — GDPR, PCI, COPPA, HIPAA, SOC 2? Age restrictions?
5. **Performance** — Expected scale (users, requests, data)? Latency requirements?
6. **Surface classification validation** — Verify the structural classification from `ideation-index.md` (set in `ideate-extract` Step 1.3) still holds. Have any new surfaces been discovered during exploration? Has the project shape changed?

## Deep Think Prompt

> "Based on the product type and user personas, what constraints would I expect that haven't been mentioned? For example, does this product handle payments (PCI)? Does it serve minors (COPPA)? Does it store health data (HIPAA)?"

## Tier-Specific Behavior

| Tier | Behavior |
|---|---|
| **Interactive/Hybrid** | Present each constraint question to user, wait for answers. Write each confirmed constraint immediately. |
| **Auto** | Self-interview using Deep Think. Write all answers with reasoning immediately. Mark each answer as `[AUTO-CONFIRMED]` for traceability. |

## Success Metrics (Per Persona)

For each persona, define concrete success metrics:
- What metric proves this product solves the persona's problem?
- What's the target number? (specific — not "good response times")
- What's the measurement method?

Write to `ideation-index.md` (or link to domain files where the metric applies).

## Competitive Positioning

If not already explored during `/ideate-discover`:
- Name 2-4 direct competitors
- For each: what they do well, where they fail, how we differentiate
- What's the moat? (network effects, data, expertise, switching costs)

Write to `docs/plans/ideation/meta/competitive-landscape.md`.
