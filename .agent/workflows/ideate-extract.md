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

Classify the user's input, create the `ideation/` folder structure, and load skills.

**Prerequisite**: If invoked standalone (not from `/ideate`), verify the user has provided input — either an `@file` reference or a verbal description. If no input is provided, prompt: "What would you like to build? Describe your idea, or provide a file with `/ideate-extract @path/to/file.md`."

---

## 1. Input assessment

Classify what the user has provided. This determines which mode the `idea-extraction` skill
uses and how the rest of the workflow behaves.

| Input Type | Detection | Extraction Mode |
|---|---|---|
| **Rich document** | >5KB, detailed docs, design conversations, prior specs | Extraction |
| **Thin document** | <5KB, structured but shallow (bullet list, rough PRD) | Expansion |
| **Conversational dump** | Chat logs, unstructured conversation transcripts | Extraction (with noise filtering) |
| **Verbal / one-liner** | User describes idea in chat, no files | Interview |
| **Nothing** | "I want to build an app" or similar | Interview (deep) |

**For rich inputs (Extraction mode):**
1. Read/ingest all provided documents
2. **Proportionality check**: If the source document is over 50KB, the total ideation output (all domain files combined) must be at least 30% of the source document's line count. If it falls short, identify what was lost and recover it.
3. Identify natural domain boundaries in the content
4. Present the organized inventory to the user for confirmation: "Here's what I found, organized by domain. Is anything missing or wrong?"
5. Identify gaps — domains or sub-topics not covered
6. For each gap, note it for Interview Mode treatment in `/ideate-discover`
7. Use idea-extraction skill to refine and deepen, not to re-derive what's already known

**For thin inputs (Expansion mode):**
1. Read the input and identify domain boundaries
2. For each domain area, identify depth level (surface → detailed → implementation-ready)
3. Note shallowest domains for priority treatment in `/ideate-discover`
4. Use idea-extraction skill to deepen each one

**For verbal / no input (Interview mode):**
1. Read `.agent/skills/idea-extraction/SKILL.md` and enter Interview mode
2. Start with: "In one sentence, what problem does this solve and for whom?"
3. **Immediately after**: Run Structural Classification (Step 1.3) — ask about audiences and surfaces before identifying domains
4. From that sentence + classification, identify the key nouns — these become initial domains
5. Proceed to folder seeding (Step 1.5) then domain exploration in `/ideate-discover`

## 1.3. Structural Classification

Read the **Structural Classification Protocol** in `.agent/skills/idea-extraction/SKILL.md`.

This step determines the folder layout for all ideation output. It MUST run **before** any domain files are created (Step 1.5).

**For rich/thin document input:**
1. Scan the document for surface signals:
   - Distinct platform names in section headings (e.g., "Consumer Web Platform", "Shop Software")
   - Different tech stacks per surface (e.g., "Astro for web", "Tauri for desktop")
   - Surface-exclusive features (e.g., "Board Viewer (desktop only)")
2. If signals detected → classify as **multi-product**
3. If no signals → classify as **single-surface**
4. If ambiguous → ask the user the two classification questions before proceeding

**For interview / verbal input:**
1. After the opening problem statement, ask:
   - "Who are the distinct user types or audiences for this?"
   - "What platforms does this need to live on?" (web, mobile, desktop, API, CLI)
2. Based on the answers, classify the project shape
3. If the user's one-liner already specifies a single surface ("make me a website"), classify as **single-surface** without asking

**Record the classification** in `ideation-index.md` under `## Structural Classification`:

```markdown
## Structural Classification

- **Project Shape**: [single-surface | multi-surface-shared | multi-product]
- **Surfaces**: [list of identified surfaces, e.g., "Web (Astro/React), Desktop (Rust/Tauri), Mobile (React Native)" — or "N/A" for single-surface]
- **Classification Basis**: [how this was determined — "detected from document", "user interview", "inferred from one-liner"]
```

## 1.4. Re-run check

Before seeding, check whether `docs/plans/ideation/ideation-index.md` already exists.

- If it **exists**: Present a summary of its current state (expansion mode, domain count, depth markers, cross-cut count). Ask: "An ideation folder already exists. Do you want to **continue from it** or **start fresh**?"
  - **Continue** → skip seeding, jump directly to Step 1.6.
  - **Start fresh** → archive existing folder to `docs/plans/ideation-archive-[timestamp]/`, then proceed with seeding.
- If it **does not exist**: proceed with seeding.

## 1.5. Seed `ideation/` folder

Read `.agent/skills/prd-templates/references/ideation-index-template.md` and the other ideation templates.

Read `.agent/skills/technical-writer/SKILL.md` and follow its methodology.

Read the **Structural Classification** from Step 1.3 and create the appropriate folder structure.

**Single-surface layout** (project shape = `single-surface` or `multi-surface-shared`):

