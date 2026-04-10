---
name: sqs
description: "AWS SQS patterns covering standard/FIFO queues, message sending/receiving, dead-letter queues, Lambda triggers, batch operations, and visibility timeout management. Use when implementing message queuing with AWS SQS."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# AWS SQS

Fully managed message queue service. Zero operational overhead. Two queue types: Standard (at-least-once, near-unlimited throughput) and FIFO (exactly-once, ordered).

## When to Use

- Building on AWS and need async message passing
- Decoupling services in a serverless architecture
- Need a managed queue with no broker to maintain
- Want Lambda-triggered message processing

## When NOT to Use

- Need complex routing or exchange patterns (use RabbitMQ)
- Need event streaming with replay/reprocessing (use Kafka/Kinesis)
- All services are non-AWS (evaluate cloud-agnostic alternatives)

## Setup

### Installation

```bash
npm install @aws-sdk/client-sqs
```

### Client Initialization

```typescript
import { SQSClient } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  // Credentials auto-detected from env, IAM role, or ~/.aws/credentials
});
```

### Environment Variables

```env
AWS_REGION=us-east-1
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/my-queue
SQS_DLQ_URL=https://sqs.us-east-1.amazonaws.com/123456789/my-queue-dlq
```

## Send Messages

```typescript
import { SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

// Send single message
await sqs.send(new SendMessageCommand({
  QueueUrl: process.env.SQS_QUEUE_URL!,
  MessageBody: JSON.stringify({ orderId: '1234', action: 'process' }),
  MessageAttributes: {
    eventType: { DataType: 'String', StringValue: 'order.created' },
  },
  DelaySeconds: 0, // 0-900 seconds
}));

// FIFO queue — requires MessageGroupId and MessageDeduplicationId
await sqs.send(new SendMessageCommand({
  QueueUrl: process.env.SQS_FIFO_QUEUE_URL!,
  MessageBody: JSON.stringify({ orderId: '1234' }),
  MessageGroupId: 'order-1234',             // Messages in same group processed in order
  MessageDeduplicationId: 'order-1234-v1',  // Prevents duplicate processing
}));

// Batch send (up to 10 messages)
await sqs.send(new SendMessageBatchCommand({
  QueueUrl: process.env.SQS_QUEUE_URL!,
  Entries: items.map((item, i) => ({
    Id: `msg-${i}`,
    MessageBody: JSON.stringify(item),
  })),
}));
```

## Receive and Process Messages

```typescript
import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

async function pollMessages() {
  const { Messages } = await sqs.send(new ReceiveMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL!,
    MaxNumberOfMessages: 10,    // 1-10
    WaitTimeSeconds: 20,         // Long polling (recommended)
    VisibilityTimeout: 30,       // Seconds before message becomes visible again
    MessageAttributeNames: ['All'],
  }));

  if (!Messages) return;

  for (const message of Messages) {
    try {
      const body = JSON.parse(message.Body!);
      await processMessage(body);

      // Delete after successful processing
      await sqs.send(new DeleteMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL!,
        ReceiptHandle: message.ReceiptHandle!,
      }));
    } catch (err) {
      console.error('Failed to process:', err);
      // Message becomes visible again after VisibilityTimeout expires
    }
  }
}
```

## Lambda Trigger

```typescript
// Lambda handler for SQS events
import { SQSEvent, SQSBatchResponse } from 'aws-lambda';

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      await processMessage(body);
    } catch (err) {
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  // Partial batch failure reporting
  return { batchItemFailures: failures };
}
```

## Dead-Letter Queue Setup

Configure via AWS Console, CDK, or Terraform:

```typescript
// CDK example
import { Queue } from 'aws-cdk-lib/aws-sqs';

const dlq = new Queue(this, 'MyDLQ', {
  queueName: 'my-queue-dlq',
  retentionPeriod: Duration.days(14),
});

const mainQueue = new Queue(this, 'MyQueue', {
  queueName: 'my-queue',
  visibilityTimeout: Duration.seconds(30),
  deadLetterQueue: {
    queue: dlq,
    maxReceiveCount: 3, // Move to DLQ after 3 failed attempts
  },
});
```

## Standard vs FIFO

| Feature | Standard | FIFO |
|---------|----------|------|
| Throughput | ~unlimited | 300 msg/sec (3000 with batching) |
| Ordering | Best-effort | Strict per MessageGroupId |
| Delivery | At-least-once | Exactly-once |
| Queue name | `my-queue` | `my-queue.fifo` |
| Deduplication | Not automatic | 5-minute dedup window |

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Use short polling (WaitTimeSeconds=0) | Use long polling (WaitTimeSeconds=20) to reduce costs |
| Process messages without deleting them | Always delete after successful processing |
| Set VisibilityTimeout too short | Set ≥ 2x expected processing time |
| Ignore partial batch failures in Lambda | Return `batchItemFailures` for partial failure reporting |
| Put large payloads directly in messages | Store in S3, pass S3 reference in message (max 256 KB) |
| Use Standard queue when order matters | Use FIFO queue with MessageGroupId for ordering |
| Skip dead-letter queue configuration | Always configure DLQ with maxReceiveCount |
| Hardcode queue URLs | Use environment variables or SSM Parameter Store |
