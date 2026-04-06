# Engagement Tier Protocol

**Purpose**: Single source of truth for engagement tier definitions and behavior. Workflows reference this instead of inlining tier blocks.

---

## Tier Definitions

| Tier | When | User Experience |
|------|------|-----------------|
| **Auto** | 6+ well-constrained axes, experienced user, clear preferences | Agent uses Deep Think reasoning per axis, presents all decisions for batch review at shard end |
| **Hybrid** | 3-5 axes, some need discussion, some are obvious | Group related decisions, present key choices, auto-confirm obvious ones |
| **Interactive** | ≤2 axes, novel/uncertain domain, user requests it | Full interview — one decision at a time with options and trade-offs |

## Tier Selection

Read the user's context:
1. Count the number of decision axes in the current step
2. Assess user's familiarity (prior conversations, explicit preferences, technical depth)
3. Default to **Interactive** if uncertain

Present the proposed tier: "I'll approach this as [tier] — [brief rationale]. Want a different level of involvement?"

**HARD GATE**: Wait for user acknowledgment before proceeding. If the user requests a different tier, switch.

## Behavior by Tier

### Auto Tier
1. For each decision: apply Deep Think reasoning (consider constraints, project goals, prior decisions)
2. Write the decision with `[AUTO-CONFIRMED — reasoning: ...]` annotation
3. At shard end: present ALL auto-confirmed decisions in a summary table
4. User reviews batch — any rejection triggers Interactive re-presentation for that decision
5. Remove `[AUTO-CONFIRMED]` annotations after batch approval

### Hybrid Tier
1. Group related decisions (e.g., all auth decisions together)
2. For obvious decisions: present with recommendation, apply if user says "looks good"
3. For debatable decisions: present options with trade-offs, wait for selection
4. Follow the decision-confirmation-protocol for each group

### Interactive Tier
1. Present one decision at a time
2. Include 2-3 options with trade-offs and your recommendation
3. Wait for explicit selection
4. Follow the decision-confirmation-protocol for each decision

## Gate Classification

Not all decisions follow the engagement tier. Some are always user-facing regardless of tier:

| Gate Type | Always Interactive? | Examples |
|-----------|-------------------|----------|
| **Product** | Yes — user always decides | Feature scope, UX philosophy, pricing |
| **Architecture** | Yes — present options | Database choice, framework, hosting |
| **Structural** | No — tier-aware | File naming, directory organization |
| **Implementation** | No — agent decides | Import ordering, variable naming |

See `.agent/rules/decision-classification.md` for the full classification.
