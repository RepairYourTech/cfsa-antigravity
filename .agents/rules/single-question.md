---
description: One question at a time with options, pros and cons, and a recommendation — never batch questions
trigger: always_on
---

# Single-Question Flow

> Never batch questions. One question at a time. Options, pros and cons, recommendation.

## The Rule

**Every question — to the user OR to yourself — follows the same structure:**

1. **One question only.** Never ask multiple questions in a single message. If you have 5 things to ask, ask the first one. Wait for the answer. Then ask the second.

2. **Present options.** List 2–4 concrete options (not open-ended "what do you want?").

3. **Pros and cons.** Each option gets specific trade-offs — not vague qualities.

4. **Recommend one.** State which option you'd choose and why. The user can override.

## Applies to EVERYTHING

This is not just for user-facing questions. It applies to:

| Scenario | What This Means |
|----------|----------------|
| Asking the user a product decision | One decision at a time, options + recommendation |
| Asking the user a preference | One preference at a time, options + recommendation |
| Internal reasoning ("how should I structure this?") | Enumerate options, weigh trade-offs, pick one |
| Ideation interviews | One domain/feature question at a time |
| PRD stack decisions | One technology choice at a time |
| Ambiguity resolution | One gap at a time |

## Format

```
**[Question in plain language]**

| Option | Pros | Cons |
|--------|------|------|
| A      | ...  | ...  |
| B      | ...  | ...  |
| C      | ...  | ...  |

**Recommendation:** Option B — [specific reason why].
```

For internal reasoning, use the same structure but don't present it to the user — just apply the discipline internally and state your decision with brief reasoning.

## What Gets Flagged

| Pattern | Verdict |
|---------|---------|
| "Here are 5 questions for you:" | ❌ Rejected. Ask one. |
| "What do you think?" (open-ended, no options) | ❌ Rejected. Provide options. |
| "Should we use X?" (no alternatives shown) | ❌ Rejected. Show at least 2 options with trade-offs. |
| One question + 3 options + pros/cons + recommendation | ✅ Correct. |
| "I chose X because [reason]" (internal, stated briefly) | ✅ Correct. |
