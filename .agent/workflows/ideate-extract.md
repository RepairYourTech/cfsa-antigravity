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

**Prerequisite**: If standalone, verify user provided input via `@file` or verbal. If none, prompt: \"What would you like to build? Provide a file or describe your idea.\"

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
3. **Interview the document**: Run the interview question framework from `idea-extraction/SKILL.md` Extraction Mode Phase 1. Extract concepts (not headings) with citations. Classify every concept through the Node Classification Gate. Build the classification table and proposed domain map.
4. **BLOCKING GATE — Do NOT proceed to Step 1.5 until the classification table is built.** The classification table is a required artifact. No domain folders can be created without it.
5. Identify gaps — questions the document doesn't answer → these become Phase 2 user interview questions
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

## 1.4.5. Classification Confirmation (Extraction mode only)

> **BLOCKING GATE**: Before creating ANY domain folder, you MUST complete this step.
> This step exists because the test revealed that the Node Classification Gate was being
> bypassed — the agent mirrored source document headings as domains instead of classifying
> each concept. This gate makes classification a hard prerequisite for folder creation.

1. **Verify the classification table exists.** Step 1 item 3 must have produced a completed classification table. If it doesn't exist, STOP — go back and run Extraction Mode Phase 1 from `idea-extraction/SKILL.md`.
2. **Present the classification table and proposed domain map to the user.** Show:
   - Every concept with its source location, gate result, and reasoning
   - The proposed domain hierarchy (what folders would be created and where)
   - The gap list (questions the document didn't answer)
3. **Ask**: "Here's how I classified your content. Does this look right?"
4. **Wait for user confirmation or corrections.** Do NOT proceed until the user responds.
5. **Apply any corrections** the user provides — update the classification table and domain map.

**The classification table must show for each concept:**
- Concept name and source location (line numbers or section reference)
- Gate result: domain / sub-domain / feature / cross-cut / not-a-product-domain
- Gate reasoning: which gate questions were asked and how they were answered

**Do NOT mirror source document headings as domains.** Source headings are hints for finding concepts. The Node Classification Gate determines what each concept is.

## 1.5. Seed fractal `ideation/` folder

Read these templates:
- `.agent/skills/prd-templates/references/ideation-index-template.md` (super-index)
- `.agent/skills/prd-templates/references/ideation-crosscut-template.md` (global CX)
- `.agent/skills/prd-templates/references/fractal-node-index-template.md` (node index)
- `.agent/skills/prd-templates/references/fractal-cx-template.md` (node CX)
- `.agent/skills/prd-templates/references/fractal-feature-template.md` (feature file)

Read `.agent/skills/technical-writer/SKILL.md` and follow its methodology.

**ADDITIVE ONLY** — The `docs/plans/ideation/` directory already exists in the kit with `.gitkeep` and `README.md`. You are ADDING files into this existing directory. Do NOT delete, overwrite, or replace the directory itself. Do NOT remove any existing files. Create new files alongside what already exists.

**Create the base structure** (all project shapes). This is what the folder should contain AFTER seeding — kit-shipped files plus new pipeline files:

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

**For multi-product projects**, additionally create `surfaces/` with sub-folders per surface.

**Post-seeding verification gate**: After creating all files, verify that `docs/plans/ideation/.gitkeep` and `docs/plans/ideation/README.md` still exist. If EITHER file is missing → **STOP**: "Kit-shipped files were destroyed during seeding. Restore `.gitkeep` and/or `README.md` to `docs/plans/ideation/` before continuing."

**Seed domains from CONFIRMED classification table** (not from source headings):

> **CRITICAL**: The domain list comes from the classification table confirmed in Step 1.4.5.
> Do NOT re-derive domains from the source document. Do NOT fall back to source headings.
> If Step 1.4.5 was not completed, STOP — you cannot seed without a confirmed classification.

For each concept classified as **domain** in the confirmed table:
1. Determine placement from the structural classification:
   - Single-surface → create `docs/plans/ideation/{NN}-{slug}/`
   - Hub-and-spoke → surface-exclusive in `surfaces/{surface}/{NN}-{slug}/`, shared in hub surface
   - Peer → surface-exclusive in `surfaces/{surface}/{NN}-{slug}/`, shared in `shared/{NN}-{slug}/`
2. Create the domain folder with: `{slug}-index.md` + `{slug}-cx.md`
3. For concepts classified as **sub-domain**, create sub-domain folders nested inside their parent domain
4. For concepts classified as **feature**, create feature files inside their parent domain or sub-domain
5. For concepts classified as **cross-cut**, add entries to the appropriate CX files (domain-level or global)
6. For concepts classified as **not-a-product-domain**, add notes to `meta/constraints.md` for `/create-prd`
7. Update `ideation-index.md` structure map with paths

**Seeding content by input type:**

- **Rich document**: Seed each domain/sub-domain/feature with content from the source document using the source citations in the classification table. Run fidelity check: every major concept in the source must map to SOMETHING in the output (domain, sub-domain, feature, CX entry, or `/create-prd` note). Add `> Source: path/to/original.md` to index.
- **Chat transcript**: Noise filter → extract signal → seed domain folders with structured output.
- **Thin document**: Create domain folders with depth markers on feature files.
- **Verbal / one-liner**: Create domain folders with scaffolding. Feature files are `[SURFACE]`.

## 1.6. Engagement Tier Selection (ALL input types)

All three tiers are available for all input types. Present with the recommended default for this input type (Rich/Thin/Chat → Hybrid, Verbal → Interactive):

> **How involved do you want to be?**
> 1. 🤖 **Auto** — I explore independently via Deep Think. You review at the end.
> 2. 🤝 **Hybrid** *(recommended)* — Structural stuff auto, product decisions pause for you.
> 3. 💬 **Interactive** — I pause at every gate. Full interview mode.

**Wait for user answer.** Write the engagement tier to `ideation-index.md` under `## Engagement Tier` immediately.

## 1.6.5. Expansion Mode Selection (ALL input types)

Present expansion mode options:

1. **Full exploration** *(recommended for 3+ domains)* — Breadth-before-depth with Deep Think
2. **Process as-is** — Proceed with what's captured
3. **Expand vertically** — Drill deeper into existing features
4. **Expand horizontally** — Add new domains
5. **Cross-cutting concerns** — Map feature interactions
6. **Combination** — User specifies dimensions and order
7. **Audit ambiguity first** — Inline check before deciding

**Wait for user answer.** Write expansion mode to `ideation-index.md` under `## Expansion Mode` immediately.

## 2. Load skills

Read `.agent/skills/idea-extraction/SKILL.md` and follow its methodology throughout.

Also read `.agent/skills/resolve-ambiguity/SKILL.md` — use reactively when encountering ambiguity that can be resolved without user input.

### Propose next step

Proceed to `/ideate-discover` to explore domains using the recursive breadth-before-depth model with the fractal structure.

> If invoked standalone, surface this via `notify_user`. If invoked by parent `/ideate`, this is a natural handoff.
