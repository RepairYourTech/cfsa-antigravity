---
name: sendgrid
description: "SendGrid email patterns covering transactional email, dynamic templates, email validation, webhook events, and suppression management. Use when implementing email delivery with SendGrid."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# SendGrid

Email delivery platform for transactional and marketing email. REST API with dynamic template support, event webhooks, and deliverability analytics.

## When to Use

- Sending transactional email (password resets, receipts, notifications)
- Building email campaigns with dynamic templates
- Need email delivery tracking (opens, clicks, bounces)
- Need email address validation

## When NOT to Use

- Need a simpler developer experience with React email templates (use Resend)
- Building in-app chat or real-time messaging (use a messaging SDK)
- SMS/voice communications (use Twilio)

## Setup

### Installation

```bash
npm install @sendgrid/mail
```

### Client Initialization

```typescript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
```

### Environment Variables

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@example.com
SENDGRID_FROM_NAME=MyApp
```

## Sending Email

### Simple Email

```typescript
await sgMail.send({
  to: 'user@example.com',
  from: { email: process.env.SENDGRID_FROM_EMAIL!, name: 'MyApp' },
  subject: 'Your order has shipped',
  text: 'Order #1234 shipped via FedEx. Tracking: ABC123',
  html: '<p>Order <strong>#1234</strong> shipped via FedEx.</p>',
});
```

### Dynamic Template

```typescript
await sgMail.send({
  to: 'user@example.com',
  from: { email: process.env.SENDGRID_FROM_EMAIL!, name: 'MyApp' },
  templateId: 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  dynamicTemplateData: {
    name: 'Jane Doe',
    orderNumber: '1234',
    items: [
      { name: 'Widget', qty: 2, price: '$19.99' },
      { name: 'Gadget', qty: 1, price: '$49.99' },
    ],
    total: '$89.97',
    trackingUrl: 'https://tracking.example.com/ABC123',
  },
});
```

### Batch Send (Multiple Recipients)

```typescript
const messages = users.map(user => ({
  to: user.email,
  from: { email: process.env.SENDGRID_FROM_EMAIL!, name: 'MyApp' },
  templateId: 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  dynamicTemplateData: { name: user.name, code: user.resetCode },
}));

// Send up to 1000 per batch
await sgMail.send(messages);
```

### Send with Attachments

```typescript
await sgMail.send({
  to: 'user@example.com',
  from: process.env.SENDGRID_FROM_EMAIL!,
  subject: 'Your invoice',
  html: '<p>Please find your invoice attached.</p>',
  attachments: [
    {
      content: base64EncodedPdf,
      filename: 'invoice-1234.pdf',
      type: 'application/pdf',
      disposition: 'attachment',
    },
  ],
});
```

## Event Webhooks

### Setup Webhook Handler

```typescript
// POST /api/webhooks/sendgrid
export async function POST(request: Request) {
  const events = await request.json();

  for (const event of events) {
    switch (event.event) {
      case 'delivered':
        await markEmailDelivered(event.sg_message_id);
        break;
      case 'open':
        await trackEmailOpen(event.sg_message_id, event.timestamp);
        break;
      case 'click':
        await trackEmailClick(event.sg_message_id, event.url);
        break;
      case 'bounce':
        await handleBounce(event.email, event.type); // 'bounce' or 'blocked'
        break;
      case 'spam_report':
        await addToSuppressionList(event.email);
        break;
      case 'unsubscribe':
        await unsubscribeUser(event.email);
        break;
    }
  }

  return new Response('OK', { status: 200 });
}
```

### Verify Webhook Signature

```typescript
import { EventWebhook } from '@sendgrid/eventwebhook';

export async function POST(request: Request) {
  const publicKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY!;
  const signature = request.headers.get('x-twilio-email-event-webhook-signature') ?? '';
  const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp') ?? '';
  const body = await request.text();

  const ew = new EventWebhook();
  const key = ew.convertPublicKeyToECDSA(publicKey);
  const isValid = ew.verifySignature(key, body, signature, timestamp);

  if (!isValid) {
    return new Response('Invalid signature', { status: 403 });
  }

  const events = JSON.parse(body);
  // Process events...
}
```

## Email Validation

```typescript
import Client from '@sendgrid/client';
Client.setApiKey(process.env.SENDGRID_API_KEY!);

async function validateEmail(email: string) {
  const [response] = await Client.request({
    url: '/v3/validations/email',
    method: 'POST',
    body: { email },
  });

  const result = response.body.result;
  return {
    valid: result.verdict === 'Valid',
    score: result.score,           // 0-1 confidence
    suggestion: result.suggestion, // e.g., "Did you mean user@gmail.com?"
  };
}
```

## Key Limits

| Limit | Value |
|-------|-------|
| Free tier | 100 emails/day |
| Max recipients per API call | 1,000 |
| Max email size (with attachments) | 30 MB |
| Template dynamic data | 10,000 bytes |
| Rate limit (default) | 600 requests/min |
| Webhook events batch size | Up to 1,000 events per POST |

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Hardcode `from` email in every send call | Use a shared constant or env var for `from` |
| Send HTML without a text fallback | Always provide both `text` and `html` content |
| Ignore bounce events | Handle bounces — suppress future sends to bounced addresses |
| Use personal email as sender | Use a domain you own with proper SPF/DKIM/DMARC |
| Skip webhook signature verification | Always verify `x-twilio-email-event-webhook-signature` |
| Send bulk email via the Mail Send API | Use Marketing Campaigns API for bulk/marketing sends |
| Store API key in client-side code | Keep `SENDGRID_API_KEY` server-side only |
| Log full email content | Never log email bodies — they may contain PII |
