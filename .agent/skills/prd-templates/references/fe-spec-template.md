# FE Spec Template

Use this template when writing FE specs to `docs/plans/fe/[NN-feature-name].md`.

```markdown
# [Feature] — Frontend Specification

> **BE Source**: [link to BE spec(s), or N/A for cross-cutting]
> **IA Source**: [link to IA shard, or N/A for cross-cutting]
> **Status**: Draft | Review | Complete

## Source Map

| FE Spec Section | Source | Section/Lines |
|-----------------|--------|---------------|
| Component Inventory | [be-spec.md or conventions] | § Response Contracts |
| Page/Route Definitions | [ia-shard.md or conventions] | § User Flows |
| Interactions | [ia-shard.md or conventions] | § User Flows + § Edge Cases |
| Accessibility | [ia-shard.md or conventions] | § Accessibility (lines N–M) |
| Responsive Behavior | [ia-shard.md or conventions] | § Device Strategy |
| Data Mapping | [be-spec.md or conventions] | § Request/Response Contracts |

## Design Requirements
**Direction**: [from brand-guidelines — confirmed direction]
**Typography**: [font/size/weight per text element]
**Colors**: [primary/secondary/accent for default, hover, active, disabled, error states]
**Motion**: [animation/transition behavior, or "none"]
**Anti-patterns**: [what AI slop looks like for this component and how to avoid it]

## Design System Compliance
**Page archetype(s)**: [name the archetype(s) from design-system.md]
**Navigation**: [confirm which nav elements this spec uses from the global component inventory]
**Loading states**: [confirm skeleton vs. spinner — cite design-system.md rule]
**Error states**: [confirm inline/toast/full-page/boundary — cite design-system.md rule for each context]
**Empty states**: [confirm illustration style and copy tone from design-system.md]

## Component Inventory
[Tree with props interfaces]

## Page/Route Definitions
[URL patterns, guards, redirects]

## State Management
[Server state, client state, URL state, loading/error/empty]

## Interaction Specification
[Click, hover, keyboard, form validation matching {{CONTRACT_LIBRARY}}]

## Responsive Behavior
[Breakpoints, component behavior per breakpoint]

## Accessibility
[ARIA roles, keyboard nav, screen reader, WCAG compliance]

## Data Mapping
[Which BE response fields map to which component props]

## Open Questions

## Changelog

| Date | Change | Workflow | Sections Affected |
|------|--------|----------|-------------------|
| [date] | Initial creation | /write-fe-spec | All |
```

## Quality Gates Checklist

Apply after writing every FE spec:

- [ ] Every component has a props interface
- [ ] Every interactive element has defined behavior
- [ ] Every data field maps to a BE response field (if applicable)
- [ ] Loading, error, and empty states defined for every data-fetching view
- [ ] Accessibility requirements meet WCAG 2.1 AA
- [ ] Responsive behavior specified for all breakpoints
- [ ] IA shard's accessibility section fully consumed (not re-derived from BE spec)
- [ ] IA shard's user flows reflected in interaction specification
- [ ] Account-tier conditional rendering rules from IA access model included
- [ ] Source Map is complete — no FE spec section lacks a traceable source
- [ ] Design Requirements section filled from brand-guidelines (not placeholders)
- [ ] Page archetype named and matches design-system.md
- [ ] All loading/error/empty states use the confirmed design language from design-system.md
- [ ] No global component re-invented (consuming from global inventory, not re-implementing)
