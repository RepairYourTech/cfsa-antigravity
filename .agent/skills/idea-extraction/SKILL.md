---
name: idea-extraction
description: "Exhaustive idea extraction through recursive breadth-before-depth exploration with Deep Think protocol and fractal structure. Use during /ideate to transform raw ideas into comprehensive, structured ideation output. Writes to a fractal folder hierarchy — every node has an index, CX file, and children."
---

# Idea Extraction — Exhaustion Engine

## Philosophy

> This pipeline does not build MVPs. It does not produce shallow specs. It does not
> create technical debt by rushing past the ideation phase. The ideation phase is where
> the entire downstream pipeline gets its DNA — if the ideation is shallow, every spec,
> every architecture decision, every line of code downstream will be shallow too.

This skill is an **exhaustion engine** designed to extract every ounce of product vision
from the user. Your job is not to collect answers. Your job is to **generate new thinking**
in the user by asking questions they haven't considered, exploring edges they haven't
mapped, and helping them make decisions they haven't faced yet.

The **Deep Think Protocol** is the core mechanism: at every step, you actively reason
about what *should* exist based on domain knowledge, industry patterns, and cross-domain
interactions — then present hypotheses to the user for confirmation or rejection.

---

## Fractal Structure Protocol

This skill writes directly to the `docs/plans/ideation/` folder using a **fractal pattern** — every node in the tree (surface, domain, sub-domain) follows the same structure:

```
{node}/
├── {node}-index.md       ← what's in this node, child listing, Role Matrix
├── {node}-cx.md          ← cross-cuts connecting this node's children
├── child-01/             ← same pattern repeats (if child is complex)
└── 01.01.01-feature.md   ← leaf node = .md file, not a folder
```

**Key rules:**

1. **Always folders.** Every domain, sub-domain, and even single-surface projects use folders — no flat files. One universal pattern, no exceptions.
2. **Indexes at every level.** Template: `.agent/skills/prd-templates/references/fractal-node-index-template.md`
3. **CX files at every level.** Template: `.agent/skills/prd-templates/references/fractal-cx-template.md`
4. **Feature files are leaf nodes.** Template: `.agent/skills/prd-templates/references/fractal-feature-template.md`
5. **Depth is reactive.** The structure grows during exploration — never pre-scaffolded beyond what's discovered.
6. **Soft limit at 4 levels.** If creating a level 5+ node, pause and ask the user: "This is getting unusually deep — should I promote a parent to reduce nesting, or is this depth justified?"

### Super-Index

The top-level `ideation-index.md` uses a different template: `.agent/skills/prd-templates/references/ideation-index-template.md`
The top-level `ideation-cx.md` uses: `.agent/skills/prd-templates/references/ideation-crosscut-template.md`

### Numbering Convention

Numbers are hierarchical and dot-separated within a surface:

```
{domain}.{sub-domain}.{sub-sub}.{feature}
  01    .    01     .   02   .    03
```

- Folders use number prefix: `01.03.02-ai-assistant/`
- Feature files use full number: `01.03.02.03-parts-recommendation.md`
- Cross-surface references prefix with surface: `web/02.01.03`, `desktop/01.03.02`
- Numbers are stable once assigned — never renumber

---

## Structural Classification Protocol

> **This classification must happen BEFORE any domain files are written.**
> It determines the folder layout for the entire ideation phase. The classification
> is performed in `ideate-extract` (Step 1.3) and recorded in `ideation-index.md`.

### Four Project Shapes

| Shape | Signals | Folder Structure |
|---|---|---|
| **Single-surface** | One platform, one audience, "make me a website" | Domains are top-level children of `ideation/` (no `surfaces/` folder) |
| **Multi-surface-shared** | 2+ platforms, same stack, >80% shared logic | Domains at top level with surface annotations in feature files |
| **Multi-product (hub-and-spoke)** | 2+ platforms, one is clearly the central platform/API. Others consume from it. | `surfaces/` with hub surface owning shared domains. Spokes reference hub via CX. |
| **Multi-product (peer)** | 2+ platforms, no clear primary. Each is equally independent. | `surfaces/` with `shared/` folder as a peer for truly cross-surface domains. |

