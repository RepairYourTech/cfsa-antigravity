---
name: inngest
description: Build event-driven background jobs and workflows with Inngest. Use when implementing step functions, scheduled tasks, fan-out patterns, retries, throttling, or any durable async processing in TypeScript applications.
version: 1.0.0
---

# Inngest

Build reliable, event-driven background jobs and durable workflows with the Inngest TypeScript SDK. Inngest replaces traditional job queues with a declarative, step-function model where each step is individually retriable.

## When to Use This Skill

- Processing background work triggered by application events
- Building multi-step workflows with automatic retry per step
- Scheduling recurring jobs (cron)
- Fan-out processing (one event triggers many functions)
- Rate limiting or throttling work per user/tenant
- Replacing fragile queue + worker setups (BullMQ, SQS, etc.)

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Event** | A JSON payload that triggers one or more functions |
| **Function** | A handler that runs in response to events, composed of steps |
| **Step** | An individually retriable unit of work inside a function |
| **Step Function** | A function with multiple steps that persist state between retries |
| **Inngest Dev Server** | Local dashboard for testing events and inspecting runs |

## Setup

```bash
# Install SDK
pnpm add inngest

# Start local dev server (runs at http://localhost:8288)
npx inngest-cli@latest dev
```

### Client Initialization

```typescript
// src/lib/inngest/client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'my-app',
  // Optional: schema validation for events
  schemas: new EventSchemas().fromRecord<Events>(),
});
```

### Event Type Definitions

```typescript
// src/lib/inngest/events.ts
type Events = {
  'user/signup.completed': {
    data: {
      userId: string;
      email: string;
      plan: 'free' | 'pro';
    };
  };
  'order/payment.received': {
    data: {
      orderId: string;
      amount: number;
      currency: string;
    };
  };
  'report/generation.requested': {
    data: {
      reportId: string;
      userId: string;
      type: 'weekly' | 'monthly';
    };
  };
};
```

## Function Patterns

### Pattern 1: Simple Event Handler

```typescript
// src/lib/inngest/functions/send-welcome-email.ts
import { inngest } from '../client';

export const sendWelcomeEmail = inngest.createFunction(
  {
    id: 'send-welcome-email',
    retries: 3,
  },
  { event: 'user/signup.completed' },
  async ({ event }) => {
    await emailService.send({
      to: event.data.email,
      template: 'welcome',
      data: { userId: event.data.userId },
    });
    return { sent: true };
  },
);
```

### Pattern 2: Multi-Step Function

Each `step.run()` is individually retriable. If step 2 fails and retries, step 1 does not re-execute -- its return value is memoized.

```typescript
// src/lib/inngest/functions/onboard-user.ts
export const onboardUser = inngest.createFunction(
  { id: 'onboard-user' },
  { event: 'user/signup.completed' },
  async ({ event, step }) => {
    // Step 1: Create workspace (memoized on success)
    const workspace = await step.run('create-workspace', async () => {
      return await db.workspace.create({
        ownerId: event.data.userId,
        name: 'Default Workspace',
      });
    });

    // Step 2: Provision resources
    await step.run('provision-resources', async () => {
      await provisionStorage(workspace.id);
      await createDefaultChannels(workspace.id);
    });

    // Step 3: Send welcome email
    await step.run('send-welcome', async () => {
      await emailService.send({
        to: event.data.email,
        template: 'onboarding',
        data: { workspaceId: workspace.id },
      });
    });

    return { workspaceId: workspace.id };
  },
);
```

### Pattern 3: Step with Sleep/Wait

```typescript
export const trialExpirationReminder = inngest.createFunction(
  { id: 'trial-expiration-reminder' },
  { event: 'user/signup.completed' },
  async ({ event, step }) => {
    // Wait 10 days after signup
    await step.sleep('wait-before-reminder', '10d');

    const user = await step.run('check-user-status', async () => {
      return await db.user.findUnique({ where: { id: event.data.userId } });
    });

    if (user?.plan === 'free') {
      await step.run('send-trial-ending-email', async () => {
        await emailService.send({
          to: user.email,
          template: 'trial-ending',
        });
      });

      // Wait 4 more days
      await step.sleep('wait-before-expiry', '4d');

      await step.run('expire-trial', async () => {
        await db.user.update({
          where: { id: user.id },
          data: { trialExpired: true },
        });
      });
    }
  },
);
```

### Pattern 4: Wait for External Event

```typescript
export const orderFulfillment = inngest.createFunction(
  { id: 'order-fulfillment' },
  { event: 'order/payment.received' },
  async ({ event, step }) => {
    await step.run('reserve-inventory', async () => {
      await inventory.reserve(event.data.orderId);
    });

    // Wait up to 24 hours for shipping confirmation
    const shipEvent = await step.waitForEvent('wait-for-shipping', {
      event: 'order/shipped',
      match: 'data.orderId',
      timeout: '24h',
    });

    if (!shipEvent) {
      await step.run('escalate-unshipped', async () => {
        await alerts.notify('ops', `Order ${event.data.orderId} not shipped in 24h`);
      });
      return { status: 'escalated' };
    }

    await step.run('notify-customer', async () => {
      await emailService.send({
        to: shipEvent.data.customerEmail,
        template: 'order-shipped',
        data: { trackingNumber: shipEvent.data.trackingNumber },
      });
    });

    return { status: 'shipped' };
  },
);
```

