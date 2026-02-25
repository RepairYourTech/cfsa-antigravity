---
description: Structured idea extraction from raw input to vision document — input-adaptive, domain-exhaustive, production-grade from the first conversation
pipeline:
  position: 1
  stage: vision
  predecessors: [] # entry point
  successors: [create-prd]
  skills: [idea-extraction, resolve-ambiguity]
  calls-bootstrap: false
---

// turbo-all

# Ideate

## Invocation Patterns

| Invocation | Behavior |
|---|---|
| `/ideate` | Starts an interactive interview from scratch |
| `/ideate @path/to/file.md` | Reads the file, classifies it automatically, enters the appropriate mode |

### Input Types and Modes

| Input Type | Detection | Mode Triggered |
|---|---|---|
| Rich document | >5KB, detailed docs, design conversations, prior specs | Extraction — captures existing depth, fills gaps via interview |
| Thin PRD | <5KB, structured but shallow (bullet list, rough PRD) | Expansion — deepens every section via domain exhaustion |
| Chat transcript | Chat logs, unstructured conversation transcripts | Extraction + noise filter — extracts signal, discards noise, fills gaps |
| One-liner / verbal | User describes idea in chat, no files | Interview (deep) — builds vision from scratch domain by domain |

**Quality guarantee**: All four input types produce the **same output quality**. The vision document that emerges from a one-liner is structurally and substantively identical to one produced from a rich document. Only the amount of interview work differs.

Transform a raw idea into a comprehensive vision document through exhaustive exploration.

> This pipeline does not build MVPs. The ideation phase is where the entire downstream
> pipeline gets its DNA. If the vision is shallow, every spec, every architecture decision,
> every line of code downstream will be shallow. Treat this phase with the seriousness it
> deserves.

**Output**: `docs/plans/vision.md` (and optional domain appendices)

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
2. **Proportionality check**: If the source document is over 50KB, the vision output (including appendices) must be at least 30% of the source document's line count. If it falls short, the agent must identify what was lost and recover it before presenting the vision.
3. Enumerate what maps to vision domains (problem, personas, features, constraints, etc.)
4. Present the organized inventory to the user for confirmation: "Here's what I found, organized by domain. Is anything missing or wrong?"
5. Identify gaps — domains or sub-topics not covered
6. For each gap, switch to Interview mode for that topic
7. Use idea-extraction skill to refine and deepen, not to re-derive what's already known

**For thin inputs (Expansion mode):**
1. Read the input and map its sections to vision domains
2. Identify which sections are surface-level vs implementation-ready
3. Start with the shallowest sections
4. Use idea-extraction skill to deepen each one

**For verbal / no input (Interview mode):**
1. Read `.agent/skills/idea-extraction/SKILL.md` and enter Interview mode
2. Start with: "In one sentence, what problem does this solve and for whom?"
3. From that sentence, identify the key nouns — these become initial domains
4. Proceed to domain mapping (Step 3)

## 1.5. Noise filter (chat transcripts only)

> **This step activates only when the input is classified as "Conversational dump".** Skip for all other input types.

Chat transcripts contain signal buried in noise. Before proceeding to domain mapping, extract the signal:

1. **Read the full transcript** end-to-end without summarizing
2. **Extract all decisions made** — explicit commitments, confirmed directions, agreed-upon approaches
3. **Extract all ideas proposed** — suggestions, feature ideas, design concepts (whether accepted or not yet decided)
4. **Extract all explicitly rejected ideas** — ideas that were discussed and deliberately discarded (with reasons if stated)
5. **Discard filler** — repetition, tangents, social pleasantries, overridden AI responses, abandoned threads
6. **Present the extracted signal** to the user for confirmation before proceeding: "Here's the signal I extracted from your conversation. Is anything missing or incorrectly categorized?"

Only proceed to Step 2 after the user confirms the extracted signal is accurate.

## 2. Load skills

Read `.agent/skills/idea-extraction/SKILL.md` and follow its methodology throughout this workflow.

Also read `.agent/skills/resolve-ambiguity/SKILL.md` — use it reactively when encountering
ambiguity that can be resolved without user input (technical/factual questions). For
intent/choice questions, use the decision classification rule.

