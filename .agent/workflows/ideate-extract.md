---
description: Input classification, noise filtering, and skill loading for the ideate workflow
parent: ideate
shard: extract
standalone: true
position: 1
pipeline:
  position: 1.1
  stage: vision
  predecessors: []
  successors: [ideate-discover]
  skills: [brainstorming, idea-extraction, prd-templates, resolve-ambiguity, technical-writer]
  calls-bootstrap: false
---

// turbo-all

# Ideate — Extract

Classify the user's input, create the fractal `ideation/` folder structure, and load skills.

**Prerequisite**: If invoked standalone (not from `/ideate`), verify the user has provided input — either an `@file` reference or a verbal description. If no input is provided, prompt: "What would you like to build? Describe your idea, or provide a file with `/ideate-extract @path/to/file.md`."

---

## 1. Input assessment

Classify what the user has provided. This determines which mode the `idea-extraction` skill uses.

| Input Type | Detection | Extraction Mode |
|---|---|---|
| **Rich document** | >5KB, detailed docs, design conversations, prior specs | Extraction |
| **Thin document** | <5KB, structured but shallow (bullet list, rough PRD) | Expansion |
| **Conversational dump** | Chat logs, unstructured conversation transcripts | Extraction (with noise filtering) |
| **Verbal / one-liner** | User describes idea in chat, no files | Interview |
| **Nothing** | "I want to build an app" or similar | Interview (deep) |

**For rich inputs (Extraction mode):**
1. Read/ingest all provided documents
2. **Proportionality check**: If source >50KB, total ideation output must be ≥30% of source line count
3. Identify natural domain boundaries in the content
4. Present organized inventory for user confirmation
5. Identify gaps — note for Interview Mode in `/ideate-discover`
6. Use idea-extraction skill to refine, not re-derive

**For thin inputs (Expansion mode):**
1. Read input and identify domain boundaries
2. Identify depth level per domain (surface → detailed → implementation-ready)
3. Note shallowest domains for priority treatment in `/ideate-discover`

**For verbal / no input (Interview mode):**
1. Read `.agent/skills/idea-extraction/SKILL.md` and enter Interview mode
2. Start with: "In one sentence, what problem does this solve and for whom?"
3. **Immediately after**: Run Structural Classification (Step 1.3)
4. From that sentence + classification, identify initial domains
5. Proceed to folder seeding (Step 1.5)

## 1.3. Structural Classification

Read the **Structural Classification Protocol** in `.agent/skills/idea-extraction/SKILL.md`.

This step determines the folder layout. It MUST run **before** any domain folders are created (Step 1.5).

**For rich/thin document input:**
1. Scan for surface signals (see detection table in skill)
2. If multi-product signals detected, scan for hub-and-spoke vs peer signals:
   - One surface described as "the platform" or "the API" → **hub-and-spoke**
   - All surfaces access central database through one API → **hub-and-spoke**
   - Surfaces described as equally independent → **peer**
3. If no multi-product signals → **single-surface**
4. If ambiguous → ask the user the classification questions

**For interview / verbal input:**
1. After the opening problem statement, ask:
   - "Who are the distinct user types or audiences?"
   - "What platforms does this need to live on?" (web, mobile, desktop, API, CLI)
2. If multi-product → ask: "Is there a primary platform that others depend on, or are all surfaces independent peers?"
3. Classify the project shape

**Record the classification** in `ideation-index.md` under `## Structural Classification` per the super-index template.

Four shapes: `single-surface`, `multi-surface-shared`, `multi-product-hub`, `multi-product-peer`.

## 1.4. Re-run check

Before seeding, check whether `docs/plans/ideation/ideation-index.md` already exists.

- If it **exists**: Present summary (expansion mode, domain count, depth markers). Ask: "An ideation folder already exists. **Continue** or **start fresh**?"
  - **Continue** → skip seeding, jump to Step 1.6
  - **Start fresh** → archive to `docs/plans/ideation-archive-[timestamp]/`, then seed
- If it **does not exist**: proceed with seeding.

## 1.5. Seed fractal `ideation/` folder

Read these templates:
- `.agent/skills/prd-templates/references/ideation-index-template.md` (super-index)
- `.agent/skills/prd-templates/references/ideation-crosscut-template.md` (global CX)
- `.agent/skills/prd-templates/references/fractal-node-index-template.md` (node index)
- `.agent/skills/prd-templates/references/fractal-cx-template.md` (node CX)
- `.agent/skills/prd-templates/references/fractal-feature-template.md` (feature file)

Read `.agent/skills/technical-writer/SKILL.md` and follow its methodology.

**Create the base structure** (all project shapes):

```
docs/plans/ideation/
├── ideation-index.md       ← super-index (from ideation-index-template)
├── ideation-cx.md          ← global cross-cuts (from ideation-crosscut-template)
└── meta/
    ├── problem-statement.md
    ├── personas.md
    ├── competitive-landscape.md
    └── constraints.md
```

**For multi-product projects**, additionally create `surfaces/` with sub-folders per surface.

**Seed domains using the Node Classification Gate** (from `idea-extraction/SKILL.md`):

For each domain identified in Step 1:
1. Run the Classification Gate — determine placement:
   - Single-surface → create `docs/plans/ideation/{NN}-{slug}/`
   - Hub-and-spoke → surface-exclusive in `surfaces/{surface}/{NN}-{slug}/`, shared in hub surface
   - Peer → surface-exclusive in `surfaces/{surface}/{NN}-{slug}/`, shared in `shared/{NN}-{slug}/`
2. Create the domain folder with: `{slug}-index.md` + `{slug}-cx.md`
3. For rich document inputs, parse sub-areas into feature files within each domain folder
4. Update `ideation-index.md` structure map with paths

**Seeding behavior by input type:**

- **Rich document**: Parse by domain → create fractal folders + feature files → seed with content. Run fidelity check: every major source section maps to a domain folder. Add `> Source: path/to/original.md` to index.
- **Chat transcript**: Noise filter → extract signal → seed domain folders with structured output.
- **Thin document**: Create domain folders with depth markers on feature files.
- **Verbal / one-liner**: Create domain folders with scaffolding. Feature files are `[SURFACE]`.

## 1.6. User Intent Check (ALL input types)

Read `.agent/skills/brainstorming/SKILL.md` and follow its methodology.

After seeding, present a summary and ask how the user wants to proceed. Present all options:

1. **Full exploration** *(recommended for 3+ domains)* — Recursive breadth-before-depth with Deep Think
2. **Process as-is** — Proceed with what's captured; fill gaps as they arise
3. **Expand vertically** — Drill deeper into existing features
4. **Expand horizontally** — Add new feature domains not yet covered
5. **Explore cross-cutting concerns** — Map how existing features interact
6. **Combination** — User specifies dimensions and order
7. **Audit ambiguity first** — Run inline check before deciding

**Wait for user answer — do not assume.**

## 1.7. Expansion Mode Routing

Write the expansion mode to `ideation-index.md` per the super-index template.

This flag is read by `ideate-discover.md` to shape exploration behavior.

## 2. Load skills

Read `.agent/skills/idea-extraction/SKILL.md` and follow its methodology throughout.

Also read `.agent/skills/resolve-ambiguity/SKILL.md` — use reactively when encountering ambiguity that can be resolved without user input.

### Propose next step

Proceed to `/ideate-discover` to explore domains using the recursive breadth-before-depth model with the fractal structure.

> If invoked standalone, surface this via `notify_user`. If invoked by parent `/ideate`, this is a natural handoff.
