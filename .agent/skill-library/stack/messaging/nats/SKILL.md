---
name: nats
description: "NATS messaging patterns covering pub/sub, request/reply, JetStream persistence, key-value store, and subject-based routing. Use when implementing cloud-native messaging with NATS."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# NATS

Cloud-native messaging system. Lightweight, high-performance pub/sub with optional persistence via JetStream. Subject-based routing with wildcard subscriptions.

## When to Use

- Need lightweight, high-throughput pub/sub between services
- Building cloud-native microservices (Kubernetes-native)
- Need request/reply patterns without HTTP overhead
- Want built-in key-value and object store (JetStream)

## When NOT to Use

- Need complex exchange/routing logic (use RabbitMQ)
- Need long-term event replay/streaming (use Kafka)
- Need managed cloud queue without server (use SQS)

## Setup

```bash
npm install nats
```

```typescript
import { connect, StringCodec } from 'nats';

const nc = await connect({ servers: process.env.NATS_URL ?? 'nats://localhost:4222' });
const sc = StringCodec(); // Encode/decode messages

// JSON codec helper
const jc = {
  encode: (obj: unknown) => sc.encode(JSON.stringify(obj)),
  decode: (data: Uint8Array) => JSON.parse(sc.decode(data)),
};
```

## Pub/Sub

```typescript
// Publish
nc.publish('orders.created', jc.encode({ orderId: '1234', total: 99.99 }));

// Subscribe
const sub = nc.subscribe('orders.created');
for await (const msg of sub) {
  const order = jc.decode(msg.data);
  console.log(`Order created: ${order.orderId}`);
}

// Wildcard subscriptions
nc.subscribe('orders.*');       // orders.created, orders.updated — one level
nc.subscribe('orders.>');       // orders.created, orders.us.pending — any depth
```

## Request/Reply

```typescript
// Service (responder)
const sub = nc.subscribe('api.users.get');
for await (const msg of sub) {
  const { userId } = jc.decode(msg.data);
  const user = await db.users.findById(userId);
  msg.respond(jc.encode(user));
}

// Client (requester)
const response = await nc.request('api.users.get', jc.encode({ userId: '123' }), {
  timeout: 5000,
});
const user = jc.decode(response.data);
```

## JetStream (Persistent Messaging)

```typescript
const js = nc.jetstream();
const jsm = await nc.jetstreamManager();

// Create stream
await jsm.streams.add({
  name: 'ORDERS',
  subjects: ['orders.>'],
  retention: 'limits',     // 'limits', 'interest', or 'workqueue'
  max_msgs: 100000,
  max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days (nanoseconds)
});

// Publish to stream
await js.publish('orders.created', jc.encode({ orderId: '1234' }));

// Durable consumer
const consumer = await js.consumers.get('ORDERS', 'order-processor');
const messages = await consumer.consume();
for await (const msg of messages) {
  const order = jc.decode(msg.data);
  await processOrder(order);
  msg.ack();
}
```

## Key-Value Store

```typescript
const kv = await js.views.kv('config');

// Put
await kv.put('feature.new-checkout', sc.encode('true'));

// Get
const entry = await kv.get('feature.new-checkout');
const value = entry ? sc.decode(entry.value) : null;

// Watch for changes
const watch = await kv.watch();
for await (const entry of watch) {
  console.log(`${entry.key} = ${sc.decode(entry.value)}`);
}
```

## Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  await nc.drain(); // Finish processing, then close
});
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Use core NATS for messages that must not be lost | Use JetStream for persistent, acknowledged messaging |
| Create a new connection per request | Reuse a single connection, create subscriptions as needed |
| Use `close()` for graceful shutdown | Use `drain()` to finish in-flight messages before closing |
| Forget to `ack()` JetStream messages | Always ack or nak — unacked messages redeliver after timeout |
| Use overly specific subjects | Design hierarchical subjects (e.g., `orders.us.created`) for flexibility |
| Block the async iterator with slow processing | Process messages concurrently or offload heavy work |
| Skip error handling on `request()` | Set timeout and handle `NatsError` for request/reply |
| Store large binary blobs in KV | Use JetStream Object Store for files, KV for config/state |
