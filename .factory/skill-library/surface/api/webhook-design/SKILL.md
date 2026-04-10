---
name: webhook-design
description: "Design reliable webhook systems with HMAC payload signing, retry policies, idempotency keys, dead letter queues, registration APIs, payload versioning, and local testing patterns. Use when building webhook delivery, webhook consumers, or event notification systems."
version: 1.0.0
---

# Webhook Design & Reliability

Webhooks are HTTP callbacks that notify external systems when events occur. Unlike APIs where the consumer polls, webhooks push data to the consumer. This inversion creates unique reliability challenges.

## Core Principles

1. **At-least-once delivery** --- assume webhooks may be delivered more than once
2. **Payload signing** --- consumers must verify the webhook came from you
3. **Retry with backoff** --- transient failures must not lose events
4. **Idempotency** --- consumers must handle duplicate deliveries safely
5. **Versioned payloads** --- changing the shape without warning breaks consumers

---

## Payload Signing (HMAC-SHA256)

Every webhook request must include a signature so consumers can verify authenticity and integrity.

### Generating Signatures (Producer)

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

async function deliverWebhook(
  url: string,
  event: WebhookEvent,
  secret: string
): Promise<Response> {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signedContent = `${timestamp}.${payload}`;
  const signature = signPayload(signedContent, secret);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-ID': event.id,
      'X-Webhook-Timestamp': String(timestamp),
      'X-Webhook-Signature': `v1=${signature}`,
    },
    body: payload,
    signal: AbortSignal.timeout(30_000), // 30 second timeout
  });
}
```

### Verifying Signatures (Consumer)

```typescript
function verifyWebhookSignature(
  payload: string,
  timestamp: string,
  signature: string,
  secret: string
): boolean {
  // Reject if timestamp is too old (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp, 10);
  if (Math.abs(now - webhookTime) > 300) { // 5 minute tolerance
    return false;
  }

  const expectedSignature = `v1=${signPayload(`${timestamp}.${payload}`, secret)}`;

  // Timing-safe comparison to prevent timing attacks
  const expected = Buffer.from(expectedSignature, 'utf8');
  const received = Buffer.from(signature, 'utf8');

  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

// Usage in webhook handler
export async function POST({ request }: APIContext) {
  const payload = await request.text();
  const timestamp = request.headers.get('X-Webhook-Timestamp') ?? '';
  const signature = request.headers.get('X-Webhook-Signature') ?? '';

  if (!verifyWebhookSignature(payload, timestamp, signature, WEBHOOK_SECRET)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(payload);
  await processWebhookEvent(event);

  return new Response('OK', { status: 200 });
}
```

---

## Retry Policies with Exponential Backoff

### Retry Schedule

| Attempt | Delay | Total Elapsed |
|---------|-------|---------------|
| 1 | Immediate | 0 |
| 2 | 30 seconds | 30s |
| 3 | 2 minutes | 2.5 min |
| 4 | 15 minutes | 17.5 min |
| 5 | 1 hour | 1 hr 17 min |
| 6 | 4 hours | 5 hr 17 min |
| 7 | 8 hours | 13 hr 17 min |
| 8 | 24 hours | 37 hr 17 min |

### Implementation

```typescript
interface RetryPolicy {
  maxAttempts: number;
  baseDelay: number;        // milliseconds
  maxDelay: number;          // milliseconds
  backoffMultiplier: number;
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 8,
  baseDelay: 30_000,       // 30 seconds
  maxDelay: 86_400_000,    // 24 hours
  backoffMultiplier: 4,
};

function calculateDelay(attempt: number, policy: RetryPolicy): number {
  const delay = policy.baseDelay * Math.pow(policy.backoffMultiplier, attempt - 1);
  // Add jitter (0-25% random variation) to prevent thundering herd
  const jitter = delay * 0.25 * Math.random();
  return Math.min(delay + jitter, policy.maxDelay);
}

async function deliverWithRetry(
  webhook: WebhookDelivery,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): Promise<DeliveryResult> {
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      const response = await deliverWebhook(webhook.url, webhook.event, webhook.secret);

      if (response.ok) {
        return { status: 'delivered', attempt, statusCode: response.status };
      }

      // 4xx errors (except 429) are permanent failures --- do not retry
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return { status: 'failed_permanent', attempt, statusCode: response.status };
      }

      // 429 or 5xx: retry
      if (attempt < policy.maxAttempts) {
        const delay = response.status === 429
          ? parseInt(response.headers.get('Retry-After') ?? '60', 10) * 1000
          : calculateDelay(attempt, policy);
        await scheduleRetry(webhook, delay, attempt + 1);
        return { status: 'retrying', attempt, nextRetryIn: delay };
      }
    } catch (error) {
      // Network error: retry
      if (attempt < policy.maxAttempts) {
        const delay = calculateDelay(attempt, policy);
        await scheduleRetry(webhook, delay, attempt + 1);
        return { status: 'retrying', attempt, nextRetryIn: delay };
      }
    }
  }

  // All retries exhausted
  await moveToDeadLetterQueue(webhook);
  return { status: 'dead_lettered', attempt: policy.maxAttempts };
}
```

---

## Idempotency Keys

Every webhook event must have a unique ID. Consumers use this to deduplicate.

### Producer Side

```typescript
interface WebhookEvent {
  id: string;           // Unique event ID (idempotency key)
  type: string;         // Event type
  createdAt: string;    // ISO 8601 timestamp
  data: unknown;        // Event payload
}

