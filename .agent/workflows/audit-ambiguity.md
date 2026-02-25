---
description: Measure coverage and ambiguity across all pipeline layers (Vision, Architecture, IA, BE, FE) with scored reports
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [] # callable from any stage
  successors: [] # returns to caller
  skills: [resolve-ambiguity, code-review-pro, technical-writer]
  calls-bootstrap: false
---

# Ambiguity Audit

Audit pipeline output completeness and identify gaps that would force guesswork during implementation.

**Usage**: `/audit-ambiguity` — you'll be asked which layer(s) to audit.

---

## 0. Load audit skills

Read these skills for review guidance:
1. `.agent/skills/code-review-pro/SKILL.md` — Review methodology
2. `.agent/skills/technical-writer/SKILL.md` — Spec clarity standards

---

## 1. Determine audit scope

Ask the user:
- `vision` — Audit vision document only
- `architecture` — Audit architecture design only
- `ia` — Audit IA shards only
- `be` — Audit BE specs only
- `fe` — Audit FE specs only
- `all` — Full cascade (Vision → Architecture → IA → BE → FE)

## 2. Load source documents

| Layer | Documents to load |
|-------|-------------------|
| Vision | `docs/plans/vision.md` |
| Architecture | `docs/plans/*-architecture-design.md`, `docs/plans/ENGINEERING-STANDARDS.md` |
| IA | `docs/plans/ia/index.md` + each shard listed |
| BE | `docs/plans/be/index.md` + each spec listed |
| FE | `docs/plans/fe/index.md` + each spec listed |

---

## Vision Rubric (7 dimensions)

| # | Dimension | ✅ | ⚠️ | ❌ |
|---|-----------|----|----|-----|
| 1 | Problem Clarity | One sentence, specific, testable | Vague or multi-problem | Missing |
| 2 | Persona Specificity | Named, with pain points + success criteria | Named but generic | Missing or "users" |
| 3 | Feature Completeness | MoSCoW with clear scope per item | Some items vague | Missing categories |
| 4 | Constraint Explicitness | All axes addressed with specific values | Some mentioned | Missing |
| 5 | Success Measurability | Concrete numbers/thresholds | Directional only | Missing |
| 6 | Competitive Positioning | Named competitors + differentiation | Vague positioning | Not addressed |
| 7 | Open Question Resolution | All questions have owners + deadlines | Questions listed, no owners | No questions section |

## Architecture Rubric (9 dimensions)

| # | Dimension | ✅ | ⚠️ | ❌ |
|---|-----------|----|----|-----|
| 1 | Tech Stack Decisiveness | Every axis decided with rationale | Some TBDs | Major gaps |
| 2 | System Architecture | All components, flows, failure modes | Some flows missing | Diagram only |
| 3 | Data Strategy | Placement, schema, queries, migrations, PII | Some missing | Sketched only |
| 4 | Security Model | Auth, authz, validation, rate limits, CSP | Some flows vague | Not addressed |
| 5 | Compliance Depth | Full flows for each regulated domain | Mentioned but shallow | Not addressed |
| 6 | API Design | Surface, versioning, conventions, errors, pagination | Some conventions missing | Not addressed |
| 7 | Integration Robustness | All externals with failure + fallback | Some missing fallbacks | Externals unnamed |
| 8 | Phasing Clarity | Dependency-ordered with entry/exit criteria | Phases listed, no criteria | No phasing |
| 9 | Engineering Standards | All thresholds concrete | Some TBDs | Missing |

## IA Rubric (8 dimensions)

| # | Dimension | ✅ | ⚠️ | ❌ |
|---|-----------|----|----|-----|
| 1 | Feature Enumeration | All listed, clear scope | Some vague | Major features missing |
| 2 | Access Model | All roles defined | Some implied | No access model |
| 3 | Data Model | Schema-ready | Structure unclear | Absent |
| 4 | User Flows | All paths covered | Happy path only | None |
| 5 | Cross-Shard Contracts | Bidirectional | One-way | None |
| 6 | Edge Cases | Listed | Some mentioned | None |
| 7 | Deep Dive Coverage | Integrated | Partial | Not reflected |
| 8 | Testability | All testable | Some subjective | Mostly subjective |

## BE Rubric (10 dimensions)

| # | Dimension | ✅ | ⚠️ | ❌ |
|---|-----------|----|----|-----|
| 1 | Upstream Traceability | All traceable | Some inferred | Orphan endpoints |
| 2 | Contract Completeness | All schemas complete | Some vague | Major missing |
| 3 | Error Exhaustiveness | All coded | Some missing | Vague |
| 4 | Schema Completeness | Production-ready | Constraints missing | Sketched only |
| 5 | Middleware Explicitness | Full matrix | Some missing | No matrix |
| 6 | State Transitions | Lifecycle defined | No transition rules | No lifecycle |
| 7 | Concurrency | Strategy defined | Mentioned | Not addressed |
| 8 | Pagination & Limits | All defined | Some missing | No strategy |
| 9 | Integration Seams | All documented | Some vague | Unnamed |
| 10 | Security Rules | All explicit | Some assumed | Not mentioned |

## FE Rubric (10 dimensions)

| # | Dimension | ✅ | ⚠️ | ❌ |
|---|-----------|----|----|-----|
| 1 | Upstream Traceability | All traceable | Some inferred | No mapping |
| 2 | Component Inventory | Full tree | Some missing | Vague |
| 3 | State Management | All mapped | Some missing | Unspecified |
| 4 | Interactions | All defined | Some implicit | Unspecified |
| 5 | Routing | All routes | Some guards missing | Vague |
| 6 | Responsive | All breakpoints | Mobile mentioned | Not addressed |
| 7 | Accessibility | WCAG-ready | Partial | Not addressed |
| 8 | Error/Loading States | All defined | Some missing | None |
| 9 | Performance | Targets set | Some mentioned | Not addressed |
| 10 | Security Rules | All explicit | Some assumed | Not mentioned |