### Detection: When to Ask vs When to Detect

| Input Mode | How Structure Is Determined |
|---|---|
| **Interview** (verbal / no input) | Ask the user directly — see Interview Questions below |
| **Document** (rich / thin) | Scan for surface signals — see Detection Signals below |
| **One-liner** | Infer from the description — "make me a website" = single surface, skip the question |

### Interview Questions (asked early, before domain exploration)

When the input doesn't make the project shape obvious, ask these questions
**immediately after the opening problem statement question** — before any domain
exploration or file creation:

1. **"Who are the distinct user types or audiences?"**
   - Single audience → likely single-surface
   - Multiple distinct audiences → likely multi-product

2. **"What platforms or surfaces does this need to live on?"** (web, mobile, desktop, API, CLI)
   - One platform → single-surface
   - Multiple platforms, same stack → multi-surface-shared
   - Multiple platforms, different stacks or exclusive features → multi-product

3. **"Is there a primary platform that the other surfaces depend on — like a central API or web platform? Or are all surfaces independent peers?"** _(only if multi-product)_
   - Yes, one primary → hub-and-spoke
   - No, all independent → peer

### Detection Signals (for document input)

When processing a document, scan for these signals before creating any domain files:

| Signal | Example | Classification |
|---|---|---|
| Distinct platform names in section headings | "Consumer Web Platform", "Shop Software (Tauri)" | Multi-product |
| Different tech stacks mentioned per surface | "Astro/React for web", "Rust/Tauri for desktop" | Multi-product |
| One surface described as "the platform" or "the API" | "Desktop app calls the platform API" | Hub-and-spoke |
| All surfaces access a central database through one API | "Everything goes through the web platform's proxy" | Hub-and-spoke |
| Surfaces described as equally independent | "Web and mobile are separate apps with separate backends" | Peer |
| Single platform implied | "The website will...", "Users visit the app and..." | Single-surface |

### Hub-and-Spoke Implications

When hub-and-spoke is identified:

- **The hub surface owns shared domains.** Device History, Payments, Certification — these live INSIDE the hub surface's domain tree, not in a separate `shared/` folder.
- **Spoke surfaces reference hub domains via CX.** Desktop's CX files say "Feature X consumes web/domain/feature via API."
- **The hub surface tends to be the largest.** This is expected and correct.

### Peer Mode Implications

When peer mode is identified:

- **Shared domains live in `shared/`.** `shared/` is treated as a peer node with the same fractal pattern.
- **Each surface owns only its exclusive features.**
- **Surface CX files reference `shared/` domains.** Both surfaces point to shared, rather than one owning it.

### Classification Persistence

The classification is recorded in `ideation-index.md` under `## Structural Classification`.
All downstream steps read this section to determine where to place new nodes.

---

## Node Classification Gate

> **RUN THIS GATE before creating ANY new node** — domain, sub-domain, or feature.

```
"I discovered [thing]. What is it?"
     │
     ▼
Does it belong to an EXISTING domain or sub-domain?
     │
    YES ──► Does it have 2+ distinct capabilities that interact with each other?
     │            │
     │           YES ──► It's a SUB-DOMAIN ──► create folder inside existing parent
     │            │
     │           NO ──► It's a FEATURE ──► create .md file inside existing parent
     │
    NO ──► Is it surface-exclusive?
              │
             YES ──► It's a new DOMAIN ──► create domain folder in the correct surface
              │
             NO ──► Is there a hub surface that owns this kind of logic?
                       │
                      YES ──► It lives in the HUB surface ──► create domain in hub + CX from spokes
                       │
                      NO ──► It's a shared domain ──► create in shared/

**WHEN UNCERTAIN: Ask the user.** Never assume placement.
```

### Sub-Domain vs Feature Test

The key question: **"Does this thing have its own internal features that interact with each other?"**

