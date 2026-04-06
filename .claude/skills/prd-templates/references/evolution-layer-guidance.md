# Evolution Layer Guidance

Reference for `/evolve-feature-classify` Step 4 and `/evolve-feature-cascade` Step 1 — specifies what to write at each pipeline layer when evolving a feature.

## Entry Point Writing Depth

### Ideation Layer (`docs/plans/ideation/`)

1. **Placement**: Read `ideation-index.md` Structure Map. Identify the domain folder. Create new domain if needed.
2. **Classification Gate**: Apply Node Classification Gate from `.agent/skills/idea-extraction/SKILL.md` — leaf feature or sub-domain folder.
3. **Write**: Use `.agent/skills/prd-templates/references/fractal-feature-template.md`. Include:
   - Feature description (what and why)
   - Affected personas
   - Success criteria
   - Constraints
   - Role Lens — which personas interact and how
4. **Update parent index**: Add to parent domain's `*-index.md` children table
5. **Update CX files**: If cross-domain interactions exist, update parent `*-cx.md` and/or `ideation-cx.md`
6. **Update `ideation-index.md`**: Add to MoSCoW Summary at appropriate priority

### Architecture Layer (`architecture-design.md`)

- Technical constraint description
- Affected components
- Non-functional requirements (performance, scalability, compliance)
- Integration points

### IA Layer (specific IA shard)

- Domain interactions (new/modified user flows)
- Contracts (new/modified API contracts)
- Data models (new entities, fields, relationships)
- Access control (RBAC implications)

### BE Layer (BE spec)

- New API endpoints
- Updated schemas
- Middleware requirements
- Validation rules

### FE Layer (FE spec)

- New components
- State management updates
- New routes
- Accessibility requirements

### Phase Plan

- New slices or updated slice acceptance criteria

## Cascade Layer Guidance

When cascading through downstream layers in `/evolve-feature-cascade`:

| Layer | What to Add |
|-------|------------|
| Architecture | New components, system diagram references, NFRs, integration points |
| IA | New domain interactions, updated contracts, data model changes, access control updates |
| BE | New API endpoints, updated schemas, middleware requirements, validation rules |
| FE | New components, state management updates, new routes, accessibility requirements |
| Phase plan | New slices or updated slice acceptance criteria |

## Impact Assessment Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implementation Impact
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
In-progress slices affected:              [list or "none"]
Completed slices that may need revisiting: [list or "none"]
New slices needed:                        [list or "none"]
Phase plan update required:               [yes/no]

Recommended action: [specific next step]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Completion Summary Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature Evolution Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Entry point:       [document]
Layers updated:    [list]
New content:       [summary]
Implementation:    [impact summary]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
