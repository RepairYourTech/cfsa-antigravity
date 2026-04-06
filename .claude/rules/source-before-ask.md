---
description: Before any question or decision, reason about what source documents are relevant, read them, then speak — never ask from summaries alone
trigger: always_on
---

# Source Before Ask

> Never present a question, decision, or recommendation to the user without first reading the source documents that inform it. Feature names are not features. Summaries are not specs.

## The Rule

**Before presenting ANY question, decision, option table, or recommendation to the user:**

1. **Reason about relevance.** Ask yourself: "What domains, features, deep dives, CX files, or specs contain detail that affects THIS specific decision?" Think about second-order connections — a database decision doesn't just touch the "data" domain; it touches every domain that has complex query patterns, real-time sync, or graph relationships.

2. **Read those documents.** Not the summary. Not the index line. The actual source files that contain the architectural detail. If a domain has deep dives (`[DEEP]` or `[EXHAUSTED]` status), read the deep dive files — they contain the information that changes the answer.

3. **Cite what you found.** When presenting the question or decision, reference what you learned: "Based on the diagnostics deep dive, your multi-agent repair flow requires X, which means option A fits better than B because..."

4. **Only then ask.** Now you're asking an informed question that the user can answer without doing your research for you.

## The Per-Decision Research Loop

This loop fires for EVERY decision point, not once per workflow:

```
For each question/decision/recommendation:
  1. STOP — do not type anything to the user yet
  2. THINK — what ideation/spec/CX content is relevant to THIS decision?
     - Which domains does this decision affect?
     - Which features have architectural constraints that change the answer?
     - Which cross-cuts create dependencies?
     - Which deep dives contain the detail I need?
  3. READ — open and read those specific files now
  4. SYNTHESIZE — what did I learn that affects this decision?
  5. PRESENT — now ask the question, citing what you found
```

## Common Relevance Patterns

| Decision Type | What to Read Before Asking |
|--------------|---------------------------|
| Frontend framework | Every domain with UI complexity, responsive requirements, offline-first features, real-time updates |
| Database / persistence | Every domain with complex data relationships, sync requirements, search patterns, graph traversals |
| AI/ML framework | Every domain that mentions AI, ML, diagnostics, recommendations, automation, agents |
| Auth / security | Every domain's role matrix, CX files for cross-domain permission boundaries |
| API design | Every domain's CX files for cross-domain data flow, every deep dive with integration points |
| Deployment / hosting | Constraints file, every surface's performance requirements, offline capabilities |
| State management | Every domain with real-time features, collaborative editing, optimistic updates |
| Caching strategy | Every domain's query patterns, hot paths, data freshness requirements |

## Why

| Without this rule | With this rule |
|---|---|
| Agent asks "which database?" based on a MoSCoW bullet | Agent reads the graph traversal deep dive and knows you need a graph-capable store |
| User has to say "go read the docs" 15 times per session | Agent arrives at each question already informed |
| Decisions feel generic — could apply to any project | Decisions are grounded in YOUR project's specific architecture |
| Context evaporates after Step 0.5's bulk loading | Context is refreshed per-decision, exactly when it matters |
| Agent asks questions the ideation already answered | Agent knows what's been decided and asks only what's open |

## Applies To

**Every pipeline stage.** This is not limited to `/create-prd`:

| Stage | What This Means |
|-------|----------------|
| `/create-prd-stack` | Before each axis question, read the domains that axis touches |
| `/create-prd-architecture` | Before each component design, read the domains that component serves |
| `/create-prd-security` | Before each security item, read the role matrices and CX trust boundaries |
| `/write-architecture-spec` | Before each interaction design, read the relevant domain deep dives |
| `/write-be-spec` | Before each endpoint design, read the IA shard interactions that endpoint serves |
| `/write-fe-spec` | Before each component spec, read the BE endpoints and IA interactions it consumes |
| `/implement-slice` | Before each implementation decision, read the relevant specs |

## What Gets Flagged

| Pattern | Verdict |
|---------|---------|
| "Which database do you prefer?" without reading any domain files | ❌ Rejected. Read the domains first — the answer might be obvious. |
| Presenting 3 framework options with generic pros/cons | ❌ Rejected. Pros/cons must reference THIS project's specific needs. |
| Asking a question the ideation deep dives already answered | ❌ Rejected. Read before asking. |
| "Based on your diagnostics domain's multi-agent flow, you need X" | ✅ Correct. Informed by source material. |
| Citing specific CX dependencies when recommending architecture | ✅ Correct. Research before recommendation. |
| Re-reading a deep dive mid-workflow because THIS question needs it | ✅ Correct. Per-decision freshness. |

## The Litmus Test

Before sending any question to the user, ask yourself:

> **"Could a user reasonably respond: 'Did you even read my ideation docs?'"**

If the answer is yes — you didn't do this rule. Stop. Read. Then ask.
