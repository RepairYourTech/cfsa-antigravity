# Folder Seeding Protocol

Rules for creating the `docs/plans/ideation/` folder structure during `/ideate-extract`.

## Additive-Only Rule

The `docs/plans/ideation/` directory already exists in the kit with `.gitkeep` and `README.md`. You are ADDING files into this existing directory.

- Do NOT delete, overwrite, or replace the directory itself
- Do NOT remove any existing files (`.gitkeep`, `README.md`)
- Create new files alongside what already exists

## Base Structure (All Project Shapes)

After seeding, the folder should contain kit-shipped files PLUS new pipeline files:

```
docs/plans/ideation/
├── .gitkeep                ← KIT-SHIPPED — do not touch
├── README.md               ← KIT-SHIPPED — do not touch
├── ideation-index.md       ← NEW: super-index (from ideation-index-template)
├── ideation-cx.md          ← NEW: global cross-cuts (from ideation-crosscut-template)
└── meta/                   ← NEW: created by this step
    ├── problem-statement.md
    ├── personas.md
    ├── competitive-landscape.md
    └── constraints.md
```

For multi-product projects, additionally create `surfaces/` with sub-folders per surface.

## Templates

Read these templates when creating files:

- `.agent/skills/prd-templates/references/ideation-index-template.md` (super-index)
- `.agent/skills/prd-templates/references/ideation-crosscut-template.md` (global CX)
- `.agent/skills/prd-templates/references/fractal-node-index-template.md` (node index)
- `.agent/skills/prd-templates/references/fractal-cx-template.md` (node CX)
- `.agent/skills/prd-templates/references/fractal-feature-template.md` (feature file)

## Domain Seeding Rules

Domains come from the **confirmed classification table** (Step 1.4.5), NOT from source headings.

### Placement by Structural Classification

| Classification | Placement |
|---|---|
| Single-surface | `docs/plans/ideation/{NN}-{slug}/` |
| Hub-and-spoke | Surface-exclusive in `surfaces/{surface}/{NN}-{slug}/`, shared in hub surface |
| Peer | Surface-exclusive in `surfaces/{surface}/{NN}-{slug}/`, shared in `shared/{NN}-{slug}/` |

### Node Type → Action

| Gate Result | Action |
|---|---|
| **Domain** | Create domain folder with `{slug}-index.md` + `{slug}-cx.md` |
| **Sub-domain** | Create sub-domain folder nested inside parent domain |
| **Feature** | Create feature file inside parent domain or sub-domain |
| **Cross-cut** | Add entries to appropriate CX files (domain-level or global) |
| **Not-a-product-domain** | Add notes to `meta/constraints.md` for `/create-prd` |

After all nodes are created, update `ideation-index.md` structure map with paths.

## Content Seeding by Input Type

| Input Type | Content Strategy |
|---|---|
| **Rich document** | Seed each node with content from source using classification table citations. Run fidelity check: every major concept in source must map to SOMETHING in the output. Add `> Source: path/to/original.md` to index. |
| **Chat transcript** | Noise filter → extract signal → seed domain folders with structured output |
| **Thin document** | Create domain folders with depth markers on feature files |
| **Verbal / one-liner** | Create domain folders with scaffolding. Feature files are `[SURFACE]`. |

## Post-Seeding Verification Gate

After creating all files, verify that `docs/plans/ideation/.gitkeep` and `docs/plans/ideation/README.md` still exist. If EITHER file is missing → **STOP**: "Kit-shipped files were destroyed during seeding. Restore `.gitkeep` and/or `README.md` to `docs/plans/ideation/` before continuing."
