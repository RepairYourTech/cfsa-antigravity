---
description: Features ship across all four surfaces or they don't ship — no half-built slices
trigger: always_on
---

# Vertical Slices

## The Rule

**A feature is not "done" until it works across all required surfaces.** No "backend done, frontend pending." No "user-facing works, admin can't manage it."

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

- [ ] Data layer: schema defined, permissions set, seed data exists
- [ ] API layer: endpoints exist, validated with {{CONTRACT_LIBRARY}}, tested
- [ ] User-facing: component renders, handles loading/error/empty states
- [ ] Admin: can create/read/update/delete the resource
- [ ] Tests pass at all levels (contract, unit, integration, E2E)
- [ ] Navigation: every new route is reachable from at least one navigation element
- [ ] Auth gates: every route that requires auth has the auth gate implemented (not stubbed)
- [ ] The feature is reachable from the app's entry point via normal user navigation

## What Gets Flagged

| Pattern | Verdict |
|---------|---------|
| "I'll add the admin panel later" | ❌ Rejected. Include admin CRUD in the slice. |
| "The API works, frontend next sprint" | ❌ Rejected. Ship them together or not at all. |
| "Database is set up, just need endpoints" | ❌ Rejected. That's a layer, not a slice. |
| Route without navigation link from existing UI | ❌ Rejected. Must be reachable. |
| Auth-required route without auth gate | ❌ Rejected. Implement the gate. |
| All 4 layers + tests + navigation + auth gates | ✅ Correct. |
