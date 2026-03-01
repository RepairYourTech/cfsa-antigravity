# Vision Document Template

Use this template when compiling `docs/plans/vision.md` from ideation material.

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

## Feature Interactions
[Confirmed cross-cutting interactions from ideation. Empty if no cross-cutting work was done.]

### [Interaction Name]
- **Domains involved**: [list]
- **Trigger**: [what causes the interaction]
- **Source of truth**: [which domain owns the state]
- **Behavior per domain**: [what each domain does when triggered]
- **Conflicts & resolution**: [if any]
- **Cascading effects**: [second-order interactions, if any]

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

## Domain Appendices

If any domain has extensive material that doesn't fit the vision template (hero rosters, order system state machines, algorithm specifications, detailed interaction flows), create domain appendix files:

- Path: `docs/plans/vision-appendix-{domain-slug}.md`
- Reference from the main vision.md: `See [Domain Name Appendix](vision-appendix-{domain-slug}.md)`

**When to create appendices:**
- A domain section in vision.md would exceed ~100 lines of detail
- The domain has specific technical artifacts (state machines, algorithms, formulas)
- The domain has enumeration-heavy content (lists of items, types, categories)
