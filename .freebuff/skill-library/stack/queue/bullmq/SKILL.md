---
name: bullmq
description: Redis-based job queue with BullMQ. Use when building background job processing, task scheduling, rate-limited workflows, or distributed job pipelines with Node.js. Triggers on BullMQ, Queue, Worker, job queue, background jobs, delayed jobs, repeatable jobs, Bull Board.
version: 1.0.0
---

# BullMQ

BullMQ is a Redis-based queue for Node.js. It provides reliable job processing with retries, delays, priorities, rate limiting, repeatable jobs, parent-child flows, and sandboxed processors. It is the successor to Bull and the standard choice for production job queues in the Node.js ecosystem.

## Installation

```bash
pnpm add bullmq
# Redis is required — BullMQ connects to Redis, not an embedded store
pnpm add ioredis  # peer dependency
```

## Core Architecture

```
Producer (Queue) ──enqueue──> Redis <──dequeue── Consumer (Worker)
                                │
                         QueueEvents (listener)
```

Three primary classes:
- **Queue**: Enqueues jobs (producer side)
- **Worker**: Processes jobs (consumer side)
- **QueueEvents**: Listens to lifecycle events (monitoring side)

## Connection Configuration

```typescript
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

// Shared connection — reuse across Queue, Worker, QueueEvents
const connection = new IORedis({
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ workers
});

const queue = new Queue('email', { connection });
const worker = new Worker('email', processEmail, { connection });
```

**Anti-pattern**: Never set `maxRetriesPerRequest` to a number on worker connections. BullMQ uses blocking Redis commands (`BRPOPLPUSH`) that must not be retried automatically.

## Queue — Producing Jobs

```typescript
import { Queue } from 'bullmq';

const emailQueue = new Queue('email', { connection });

// Basic job
await emailQueue.add('welcome', { userId: 'u_123', template: 'welcome' });

// Job with options
await emailQueue.add('invoice', { orderId: 'ord_456' }, {
  delay: 5000,              // Wait 5s before processing
  attempts: 3,              // Retry up to 3 times on failure
  backoff: {
    type: 'exponential',    // 'fixed' | 'exponential'
    delay: 1000,            // Base delay in ms
  },
  priority: 1,              // Lower number = higher priority (default: 0)
  removeOnComplete: { count: 1000 },  // Keep last 1000 completed
  removeOnFail: { age: 7 * 24 * 3600 }, // Keep failures for 7 days
});
```

### Bulk Add

```typescript
await emailQueue.addBulk([
  { name: 'welcome', data: { userId: 'u_1' } },
  { name: 'welcome', data: { userId: 'u_2' } },
  { name: 'welcome', data: { userId: 'u_3' } },
]);
```

### Repeatable Jobs (Cron / Interval)

```typescript
// Cron-based
await emailQueue.add('daily-digest', {}, {
  repeat: { pattern: '0 9 * * *' }, // Every day at 09:00 UTC
});

// Interval-based
await emailQueue.add('health-check', {}, {
  repeat: { every: 30_000 }, // Every 30 seconds
});

// Remove a repeatable job
const repeatableJobs = await emailQueue.getRepeatableJobs();
await emailQueue.removeRepeatableByKey(repeatableJobs[0].key);
```

## Worker — Processing Jobs

```typescript
import { Worker, Job } from 'bullmq';

const worker = new Worker('email', async (job: Job) => {
  // job.name — the job name ('welcome', 'invoice')
  // job.data — the payload
  // job.id   — unique job ID
  // job.attemptsMade — current attempt number

  await sendEmail(job.data.userId, job.data.template);

  // Return value is stored as job result
  return { sent: true, timestamp: Date.now() };
}, {
  connection,
  concurrency: 5,            // Process up to 5 jobs in parallel
  limiter: {
    max: 100,                 // Max 100 jobs
    duration: 60_000,         // Per 60 seconds (rate limiting)
  },
});
```

### Named Processors

Handle different job types in one worker:

```typescript
const worker = new Worker('notifications', async (job: Job) => {
  switch (job.name) {
    case 'email':
      return await handleEmail(job.data);
    case 'sms':
      return await handleSms(job.data);
    case 'push':
      return await handlePush(job.data);
    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
}, { connection });
```

### Progress Reporting

```typescript
const worker = new Worker('video-encode', async (job: Job) => {
  for (let i = 0; i < 100; i++) {
    await encodeChunk(i);
    await job.updateProgress(i + 1);
  }
  return { encoded: true };
}, { connection });
```

### Sandboxed Processors

Run processor in a separate child process to isolate crashes:

```typescript
import { Worker } from 'bullmq';
import path from 'node:path';

const worker = new Worker(
  'heavy-compute',
  path.join(__dirname, 'processors/heavy-compute.js'),
  { connection, useWorkerThreads: true } // Worker threads instead of child process
);
```

```typescript
// processors/heavy-compute.js
import { SandboxedJob } from 'bullmq';

export default async function (job: SandboxedJob) {
  // Runs in isolation — a crash here does not kill the main process
  return await computeResult(job.data);
}
```

## Flow Producer — Parent-Child Job Graphs

Create dependency trees where children must complete before the parent processes:

```typescript
import { FlowProducer } from 'bullmq';

const flow = new FlowProducer({ connection });

await flow.add({
  name: 'generate-report',
  queueName: 'reports',
  data: { reportId: 'r_1' },
  children: [
    {
      name: 'fetch-sales',
      queueName: 'data-fetch',
      data: { source: 'sales' },
    },
    {
      name: 'fetch-inventory',
      queueName: 'data-fetch',
      data: { source: 'inventory' },
    },
  ],
});
// Parent job waits until both children complete, then processes with their results
```

Access child results from parent:

```typescript
const worker = new Worker('reports', async (job: Job) => {
  const childValues = await job.getChildrenValues();
  // childValues is Record<string, ReturnType> keyed by `queueName:jobId`
  return buildReport(childValues);
}, { connection });
```

## QueueEvents — Lifecycle Monitoring

```typescript
import { QueueEvents } from 'bullmq';

const events = new QueueEvents('email', { connection });

events.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed with`, returnvalue);
});

events.on('failed', ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed:`, failedReason);
});

events.on('progress', ({ jobId, data: progress }) => {
  console.log(`Job ${jobId} progress:`, progress);
});

events.on('stalled', ({ jobId }) => {
  console.warn(`Job ${jobId} stalled — worker may have crashed`);
});

events.on('delayed', ({ jobId, delay }) => {
  console.log(`Job ${jobId} delayed by ${delay}ms`);
});
```

## Stalled Jobs

A job is stalled when the worker processing it stops sending heartbeats (crash, memory pressure, blocked event loop). BullMQ automatically moves stalled jobs back to the waiting state.

```typescript
const worker = new Worker('critical', processor, {
  connection,
  stalledInterval: 30_000,   // Check for stalled jobs every 30s (default)
  maxStalledCount: 1,        // Mark as failed after 1 stall (default: 1)
  lockDuration: 30_000,      // How long a job lock lasts before considered stalled
});
```

**Anti-pattern**: Setting `lockDuration` too low for long-running jobs. If your job takes 5 minutes, set `lockDuration` to at least 600_000 (10 minutes) to avoid false stalls.

## Dashboard — Bull Board

```bash
pnpm add @bull-board/api @bull-board/express
```

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import express from 'express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(videoQueue),
  ],
  serverAdapter,
});

const app = express();
app.use('/admin/queues', serverAdapter.getRouter());
app.listen(3000);
```

## Testing

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { describe, it, expect, afterAll } from 'vitest';

describe('email queue', () => {
  const connection = { host: '127.0.0.1', port: 6379 };
  const queue = new Queue('test-email', { connection });

  afterAll(async () => {
    await queue.obliterate({ force: true }); // Clean up test queue
    await queue.close();
  });

  it('processes welcome email', async () => {
    const result = await new Promise<string>(async (resolve) => {
      const worker = new Worker('test-email', async (job: Job) => {
        return `sent-to-${job.data.userId}`;
      }, { connection });

      worker.on('completed', async (job: Job) => {
        resolve(await job.returnvalue);
        await worker.close();
      });

      await queue.add('welcome', { userId: 'u_test' });
    });

    expect(result).toBe('sent-to-u_test');
  });
});
```

**Testing anti-pattern**: Do not mock BullMQ internals. Use a real Redis instance (Docker or CI service) for integration tests. Mock only external services your processor calls.

## Graceful Shutdown

```typescript
import { Worker, Queue } from 'bullmq';

const workers: Worker[] = [];

function createWorker(name: string, processor: (job: Job) => Promise<unknown>) {
  const worker = new Worker(name, processor, { connection });
  workers.push(worker);
  return worker;
}

async function shutdown() {
  console.log('Shutting down gracefully...');

  // Close workers first — finishes current jobs, stops taking new ones
  await Promise.all(workers.map((w) => w.close()));

  // Then close queues
  await emailQueue.close();

  // Finally close Redis connection
  await connection.quit();

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|-------------|-------------|-----------------|
| Storing large payloads in job data | Redis memory pressure, slow serialization | Store data externally, pass IDs in job data |
| Not setting `removeOnComplete` | Redis fills up with completed job records | Use `{ count: 1000 }` or `{ age: 86400 }` |
| Using `maxRetriesPerRequest` on worker connections | BullMQ blocking commands fail | Set `maxRetriesPerRequest: null` |
| Processing side effects without idempotency | Retries cause duplicate actions | Design processors to be idempotent |
| Not closing workers on shutdown | Jobs get stalled, then retried | Call `worker.close()` on SIGTERM/SIGINT |
| Short `lockDuration` with long jobs | Jobs falsely stall mid-processing | Set `lockDuration` > max expected job duration |

## Decision Guide

| Need | BullMQ Feature |
|------|---------------|
| Retry failed jobs | `attempts` + `backoff` options |
| Schedule future work | `delay` option |
| Recurring tasks | `repeat` with cron pattern or interval |
| Rate limit processing | `limiter` on Worker |
| Job dependencies | FlowProducer parent-child trees |
| Crash isolation | Sandboxed processors |
| Monitor job status | QueueEvents or Bull Board dashboard |
| Priority processing | `priority` option (lower = higher priority) |