```
docs/plans/ideation/
├── ideation-index.md
├── meta/
│   ├── problem-statement.md
│   ├── personas.md
│   ├── competitive-landscape.md
│   └── constraints.md
├── domains/
│   └── (domain files created per identified domain)
└── cross-cuts/
    └── cross-cut-ledger.md
```

**Multi-product layout** (project shape = `multi-product`):

```
docs/plans/ideation/
├── ideation-index.md
├── meta/
│   ├── problem-statement.md
│   ├── personas.md
│   ├── competitive-landscape.md
│   └── constraints.md
├── surfaces/
│   ├── {surface-1-name}/
│   ├── {surface-2-name}/
│   └── {surface-N-name}/
├── domains/
│   └── (shared/cross-cutting domain files)
└── cross-cuts/
    └── cross-cut-ledger.md
```

Create the surface folders based on the surfaces identified in Step 1.3.

**Seeding behavior by input type:**

- **Rich document**: Parse by domain → create one domain file per identified domain → seed each with relevant content from source. **For multi-product projects:** place each domain file in the correct surface folder or shared `domains/` folder based on the domain placement rules in the idea-extraction skill. Preserve all detail. Add reference at top of index: `> Source: path/to/original.md`. Do not modify the original. Run the **Source → Domain Files fidelity check**: every major section of the source maps to a domain file — nothing dropped during parsing.
- **Chat transcript**: Run the noise filter (read full transcript, extract decisions/ideas/rejections, discard filler, present extracted signal to user for confirmation), then create domain files with the clean structured signal. Attribute decisions: `> Decided in conversation: [decision]`.
- **Thin document**: Create domain files annotated with `[SURFACE]`, `[PARTIAL]`, or `[DEEP]` depth markers per sub-area.
- **Verbal / one-liner**: Create domain files with scaffolding based on the initial description. Sub-areas are `[SURFACE]` placeholders.

Populate `ideation-index.md` with the domain map and document map linking to all created files.

## 1.6. User Intent Check (ALL input types)

Read `.agent/skills/brainstorming/SKILL.md` and follow its methodology.

After seeding, present a summary of what was captured and ask how the user wants to proceed. Framing adapts to input type:

- **Rich document**: "I've organized your document into the ideation folder. Here's the domain map: [domain list with depth indicators]. How would you like to proceed?"
- **Chat transcript**: "I've extracted the signal from your conversation — [N] decisions, [N] feature ideas, [N] rejected directions. Here's the domain map: [list]. How would you like to proceed?"
- **Thin document**: "I've seeded the ideation folder with [N] domains. I found [N] sub-areas at surface depth, [N] at partial depth, [N] implementation-ready. How would you like to proceed?"
- **Verbal / one-liner**: "I've scaffolded [N] initial domains based on your description. How would you like to approach this?"

Present all options for every input type:
1. **Full exploration** *(recommended for 3+ domains)* — Recursive breadth-before-depth with Deep Think protocol — domain map → breadth sweep → vertical drilling, with cross-cut detection and hypothesis generation active throughout
2. **Process as-is** — Proceed with what's captured; fill gaps via interview as they arise
3. **Expand vertically** — Drill deeper into existing features
4. **Expand horizontally** — Add new feature domains not yet covered
5. **Explore cross-cutting concerns** — Map how existing features interact and conflict
6. **Combination** — User specifies which dimensions and order
7. **Audit ambiguity first** — Run inline check on ideation folder before deciding

Recommendation logic: suggest Full if 3+ domains, vertical if 1-2 domains, Full if no domains (verbal). Always present all options. **Wait for user answer — do not assume.**

> **Note**: Cross-cut detection is always-on regardless of mode. Even if the user picks vertical-only, maintain the cross-cut ledger and surface it at the end.

## 1.7. Expansion Mode Routing

Based on the user's choice, write the expansion mode to `ideation-index.md`:

```
## Expansion Mode
- Type: [full | vertical | horizontal | cross-cutting | combination | as-is]
- Targets: [list of domains/features to focus on, if applicable]
- Cross-cut Detection: always-on
- Deep Think Protocol: active
```

This flag is read by `ideate-discover.md` to shape exploration behavior.

## 2. Load skills

Read `.agent/skills/idea-extraction/SKILL.md` and follow its methodology throughout this workflow.

Also read `.agent/skills/resolve-ambiguity/SKILL.md` — use it reactively when encountering ambiguity that can be resolved without user input (technical/factual questions). For intent/choice questions, use the decision classification rule.

### Propose next step

Once input is classified, folder is seeded, and skills are loaded, proceed to `/ideate-discover` to explore domains using the recursive breadth-before-depth model.

> If this shard was invoked standalone (not from `/ideate`), surface this via `notify_user`. If invoked by the parent `/ideate`, this is a natural handoff — the parent orchestrates the transition.
