---
description: Features ship across all four surfaces or they don't ship — no half-built slices
alwaysApply: false
---

# Vertical Slices

## The Rule

**A feature is not "done" until it works across all required surfaces.** No "backend done, frontend pending." No "user-facing works, admin can't manage it."

## The Four Surfaces

| Surface | What It Is | Example |
|---------|-----------|---------|
| **User-Facing** | What the end user sees and interacts with | Dashboard, forms, data views |
| **Admin** | Management interface for operators | User management, configuration |
| **API** | Programmatic interface | REST/GraphQL endpoints |
| **Data** | Database schemas, migrations, seed data | Tables, indexes, permissions |

## What "Done" Looks Like

A feature slice is complete when:

- [ ] Data layer: schema defined, permissions set, seed data exists
- [ ] API layer: endpoints exist, validated with Zod, tested
- [ ] User-facing: component renders, handles loading/error/empty states
- [ ] Admin: can create/read/update/delete the resource
- [ ] Tests pass at all levels (contract, unit, integration, E2E)

## Anti-Patterns

| Don't | Do |
|-------|-----|
| "I'll add the admin panel later" | Include admin CRUD in the slice |
| "The API works, frontend next sprint" | Ship them together or not at all |
| "Database is set up, just need endpoints" | That's not a slice, that's a layer |
