# Decision Confirmation Protocol

**Purpose**: Every decision that gets written to a spec or instruction file MUST be explicitly confirmed before writing. This protocol replaces all "refine based on discussion" patterns.

---

## Procedure

### 1. Present

Present the decision to the user with:
- The specific question or choice
- Your recommendation and reasoning
- The options (if applicable)
- Where the decision will be written (file + section)

### 2. Wait for Confirmation

**HARD GATE** — Do NOT write anything until the user explicitly confirms.

Acceptable confirmations: explicit "yes", "approved", "confirmed", "go ahead", "looks good", selection of an option, or equivalent affirmative.

NOT acceptable: silence, moving on to other topics, ambiguous responses. If ambiguous → ask again.

### 3. Handle Requests for Changes

If the user requests changes:
1. Apply the requested changes to your proposed content
2. Re-present the updated version
3. Return to Step 2 — wait for confirmation again

Do NOT write a partially-confirmed version. The full content must be confirmed before writing.

### 4. Write

After confirmation, write the decision to the target file + section.

### 5. Verify Write

Follow the write verification protocol (`.agent/skills/prd-templates/references/write-verification-protocol.md`):
- Read back the target file
- Verify the section header exists and content matches what was confirmed
- If missing or mismatched → write failed, retry

---

## Tier-Aware Variant (for /create-prd workflows)

When the current engagement tier is known:

| Tier | Behavior |
|------|----------|
| **Interactive** | Full present → wait → confirm → write cycle per decision |
| **Hybrid** | Group related decisions, present batch, confirm batch, write batch |
| **Auto** | Use Deep Think reasoning, write with `[AUTO-CONFIRMED]` tag, present all auto-confirmed decisions for batch review at end of shard |

**Even in Auto mode**, the user reviews and can reject auto-confirmed decisions at the batch review step. Rejection triggers re-presentation at Interactive tier for that decision.

---

## What This Replaces

This protocol replaces all instances of:

> ~~"Refine based on discussion before proceeding"~~
> ~~"Adjust based on feedback"~~

Those patterns allow agents to skip refinement and write unconfirmed content. This protocol requires explicit confirmation before any write.
