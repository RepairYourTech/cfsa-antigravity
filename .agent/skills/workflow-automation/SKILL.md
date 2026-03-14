---
name: workflow-automation
description: "Architect durable, event-driven workflows using platforms like Inngest, Temporal, and BullMQ. Covers step functions, retry strategies, idempotency, fan-out patterns, and the critical differences between orchestration approaches."
version: 2.0.0
source: self
date_added: "2026-02-27"
date_rewritten: "2026-03-14"
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

- Simple fire-and-forget tasks (use a queue or `setTimeout`)
- Synchronous request-response flows
- Tasks under 100ms that don't involve external services

---

## Core Concept: Durable Execution

The fundamental insight: **wrap each unit of work in a step, so the system can retry, resume, and checkpoint independently.**

Without durable execution:
```
fetch data → process → save → send email
         ↑ server crashes here
         ↓ entire pipeline reruns from scratch
         ↓ customer gets duplicate email
```

With durable execution:
```
step("fetch")  ✓ saved
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
| **Best for** | Serverless, Next.js, event-driven | Complex orchestration, long-running | Simple job queues, rate limiting |
| **Learning curve** | 1-2 days | 1-2 weeks | 1-2 days |
| **Language support** | TS, Python, Go | TS, Go, Java, Python, .NET | TS/JS only |

### Decision Rules

1. **Serverless + event-driven?** → Inngest
2. **Complex orchestration, human-in-the-loop, multi-day workflows?** → Temporal
3. **Simple job queue with rate limiting, Redis already in stack?** → BullMQ
4. **Team of 1-3, shipping fast?** → Inngest
5. **Enterprise, compliance-heavy, existing Java/.NET stack?** → Temporal

---

## Pattern 1: Sequential Steps

Each step depends on the previous result. Steps checkpoint independently.

### Inngest

```typescript
const syncUser = inngest.createFunction(
  { id: "sync-user-data" },
  { event: "user/signup.completed" },
  async ({ event, step }) => {
    const user = await step.run("create-db-record", async () => {
      return db.users.create({ email: event.data.email });
    });

    const stripeCustomer = await step.run("create-stripe-customer", async () => {
      return stripe.customers.create({ email: user.email });
    });

    await step.run("send-welcome-email", async () => {
      return email.send({ to: user.email, template: "welcome" });
    });
  }
);
```

### Temporal

```typescript
// activities.ts
export async function createDbRecord(email: string): Promise<User> {
  return db.users.create({ email });
}

export async function createStripeCustomer(email: string): Promise<Customer> {
  return stripe.customers.create({ email });
}

// workflows.ts
const { createDbRecord, createStripeCustomer } = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
  retry: { initialInterval: "1s", maximumAttempts: 3 },
});

export async function syncUserWorkflow(email: string): Promise<void> {
  const user = await createDbRecord(email);
  const customer = await createStripeCustomer(user.email);
}
```

---

## Pattern 2: Fan-Out (Parallel Execution)

One event triggers multiple independent workflows. Each runs and retries independently.

### Inngest

```typescript
// Each function subscribes to the same event — runs independently
const sendWelcome = inngest.createFunction(
  { id: "send-welcome-email" },
  { event: "user/signup.completed" },
  async ({ event, step }) => {
    await step.run("send", async () => {
      await email.send({ to: event.data.email, template: "welcome" });
    });
  }
);

const startTrial = inngest.createFunction(
  { id: "start-stripe-trial" },
  { event: "user/signup.completed" },
  async ({ event, step }) => {
    await step.run("create-trial", async () => {
      await stripe.subscriptions.create({
        customer: event.data.stripeId,
        trial_period_days: 14,
      });
    });
  }
);
```

---

## Pattern 3: Idempotency

Prevent duplicate execution when the same event fires twice.

```typescript
const processPayment = inngest.createFunction(
  {
    id: "process-payment",
    // Only runs once per unique orderId within 24h
    idempotency: "event.data.orderId",
  },
  { event: "order/payment.requested" },
  async ({ event, step }) => {
    await step.run("charge", async () => {
      return stripe.charges.create({
        amount: event.data.amount,
        idempotencyKey: event.data.orderId, // Stripe-level idempotency too
      });
    });
  }
);
```

**Rule**: Idempotency at the workflow level AND the external call level. Belt and suspenders.

---

## Pattern 4: Scheduled/Recurring

### Inngest

```typescript
const dailyReport = inngest.createFunction(
  { id: "daily-metrics-report" },
  { cron: "0 9 * * *" }, // 9am daily
  async ({ step }) => {
    const metrics = await step.run("fetch-metrics", fetchDailyMetrics);
    await step.run("send-report", async () => sendSlackReport(metrics));
  }
);
```

---

## Pattern 5: Human-in-the-Loop (Temporal)

Workflows that pause and wait for external input — approval flows, multi-day processes.

```typescript
export const approvalSignal = defineSignal<[boolean]>("approval");

export async function purchaseWorkflow(amount: number): Promise<string> {
  if (amount > 10000) {
    let approved: boolean | undefined;

    setHandler(approvalSignal, (isApproved) => {
      approved = isApproved;
    });

    // Workflow sleeps until signal received or 72h timeout
    const gotApproval = await condition(() => approved !== undefined, "72 hours");

    if (!gotApproval || !approved) {
      return "Purchase denied or timed out";
    }
  }

  // Continue with purchase...
  return "Purchase completed";
}
```

---

## Sharp Edges

| Issue | Severity | Rule |
|-------|----------|------|
| No idempotency keys on external calls | Critical | ALWAYS use idempotency keys for payments, emails, API mutations |
| Side effects in workflow code (Temporal) | Critical | Workflows must be deterministic — no I/O, no random, no Date.now() |
| Giant payloads in step results | High | Steps return serialized data — keep under 256KB |
| No timeouts on activities | High | ALWAYS set `startToCloseTimeout` — default infinite hangs forever |
| Linear retry without backoff | Medium | ALWAYS use exponential backoff: `initialInterval * backoffCoefficient^attempt` |
| Missing dead letter handling | High | Failed-after-all-retries jobs need a destination — don't silently drop them |
| Monolithic workflows | Medium | Break workflows >10 steps into child workflows or separate functions |

## Anti-Patterns

| Don't | Do |
|-------|-----|
| `setTimeout(fn, 3600000)` for delays | `step.sleep("wait-1h", "1h")` — survives restarts |
| Global variables for workflow state | Step results and explicit state passing |
| Retry loops in application code | Platform-level retry policies |
| Polling in a loop for completion | Event-driven triggers or workflow signals |
| One giant function with all logic | Decompose into steps/activities |

## Related Skills

Works with: `error-handling-patterns`, `deployment-procedures`, `inngest` (skill-library), `bullmq` (skill-library)