function createWebhookEvent(type: string, data: unknown): WebhookEvent {
  return {
    id: crypto.randomUUID(),
    type,
    createdAt: new Date().toISOString(),
    data,
  };
}
```

### Consumer Side

```typescript
// Deduplicate using processed event IDs
async function processWebhookEvent(event: WebhookEvent): Promise<void> {
  // Check if already processed
  const alreadyProcessed = await redis.sismember('processed-webhooks', event.id);
  if (alreadyProcessed) {
    console.log(`Webhook ${event.id} already processed, skipping`);
    return;
  }

  // Process the event
  await handleEvent(event);

  // Mark as processed (expire after 7 days to prevent unbounded growth)
  await redis.sadd('processed-webhooks', event.id);
  await redis.expire('processed-webhooks', 7 * 24 * 60 * 60);
}
```

---

## Dead Letter Queues

Events that fail all retry attempts go to a dead letter queue for manual inspection and replay.

```typescript
interface DeadLetter {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  endpoint: string;
  lastAttempt: string;
  attemptCount: number;
  lastError: string;
  lastStatusCode: number | null;
}

async function moveToDeadLetterQueue(delivery: WebhookDelivery): Promise<void> {
  const deadLetter: DeadLetter = {
    id: crypto.randomUUID(),
    webhookId: delivery.webhookId,
    event: delivery.event,
    endpoint: delivery.url,
    lastAttempt: new Date().toISOString(),
    attemptCount: delivery.attemptCount,
    lastError: delivery.lastError ?? 'Unknown error',
    lastStatusCode: delivery.lastStatusCode ?? null,
  };

  await db.create('dead_letter_queue', deadLetter);

  // Notify operators
  await alertOps({
    channel: 'webhook-failures',
    message: `Webhook to ${delivery.url} failed after ${delivery.attemptCount} attempts. Event: ${delivery.event.type}`,
  });
}
```

### Admin: Replay Dead Letters

```typescript
// API endpoint to replay a dead letter
export async function POST({ params }: APIContext) {
  const deadLetter = await db.get<DeadLetter>('dead_letter_queue', params.id);
  if (!deadLetter) return new Response(null, { status: 404 });

  // Re-queue for delivery
  await enqueueWebhookDelivery({
    webhookId: deadLetter.webhookId,
    event: deadLetter.event,
    url: deadLetter.endpoint,
    attemptCount: 0, // Reset attempts
  });

  // Remove from DLQ
  await db.delete('dead_letter_queue', params.id);

  return new Response(JSON.stringify({ status: 'replayed' }), { status: 200 });
}
```

---

## Webhook Registration/Management API

### Endpoints

```yaml
paths:
  /webhooks:
    get:
      summary: List registered webhooks
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Webhook'

    post:
      summary: Register a new webhook
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateWebhookRequest'
      responses:
        '201':
          description: Webhook created (secret returned ONCE)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WebhookWithSecret'

  /webhooks/{id}:
    patch:
      summary: Update webhook (URL, events, status)
    delete:
      summary: Delete webhook

  /webhooks/{id}/rotate-secret:
    post:
      summary: Rotate webhook signing secret

  /webhooks/{id}/test:
    post:
      summary: Send a test event to the webhook URL
```

### Schemas

```typescript
import { z } from 'zod';

export const CreateWebhookSchema = z.object({
  url: z.string().url('Must be a valid HTTPS URL').startsWith('https://', 'Webhooks require HTTPS'),
  events: z.array(z.string()).min(1, 'Subscribe to at least one event type'),
  description: z.string().max(200).optional(),
  active: z.boolean().default(true),
});

export const WebhookSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  events: z.array(z.string()),
  description: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  // Secret is NEVER returned after creation
});