| Example | Internal Features? | Classification |
|---------|-------------------|----------------|
| AI Assistant | Yes: task generation, guided workflow, parts recommendation, test tracking — these interact | **Sub-domain** (folder) |
| Print Receipt | No: it does one thing | **Feature** (file) |
| Inventory Manager | Yes: stock tracking, reorder alerts, supplier integration | **Sub-domain** or **Domain** depending on scope |
| Password Reset | No: single flow with edge cases | **Feature** (file) |

### Anti-Patterns

| ❌ Wrong | ✅ Right |
|----------|---------|
| Creating "Supplier Integration" as a new domain | Recognizing it's a feature within AI Assistant, cross-cutting to web's Supplier Accounts |
| Creating a domain for every feature mentioned | Grouping related features under their parent domain/sub-domain |
| Pre-creating 4 levels of empty folders | Creating depth reactively as complexity is discovered |
| Putting a shared domain in `shared/` when hub-and-spoke is active | Putting it inside the hub surface, with CX references from spokes |

---

## Reactive Depth Protocol

### Depth Grows from Exploration

The structure is NEVER pre-scaffolded. It grows as the agent explores:

| Discovery Event | Action |
|----------------|--------|
| New surface identified | Create surface folder + surface index + surface CX |
| New domain identified | Run Classification Gate. Create domain folder + index + CX inside correct parent |
| New sub-area with 2+ interacting capabilities | Promote to sub-domain: create folder + index + CX |
| New sub-area with single capability | Create as feature file (.md) inside current parent |
| Feature explored and found to have internal complexity | Promote: convert .md to folder (see below) |

### Promotion: Feature → Sub-Domain

During drilling, a feature might reveal internal complexity that warrants promotion:

1. Agent discovers the feature has 2+ interacting capabilities
2. Agent asks: "This feature has enough internal complexity to be its own sub-domain. Should I promote it?"
3. If confirmed:
   - Create `{number}-{slug}/` folder
   - Create index and CX files inside
   - Split content from the old feature file into child feature files
   - Update parent index
4. Numbering stays the same — the feature number becomes the sub-domain number

### Exhaustion Check (Leaf-Node Model)

Exhaustion is checked at the **leaves** — whatever the deepest items are in each branch:

- **Old model**: "All domains at DEEP"
- **New model**: "All LEAF NODES at DEEP or EXHAUSTED"

Status propagation rules:
- All children `[EXHAUSTED]` → node is `[EXHAUSTED]`
- All children `[DEEP]`+ → node is `[DEEP]`
- Any child below `[DEEP]` → node stays at its current status

---

## Role Integration

### Global Persona Definitions

Personas are defined ONCE in `meta/personas.md`. This file is the single source of truth.

### Where Persona Info Appears

| Location | What's There | Template |
|----------|-------------|----------|
| `meta/personas.md` | Full persona definitions (6 fields each) | Single source of truth |
| Index files → Role Matrix | Grid of children × personas with access icons | `fractal-node-index-template.md` |
| Feature files → Role Lens | Per-feature access level + specific behavior | `fractal-feature-template.md` |
| CX files → Role scoping | Which roles are affected by each cross-cut | `fractal-cx-template.md` |

### Anti-Duplication Rule

- **NEVER** redefine a persona outside `meta/personas.md`
- **ALWAYS** reference personas by their short name
- If a new persona is discovered → add to `meta/personas.md` FIRST, then reference

---

## Input-Adaptive Modes

Before starting, classify what the user has provided and select the right mode.

### Extraction Mode — Rich Input

**Trigger:** User provides substantial existing material (>5KB, detailed docs, chat logs).

**The job:** Don't lose information. Organize, validate, and fill gaps.

**Process:**
1. Read/ingest every document provided
2. **Run Structural Classification** — determine project shape before creating any files
3. Identify natural domain boundaries in the content
4. Create fractal folder structure — run the **Node Classification Gate** for each domain
5. Seed each domain folder (index + CX + feature files) with content from the source
6. Present the organized inventory: "Here's what I extracted, organized by domain"
7. Identify gaps — domains/sub-topics not covered
8. For each gap, switch to Interview Mode
9. Run Deep Think: "Based on your content, I would also expect [X] and [Y]. Are those relevant?"

