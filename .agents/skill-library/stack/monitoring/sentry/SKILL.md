---
name: sentry
description: |
  Integrate Sentry for error monitoring, performance tracing, session replay, and cron monitoring. Use when: setting up error tracking in Next.js/React/Node.js/Astro, configuring performance monitoring (tracing, spans), uploading source maps, adding error boundaries, implementing user feedback, scrubbing PII, setting up alerts, or debugging production issues.
version: 1.0.0
---

# Sentry Error Monitoring

**Status**: Production Ready
**Last Updated**: 2026-02-16
**Package**: `@sentry/nextjs@8.x`, `@sentry/react@8.x`, `@sentry/node@8.x`, `@sentry/astro@8.x`

---

## Setup by Platform

### Next.js (Recommended Wizard)

```bash
npx @sentry/wizard@latest -i nextjs
```

This generates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and updates `next.config.js`.

### Manual Next.js Setup

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
```

```typescript
// next.config.js
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = { /* ... */ };

export default withSentryConfig(nextConfig, {
  org: "your-org",
  project: "your-project",
  silent: !process.env.CI, // Suppress logs outside CI
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring", // Proxy to avoid ad-blockers
  hideSourceMaps: true,
  disableLogger: true,
});
```

### React (Standalone)

```typescript
// src/instrument.ts — import BEFORE React
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "__DSN__",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,
});
```

### Node.js

```typescript
// instrument.ts — import at very top of entry point
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "__DSN__",
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1, // Profiling (if enabled)
});
```

### Astro

```bash
npx astro add @sentry/astro
```

```typescript
// astro.config.mjs
import sentry from "@sentry/astro";

export default defineConfig({
  integrations: [
    sentry({
      dsn: "__DSN__",
      sourceMapsUploadOptions: {
        project: "your-project",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
    }),
  ],
});
```

---

## Configuration Options

```typescript
Sentry.init({
  dsn: "__DSN__",                          // Required
  environment: "production",               // Filters in dashboard
  release: "my-app@1.2.3",                // Links errors to releases
  tracesSampleRate: 0.1,                   // 10% of transactions traced
  sampleRate: 1.0,                         // 100% of errors captured
  maxBreadcrumbs: 50,                      // Breadcrumb history depth
  attachStacktrace: true,                  // Stack traces on messages too
  normalizeDepth: 5,                       // Context object serialization depth
  beforeSend(event) {                      // Filter/modify events before sending
    if (event.exception?.values?.[0]?.type === "ChunkLoadError") {
      return null; // Drop noisy errors
    }
    return event;
  },
  ignoreErrors: [
    "ResizeObserver loop",
    /^NetworkError/,
    "Non-Error exception captured",
  ],
  denyUrls: [/extensions\//i, /^chrome:\/\//i], // Ignore browser extension errors
});
```

---

## Error Boundaries (React)

```typescript
import * as Sentry from "@sentry/react";

// Wrap your app or specific sections
function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div role="alert">
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          <button onClick={resetError}>Try Again</button>
        </div>
      )}
      onError={(error, componentStack) => {
        // Additional error handling
      }}
      showDialog // Show Sentry user feedback dialog
    >
      <MainContent />
    </Sentry.ErrorBoundary>
  );
}

// Next.js — global-error.tsx
// src/app/global-error.tsx
"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <h2>Something went wrong</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
```

---

## Performance Monitoring

### Automatic Instrumentation

Browser tracing and server tracing integrations capture:
- Page loads, navigations, API calls (browser)
- HTTP requests, database queries (server)

### Custom Spans

```typescript
import * as Sentry from "@sentry/node"; // or @sentry/nextjs

