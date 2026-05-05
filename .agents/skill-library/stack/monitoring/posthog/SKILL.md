---
name: posthog
description: Implement product analytics, feature flags, A/B testing, and session recordings with PostHog. Use when adding event tracking, user identification, experimentation, or product insights to web and mobile applications.
version: 1.0.0
---

# PostHog Analytics

Implement product analytics, feature flags, A/B experiments, session recordings, and surveys with PostHog. PostHog is an open-source product analytics suite that can be self-hosted or used as a managed service.

## When to Use This Skill

- Tracking user behavior and product usage events
- Implementing feature flags for gradual rollouts
- Running A/B tests and multivariate experiments
- Recording user sessions for debugging and UX research
- Identifying users and linking anonymous to authenticated sessions
- Building product dashboards and funnels
- Collecting user feedback via surveys

## Setup

### Client-Side (Browser)

```bash
pnpm add posthog-js
```

```typescript
// src/lib/analytics/posthog.ts
import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window === 'undefined') return;

  posthog.init(import.meta.env.PUBLIC_POSTHOG_KEY, {
    api_host: import.meta.env.PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only', // Only create profiles for identified users
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true, // Auto-capture clicks, form submissions, etc.
    session_recording: {
      maskAllInputs: true, // PII protection: mask form inputs by default
      maskTextSelector: '[data-ph-mask]', // Additional masking selector
    },
  });
}

export { posthog };
```

### Server-Side (Node.js)

```bash
pnpm add posthog-node
```

```typescript
// src/lib/analytics/posthog-server.ts
import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHogServer(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(process.env.POSTHOG_API_KEY!, {
      host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 20, // Flush after 20 events
      flushInterval: 10000, // Or every 10 seconds
    });
  }
  return posthogClient;
}

// Flush on shutdown
process.on('SIGTERM', async () => {
  await posthogClient?.shutdown();
});
```

### Next.js Integration

```tsx
// app/providers.tsx
'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: '/ingest', // Proxy through your app to bypass ad blockers
      person_profiles: 'identified_only',
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
```

```typescript
// next.config.js -- Proxy to bypass ad blockers
module.exports = {
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ];
  },
};
```

### React Integration

```tsx
// Using the PostHog React hooks
import { usePostHog, useFeatureFlagEnabled } from 'posthog-js/react';

function UpgradeButton() {
  const posthog = usePostHog();
  const showNewPricing = useFeatureFlagEnabled('new-pricing-page');

  function handleClick() {
    posthog.capture('upgrade_button_clicked', {
      location: 'dashboard_header',
      current_plan: 'free',
    });
  }

  return showNewPricing ? <NewPricingButton onClick={handleClick} /> : <OldPricingButton onClick={handleClick} />;
}
```

## Event Tracking

### Custom Events

```typescript
import posthog from 'posthog-js';

// Basic event
posthog.capture('document_created', {
  document_type: 'report',
  word_count: 1500,
  has_images: true,
});

// Revenue event
posthog.capture('purchase_completed', {
  $set: { is_paying_customer: true },
  plan: 'pro',
  amount: 29.99,
  currency: 'USD',
});

// Timed event
posthog.capture('onboarding_completed', {
  duration_seconds: 45,
  steps_completed: 5,
  skipped_steps: ['connect_calendar'],
});
```

### Server-Side Events

```typescript
import { getPostHogServer } from '@/lib/analytics/posthog-server';

const posthog = getPostHogServer();

// Capture server-side event
posthog.capture({
  distinctId: userId,
  event: 'api_key_created',
  properties: {
    key_type: 'production',
    permissions: ['read', 'write'],
  },
});
```

### Naming Conventions

| Convention | Example | When |
|-----------|---------|------|
| `object_action` | `document_created`, `user_invited` | Standard events |
| `$pageview` | Auto-captured | Page views |
| `$pageleave` | Auto-captured | Page exits |
| `$autocapture` | Auto-captured | Clicks, form submits |

Stick to `snake_case` for event names and property keys. Be consistent across the entire application.

## User Identification

```typescript
// After login -- links anonymous events to the authenticated user
posthog.identify(user.id, {
  email: user.email,
  name: user.name,
  plan: user.plan,
  created_at: user.createdAt,
});

// On logout -- resets identity
posthog.reset();

// Set properties without an event
posthog.people.set({
  last_active: new Date().toISOString(),
  total_documents: 42,
});

// Increment numeric properties
posthog.people.set_once({
  first_login: new Date().toISOString(),
});
```

