# Temporal Workflow Patterns

Ecosystem-specific patterns for the `workflow-automation` skill. Read `SKILL.md` first for universal methodology.

---

## Sequential Steps (Activities)

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

## Human-in-the-Loop (Signals)

```typescript
export const approvalSignal = defineSignal<[boolean]>("approval");

export async function purchaseWorkflow(amount: number): Promise<string> {
  if (amount > 10000) {
    let approved: boolean | undefined;

    setHandler(approvalSignal, (isApproved) => {
      approved = isApproved;
    });

    // Workflow sleeps until signal or 72h timeout
    const gotApproval = await condition(() => approved !== undefined, "72 hours");

    if (!gotApproval || !approved) {
      return "Purchase denied or timed out";
    }
  }

  return "Purchase completed";
}
```

## Critical Rule: Determinism

Temporal workflows replay from the beginning on recovery. **Workflow code must be deterministic:**
- ❌ No I/O (database, network, file system)
- ❌ No `Math.random()` or `Date.now()`
- ❌ No global mutable state
- ✅ All I/O goes in activities
- ✅ Use `workflow.now()` for timestamps
- ✅ Use `workflow.random()` for randomness
