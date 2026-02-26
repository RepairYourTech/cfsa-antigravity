---
description: Execute the audit one document at a time, compile report, remediate gaps, and propose next steps for the audit-ambiguity workflow
parent: audit-ambiguity
shard: execute
standalone: true
position: 2
pipeline:
  position: utility
  stage: quality-gate
  predecessors: [audit-ambiguity-rubrics]
  successors: []
  skills: [resolve-ambiguity, technical-writer]
  calls-bootstrap: false
---

# Ambiguity Audit — Execute

Audit each document one at a time, compile the report, remediate gaps, and propose next steps.

**Prerequisite**: Audit scope must be determined and rubrics loaded (from `/audit-ambiguity-rubrics` or equivalent). The agent should know which layers and documents to audit.

---

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

## 5. Remediate gaps (mandatory — execute automatically after Step 4)

Do NOT stop and ask the user what to do. After compiling the report in Step 4, immediately execute this step for every ⚠️ and ❌ in the punch list.

1. Read `.agent/skills/resolve-ambiguity/SKILL.md` and execute the resolution process inline — do not invoke it as a separate command.
2. For each gap, classify using the skill's two-path model:
   - **Judgment calls** (Intent/Choice gaps — no source has the answer): present to user with smart options ordered by recommendation; wait for user decision before applying any fix.
   - **Mechanical fixes** (Technical/Factual gaps — answer exists in project docs, architecture files, upstream specs, or official sources): propose the fix with source citation; apply after user approval.
3. Resolve judgment calls first — they may change what mechanical fixes are needed.
4. Present findings organized by type: judgment calls first, mechanical fixes second.
5. Apply all approved fixes to the relevant spec documents.
6. After all fixes are applied, propose: "Next: Re-run `/audit-ambiguity [layer]` as a fresh invocation to verify the fixes. The session that fixed gaps cannot be the session that passes them."

> **Fresh-run rule**: The session that fixed gaps cannot be the session that passes them. The agent that fixed the gaps cannot grade its own homework.

## 6. Propose next steps

Use `notify_user` to present the audit report.

### If gaps were found:
After completing remediation in Step 5, propose: "Next: Re-run `/audit-ambiguity [layer]` as a fresh invocation. The session that fixed gaps cannot grade its own homework."

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
