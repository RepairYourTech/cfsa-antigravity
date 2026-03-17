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

**Prerequisite**: If standalone, verify user provided input via `@file` or verbal. If none, prompt: "What would you like to build? Provide a file or describe your idea."

If `@file` was provided:
- **If file does not exist or is not readable** → **STOP**: "File not found at `[path]`. Provide a valid file path or describe your idea verbally."
- **If file is empty** (0 bytes) → **STOP**: "File at `[path]` is empty. Provide a file with content or describe your idea verbally."
- **If file is readable** → proceed to Step 1.

---

## 1. Input assessment

Read `.agent/skills/prd-templates/references/input-classification.md` — classify the input into one of the five types.

Read `.agent/skills/idea-extraction/SKILL.md` → `## Input-Adaptive Modes` — follow the process for the classified input type.

**BLOCKING GATE**: Classification must produce a single input type. If ambiguous between Rich and Thin, use the 5KB threshold. If ambiguous between Thin and Verbal, check whether a file was provided.

**For Extraction mode (rich input)**: Follow `idea-extraction/SKILL.md` → Extraction Mode Phase 1 steps 1-6.

**BLOCKING GATE — Do NOT proceed to Step 1.3 until the classification table is built.** The classification table (from skill Phase 1 step 4) is a required artifact. No domain folders can be created without it.

**For Expansion mode (thin input)**: Follow `idea-extraction/SKILL.md` → Expansion Mode steps 1-3. Note shallowest domains for priority treatment in `/ideate-discover`.

**For Interview mode (verbal / no input)**: Follow `idea-extraction/SKILL.md` → Interview Mode steps 1-2. Proceed to Step 1.3 immediately after opening question.

## 1.3. Structural Classification

Read `.agent/skills/idea-extraction/SKILL.md` → `## Structural Classification Protocol`. Follow the protocol for the current input type (document vs interview).

**BLOCKING GATE**: Classification must run BEFORE any domain folders are created (Step 1.5). Record the result (`single-surface`, `multi-surface-shared`, `multi-product-hub`, `multi-product-peer`) in `ideation-index.md` under `## Structural Classification`.

## 1.4. Re-run check

Check whether `docs/plans/ideation/ideation-index.md` already exists.

- **Exists** → Present summary (expansion mode, domain count, depth markers). Ask: "An ideation folder already exists. **Continue** or **start fresh**?"
  - **Continue** → skip seeding, jump to Step 1.6
  - **Start fresh** → archive to `docs/plans/ideation-archive-[timestamp]/`, then seed
- **Does not exist** → proceed with seeding.

## 1.4.5. Classification Confirmation (Extraction mode only)

> **BLOCKING GATE**: Before creating ANY domain folder, you MUST complete this step.

1. **Verify the classification table exists.** If it doesn't exist → STOP — go back and run Extraction Mode Phase 1 from `idea-extraction/SKILL.md`.
2. **Present the classification table and proposed domain map to the user.** Follow `idea-extraction/SKILL.md` → Extraction Mode Phase 2 step 7 for what to show.
3. **Wait for user confirmation or corrections.** Do NOT proceed until the user responds.
4. **Apply any corrections** the user provides.
5. **If user rejects the classification entirely** (e.g., "these domains are completely wrong") → return to Step 1 and re-classify from scratch, incorporating the user's feedback as explicit constraints. Do NOT attempt to patch the existing classification — start the classification protocol over.

## 1.5. Seed fractal `ideation/` folder

Read `.agent/skills/prd-templates/references/folder-seeding-protocol.md` and follow it.

Read `.agent/skills/technical-writer/SKILL.md` and follow its methodology.

**BLOCKING GATE**: If Step 1.4.5 was not completed (Extraction mode), STOP — you cannot seed without a confirmed classification.

**Partial failure recovery**: If folder seeding fails mid-way (some domain folders created, others not):
1. List what was successfully created vs. what failed
2. Present to user: "Folder seeding partially failed. [N] of [M] domains created. Retry the remaining [M-N] domains?"
3. If user says retry → seed only the missing domains
4. If user says abort → delete all newly created folders and STOP

**Post-seeding verification gate**: Verify `docs/plans/ideation/.gitkeep` and `docs/plans/ideation/README.md` still exist. If EITHER is missing → **STOP**: "Kit-shipped files were destroyed during seeding. Restore them before continuing."

## 1.6. Engagement Tier Selection (ALL input types)

Read `.agent/skills/prd-templates/references/engagement-tier-protocol.md` for tier definitions and behavior.

Present with the recommended default for this input type (Rich/Thin/Chat → Hybrid, Verbal → Interactive).

**Wait for user answer.** Write the engagement tier to `ideation-index.md` under `## Engagement Tier` immediately.

## 1.6.5. Expansion Mode Selection (ALL input types)

Read `.agent/skills/prd-templates/references/expansion-modes.md` for mode options and default recommendations.

Present the options. **Wait for user answer.** Write expansion mode to `ideation-index.md` under `## Expansion Mode` immediately.

## 2. Load skills

Read `.agent/skills/idea-extraction/SKILL.md` and follow its methodology throughout.

Also read `.agent/skills/resolve-ambiguity/SKILL.md` — use reactively when encountering ambiguity that can be resolved without user input.

### Next step

**STOP** — do NOT proceed to any other workflow. The only valid next step is `/ideate-discover`.

> If invoked standalone, surface this via `notify_user` and wait for user confirmation before running `/ideate-discover`.
