---
name: lemonsqueezy
description: Integrate Lemon Squeezy for SaaS payment processing including subscriptions, checkout, license keys, and webhooks. Use when building payment flows for digital products, SaaS billing, or software licensing with Lemon Squeezy as the merchant of record.
version: 1.0.0
---

# Lemon Squeezy

Integrate Lemon Squeezy as your merchant of record for SaaS billing, digital product sales, and software licensing. Lemon Squeezy handles tax collection, compliance, and payment processing so you do not have to.

## When to Use This Skill

- Building SaaS subscription billing (Lemon Squeezy as MoR handles global tax)
- Selling digital products with license key management
- Creating checkout flows without PCI compliance burden
- Managing customer subscriptions and billing portals
- Implementing usage-based or per-seat pricing

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Store** | Your Lemon Squeezy storefront (one per business) |
| **Product** | What you sell (e.g., "Pro Plan") |
| **Variant** | A pricing option for a product (e.g., "Monthly", "Yearly") |
| **Checkout** | A payment page URL for purchasing a variant |
| **Subscription** | An active recurring payment tied to a customer |
| **License Key** | A software activation key tied to a purchase |
| **Webhook** | Server notification for payment and subscription events |

## Setup

```bash
pnpm add @lemonsqueezy/lemonsqueezy.js
```

### Client Initialization

```typescript
// src/lib/payments/lemonsqueezy.ts
import {
  lemonSqueezySetup,
  getProduct,
  listProducts,
  createCheckout,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  listWebhooks,
} from '@lemonsqueezy/lemonsqueezy.js';

export function initLemonSqueezy() {
  lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY!,
    onError: (error) => {
      console.error('Lemon Squeezy API error:', error.message);
      throw error;
    },
  });
}
```

## Checkout Flow

### Creating a Checkout URL

```typescript
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

export async function createCheckoutUrl(
  variantId: number,
  userId: string,
  userEmail: string,
): Promise<string> {
  const { data, error } = await createCheckout(
    process.env.LEMONSQUEEZY_STORE_ID!,
    variantId,
    {
      checkoutData: {
        email: userEmail,
        custom: {
          user_id: userId, // Maps purchase to your user
        },
      },
      checkoutOptions: {
        embed: false, // true for overlay checkout
        media: true,
        logo: true,
        discount: true,
      },
      productOptions: {
        enabledVariants: [variantId],
        redirectUrl: `${process.env.APP_URL}/billing/success`,
        receiptButtonText: 'Return to Dashboard',
        receiptThankYouNote: 'Thanks for subscribing!',
      },
    },
  );

  if (error) {
    throw new Error(`Checkout creation failed: ${error.message}`);
  }

  return data.data.attributes.url;
}
```

### Embedded Checkout (Client-Side)

```html
<!-- Include Lemon Squeezy script -->
<script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>

<a href="https://your-store.lemonsqueezy.com/checkout/buy/variant-uuid"
   class="lemonsqueezy-button">
  Subscribe
</a>
```

```typescript
// Programmatic overlay checkout
window.LemonSqueezy.Url.Open(checkoutUrl);
```

## Subscription Management

### Fetching Subscription Status

```typescript
import { getSubscription } from '@lemonsqueezy/lemonsqueezy.js';

export async function getSubscriptionStatus(subscriptionId: string) {
  const { data, error } = await getSubscription(subscriptionId);

  if (error) {
    throw new Error(`Failed to fetch subscription: ${error.message}`);
  }

  const attrs = data.data.attributes;
  return {
    status: attrs.status, // 'active' | 'on_trial' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired'
    planName: attrs.product_name,
    variantName: attrs.variant_name,
    renewsAt: attrs.renews_at,
    endsAt: attrs.ends_at,
    trialEndsAt: attrs.trial_ends_at,
    isPaused: attrs.status === 'paused',
    isActive: ['active', 'on_trial'].includes(attrs.status),
  };
}
```

### Updating a Subscription (Plan Change)

```typescript
import { updateSubscription } from '@lemonsqueezy/lemonsqueezy.js';

export async function changePlan(subscriptionId: string, newVariantId: number) {
  const { data, error } = await updateSubscription(subscriptionId, {
    variantId: newVariantId,
    // 'immediate' charges prorated amount now
    // 'next_renewal' changes at end of billing period
    invoiceImmediately: true,
    disableProration: false,
  });

  if (error) {
    throw new Error(`Plan change failed: ${error.message}`);
  }

  return data.data.attributes;
}
```

### Canceling a Subscription

```typescript
import { cancelSubscription } from '@lemonsqueezy/lemonsqueezy.js';

export async function cancelSub(subscriptionId: string) {
  // Cancellation takes effect at end of current billing period
  const { data, error } = await cancelSubscription(subscriptionId);

  if (error) {
    throw new Error(`Cancellation failed: ${error.message}`);
  }

  // data.data.attributes.ends_at contains the final access date
  return data.data.attributes;
}
```

### Pausing and Resuming

