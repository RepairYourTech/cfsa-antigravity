# Design System Prerequisite Check

Run this check before writing any FE spec.

## Procedure

1. Check whether `docs/plans/design-system.md` exists.
2. If it does not exist → **stop** and tell the user: _"The design system has not been established yet. Run `/create-prd-design-system` to lock navigation paradigm, layout grid, page archetypes, and global state design language before writing FE specs."_
3. If it exists → read and extract all seven decision areas: Navigation Paradigm, Layout Grid, Page Archetypes, Global Component Inventory, Motion Language, Data Density Philosophy, and Global State Design Language.
4. The extracted decisions are **requirements** for this FE spec — any violation is a rubric failure under Dimension 11 (Design System Consistency).

## Fail-Fast Validation Checks

Verify the following before proceeding. If any check fails, classification must **stop** and instruct the user to run `/create-prd-design-system` to resolve drift before continuing:

- **Page archetype match**: At least one page archetype from `design-system.md` applies to the feature being classified. If no archetype matches, the design system is incomplete for this feature.
- **Global component / navigation compliance**: The navigation paradigm and Global Component Inventory sections are populated (not empty or placeholder). Every navigation element the FE spec will use must exist in the inventory — re-inventing global components is a rubric failure.
- **Global state design language compliance**: The Loading States, Error States, and Empty States sub-sections are populated with confirmed approaches. The FE spec must use these confirmed patterns — inventing loading/error/empty state patterns outside the design language is a rubric failure.