## Scoring

- ✅ = 0 points, ⚠️ = 0.5 points, ❌ = 1 point
- `ambiguity% = (points / applicable_checkpoints) × 100`

## 3. Audit each document (one at a time)

**CRITICAL ANTI-HALLUCINATION RULE**: You MUST NOT read all documents at once. You must follow this strict sequence for every single document, one by one:
1. Use your file reading tool to read Document A.
2. Immediately score Document A and write its scores + citations to the punch list report.
3. Only AFTER writing Document A's scores, use your file reading tool to read Document B.
Failure to follow this one-by-one sequence guarantees hallucinated citations and audit failure.

For each document, follow this sequence:

**a. Read** — Use a file reading tool to read the entire document end-to-end. Do not score yet.

**b. Score with evidence** — Score each dimension. Every score MUST include a citation:
- ✅ → Quote the specific text/section that satisfies this dimension
- ⚠️ → Quote what exists AND state precisely what is missing
- ❌ → List the section headings you checked and confirm the content is absent

**c. Classify gaps** (BE/FE only) — Determine if each ⚠️/❌ is a local gap or upstream dependency.

**d. Verify** — Re-read the document with your findings in hand. For every ⚠️ and ❌, search one more time to confirm the gap is real. Upgrade any false negatives to the correct score.

**e. Finalize** — Lock this document's scores. Move to the next document.

> ⚠️ **Anti-hallucination rule**: If you cannot point to the exact section where something IS or ISN'T, you have not read carefully enough. Re-read before scoring.

## 4. Compile report

Create report at `docs/audits/[layer]-ambiguity-report.md`:
- Per-document score table
- Overall ambiguity percentage
- Punch list: every ⚠️ and ❌ with evidence citation, gap description, and fix location
- Upstream dependency gaps (for Architecture/BE/FE)

## 5. Remediate gaps using `resolve-ambiguity`

For each gap in the punch list, use the `resolve-ambiguity` skill to classify and resolve it:

1. **Read** `.agent/skills/resolve-ambiguity/SKILL.md`
2. **For each ⚠️/❌ gap**, classify using `resolve-ambiguity`:
   - **Technical/Factual gap** → Run tiered lookup. If the answer exists in project docs, architecture files, upstream specs, or official sources, the gap is **mechanical** — propose the fix with the source citation.
   - **Intent/Choice gap** → No source has the answer. The gap is a **judgment call** — present to user with smart options ordered by recommendation.
3. **Present findings** organized by type:
   - **Judgment calls first** — these need user discussion before anything can be fixed
   - **Mechanical fixes second** — propose all fixes with source citations for user approval
4. **Apply approved fixes** to the relevant specs
5. **Propose fresh audit**: "Next: Re-run `/audit-ambiguity [layer]` as a **fresh audit** to verify"

> **Fresh-run rule**: The session that fixed gaps cannot be the session that passes them. The agent that fixed the gaps cannot grade its own homework.

## 6. Propose next steps

Use `notify_user` to present the audit report.

### If gaps were found:
Follow the remediation process in Step 5.

### If ambiguity is 0%:

> **Passing criteria**: A layer passes the ambiguity gate ONLY when ALL THREE conditions are met:
> 1. **Fresh run** — This must be a clean invocation, NOT a re-check within the same session that fixed gaps. The agent that fixed the gaps cannot grade its own homework.
> 2. **0% score** — No ⚠️ or ❌ on any dimension across all documents in the layer.
> 3. **User confirmation** — The user explicitly confirms they have nothing else to add. The audit only checks what's written against the rubric — it cannot know about features or edge cases the user hasn't mentioned yet.

If all three conditions are met, propose the next pipeline step:
- **Vision audit passed** → "Vision is clean and confirmed. Next: Run `/create-prd` to design the architecture"
- **Architecture audit passed** → "Architecture is clean and confirmed. Next: Run `/decompose-architecture` to create IA shards"
- **IA audit passed** → "IA layer is clean and confirmed. Next: Run `/write-be-spec` for the first IA shard that needs a BE spec"
- **BE audit passed** → "BE layer is clean and confirmed. Next: Run `/write-fe-spec` for the first BE spec that needs an FE spec"
- **FE audit passed** → "FE layer is clean and confirmed. Next: Run `/plan-phase` to create implementation slices"

If the user wants to add something despite 0% score, incorporate their additions into the relevant documents and re-run the audit as a fresh invocation.

---

## Key Principles

- **One document at a time** — Read, score, verify, finalize. Never batch-read and score from memory.
- **Every score needs evidence** — A ✅ without a citation is lazy. A ❌ without listing what you searched is a potential hallucination.
- **Verify before finalizing** — Re-read with findings in hand. This is the hallucination catch.
- **Read the full document** — Don't skim. Ambiguity hides in the details.
- **Be specific** — "Error handling incomplete" is not a finding. "POST /v1/reviews has no error code for duplicate review" IS a finding.
- **Open questions ≠ ambiguity** — Explicitly flagged unknowns are known unknowns, not gaps.
- **Score honestly** — The goal is to find real gaps, not to produce a good number.
- **Upstream first** — Fix Vision gaps before Architecture, Architecture before IA, IA before BE, BE before FE.
- **Resolve, don't just report** — Use `resolve-ambiguity` to classify and fix gaps, not just list them.