```typescript
import { updateSubscription } from '@lemonsqueezy/lemonsqueezy.js';

// Pause
await updateSubscription(subscriptionId, {
  pause: {
    mode: 'void', // 'void' stops billing, 'free' gives free access
    resumesAt: null, // null = indefinite, or ISO date string
  },
});

// Resume
await updateSubscription(subscriptionId, {
  pause: null, // Setting to null unpauses
});
```

## Customer Portal

```typescript
import { getSubscription } from '@lemonsqueezy/lemonsqueezy.js';

export async function getCustomerPortalUrl(subscriptionId: string): Promise<string> {
  const { data, error } = await getSubscription(subscriptionId);
  if (error) throw new Error(error.message);

  // Each subscription has a built-in customer portal URL
  return data.data.attributes.urls.customer_portal;
}
```

## Webhook Handling

### Critical Webhook Events

| Event | When It Fires | Action Required |
|-------|--------------|-----------------|
| `subscription_created` | New subscription starts | Create/update user subscription record |
| `subscription_updated` | Plan change, renewal, or status change | Sync subscription status |
| `subscription_cancelled` | Customer cancels | Set access expiry date |
| `subscription_payment_success` | Renewal payment succeeds | Extend access, send receipt |
| `subscription_payment_failed` | Renewal payment fails | Notify user, set grace period |
| `order_created` | One-time purchase completed | Fulfill order |
| `license_key_created` | License key generated | Store and deliver key |

### Webhook Endpoint

```typescript
// src/pages/api/webhooks/lemonsqueezy.ts
import type { APIRoute } from 'astro';
import crypto from 'node:crypto';

const WEBHOOK_SECRET = import.meta.env.LEMONSQUEEZY_WEBHOOK_SECRET;

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature') ?? '';

  // Verify signature
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(rawBody).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload.meta.event_name;
  const customData = payload.meta.custom_data;
  const userId = customData?.user_id;
  const attrs = payload.data.attributes;

  switch (eventName) {
    case 'subscription_created':
      await db.subscriptions.upsert({
        userId,
        subscriptionId: payload.data.id,
        status: attrs.status,
        planVariantId: attrs.variant_id,
        currentPeriodEnd: attrs.renews_at,
      });
      break;

    case 'subscription_updated':
      await db.subscriptions.update({
        where: { subscriptionId: payload.data.id },
        data: {
          status: attrs.status,
          planVariantId: attrs.variant_id,
          currentPeriodEnd: attrs.renews_at,
          endsAt: attrs.ends_at,
        },
      });
      break;

    case 'subscription_payment_failed':
      await db.subscriptions.update({
        where: { subscriptionId: payload.data.id },
        data: { status: 'past_due' },
      });
      await notifyPaymentFailed(userId);
      break;

    case 'license_key_created':
      await db.licenseKeys.create({
        userId,
        key: attrs.key,
        orderId: payload.data.relationships.order.data.id,
        activationLimit: attrs.activation_limit,
      });
      break;
  }

  return new Response('OK', { status: 200 });
};
```

## License Key Management

```typescript
import {
  listLicenseKeys,
  validateLicenseKey,
  activateLicenseKey,
  deactivateLicenseKey,
} from '@lemonsqueezy/lemonsqueezy.js';

// Validate a license key
export async function validateKey(licenseKey: string, instanceName: string) {
  const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      license_key: licenseKey,
      instance_name: instanceName,
    }),
  });

  const result = await response.json();
  return {
    valid: result.valid,
    error: result.error,
    meta: result.meta, // Contains activation info
  };
}

// Activate a license key on a device/instance
export async function activateKey(licenseKey: string, instanceName: string) {
  const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      license_key: licenseKey,
      instance_name: instanceName,
    }),
  });

  const result = await response.json();
  if (!result.activated) {
    throw new Error(result.error ?? 'Activation failed');
  }
  return result;
}
```

## Discount Codes

Discount codes are managed in the Lemon Squeezy dashboard. To apply them programmatically:

```typescript
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

const { data } = await createCheckout(storeId, variantId, {
  checkoutData: {
    discountCode: 'LAUNCH20', // Pre-created in dashboard
    custom: { user_id: userId },
  },
});
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Checking subscription status only client-side | Always verify server-side via API or webhook-synced DB |
| Not storing `custom_data.user_id` in checkout | You lose the ability to map purchases to users |
| Trusting webhook payloads without signature verification | Always verify HMAC signature |
| Hardcoding variant IDs | Store variant-to-plan mappings in config or database |
| Polling the API for subscription changes | Use webhooks for real-time updates, API for on-demand checks |
| Not handling `subscription_payment_failed` | Users lose access silently -- always notify and set grace period |

## Environment Variables

```env
LEMONSQUEEZY_API_KEY=         # API key from Settings > API
LEMONSQUEEZY_STORE_ID=        # Store ID from Settings > General
LEMONSQUEEZY_WEBHOOK_SECRET=  # Webhook signing secret from Settings > Webhooks
APP_URL=                      # Your app URL for redirect after checkout
```
