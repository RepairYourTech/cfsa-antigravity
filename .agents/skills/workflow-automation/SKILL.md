---
name: workflow-automation
description: "Architect durable, event-driven workflows using step functions, retry strategies, idempotency, fan-out patterns, and the critical differences between orchestration approaches."
version: 2.0.0
---

# Workflow Automation

You are a workflow architect who understands the fundamental tradeoff: **simplicity vs. correctness**. Every workflow platform sits somewhere on that spectrum. Your job is to pick the right point for the user's situation and implement it correctly.

## When to Use

- Background jobs that must complete even if the server restarts
- Multi-step processes where partial completion is worse than failure (payments, onboarding)
- Event-driven architectures where one event triggers multiple independent reactions
- Scheduled/recurring tasks that need observability and retry guarantees
- Any process where "it probably ran" is not acceptable

## When NOT to Use

- Simple fire-and-forget tasks (use a queue or a delay)
- Synchronous request-response flows
- Tasks under 100ms that don't involve external services

## Ecosystem-Specific References

After reading the methodology below, read the reference matching your orchestration platform:

| Platform | Reference | Best For |
|----------|-----------|----------|
| Inngest | `references/inngest.md` | Serverless, event-driven, fast shipping |
| Temporal | `references/temporal.md` | Complex orchestration, human-in-the-loop |
| BullMQ | `references/bullmq.md` | Simple job queues, rate limiting, Redis stack |

---

## Core Concept: Durable Execution

**Wrap each unit of work in a step, so the system can retry, resume, and checkpoint independently.**

```
Without durable execution:
  fetch data → process → save → send email
           ↑ server crashes here
           ↓ entire pipeline reruns from scratch
           ↓ customer gets duplicate email

With durable execution:
  step("fetch")   ✓ saved
  step("process") ✓ saved
  step("save")    ← server crashes here
  step("save")    ← retries ONLY this step
  step("email")   ✓ runs once
```

---

## Platform Decision Matrix

| Factor | Inngest | Temporal | BullMQ |
|--------|---------|----------|--------|
| **Complexity** | Low (serverless functions) | High (workers + server) | Medium (Redis-backed) |
| **Durability** | Steps checkpointed | Full workflow replay | Job-level retry |
| **Infrastructure** | Managed or self-hosted | Requires Temporal Server | Requires Redis |
| **Best for** | Serverless, event-driven | Complex orchestration | Simple job queues |
| **Learning curve** | 1-2 days | 1-2 weeks | 1-2 days |
| **Language support** | TS, Python, Go | TS, Go, Java, Python, .NET | TS/JS only |

### Decision Rules

1. **Serverless + event-driven?** → Inngest
2. **Complex orchestration, human-in-the-loop, multi-day?** → Temporal
3. **Simple job queue, Redis already in stack?** → BullMQ
4. **Team of 1-3, shipping fast?** → Inngest
5. **Enterprise, compliance-heavy, Java/.NET stack?** → Temporal

---

## Pattern 1: Sequential Steps

Each step depends on the previous result. Steps checkpoint independently.

```
step("create-db-record")       → returns user
step("create-stripe-customer") → uses user.email
step("send-welcome-email")     → uses user.email
```

If step 2 fails, only step 2 retries. Steps 1 and 3 are not re-executed.

---

## Pattern 2: Fan-Out (Parallel Execution)

One event triggers multiple independent workflows. Each runs and retries independently.

```
Event: user/signup.completed
  → Workflow A: send-welcome-email   (independent)
  → Workflow B: create-stripe-trial  (independent)
  → Workflow C: provision-workspace  (independent)
```

If Workflow B fails, Workflows A and C are unaffected.

---

## Pattern 3: Idempotency

Prevent duplicate execution when the same event fires twice.

**Rule:** Idempotency at the workflow level AND the external call level. Belt and suspenders.

- **Workflow level:** Deduplicate by event ID or business key (e.g., order ID)
- **External call level:** Use idempotency keys on payment APIs, email sends, etc.

---

## Pattern 4: Scheduled/Recurring

Cron-triggered workflows with observability:
- Scheduled trigger (e.g., daily at 9am)
- Steps checkpoint independently
- Failed runs are visible, retriable, and alertable

---

## Pattern 5: Human-in-the-Loop

Workflows that pause and wait for external input — approval flows, multi-day processes.

```
workflow: purchaseWorkflow(amount)
  if amount > threshold:
    pause and wait for approval signal (up to 72h)
    if no approval → deny
  continue with purchase
```

---

## Sharp Edges

| Issue | Severity | Rule |
|-------|----------|------|
| No idempotency keys on external calls | Critical | ALWAYS use idempotency keys for payments, emails, mutations |
| Side effects in workflow code (Temporal) | Critical | Workflows must be deterministic — no I/O, no random, no clock |
| Giant payloads in step results | High | Steps serialize data — keep under 256KB |
| No timeouts on activities | High | ALWAYS set timeouts — default infinite hangs forever |
| Linear retry without backoff | Medium | ALWAYS use exponential backoff |
| Missing dead letter handling | High | Failed-after-all-retries jobs need a destination |
| Monolithic workflows | Medium | Break workflows >10 steps into child workflows |

## Anti-Patterns

| Don't | Do |
|-------|-----|
| `setTimeout(fn, 3600000)` for delays | Platform sleep — survives restarts |
| Global variables for workflow state | Step results and explicit state passing |
| Retry loops in application code | Platform-level retry policies |
| Polling in a loop for completion | Event-driven triggers or workflow signals |
| One giant function with all logic | Decompose into steps/activities |

## Related Skills

Works with: `error-handling-patterns`, `deployment-procedures`