export const WebhookWithSecretSchema = WebhookSchema.extend({
  secret: z.string().describe('Signing secret. Shown only once at creation time.'),
});

export type CreateWebhook = z.infer<typeof CreateWebhookSchema>;
export type Webhook = z.infer<typeof WebhookSchema>;
```

### Secret Rotation

```typescript
export async function POST({ params }: APIContext) {
  const webhook = await db.get<Webhook>('webhooks', params.id);
  if (!webhook) return new Response(null, { status: 404 });

  const newSecret = crypto.randomBytes(32).toString('hex');

  // Store both old and new secret for a transition period
  await db.update('webhooks', params.id, {
    secret: newSecret,
    previousSecret: webhook.secret,
    previousSecretExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  });

  return new Response(JSON.stringify({
    secret: newSecret,
    note: 'The previous secret will remain valid for 24 hours to allow a smooth transition.',
  }), { status: 200 });
}
```

---

## Payload Versioning

Include a version in every webhook payload. When the payload shape changes, bump the version and let consumers migrate.

```typescript
interface WebhookEvent<T = unknown> {
  id: string;
  type: string;
  version: string;       // e.g., '2024-01-15' (date-based versioning)
  createdAt: string;
  data: T;
}

// Example: model.updated event, version 2024-01-15
const event: WebhookEvent = {
  id: 'evt_a1b2c3',
  type: 'model.updated',
  version: '2024-01-15',
  createdAt: '2026-02-15T10:30:00Z',
  data: {
    modelId: 'gpt-4o',
    changes: {
      status: { from: 'preview', to: 'active' },
      pricing: { from: { input: 5.0 }, to: { input: 2.5 } },
    },
  },
};
```

### Per-Endpoint Version Selection

Allow consumers to specify which payload version they expect:

```typescript
const CreateWebhookSchemaV2 = CreateWebhookSchema.extend({
  apiVersion: z.string().optional().describe('Payload version (e.g., 2024-01-15). Defaults to latest.'),
});
```

---

## Timeout Handling

### Producer Timeouts

```typescript
async function deliverWebhook(url: string, event: WebhookEvent, secret: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000); // 30 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { /* ... */ },
      body: JSON.stringify(event),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}
```

### Consumer Best Practice: Acknowledge Immediately

```typescript
// Consumer: respond 200 immediately, process asynchronously
export async function POST({ request }: APIContext) {
  const event = await request.json();

  // Verify signature (fast)
  if (!verifySignature(request)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Queue for async processing (fast)
  await queue.enqueue('process-webhook', event);

  // Respond immediately --- do NOT do heavy processing here
  return new Response('Accepted', { status: 202 });
}
```

---

## Event Types and Filtering

### Event Type Taxonomy

```
resource.action

model.created
model.updated
model.deleted
model.status_changed

user.created
user.updated
user.deleted

completion.started
completion.completed
completion.failed

billing.invoice_created
billing.payment_succeeded
billing.payment_failed
```

### Wildcard Subscriptions

```typescript
// Subscribe to all model events
const webhook = await createWebhook({
  url: 'https://consumer.example.com/webhooks',
  events: ['model.*'],  // Wildcard: all model events
});

// Filter during delivery
function shouldDeliver(webhook: Webhook, eventType: string): boolean {
  return webhook.events.some((pattern) => {
    if (pattern === '*') return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventType.startsWith(`${prefix}.`);
    }
    return pattern === eventType;
  });
}
```

---

## Rate Limiting Webhook Delivery

Protect consumers from being overwhelmed during bulk operations.

```typescript
interface DeliveryRateLimit {
  maxPerSecond: number;
  maxConcurrent: number;
  burstSize: number;
}

const DEFAULT_DELIVERY_RATE: DeliveryRateLimit = {
  maxPerSecond: 50,
  maxConcurrent: 10,
  burstSize: 100,
};

// Per-endpoint rate limiting
class WebhookDeliveryQueue {
  private queues = new Map<string, PQueue>();

  getQueue(endpointUrl: string): PQueue {
    if (!this.queues.has(endpointUrl)) {
      this.queues.set(endpointUrl, new PQueue({
        concurrency: DEFAULT_DELIVERY_RATE.maxConcurrent,
        intervalCap: DEFAULT_DELIVERY_RATE.maxPerSecond,
        interval: 1000,
      }));
    }
    return this.queues.get(endpointUrl)!;
  }