## 3. Domain mapping

Before diving into features, enumerate the **domains** of the project. This creates the
coverage map that drives the exhaustion protocol.

**How to identify domains:**
- Parse the user's input (or initial description) for key nouns and concepts
- Group related concepts into domains
- Present the domain list to the user: "Based on what you've described, I see these domains: [list]. Is anything missing?"

**Examples by project type:**
- **Trading platform:** Strategies, Risk Management, Execution, Market Data, AI/ML, Analytics, Portfolio, UI/UX, Infrastructure, Security, Compliance
- **MOBA game:** Heroes, Abilities, Maps, Items, Matchmaking, Progression, Monetization, Social, Anti-cheat, Spectating
- **SaaS platform:** User Management, Billing, Core Product, Integrations, Analytics, Support, Admin/Ops, Security, Compliance

The domain list becomes the coverage map. Track exploration depth for each domain throughout
the conversation.

## 4. Problem exploration

Using the idea-extraction skill's approach for the selected mode, explore:

1. **What problem are we solving?** — Get the user to articulate the core pain point in one sentence. If they can't, help them sharpen it.
2. **Who has this problem?** — Identify 2-4 distinct user personas with different needs. For each persona, explore:
   - Name and role
   - Their primary pain point
   - How they solve it today (workarounds)
   - What success looks like for them
   - What would make them switch from their current solution
3. **How are they solving it today?** — Understand the competitive landscape and current workarounds
4. **Why now?** — What has changed that makes this solvable/valuable now

After each answer, summarize what you've captured and ask the user to confirm before moving on.

**Depth check:** If any persona description is less than 3 sentences, it's too shallow. Probe deeper.

## 5. Feature inventory — deep exploration

This is where most ideation workflows fail. They collect a feature list and move on.
This workflow explores each feature to multiple levels of depth.

### 5a. Feature collection (MoSCoW)

For each persona identified in Step 4, brainstorm features:

1. **Must-have features** — What features are launch-blocking?
2. **Should-have features** — What features are expected but not day-one critical?
3. **Could-have features** — What features would delight but can be deferred?
4. **Won't-have (now)** — What is explicitly out of scope?

Present the MoSCoW matrix to the user for validation.

> **Note:** Deferred ≠ lower quality. Every feature that makes the cut will be
> built to production standard. The categories control *what* ships, not *how well*
> it's built.

### 5b. Feature deepening — Must Haves

For each **Must Have** feature, use the idea-extraction skill's Domain Exhaustion Protocol
to explore at least 2 levels deep:

**Level 1: Sub-features.** What are the component parts of this feature?
- "User authentication" → signup, login, password reset, profile management, account deletion, session management, OAuth providers

**Level 2: Edge cases and failure modes.** For each sub-feature:
- What happens on failure? What error does the user see?
- What happens on partial failure? (network drops mid-operation)
- What permissions are required?
- What are the states? (loading, empty, populated, error)

**Level 3 (for complex features): Interactions and conflicts.**
- How does this feature interact with other Must Haves?
- What if two features trigger simultaneously?
- Are there any conflicts between features?

**Decision routing:** When feature decisions arise, use the decision classification rule:
- Feature inclusion/exclusion → product decision → ask the user
- How to implement the feature → defer to `/create-prd`
- Detailed technical choice → note for later, don't burden the user

### 5c. Feature deepening — Should Haves (lighter touch)

For Should Have features, explore Level 1 (sub-features) only. Note that these will get
full Level 2-3 treatment in `/create-prd` when they enter scope.

## 6. Constraints and non-functionals

Explore constraints through targeted questions:

1. **Budget** — Self-funded? VC-backed? Impacts hosting and infra decisions
2. **Timeline** — Production launch target? Phased rollout?
3. **Team** — Solo dev? Small team? Impacts architecture complexity
4. **Compliance** — Age restrictions? GDPR? PCI? COPPA? HIPAA?
5. **Performance** — Expected scale? Latency requirements?

### Project surface classification

This is one of the most important architectural inputs. Classify the project:

| Surface Type | Description | Examples |
|-------------|-------------|---------|
| **Web app** | Browser-based application | SaaS dashboard, marketing site, customer portal |
| **Desktop app** | Native or hybrid desktop application | POS system, IDE, media editor, CAD tool |
| **Mobile app** | Native or hybrid mobile application | iOS/Android app, field service tool |
| **CLI tool** | Command-line interface | Build tool, dev utility, automation script |
| **API service** | Backend-only, consumed by other systems | Payment gateway, data pipeline, integration layer |
| **Multi-surface** | Multiple connected applications | Desktop POS + web portal, mobile app + web dashboard + API |

Ask explicitly:

1. **What surfaces does this project have?** — It may be more than one
2. **For desktop/mobile: cross-platform?**
   - Desktop: Windows + macOS + Linux? Or single OS?
   - Mobile: iOS + Android? Or single platform?
   - Desktop + Mobile shared: Same codebase across desktop AND mobile? (Flutter, Kotlin Multiplatform, .NET MAUI)
3. **For multi-surface: how are they connected?**
   - What data/functionality is shared between surfaces?
   - Does any surface need to work offline?
   - Are they one product or separate products that integrate?

> **Why this matters**: The surface classification drives folder structure in
> `/decompose-architecture`, tech stack decisions in `/create-prd`, and the
> shape of every spec downstream. Getting it right here prevents rework later.

Record the classification in the Constraints section of vision.md with enough detail for `/create-prd` to act on it.

## 7. Success metrics

Define measurable success criteria:

1. **Launch criteria** — What must be true to ship? (Every item must be production-grade)
2. **Growth metrics** — DAU, retention, conversion targets (even rough estimates)
3. **Technical metrics** — Platform-appropriate performance targets:
   - Web: Core Web Vitals (LCP, FID, CLS), bundle size, uptime SLA
   - Desktop: Cold start time, memory footprint, installer size
   - Mobile: App launch time, battery impact, app download size
   - CLI: Execution time, binary size, startup latency
   - API: Response time (p50/p95/p99), throughput, error budget
   - Multi-surface: Per-surface targets + sync latency between surfaces

## 8. Competitive positioning

Ask the user:

1. **Who are the top 3 competitors?** — Or search the web to find them
2. **What's the unique angle?** — Why would someone choose this over alternatives?
3. **What's the moat?** — What's defensible long-term?

## 9. Domain exhaustion check

Before compiling the vision document, check the domain coverage map:

1. **Display the coverage map** to the user: "Here's where we are across all domains."
2. **Flag under-explored domains** — any domain with <3 explored sub-topics
3. **For each under-explored domain, ask:** "We haven't gone deep on [domain]. Should we explore it now, or is it intentionally minimal?"
4. **Continue exploring** until all domains reach ≥3 sub-topics explored OR the user explicitly confirms the domain is intentionally minimal

Only proceed to compilation when:
- Overall coverage ≥80%
- Every Must Have feature explored to ≥Level 2
- User has confirmed the coverage map

## 10. Vision deepening pass

Before compiling, do one deepening pass across the entire captured material:

1. **Persona gaps** — For each persona: "Is there a scenario where this persona's needs conflict with another's?" Add any conflicts found.
2. **Feature completeness** — For each Must Have: "What implicit sub-features does this require?" (e.g., "user accounts" implies signup, login, password reset, profile management, account deletion). Surface the implicit features and confirm with the user.
3. **Constraint interactions** — Do any constraints conflict? (e.g., "launch in 3 months" vs "COPPA compliance" may be in tension). Surface conflicts for the user to resolve.
4. **Surface completeness** — For multi-surface projects: does every surface have clear ownership of its features? Are there features that span surfaces without a clear primary owner?
5. **Missing "Won't Have"** — Are there obvious features the user hasn't explicitly excluded that might creep in? Add them to Won't Have for clarity.

Present findings to the user. Refine based on discussion.

## 11. Compile vision document

Create `docs/plans/vision.md` with this structure:

