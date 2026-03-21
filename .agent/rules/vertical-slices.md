---
description: Features ship across all declared surfaces or they don't ship — no half-built slices
trigger: always_on
---

# Vertical Slices

## The Rule

**A feature is not "done" until it works across all required surfaces.** No "backend done, frontend pending." No "user-facing works, admin can't manage it."

## Surface Scope

Every slice **must declare its surface scope** during `/plan-phase`. The surface scope defines which project surfaces (web, mobile, desktop, CLI, etc.) the slice targets. The 4-layer checklist applies **within each declared surface**, not globally across all surfaces.

### Why Surface Scope Exists

Multi-surface projects have features that are inherently single-surface:
- A board-level component viewer is **desktop only** — forcing a web and mobile implementation violates the architecture
- Push notifications are **mobile only** — there's no web surface for this feature
- Some features launch **web-first** and port to desktop/mobile in later phases

Surface scope prevents both failure modes:
- ❌ **Under-scoping** — "backend done, frontend pending" within a declared surface
- ❌ **Over-scoping** — forcing all surfaces when the architecture says otherwise

### Surface Scope Rules

1. **Every slice must declare its surface scope** during `/plan-phase`. No implicit scope — undeclared scope is rejected.
2. **The 4-layer checklist applies within each declared surface.** A web-only slice must have all 4 layers complete for web. A desktop+mobile slice must have all 4 layers complete for both desktop and mobile.
3. **Surface scope comes from the architecture**, not from convenience. If the architecture says a feature spans web and mobile, the slice must cover both (or be split into "web" and "mobile" slices with an explicit dependency).
4. **Scope is locked at planning time.** Changing surface scope mid-implementation requires updating the phase plan — no silent scope reduction.

### Web-First (or Surface-First) Strategy

When a multi-surface feature launches on one surface first:
- The first-surface slice is "done" when its 4 layers are complete within its declared scope
- Ports to other surfaces are tracked as **separate dependent slices** in the phase plan
- Each port slice has its own 4-layer checklist and its own surface scope declaration
- Example: "User Profile — Web" (Phase 1) → "User Profile — Mobile" (Phase 2, depends on Web slice)

## The Four Implementation Layers

> **Note on terminology**: The layers below describe implementation completeness criteria — what every feature slice requires regardless of surface type. These are not the same as surface types (web/mobile/cli/etc.). For the mapping between surface types and how each implementation layer manifests on that surface, see `.agent/skills/prd-templates/references/surface-model.md`.

| Surface | What It Is | Example |
|---------|-----------|---------|
| **User-Facing** | What the end user sees and interacts with | Dashboard, forms, data views |
| **Admin** | Management interface for operators | User management, configuration |
| **API** | Programmatic interface | REST/GraphQL endpoints |
| **Data** | Database schemas, migrations, seed data | Tables, indexes, permissions |

## What "Done" Looks Like

A feature slice is complete when:

- [ ] Surface scope declared in the phase plan (explicit list of target surfaces)
- [ ] **For each declared surface:**
  - [ ] Data layer: schema defined, permissions set, seed data exists
  - [ ] API layer: endpoints exist, validated with {{CONTRACT_LIBRARY}}, tested
  - [ ] User-facing: component renders, handles loading/error/empty states
  - [ ] Admin: can create/read/update/delete the resource (if the feature has admin management)
- [ ] Tests pass at all levels (contract, unit, integration, E2E)
- [ ] Navigation: every new route is reachable from at least one navigation element
- [ ] Auth gates: every route that requires auth has the auth gate implemented (not stubbed)
- [ ] The feature is reachable from the app's entry point via normal user navigation
- [ ] All declared surfaces complete — no partial surface delivery

## What Gets Flagged

| Pattern | Verdict |
|---------|---------|
| Slice with no declared surface scope | ❌ Rejected. Every slice must declare its surfaces during `/plan-phase`. |
| "I'll add the admin panel later" | ❌ Rejected. Include admin CRUD in the slice (for features with admin management). |
| "The API works, frontend next sprint" (within same surface) | ❌ Rejected. Ship them together or not at all. |
| "Database is set up, just need endpoints" | ❌ Rejected. That's a layer, not a slice. |
| Route without navigation link from existing UI | ❌ Rejected. Must be reachable. |
| Auth-required route without auth gate | ❌ Rejected. Implement the gate. |
| Desktop-only feature forced to have a web implementation | ❌ Rejected. Surface scope should match the architecture. |
| Silently dropping a declared surface mid-implementation | ❌ Rejected. Update the phase plan or complete the surface. |
| Web-first slice with all 4 layers complete for web, mobile tracked as separate slice | ✅ Correct. Surface-first strategy. |
| Slice with declared scope and all layers complete within scope | ✅ Correct. |
| All declared surfaces + tests + navigation + auth gates | ✅ Correct. |
