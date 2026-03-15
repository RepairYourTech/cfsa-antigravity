---
name: rabbitmq
description: "RabbitMQ messaging patterns covering exchanges, queues, routing, pub/sub, RPC, dead-letter queues, and connection management. Use when implementing message queuing with RabbitMQ."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# RabbitMQ

Open-source message broker implementing AMQP 0-9-1. Reliable message delivery with exchanges, queues, routing, acknowledgments, and dead-letter handling.

## When to Use

- Need reliable async message passing between services
- Building event-driven microservices
- Need complex routing (topic, headers, fan-out)
- Want durable message persistence with delivery guarantees

## When NOT to Use

- Need a simple job queue (use BullMQ with Redis)
- Need event streaming with replay (use Kafka)
- All services are serverless/stateless (use SQS or cloud pub/sub)

## Setup

### Installation

```bash
npm install amqplib
npm install @types/amqplib  # TypeScript types
```

### Connection

```typescript
import amqp, { Connection, Channel } from 'amqplib';

let connection: Connection;
let channel: Channel;

async function connect() {
  connection = await amqp.connect(process.env.RABBITMQ_URL ?? 'amqp://localhost');
  channel = await connection.createChannel();

  // Prefetch: process one message at a time
  await channel.prefetch(1);

  // Handle connection errors
  connection.on('error', (err) => console.error('RabbitMQ connection error:', err));
  connection.on('close', () => setTimeout(connect, 5000)); // Reconnect
}
```

## Patterns

### Work Queue (Task Distribution)

```typescript
// Producer
async function enqueueTask(queue: string, task: object) {
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(task)), {
    persistent: true,   // Survive broker restart
    contentType: 'application/json',
  });
}

// Consumer
async function consumeTasks(queue: string, handler: (task: any) => Promise<void>) {
  await channel.assertQueue(queue, { durable: true });
  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const task = JSON.parse(msg.content.toString());
      await handler(task);
      channel.ack(msg);       // Acknowledge successful processing
    } catch (err) {
      channel.nack(msg, false, false); // Reject, don't requeue (goes to DLQ if configured)
    }
  });
}
```

### Publish/Subscribe (Fan-Out)

```typescript
// Publisher
async function publish(exchange: string, event: object) {
  await channel.assertExchange(exchange, 'fanout', { durable: true });
  channel.publish(exchange, '', Buffer.from(JSON.stringify(event)), {
    persistent: true,
    contentType: 'application/json',
  });
}

// Subscriber
async function subscribe(exchange: string, handler: (event: any) => Promise<void>) {
  await channel.assertExchange(exchange, 'fanout', { durable: true });
  const { queue } = await channel.assertQueue('', { exclusive: true }); // Auto-delete queue
  await channel.bindQueue(queue, exchange, '');
  channel.consume(queue, async (msg) => {
    if (!msg) return;
    const event = JSON.parse(msg.content.toString());
    await handler(event);
    channel.ack(msg);
  });
}
```

### Topic Routing

```typescript
// Publisher
await channel.assertExchange('events', 'topic', { durable: true });
channel.publish('events', 'order.created', Buffer.from(JSON.stringify(order)));
channel.publish('events', 'order.cancelled', Buffer.from(JSON.stringify(order)));

// Subscriber — listen to specific patterns
await channel.bindQueue(queue, 'events', 'order.*');        // All order events
await channel.bindQueue(queue, 'events', 'order.created');  // Only order.created
await channel.bindQueue(queue, 'events', '#');               // All events
```

### Dead-Letter Queue (DLQ)

```typescript
// Set up DLQ
await channel.assertQueue('tasks.dlq', { durable: true });
await channel.assertExchange('dlx', 'direct', { durable: true });
await channel.bindQueue('tasks.dlq', 'dlx', 'tasks');

// Main queue with DLQ config
await channel.assertQueue('tasks', {
  durable: true,
  deadLetterExchange: 'dlx',
  deadLetterRoutingKey: 'tasks',
  messageTtl: 30000, // Optional: messages expire after 30s
});
```

## Graceful Shutdown

```typescript
async function shutdown() {
  await channel.close();
  await connection.close();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| Exchange | Routes messages to queues (fanout, direct, topic, headers) |
| Queue | Stores messages until consumed |
| Binding | Rule connecting an exchange to a queue |
| Ack | Consumer confirms message processed successfully |
| Nack | Consumer rejects message (requeue or send to DLQ) |
| Prefetch | Max unacknowledged messages per consumer |
| Persistent | Message survives broker restart (written to disk) |

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Create a new connection per message | Reuse connections, create channels per operation context |
| Forget to `ack` or `nack` messages | Always acknowledge — unacked messages block the queue |
| Use `autoAck: true` for important work | Manual ack after successful processing for reliability |
| Skip `durable: true` on production queues | Always use durable queues and persistent messages |
| Ignore connection `error`/`close` events | Implement reconnection logic with backoff |
| Use `prefetch(0)` (unlimited) | Set prefetch to a sensible value (1-10) to prevent overload |
| Put large payloads in messages | Store large data externally, pass references in messages |
| Create unbounded exclusive queues | Monitor queue depth, set TTL or max-length policies |
