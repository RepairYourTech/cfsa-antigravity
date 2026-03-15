# BE Spec Template

Use this template when writing BE specs to `docs/plans/be/[NN-feature-name].md`.

```markdown
# [Feature] — Backend Specification

> **IA Source**: [link to IA shard]
> **Deep Dives**: [links to consumed deep dives, if any]
> **Status**: Draft | Review | Complete

## IA Source Map

[Which IA shard sections, deep dives, and cross-shard references
inform each part of this BE spec. This is the traceability record
that lets a reviewer verify nothing was missed or invented.]

| BE Spec Section | IA Source | Section/Lines |
|-----------------|----------|---------------|
| API Endpoints | [primary-shard.md] | § User Flows |
| Database Schema | [primary-shard.md] | § Data Model |
| Middleware | [cross-ref-shard.md] | § Access Control (lines N–M) |
| Error Handling | [primary-shard.md] | § Edge Cases |
| [specific subsystem] | [deep-dive.md] | § Key Decisions |

## API Endpoints
## Request/Response Contracts ({{CONTRACT_LIBRARY}} schemas)
## Database Schema
## Middleware & Policies
## Data Flow
## Error Handling
## Open Questions

## Changelog

| Date | Change | Workflow | Sections Affected |
|------|--------|----------|-------------------|
| [date] | Initial creation | /write-be-spec | All |
```

## Quality Gates Checklist

Apply after writing every BE spec:

- [ ] Every endpoint has a {{CONTRACT_LIBRARY}} request AND response schema
- [ ] Every database table has defined fields, indexes, and permissions
- [ ] Security constraints from IA shard reflected in middleware section
- [ ] Error codes are specific (not generic 500s)
- [ ] Rate limits specified per endpoint
- [ ] Access control requirements mapped to middleware checks
- [ ] Every deep dive key decision is reflected in the spec (not ignored)
- [ ] Every cross-shard reference has been resolved (no dangling pointers)
- [ ] IA Source Map is complete — no BE spec section lacks a traceable IA source
- [ ] Testability criteria from IA shard reflected as performance targets

## BE Spec Seed Stub

Use when creating a spec file during classification:

```markdown
# [Feature] — Backend Specification

> **IA Source**: [link to IA shard]
> **Deep Dives**: [links, if any]
> **Status**: Classifying

## Classification
- **Type**: [single-domain | multi-domain-split | cross-cutting | structural reference]
- **IA Source**: [shard name]
- **BE Spec(s) to produce**: [list]

## Referenced Material Inventory
[Primary shard, cross-refs with file + section + line numbers]
```

## FE Spec Seed Stub

Use when creating a spec file during FE classification:

```markdown
# [Feature] — Frontend Specification

> **BE Source**: [link to BE spec(s)]
> **IA Source**: [link to IA shard]
> **Status**: Classifying

## Classification
- **Type**: [feature spec | cross-cutting]
- **BE Source(s)**: [list]
- **IA Source**: [shard name]

## Referenced Material Inventory
[same format as BE classify stub]

## Design Requirements (extracted from brand-guidelines)
**Direction**: [confirmed direction]
**Typography**: [extracted]
**Colors**: [extracted]
**Motion**: [extracted]
**Anti-patterns**: [extracted]
```
