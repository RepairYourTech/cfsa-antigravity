---
name: posthog-flags
description: "PostHog feature flag patterns covering boolean/multivariate flags, local evaluation, experiments, server/client SDKs, and payload integration. Use when implementing feature flags with PostHog."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# PostHog Feature Flags

Feature flags built into PostHog's analytics platform. Evaluate flags with full user context, run experiments with automatic metric tracking, and use local evaluation for zero-latency decisions.

## When to Use

- Already using PostHog for analytics/product tracking
- Want feature flags + experimentation in one platform
- Need percentage rollouts with user property targeting
- Want flag evaluation tied to analytics events automatically

## When NOT to Use

- Need enterprise flag management with audit trails (use LaunchDarkly)
- Not using PostHog for analytics (standalone flag tools may be simpler)
- Need complex multi-context targeting (LaunchDarkly is stronger here)

## Setup

### Installation

```bash
npm install posthog-node        # Server-side
npm install posthog-js           # Client-side
```

### Server SDK

```typescript
import { PostHog } from 'posthog-node';

const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY, // For local evaluation
});
```

### Client SDK (React)

```tsx
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

// Initialize once
if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  });
}

function App({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
```

## Flag Evaluation

### Server-Side

```typescript
// Boolean flag
const isEnabled = await posthog.isFeatureEnabled('new-dashboard', userId);

// Multivariate flag (returns string variant)
const variant = await posthog.getFeatureFlag('checkout-layout', userId);
// Returns: 'control' | 'variant-a' | 'variant-b' | false

// With user properties for targeting
const isEnabled = await posthog.isFeatureEnabled('premium-feature', userId, {
  personProperties: { plan: 'enterprise', country: 'US' },
  groupProperties: { company: { name: 'Acme', tier: 'enterprise' } },
});

// Flag payload (arbitrary JSON attached to a flag)
const payload = await posthog.getFeatureFlagPayload('config-flag', userId);
// Returns the JSON payload configured in PostHog UI
```

### Client-Side (React)

```tsx
import { useFeatureFlagEnabled, useFeatureFlagVariantKey } from 'posthog-js/react';

function Dashboard() {
  const showNewDashboard = useFeatureFlagEnabled('new-dashboard');
  const checkoutVariant = useFeatureFlagVariantKey('checkout-layout');

  if (showNewDashboard) {
    return <NewDashboard />;
  }
  return <LegacyDashboard />;
}
```

### Client-Side (Vanilla JS)

```typescript
import posthog from 'posthog-js';

// Check flag
if (posthog.isFeatureEnabled('new-feature')) {
  showNewFeature();
}

// Get multivariate value
const variant = posthog.getFeatureFlag('experiment-key');

// Wait for flags to load
posthog.onFeatureFlags((flags) => {
  if (flags.includes('new-feature')) {
    showNewFeature();
  }
});
```

## Local Evaluation (Zero Latency)

Evaluate flags locally without network calls. Requires `personalApiKey`:

```typescript
const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: 'https://us.i.posthog.com',
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY!, // Required for local eval
});

// Flags are cached locally and refreshed every 30s (default)
const isEnabled = await posthog.isFeatureEnabled('fast-flag', userId, {
  personProperties: { plan: 'pro' },
});
// Evaluates instantly, no network call
```

## Experiments

```typescript
// Server-side: track experiment exposure + conversion
const variant = await posthog.getFeatureFlag('pricing-experiment', userId);
// PostHog auto-tracks $feature_flag_called event

// Track conversion
posthog.capture({
  distinctId: userId,
  event: 'purchase_completed',
  properties: { amount: 49.99, plan: 'pro' },
});
// PostHog correlates conversion with flag variant automatically
```

## Identify Users

```typescript
// Server
posthog.identify({
  distinctId: userId,
  properties: { email: 'jane@example.com', plan: 'enterprise', company: 'Acme' },
});

// Client
posthog.identify(userId, { email: 'jane@example.com', plan: 'enterprise' });
```

## Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  await posthog.shutdown(); // Flushes remaining events
});
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Evaluate flags without identifying the user first | Call `identify` or pass `personProperties` for targeting |
| Call `isFeatureEnabled` in hot loops | Cache flag value per-request |
| Skip `personalApiKey` for server-side local eval | Set it to eliminate per-evaluation network latency |
| Forget to call `shutdown()` on server stop | Always flush events before process exit |
| Use flags for permanent config | Remove flag code after full rollout |
| Evaluate flags client-side for security decisions | Always evaluate server-side for auth/access decisions |
| Ignore flag payloads | Use payloads for dynamic configuration instead of hardcoding |
| Create flags without clear success metrics | Define experiment goals before creating the flag |
