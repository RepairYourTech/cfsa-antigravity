---
name: twilio
description: "Twilio communication patterns covering SMS/MMS sending, voice calls, WhatsApp, webhook handling, phone number management, and verification (Verify API). Use when implementing communications with Twilio."
version: 1.0.0
source: self
date_added: "2026-03-14"
---

# Twilio

Cloud communications platform for SMS, voice, WhatsApp, and phone verification. Programmable via REST API with webhook-driven inbound message handling.

## When to Use

- Need to send or receive SMS/MMS messages
- Implementing phone number verification (OTP)
- Building voice call features (IVR, call forwarding)
- Sending WhatsApp messages programmatically

## When NOT to Use

- Email-only communications (use SendGrid, Resend)
- Push notifications to mobile apps (use FCM/APNs)
- Real-time chat in-app (use websockets or a chat SDK)

## Setup

### Installation

```bash
npm install twilio
```

### Client Initialization

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
```

### Environment Variables

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## SMS/MMS

### Send SMS

```typescript
const message = await client.messages.create({
  body: 'Your order #1234 has shipped!',
  from: process.env.TWILIO_PHONE_NUMBER,
  to: '+15559876543',
});
console.log(`Sent: ${message.sid} — Status: ${message.status}`);
```

### Send MMS (with media)

```typescript
const message = await client.messages.create({
  body: 'Your receipt is attached',
  from: process.env.TWILIO_PHONE_NUMBER,
  to: '+15559876543',
  mediaUrl: ['https://example.com/receipt.pdf'],
});
```

### Receive SMS (Webhook)

```typescript
// POST /api/webhooks/twilio/sms
import { twiml } from 'twilio';

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get('From') as string;
  const body = formData.get('Body') as string;

  // Process inbound message
  await processInboundSMS(from, body);

  // Respond with TwiML
  const response = new twiml.MessagingResponse();
  response.message('Thanks for your message! We\'ll get back to you soon.');

  return new Response(response.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}
```

## Phone Verification (Verify API)

### Send OTP

```typescript
const verification = await client.verify.v2
  .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
  .verifications.create({
    to: '+15559876543',
    channel: 'sms', // or 'call', 'email', 'whatsapp'
  });
console.log(`Verification status: ${verification.status}`); // 'pending'
```

### Check OTP

```typescript
const check = await client.verify.v2
  .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
  .verificationChecks.create({
    to: '+15559876543',
    code: '123456',
  });

if (check.status === 'approved') {
  // Phone number verified
} else {
  // Invalid code
}
```

## Voice Calls

```typescript
const call = await client.calls.create({
  url: 'https://example.com/api/webhooks/twilio/voice',
  to: '+15559876543',
  from: process.env.TWILIO_PHONE_NUMBER,
});

// Webhook handler responds with TwiML
export async function POST(request: Request) {
  const response = new twiml.VoiceResponse();
  response.say('Hello! Thank you for calling. Press 1 for support.');
  response.gather({
    numDigits: 1,
    action: '/api/webhooks/twilio/voice/menu',
  });
  return new Response(response.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}
```

## Webhook Signature Validation

```typescript
import { validateRequest } from 'twilio';

export async function POST(request: Request) {
  const signature = request.headers.get('x-twilio-signature') ?? '';
  const url = request.url;
  const body = Object.fromEntries(await request.formData());

  const isValid = validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    body as Record<string, string>
  );

  if (!isValid) {
    return new Response('Invalid signature', { status: 403 });
  }

  // Process webhook...
}
```

## Key Limits

| Limit | Value |
|-------|-------|
| SMS body max length | 1,600 characters (concatenated) |
| MMS max media size | 5 MB per media |
| MMS max media count | 10 per message |
| Verify OTP expiry | 10 minutes (default) |
| Messages per second (default) | 1 msg/sec per number |
| Toll-free throughput | 3 msg/sec |
| Short code throughput | 100 msg/sec |

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Hardcode phone numbers in source | Use environment variables for all phone numbers |
| Skip webhook signature validation | Always validate `x-twilio-signature` header |
| Build your own OTP system | Use Twilio Verify API — handles rate limiting, expiry, retries |
| Store `TWILIO_AUTH_TOKEN` in client-side code | Keep all Twilio credentials server-side only |
| Send SMS from a single number at high volume | Use a messaging service with number pool for throughput |
| Ignore delivery status callbacks | Set `statusCallback` URL to track delivery outcomes |
| Use long codes for marketing/bulk SMS | Use toll-free or short codes for high-volume messaging |
| Log full phone numbers | Redact/mask phone numbers in logs (PII) |