async function processOrder(orderId: string) {
  return Sentry.startSpan(
    { name: "process-order", op: "order.process", attributes: { orderId } },
    async (span) => {
      // Nested span
      const items = await Sentry.startSpan(
        { name: "fetch-items", op: "db.query" },
        async () => {
          return await db.query("SELECT * FROM order_items WHERE order_id = $1", [orderId]);
        }
      );

      await Sentry.startSpan(
        { name: "charge-payment", op: "payment.charge" },
        async () => {
          await chargePayment(orderId, items);
        }
      );

      span.setStatus({ code: 1, message: "ok" }); // SpanStatusCode.OK
      return { success: true };
    }
  );
}
```

---

## Source Maps

### Automatic Upload (Next.js)

Handled by `withSentryConfig` — just set `SENTRY_AUTH_TOKEN` in env.

### Manual Upload (Vite/Webpack)

```bash
pnpm add -D @sentry/vite-plugin
```

```typescript
// vite.config.ts
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: { sourcemap: true },
  plugins: [
    sentryVitePlugin({
      org: "your-org",
      project: "your-project",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

---

## Breadcrumbs

```typescript
// Automatic breadcrumbs include: console, DOM clicks, XHR/fetch, navigation

// Custom breadcrumbs
Sentry.addBreadcrumb({
  category: "auth",
  message: `User logged in: ${userId}`,
  level: "info",
  data: { method: "oauth", provider: "google" },
});

Sentry.addBreadcrumb({
  category: "cart",
  message: "Item added to cart",
  level: "info",
  data: { productId, quantity },
});
```

---

## Context, Tags, and User

```typescript
// Set user context — appears on all subsequent events
Sentry.setUser({
  id: user.id,
  email: user.email, // Only if PII policy allows
  username: user.username,
  ip_address: "{{auto}}", // Sentry infers from request
});

// Clear on logout
Sentry.setUser(null);

// Tags — indexed, searchable in dashboard
Sentry.setTag("feature", "checkout");
Sentry.setTag("plan", "premium");

// Extra context — not indexed, for debugging
Sentry.setExtra("orderDetails", { items: 3, total: 49.99 });

// Structured context — grouped in event detail view
Sentry.setContext("order", {
  id: orderId,
  total: 49.99,
  currency: "USD",
});
```

---

## Issue Grouping and Fingerprinting

```typescript
// Custom fingerprint — group related errors together
Sentry.captureException(error, {
  fingerprint: ["payment-processing", merchantId],
});

// Group by error message pattern
Sentry.init({
  beforeSend(event) {
    if (event.message?.includes("rate limit")) {
      event.fingerprint = ["rate-limit-error"];
    }
    return event;
  },
});
```

---

## Session Replay

```typescript
import * as Sentry from "@sentry/react"; // or @sentry/nextjs

Sentry.init({
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,        // Mask all text for privacy
      blockAllMedia: true,      // Block images/video
      maskAllInputs: true,      // Mask form inputs
      // Selective unmasking
      unmask: [".sentry-unmask"],
    }),
  ],
  replaysSessionSampleRate: 0.1, // 10% of all sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
});
```

---

## Cron Monitoring

```typescript
import * as Sentry from "@sentry/node";

// Wrap cron job
const checkInId = Sentry.captureCheckIn({
  monitorSlug: "daily-cleanup",
  status: "in_progress",
}, {
  schedule: { type: "crontab", value: "0 3 * * *" }, // 3 AM daily
  checkinMargin: 5,  // Minutes before considered missed
  maxRuntime: 30,    // Minutes before considered failed
});

try {
  await runDailyCleanup();

  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "daily-cleanup",
    status: "ok",
  });
} catch (error) {
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "daily-cleanup",
    status: "error",
  });
  throw error;
}
```

---

## User Feedback

```typescript
import * as Sentry from "@sentry/react";

// Crash report dialog — shows after error boundary triggers
Sentry.init({
  beforeSend(event) {
    if (event.exception) {
      Sentry.showReportDialog({ eventId: event.event_id });
    }
    return event;
  },
});

// Programmatic feedback widget
const eventId = Sentry.lastEventId();
if (eventId) {
  Sentry.showReportDialog({
    eventId,
    title: "Something went wrong",
    subtitle: "Our team has been notified.",
    subtitle2: "If you'd like to help, tell us what happened below.",
  });
}
```

---

## PII Scrubbing and Data Privacy

```typescript
Sentry.init({
  beforeSend(event) {
    // Strip PII from user context
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }

    // Scrub sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["Authorization"];
      delete event.request.headers["Cookie"];
    }

    return event;
  },

  beforeBreadcrumb(breadcrumb) {
    // Strip URLs with tokens
    if (breadcrumb.data?.url) {
      const url = new URL(breadcrumb.data.url);
      url.searchParams.delete("token");
      url.searchParams.delete("key");
      breadcrumb.data.url = url.toString();
    }
    return breadcrumb;
  },

  // Server-side: do not send PII
  sendDefaultPii: false,
});
```

---

## Release Tracking

```bash
# Create release and associate commits
sentry-cli releases new "my-app@1.2.3"
sentry-cli releases set-commits "my-app@1.2.3" --auto
sentry-cli releases finalize "my-app@1.2.3"

# Mark deploy
sentry-cli releases deploys "my-app@1.2.3" new -e production
```

---

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Correct Approach |
|---|---|---|
| `tracesSampleRate: 1.0` in production | Enormous volume, high cost | Use 0.05-0.2 in prod, 1.0 in dev |
| Capturing handled/expected errors | Noisy alerts, alert fatigue | Only capture unexpected errors |
| No `beforeSend` filtering | Browser extension junk pollutes data | Filter known noisy errors |
| Logging PII in context/breadcrumbs | Privacy violations, GDPR risk | Scrub PII in `beforeSend` |
| Same DSN for all environments | Cannot filter prod vs dev | Separate DSNs or use `environment` tag |
| Not setting `release` | Cannot track regressions across deploys | Always set release to deploy version |
| Alerting on every error | Alert fatigue, team ignores alerts | Alert on new issues, spikes, P99 degradation |
| Missing source maps | Minified stack traces are useless | Upload source maps in CI, hide from public |
| `sampleRate: 0.01` on errors | Missing real errors | Keep error sampleRate at 1.0, lower traces |
| Not cleaning up user context on logout | PII attributed to wrong user | Call `Sentry.setUser(null)` on sign-out |

---

**Last verified**: 2026-02-16 | **Skill version**: 1.0.0
