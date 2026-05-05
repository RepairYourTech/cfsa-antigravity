---
name: launchdarkly
description: "LaunchDarkly feature flag patterns covering flag evaluation, targeting rules, SDK setup, flag types, relay proxy, and experimentation. Use when implementing feature flags with LaunchDarkly."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# LaunchDarkly

Enterprise feature flag management platform. Control feature rollouts, A/B tests, and operational flags with targeting rules, environments, and audit trails.

## When to Use

- Need enterprise-grade feature flag management with audit trails
- Rolling out features progressively (percentage, user targeting)
- Managing operational toggles (kill switches, maintenance modes)
- Running A/B experiments with metric tracking

## When NOT to Use

- Need a free/open-source solution (use Flagsmith or GrowthBook)
- Feature flags are simple on/off per environment (environment variables suffice)
- Need analytics-first with flags as secondary (use PostHog)

## Setup

### Installation

```bash
npm install @launchdarkly/node-server-sdk     # Server-side
npm install launchdarkly-react-client-sdk      # React client
```

### Server SDK Initialization

```typescript
import * as ld from '@launchdarkly/node-server-sdk';

const client = ld.init(process.env.LAUNCHDARKLY_SDK_KEY!);
await client.waitForInitialization({ timeout: 5 });
```

### React SDK Setup

```tsx
import { LDProvider } from 'launchdarkly-react-client-sdk';

function App() {
  return (
    <LDProvider
      clientSideID={process.env.NEXT_PUBLIC_LD_CLIENT_ID!}
      context={{
        kind: 'user',
        key: user.id,
        email: user.email,
        name: user.name,
        custom: { plan: user.plan, company: user.companyId },
      }}
    >
      <AppContent />
    </LDProvider>
  );
}
```

## Flag Evaluation

### Server-Side

```typescript
// Boolean flag
const showNewCheckout = await client.variation(
  'new-checkout-flow',
  { kind: 'user', key: userId, email, custom: { plan } },
  false // default value
);

// String flag
const bannerText = await client.variation('promo-banner', context, '');

// JSON flag
const config = await client.variation('pricing-config', context, { tier: 'basic' });

// Detailed evaluation (includes reason)
const detail = await client.variationDetail('new-checkout-flow', context, false);
console.log(detail.reason); // { kind: 'RULE_MATCH', ruleIndex: 0 }
```

### Client-Side (React)

```tsx
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';

function FeatureComponent() {
  const { newCheckoutFlow, promoBanner } = useFlags();
  const ldClient = useLDClient();

  // Track conversion event
  const handlePurchase = () => {
    ldClient?.track('purchase-completed', undefined, 49.99);
  };

  if (!newCheckoutFlow) return <LegacyCheckout />;
  return <NewCheckout banner={promoBanner} onPurchase={handlePurchase} />;
}
```

## Context (Targeting)

```typescript
// Single context
const userContext: ld.LDContext = {
  kind: 'user',
  key: 'user-123',
  email: 'jane@example.com',
  name: 'Jane Doe',
  plan: 'enterprise',
  country: 'US',
};

// Multi-context (user + organization)
const multiContext: ld.LDMultiKindContext = {
  kind: 'multi',
  user: { key: 'user-123', email: 'jane@example.com', plan: 'enterprise' },
  organization: { key: 'org-456', name: 'Acme Corp', tier: 'enterprise' },
};
```

## Middleware Pattern

```typescript
// Express middleware
async function featureFlagMiddleware(req: Request, res: Response, next: NextFunction) {
  const context: ld.LDContext = {
    kind: 'user',
    key: req.userId ?? 'anonymous',
    email: req.userEmail,
    custom: { plan: req.userPlan },
  };

  req.flags = {
    newCheckout: await client.variation('new-checkout-flow', context, false),
    maintenanceMode: await client.variation('maintenance-mode', context, false),
  };

  if (req.flags.maintenanceMode) {
    return res.status(503).json({ error: 'Service under maintenance' });
  }

  next();
}
```

## Environments

| Environment | SDK Key | Purpose |
|-------------|---------|---------|
| Development | `sdk-dev-xxx` | Local dev, all flags available |
| Staging | `sdk-staging-xxx` | Pre-production testing |
| Production | `sdk-prod-xxx` | Live users, progressive rollout |

## Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  await client.close();
  process.exit(0);
});
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Evaluate flags without a user context | Always pass a context with at least a `key` |
| Use the client-side SDK key on the server | Use server SDK key server-side, client ID client-side |
| Leave stale flags in code after rollout | Remove flag code after full rollout (flag hygiene) |
| Initialize a new client per request | Initialize once at startup, reuse across requests |
| Use flags for permanent configuration | Use flags for temporary rollouts, config for permanent settings |
| Skip the default value parameter | Always provide a sensible default for when LD is unreachable |
| Evaluate flags in hot loops | Cache flag values per-request, not per-loop iteration |
| Ignore `waitForInitialization` | Always wait before evaluating — stale defaults are dangerous |
