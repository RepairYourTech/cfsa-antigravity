---
name: flagsmith
description: "Flagsmith feature flag patterns covering flag evaluation, segments, traits, remote config, self-hosted vs cloud, and SDK integration. Use when implementing feature flags with Flagsmith."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# Flagsmith

Open-source feature flag and remote config service. Self-hosted or cloud. Supports segments, user traits, A/B testing, and multi-environment management.

## When to Use

- Want an open-source feature flag solution you can self-host
- Need feature flags + remote configuration in one tool
- Want segments based on user traits (plan, region, version)
- Need a free/affordable tier with no per-seat pricing

## When NOT to Use

- Need enterprise audit trails and compliance (use LaunchDarkly)
- Want flags tightly integrated with analytics (use PostHog)
- Feature flags are simple on/off (environment variables suffice)

## Setup

### Installation

```bash
npm install flagsmith                 # Client/isomorphic
npm install flagsmith-nodejs          # Server-side (Node.js)
```

### Server SDK

```typescript
import Flagsmith from 'flagsmith-nodejs';

const flagsmith = new Flagsmith({
  environmentKey: process.env.FLAGSMITH_SERVER_KEY!,
  apiUrl: process.env.FLAGSMITH_API_URL ?? 'https://edge.api.flagsmith.com/api/v1/',
  enableLocalEvaluation: true,       // Cache flags locally for zero-latency
  environmentRefreshIntervalSeconds: 30,
});
```

### Client SDK (React)

```tsx
import flagsmith from 'flagsmith';
import { FlagsmithProvider } from 'flagsmith/react';

function App() {
  return (
    <FlagsmithProvider
      options={{
        environmentID: process.env.NEXT_PUBLIC_FLAGSMITH_ENV_ID!,
        api: process.env.NEXT_PUBLIC_FLAGSMITH_API_URL,
        identity: user?.id,
        traits: { plan: user?.plan, region: user?.region },
      }}
      flagsmith={flagsmith}
    >
      <AppContent />
    </FlagsmithProvider>
  );
}
```

## Flag Evaluation

### Server-Side

```typescript
// Get flags for an identity
const flags = await flagsmith.getIdentityFlags(userId, {
  plan: 'enterprise',
  region: 'us',
  version: '2.1.0',
});

// Boolean flag
const isEnabled = flags.isFeatureEnabled('new_dashboard');

// Remote config value
const maxUploads = flags.getFeatureValue('max_uploads'); // Returns string
const limit = parseInt(maxUploads ?? '10', 10);

// Environment-level (no identity)
const envFlags = await flagsmith.getEnvironmentFlags();
const maintenanceMode = envFlags.isFeatureEnabled('maintenance_mode');
```

### Client-Side (React)

```tsx
import { useFlags, useFlagsmith } from 'flagsmith/react';

function Feature() {
  const { new_dashboard, max_uploads } = useFlags(['new_dashboard', 'max_uploads']);
  const flagsmith = useFlagsmith();

  // Update traits (triggers re-evaluation)
  const upgradePlan = () => {
    flagsmith.setTraits({ plan: 'enterprise' });
  };

  if (new_dashboard.enabled) {
    return <NewDashboard maxUploads={parseInt(max_uploads.value ?? '10')} />;
  }
  return <LegacyDashboard />;
}
```

## Segments

Define in Flagsmith dashboard — evaluated based on user traits:

| Segment | Rules | Use Case |
|---------|-------|----------|
| Enterprise Users | `plan = enterprise` | Premium features |
| US Region | `region = us` | US-specific compliance |
| Beta Testers | `beta_opt_in = true` | Early access features |
| High Volume | `api_calls > 10000` | Scale-tier features |

## Traits (User Properties)

```typescript
// Server: set traits
await flagsmith.getIdentityFlags(userId, {
  plan: 'enterprise',
  region: 'eu',
  signup_date: '2024-01-15',
  api_calls: 15000,
});

// Client: set traits dynamically
flagsmith.setTraits({
  theme: 'dark',
  onboarding_complete: true,
});
```

## Multi-Environment

| Environment | Key | Purpose |
|-------------|-----|---------|
| Development | `ser.dev_xxx` | Local development |
| Staging | `ser.staging_xxx` | Pre-production |
| Production | `ser.prod_xxx` | Live traffic |

## Self-Hosted Deployment

```yaml
# docker-compose.yml
services:
  flagsmith:
    image: flagsmith/flagsmith:latest
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/flagsmith
      DJANGO_SECRET_KEY: your-secret-key
      ENABLE_ADMIN_ACCESS_USER_PASS: true
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: flagsmith
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Evaluate flags without an identity for personalization | Pass user ID and traits for segment targeting |
| Hardcode flag names as strings everywhere | Define flag name constants in a shared module |
| Skip local evaluation on the server | Enable `enableLocalEvaluation` for zero-latency server-side eval |
| Use flag values as numbers directly | `getFeatureValue` returns strings — parse to the expected type |
| Leave stale flags after rollout | Archive completed flags to keep the dashboard clean |
| Use production environment key in development | Use environment-specific keys for isolation |
| Deploy self-hosted without PostgreSQL | Flagsmith requires PostgreSQL — SQLite is for development only |
| Skip traits for segment targeting | Traits are the input to segments — set them on identify |
