# Ideation Meta Document Templates

> These are the templates for the `ideation/meta/` directory.
> Each meta file captures product-level information that isn't domain-specific.

---

## problem-statement.md

```markdown
# Problem Statement

## The Problem

_One sentence: what problem exists, who has it, and why current solutions fail._

## Why It Matters

_Market size, pain severity, frequency of occurrence._

## Why Now

_What has changed that makes this solvable or valuable today._

## Root Cause

_The underlying cause, not just the symptom. Why do current solutions fail?_
```

---

## personas.md

```markdown
# User Personas

> Every persona must have all 6 fields. Do not proceed to features until all personas
> are complete. See Vision Rubric Dimension 2.

## Persona: {{Name}}

| Field | Detail |
|-------|--------|
| **Name + Role** | _Named role with context — not "a user"_ |
| **Primary Pain Point** | _Specific friction in one sentence_ |
| **Current Workaround** | _Exact tool, process, or coping mechanism today_ |
| **Success Criteria** | _What "solved" looks like, measurable if possible_ |
| **Switching Trigger** | _What event/threshold makes them switch_ |
| **Unique Constraint** | _What makes their situation different from other personas_ |

### Workflow

_Primary workflow through the product — step by step._

### Anti-Persona Behavior

_Worst thing they could intentionally do. Worst thing they could accidentally do._

---

_Repeat for each persona (2-4 recommended)._
```

---

## competitive-landscape.md

```markdown
# Competitive Landscape

## Top Competitors

| Competitor | What They Do | Strength | Weakness | Our Angle |
|-----------|-------------|----------|----------|-----------|
| _Name_ | _Description_ | _Why users choose them_ | _Where they fall short_ | _How we differentiate_ |

## Unique Differentiators

1. _Differentiator 1_ — why this matters to our personas
2. _Differentiator 2_ — why this is hard to copy

## Moat

_What makes this defensible over time? Network effects, data, expertise, switching costs?_
```

---

## constraints.md

```markdown
# Project Constraints

## Budget
- _Self-funded / VC-backed / enterprise budget_
- _Monthly infrastructure ceiling_

## Timeline
- _Launch target_
- _Phased rollout plan_

## Team
- _Solo dev / small team / full org_
- _Skill gaps, if any_

## Compliance
- _GDPR / PCI / COPPA / HIPAA / SOC 2 / Other_
- _Age restrictions_

## Performance
- _Expected scale (users, requests, data volume)_
- _Latency requirements_

## Project Surfaces

| Surface | Type | Cross-Platform? | Notes |
|---------|------|----------------|-------|
| _Web app_ | _SPA / SSR / Static_ | N/A | _Primary surface_ |
| _Desktop_ | _Tauri / Electron_ | _Yes/No_ | _Offline capability_ |
| _Mobile_ | _Native / RN / PWA_ | _Yes/No_ | |
| _API_ | _REST / GraphQL / tRPC_ | N/A | |
| _CLI_ | _Yes/No_ | _Yes/No_ | |

> Surface classification drives tech stack in `/create-prd`, folder structure in
> `/decompose-architecture`, and spec shapes downstream.
```