### Pattern 5: Fan-Out

```typescript
export const generateReports = inngest.createFunction(
  { id: 'generate-all-reports' },
  { event: 'report/generation.requested' },
  async ({ event, step }) => {
    const tenants = await step.run('fetch-tenants', async () => {
      return await db.tenant.findMany({ where: { active: true } });
    });

    // Send an event per tenant -- each triggers its own function run
    const events = tenants.map((tenant) => ({
      name: 'report/tenant.generate' as const,
      data: {
        tenantId: tenant.id,
        type: event.data.type,
      },
    }));

    await step.sendEvent('fan-out-reports', events);

    return { triggered: tenants.length };
  },
);
```

### Pattern 6: Cron / Scheduled Functions

```typescript
export const dailyCleanup = inngest.createFunction(
  { id: 'daily-cleanup' },
  { cron: '0 3 * * *' }, // Every day at 3:00 AM UTC
  async ({ step }) => {
    const deleted = await step.run('purge-expired-sessions', async () => {
      return await db.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
    });

    await step.run('vacuum-storage', async () => {
      await storage.removeOrphaned();
    });

    return { sessionsDeleted: deleted.count };
  },
);
```

## Concurrency and Throttling

```typescript
export const processWebhook = inngest.createFunction(
  {
    id: 'process-webhook',
    // Max 10 concurrent runs
    concurrency: {
      limit: 10,
    },
    // Max 5 runs per second per account
    throttle: {
      limit: 5,
      period: '1s',
      key: 'event.data.accountId',
    },
    // Rate limit: 1 run per user per minute
    rateLimit: {
      limit: 1,
      period: '1m',
      key: 'event.data.userId',
    },
    // Debounce: wait 5s for more events before running
    debounce: {
      period: '5s',
      key: 'event.data.entityId',
    },
  },
  { event: 'webhook/received' },
  async ({ event, step }) => {
    // Function body
  },
);
```

## Retry Configuration

```typescript
export const riskyOperation = inngest.createFunction(
  {
    id: 'risky-operation',
    retries: 5,
    // Custom backoff: exponential with jitter
    backoff: {
      type: 'exponential',
      delay: '1s',
      factor: 2,
      maxDelay: '1h',
    },
    // Cancel running function if this event arrives
    cancelOn: [
      { event: 'order/cancelled', match: 'data.orderId' },
    ],
  },
  { event: 'order/payment.received' },
  async ({ event, step }) => {
    // Individual steps can also configure retries
    await step.run('call-external-api', async () => {
      const res = await fetch('https://api.external.com/process', {
        method: 'POST',
        body: JSON.stringify(event.data),
      });
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      return res.json();
    });
  },
);
```

## Framework Integration

### Next.js (App Router)

```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { sendWelcomeEmail } from '@/lib/inngest/functions/send-welcome-email';
import { onboardUser } from '@/lib/inngest/functions/onboard-user';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendWelcomeEmail, onboardUser],
});
```

### Astro

```typescript
// src/pages/api/inngest.ts
import { serve } from 'inngest/astro';
import { inngest } from '@/lib/inngest/client';
import { allFunctions } from '@/lib/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
```

### Sending Events from Application Code

```typescript
// Anywhere in your server-side code
import { inngest } from '@/lib/inngest/client';

await inngest.send({
  name: 'user/signup.completed',
  data: {
    userId: user.id,
    email: user.email,
    plan: 'free',
  },
});
```

## Testing

```typescript
import { createStepTools } from 'inngest/test';
import { onboardUser } from './onboard-user';

describe('onboardUser', () => {
  it('creates workspace and sends welcome email', async () => {
    const { result, state } = await onboardUser.execute({
      event: {
        name: 'user/signup.completed',
        data: { userId: 'u_1', email: 'test@test.com', plan: 'free' },
      },
    });

    expect(state.steps).toHaveLength(3);
    expect(result).toEqual({ workspaceId: expect.any(String) });
  });
});
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Putting all logic in one `step.run()` | Break into granular steps so each retries independently |
| Using `setTimeout` or manual delays | Use `step.sleep()` -- it survives process restarts |
| Polling for state changes | Use `step.waitForEvent()` for event-driven coordination |
| Storing state in variables between steps without `step.run` | All inter-step data must flow through `step.run()` return values |
| Catching errors inside steps to prevent retry | Let errors propagate -- Inngest handles retries |
| Running side effects outside of steps | All I/O must be inside `step.run()` to ensure idempotency |

## Local Development

```bash
# Terminal 1: Start your app
pnpm dev

# Terminal 2: Start Inngest Dev Server
npx inngest-cli@latest dev

# Dev server auto-discovers your serve endpoint
# Dashboard at http://localhost:8288
# Send test events from the dashboard UI
```

## Deployment Checklist

- [ ] Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` environment variables
- [ ] Verify serve endpoint is reachable from Inngest Cloud
- [ ] Configure concurrency limits appropriate for your infrastructure
- [ ] Set up alerting for function failures in Inngest dashboard
- [ ] Review retry counts -- default is 3, adjust per function criticality
