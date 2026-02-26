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
  skills: [idea-extraction, resolve-ambiguity]
  calls-bootstrap: false
---

// turbo-all

# Ideate — Extract

Classify the user's input, apply noise filtering for chat transcripts, and load the skills needed for ideation.

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
4. Proceed to domain mapping (in `/ideate-discover`)

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

### Propose next step

Once input is classified and skills are loaded, proceed to `/ideate-discover` to map domains and build the feature inventory.

> If this shard was invoked standalone (not from `/ideate`), surface this via `notify_user`. If invoked by the parent `/ideate`, this is a natural handoff — the parent orchestrates the transition.

