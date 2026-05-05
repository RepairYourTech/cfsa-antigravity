# Feature: {Feature Name}

> **Number**: {NN.NN.NN}
> **Parent**: [{sub-domain-name}](./{sub-domain}-index.md)
> **Status**: [SURFACE] / [PARTIAL] / [DEEP] / [EXHAUSTED]
> **Last updated**: {timestamp}

## Overview

_What this feature is, why it exists, what user problem it solves. 2-3 sentences._

## Role Lens

| Role | Access | What They See/Do |
|------|--------|-------------------|
| {Persona 1} | Full | _specific behavior for this role — actions, views, capabilities_ |
| {Persona 2} | Config | _specific behavior — what they configure, what they see_ |
| {Persona 3} | Read-only | _specific behavior — what they can view, what's hidden_ |
| {Persona 4} | None | _not visible — brief note on why or what they see instead_ |

> **Access levels**: Full · Config · Read-only · Reports · None
>
> **Rules:**
> - Every feature file MUST have a Role Lens table — no exceptions
> - Use persona names from `meta/personas.md`
> - "What They See/Do" must be SPECIFIC to this feature, not generic role descriptions
> - If a persona has "None" access, still list them — the explicit absence is valuable for downstream spec writers
> - This is the implementation-ready detail that IA/BE/FE spec writers consume directly

## Behavior

_Detailed description of the feature's behavior._

### Happy Path

_Step-by-step user interaction for the normal/expected case. Number each step._

1. _User does X_
2. _System responds with Y_
3. _User confirms Z_
4. _System completes action, shows confirmation_

### Edge Cases / Failure Modes

| Scenario | What Happens | User Sees |
|----------|-------------|-----------|
| _edge case 1_ | _system behavior_ | _error message or fallback UI_ |
| _edge case 2_ | _system behavior_ | _error message or fallback UI_ |

### States

| State | Trigger | What User Sees |
|-------|---------|---------------|
| Loading | _action initiated_ | _spinner, skeleton, progress bar_ |
| Empty | _no data exists yet_ | _empty state with CTA_ |
| Populated | _data loaded_ | _populated view_ |
| Error | _request failed_ | _error message with retry option_ |
| Partial | _incomplete data_ | _partial view with missing-data indicator_ |

## Deep Think Annotations

| # | Hypothesis | Source | Outcome |
|---|-----------|--------|---------|
| DT-01 | _hypothesis about what this feature needs_ | _reasoning or industry precedent_ | ✅ CONFIRMED / ❌ REJECTED: _reason_ |

> Log every Deep Think hypothesis — both confirmed and rejected. This is the audit trail showing the agent explored beyond the obvious.

## Cross-Cut Notes

_Quick references to how this feature interacts with features in other domains/sub-domains. These are pointers — detailed cross-cut analysis lives in the parent's CX file._

- Touches **{Domain/Sub-domain/Feature}** ([path](../../../path)) — _why: shared entity, trigger dependency, permission, etc._
- Consumed by **{Surface/Domain}** via API — _why: spoke surface reads this data through platform API_

> For detailed cross-cut analysis (synthesis questions, role scoping), see the CX file at the appropriate level.

## Decisions

| # | Decision | Context |
|---|----------|---------|
| D-01 | _what was decided_ | _why this was the right call_ |

## Open Questions

| # | Question | Owner | Deferred To |
|---|----------|-------|-------------|
| Q-01 | _question_ | User / Agent / /create-prd | _pipeline stage_ |

> **Notes for agents:**
> - Feature files are LEAF NODES — they are `.md` files, never folders
> - If a feature reveals 2+ interacting capabilities during drilling, it should be PROMOTED to a sub-domain (see Reactive Depth Protocol in `idea-extraction/SKILL.md`)
> - Status markers: `[SURFACE]` = identified only, `[PARTIAL]` = some depth, `[DEEP]` = all sections filled with edge cases, `[EXHAUSTED]` = Deep Think yields zero hypotheses + user confirms nothing missing
> - The Role Lens is the PRIMARY output consumed by `/write-fe-spec` and `/write-be-spec` — make it thorough