```markdown
# [Project Name] — Vision

> One-sentence pitch: [from Step 4]

## Problem Statement
[From Step 4, refined]

## User Personas
[2-4 personas with name, role, pain point, success criteria, switching trigger]

## Feature Inventory (MoSCoW)
### Must Have (Phase 1)
[Each feature with sub-features and key edge cases — Level 2 depth minimum]
### Should Have (Phase 2)
[Each feature with sub-features identified]
### Could Have (Phase 3+)
### Won't Have (explicitly excluded)

## Constraints
[Budget, timeline, team, compliance, performance]

### Project Surfaces
[Surface classification — which surfaces, cross-platform decisions,
multi-surface connections. This section drives /create-prd tech stack decisions.]

## Success Metrics
[Launch criteria, growth targets, platform-appropriate technical targets]

## Competitive Landscape
[Competitors, unique angle, defensible moat]

## Domain Coverage Summary
[Summary of all explored domains with depth indicators.
References to appendices for domain-rich topics.]

## Open Questions
[Anything unresolved that needs answers before architecture — with owners and deadlines]
```

### Domain appendices (for complex projects)

If any domain has extensive material that doesn't fit the vision template
(hero rosters, order system state machines, algorithm specifications, detailed interaction
flows), create domain appendix files:

- Path: `docs/plans/vision-appendix-{domain-slug}.md`
- Reference from the main vision.md: `See [Domain Name Appendix](vision-appendix-{domain-slug}.md)`
- Examples: `vision-appendix-hero-roster.md`, `vision-appendix-order-systems.md`, `vision-appendix-ai-orchestration.md`

These appendices are consumed by downstream workflows (`/create-prd`, `/decompose-architecture`)
as additional context alongside the main vision document.

**When to create appendices:**
- A domain section in vision.md would exceed ~100 lines of detail
- The domain has specific technical artifacts (state machines, algorithms, formulas)
- The domain has enumeration-heavy content (lists of items, types, categories)

## 12. Quality gate and next steps

### Self-check against Vision rubric

Before presenting to the user, self-check the vision document:

| # | Dimension | Check |
|---|-----------|-------|
| 1 | Problem Clarity | Is the problem one sentence, specific, and testable? |
| 2 | Persona Specificity | Are personas named with pain points + success criteria + switching trigger? |
| 3 | Feature Completeness | Is MoSCoW complete? Are Must Haves explored to ≥Level 2 depth? |
| 4 | Constraint Explicitness | Are all axes (budget, timeline, team, compliance, performance) addressed? |
| 5 | Success Measurability | Are there concrete numbers/thresholds? |
| 6 | Competitive Positioning | Are competitors named with differentiation? |
| 7 | Open Question Resolution | Do all open questions have owners + deadlines? |
| 8 | **Input-Output Proportionality** | Is the vision output proportional to input richness? Rich inputs must produce rich visions. |
| 9 | **Domain Coverage** | Has every identified domain been explored to ≥3 levels of depth? Are appendices created for complex domains? |
| 10 | **Input-Output Fidelity** | For rich inputs, every major section of the source document maps to at least one section of the vision output. If a source section has no corresponding vision content, it was dropped — find it and recover it. |

For any dimension that scores ⚠️ or ❌, resolve it NOW — don't present a document with known gaps.
Loop back to the relevant step and work through it with the user.

> **Dimension 8 is critical.** If the user provided a 738KB input document and the vision
> is under 200 lines without appendices, this is a FAIL. Go back and extract what was lost.

> **Note**: This is an internal self-check, not a formal audit. For a rigorous,
> independent audit with evidence citations, run `/audit-ambiguity vision` as a
> separate step after this workflow completes.

### Request review

Use `notify_user` to request review of `docs/plans/vision.md` (and any appendices). Include:
- Summary of the self-check results (all 9 dimensions)
- Any areas where you resolved gaps during the self-check
- The final domain coverage map

The vision must be approved before proceeding.

### Proposed next steps

Once approved, present the user with the appropriate next step:

- **Default recommendation**: Run `/audit-ambiguity vision` — recommended for any input that was NOT already a rich document
- **Skip condition**: Only skip `/audit-ambiguity vision` if the input was a rich document AND all 10 dimensions scored ✅. In that case, recommend `/create-prd` directly.
