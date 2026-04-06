# Input Classification Table

Classify user-provided input to determine which mode the `idea-extraction` skill operates in.

| Input Type | Detection Criteria | Extraction Mode |
|---|---|---|
| **Rich document** | >5KB, detailed docs, design conversations, prior specs | Extraction |
| **Thin document** | <5KB, structured but shallow (bullet list, rough PRD) | Expansion |
| **Conversational dump** | Chat logs, unstructured conversation transcripts | Extraction (with noise filtering) |
| **Verbal / one-liner** | User describes idea in chat, no files | Interview |
| **Nothing** | "I want to build an app" or similar zero-context input | Interview (deep) |

## Mode References

Each mode's full process is defined in `.agent/skills/idea-extraction/SKILL.md`:

- **Extraction Mode** → `## Input-Adaptive Modes → Extraction Mode — Rich Input`
- **Expansion Mode** → `## Input-Adaptive Modes → Expansion Mode — Thin Input`
- **Interview Mode** → `## Input-Adaptive Modes → Interview Mode — No Input / One-Liner`

## Proportionality Rule (Extraction Mode only)

If source input > 50KB, total ideation output must be ≥ 30% of source line count.