### Expansion Mode — Thin Input

**Trigger:** Brief notes, rough sketch, short PRD (<5KB, structured but shallow).

**Process:**
1. Read input and identify domain boundaries
2. Create fractal folder structure per Classification Gate
3. For each domain, identify the depth level
4. Start with shallowest domains, ask targeted deepening questions
5. Run Deep Think at each level to identify gaps
6. Update domain indexes and feature files as you go

### Interview Mode — No Input / One-Liner

**Trigger:** No file input. User describes idea verbally.

**Process:**
1. Start: "In one sentence, what problem does this solve and for whom?"
2. **Run Structural Classification** — ask the 2-3 interview questions immediately
3. From the problem statement, identify key nouns → initial domains
4. Create fractal folder structure per Classification Gate
5. Run the Recursive Domain Exhaustion Protocol
6. Use decision classification rule to route questions
7. Don't stop until Deep Think generates zero new hypotheses

---

## Deep Think Protocol

> **This is the core behavioral change.** At every step of ideation, you actively reason
> about what should exist — you don't just record what the user says.

### The Protocol

At **every step** — domain discovery, breadth mapping, vertical drilling — pause and
ask yourself these four questions before moving on:

1. **What have I captured so far in this domain/sub-area?**
2. **What would a domain expert expect to see here that hasn't been surfaced?**
3. **What should exist here because of interactions with other domains?**
4. **What common failure modes or edge cases are missing?**

### Presenting Hypotheses

> "Based on [reasoning], I think [X] might be relevant here. For example, in similar
> systems, [concrete example]. Is this something your product needs?"

**Outcomes:**
- **CONFIRMED** → Add to the domain/feature file. Drill into it.
- **REJECTED** → Note the rejection with reason in the Deep Think table.
- **DEFERRED** → Note as an open question with owner and target stage.

### Tracking

Record all hypotheses in each feature file's Deep Think Annotations table (see `fractal-feature-template.md`).

### Exhaustion Signal

The ideation process is complete for a feature when:
1. Deep Think generates **zero new hypotheses** after a full pass
2. The user confirms "nothing else" for that feature
3. Both conditions must be true simultaneously → mark as `[EXHAUSTED]`

---

## Recursive Domain Exhaustion Protocol

### Level 0 — Global Domain Map

**Goal:** Identify ALL domains before exploring ANY of them.

1. List all domains from user input
2. **Deep Think:** "What domains would a domain expert expect?"
3. Run **Node Classification Gate** for each domain — determine placement
4. Create fractal folder for each: `{number}-{slug}/` + index + CX
5. Update `ideation-index.md` with the complete structure map
6. Note preliminary cross-cuts in global CX + relevant domain CX files
7. **Gate:** User confirms domain list before proceeding

### Level 1 — Domain Breadth Sweep

**Goal:** For each domain, map ALL children before drilling ANY.

For each domain (dependency order — foundational first):
1. List all sub-areas/capabilities
2. **Deep Think:** "What sub-areas would an expert expect in this domain?"
3. Run **Node Classification Gate** for each — sub-domain (folder) or feature (file)?
4. Create children: sub-domain folders or feature files as classified
5. Update domain index (Children table + Role Matrix)
6. Note cross-cuts in domain CX file
7. **NEW DOMAINS DISCOVERED?** → Loop to Level 0
8. **Gate:** User confirms breadth maps before drilling
9. Mark domain status as `[BREADTH]`

### Level 2+ — Vertical Drilling

**Goal:** Drill each child to implementation depth. Deep Think at every step.

For each feature file / sub-domain:
1. Apply the Exhaustion Questions
2. **Deep Think** per feature
3. Write results to feature files (behavior, edge cases, states, Role Lens)
4. Cross-cuts with evidence → add to parent's CX file
5. **Feature reveals 2+ interacting capabilities?** → Run Promotion protocol
6. **NEW DOMAINS DISCOVERED?** → Loop to Level 0
7. When Deep Think yields zero hypotheses AND user confirms → mark `[EXHAUSTED]`

