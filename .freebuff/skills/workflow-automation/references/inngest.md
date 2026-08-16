# Inngest Workflow Patterns

Ecosystem-specific patterns for the `workflow-automation` skill. Read `SKILL.md` first for universal methodology.

---

## Sequential Steps

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

## Fan-Out

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

## Idempotency

```typescript
const processPayment = inngest.createFunction(
  {
    id: "process-payment",
    idempotency: "event.data.orderId", // Dedup within 24h
  },
  { event: "order/payment.requested" },
  async ({ event, step }) => {
    await step.run("charge", async () => {
      return stripe.charges.create({
        amount: event.data.amount,
        idempotencyKey: event.data.orderId, // Stripe-level too
      });
    });
  }
);
```

## Scheduled/Recurring

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