## Group Analytics

Track usage at the organization/team level, not just individual users.

```typescript
// Associate user with a group
posthog.group('company', 'company_123', {
  name: 'Acme Corp',
  plan: 'enterprise',
  employee_count: 250,
  industry: 'technology',
});

// Events automatically include group context
posthog.capture('report_exported', {
  format: 'pdf',
  // Group properties are automatically attached
});
```

## Feature Flags

### Checking Flags (Client-Side)

```typescript
import posthog from 'posthog-js';

// Boolean flag
if (posthog.isFeatureEnabled('new-dashboard')) {
  showNewDashboard();
}

// Multivariate flag
const variant = posthog.getFeatureFlag('pricing-experiment');
if (variant === 'discounted') {
  showDiscountedPricing();
} else if (variant === 'bundled') {
  showBundledPricing();
}

// Flag with payload (JSON data attached to the flag)
const config = posthog.getFeatureFlagPayload('onboarding-flow');
// config might be: { steps: ['welcome', 'setup', 'invite'], skipAllowed: true }
```

### Checking Flags (Server-Side)

```typescript
import { getPostHogServer } from '@/lib/analytics/posthog-server';

const posthog = getPostHogServer();

const isEnabled = await posthog.isFeatureEnabled('new-api-v2', userId);

// With group-level targeting
const isEnabled = await posthog.isFeatureEnabled('enterprise-feature', userId, {
  groups: { company: 'company_123' },
});

// Multivariate
const variant = await posthog.getFeatureFlag('experiment', userId);
```

### Local Evaluation (No Network Calls)

```typescript
import { PostHog } from 'posthog-node';

const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.POSTHOG_HOST,
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY, // Required for local eval
});

// Evaluates flags locally using cached definitions -- no API call per check
const isEnabled = await posthog.isFeatureEnabled('my-flag', userId, {
  personProperties: { plan: 'pro', country: 'US' },
});
```

## A/B Testing (Experiments)

```typescript
// PostHog experiments use feature flags under the hood
const variant = posthog.getFeatureFlag('signup-flow-experiment');

// Track the experiment goal
function handleSignupComplete() {
  posthog.capture('signup_completed', {
    signup_method: 'email',
    // PostHog automatically attributes this to the experiment variant
  });
}
```

## Surveys

```typescript
// Programmatic survey trigger
posthog.capture('$survey_shown', {
  $survey_id: 'survey_123',
});

// Record survey response
posthog.capture('survey sent', {
  $survey_id: 'survey_123',
  $survey_response: 'Very satisfied',
  $survey_response_1: 'The dashboard redesign is great',
});
```

## Session Recordings

```typescript
// Start recording manually (if not using autocapture)
posthog.startSessionRecording();

// Control recording with feature flags
posthog.init('key', {
  session_recording: {
    // Only record 10% of sessions
    sample_rate: 0.1,
    // Record all sessions where the user hits an error
    linked_flag: {
      flag: 'record-sessions',
      variant: 'true',
    },
  },
});

// PII masking
// Add data-ph-no-capture to elements that should not be recorded
// <input data-ph-no-capture type="password" />
// <div data-ph-no-capture class="sensitive-data">...</div>
```

## Data Pipelines (Exports)

PostHog can export events to external destinations:

```typescript
// Server-side: capture events that will flow to configured destinations
// (S3, BigQuery, Snowflake, Redshift, Webhooks)
posthog.capture({
  distinctId: userId,
  event: 'subscription_renewed',
  properties: {
    plan: 'pro',
    mrr: 29.99,
    // This event flows to PostHog AND any configured export destinations
  },
});
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Tracking everything with autocapture only | Define explicit events for business-critical actions |
| Using PII (email, name) as `distinctId` | Use opaque user IDs; set PII as properties via `identify()` |
| Checking feature flags on every render | Use `useFeatureFlagEnabled()` hook or cache the result |
| Not calling `posthog.reset()` on logout | Causes event leakage between users on shared devices |
| Sending high-cardinality properties (UUIDs as property values) | Use low-cardinality values for properties you will filter/group by |
| Blocking page render on PostHog load | Load PostHog asynchronously; it is not critical path |

## Environment Variables

```env
# Client-side (must be prefixed for framework exposure)
PUBLIC_POSTHOG_KEY=phc_...          # Project API key
PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Server-side
POSTHOG_API_KEY=phc_...             # Same project API key
POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_PERSONAL_API_KEY=phx_...    # For local flag evaluation (optional)
```