  async enqueue(delivery: WebhookDelivery): Promise<void> {
    const queue = this.getQueue(delivery.url);
    await queue.add(() => deliverWithRetry(delivery));
  }
}
```

---

## Replay and Debugging Tools

### Event Log API

```yaml
paths:
  /webhooks/{id}/deliveries:
    get:
      summary: List delivery attempts for a webhook
      parameters:
        - name: status
          in: query
          schema:
            enum: [delivered, failed, retrying, dead_lettered]
        - name: eventType
          in: query
          schema:
            type: string
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id: { type: string }
                    eventId: { type: string }
                    eventType: { type: string }
                    status: { type: string }
                    statusCode: { type: integer }
                    attemptCount: { type: integer }
                    createdAt: { type: string, format: date-time }
                    deliveredAt: { type: string, format: date-time, nullable: true }

  /webhooks/{id}/deliveries/{deliveryId}/replay:
    post:
      summary: Replay a specific delivery
```

### Test Event

```typescript
export async function POST({ params }: APIContext) {
  const webhook = await db.get<Webhook>('webhooks', params.id);
  if (!webhook) return new Response(null, { status: 404 });

  const testEvent: WebhookEvent = {
    id: `test_${crypto.randomUUID()}`,
    type: 'webhook.test',
    version: '2024-01-15',
    createdAt: new Date().toISOString(),
    data: {
      message: 'This is a test webhook delivery.',
      webhookId: webhook.id,
    },
  };

  const result = await deliverWebhook(webhook.url, testEvent, webhook.secret);

  return new Response(JSON.stringify({
    delivered: result.ok,
    statusCode: result.status,
    responseBody: await result.text().catch(() => null),
  }), { status: 200 });
}
```

---

## Testing Webhooks Locally

### ngrok

```bash
# Expose local port 3000 to the internet
ngrok http 3000

# Use the generated URL as your webhook endpoint:
# https://abc123.ngrok.io/api/webhooks/handler
```

### smee.io

```bash
# Create a channel at https://smee.io
npx smee -u https://smee.io/abc123 -t http://localhost:3000/api/webhooks/handler
```

### Local Testing Without External Tools

```typescript
// In tests: mock the webhook consumer
import { describe, it, expect, vi } from 'vitest';

describe('Webhook Delivery', () => {
  it('delivers event with correct signature', async () => {
    const receivedRequests: Request[] = [];

    // Mock consumer server
    const server = Bun.serve({
      port: 9999,
      fetch(request) {
        receivedRequests.push(request);
        return new Response('OK', { status: 200 });
      },
    });

    const event = createWebhookEvent('model.created', { modelId: 'test-1' });
    await deliverWebhook('http://localhost:9999/webhook', event, 'test-secret');

    expect(receivedRequests).toHaveLength(1);
    const req = receivedRequests[0];
    expect(req.headers.get('X-Webhook-Signature')).toBeTruthy();
    expect(req.headers.get('X-Webhook-Timestamp')).toBeTruthy();

    // Verify signature is correct
    const body = await req.text();
    const timestamp = req.headers.get('X-Webhook-Timestamp')!;
    const signature = req.headers.get('X-Webhook-Signature')!;
    expect(verifyWebhookSignature(body, timestamp, signature, 'test-secret')).toBe(true);

    server.stop();
  });

  it('retries on 500 response', async () => {
    let attemptCount = 0;

    const server = Bun.serve({
      port: 9999,
      fetch() {
        attemptCount++;
        if (attemptCount < 3) return new Response('Error', { status: 500 });
        return new Response('OK', { status: 200 });
      },
    });

    const event = createWebhookEvent('model.created', { modelId: 'test-1' });
    const result = await deliverWithRetry({
      url: 'http://localhost:9999/webhook',
      event,
      secret: 'test-secret',
    });

    expect(result.status).toBe('delivered');
    expect(result.attempt).toBe(3);

    server.stop();
  });
});
```

---

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|------------------|
| No payload signing | HMAC-SHA256 with per-webhook secret |
| No retries | Exponential backoff with jitter, up to 8 attempts |
| No idempotency key | Include unique event ID, consumers deduplicate |
| Secret in payload | Secret used only for signing, never transmitted |
| HTTP (not HTTPS) | Require HTTPS for webhook URLs |
| Synchronous processing in consumer | Respond 200/202 immediately, process async |
| No dead letter queue | Failed events must not disappear |
| Returning secret after creation | Show secret only once, allow rotation |
| No event type filtering | Let consumers subscribe to specific event types |
| Unbounded payload size | Set a maximum payload size (e.g., 256KB) |

## References

- [Standard Webhooks Specification](https://www.standardwebhooks.com/)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [GitHub Webhook Documentation](https://docs.github.com/en/webhooks)
- [Svix Webhook Service](https://www.svix.com/)
- [ngrok](https://ngrok.com/)