---

## Exhaustion Questions

### For Every Entity
- What are its attributes/fields?
- What are its possible states?
- What triggers each state transition?
- What's the full lifecycle (creation → active use → archival/deletion)?
- Who can create, read, update, delete it?
- What happens when it's referenced by other entities and gets deleted?

### For Every Feature
- What does the user see when they first encounter this feature?
- What's the happy path interaction flow (step by step)?
- What happens when it fails? What error does the user see?
- What happens on partial failure?
- What permissions are required? What happens without them?
- Does it have different states (loading, empty, populated, error)?
- How does it interact with other features?
- What edge cases exist?

### For Every User Type
- What's their primary workflow?
- What's the worst thing they could intentionally do?
- What's the worst thing they could accidentally do?
- What do they see that other user types don't?
- What can they do that other user types can't?
- What's their tolerance for complexity?

### For Every Integration / External System
- What happens when it's unavailable?
- What's the expected latency? What if 10x slower?
- What data format does it use?
- What rate limits exist?
- What happens when the external system changes its API?

---

## Cross-Cut Watch Protocol

Cross-cut detection is **always-on** regardless of mode or level. During all active exploration:

- After each sub-feature: "Does this depend on or affect any other domain?"
- After each edge case: "Which other parts need to know about this failure mode?"
- After each state transition: "Does this trigger anything in another domain?"

When a cross-cut is identified, log it to the appropriate CX file:

| Discovery Level | Where to Log | Confidence |
|----------------|-------------|------------|
| During domain mapping | Parent node's CX file + global `ideation-cx.md` (if cross-surface) | Low |
| During breadth sweep | Domain CX file | Medium |
| During drilling | Sub-domain CX file or feature's cross-cut notes | High |

### Cross-Cut Synthesis Questions

For each confirmed cross-cut (CX entry with High confidence), answer all five synthesis questions per the `fractal-cx-template.md`:

1. **Shared state conflict** — Who owns the entity? Merge strategy?
2. **Trigger chain** — Does A trigger B? Rollback if B fails? Sync/async?
3. **Permission intersection** — Does permission in A affect B?
4. **Notification fan-out** — Does an event in A notify actors in B?
5. **State transition conflict** — Can A and B race? Consistency impact?

---

## Decision Routing During Extraction

| Decision Type | During Ideation | Example |
|---|---|---|
| **Product** | Ask the user. It's their product. | "Should free users be able to...?" |
| **Architecture** | Note for `/create-prd`. Don't burden the user. | "Should we use SQL or NoSQL?" |
| **Implementation** | Note for later. Don't even mention it. | "How should we name the routes?" |

**Exception:** If the user brings up architecture or implementation, engage. Don't refuse — just don't initiate it.

---

## Breadth Before Depth

### No Premature Drilling
Complete the breadth map of all children within a node **before drilling any single child**.

### No Premature Compilation
Don't start writing the vision summary until:
- All leaf nodes are at least `[DEEP]`
- Every Must Have feature explored to ≥Level 2
- Deep Think yields zero new hypotheses across ALL domains
- User has confirmed the coverage map

### Challenge Weak Answers
When the user gives a one-sentence answer to a complex question, don't accept it. Probe.

### Summarize and Validate
After every 5-6 questions, pause and summarize to prevent drift.

### Progress Transparency
Be transparent: "We've explored [N] of [M] domains to DEEP level. [Domain X] is still at BREADTH."

---

## What This Skill Does NOT Do

- **Does not make product decisions** — It extracts them from the user
- **Does not explore architecture** — That's `/create-prd`'s job
- **Does not replace brainstorming** — Brainstorming is lightweight; this is heavyweight extraction
- **Does not produce the vision document** — `ideate-validate` compiles the summary
- **Does not rush** — The entire downstream pipeline depends on the depth produced here
- **Does not prescribe shard boundaries** — That's `/decompose-architecture`'s job
